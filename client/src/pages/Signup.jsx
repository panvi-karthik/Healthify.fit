import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const activities = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active']

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    activity: activities[0],
    dietPreference: 'veg',
    email: '',
    password: '',
    calorieGoal: 2000,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        activity: form.activity,
        dietPreference: form.dietPreference,
        calorieGoal: Number(form.calorieGoal) || 2000,
      }
      const { data } = await api.post('/auth/signup', payload)
      if (data?.token) localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card card-healthy p-4">
          <h2 className="mb-3">Create your Healthify account</h2>
          <p className="text-muted">Start tracking meals, calories and groceries smartly.</p>
          {message && <div className="alert alert-danger">{message}</div>}
          <form onSubmit={onSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input name="name" className="form-control" value={form.name} onChange={onChange} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Age</label>
              <input name="age" type="number" className="form-control" value={form.age} onChange={onChange} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Activity</label>
              <select name="activity" className="form-select" value={form.activity} onChange={onChange}>
                {activities.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Weight (kg)</label>
              <input name="weight" type="number" className="form-control" value={form.weight} onChange={onChange} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Height (cm)</label>
              <input name="height" type="number" className="form-control" value={form.height} onChange={onChange} required />
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
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={onChange} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-control" value={form.password} onChange={onChange} required />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-healthy text-white" disabled={loading}>
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
