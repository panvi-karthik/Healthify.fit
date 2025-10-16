const jwt = require('jsonwebtoken')

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      if (required) return res.status(401).json({ message: 'Unauthorized' })
      return next()
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      req.user = payload
      next()
    } catch (e) {
      if (required) return res.status(401).json({ message: 'Invalid token' })
      next()
    }
  }
}

module.exports = { auth }
