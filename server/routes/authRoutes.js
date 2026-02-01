import express from 'express'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

const router = express.Router()

// Generate JWT token - expires in 12 hours
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  })
}

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // Check if admin exists
    const admin = await Admin.findOne({ username })

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await admin.comparePassword(password)

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Return token
    res.json({
      _id: admin._id,
      username: admin.username,
      token: generateToken(admin._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Signup admin
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username })

    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' })
    }

    // Create new admin
    const admin = await Admin.create({
      username,
      password
    })

    // Return token
    res.status(201).json({
      _id: admin._id,
      username: admin.username,
      token: generateToken(admin._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const admin = await Admin.findById(decoded.id).select('-password')

    if (!admin) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    res.json({
      _id: admin._id,
      username: admin.username
    })
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
})

export default router
