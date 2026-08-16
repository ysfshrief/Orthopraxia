import { useEffect, useRef } from 'react'
import { subscribe } from '../lib/store'
import { itemDate } from '../lib/schedule'
import { useToast } from './UI'

/*
  Two notification sources:
  1) Schedule reminders — fires a notification when each program item's start
     time arrives (checked every 30s while app is open/backgrounded).
  2) Admin notifications — new docs in `notifications` collection show up live.

  Uses the Web Notification API (works when the PWA is open or in the
  background on Android). For notifications that arrive when the app is fully
  closed, wire Firebase Cloud Messaging — the collection + service worker are
  ready; see FIREBASE_SETUP.md.
*/

const SEEN_KEY = 'ortho:notifiedItems'
const SEEN_NOTIF = 'ortho:seenNotifIds'

function getSet(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() } }
function saveSet(key, set) { localStorage.setItem(key, JSON.stringify([...set])) }

async function ensurePermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission()
    return p === 'granted'
  }
  return false
}

function fire(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' })
      if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      return
    } catch {}
  }
}

export default function NotificationWatcher() {
  const toast = useToast()
  const program = useRef([])
  const notifs = useRef([])

  useEffect(() => { ensurePermission() }, [])

  // subscribe to program + notifications
  useEffect(() => {
    const u1 = subscribe('program', arr => { program.current = arr })
    const u2 = subscribe('notifications', arr => {
      // fire any NEW admin notification once
      const seen = getSet(SEEN_NOTIF)
      arr.forEach(n => {
        if (n.id && !seen.has(n.id) && n.createdAt && Date.now() - n.createdAt < 1000 * 60 * 60 * 12) {
          fire(n.urgent ? `🔴 ${n.title}` : n.title, n.body || '')
          toast(n.title, n.urgent ? 'err' : 'ok', 4000)
          seen.add(n.id)
        }
      })
      saveSet(SEEN_NOTIF, seen)
      notifs.current = arr
    })
    return () => { u1 && u1(); u2 && u2() }
  }, [toast])

  // schedule reminder tick
  useEffect(() => {
    const check = () => {
      const now = Date.now()
      const seen = getSet(SEEN_KEY)
      program.current.forEach(item => {
        const d = itemDate(item, false)
        if (!d) return
        const t = d.getTime()
        // fire within a 90s window after the start, once per item
        if (!seen.has(item.id) && now >= t && now - t < 90 * 1000) {
          fire('🔔 حان موعد الفقرة', `${item.title}${item.place ? ' — ' + item.place : ''}`)
          toast(`حان موعد: ${item.title}`, 'warn', 5000)
          seen.add(item.id)
          saveSet(SEEN_KEY, seen)
        }
      })
    }
    check()
    const id = setInterval(check, 30 * 1000)
    return () => clearInterval(id)
  }, [toast])

  return null
}
