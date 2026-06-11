import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import { ensureProfile } from './lib/db'
import { UIProvider } from './context/UIContext'
import { DataProvider } from './context/DataContext'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import { PAGES } from './components/nav'

import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Purchases from './pages/Purchases'
import Expenses from './pages/Expenses'
import Suspense from './pages/Suspense'
import Records from './pages/Records'
import ReportDetail from './pages/ReportDetail'
import Settings from './pages/Settings'

const PAGE_COMPONENTS = {
  dash: Dashboard, upload: Upload, purchases: Purchases,
  expenses: Expenses, suspense: Suspense, records: Records,
  reportDetail: ReportDetail, settings: Settings,
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [userName, setUserName] = useState('')
  const [active, setActive] = useState('dash')
  const [entryDate, setEntryDate] = useState(null) // optional deep-link target for Daily Entry

  // navigate(page, date?) — date is only used when landing on Daily Entry
  const navigate = (page, date) => { setEntryDate(date || null); setActive(page) }

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u || null)
      if (u) {
        const name = await ensureProfile(u.uid, u.displayName || u.email?.split('@')[0] || 'Admin')
        setUserName(name)
      }
    })
  }, [])

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--t2)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🍺</div>
          <div style={{ marginTop: 8 }}>Loading…</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <UIProvider>
        <Auth />
      </UIProvider>
    )
  }

  const Page = PAGE_COMPONENTS[active] || Dashboard
  const title = PAGES.find((p) => p.id === active)?.title || (active === 'reportDetail' ? 'Daily Report' : '')
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <UIProvider>
      <DataProvider uid={user.uid}>
        <div className="app">
          <Sidebar active={active} onNav={navigate} userName={userName} onLogout={() => signOut(auth)} />
          <div className="content">
            <div className="topbar">
              <div className="tbt">{title}</div>
              <div className="tbd">{dateLabel}</div>
            </div>
            <div className="pages">
              <div className="page fadein" key={active}>
                <Page onNav={navigate} initialDate={entryDate} />
              </div>
            </div>
          </div>
          <MobileNav active={active} onNav={navigate} />
        </div>
      </DataProvider>
    </UIProvider>
  )
}
