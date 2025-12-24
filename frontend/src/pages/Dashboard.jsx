import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { stocks, watchlist } from '../services/api'
import { Search, Plus, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import Toast from '../components/Toast'
import './Dashboard.css'

function Dashboard() {
  const [symbol, setSymbol] = useState('')
  const [stockData, setStockData] = useState(null)
  const [marketFeed, setMarketFeed] = useState([])
  const [loading, setLoading] = useState(false)
  const [feedLoading, setFeedLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchlists, setWatchlists] = useState([])
  const [showWatchlistModal, setShowWatchlistModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const navigate = useNavigate()

  useEffect(() => {
    loadMarketFeed()
    loadWatchlists()
    // Refresh market feed every 5 minutes
    const interval = setInterval(loadMarketFeed, 300000)
    return () => clearInterval(interval)
  }, [])

  const loadWatchlists = async () => {
    // Load cached watchlists instantly
    const cachedLists = localStorage.getItem('watchlistsCache')
    const cacheTime = localStorage.getItem('watchlistsCacheTime')
    
    if (cachedLists && cacheTime) {
      const age = Date.now() - parseInt(cacheTime)
      if (age < 300000) { // 5 minutes
        setWatchlists(JSON.parse(cachedLists))
        return
      }
    }
    
    // Load fresh data
    try {
      const response = await watchlist.getAll()
      setWatchlists(response.data.watchlists)
      localStorage.setItem('watchlistsCache', JSON.stringify(response.data.watchlists))
      localStorage.setItem('watchlistsCacheTime', Date.now().toString())
    } catch (err) {
      console.error('Failed to load watchlists', err)
    }
  }

  useEffect(() => {
    loadMarketFeed()
    // Refresh market feed every 5 minutes
    const interval = setInterval(loadMarketFeed, 300000)
    return () => clearInterval(interval)
  }, [])

  const loadMarketFeed = async () => {
    // Check if we have cached data (less than 2 minutes old)
    const cachedData = localStorage.getItem('marketFeedCache')
    const cacheTime = localStorage.getItem('marketFeedCacheTime')
    
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime)
      if (age < 120000) { // 2 minutes
        setMarketFeed(JSON.parse(cachedData))
        setFeedLoading(false)
        return
      }
    }
    
    try {
      const response = await stocks.getMarketFeed()
      setMarketFeed(response.data.stocks)
      // Cache the data
      localStorage.setItem('marketFeedCache', JSON.stringify(response.data.stocks))
      localStorage.setItem('marketFeedCacheTime', Date.now().toString())
    } catch (err) {
      console.error('Failed to load market feed', err)
    } finally {
      setFeedLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!symbol) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await stocks.getPrice(symbol.toUpperCase())
      setStockData(response.data)
    } catch (err) {
      setError('Stock not found')
      setStockData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToWatchlist = async (stockSymbol) => {
    const targetSymbol = stockSymbol || symbol.toUpperCase()
    
    // If multiple watchlists exist, show modal
    if (watchlists.length > 1) {
      setSelectedStock(targetSymbol)
      setShowWatchlistModal(true)
    } else if (watchlists.length === 1) {
      // Add to the only watchlist
      try {
        await watchlist.addStock(targetSymbol, [watchlists[0].id])
        setToast({ show: true, message: `Added ${targetSymbol} to ${watchlists[0].name}`, type: 'success' })
      } catch (err) {
        // Handle duplicate (409) vs other errors
        if (err.response?.status === 409) {
          setToast({ 
            show: true, 
            message: err.response?.data?.detail || 'Stock already exists in this watchlist', 
            type: 'warning' 
          })
        } else {
          setToast({ show: true, message: 'Failed to add to watchlist', type: 'error' })
        }
      }
    } else {
      setToast({ show: true, message: 'No watchlist found. Please create one first.', type: 'warning' })
    }
  }

  const handleWatchlistSelection = async (selectedIds) => {
    try {
      const response = await watchlist.addStock(selectedStock, selectedIds)
      
      // Check if there were any duplicates
      const data = response.data
      if (data.duplicate_count && data.duplicate_count > 0) {
        // Partial success - some added, some duplicates
        setToast({ 
          show: true, 
          message: data.message, 
          type: 'warning' 
        })
      } else {
        // Full success
        const watchlistNames = selectedIds.map(id => {
          const wl = watchlists.find(w => w.id === id)
          return wl ? wl.name : ''
        }).filter(Boolean).join(', ')
        
        setToast({ 
          show: true, 
          message: `Added ${selectedStock} to ${selectedIds.length > 1 ? `${selectedIds.length} watchlists` : watchlistNames}`, 
          type: 'success' 
        })
      }
      
      setShowWatchlistModal(false)
      setSelectedStock('')
    } catch (err) {
      // Handle duplicate (409) vs other errors
      if (err.response?.status === 409) {
        setToast({ 
          show: true, 
          message: err.response?.data?.detail || 'Stock already exists in selected watchlist(s)', 
          type: 'warning' 
        })
      } else {
        setToast({ show: true, message: 'Failed to add to watchlist', type: 'error' })
      }
      setShowWatchlistModal(false)
      setSelectedStock('')
    }
  }

  const handleAnalyze = (stockSymbol) => {
    navigate(`/stock/${stockSymbol || symbol.toUpperCase()}`)
  }

  const handleStockClick = (stockSymbol) => {
    navigate(`/stock/${stockSymbol}`)
  }

  const renderSparkline = (data, changePercent) => {
    if (!data || data.length === 0) return null
    
    const chartData = data.map((value, index) => ({ value, index }))
    const color = changePercent >= 0 ? '#00ff00' : '#ff0000'
    
    return (
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="dashboard">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      <h1>Market Dashboard</h1>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search NSE stock symbol (e.g., RELIANCE, TCS)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error-box">{error}</div>}

      {showWatchlistModal && (
        <WatchlistSelectionModal
          watchlists={watchlists}
          onSelect={handleWatchlistSelection}
          onClose={() => setShowWatchlistModal(false)}
          stockSymbol={selectedStock}
        />
      )}

      {stockData && (
        <div className="stock-card search-result">
          <div className="stock-header">
            <h2>{stockData.symbol}</h2>
            <button onClick={() => handleAddToWatchlist()} className="add-btn">
              <Plus size={18} />
              Add to Watchlist
            </button>
          </div>
          
          <div className="stock-price">
            <span className="price">₹{stockData.price}</span>
            <span className={stockData.change >= 0 ? 'positive' : 'negative'}>
              {stockData.change >= 0 ? '+' : ''}{stockData.change} ({stockData.change_percent}%)
            </span>
          </div>
          
          <div className="stock-info">
            <div>
              <span className="label">Volume</span>
              <span className="value">{stockData.volume.toLocaleString()}</span>
            </div>
          </div>
          
          <button onClick={() => handleAnalyze()} className="analyze-btn">
            Analyze Stock
          </button>
        </div>
      )}

      <div className="market-feed-section">
        <div className="section-header">
          <Activity size={24} />
          <h2>Market Overview</h2>
          <span className="stock-count">{marketFeed.length} stocks</span>
        </div>

        {feedLoading ? (
          <div className="market-feed-grid">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="market-stock-card skeleton">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line medium"></div>
                <div className="skeleton-line long"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="market-feed-grid">
            {marketFeed.map((stock) => (
              <div 
                key={stock.symbol} 
                className="market-stock-card"
                onClick={() => handleStockClick(stock.symbol)}
              >
                <div className="stock-card-header">
                  <div className="stock-symbol">{stock.symbol}</div>
                </div>
                
                <div className="stock-price-section">
                  <div className="stock-price-row">
                    <span className="price">₹{stock.price}</span>
                    <span className={`change-badge ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                      {stock.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {stock.change >= 0 ? '+' : ''}{stock.change_percent}%
                    </span>
                  </div>

                  {stock.sparkline && stock.sparkline.length > 0 && (
                    <div className="sparkline-container">
                      {renderSparkline(stock.sparkline, stock.change_percent)}
                    </div>
                  )}
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddToWatchlist(stock.symbol)
                  }}
                  className="add-to-watchlist-btn"
                  title="Add to watchlist"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WatchlistSelectionModal({ watchlists, onSelect, onClose, stockSymbol }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState('')

  const toggleWatchlist = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(wid => wid !== id)
        : [...prev, id]
    )
    setError('')
  }

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one watchlist')
      return
    }
    onSelect(selectedIds)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add {stockSymbol} to Watchlist</h2>
        <p className="modal-subtitle">Select one or more watchlists</p>
        
        <div className="watchlist-selection">
          {watchlists.map(wl => (
            <label key={wl.id} className="watchlist-option">
              <input
                type="checkbox"
                checked={selectedIds.includes(wl.id)}
                onChange={() => toggleWatchlist(wl.id)}
              />
              <span className="watchlist-name">
                {wl.name}
                {wl.is_default && <span className="default-badge">Default</span>}
              </span>
              <span className="stock-count">{wl.stock_count} stocks</span>
            </label>
          ))}
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">Add to Selected</button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
