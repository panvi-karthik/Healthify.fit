const router = require('express').Router()
const { signup, login, me, updateMe } = require('../controllers/auth.controller')
const { auth } = require('../middleware/auth')

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', auth(true), me)
router.patch('/me', auth(true), updateMe)

module.exports = router
