import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

// Use relative path for production (Render) or localhost for development
const API_URL = import.meta.env.PROD ? '/api/auth' : 'http://localhost:5000/api/auth'

function Signup({ onSignup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Signup failed')
        return
      }

      // Store token in localStorage
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminUser', JSON.stringify({
        _id: data._id,
        username: data.username
      }))

      // Call parent callback
      onSignup(data)
    } catch (error) {
      setError('Signup failed. Please check if the server is running.')
      console.error('Signup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Admin Signup</h1>
        <p className="login-subtitle">Create an admin account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-login" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link
              to="/login"
              style={{
                color: '#667eea',
                fontSize: '14px',
                textDecoration: 'underline',
                pointerEvents: loading ? 'none' : 'auto',
                opacity: loading ? 0.6 : 1
              }}
            >
              Already have an account? Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Signup
