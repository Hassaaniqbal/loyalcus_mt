import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from '../server/config/db.js'
import customerRoutes from '../server/routes/customerRoutes.js'
import authRoutes from '../server/routes/authRoutes.js'
import { protect } from '../server/middleware/auth.js'

dotenv.config()

const app = express()

// Connect to MongoDB (with connection reuse for serverless)
let isConnected = false
async function connectToDatabase() {
  if (isConnected) {
    return
  }
  await connectDB()
  isConnected = true
}

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for Vercel deployment
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Connect to DB before handling requests
app.use(async (req, res, next) => {
  await connectToDatabase()
  next()
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/customers', protect, customerRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Root API handler
app.get('/api', (req, res) => {
  res.json({ message: 'Loyalcus API is running' })
})

// Export for Vercel serverless
export default app
