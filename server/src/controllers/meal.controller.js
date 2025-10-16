const path = require('path')
const Meal = require('../models/Meal')
const { estimateCaloriesFromText } = require('../utils/nutritionix')
const fs = require('fs')
const OpenAI = require('openai')
const { isCloudinaryEnabled, uploadImage } = require('../utils/cloudinary')
const { GoogleGenerativeAI } = require('@google/generative-ai')

async function listMeals(req, res, next) {
  try {
    const meals = await Meal.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(meals)
  } catch (err) {
    next(err)
  }
}

async function isFoodImage(file) {
  try {
    // Basic guard: must be an image/* mimetype
    if (!file?.mimetype || !file.mimetype.startsWith('image/')) return false
    const b64 = fs.readFileSync(file.path, { encoding: 'base64' })
    // Prefer Gemini if available
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash' })
        const prompt = `Classify if the image shows edible food or a prepared meal. Answer ONLY valid JSON: { "isFood": boolean, "confidence": number (0-1), "label": string }`
        const result = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType: file.mimetype || 'image/jpeg', data: b64 } },
        ])
        const text = result?.response?.text?.() || '{}'
        let parsed
        try {
          parsed = JSON.parse(String(text).replace(/```json/gi,'```').replace(/```/g,''))
        } catch { parsed = {} }
        if (typeof parsed.isFood === 'boolean' && parsed.isFood) return true
        const conf = typeof parsed?.confidence === 'number' ? parsed.confidence : 0
        const label = String(parsed?.label || '').toLowerCase()
        if (conf >= 0.5) return true
        if (/(food|meal|dish|curry|salad|pizza|burger|biryani|dosa|idli|sambar|rice|noodles|pasta|roti|chapati|naan|dal|paneer|pulao|poha|paratha|upma|vada|chole|bhature|samosa|pav|tikka|kebab|fish|mutton|egg|omelette|sandwich|soup|dessert|sweet|chai)/.test(label)) return true
      } catch {/*fall through*/}
    }
    // Fallback: OpenAI vision
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const prompt = `Classify if the image shows edible food or a prepared meal. Answer ONLY valid JSON: { "isFood": boolean, "confidence": number (0-1), "label": string }`
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: [
              { type: 'input_text', text: 'Is this image food?' },
              { type: 'input_image', image_url: { url: `data:${file.mimetype||'image/jpeg'};base64,${b64}` } },
            ] },
          ],
          temperature: 0.1,
          max_tokens: 50,
        })
        const text = response.choices?.[0]?.message?.content || '{}'
        let parsed
        try { parsed = JSON.parse(text) } catch { parsed = {} }
        if (typeof parsed.isFood === 'boolean' && parsed.isFood) return true
        const conf = typeof parsed?.confidence === 'number' ? parsed.confidence : 0
        const label = String(parsed?.label || '').toLowerCase()
        if (conf >= 0.6) return true
        if (/(food|meal|dish|curry|salad|pizza|burger|rice|noodles|pasta|roti|chapati|cake|bread)/.test(label)) return true
      } catch {/* ignore */}
    }
    // If no vision available, decide based on STRICT_FOOD_VALIDATION
    if (String(process.env.STRICT_FOOD_VALIDATION).toLowerCase() === 'true') {
      return false
    }
    return true
  } catch {
    if (String(process.env.STRICT_FOOD_VALIDATION).toLowerCase() === 'true') {
      return false
    }
    return true
  }
}

async function uploadMeal(req, res, next) {
  try {
    const file = req.file
    const { description } = req.body
    if (!file && !description) return res.status(400).json({ message: 'Image or description required' })

    let name = 'meal'
    let calories = 0
    let meta = {}

    // Validate image content is food
    if (file) {
      const ok = await isFoodImage(file)
      if (!ok) {
        res.status(400)
        throw new Error('The uploaded image does not appear to be food. Please upload a clear meal/food photo.')
      }
    }

    if (file && process.env.GOOGLE_API_KEY) {
      // Try Gemini Vision first if configured
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash' })
        const b64 = fs.readFileSync(file.path, { encoding: 'base64' })
        const prompt = `You are a nutrition analyst. Given a meal photo, estimate total calories, macros, and key vitamins/minerals.
Respond ONLY valid JSON with this exact shape:
{
  "name": string,
  "calories": number,
  "macros": { "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number },
  "vitamins": { "vitaminA": string, "vitaminC": string, "iron": string, "calcium": string, "sodium": string }
}
Numbers are for a single serving; vitamins/minerals can be expressed in mg, mcg, IU, or %DV as strings.`
        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: file.mimetype || 'image/jpeg',
              data: b64,
            },
          },
        ])
        const content = result?.response?.text?.() || '{}'
        const parsed = JSON.parse(content)
        name = parsed.name || name
        calories = Number(parsed.calories) || 0
        meta = { ...parsed, source: 'gemini' }
      } catch (e) {
        // fall back to OpenAI or Nutritionix
      }
    }

    if (file && calories === 0 && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const b64 = fs.readFileSync(file.path, { encoding: 'base64' })
        const prompt = `You are a nutrition analyst. Given a meal photo, estimate total calories and macros. Respond ONLY in JSON with keys: name (string), calories (number), macros { protein, carbs, fat } (numbers). Keep numbers reasonable for a single serving.`
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            {
              role: 'user',
              content: [
                { type: 'input_text', text: 'Estimate this meal:' },
                { type: 'input_image', image_url: { url: `data:image/jpeg;base64,${b64}` } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 200,
        })
        const content = response.choices?.[0]?.message?.content || '{}'
        const parsed = JSON.parse(content)
        name = parsed.name || name
        calories = Number(parsed.calories) || 0
        meta = { ...parsed, source: 'openai' }
      } catch (e) {
        // Vision failed; fallback to text based on filename/description
        const text = description || (file ? path.parse(file.originalname).name : 'meal')
        const est = await estimateCaloriesFromText(text)
        name = est.name
        calories = est.calories
        meta = { ...est.meta, source: 'nutritionix-fallback' }
      }
    } else if (calories === 0) {
      const text = description || (file ? path.parse(file.originalname).name : 'meal')
      const est = await estimateCaloriesFromText(text)
      name = est.name
      calories = est.calories
      meta = est.meta
    }

    // Simple validation: ensure we got a plausible food estimate
    if (!name || Number.isNaN(Number(calories)) || Number(calories) <= 0) {
      res.status(400)
      throw new Error('Invalid image. Please upload a valid food image.')
    }

    // If Cloudinary is enabled, upload image and use remote URL
    let imageUrl = file ? `/uploads/${path.basename(file.path)}` : undefined
    if (file && isCloudinaryEnabled()) {
      let uploaded = false
      try {
        const url = await uploadImage(file.path)
        if (url) {
          imageUrl = url
          uploaded = true
        }
      } catch (e) {
        // Cloud upload failed — keep local file so /uploads/<file> works
      } finally {
        // Clean up local file ONLY if remote upload succeeded
        if (uploaded) {
          try { fs.unlinkSync(file.path) } catch {}
        }
      }
    }

    const meal = await Meal.create({
      userId: req.user.id,
      imageUrl,
      description: description || null,
      name,
      calories,
      meta,
      timestamp: new Date(),
    })
    // Update today's CalorieHistory (simple add)
    try {
      const CalorieHistory = require('../models/CalorieHistory')
      const User = require('../models/User')
      const start = new Date()
      start.setHours(0,0,0,0)
      const end = new Date()
      end.setHours(23,59,59,999)
      const user = await User.findById(req.user.id).select('calorieGoal')
      const goal = user?.calorieGoal || 2000
      const existing = await CalorieHistory.findOne({ userId: req.user.id, date: { $gte: start, $lte: end } })
      if (existing) {
        existing.dailyIntake = (existing.dailyIntake || 0) + Number(calories || 0)
        await existing.save()
      } else {
        await CalorieHistory.create({ userId: req.user.id, dailyIntake: Number(calories || 0), dailyGoal: goal, date: new Date() })
      }
    } catch (e) {
      // Non-fatal
    }
    res.status(201).json(meal)
  } catch (err) {
    next(err)
  }
}

async function deleteMeal(req, res, next) {
  try {
    const id = req.params.id
    const meal = await Meal.findOne({ _id: id, userId: req.user.id })
    if (!meal) {
      res.status(404)
      throw new Error('Meal not found')
    }
    // If local upload exists, delete file
    if (meal.imageUrl && meal.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', meal.imageUrl)
      try { fs.unlinkSync(filePath) } catch {}
    }
    await Meal.deleteOne({ _id: id })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { listMeals, uploadMeal, deleteMeal }
