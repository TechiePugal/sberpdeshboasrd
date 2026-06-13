// Firestore data layer.
// Data is namespaced per user: users/{uid}/{collection}/{docId}
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './helpers'

const col = (uid, name) => collection(db, 'users', uid, name)
const docRef = (uid, name, id) => doc(db, 'users', uid, name, id)

async function loadCollection(uid, name, orderField) {
  const snap = await getDocs(query(col(uid, name), orderBy(orderField)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function loadAll(uid) {
  const [sales, expenses, purchases, stock, reports, suspense] = await Promise.all([
    loadCollection(uid, 'sales', 'entry_date'),
    loadCollection(uid, 'expenses', 'expense_date'),
    loadCollection(uid, 'purchases', 'purchase_date'),
    loadCollection(uid, 'stock', 'entry_date'),
    loadCollection(uid, 'dailyReports', 'entry_date'),
    loadCollection(uid, 'suspense', 'suspense_date'),
  ])
  return { sales, expenses, purchases, stock, reports, suspense }
}

// ── Suspense (separate ledger: money booked, not in hand) ─
export async function addSuspense(uid, row) {
  await addDoc(col(uid, 'suspense'), row)
}
export async function deleteSuspense(uid, id) {
  await deleteDoc(docRef(uid, 'suspense', id))
}

// ── Daily reports (one doc per date, id = entry_date) ────────────
export async function saveDailyReport(uid, date, payload) {
  await setDoc(docRef(uid, 'dailyReports', date), { ...payload, entry_date: date, updated_at: Date.now() }, { merge: true })
}
export async function deleteDailyReport(uid, id) {
  await deleteDoc(docRef(uid, 'dailyReports', id))
}
export async function updateReportSuspense(uid, date, amount, reason) {
  await setDoc(docRef(uid, 'dailyReports', date), {
    entry_date: date, suspense_amount: Number(amount) || 0, suspense_reason: reason || '', updated_at: Date.now(),
  }, { merge: true })
}

// ── Profile ──────────────────────────────────────────────
export async function ensureProfile(uid, fullName) {
  const r = doc(db, 'users', uid)
  const snap = await getDoc(r)
  if (!snap.exists()) {
    await setDoc(r, { full_name: fullName || '', created_at: Date.now() }, { merge: true })
    return fullName || ''
  }
  return snap.data().full_name || fullName || ''
}

// ── Categories ───────────────────────────────────────────
export async function loadCategories(uid) {
  const r = docRef(uid, 'settings', 'categories')
  const snap = await getDoc(r)
  if (snap.exists() && snap.data().categories) {
    return snap.data().categories
  }
  // Seed defaults for a brand-new user
  await setDoc(r, { categories: DEFAULT_CATEGORIES })
  return DEFAULT_CATEGORIES
}

export async function saveCategories(uid, categories) {
  await setDoc(docRef(uid, 'settings', 'categories'), { categories })
}

// ── App config: payment accounts + lease mode ────────────
export const DEFAULT_CONFIG = {
  accounts: DEFAULT_ACCOUNTS,
  openings: {},
  lease_mode: false,
  leased: {},
  lease_amounts: {},
  reduce_suspense: false,
}
export async function loadConfig(uid) {
  const snap = await getDoc(docRef(uid, 'settings', 'appConfig'))
  if (snap.exists()) return { ...DEFAULT_CONFIG, ...snap.data() }
  return { ...DEFAULT_CONFIG }
}
export async function saveConfig(uid, cfg) {
  await setDoc(docRef(uid, 'settings', 'appConfig'), cfg, { merge: true })
}

// ── Sales (one doc per date, id = entry_date) ────────────
export async function saveSales(uid, date, payload) {
  await setDoc(docRef(uid, 'sales', date), { ...payload, entry_date: date }, { merge: true })
}
export async function updateSales(uid, id, payload) {
  await updateDoc(docRef(uid, 'sales', id), payload)
}
export async function deleteSales(uid, id) {
  await deleteDoc(docRef(uid, 'sales', id))
}

// ── Expenses (auto id, many per day) ─────────────────────
export async function addExpenses(uid, rows) {
  await Promise.all(rows.map((r) => addDoc(col(uid, 'expenses'), r)))
}
export async function addExpense(uid, row) {
  await addDoc(col(uid, 'expenses'), row)
}
export async function updateExpense(uid, id, payload) {
  await updateDoc(docRef(uid, 'expenses', id), payload)
}
export async function deleteExpense(uid, id) {
  await deleteDoc(docRef(uid, 'expenses', id))
}

// ── Purchases (auto id) ──────────────────────────────────
export async function addPurchase(uid, row) {
  await addDoc(col(uid, 'purchases'), row)
}
export async function updatePurchase(uid, id, payload) {
  await updateDoc(docRef(uid, 'purchases', id), payload)
}
export async function deletePurchase(uid, id) {
  await deleteDoc(docRef(uid, 'purchases', id))
}

// ── Stock (one doc per date, id = entry_date) ────────────
export async function saveStock(uid, date, payload) {
  await setDoc(docRef(uid, 'stock', date), { ...payload, entry_date: date }, { merge: true })
}
export async function updateStock(uid, id, payload) {
  await updateDoc(docRef(uid, 'stock', id), payload)
}
export async function deleteStock(uid, id) {
  await deleteDoc(docRef(uid, 'stock', id))
}
