import { useEffect, useState } from 'react'
import api from '../services/api'

const activities = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active']

export default function Profile() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    age: '',
    weight: '',
    height: '',
    activity: activities[0],
    dietPreference: 'veg',
    calorieGoal: 2000,
  })
  // Unit toggles and imperial helpers
  const [useImperial, setUseImperial] = useState(false)
  const [ft, setFt] = useState('')
  const [inch, setInch] = useState('')
  const [lbs, setLbs] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setMessage('')
      try {
        const { data } = await api.get('/auth/me')
        if (!mounted) return
        const metric = {
          name: data.name || '',
          email: data.email || '',
          age: data.age || '',
          weight: data.weight || '',
          height: data.height || '',
          activity: data.activity || activities[0],
          dietPreference: data.dietPreference || 'veg',
          calorieGoal: data.calorieGoal || 2000,
        }
        setForm(metric)
        // initialize imperial fields from metric
        const h = Number(metric.height) || 0
        if (h > 0) {
          const totalIn = h / 2.54
          const feet = Math.floor(totalIn / 12)
          const inches = Math.round(totalIn - feet * 12)
          setFt(String(feet))
          setInch(String(inches))
        }
        const w = Number(metric.weight) || 0
        if (w > 0) setLbs(String(Math.round(w * 2.20462)))
      } catch (e) {
        setMessage(e?.response?.data?.message || 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Converters
  const cmFromFtIn = (f, i) => {
    const feet = Number(f) || 0
    const inches = Number(i) || 0
    const totalIn = Math.max(0, feet * 12 + inches)
    return Math.round(totalIn * 2.54)
  }
  const kgFromLbs = (pounds) => {
    const l = Number(pounds) || 0
    return Math.round(l / 2.20462)
  }

  const onFtChange = (v) => {
    setFt(v)
    const cm = cmFromFtIn(v, inch)
    setForm((f) => ({ ...f, height: String(cm) }))
  }
  const onInchChange = (v) => {
    setInch(v)
    const cm = cmFromFtIn(ft, v)
    setForm((f) => ({ ...f, height: String(cm) }))
  }
  const onLbsChange = (v) => {
    setLbs(v)
    const kg = kgFromLbs(v)
    setForm((f) => ({ ...f, weight: String(kg) }))
  }

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        age: Number(form.age),
        // Always send metric to backend
        weight: Number(form.weight),
        height: Number(form.height),
        activity: form.activity,
        dietPreference: form.dietPreference,
        calorieGoal: Number(form.calorieGoal) || 2000,
      }
      const { data } = await api.patch('/auth/me', payload)
      setMessage('Profile updated successfully.')
      setForm({
        name: data.name,
        email: data.email,
        age: data.age,
        weight: data.weight,
        height: data.height,
        activity: data.activity,
        dietPreference: data.dietPreference,
        calorieGoal: data.calorieGoal,
      })
    } catch (e) {
      setMessage(e?.response?.data?.message || e?.response?.data?.error || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card card-healthy p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0 section-title"><span className="emoji">👤</span> <span>Your Profile</span></h2>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" role="switch" id="unitsSwitch" checked={useImperial} onChange={() => setUseImperial(v => !v)} />
              <label className="form-check-label small" htmlFor="unitsSwitch">{useImperial ? 'Imperial (ft/in, lbs)' : 'Metric (cm, kg)'}</label>
            </div>
          </div>
          {message && <div className="alert alert-info">{message}</div>}
          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <form onSubmit={onSave} className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input name="name" className="form-control" value={form.name} onChange={onChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-control" value={form.email} onChange={onChange} required />
              </div>
              <div className="col-md-3">
                <label className="form-label">Age</label>
                <input name="age" type="number" className="form-control" value={form.age} onChange={onChange} />
              </div>
              {!useImperial ? (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Weight (kg)</label>
                    <input name="weight" type="number" className="form-control" value={form.weight} onChange={onChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Height (cm)</label>
                    <input name="height" type="number" className="form-control" value={form.height} onChange={onChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Weight (lbs)</label>
                    <input type="number" className="form-control" value={lbs} onChange={(e)=>onLbsChange(e.target.value)} />
                    <div className="form-text">Saves as {form.weight || 0} kg</div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Height (ft / in)</label>
                    <div className="d-flex gap-2">
                      <input type="number" className="form-control" placeholder="ft" value={ft} onChange={(e)=>onFtChange(e.target.value)} />
                      <input type="number" className="form-control" placeholder="in" value={inch} onChange={(e)=>onInchChange(e.target.value)} />
                    </div>
                    <div className="form-text">Saves as {form.height || 0} cm</div>
                  </div>
                </>
              )}
              <div className="col-md-3">
                <label className="form-label">Activity</label>
                <select name="activity" className="form-select" value={form.activity} onChange={onChange}>
                  {activities.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Diet Preference</label>
                <select name="dietPreference" className="form-select" value={form.dietPreference} onChange={onChange}>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Calorie Goal (kcal)</label>
                <input name="calorieGoal" type="number" className="form-control" value={form.calorieGoal} onChange={onChange} />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-healthy text-white" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
