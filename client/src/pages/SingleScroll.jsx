import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import Grocery from './Grocery'
import Chat from './Chat'
import Profile from './Profile'

export default function SingleScroll() {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')
  const location = useLocation()

  useEffect(() => {
    // Ensure we start at top when landing on single scroll page
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Scroll to hash-targeted section when hash is present or changes
  useEffect(() => {
    const hash = location.hash
    if (hash && hash.startsWith('#')) {
      const id = hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    // If no hash or element not found, do not force scroll
  }, [location.hash])

  return (
    <div className="single-scroll">
      <section id="section-dashboard" className="single-section">
        <div className="mb-4">
          <h2 className="section-title"><span className="emoji">📊</span><span>Dashboard</span></h2>
        </div>
        {hasToken ? (
          <Dashboard />
        ) : (
          <div className="card card-healthy p-4 text-center">
            <div className="mb-2">Please login to view your personalized dashboard.</div>
            <a className="btn btn-healthy" href="/login">Go to Login</a>
          </div>
        )}
      </section>

      <section id="section-grocery" className="single-section">
        <div className="mb-4">
          <h2 className="section-title"><span className="emoji">🛒</span><span>Grocery</span></h2>
        </div>
        <Grocery />
      </section>

      <section id="section-chat" className="single-section">
        <div className="mb-4">
          <h2 className="section-title"><span className="emoji">💬</span><span>Chat</span></h2>
        </div>
        <Chat />
      </section>

      <section id="section-profile" className="single-section">
        <div className="mb-4">
          <h2 className="section-title"><span className="emoji">👤</span><span>Profile</span></h2>
        </div>
        {hasToken ? (
          <Profile />
        ) : (
          <div className="card card-healthy p-4 text-center">
            <div className="mb-2">Please login to edit your profile.</div>
            <a className="btn btn-healthy" href="/login">Go to Login</a>
          </div>
        )}
      </section>
    </div>
  )
}
