import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as api from '../lib/db'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ uid, children }) {
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stock, setStock] = useState([])
  const [reports, setReports] = useState([])
  const [suspense, setSuspense] = useState([])
  const [categories, setCategories] = useState({})
  const [config, setConfig] = useState(api.DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!uid) return
    const { sales, expenses, purchases, stock, reports, suspense } = await api.loadAll(uid)
    setSales(sales)
    setExpenses(expenses)
    setPurchases(purchases)
    setStock(stock)
    setReports(reports)
    setSuspense(suspense)
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
      value={{ uid, sales, expenses, purchases, stock, reports, suspense, categories, config, loading, refresh, refreshCategories, refreshConfig, updateCategories, updateConfig }}
    >
      {children}
    </DataContext.Provider>
  )
}
