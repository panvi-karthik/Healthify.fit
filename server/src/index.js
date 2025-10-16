const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const { connectDB } = require('./config/db')
const authRoutes = require('./routes/auth.routes')
const groceryRoutes = require('./routes/grocery.routes')
const chatRoutes = require('./routes/chat.routes')
const caloriesRoutes = require('./routes/calories.routes')
const { notFound, errorHandler } = require('./middleware/error')
const { configureCloudinary, isCloudinaryEnabled } = require('./utils/cloudinary')

const app = express()

// Security and basic middleware
app.use(helmet())
// Support multiple origins via comma-separated CORS_ORIGIN
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (origins.includes(origin)) return callback(null, true)
    // Allow any Vercel app domain (production or preview)
    if (/^https?:\/\/[^/]+\.vercel\.app$/i.test(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}
app.use(cors(corsOptions))
// Ensure all preflight requests are handled
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Cloudinary
configureCloudinary()
if (isCloudinaryEnabled()) {
  console.log('Cloudinary configured: uploads will be stored on Cloudinary')
}

// Static uploads (for demo image storage)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/grocery', groceryRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/calories', caloriesRoutes)

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  vision: {
    google: !!process.env.GOOGLE_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  },
  strictFoodValidation: String(process.env.STRICT_FOOD_VALIDATION).toLowerCase() === 'true'
}))

// 404 and error handlers
app.use(notFound)
app.use(errorHandler)

// Start server after DB connection
const PORT = process.env.PORT || 5000
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
}).catch((err) => {
  console.error('Failed to connect DB', err)
  process.exit(1)
})
// restart: nodemon ping
// restart: nodemon ping 2
