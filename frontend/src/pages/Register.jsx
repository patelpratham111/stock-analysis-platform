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
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', checks: {} })
  const navigate = useNavigate()

  // Password strength checker
  const checkPasswordStrength = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
    
    const score = Object.values(checks).filter(Boolean).length
    let label = ''
    if (score === 0) label = ''
    else if (score <= 2) label = 'Weak'
    else if (score <= 3) label = 'Fair'
    else if (score <= 4) label = 'Good'
    else label = 'Strong'
    
    setPasswordStrength({ score, label, checks })
  }

  const handlePasswordChange = (e) => {
    const pwd = e.target.value
    setPassword(pwd)
    checkPasswordStrength(pwd)
  }

  const validateForm = () => {
    // Name validation
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return false
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      setError('Name can only contain letters and spaces')
      return false
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (email.split('@')[0].length < 3) {
      setError('Email username must be at least 3 characters')
      return false
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter')
      return false
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter')
      return false
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number')
      return false
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain at least one special character (!@#$%^&*)')
      return false
    }

    // Confirm password
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await auth.register({ name: name.trim(), email: email.toLowerCase(), password })
      localStorage.setItem('token', response.data.access_token)
      setAuth(true)
      navigate('/')
    } catch (err) {
      // Parse validation errors from backend
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const messages = detail.map(e => e.msg).join('. ')
        setError(messages)
      } else {
        setError(detail || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const response = await auth.googleLogin()
      window.location.href = response.data.auth_url
    } catch (err) {
      setError('Failed to initiate Google Sign-Up')
    }
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
                placeholder="Create a strong password"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="new-password"
              />
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className={`strength-fill strength-${passwordStrength.score}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`strength-label strength-${passwordStrength.score}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              <div className="password-requirements">
                <span className={passwordStrength.checks.length ? 'met' : ''}>• 8+ characters</span>
                <span className={passwordStrength.checks.uppercase ? 'met' : ''}>• Uppercase</span>
                <span className={passwordStrength.checks.lowercase ? 'met' : ''}>• Lowercase</span>
                <span className={passwordStrength.checks.number ? 'met' : ''}>• Number</span>
                <span className={passwordStrength.checks.special ? 'met' : ''}>• Special (!@#$)</span>
              </div>
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
              {confirmPassword && password !== confirmPassword && (
                <span className="field-error">Passwords do not match</span>
              )}
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
