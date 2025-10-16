const mongoose = require('mongoose')

const MealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String },
    calories: { type: Number, default: 0 },
    macros: {
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    timestamp: { type: Date, default: Date.now },
    // Keep raw meta optionally for debugging or extended info
    meta: { type: Object },
    name: { type: String },
    description: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Meal', MealSchema)
