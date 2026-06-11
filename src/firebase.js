// Firebase initialization for Siruvani Bar & Kitchen ERP
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// NOTE: Firebase web API keys are not secret — they ship in the client.
// Your data is protected by Firestore security rules (see firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyA_slaKRV9bi8y4EhcwJFRsOK6B7QlDuI0',
  authDomain: 'siruvanibar-86896.firebaseapp.com',
  projectId: 'siruvanibar-86896',
  storageBucket: 'siruvanibar-86896.firebasestorage.app',
  messagingSenderId: '858361157436',
  appId: '1:858361157436:web:f51f709f29c74eff073039',
  measurementId: 'G-TMB0X6435L',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
