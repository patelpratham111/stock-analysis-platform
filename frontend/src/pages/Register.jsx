import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth } from '../services/api'
import './Auth.css'

function Register({ setAuth }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const response = await auth.register({ name, email, password })
      localStorage.setItem('token', response.data.access_token)
      setAuth(true)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    alert('Google Sign-Up integration coming soon')
  }

  return (
    <div className="auth-container">
      <div className="auth-left-panel">
        <div className="auth-brand">
          <div className="brand-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#ffffff"/>
              <path d="M8 16L14 10L20 16L14 22L8 16Z" fill="#000000"/>
              <path d="M14 10L20 16L26 10L20 4L14 10Z" fill="#000000" opacity="0.6"/>
            </svg>
          </div>
          <span className="brand-name">Stock Analysis</span>
        </div>

        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Create account</h1>
            <p>Start your journey to smarter investing.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button type="button" onClick={handleGoogleSignup} className="btn-google">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382c-.232 1.25-.936 2.31-1.996 3.02v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.353z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59C2.71 17.745 6.09 20 10 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064C.386 6.86 0 8.39 0 10s.386 3.14 1.064 4.49l3.341-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.255 1.064 5.51l3.341 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login" className="signup-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="visual-content">
          <div className="visual-grid"></div>
          <div className="visual-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
          <div className="visual-overlay">
            <h2>Join thousands of investors</h2>
            <p>Make data-driven decisions with our advanced analytics platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
