const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const User = require('../models/User')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// In-memory lightweight dialog summaries keyed by user or IP
const convoSummaries = new Map()

// Simple rate-limit cooldowns to avoid hammering the API repeatedly when quota is hit
const cooldown = {
  textUntil: 0,
  visionUntil: 0,
}

function buildLocalReply(messages, dietPref) {
  const last = messages?.length ? messages[messages.length - 1]?.content || '' : ''
  const ask = String(last || '').toLowerCase()
  const bullets = []
  const pref = dietPref === 'veg' ? 'vegetarian' : 'non-vegetarian'
  if (/calorie|kcal|energy/.test(ask)) {
    bullets.push('Estimate portions: half veggies, quarter protein, quarter carbs.')
    bullets.push('Pick lean proteins (tofu/paneer/eggs/legumes) and whole grains.')
    bullets.push('Aim for consistent meals and stay hydrated.')
  } else if (/recipe|meal|cook|dish/.test(ask)) {
    bullets.push(`Try a quick ${pref} plate: protein + veggies stir‑fry + whole grain.`)
    bullets.push('Use minimal oil; season with herbs/spices for flavor.')
    bullets.push('Balance macros: target protein with each meal.')
  } else if (/grocery|shopping|buy/.test(ask)) {
    bullets.push('Base list: leafy greens, colorful veggies, fruits, whole grains.')
    bullets.push(`Protein staples (${pref}): tofu/paneer/eggs/beans or lean meats/fish.`)
    bullets.push('Healthy fats: nuts, seeds, olive/groundnut oil.')
  } else {
    bullets.push('Clarify your goal (weight, protein, calories) to get a tailored plan.')
    bullets.push('Keep meals simple: protein + veggies + whole grain + healthy fat.')
    bullets.push('Plan snacks (fruits, yogurt, nuts) to avoid impulsive eating.')
  }
  const intro = last ? `Here’s a quick, actionable guide for your request: “${last.slice(0,120)}${last.length>120?'…':''}”` : 'Here’s a quick, actionable guide:'
  return `${intro}\n• ${bullets.join('\n• ')}`
}

const tips = [
  'Prioritize whole foods: veggies, fruits, lean proteins, and whole grains.',
  'Stay hydrated: aim for 8–10 glasses of water per day.',
  'Plan meals ahead to avoid impulsive high-calorie choices.',
  'Balance your plate: half veggies, quarter protein, quarter carbs.',
]

async function chat(req, res, next) {
  try {
    const { messages } = req.body
    if (!Array.isArray(messages)) return res.status(400).json({ message: 'messages must be an array' })

    const apiKey = process.env.OPENAI_API_KEY
    const gKey = process.env.GOOGLE_API_KEY
    const perplexityKey = process.env.PERPLEXITY_API_KEY

    let dietPref = 'veg'
    try {
      if (req.user?.id) {
        const u = await User.findById(req.user.id).select('dietPreference')
        if (u?.dietPreference) dietPref = u.dietPreference
      }
    } catch {}

    // Identify convo key for memory (user or IP)
    const convoKey = req.user?.id || req.ip || 'anon'
    const prevSummary = convoSummaries.get(convoKey) || ''

    // Cooldown: if text chat is under cooldown, return local reply to avoid repeated rate-limit responses
    if (Date.now() < cooldown.textUntil) {
      const content = buildLocalReply(messages, dietPref)
      return res.json({ role: 'assistant', content, meta: { source: 'local-fallback', cooled: true } })
    }

    // Prefer Perplexity if configured
    if (perplexityKey) {
      try {
        const client = new OpenAI({ 
          apiKey: perplexityKey,
          baseURL: 'https://api.perplexity.ai'
        })
        const system = {
          role: 'system',
          content: `You are HealthyLife, a friendly nutrition assistant. The user's diet preference is ${dietPref}. Give concise, practical, and encouraging guidance about meals, calories, groceries, and healthier choices. Prefer ${dietPref === 'veg' ? 'vegetarian' : 'non-vegetarian'} options. Keep answers under 120 words, use simple bullet points when useful.`,
        }

        const response = await client.chat.completions.create({
          model: 'sonar-pro',
          messages: [system, ...messages],
          temperature: 0.6,
          max_tokens: 280,
        })

        const content = response.choices?.[0]?.message?.content || tips[Math.floor(Math.random() * tips.length)]
        return res.json({ role: 'assistant', content, meta: { source: 'perplexity' } })
      } catch (e) {
        console.error('Perplexity API error:', e.message)
        const msg = String(e?.message || '')
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          cooldown.textUntil = Date.now() + 30_000
          const content = buildLocalReply(messages, dietPref)
          return res.json({ role: 'assistant', content, meta: { source: 'local-fallback', rate_limited: true } })
        }
        // fall through to Gemini or OpenAI
      }
    }

    // Try Gemini if configured
    if (gKey) {
      try {
        const genAI = new GoogleGenerativeAI(gKey)
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' })
        const systemPrompt = `You are HealthyLife, a friendly nutrition assistant. The user's diet preference is ${dietPref}. Give concise, practical, and encouraging guidance about meals, calories, groceries, and healthier choices. Prefer ${dietPref === 'veg' ? 'vegetarian' : 'non-vegetarian'} options. Keep answers under 120 words, use simple bullet points when useful.`
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          prevSummary ? { role: 'user', parts: [{ text: `Conversation summary so far (for context only): ${prevSummary}` }] } : undefined,
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }))
        ].filter(Boolean)
        const result = await model.generateContent({
          contents,
          generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 280 },
        })
        const content = result?.response?.text?.() || tips[Math.floor(Math.random() * tips.length)]
        // Attempt to update summary in the background
        try {
          const shortHistory = [...messages.slice(-4), { role: 'assistant', content }]
          const sumPrompt = `Summarize this nutrition chat into <= 80 words focusing on goals and constraints, to improve future answers. Return plain text.`
          const sumContents = [
            { role: 'user', parts: [{ text: sumPrompt }] },
            ...shortHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          ]
          const sumRes = await model.generateContent({ contents: sumContents, generationConfig: { temperature: 0.2, maxOutputTokens: 120 } })
          const newSummary = sumRes?.response?.text?.() || prevSummary
          if (newSummary) convoSummaries.set(convoKey, newSummary)
        } catch {}
        return res.json({ role: 'assistant', content, meta: { source: 'gemini', summarized: true } })
      } catch (e) {
        const msg = String(e?.message || '')
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          // Set a short cooldown (30s) and return a helpful local reply instead of repeating the same message
          cooldown.textUntil = Date.now() + 30_000
          const content = buildLocalReply(messages, dietPref)
          return res.json({ role: 'assistant', content, meta: { source: 'local-fallback', rate_limited: true } })
        }
        // fall through to OpenAI or mock
      }
    }

    if (apiKey) {
      const client = new OpenAI({ apiKey })
      const system = {
        role: 'system',
        content:
          `You are HealthyLife, a friendly nutrition assistant. The user's diet preference is ${dietPref}. Give concise, practical, and encouraging guidance about meals, calories, groceries, and healthier choices. Prefer ${dietPref === 'veg' ? 'vegetarian' : 'non-vegetarian'} options. Keep answers under 120 words, use simple bullet points when useful.`,
      }

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [system, ...messages],
        temperature: 0.6,
        max_tokens: 280,
      })

      const content = response.choices?.[0]?.message?.content || tips[Math.floor(Math.random() * tips.length)]
      return res.json({ role: 'assistant', content, meta: { source: 'openai' } })
    }

    // Mock fallback
    const reply = tips[Math.floor(Math.random() * tips.length)]
    return res.json({ role: 'assistant', content: reply, meta: { source: 'mock' } })
  } catch (err) {
    next(err)
  }
}

module.exports = { chat }

async function chatWithImage(req, res, next) {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ message: 'image is required' })
    if (!file.mimetype?.startsWith('image/')) return res.status(400).json({ message: 'Only image files are supported' })

    const gKey = process.env.GOOGLE_API_KEY
    if (!gKey) return res.status(400).json({ message: 'Google API key not configured' })

    // Read image as base64
    const b64 = fs.readFileSync(file.path, { encoding: 'base64' })

    // Build prompt for nutrition-focused analysis
    const prompt = `You are a helpful nutrition assistant. Analyze the attached food photo and reply with:
1) Likely dish/ingredients.
2) Estimated calories and macros (protein, carbs, fat) for one serving.
3) 2–3 short suggestions to make it healthier.
Keep it concise (<120 words).`;

    const genAI = new GoogleGenerativeAI(gKey)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash' })
    try {
      if (Date.now() < cooldown.visionUntil) {
        const fallback = 'I\'m temporarily at my image analysis limit. Tip: center the dish, good lighting, and I can also help by text meanwhile.'
        return res.json({ role: 'assistant', content: fallback, meta: { source: 'local-fallback', vision: true, cooled: true } })
      }
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: file.mimetype, data: b64 } },
      ])
      const content = result?.response?.text?.() || 'I analyzed the image.'
      return res.json({ role: 'assistant', content, meta: { source: 'gemini', vision: true } })
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        cooldown.visionUntil = Date.now() + 30_000
        const friendly = 'I\'m at my image analysis limit right now. I\'ll be ready again soon. Meanwhile, I can suggest general nutrition tips if you describe the dish.'
        return res.json({ role: 'assistant', content: friendly, meta: { source: 'local-fallback', vision: true, rate_limited: true } })
      }
      throw e
    }
  } catch (err) {
    next(err)
  }
}

module.exports.chatWithImage = chatWithImage
