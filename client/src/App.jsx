import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import ClickBurst from './components/ClickBurst'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Grocery from './pages/Grocery'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import SingleScroll from './pages/SingleScroll'
import Landing from './pages/Landing'

function App() {
  const location = useLocation()
  const [showSplash, setShowSplash] = useState(() => {
    const shown = typeof window !== 'undefined' && sessionStorage.getItem('splashShown') === '1'
    return !shown
  })

  // Guarantee scroll is enabled after route changes (in case a previous page locked it)
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.remove('no-scroll')
    body.classList.remove('no-scroll')
  }, [location.pathname])

  // If navigating in the app, keep splash hidden after it has been shown once per session
  useEffect(() => {
    const shown = typeof window !== 'undefined' && sessionStorage.getItem('splashShown') === '1'
    if (shown && showSplash) setShowSplash(false)
  }, [location.pathname])
  return (
    <div className="app-bg min-vh-100 d-flex flex-column">
      <NavBar />
      <ClickBurst />
      <main className="container py-4 flex-grow-1">
        <div key={location.pathname} className="page-fade">
          <Routes location={location}>
            <Route path="/" element={<SingleScroll />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/grocery" element={<Grocery />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<div className="text-center py-5">Page not found</div>} />
          </Routes>
        </div>
      </main>
      {showSplash && (
        <Landing onDone={() => {
          try { sessionStorage.setItem('splashShown', '1') } catch {}
          setShowSplash(false)
        }} />
      )}
      <footer className="text-center py-3 large footer-brand">
        Healthify.Ivnap
      </footer>
    </div>
  )
}

export default App
