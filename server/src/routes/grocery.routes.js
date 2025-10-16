const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { getGrocery, recommendGrocery } = require('../controllers/grocery.controller')

router.get('/', auth(false), getGrocery)
router.post('/recommend', auth(false), recommendGrocery)

module.exports = router
