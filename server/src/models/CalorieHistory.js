const mongoose = require('mongoose')

const CalorieHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dailyIntake: { type: Number, required: true },
    dailyGoal: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
)

CalorieHistorySchema.index({ userId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('CalorieHistory', CalorieHistorySchema)
