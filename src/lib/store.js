import { DEMO_MODE, db } from './firebase'
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, writeBatch
} from 'firebase/firestore'
import { SEED } from './seed'

/*
  Unified data layer.
  - Firebase mode: real Firestore collections.
  - Demo mode: localStorage, same API shape, so the whole UI is identical.
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
      lsSet('participants', (SEED.participants || []).map(p => ({ ...p })))
      lsSet('judges', (SEED.judges || []).map(j => ({ ...j })))
      lsSet('attendanceResults', [])
      lsSet('attendanceScans', [])
      lsSet('videos', [])
      lsSet('mainVideos', [])
      lsSet('competitions', [])
      lsSet('audio', [])
      lsSet('notifications', [])
      localStorage.setItem(LS_PREFIX + 'seeded', '1')
    }
    return
  }
  // Firebase: seed only if settings doc is missing
  const settingsRef = doc(db, 'settings', 'main')
  const snap = await getDoc(settingsRef)
  if (!snap.exists()) {
    const batch = writeBatch(db)
    batch.set(settingsRef, SEED.settings)
    SEED.program.forEach(p => batch.set(doc(db, 'program', p.id), p))
    SEED.teams.forEach(t => batch.set(doc(db, 'teams', t.id), t))
    ;(SEED.participants || []).forEach(p => batch.set(doc(db, 'participants', p.id), p))
    ;(SEED.judges || []).forEach(j => batch.set(doc(db, 'judges', j.id), j))
    await batch.commit()
  }
}

/*
  Force re-seed: updates teams + seeds participants that don't exist yet.
  Called from Admin Settings "تحديث البيانات" button.
  Does NOT delete existing data — only upserts.
*/
export async function forceSeed() {
  if (DEMO_MODE) {
    lsSet('teams', SEED.teams.map(t => ({ ...t })))
    const existing = lsGet('participants')
    const existingIds = new Set(existing.map(p => p.id))
    const toAdd = (SEED.participants || []).filter(p => !existingIds.has(p.id))
    lsSet('participants', [...existing, ...toAdd])
    // judges
    const exJudges = lsGet('judges')
    const exJIds = new Set(exJudges.map(j => j.id))
    const jAdd = (SEED.judges || []).filter(j => !exJIds.has(j.id))
    lsSet('judges', [...exJudges, ...jAdd])
    lsSet('settings', [SEED.settings])
    return
  }
  const batch = writeBatch(db)
  batch.set(doc(db, 'settings', 'main'), SEED.settings, { merge: true })
  SEED.teams.forEach(t => batch.set(doc(db, 'teams', t.id), t))
  const pSnap = await getDocs(collection(db, 'participants'))
  const existingIds = new Set()
  pSnap.docs.forEach(d => {
    const data = d.data()
    existingIds.add(d.id)
    if (data.id) existingIds.add(data.id)
  })
  ;(SEED.participants || []).forEach(p => {
    if (!existingIds.has(p.id)) batch.set(doc(db, 'participants', p.id), p)
  })
  // judges
  const jSnap = await getDocs(collection(db, 'judges'))
  const exJIds = new Set()
  jSnap.docs.forEach(d => { exJIds.add(d.id); if (d.data().id) exJIds.add(d.data().id) })
  ;(SEED.judges || []).forEach(j => {
    if (!exJIds.has(j.id)) batch.set(doc(db, 'judges', j.id), j)
  })
  await batch.commit()
}

/*
  Migrate legacy documents: old code used addDoc (random Firestore ID)
  but stored our id as a field. This re-creates them with id = doc ID
  and deletes the orphaned random-ID docs.
*/
export async function migrateLegacyDocs(col) {
  if (DEMO_MODE) return 0
  const snap = await getDocs(collection(db, col))
  let migrated = 0
  const batch = writeBatch(db)
  snap.docs.forEach(d => {
    const data = d.data()
    // if the Firestore doc ID differs from the data.id field, it's legacy
    if (data.id && d.id !== data.id) {
      // re-create at the correct path
      batch.set(doc(db, col, data.id), data)
      // delete the old random-ID doc
      batch.delete(d.ref)
      migrated++
    }
  })
  if (migrated > 0) await batch.commit()
  return migrated
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
  const id = data.id || uid()
  if (DEMO_MODE) {
    const arr = lsGet(col)
    const item = { ...data, id }
    arr.push(item); lsSet(col, arr); return item
  }
  await setDoc(doc(db, col, id), { ...data, id })
  return { ...data, id }
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
  // Try direct path first (new-style docs)
  const ref = doc(db, col, id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await deleteDoc(ref); return
  }
  // Fallback: find by 'id' field (legacy docs created with addDoc)
  const q = query(collection(db, col), where('id', '==', id))
  const qSnap = await getDocs(q)
  for (const d of qSnap.docs) {
    await deleteDoc(d.ref)
  }
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
