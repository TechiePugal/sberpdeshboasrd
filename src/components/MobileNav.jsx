import { useState } from 'react'
import { ICONS, PAGES, MOBILE_PRIMARY, MOBILE_MORE } from './nav'

export default function MobileNav({ active, onNav }) {
  const [sheet, setSheet] = useState(false)
  const moreActive = MOBILE_MORE.includes(active)

  const go = (id) => { setSheet(false); onNav(id) }

  return (
    <>
      <nav className="mob-nav">
        <div className="mob-nav-inner">
          {MOBILE_PRIMARY.map((id) => {
            const p = PAGES.find((x) => x.id === id)
            const Icon = ICONS[id]
            return (
              <button key={id} className={'mob-nav-item' + (active === id ? ' on' : '')} onClick={() => go(id)}>
                <Icon /> {p.label.split(' ')[0]}
              </button>
            )
          })}
          <button className={'mob-nav-item' + (moreActive ? ' on' : '')} onClick={() => setSheet(true)}>
            {ICONS.more({})} More
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="mob-more" onClick={() => setSheet(false)}>
          <div className="mob-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob-more-pill" />
            {MOBILE_MORE.map((id) => {
              const p = PAGES.find((x) => x.id === id)
              const Icon = ICONS[id]
              return (
                <div key={id} className={'mob-more-item' + (active === id ? ' on' : '')} onClick={() => go(id)}>
                  <Icon /> {p.label}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
