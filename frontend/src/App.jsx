import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './services/api'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import StockDetail from './pages/StockDetail'
import Compare from './pages/Compare'
import Layout from './components/Layout'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Restore session on app load
    const restoreSession = async () => {
      try {
        // Check for OAuth success/error in URL
        const urlParams = new URLSearchParams(window.location.search)
        const authStatus = urlParams.get('auth')
        const authError = urlParams.get('error')
        
        if (authStatus === 'success') {
          // OAuth successful, clean URL and validate session
          window.history.replaceState({}, document.title, '/')
        } else if (authError) {
          // OAuth failed, clean URL
          window.history.replaceState({}, document.title, '/login')
          setIsLoading(false)
          return
        }
        
        // Try to validate session with cookie
        const response = await auth.getMe()
        if (response.data.authenticated) {
          setIsAuthenticated(true)
          setUser(response.data)
        }
      } catch (error) {
        // Session invalid or expired
        setIsAuthenticated(false)
        setUser(null)
        localStorage.removeItem('token') // Clean up old token if exists
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #333333',
              borderTop: '4px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Loading...</p>
          </div>
        </div>
      )
    }
    
    return isAuthenticated ? children : <Navigate to="/login" />
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Router>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" /> : <Login setAuth={setIsAuthenticated} setUser={setUser} />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/" /> : <Register setAuth={setIsAuthenticated} setUser={setUser} />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout setAuth={setIsAuthenticated} user={user}>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/watchlist" element={
            <ProtectedRoute>
              <Layout setAuth={setIsAuthenticated} user={user}>
                <Watchlist />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/stock/:symbol" element={
            <ProtectedRoute>
              <Layout setAuth={setIsAuthenticated} user={user}>
                <StockDetail />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/analyze" element={
            <ProtectedRoute>
              <Layout setAuth={setIsAuthenticated} user={user}>
                <Compare />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </>
  )
}

export default App
