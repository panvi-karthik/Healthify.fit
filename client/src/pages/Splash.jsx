import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()
  const logoRef = useRef(null) // will point to .logo-inner
  const splashRef = useRef(null)

  // Precompute veggie configs for this render (randomized positions/timings)
  const veggies = useMemo(() => {
    const base = ['🥦','🥕','🍅','🥒','🍎','🥬','🌽','🍋','🍆','🍇','🍓','🍄','🍑','🍍','🥝','🥑','🫐','🥭','🍌','🫑']
    const countFactor = 10
    const icons = Array.from({ length: base.length * countFactor }, (_, i) => base[i % base.length])
    const dirs = ['dir-up','dir-down','dir-left','dir-right','dir-d1','dir-d2']
    return icons.map((icon, i) => {
      const left = Math.round(Math.random()*90 + 2) // 2% to 92%
      const bottom = -10 - Math.round(Math.random()*20) // -10% to -30%
      const delay = Math.random()*2 // 0s - 2s stagger
      const floatDur = 5.5 + Math.random()*1.0 // around 6s
      const spinDur = 1.8 + Math.random()*1.2 // 1.8s - 3s
      const size = 1.6 + Math.random()*2.2 // 1.6rem - 3.8rem for variety
      const amp = 30 + Math.round(Math.random()*50) // 30px - 80px (unused by straight motion but kept harmless)
      const dir = dirs[Math.floor(Math.random()*dirs.length)]
      return { icon, left, bottom, delay, floatDur, spinDur, size, amp, dir }
    })
  }, [])

  useEffect(() => {
    // Lock page scroll while splash is visible
    const html = document.documentElement
    const body = document.body
    html.classList.add('no-scroll')
    body.classList.add('no-scroll')

    // 1) Start logo grow-out at 4s
    const tGrow = setTimeout(() => {
      if (logoRef.current) logoRef.current.classList.add('grow-out')
    }, 4000)

    // 3) Fade-out and navigate at 6s
    const tEnd = setTimeout(() => {
      if (splashRef.current) splashRef.current.classList.add('fade-out')
      setTimeout(() => navigate('/dashboard', { replace: true }), 300)
    }, 6000)

    // Trigger impacts only before grow-out starts (<= 4s)
    const schedule = [900, 1800, 3200].map(ms => setTimeout(() => {
      if (!logoRef.current || !splashRef.current) return
      // Shake logo
      logoRef.current.classList.remove('shake')
      // force reflow to restart animation
      void logoRef.current.offsetWidth
      logoRef.current.classList.add('shake')
      // Create impact ripple element
      const div = document.createElement('div')
      div.className = 'impact'
      splashRef.current.appendChild(div)
      setTimeout(() => { div.remove() }, 700)
    }, ms))

    return () => {
      html.classList.remove('no-scroll')
      body.classList.remove('no-scroll')
      clearTimeout(tGrow)
      clearTimeout(tEnd)
      schedule.forEach(clearTimeout)
    }
  }, [navigate])

  return (
    <div className="splash" ref={splashRef}>
      <div className="splash-inner">
        <div className="logo">
          <div className="logo-inner" ref={logoRef}>
            <h1>🥗 Healthify</h1>
            <p>Eat smart. Live better.</p>
          </div>
        </div>
        {veggies.map((v, idx) => (
          <div
            key={idx}
            className={`veg ${v.dir}`}
            style={{
              left: `${v.left}%`,
              bottom: `${v.bottom}%`,
              animationDelay: `${v.delay}s`,
              fontSize: `${v.size}rem`,
              animationDuration: `${Math.max(3.4, Math.min(4.6, v.floatDur))}s`,
              ['--amp']: `${v.amp}px`,
            }}
          ><span className="spin" style={{ animationDuration: `${v.spinDur}s` }}>{v.icon}</span></div>
        ))}
      </div>
    </div>
  )
}
