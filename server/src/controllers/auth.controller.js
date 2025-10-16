const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { signToken } = require('../utils/jwt')

async function signup(req, res, next) {
  try {
    let { name, age, weight, height, activity, dietPreference, email, password, calorieGoal } = req.body

    // Trim strings where applicable
    name = typeof name === 'string' ? name.trim() : ''
    email = typeof email === 'string' ? email.trim().toLowerCase() : ''
    password = typeof password === 'string' ? password : ''
    activity = typeof activity === 'string' ? activity : 'Sedentary'
    dietPreference = typeof dietPreference === 'string' ? dietPreference : 'veg'

    // Coerce numbers
    const ageNum = Number(age)
    const weightNum = Number(weight)
    const heightNum = Number(height)
    const goalNum = calorieGoal !== undefined && calorieGoal !== null && calorieGoal !== '' ? Number(calorieGoal) : 2000

    // Validate presence and ranges
    if (!name) return res.status(400).json({ message: 'Name is required' })
    if (!email) return res.status(400).json({ message: 'Email is required' })
    if (!password) return res.status(400).json({ message: 'Password is required' })
    if (!Number.isFinite(ageNum) || ageNum <= 0) return res.status(400).json({ message: 'Invalid age' })
    if (!Number.isFinite(weightNum) || weightNum <= 0) return res.status(400).json({ message: 'Invalid weight' })
    if (!Number.isFinite(heightNum) || heightNum <= 0) return res.status(400).json({ message: 'Invalid height' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashed,
      age: ageNum,
      weight: weightNum,
      height: heightNum,
      activity,
      dietPreference: dietPreference || 'veg',
      calorieGoal: Number.isFinite(goalNum) && goalNum > 0 ? goalNum : 2000,
    })
    const token = signToken({ id: user._id, email: user.email })
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, dietPreference: user.dietPreference, calorieGoal: user.calorieGoal } })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken({ id: user._id, email: user.email })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, dietPreference: user.dietPreference, calorieGoal: user.calorieGoal } })
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

async function updateMe(req, res, next) {
  try {
    const updates = {}
    const allowed = ['name','age','weight','height','activity','dietPreference','calorieGoal','email','password']
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (updates.password) {
      updates.password = await bcrypt.hash(String(updates.password), 10)
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

module.exports = { signup, login, me, updateMe }
