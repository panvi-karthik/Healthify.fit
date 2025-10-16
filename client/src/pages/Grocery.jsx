import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

export default function Grocery() {
  const [diet, setDiet] = useState('veg')
  const [items, setItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [recoLoading, setRecoLoading] = useState(false)
  const [aiActive, setAiActive] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [week, setWeek] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState([]) // { name, quantity: number }
  const [newItem, setNewItem] = useState('')

  const fetchPlan = async (d) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/grocery?diet=${encodeURIComponent(d)}`)
      setItems(data.items || [])
      // Start with no recommendations; these will be generated based on cart
      setRecipes([])
      setWeek(data.week || '')
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load grocery plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        // Try to default diet from user profile if available
        const { data } = await api.get('/auth/me')
        const pref = data?.dietPreference || 'veg'
        if (mounted) {
          setDiet(pref)
          await fetchPlan(pref)
        }
      } catch {
        // Not logged in or failed — fall back to veg
        if (mounted) fetchPlan('veg')
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  // Safety: ensure scroll enabled on this page
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.remove('no-scroll')
    body.classList.remove('no-scroll')
  }, [])

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCart(parsed)
      }
    } catch {}
  }, [])

  // Persist cart whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  useEffect(() => {
    // When diet changes via select, refetch plan
    fetchPlan(diet)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diet])

  const addToCart = (name) => {
    setCart(prev => {
      const idx = prev.findIndex(x => x.name.toLowerCase() === name.toLowerCase())
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: (next[idx].quantity || 0) + 1 }
        return next
      }
      return [...prev, { name, quantity: 1 }]
    })
  }

  const removeFromCart = (name) => {
    setCart(prev => {
      const idx = prev.findIndex(x => x.name.toLowerCase() === name.toLowerCase())
      if (idx === -1) return prev
      const next = [...prev]
      const q = (next[idx].quantity || 0) - 1
      if (q <= 0) next.splice(idx, 1)
      else next[idx] = { ...next[idx], quantity: q }
      return next
    })
  }

  const clearCart = () => setCart([])

  const onAddCustom = (e) => {
    e.preventDefault()
    const name = newItem.trim()
    if (!name) return
    addToCart(name)
    setNewItem('')
  }

  const totalItems = useMemo(() => cart.reduce((acc, it) => acc + (it.quantity || 0), 0), [cart])

  // Live recommendations based on cart using Google AI backend (if configured)
  useEffect(() => {
    // Debounce to avoid spamming while clicking quickly
    const t = setTimeout(async () => {
      if (!cart.length) {
        setAiActive(false)
        setRecipes([])
        setAiNotice('')
        return
      }
      try {
        setRecoLoading(true)
        const { data } = await api.post('/grocery/recommend', {
          diet,
          cart: cart.map(c => ({ name: c.name, quantity: c.quantity }))
        })
        if (Array.isArray(data?.recipes) && data.recipes.length) {
          setRecipes(data.recipes)
        }
        setAiActive(data?.meta?.source === 'google')
        const source = data?.meta?.source
        if (source === 'google') {
          setAiNotice('')
        } else if (source === 'error-fallback') {
          const msg = data?.meta?.message || ''
          if (String(msg).includes('429')) {
            setAiNotice('AI limit reached. Showing alternate recommendations.')
          } else {
            setAiNotice('AI unavailable. Showing alternate recommendations.')
          }
        } else if (source === 'google-parse-failed') {
          setAiNotice('AI response issue. Showing alternate recommendations.')
        } else if (source === 'static') {
          setAiNotice('AI not configured. Showing static recommendations.')
        }
      } catch {
        // keep current recipes if call fails
        setAiNotice('AI unreachable. Showing alternate recommendations.')
      } finally {
        setRecoLoading(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [diet, cart])

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-6">
        <div className="card card-healthy p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0 section-title"><span className="emoji">🛒</span> <span>Weekly Grocery List {week && <small className="text-muted">({week})</small>}</span></h3>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Diet</span>
              <select className="form-select" value={diet} onChange={(e)=>setDiet(e.target.value)} style={{maxWidth:160}}>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Vegetarian</option>
              </select>
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <ul className="list-group list-group-flush">
              {items.map((it, idx) => (
                <li key={`${it.name}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <span>🛒 {it.name}{it.quantity ? ` — ${it.quantity}` : ''}</span>
                    <span className={`ms-2 badge ${diet==='veg' ? 'badge-veg' : 'badge-nonveg'}`}>{diet}</span>
                  </div>
                  <div className="btn-group" role="group" aria-label="Add or remove">
                    <button className="btn btn-soft-success" onClick={() => addToCart(it.name)}>+ Add</button>
                    <button className="btn btn-danger" onClick={() => removeFromCart(it.name)}>− Remove</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && <li className="list-group-item text-muted">No items</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="card card-healthy p-4 mb-2">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0 section-title"><span className="emoji">🧺</span> <span>My Cart</span></h3>
            <span className="badge bg-success-subtle text-success">{totalItems} items</span>
          </div>
          <form className="input-group mb-3" onSubmit={onAddCustom}>
            <input className="form-control" placeholder="Add custom item (e.g., Olive Oil)" value={newItem} onChange={e=>setNewItem(e.target.value)} />
            <button className="btn btn-success" type="submit">Add</button>
          </form>
          <ul className="list-group list-group-flush">
            {cart.map((c) => (
              <li key={c.name} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{c.name}</strong>
                  <span className="ms-2 small text-muted">x{c.quantity}</span>
                </div>
                <div className="btn-group" role="group">
                  <button className="btn btn-soft-success" onClick={()=>addToCart(c.name)}>+</button>
                  <button className="btn btn-danger" onClick={()=>removeFromCart(c.name)}>−</button>
                </div>
              </li>
            ))}
            {cart.length === 0 && <li className="list-group-item text-muted">Cart is empty</li>}
          </ul>
          {cart.length > 0 && (
            <div className="mt-3 d-flex justify-content-end">
              <button className="btn btn-outline-danger" onClick={clearCart}>Clear Cart</button>
            </div>
          )}
        </div>

        <div className="card card-healthy p-4">
          <div className="d-flex align-items-center justify-content-between">
            <h3 className="mb-3 section-title"><span className="emoji">{diet==='veg' ? '🥗' : '🍗'}</span> <span>Recommended Recipes</span></h3>
            <div className="d-flex align-items-center gap-2">
              {aiActive && <span className="badge bg-success-subtle text-success">AI Active</span>}
              {recoLoading && <span className="badge bg-success-subtle text-success">Refreshing…</span>}
            </div>
          </div>
          {aiNotice && (
            <div className="alert alert-warning py-2" role="alert">
              {aiNotice}
            </div>
          )}
          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <div className="row g-3">
              {recipes.map(r => (
                <div className="col-12" key={r.name}>
                  <div className="border rounded p-3">
                    <h5 className="mb-2">{diet==='veg' ? '🥗' : '🍗'} {r.name}</h5>
                    {r.items?.length ? (
                      <>
                        <div className="small text-muted">Ingredients:</div>
                        <ul className="mb-0">
                          {r.items.map(i => <li key={i}>{i}</li>)}
                        </ul>
                      </>
                    ) : (
                      <div className="text-muted">No ingredients listed.</div>
                    )}
                    {r.instructions && (
                      <div className="mt-2 small">{r.instructions}</div>
                    )}
                  </div>
                </div>
              ))}
              {recipes.length === 0 && !recoLoading && (
                <div className="text-muted">Add items to your cart to see AI-recommended dishes.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
