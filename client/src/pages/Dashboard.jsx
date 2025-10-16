import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import api from '../services/api'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

export default function Dashboard() {
  const [profile, setProfile] = useState({ name: '', age: 0, weight: 0, height: 0, calorieGoal: 2000, dietPreference: 'veg' })
  const [goal, setGoal] = useState(2000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [{ data: me }, { data: smart }] = await Promise.all([
          api.get('/auth/me'),
          api.get('/calories/smart-budget').catch(() => ({ data: null })),
        ])
        if (!mounted) return
        setProfile({
          name: me.name,
          age: me.age,
          weight: me.weight,
          height: me.height,
          calorieGoal: me.calorieGoal || 2000,
          dietPreference: me.dietPreference || 'veg',
        })
        setGoal((smart?.suggestedGoal) || me.calorieGoal || 2000)
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const history = useMemo(
    () => ({
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [2100, 1800, 2300, 1950, 2050, 2400, 2000],
    }),
    []
  )

  const chartData = useMemo(
    () => ({
      labels: history.labels,
      datasets: [
        {
          label: 'Calories Consumed',
          data: history.data,
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46,125,50,0.15)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Goal',
          data: new Array(history.data.length).fill(goal),
          borderColor: '#fb8c00',
          borderDash: [6, 6],
          pointRadius: 0,
        },
      ],
    }),
    [history, goal]
  )

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: false },
    },
  }

  const todayIntake = history.data[history.data.length - 1]
  const pct = Math.min(100, Math.round((todayIntake / goal) * 100))
  const over = todayIntake > goal

  // BMI calculations
  const { bmi, bmiLabel, bmiColor, weightDelta, deltaLabel, targetWeight } = useMemo(() => {
    const h = Number(profile.height) || 0
    const w = Number(profile.weight) || 0
    const hm = h > 0 ? h / 100 : 0
    const hm2 = hm * hm
    const bmiVal = hm2 ? w / hm2 : 0
    let label = 'Unknown'
    let color = '#94a3b8'
    if (bmiVal) {
      if (bmiVal < 18.5) { label = 'Underweight'; color = '#3b82f6' }
      else if (bmiVal < 25) { label = 'Healthy'; color = '#10b981' }
      else if (bmiVal < 30) { label = 'Overweight'; color = '#f59e0b' }
      else { label = 'Obese'; color = '#ef4444' }
    }
    const minW = hm2 ? 18.5 * hm2 : 0
    const maxW = hm2 ? 24.9 * hm2 : 0
    let delta = 0
    let dLabel = 'Maintain'
    let target = w
    if (w && hm2) {
      if (w > maxW) { delta = w - maxW; dLabel = 'lose'; target = maxW }
      else if (w < minW) { delta = minW - w; dLabel = 'gain'; target = minW }
    }
    return {
      bmi: Number(bmiVal.toFixed(1)),
      bmiLabel: label,
      bmiColor: color,
      weightDelta: Number(delta.toFixed(1)),
      deltaLabel: dLabel,
      targetWeight: Number(target.toFixed(1)),
    }
  }, [profile.height, profile.weight])

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-5">
        <div className="card card-healthy p-4 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0 section-title">Your Profile</h3>
            <Link to="/profile" className="btn btn-healthy text-white btn-sm">Edit Profile</Link>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <>
              <ul className="list-unstyled mb-0">
                <li className="mb-2"><strong>Name:</strong> {profile.name}</li>
                <li className="mb-2"><strong>Calorie Goal:</strong> {goal} kcal</li>
                <li className="mb-2"><strong>Weight:</strong> {profile.weight} kg</li>
                <li className="mb-2"><strong>Height:</strong> {profile.height} cm</li>
                <li className="mb-2"><strong>Age:</strong> {profile.age}</li>
                <li className="mb-2"><strong>Diet:</strong> {profile.dietPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}</li>
              </ul>
              <div className="mt-4">
                <div className="d-flex justify-content-between small mb-1">
                  <span>Today</span>
                  <span>{todayIntake} / {goal} kcal</span>
                </div>
                <div className={`progress progress-healthy ${over ? 'warn' : ''}`}>
                  <div className="progress-bar" role="progressbar" style={{width: pct + '%'}} aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"></div>
                </div>
              </div>

              {/* BMI Scale */}
              <div className="mt-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="mb-0">BMI</h5>
                  <span className="badge" style={{backgroundColor: bmiColor, color: '#0b1220'}}>{bmi || 0} — {bmiLabel}</span>
                </div>
                {/* Simple segmented scale */}
                {(() => {
                  const min = 10; const max = 40; // visual range
                  const val = Math.max(min, Math.min(max, bmi || 0));
                  const leftPct = ((val - min) / (max - min)) * 100;
                  return (
                    <div>
                      <div style={{display:'grid', gridTemplateColumns:'18.5% 6.5% 25% 50%', gap:2, height: 14, borderRadius: 8, overflow:'hidden', boxShadow:'inset 0 0 0 1px rgba(0,0,0,.15)'}}>
                        <div style={{background:'#3b82f6'}} title="Underweight" />
                        <div style={{background:'#10b981'}} title="Healthy" />
                        <div style={{background:'#f59e0b'}} title="Overweight" />
                        <div style={{background:'#ef4444'}} title="Obese" />
                      </div>
                      <div style={{position:'relative', height: 10}}>
                        <div style={{position:'absolute', left:`calc(${leftPct}% - 6px)`, top:0, width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:`10px solid ${bmiColor}`}} aria-label="BMI marker" />
                      </div>
                      <div className="d-flex justify-content-between small text-muted">
                        <span>10</span>
                        <span>18.5</span>
                        <span>25</span>
                        <span>30</span>
                        <span>40</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Weight change recommendation */}
              <div className="mt-3">
                {weightDelta > 0 ? (
                  <div className="alert alert-info py-2 mb-0">
                    You should <strong>{deltaLabel}</strong> approximately <strong>{weightDelta} kg</strong> to reach about <strong>{targetWeight} kg</strong> (BMI in healthy range).
                  </div>
                ) : (
                  <div className="alert alert-success py-2 mb-0">
                    You're within or close to the healthy BMI range. Maintain your current weight.
                  </div>
                )}
              </div>

              {/* Food suggestions based on goal */}
              <div className="mt-3">
                {deltaLabel === 'lose' && weightDelta > 0 && (
                  <div className="small">
                    <div className="fw-bold mb-1">Suggested foods for weight loss</div>
                    <ul className="mb-2">
                      <li>Lean proteins: <em>chicken breast, tofu, paneer (light), fish, lentils</em></li>
                      <li>High-volume veggies: <em>spinach, broccoli, cucumber, peppers, salad greens</em></li>
                      <li>Whole grains in moderate portions: <em>quinoa, oats, brown rice</em></li>
                      <li>Low-calorie snacks: <em>Greek yogurt, fruits (berries, apple)</em></li>
                    </ul>
                    <div className="text-muted">Tip: Focus on protein and fiber, reduce oils/sugary drinks. Aim 300–500 kcal daily deficit.</div>
                  </div>
                )}
                {deltaLabel === 'gain' && weightDelta > 0 && (
                  <div className="small">
                    <div className="fw-bold mb-1">Suggested foods for healthy weight gain</div>
                    <ul className="mb-2">
                      <li>Calorie-dense proteins: <em>eggs, chicken, fish, paneer, Greek yogurt</em></li>
                      <li>Healthy carbs: <em>sweet potatoes, whole wheat roti, oats, pasta, rice</em></li>
                      <li>Good fats: <em>peanut butter, nuts, seeds, avocado, olive oil</em></li>
                      <li>Shakes/Smoothies: <em>milk + banana + peanut butter + oats</em></li>
                    </ul>
                    <div className="text-muted">Tip: Aim 300–500 kcal daily surplus and include strength training.</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="col-12 col-lg-7">
        <div className="card card-healthy p-4 h-100 chart-card">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="mb-0 section-title"><span className="emoji">🍎</span> <span>Calorie History</span></h3>
            <span className="badge bg-success">Weekly</span>
          </div>
          <Line data={chartData} options={options} height={120} />
        </div>
      </div>
    </div>
  )
}
