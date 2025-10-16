import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useToasts } from '../components/Toasts'

export default function Meals() {
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({}) // filename -> percent
  const toasts = useToasts()
  const fileInputRef = useRef(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadMeals = async () => {
    try {
      const { data } = await api.get('/meals')
      setItems(data)
    } catch (e) {
      // handled by interceptor for 401
    }
  }

  useEffect(() => {
    loadMeals()
  }, [])

  const onFileChange = (e) => {
    setFiles(Array.from(e.target.files || []))
  }

  const uploadOne = async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const name = file.name
    setProgress((p) => ({ ...p, [name]: 0 }))
    try {
      const { data } = await api.post('/meals/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (!e.total) return
          const pct = Math.round((e.loaded / e.total) * 100)
          setProgress((p) => ({ ...p, [name]: pct }))
        },
      })
      setItems((prev) => [data, ...prev])
      toasts.success(`Uploaded ${name}`)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || `Upload failed: ${name}`
      setError(msg)
      toasts.error(msg)
    } finally {
      setProgress((p) => {
        const c = { ...p }
        delete c[name]
        return c
      })
    }
  }

  const onUpload = async () => {
    if (!files.length) return
    setLoading(true)
    setError('')
    for (const f of files) {
      // sequential to reduce load on server and simplify progress display
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(f)
    }
    setFiles([])
    setLoading(false)
  }

  const totalCalories = items.reduce((sum, x) => sum + (x.calories || 0), 0)

  const onRemove = async (id) => {
    if (!id) return
    setDeletingId(id)
    try {
      await api.delete(`/meals/${id}`)
      setItems((prev) => prev.filter(m => (m._id || m.id) !== id))
      toasts.success('Meal removed')
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to remove meal'
      toasts.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card card-healthy p-4">
          <h3 className="mb-3 section-title"><span className="emoji">🤖🍽️</span> <span>AI Food Analyzer</span></h3>
          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label className="form-label">Select meal images</label>
              {/* Hidden native input */}
              <input ref={fileInputRef} className="visually-hidden" id="meal-files" type="file" accept="image/*" multiple onChange={onFileChange} />
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-cta" onClick={() => fileInputRef.current?.click()}>
                  <span className="btn-cta-bg" aria-hidden></span>
                  <span className="btn-cta-label">📷 Choose Files</span>
                </button>
                {!!files.length && (
                  <span className="badge bg-success-subtle text-success align-self-center">{files.length} selected</span>
                )}
              </div>
          {error && (
            <div className="mt-2 alert alert-danger" role="alert">
              {error}
            </div>
          )}
            </div>
            <div className="col-md-4 d-flex gap-2 justify-content-md-end">
              <button className={`btn btn-analyze ${loading ? 'is-loading' : ''}`} onClick={onUpload} disabled={loading || !files.length}>
                <span className="shine" aria-hidden></span>
                <span className="label">{loading ? 'Analyzing…' : 'Analyze Meal'}</span>
              </button>
              <button className="btn btn-outline-secondary" onClick={() => setFiles([])} disabled={!files.length}>Clear</button>
            </div>
          </div>
          {!!files.length && (
            <div className="mt-3">
              <div className="small text-muted">Pending uploads:</div>
              <ul className="mb-0">
                {files.map((f) => (
                  <li key={f.name} className="d-flex justify-content-between align-items-center">
                    <span>{f.name}</span>
                    {progress[f.name] !== undefined && (
                      <span className="small text-muted">{progress[f.name]}%</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="col-12">
        <div className="card card-healthy p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0 section-title"><span className="emoji">🥗</span> <span>Today&apos;s Meals</span></h4>
            <span className="badge bg-success">Total: {totalCalories} kcal</span>
          </div>
          {items.length === 0 ? (
            <div className="text-muted">No meals yet. Upload an image to get started.</div>
          ) : (
            <div className="row g-3">
              {items.map((m) => (
                <div className="col-sm-6 col-md-4 col-lg-3" key={m._id || m.id}>
                  <div className="card h-100">
                    {m.imageUrl && (
                      <img src={m.imageUrl} className="card-img-top" alt={m.name} style={{objectFit:'cover', height:180}} />
                    )}
                    <div className="card-body">
                      <h6 className="card-title text-truncate" title={m.name}>🍽️ {m.name}</h6>
                      <p className="card-text mb-1"><strong>{m.calories}</strong> kcal (AI est.)</p>
                      {/* Macros */}
                      {m.meta?.macros && (
                        <div className="small text-muted">
                          <div>Protein: <strong>{m.meta.macros.protein ?? '-'}g</strong> • Carbs: <strong>{m.meta.macros.carbs ?? '-'}g</strong> • Fat: <strong>{m.meta.macros.fat ?? '-'}g</strong></div>
                          {(m.meta.macros.fiber !== undefined || m.meta.macros.sugar !== undefined) && (
                            <div>Fiber: <strong>{m.meta.macros.fiber ?? '-' }g</strong> • Sugar: <strong>{m.meta.macros.sugar ?? '-' }g</strong></div>
                          )}
                        </div>
                      )}
                      {/* Vitamins */}
                      {m.meta?.vitamins && (
                        <ul className="mt-2 small text-muted mb-0">
                          {m.meta.vitamins.vitaminA && <li>Vitamin A: <strong>{m.meta.vitamins.vitaminA}</strong></li>}
                          {m.meta.vitamins.vitaminC && <li>Vitamin C: <strong>{m.meta.vitamins.vitaminC}</strong></li>}
                          {m.meta.vitamins.iron && <li>Iron: <strong>{m.meta.vitamins.iron}</strong></li>}
                          {m.meta.vitamins.calcium && <li>Calcium: <strong>{m.meta.vitamins.calcium}</strong></li>}
                          {m.meta.vitamins.sodium && <li>Sodium: <strong>{m.meta.vitamins.sodium}</strong></li>}
                        </ul>
                      )}
                      <div className="mt-2 d-flex justify-content-end">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onRemove(m._id || m.id)}
                          disabled={deletingId === (m._id || m.id)}
                        >
                          {deletingId === (m._id || m.id) ? 'Removing…' : 'Remove Meal'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
