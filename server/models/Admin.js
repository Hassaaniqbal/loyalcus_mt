import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide password']
  }
}, {
  timestamps: true
})

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare password
adminSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const Admin = mongoose.model('Admin', adminSchema)

export default Admin
