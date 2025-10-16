const CalorieHistory = require('../models/CalorieHistory')

// Simple smart budget algorithm:
// - Look at the last 14 days of records
// - Compute average variance (dailyIntake - dailyGoal)
// - Adjust current goal by -10% if consistently over by >10%, +10% if consistently under by >10%
// - Clamp between 1400 and 3500 kcal
async function getSmartBudget(req, res, next) {
  try {
    const userId = req.user.id
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const history = await CalorieHistory.find({ userId, date: { $gte: since } }).sort({ date: 1 })

    if (!history.length) {
      return res.json({
        suggestedGoal: 2000,
        reason: 'No history found; defaulting to 2000 kcal',
        daysAnalyzed: 0,
      })
    }

    const avgGoal = history.reduce((s, h) => s + h.dailyGoal, 0) / history.length
    const avgIntake = history.reduce((s, h) => s + h.dailyIntake, 0) / history.length
    const variancePct = (avgIntake - avgGoal) / Math.max(1, avgGoal)

    let suggested = avgGoal
    let reason = 'Maintaining current average goal based on recent history.'

    if (variancePct > 0.1) {
      suggested = Math.round(avgGoal * 0.9)
      reason = 'Average intake exceeded goal by >10%. Suggest reducing goal by ~10%.'
    } else if (variancePct < -0.1) {
      suggested = Math.round(avgGoal * 1.1)
      reason = 'Average intake was below goal by >10%. Suggest increasing goal by ~10% to match appetite/needs.'
    }

    suggested = Math.min(3500, Math.max(1400, suggested))

    res.json({
      suggestedGoal: suggested,
      reason,
      daysAnalyzed: history.length,
      avgGoal: Math.round(avgGoal),
      avgIntake: Math.round(avgIntake),
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getSmartBudget }
