const OpenAI = require('openai')
const axios = require('axios')

function staticPlan(diet = 'veg') {
  const baseVeg = [
    'Spinach', 'Broccoli', 'Carrots', 'Tomatoes', 'Chickpeas', 'Lentils', 'Quinoa', 'Brown Rice', 'Greek Yogurt', 'Fruits'
  ]
  const baseNonVeg = [
    'Chicken Breast', 'Eggs', 'Fish', 'Greek Yogurt', 'Brown Rice', 'Sweet Potatoes', 'Olive Oil', 'Avocados', 'Fruits', 'Veggies'
  ]

  const recipesVeg = [
    { name: 'Quinoa Buddha Bowl', items: ['Quinoa', 'Chickpeas', 'Spinach', 'Avocado', 'Carrots'], instructions: 'Cook quinoa, top with veggies and chickpeas.' },
    { name: 'Paneer Stir-fry', items: ['Paneer', 'Bell Peppers', 'Broccoli', 'Soy Sauce', 'Garlic'], instructions: 'Stir-fry paneer and veggies; season to taste.' },
  ]
  const recipesNonVeg = [
    { name: 'Grilled Chicken Salad', items: ['Chicken Breast', 'Lettuce', 'Tomatoes', 'Olive Oil', 'Lemon'], instructions: 'Grill chicken; toss with salad and dressing.' },
    { name: 'Tuna Wrap', items: ['Whole-wheat Wraps', 'Tuna', 'Greek Yogurt', 'Cucumber', 'Dill'], instructions: 'Mix tuna and yogurt; assemble wrap.' },
  ]

  const items = (diet === 'veg' ? baseVeg : baseNonVeg).map((name) => ({ name }))
  const recipes = diet === 'veg' ? recipesVeg : recipesNonVeg
  return { items, recipes }
}

async function getGrocery(req, res, next) {
  try {
    const diet = req.query.diet === 'non-veg' ? 'non-veg' : 'veg'
    const week = req.query.week || new Date().toISOString().slice(0, 10)

    // Do not use OpenAI. Provide static items; recipes will come from Google recommend endpoint.
    const plan = staticPlan(diet)
    return res.json({ diet, week, items: plan.items, recipes: [], meta: { source: 'static' } })
  } catch (err) {
    next(err)
  }
}

module.exports = { getGrocery }

// AI recommend endpoint (Perplexity or Google)
async function recommendGrocery(req, res, next) {
  try {
    const diet = req.body?.diet === 'non-veg' ? 'non-veg' : 'veg'
    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [] // [{name, quantity}]

    // Fallback recommender: pick recipes that use many items from cart
    const fallback = () => {
      const base = staticPlan(diet)
      if (!cart.length) return { recipes: base.recipes }
      const have = new Set(cart.map((c) => String(c.name || '').toLowerCase()))
      const scored = base.recipes
        .map(r => ({ r, score: (r.items || []).reduce((s, it) => s + (have.has(String(it).toLowerCase()) ? 1 : 0), 0) }))
        .sort((a,b)=>b.score - a.score)
        .map(x => x.r)
      return { recipes: scored }
    }

    const perplexityKey = process.env.PERPLEXITY_API_KEY
    const googleKey = process.env.GOOGLE_API_KEY

    // Try Perplexity first
    if (perplexityKey) {
      try {
        const client = new OpenAI({ 
          apiKey: perplexityKey,
          baseURL: 'https://api.perplexity.ai'
        })
        
        const cartItems = cart.map(c => `${c.name} (x${c.quantity||1})`).join(', ')
        const prompt = `I have these grocery items in my cart: ${cartItems}. 
My diet preference is ${diet}.
Please suggest 4 quick, budget-friendly recipes (under 20 minutes each) that use these items.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{"recipes": [{"name": "Recipe Name", "items": ["ingredient1", "ingredient2"], "instructions": "Brief cooking steps"}]}`

        const response = await client.chat.completions.create({
          model: 'sonar',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 800,
        })

        let text = response.choices?.[0]?.message?.content || '{}'
        
        // Parse JSON from response
        const tryParse = (t) => {
          try {
            let s = String(t || '')
            s = s.replace(/```json/gi, '```').replace(/```/g, '').trim()
            const start = s.indexOf('{')
            const end = s.lastIndexOf('}')
            if (start !== -1 && end !== -1 && end > start) {
              s = s.slice(start, end + 1)
            }
            const parsed = JSON.parse(s)
            return Array.isArray(parsed?.recipes) ? parsed.recipes : null
          } catch {
            return null
          }
        }

        let recipes = tryParse(text)
        if (recipes && recipes.length > 0) {
          console.log('[reco] source=perplexity cart=%d recipes=%d', cart.length, recipes.length)
          return res.json({ diet, recipes, meta: { source: 'perplexity' } })
        }
      } catch (e) {
        console.error('[reco] perplexity error:', e.message)
        // Fall through to Google AI
      }
    }

    // Try Google AI if Perplexity failed or not configured
    if (googleKey) {
      try {
        // Use native fetch (Node 18+)
        const model = process.env.GOOGLE_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(googleKey)}`
        const sys = `You are a helpful nutrition assistant.
Rules:
- Diet: ${diet}.
- Propose 4 quick, budget-friendly recipes (target < 20 minutes each).
- Prefer using items from the cart; you may add up to 2 common pantry items if necessary (e.g., salt, oil).
- Keep ingredient lists short (<= 6 items each) and simple instructions (<= 2 sentences).
- Return ONLY valid JSON (no markdown) exactly in this shape:
  { "recipes": [ { "name": string, "items": string[], "instructions": string } ] }
`;
        const user = `Cart items: ${cart.map(c => `${c.name} x${c.quantity||1}`).join(', ')}`
        const body = {
          contents: [
            { role: 'user', parts: [{ text: sys + "\n\n" + user }] }
          ],
          generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
        }

        const { data } = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } })
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

        // Helper: attempt to parse text as JSON, stripping fences if present
        const tryParse = (t) => {
          try {
            let s = String(t || '')
            // remove markdown code fences if present
            s = s.replace(/```json/gi, '```').replace(/```/g, '')
            // extract first JSON object substring
            const start = s.indexOf('{')
            const end = s.lastIndexOf('}')
            if (start !== -1 && end !== -1 && end > start) {
              s = s.slice(start, end + 1)
            }
            const parsed = JSON.parse(s)
            const arr = Array.isArray(parsed?.recipes) ? parsed.recipes : []
            return arr
          } catch {
            return null
          }
        }

        let recipes = tryParse(text)

        // If parsing failed, retry once with a stricter prompt
        if (!recipes) {
          const strictBody = {
            contents: [
              { role: 'user', parts: [{ text: `Return ONLY valid JSON. Shape: { "recipes": [ { "name": string, "items": string[], "instructions": string } ] }. Diet: ${diet}. Cart: ${cart.map(c => c.name).join(', ')}` }] }
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
          }
          const { data: data2 } = await axios.post(url, strictBody, { headers: { 'Content-Type': 'application/json' } })
          text = data2?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
          recipes = tryParse(text)
        }

        // If still no parse, return empty set (do not fall back to static when key exists)
        if (!recipes) {
          recipes = []
          console.warn('[reco] parse-failed model=%s', model)
          return res.json({ diet, recipes, meta: { source: 'google-parse-failed', model } })
        }

        console.log('[reco] source=google model=%s cart=%d recipes=%d', model, cart.length, recipes.length)
        return res.json({ diet, recipes, meta: { source: 'google', model } })
      } catch (e) {
        console.error('[reco] google error:', e.message)
        // Fall through to fallback
      }
    }

    // Final fallback
    const fb = fallback()
    return res.json({ diet, ...fb, meta: { source: 'static' } })
  } catch (err) {
    // Fall back silently
    try {
      const diet = req.body?.diet === 'non-veg' ? 'non-veg' : 'veg'
      const cart = Array.isArray(req.body?.cart) ? req.body.cart : []
      const base = staticPlan(diet)
      console.error('[reco] error-fallback', err?.message)
      return res.json({ diet, recipes: base.recipes, meta: { source: 'error-fallback', message: err?.message } })
    } catch {
      next(err)
    }
  }
}

module.exports.recommendGrocery = recommendGrocery
