import { useState, useEffect } from 'react'
import './Dashboard.css'
import ConfirmModal from './ConfirmModal'

// Use relative path for production (Render) or localhost for development
const API_URL = import.meta.env.PROD ? '/api/customers' : 'http://localhost:5000/api/customers'
const AUTH_API_URL = import.meta.env.PROD ? '/api/auth' : 'http://localhost:5000/api/auth'

function Dashboard({ user, onLogout }) {
  const [customers, setCustomers] = useState([])
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [liveSearchResults, setLiveSearchResults] = useState([])
  const [showLiveResults, setShowLiveResults] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importResults, setImportResults] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAppVisible, setIsAppVisible] = useState(true)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: null
  })
  const [showSettings, setShowSettings] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        performLiveSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Handle visibility change - refresh data when app comes back to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      setIsAppVisible(visible)

      // When app becomes visible again, refresh customer list to ensure data is fresh
      if (visible && !isSubmitting) {
        fetchCustomers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSubmitting])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        throw new Error(data.message)
      }

      setCustomers(data)
    } catch (error) {
      setMessage('Error loading customers. Make sure the server is running.')
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async (e) => {
    e.preventDefault()

    // Prevent double-submission
    if (isSubmitting) {
      return
    }

    if (!name.trim() || !mobile.trim()) {
      setMessage('Please enter both name and mobile number')
      return
    }

    // Validate mobile number is exactly 10 digits
    const mobileDigits = mobile.trim().replace(/\D/g, '')
    if (mobileDigits.length !== 10) {
      setMessage('Mobile number must be exactly 10 digits')
      return
    }

    try {
      setIsSubmitting(true)
      setLoading(true)
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        setMessage(data.message || 'Error adding customer')
        return
      }

      await fetchCustomers()
      setName('')
      setMobile('')
      setShowAddForm(false)
      setMessage(`Customer "${data.name}" added successfully!`)

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error adding customer. Make sure the server is running.')
      console.error('Error adding customer:', error)
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      setSearchResult(null)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        throw new Error(data.message)
      }

      setSearchResult(data)
      setShowLiveResults(false)
    } catch (error) {
      setMessage('Error searching customer. Make sure the server is running.')
      console.error('Error searching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const performLiveSearch = async (query) => {
    if (!query.trim()) {
      setLiveSearchResults([])
      setShowLiveResults(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/live-search?query=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        throw new Error(data.message)
      }

      setLiveSearchResults(data.customers || [])
      setShowLiveResults(true)
    } catch (error) {
      console.error('Error in live search:', error)
      setLiveSearchResults([])
    }
  }

  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    setSearchResult(null)
  }

  const selectLiveResult = (customer) => {
    setSearchQuery(customer.name)
    setSearchResult({
      found: true,
      customer: customer
    })
    setShowLiveResults(false)
    setLiveSearchResults([])
  }

  const startEdit = (customer) => {
    setEditingCustomer(customer)
    setEditName(customer.name)
    setEditMobile(customer.mobile)
  }

  const cancelEdit = () => {
    setEditingCustomer(null)
    setEditName('')
    setEditMobile('')
  }

  const handleUpdateCustomer = async (e) => {
    e.preventDefault()

    if (!editName.trim() || !editMobile.trim()) {
      setMessage('Please enter both name and mobile number')
      return
    }

    const mobileDigits = editMobile.trim().replace(/\D/g, '')
    if (mobileDigits.length !== 10) {
      setMessage('Mobile number must be exactly 10 digits')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/${editingCustomer._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          mobile: editMobile.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        setMessage(data.message || 'Error updating customer')
        return
      }

      await fetchCustomers()
      cancelEdit()
      setMessage(`Customer "${data.name}" updated successfully!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error updating customer. Make sure the server is running.')
      console.error('Error updating customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))
  }

  const handleDeleteCustomer = (customer) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Customer',
      message: `Are you sure you want to delete "${customer.name}" (${customer.mobile})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => executeDeleteCustomer(customer)
    })
  }

  const executeDeleteCustomer = async (customer) => {
    closeModal()

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/${customer._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        setMessage(data.message || 'Error deleting customer')
        return
      }

      await fetchCustomers()
      setMessage(`Customer "${customer.name}" deleted successfully!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error deleting customer. Make sure the server is running.')
      console.error('Error deleting customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (customers.length === 0) {
      setMessage('No customers to export')
      return
    }

    const headers = ['Name', 'Mobile', 'Added Date']
    const rows = customers.map(customer => [
      customer.name,
      customer.mobile,
      new Date(customer.addedDate).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `loyalty_customers_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setMessage('Customer list exported successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDeleteAllCustomers = () => {
    const customerCount = customers.length

    if (customerCount === 0) {
      setMessage('No customers to delete')
      return
    }

    // First confirmation
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Customers',
      message: `WARNING: You are about to delete ALL ${customerCount} customers! This action CANNOT be undone.`,
      confirmText: 'Yes, Delete All',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => showFinalDeleteConfirmation(customerCount)
    })
  }

  const showFinalDeleteConfirmation = (customerCount) => {
    // Second/final confirmation
    setConfirmModal({
      isOpen: true,
      title: 'Final Confirmation',
      message: `This is your FINAL warning. Delete all ${customerCount} customers permanently?`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => executeDeleteAllCustomers()
    })
  }

  const executeDeleteAllCustomers = async () => {
    closeModal()

    // Immediately clear the UI to improve responsiveness (INP)
    setLoading(true)
    setCustomers([])

    // Defer the async work to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        const deleteAllURL = import.meta.env.PROD ? '/api/customers/delete-all' : 'http://localhost:5000/api/customers/delete-all'

        const response = await fetch(deleteAllURL, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 401) {
            onLogout()
            return
          }
          setMessage(data.message || 'Error deleting customers')
          // Restore customers on error
          await fetchCustomers()
          return
        }

        setMessage(`Successfully deleted all ${data.deletedCount} customers!`)
        setTimeout(() => setMessage(''), 5000)
      } catch (error) {
        setMessage('Error deleting customers. Make sure the server is running.')
        console.error('Error deleting all customers:', error)
        // Restore customers on error
        await fetchCustomers()
      } finally {
        setLoading(false)
      }
    }, 0)
  }

  const handleUpdateCredentials = async (e) => {
    e.preventDefault()

    if (!currentPassword) {
      setSettingsMessage('Please enter your current password')
      return
    }

    if (!newUsername && !newPassword) {
      setSettingsMessage('Please enter a new username or password')
      return
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      setSettingsMessage('New passwords do not match')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setSettingsMessage('New password must be at least 6 characters')
      return
    }

    try {
      setSettingsLoading(true)
      setSettingsMessage('')

      const response = await fetch(`${AUTH_API_URL}/update-credentials`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername || undefined,
          newPassword: newPassword || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && data.message === 'Not authorized, token failed') {
          onLogout()
          return
        }
        setSettingsMessage(data.message || 'Error updating credentials')
        return
      }

      setSettingsMessage('Credentials updated successfully!')
      setCurrentPassword('')
      setNewUsername('')
      setNewPassword('')
      setConfirmNewPassword('')

      // Update displayed username if changed
      if (data.username && user) {
        user.username = data.username
      }

      setTimeout(() => {
        setSettingsMessage('')
        setShowSettings(false)
      }, 2000)
    } catch (error) {
      setSettingsMessage('Error updating credentials. Please try again.')
      console.error('Error updating credentials:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      if (!validTypes.includes(file.type)) {
        setMessage('Please select a valid Excel file (.xls or .xlsx)')
        return
      }
      setImportFile(file)
      setImportResults(null)
    }
  }

  const handleImportExcel = async () => {
    if (!importFile) {
      setMessage('Please select an Excel file first')
      return
    }

    try {
      setLoading(true)
      setImportResults(null)

      const formData = new FormData()
      formData.append('file', importFile)

      const token = localStorage.getItem('adminToken')
      const importURL = import.meta.env.PROD ? '/api/customers/import-excel' : 'http://localhost:5000/api/customers/import-excel'

      const response = await fetch(importURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        setMessage(data.message || 'Error importing file')
        return
      }

      setImportResults(data.results)
      setMessage(data.message)
      await fetchCustomers()
      setImportFile(null)

      const fileInput = document.getElementById('excel-import')
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      setMessage('Error importing file. Make sure the server is running.')
      console.error('Error importing Excel:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Loyalty Customer Management - Mom's Touch</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={() => setShowSettings(!showSettings)} className="btn btn-settings">
              Settings
            </button>
            <button onClick={onLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h2>Account Settings</h2>
              <button onClick={() => setShowSettings(false)} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateCredentials} className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password *</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ddd' }} />

              <div className="form-group">
                <label htmlFor="newUsername">New Username (optional)</label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password (optional)</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={!newPassword}
                />
              </div>

              {settingsMessage && (
                <div className={`settings-message ${settingsMessage.includes('successfully') ? 'success' : 'error'}`}>
                  {settingsMessage}
                </div>
              )}

              <div className="settings-actions">
                <button type="submit" className="btn btn-primary" disabled={settingsLoading}>
                  {settingsLoading ? 'Updating...' : 'Update Credentials'}
                </button>
                <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="container">
        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Add New Customer</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{showAddForm ? '−' : '+'}</span>
              {showAddForm ? 'Close Form' : 'Add Customer'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddCustomer} className="form">
              <div className="form-group">
                <label htmlFor="name">Customer Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 10) {
                      setMobile(value)
                    }
                  }}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {mobile.length}/10 digits
                </small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting || loading}>
                {isSubmitting ? 'Adding...' : 'Add Customer'}
              </button>
            </form>
          )}

          {message && <div className="message">{message}</div>}
        </div>

        <div className="section">
          <h2>Search / Check Customer</h2>
          <form onSubmit={handleSearch} className="form">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="search">Search by Name or Mobile</label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Enter name or mobile number (auto-search as you type)"
                autoComplete="off"
              />

              {showLiveResults && liveSearchResults.length > 0 && (
                <div className="live-search-dropdown">
                  {liveSearchResults.map((customer) => (
                    <div
                      key={customer._id}
                      className="live-search-item"
                      onClick={() => selectLiveResult(customer)}
                    >
                      <div className="live-search-name">{customer.name}</div>
                      <div className="live-search-mobile">{customer.mobile}</div>
                    </div>
                  ))}
                </div>
              )}

              {showLiveResults && liveSearchResults.length === 0 && searchQuery.trim() && (
                <div className="live-search-dropdown">
                  <div className="live-search-item no-results">
                    No customers found
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResult && (
            <div className={`search-result ${searchResult.found ? 'found' : 'not-found'}`}>
              {searchResult.found ? (
                <div>
                  <h3>Customer Found!</h3>
                  <p><strong>Name:</strong> {searchResult.customer.name}</p>
                  <p><strong>Mobile:</strong> {searchResult.customer.mobile}</p>
                  <p><strong>Added:</strong> {new Date(searchResult.customer.addedDate).toLocaleDateString()}</p>
                </div>
              ) : (
                <div>
                  <h3>Customer Not Found</h3>
                  <p>No customer found with "{searchResult.query}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>All Customers ({customers.length})</h2>
            {customers.length > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleExportCSV} className="btn btn-export" disabled={loading}>
                  Export to CSV
                </button>
                <button onClick={handleDeleteAllCustomers} className="btn btn-delete" disabled={loading} style={{ backgroundColor: '#dc3545' }}>
                  Delete All
                </button>
              </div>
            )}
          </div>
          {customers.length === 0 ? (
            <p className="empty-state">No customers yet. Add your first customer above!</p>
          ) : (
            <div className="customer-list-container">
              <div className="customer-list">
                {customers.map((customer) => (
                  <div key={customer._id} className="customer-card">
                    {editingCustomer?._id === customer._id ? (
                      <form onSubmit={handleUpdateCustomer} className="edit-form">
                        <div className="form-group">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Customer name"
                            disabled={loading}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="tel"
                            value={editMobile}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '')
                              if (value.length <= 10) {
                                setEditMobile(value)
                              }
                            }}
                            placeholder="10-digit mobile"
                            maxLength="10"
                            disabled={loading}
                          />
                          <small style={{ color: '#666', fontSize: '12px' }}>
                            {editMobile.length}/10 digits
                          </small>
                        </div>
                        <div className="edit-actions">
                          <button type="submit" className="btn btn-save" disabled={loading}>
                            Save
                          </button>
                          <button type="button" onClick={cancelEdit} className="btn btn-cancel" disabled={loading}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="customer-info">
                          <h4>{customer.name}</h4>
                          <p>{customer.mobile}</p>
                        </div>
                        <div className="customer-meta">
                          <div className="customer-date">
                            {new Date(customer.addedDate).toLocaleDateString()}
                          </div>
                          <div className="customer-actions">
                            <button
                              onClick={() => startEdit(customer)}
                              className="btn btn-edit"
                              disabled={loading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              className="btn btn-delete"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <h2>Import Customers from Excel</h2>
          <div className="form">
            <div className="form-group">
              <label htmlFor="excel-import">Select Excel File (.xls or .xlsx)</label>
              <input
                type="file"
                id="excel-import"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileSelect}
                disabled={loading}
              />
              {importFile && (
                <small style={{ color: '#28a745', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Selected: {importFile.name}
                </small>
              )}
            </div>

            <button
              onClick={handleImportExcel}
              className="btn btn-primary"
              disabled={loading || !importFile}
            >
              {loading ? 'Importing...' : 'Import Customers'}
            </button>

            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              <p style={{ marginBottom: '5px' }}>Excel file should have columns named:</p>
              <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                <li><strong>name</strong> or <strong>Name</strong> - Customer name</li>
                <li><strong>mobile</strong> or <strong>Mobile</strong> - Mobile number</li>
              </ul>
            </div>

            {importResults && (
              <div className="import-results" style={{ marginTop: '20px' }}>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginTop: '0', marginBottom: '15px', color: '#28a745' }}>Import Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{importResults.total}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Total Rows</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{importResults.imported}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Imported</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{importResults.skipped}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Skipped</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{importResults.failed}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
                    </div>
                  </div>

                  {importResults.errors && importResults.errors.length > 0 && (
                    <details style={{ marginTop: '15px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                        View Errors ({importResults.errors.length})
                      </summary>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
                        {importResults.errors.map((error, index) => (
                          <div key={index} style={{
                            padding: '8px',
                            marginBottom: '5px',
                            backgroundColor: '#fff3cd',
                            borderLeft: '3px solid #ffc107',
                            fontSize: '13px'
                          }}>
                            <strong>Row {error.row}:</strong> {error.name} ({error.mobile}) - {error.error}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>&copy; {new Date().getFullYear()} All Rights Reserved - Hassaan</p>
      </footer>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />
    </div>
  )
}

export default Dashboard
