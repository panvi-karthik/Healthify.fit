import { useEffect } from 'react'

// Global click burst: spawns veggie emoji particles at the cursor
export default function ClickBurst() {
  useEffect(() => {
    const EMOJIS = ['🥕','🥦','🥒','🌶️','🍅','🧅','🥬','🥔']

    function spawnBurst(x, y) {
      const count = 2 + Math.floor(Math.random() * 2) // 2-3 pieces
      for (let i = 0; i < count; i++) {
        const el = document.createElement('span')
        el.className = 'veg-pop'
        el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
        const size = 18 + Math.random() * 10
        // Random full 360° scatter
        const angleRad = Math.random() * Math.PI * 2
        const speed = 40 + Math.random() * 30 // travel distance
        const dx = Math.cos(angleRad) * speed
        const dy = Math.sin(angleRad) * speed
        const rot = (Math.random() - 0.5) * 60

        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.fontSize = `${size}px`
        el.style.setProperty('--dx', `${dx}px`)
        el.style.setProperty('--dy', `${dy}px`)
        el.style.setProperty('--rot', `${rot}deg`)
        // No gravity, just fade out
        el.style.setProperty('--grav', `0px`)
        // randomize duration a bit
        const duration = 600 + Math.floor(Math.random() * 300)
        el.style.animationDuration = `${duration}ms`
        document.body.appendChild(el)
        // Remove after animation
        const ttl = duration + 100
        setTimeout(() => {
          el.remove()
        }, ttl)
      }
    }

    const onClick = (e) => {
      // Account for scroll position for absolute elements
      const x = e.clientX + window.scrollX
      const y = e.clientY + window.scrollY
      spawnBurst(x, y)
    }

    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  return null
}
