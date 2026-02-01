import express from 'express'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import { protect } from '../middleware/auth.js'

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

// Update credentials (protected route)
router.put('/update-credentials', protect, async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body

    // Validate input
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' })
    }

    if (!newUsername && !newPassword) {
      return res.status(400).json({ message: 'Please provide new username or password' })
    }

    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }

    // Find admin by ID from token
    const admin = await Admin.findById(req.user.id)

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword)

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }

    // Check if new username already exists (if changing username)
    if (newUsername && newUsername !== admin.username) {
      const existingAdmin = await Admin.findOne({ username: newUsername })
      if (existingAdmin) {
        return res.status(400).json({ message: 'Username already exists' })
      }
      admin.username = newUsername
    }

    // Update password if provided
    if (newPassword) {
      admin.password = newPassword
    }

    await admin.save()

    res.json({
      message: 'Credentials updated successfully',
      username: admin.username
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
