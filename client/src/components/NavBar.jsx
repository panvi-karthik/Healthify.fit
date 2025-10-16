import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('')
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')
  const onLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }
  const onScrollTo = useCallback((id) => (e) => {
    if (location.pathname === '/') {
      e.preventDefault()
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }, [location.pathname])

  // Scroll-spy: highlight which section is in view on '/'
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      return
    }
    const ids = ['section-dashboard', 'section-grocery', 'section-chat', 'section-profile']
    const opts = { root: null, rootMargin: '0px 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    const handler = (entries) => {
      // choose the entry with largest intersection ratio
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target?.id) setActiveSection(visible.target.id)
    }
    const io = new IntersectionObserver(handler, opts)
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [location.pathname])
  // No animation on NavBar brand
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success sticky-top shadow-sm">
      <div className="container">
        <Link to="/" className="navbar-brand fw-bold d-flex align-items-center">
          <span className="brand-icon me-2" style={{ fontSize: '1.8rem' }}>
            <span className="brand-icon-inner">🥗</span>
          </span>
          <div className="d-flex flex-column">
            <span className="brand-name" style={{ fontSize: '1.5rem', lineHeight: '1.2' }}>Healthify</span>
            <small className="text-white-50" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Eat Smart, Live Well</small>
          </div>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
          aria-controls="nav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              {location.pathname === '/' ? (
                <a href="#section-dashboard" onClick={onScrollTo('section-dashboard')} className={`nav-link nav-pill ${activeSection==='section-dashboard' ? 'active' : ''}`}>Dashboard</a>
              ) : (
                <NavLink className="nav-link nav-underline" to="/#section-dashboard">Dashboard</NavLink>
              )}
            </li>
            <li className="nav-item">
              {location.pathname === '/' ? (
                <a href="#section-grocery" onClick={onScrollTo('section-grocery')} className={`nav-link nav-pill ${activeSection==='section-grocery' ? 'active' : ''}`}>Grocery</a>
              ) : (
                <NavLink className="nav-link nav-underline" to="/#section-grocery">Grocery</NavLink>
              )}
            </li>
            <li className="nav-item">
              {location.pathname === '/' ? (
                <a href="#section-chat" onClick={onScrollTo('section-chat')} className={`nav-link nav-pill ${activeSection==='section-chat' ? 'active' : ''}`}>Chat</a>
              ) : (
                <NavLink className="nav-link nav-underline" to="/#section-chat">Chat</NavLink>
              )}
            </li>
            <li className="nav-item">
              {location.pathname === '/' ? (
                <a href="#section-profile" onClick={onScrollTo('section-profile')} className={`nav-link nav-pill ${activeSection==='section-profile' ? 'active' : ''}`}>Profile</a>
              ) : (
                <NavLink className="nav-link nav-underline" to="/#section-profile">Profile</NavLink>
              )}
            </li>
          </ul>
          <div className="d-flex align-items-center gap-2">
            {!hasToken ? (
              <>
                <NavLink to="/login" className="btn btn-outline-light">Login</NavLink>
                <NavLink to="/signup" className="btn btn-warning text-dark">Sign Up</NavLink>
              </>
            ) : (
              <button onClick={onLogout} className="btn btn-outline-light">Logout</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
