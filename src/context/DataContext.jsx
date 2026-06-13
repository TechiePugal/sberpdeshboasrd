import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as api from '../lib/db'
import { defaultRange } from '../lib/ranges'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

const FILTER_KEY = 'siruvani_filter'
function loadSavedFilter() {
  try { const s = localStorage.getItem(FILTER_KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
  return defaultRange()
}

export function DataProvider({ uid, children }) {
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stock, setStock] = useState([])
  const [reports, setReports] = useState([])
  const [suspense, setSuspense] = useState([])
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [categories, setCategories] = useState({})
  const [config, setConfig] = useState(api.DEFAULT_CONFIG)
  const [filter, setFilter] = useState(loadSavedFilter)
  const [loading, setLoading] = useState(true)

  const applyFilter = useCallback((range) => {
    setFilter(range)
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(range)) } catch { /* ignore */ }
  }, [])

  const refresh = useCallback(async () => {
    if (!uid) return
    const { sales, expenses, purchases, stock, reports, suspense, deposits, withdrawals } = await api.loadAll(uid)
    setSales(sales)
    setExpenses(expenses)
    setPurchases(purchases)
    setStock(stock)
    setReports(reports)
    setSuspense(suspense)
    setDeposits(deposits)
    setWithdrawals(withdrawals)
  }, [uid])

  const refreshCategories = useCallback(async () => {
    if (!uid) return
    setCategories(await api.loadCategories(uid))
  }, [uid])

  const refreshConfig = useCallback(async () => {
    if (!uid) return
    setConfig(await api.loadConfig(uid))
  }, [uid])

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        await Promise.all([refresh(), refreshCategories(), refreshConfig()])
      } catch (e) {
        console.error('Data load error', e)
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [refresh, refreshCategories, refreshConfig])

  const updateCategories = useCallback(async (next) => {
    setCategories(next)
    await api.saveCategories(uid, next)
  }, [uid])

  const updateConfig = useCallback(async (next) => {
    setConfig(next)
    await api.saveConfig(uid, next)
  }, [uid])

  return (
    <DataContext.Provider
      value={{ uid, sales, expenses, purchases, stock, reports, suspense, deposits, withdrawals, categories, config, filter, loading, applyFilter, refresh, refreshCategories, refreshConfig, updateCategories, updateConfig }}
    >
      {children}
    </DataContext.Provider>
  )
}
