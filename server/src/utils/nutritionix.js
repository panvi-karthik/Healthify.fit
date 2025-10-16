const axios = require('axios')

async function estimateCaloriesFromText(query) {
  const appId = process.env.NUTRITIONIX_APP_ID
  const apiKey = process.env.NUTRITIONIX_API_KEY
  if (!appId || !apiKey) {
    // Fallback mock for development without API keys
    return {
      name: query,
      calories: Math.floor(200 + Math.random() * 400),
      meta: { source: 'mock' },
    }
  }
  const url = 'https://trackapi.nutritionix.com/v2/natural/nutrients'
  const { data } = await axios.post(
    url,
    { query },
    { headers: { 'x-app-id': appId, 'x-app-key': apiKey, 'Content-Type': 'application/json' } }
  )
  const first = data?.foods?.[0]
  return {
    name: first?.food_name || query,
    calories: Math.round(first?.nf_calories || 0),
    meta: first || {},
  }
}

module.exports = { estimateCaloriesFromText }
