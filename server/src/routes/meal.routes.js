const router = require('express').Router()
const { auth } = require('../middleware/auth')
const { upload } = require('../utils/upload')
const { listMeals, uploadMeal, deleteMeal } = require('../controllers/meal.controller')

router.get('/', auth(true), listMeals)
router.post('/upload', auth(true), upload.single('image'), uploadMeal)
router.delete('/:id', auth(true), deleteMeal)

module.exports = router
