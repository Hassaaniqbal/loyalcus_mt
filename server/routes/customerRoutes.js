import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import Customer from '../models/Customer.js'

const router = express.Router()

// Configure multer for file upload (store in memory)
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'))
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ addedDate: -1 })
    res.json(customers)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Add new customer
router.post('/', async (req, res) => {
  try {
    const { name, mobile, dateOfBirth } = req.body

    // Check if customer with mobile already exists
    const existingCustomer = await Customer.findOne({ mobile })
    if (existingCustomer) {
      return res.status(400).json({ message: `Customer with mobile ${mobile} already exists!` })
    }

    const customer = await Customer.create({
      name,
      mobile,
      dateOfBirth: dateOfBirth || null
    })

    res.status(201).json(customer)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Import customers from Excel (Optimized with bulk insertMany)
router.post('/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' })
    }

    const results = {
      total: data.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: []
    }

    // Step 1: Parse and validate all rows
    const parsedRows = []
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // Excel rows start at 1, header is row 1

      // Extract name and mobile (support different column names)
      const name = row.name || row.Name || row.NAME || row['Customer Name'] || row['customer name']
      const mobile = String(row.mobile || row.Mobile || row.MOBILE || row['Mobile Number'] || row['mobile number'] || '').trim()
      const dob = row.dob || row.DOB || row['Date of Birth'] || row['date of birth'] || row.dateOfBirth || row.DateOfBirth || null

      // Validate required fields
      if (!name || !mobile) {
        results.failed++
        results.errors.push({
          row: rowNumber,
          name: name || 'N/A',
          mobile: mobile || 'N/A',
          error: 'Name and mobile are required'
        })
        continue
      }

      parsedRows.push({
        rowNumber,
        name: String(name).trim(),
        mobile,
        dateOfBirth: dob ? new Date(dob) : null
      })
    }

    // Step 2: Get all existing mobile numbers in one query
    const mobilesToCheck = parsedRows.map(r => r.mobile)
    const existingCustomers = await Customer.find(
      { mobile: { $in: mobilesToCheck } },
      { mobile: 1 }
    )
    const existingMobiles = new Set(existingCustomers.map(c => c.mobile))

    // Step 3: Filter out duplicates and prepare for bulk insert
    const customersToInsert = []
    for (const row of parsedRows) {
      if (existingMobiles.has(row.mobile)) {
        results.skipped++
        results.errors.push({
          row: row.rowNumber,
          name: row.name,
          mobile: row.mobile,
          error: 'Mobile number already exists'
        })
      } else {
        customersToInsert.push({
          name: row.name,
          mobile: row.mobile,
          dateOfBirth: row.dateOfBirth
        })
      }
    }

    // Step 4: Bulk insert all valid customers at once
    if (customersToInsert.length > 0) {
      try {
        await Customer.insertMany(customersToInsert, { ordered: false })
        results.imported = customersToInsert.length
      } catch (error) {
        // Handle any unexpected duplicate key errors during insert
        if (error.code === 11000) {
          // Some duplicates got through - count successful inserts
          results.imported = error.insertedDocs ? error.insertedDocs.length : 0
          results.failed += customersToInsert.length - results.imported
          results.errors.push({
            row: 'Multiple',
            name: 'N/A',
            mobile: 'N/A',
            error: 'Some duplicate mobile numbers were detected during insert'
          })
        } else {
          throw error
        }
      }
    }

    res.status(200).json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
      results
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Search customer by name or mobile
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' })
    }

    // Normalize phone number search to handle optional leading zero
    const normalizedQuery = query.replace(/^0+/, '')

    // Use index-friendly pattern for faster search
    const customer = await Customer.findOne({
      $or: [
        { name: { $regex: `^${query}`, $options: 'i' } },
        { mobile: { $regex: `^0?${normalizedQuery}` } }
      ]
    })

    if (customer) {
      res.json({ found: true, customer })
    } else {
      res.json({ found: false, query })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Live search - returns multiple matching customers
router.get('/live-search', async (req, res) => {
  try {
    const { query } = req.query

    if (!query) {
      return res.json({ customers: [] })
    }

    // Normalize phone number search to handle optional leading zero
    const normalizedQuery = query.replace(/^0+/, '')

    // Use ^query pattern for index-friendly prefix matching
    const customers = await Customer.find({
      $or: [
        { name: { $regex: `^${query}`, $options: 'i' } },
        { mobile: { $regex: `^0?${normalizedQuery}` } }
      ]
    })
      .sort({ addedDate: -1 })
      .limit(10)

    res.json({ customers })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Delete all customers - MUST be before /:id route
router.delete('/delete-all', async (req, res) => {
  try {
    const result = await Customer.deleteMany({})

    res.json({
      message: `Successfully deleted all customers`,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, mobile, dateOfBirth } = req.body

    // Check if another customer with the same mobile exists (excluding current customer)
    const existingCustomer = await Customer.findOne({
      mobile,
      _id: { $ne: id }
    })

    if (existingCustomer) {
      return res.status(400).json({ message: `Another customer with mobile ${mobile} already exists!` })
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { name, mobile, dateOfBirth: dateOfBirth || null },
      { new: true, runValidators: true }
    )

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    res.json(customer)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const customer = await Customer.findByIdAndDelete(id)

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    res.json({ message: 'Customer deleted successfully', customer })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
