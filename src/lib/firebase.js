import { initializeApp } from 'firebase/app'
import {
  getFirestore, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Demo Mode: when Firebase env vars are absent, the app runs on localStorage
// so it works instantly on Vercel before you paste real credentials.
export const DEMO_MODE = !cfg.apiKey || !cfg.projectId

let db = null
let auth = null

if (!DEMO_MODE) {
  const app = initializeApp(cfg)
  // QUOTA-SAVER: enable an on-device persistent cache. Returning visitors and
  // page refreshes are served from local cache instead of re-reading every
  // document from the server, which sharply cuts Firestore read usage during
  // a busy event. Live updates and writes are unaffected. Falls back to the
  // default in-memory Firestore if the browser blocks persistence.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  } catch (e) {
    db = getFirestore(app)
  }
  auth = getAuth(app)
}

export { db, auth }
