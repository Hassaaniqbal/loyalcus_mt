import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Please provide mobile number'],
    unique: true,
    trim: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Add indexes for fast searching
customerSchema.index({ name: 1 })
customerSchema.index({ mobile: 1 })

const Customer = mongoose.model('Customer', customerSchema)

export default Customer
