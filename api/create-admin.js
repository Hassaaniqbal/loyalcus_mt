import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import Admin from '../server/models/Admin.js'

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI)
    }

    const { username, password, fullName } = req.body

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username })
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const admin = await Admin.create({
      username,
      password: hashedPassword,
      fullName: fullName || 'Admin User'
    })

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        username: admin.username,
        fullName: admin.fullName
      }
    })
  } catch (error) {
    console.error('Error creating admin:', error)
    res.status(500).json({ error: error.message })
  }
}
