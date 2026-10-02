import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../api'
import SocialLinks from './SocialLinks'

export default function PublicLayout() {
  const [settings, setSettings] = useState(null)
  const [nav, setNav] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    Promise.all([api('/api/settings/'), api('/api/nav/')]).then(([s, n]) => {
      setSettings(s)
      setNav(n)
    })
  }, [])

  const logo = settings?.logo_url || '/logo.png'

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" onClick={() => setOpen(false)}>
            <img src={logo} alt={settings?.league_name || 'League logo'} />
            <div className="brand__text">
              <strong>{settings?.league_name || 'Diamond State Softball League'}</strong>
              <span>{settings?.location || 'Little Rock, Arkansas'}</span>
            </div>
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
          <nav className={`nav ${open ? 'open' : ''}`}>
            {nav.map((page) => (
              <NavLink
                key={page.slug}
                to={page.slug === 'home' ? '/' : `/${page.slug}`}
                end={page.slug === 'home'}
                onClick={() => setOpen(false)}
              >
                {page.nav_label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet context={{ settings }} />
      </main>
      <footer className="site-footer">
        <div className="rainbow" />
        <div className="site-footer__inner">
          <div>
            <strong>{settings?.league_name || 'Diamond State Softball League'}</strong>
            <div className="muted" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {settings?.location || 'Little Rock, Arkansas'}
            </div>
          </div>
          <SocialLinks settings={settings} />
          <div>{settings?.motto || 'Play · Support · Belong'}</div>
        </div>
      </footer>
    </div>
  )
}
