import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { data } = await api.post('/auth/login', form)
      if (data?.token) localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-10 col-md-8 col-lg-6">
        <div className="card card-healthy p-4">
          <h2 className="mb-3">Welcome back</h2>
          <p className="text-muted">Log in to continue your healthy journey.</p>
          {message && <div className="alert alert-danger">{message}</div>}
          <form onSubmit={onSubmit} className="row g-3">
            <div className="col-12">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={onChange} required />
            </div>
            <div className="col-12">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-control" value={form.password} onChange={onChange} required />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-healthy text-white" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
