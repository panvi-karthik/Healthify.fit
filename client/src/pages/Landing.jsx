import { useEffect, useRef, useState } from 'react'

export default function Landing({ onDone }) {
  const [animate, setAnimate] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    // lock scroll briefly
    const html = document.documentElement
    const body = document.body
    html.classList.add('no-scroll')
    body.classList.add('no-scroll')

    // kick off animation on mount
    requestAnimationFrame(() => setAnimate(true))

    const t = setTimeout(() => {
      // fade out
      if (containerRef.current) containerRef.current.classList.add('fade-out')
      setTimeout(() => {
        html.classList.remove('no-scroll')
        body.classList.remove('no-scroll')
        if (typeof onDone === 'function') onDone()
      }, 300)
    }, 3000) // 3 seconds total

    return () => {
      clearTimeout(t)
      html.classList.remove('no-scroll')
      body.classList.remove('no-scroll')
    }
  }, [])

  return (
    <div ref={containerRef} className="landing d-flex align-items-center justify-content-center">
      <div className={`brand-splash ${animate ? 'animate' : ''}`}>
        <span className="brand-name-splash">Healthify</span>
      </div>
    </div>
  )
}
