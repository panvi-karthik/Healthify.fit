const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true }, // stores hashed password
    age: { type: Number, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    activity: { type: String, enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'], default: 'Sedentary' },
    dietPreference: { type: String, enum: ['veg', 'non-veg'], default: 'veg' },
    calorieGoal: { type: Number, default: 2000 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
