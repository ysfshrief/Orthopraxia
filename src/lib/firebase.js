import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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
  db = getFirestore(app)
  auth = getAuth(app)
}

export { db, auth }
