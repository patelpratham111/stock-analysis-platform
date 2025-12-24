import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LogOut, TrendingUp, User, Github, Twitter, Mail, Heart } from 'lucide-react'
import { auth } from '../services/api'
import './Layout.css'

function Layout({ children, setAuth }) {
  const [userName, setUserName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const response = await auth.getMe()
      setUserName(response.data.name)
    } catch (err) {
      console.error('Failed to load user info', err)
    }
  }

  const handleLogout = async () => {
    try {
      await auth.logout() // Clear cookie on server
      localStorage.removeItem('token') // Clean up any old tokens
      setAuth(false)
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      // Force logout even if API call fails
      localStorage.removeItem('token')
      setAuth(false)
      navigate('/login')
    }
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <TrendingUp size={24} />
          <span>Stock Analysis</span>
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/watchlist">Watchlist</Link>
            <Link to="/analyze">Analyze</Link>
          </div>
          {userName && (
            <div className="user-info">
              <User size={16} />
              <span>{userName}</span>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>
      
      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-brand">
              <TrendingUp size={24} />
              <span>Stock Analysis</span>
            </div>
            <p className="footer-description">
              Professional stock analysis platform for NSE stocks. 
              Technical analysis, probability scoring, and trend predictions.
            </p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/watchlist">Watchlist</Link></li>
              <li><Link to="/analyze">Analyze</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => e.preventDefault()}>Documentation</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>API Reference</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Support</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#" onClick={(e) => e.preventDefault()} className="social-link">
                <Github size={20} />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="social-link">
                <Twitter size={20} />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="social-link">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="copyright">
              © {new Date().getFullYear()} Stock Analysis. All rights reserved.
            </p>
            <p className="disclaimer-footer">
              ⚠️ For educational purposes only. Not financial advice.
            </p>
            <p className="made-with">
              Made with <Heart size={14} className="heart-icon" /> for traders
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
