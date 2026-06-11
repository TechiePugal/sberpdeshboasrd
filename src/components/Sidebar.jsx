import { ICONS, PAGES } from './nav'

export default function Sidebar({ active, onNav, userName, onLogout }) {
  const sections = [...new Set(PAGES.map((p) => p.section))]
  const initials = (userName || 'A').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="sb">
      <div className="sb-brand">
        <div className="sb-name"><span className="sb-dot" />Siruvani Bar</div>
        <div className="sb-sub">&amp; Kitchen ERP · Tirupur</div>
      </div>

      {sections.map((sec) => (
        <div key={sec}>
          <div className="sb-sec">{sec}</div>
          {PAGES.filter((p) => p.section === sec).map((p) => {
            const Icon = ICONS[p.id]
            return (
              <div key={p.id} className={'si' + (active === p.id ? ' on' : '')} onClick={() => onNav(p.id)}>
                <Icon />{p.label}
              </div>
            )
          })}
        </div>
      ))}

      <div className="sb-bot">
        <div className="sb-user">
          <div className="sb-av">{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{userName || 'Admin'}</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Owner</div>
          </div>
        </div>
        <button className="sb-out" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  )
}
