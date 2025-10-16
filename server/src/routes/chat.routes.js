const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { upload } = require('../utils/upload')
const { chat, chatWithImage } = require('../controllers/chat.controller')

router.post('/', auth(false), chat)
router.post('/image', auth(false), upload.single('image'), chatWithImage)

module.exports = router
