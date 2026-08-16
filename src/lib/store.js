import { DEMO_MODE, db } from './firebase'
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, writeBatch
} from 'firebase/firestore'
import { SEED } from './seed'

/*
  Unified data layer.
  - Firebase mode: real Firestore collections.
  - Demo mode: localStorage, same API shape, so the whole UI is identical.
  Collections: settings(doc:main), program, teams, participants,
               attendanceResults, videos, competitions, audio, notifications
*/

const LS_PREFIX = 'ortho:'

// ---------------- localStorage helpers ----------------
function lsGet(col) {
  try { return JSON.parse(localStorage.getItem(LS_PREFIX + col) || '[]') }
  catch { return [] }
}
function lsSet(col, arr) {
  localStorage.setItem(LS_PREFIX + col, JSON.stringify(arr))
  window.dispatchEvent(new CustomEvent('ortho-change', { detail: { col } }))
}
function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ---------------- seeding ----------------
export async function ensureSeed() {
  if (DEMO_MODE) {
    if (!localStorage.getItem(LS_PREFIX + 'seeded')) {
      lsSet('settings', [SEED.settings])
      lsSet('program', SEED.program.map(p => ({ ...p })))
      lsSet('teams', SEED.teams.map(t => ({ ...t })))
      lsSet('participants', [])
      lsSet('attendanceResults', [])
      lsSet('videos', [])
      lsSet('competitions', [])
      lsSet('audio', [])
      lsSet('notifications', [])
      localStorage.setItem(LS_PREFIX + 'seeded', '1')
    }
    return
  }
  // Firebase: seed only if empty
  const settingsRef = doc(db, 'settings', 'main')
  const snap = await getDoc(settingsRef)
  if (!snap.exists()) {
    const batch = writeBatch(db)
    batch.set(settingsRef, SEED.settings)
    SEED.program.forEach(p => batch.set(doc(db, 'program', p.id), p))
    SEED.teams.forEach(t => batch.set(doc(db, 'teams', t.id), t))
    await batch.commit()
  }
}

// ---------------- generic list ops ----------------
export async function listAll(col) {
  if (DEMO_MODE) return lsGet(col)
  const q = query(collection(db, col))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribe(col, cb) {
  if (DEMO_MODE) {
    const handler = (e) => { if (!e.detail || e.detail.col === col) cb(lsGet(col)) }
    window.addEventListener('ortho-change', handler)
    cb(lsGet(col))
    return () => window.removeEventListener('ortho-change', handler)
  }
  return onSnapshot(collection(db, col), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function create(col, data) {
  if (DEMO_MODE) {
    const arr = lsGet(col)
    const item = { id: uid(), ...data }
    arr.push(item); lsSet(col, arr); return item
  }
  const ref = await addDoc(collection(db, col), data)
  return { id: ref.id, ...data }
}

export async function upsert(col, id, data) {
  if (DEMO_MODE) {
    const arr = lsGet(col)
    const i = arr.findIndex(x => x.id === id)
    if (i >= 0) arr[i] = { ...arr[i], ...data, id }
    else arr.push({ id, ...data })
    lsSet(col, arr); return
  }
  await setDoc(doc(db, col, id), data, { merge: true })
}

export async function update(col, id, data) {
  if (DEMO_MODE) {
    const arr = lsGet(col)
    const i = arr.findIndex(x => x.id === id)
    if (i >= 0) { arr[i] = { ...arr[i], ...data }; lsSet(col, arr) }
    return
  }
  await updateDoc(doc(db, col, id), data)
}

export async function remove(col, id) {
  if (DEMO_MODE) {
    lsSet(col, lsGet(col).filter(x => x.id !== id)); return
  }
  await deleteDoc(doc(db, col, id))
}

// ---------------- settings (single doc) ----------------
export function subscribeSettings(cb) {
  if (DEMO_MODE) {
    const handler = () => cb(lsGet('settings')[0] || SEED.settings)
    window.addEventListener('ortho-change', handler)
    cb(lsGet('settings')[0] || SEED.settings)
    return () => window.removeEventListener('ortho-change', handler)
  }
  return onSnapshot(doc(db, 'settings', 'main'), snap => {
    cb(snap.exists() ? snap.data() : SEED.settings)
  })
}

export async function saveSettings(data) {
  if (DEMO_MODE) { lsSet('settings', [data]); return }
  await setDoc(doc(db, 'settings', 'main'), data, { merge: true })
}

export { uid, DEMO_MODE }
