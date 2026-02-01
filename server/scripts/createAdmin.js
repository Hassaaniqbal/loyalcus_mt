import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Admin from '../models/Admin.js'

dotenv.config()

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB Connected')

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'hsn' })

    if (existingAdmin) {
      console.log('Admin user already exists')
      process.exit(0)
    }

    // Create admin user
    const admin = await Admin.create({
      username: 'hsn',
      password: 'hsn123'
    })

    console.log('Admin user created successfully:', admin.username)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

createAdmin()
