import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Auth.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1500)
  }

  if (submitted) {
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
            <div className="success-message-box">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="24" fill="#00ff00" opacity="0.1"/>
                  <path d="M34 18L20 32L14 26" stroke="#00ff00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1>Check your email</h1>
              <p>We've sent a password reset link to <strong>{email}</strong></p>
              <p className="help-text">
                Didn't receive the email? Check your spam folder or{' '}
                <button onClick={() => setSubmitted(false)} className="link-button">
                  try another email address
                </button>
              </p>
              <Link to="/login" className="btn-primary">
                Back to sign in
              </Link>
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
              <h2>Secure & Protected</h2>
              <p>Your account security is our top priority</p>
            </div>
          </div>
        </div>
      </div>
    )
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
            <h1>Forgot password?</h1>
            <p>No worries, we'll send you reset instructions.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
                  Sending...
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login" className="back-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              Back to sign in
            </Link>
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
            <h2>Secure & Protected</h2>
            <p>Your account security is our top priority</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
