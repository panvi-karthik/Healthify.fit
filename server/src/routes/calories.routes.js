const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { getSmartBudget } = require('../controllers/calories.controller')

// Requires auth to analyze user's history
router.get('/smart-budget', auth(true), getSmartBudget)

module.exports = router
