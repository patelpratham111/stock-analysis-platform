import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchlist } from '../services/api'
import { AlertCircle, BarChart3, Play, ChevronDown, Minus, Plus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Toast from '../components/Toast'
import './Compare.css'

function Compare() {
  const [results, setResults] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [threshold, setThreshold] = useState(65)
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [watchlists, setWatchlists] = useState([])
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null)
  const [watchlistName, setWatchlistName] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadWatchlists()
  }, [])

  const loadWatchlists = async () => {
    try {
      const response = await watchlist.getAll()
      const lists = response.data.watchlists
      setWatchlists(lists)
      
      // Auto-select default watchlist or first one (but DON'T run analysis)
      if (lists.length > 0) {
        const defaultList = lists.find(w => w.is_default) || lists[0]
        setSelectedWatchlistId(defaultList.id)
        setWatchlistName(defaultList.name)
      }
    } catch (err) {
      console.error('Failed to load watchlists', err)
      setError('Failed to load watchlists')
    }
  }

  const handleRunAnalysis = async () => {
    if (!selectedWatchlistId) {
      setToast({ show: true, message: 'Please select a watchlist first', type: 'warning' })
      return
    }
    
    setIsAnalyzing(true)
    setHasRun(true)
    setError('')
    setResults([])
    
    try {
      const response = await watchlist.analyzeById(selectedWatchlistId, threshold)
      setResults(response.data.qualifying_stocks)
      setTotalAnalyzed(response.data.total_analyzed)
      setWatchlistName(response.data.watchlist_name)
      
      if (response.data.qualifying_stocks.length === 0) {
        setToast({ 
          show: true, 
          message: `No stocks found with score ≥ ${threshold}. Try lowering the threshold.`, 
          type: 'warning' 
        })
      } else {
        setToast({ 
          show: true, 
          message: `Found ${response.data.qualifying_stocks.length} qualifying stocks`, 
          type: 'success' 
        })
      }
    } catch (err) {
      console.error('Failed to analyze watchlist', err)
      setError('Failed to analyze watchlist. Please try again.')
      setToast({ show: true, message: 'Failed to analyze watchlist', type: 'error' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleWatchlistChange = (watchlistId) => {
    const selected = watchlists.find(w => w.id === watchlistId)
    setSelectedWatchlistId(watchlistId)
    if (selected) {
      setWatchlistName(selected.name)
    }
    setDropdownOpen(false)
    // Don't auto-run analysis on watchlist change
  }

  const getSelectedWatchlistLabel = () => {
    const selected = watchlists.find(w => w.id === selectedWatchlistId)
    if (selected) {
      return `${selected.name} ${selected.is_default ? '(Default)' : ''} - ${selected.stock_count} stocks`
    }
    return 'Select a watchlist...'
  }

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="analysis-card skeleton">
      <div className="analysis-card-header">
        <div>
          <div className="skeleton-line" style={{ width: '120px', height: '28px', marginBottom: '0.5rem' }}></div>
          <div className="skeleton-line" style={{ width: '200px', height: '24px' }}></div>
        </div>
        <div className="skeleton-line" style={{ width: '120px', height: '40px' }}></div>
      </div>
      <div className="analysis-metrics">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="metric">
            <div className="skeleton-line" style={{ width: '80px', height: '16px', marginBottom: '0.5rem' }}></div>
            <div className="skeleton-line" style={{ width: '60px', height: '20px' }}></div>
          </div>
        ))}
      </div>
      <div className="mini-chart">
        <div className="skeleton-line" style={{ width: '150px', height: '20px', marginBottom: '1rem' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '200px' }}></div>
      </div>
      <div className="projection-preview">
        <div className="skeleton-line" style={{ width: '150px', height: '20px', marginBottom: '1rem' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '80px' }}></div>
      </div>
    </div>
  )

  return (
    <div className="compare">
      <div className="analyze-header">
        <div>
          <h1>Watchlist Analyzer</h1>
          <p className="analyze-subtitle">
            {!hasRun ? (
              'Select a watchlist and click "Run Analysis" to find strong profit opportunities'
            ) : (
              `Analyzing: ${watchlistName} - Showing stocks with score ≥ ${threshold} from ${totalAnalyzed} stocks`
            )}
          </p>
        </div>
      </div>

      <div className="analyze-controls-section">
        <div className="analyze-controls">
          <div className="watchlist-selector" ref={dropdownRef}>
            <label>Watchlist:</label>
            <div className={`custom-dropdown ${dropdownOpen ? 'open' : ''} ${isAnalyzing ? 'disabled' : ''}`}>
              <button 
                className="dropdown-trigger"
                onClick={() => !isAnalyzing && setDropdownOpen(!dropdownOpen)}
                disabled={isAnalyzing}
              >
                <span>{getSelectedWatchlistLabel()}</span>
                <ChevronDown size={18} className={`dropdown-arrow ${dropdownOpen ? 'rotated' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {watchlists.map(wl => (
                    <div 
                      key={wl.id} 
                      className={`dropdown-item ${selectedWatchlistId === wl.id ? 'selected' : ''}`}
                      onClick={() => handleWatchlistChange(wl.id)}
                    >
                      {wl.name} {wl.is_default ? '(Default)' : ''} - {wl.stock_count} stocks
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="threshold-control">
            <label>Threshold:</label>
            <div className={`threshold-stepper ${isAnalyzing ? 'disabled' : ''}`}>
              <button 
                className="stepper-btn"
                onClick={() => setThreshold(Math.max(0, threshold - 5))}
                disabled={isAnalyzing || threshold <= 0}
              >
                <Minus size={18} />
              </button>
              <span className="stepper-value">{threshold}</span>
              <button 
                className="stepper-btn"
                onClick={() => setThreshold(Math.min(100, threshold + 5))}
                disabled={isAnalyzing || threshold >= 100}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <button 
            onClick={handleRunAnalysis} 
            className="run-analysis-btn"
            disabled={isAnalyzing || !selectedWatchlistId}
          >
            {isAnalyzing ? (
              <>
                <BarChart3 size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Play size={20} />
                {hasRun ? 'Re-run Analysis' : 'Run Analysis'}
              </>
            )}
          </button>
        </div>

        <div className="threshold-info-box">
          <strong>💡 What is Threshold?</strong>
          <p>
            Threshold is a minimum score filter (0-100). Higher threshold = stricter filter = only best stocks shown.
            <br />
            <span className="threshold-examples">
              • <strong>70-80</strong>: Conservative (only strongest opportunities)
              • <strong>60-70</strong>: Balanced (recommended)
              • <strong>40-60</strong>: Aggressive (more opportunities)
            </span>
          </p>
        </div>
      </div>

      {/* Initial state - before first run */}
      {!hasRun && !isAnalyzing && (
        <div className="initial-state">
          <BarChart3 size={64} strokeWidth={1.5} />
          <h2>Ready to Analyze</h2>
          <p>Click "Run Analysis" to start analyzing stocks in your selected watchlist.</p>
          <p className="initial-hint">
            The analyzer will evaluate each stock using technical indicators (RSI, ADX, Volume) 
            and show you the best opportunities based on your threshold.
          </p>
        </div>
      )}

      {/* Loading state - skeleton loaders */}
      {isAnalyzing && (
        <div className="analysis-results">
          <div className="analyzing-banner">
            <BarChart3 size={20} className="spinning" />
            <span>Analyzing stocks... This may take a moment</span>
          </div>
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isAnalyzing && hasRun && (
        <div className="error-state">
          <AlertCircle size={48} />
          <h2>Analysis Failed</h2>
          <p>{error}</p>
          <button onClick={handleRunAnalysis} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {/* Results state - no qualifying stocks */}
      {!isAnalyzing && hasRun && !error && results.length === 0 && (
        <div className="empty-analysis">
          <AlertCircle size={48} />
          <h2>No Strong Profit Opportunity Detected</h2>
          <p>No stocks in <strong>{watchlistName}</strong> currently show favorable probability (score ≥ {threshold}).</p>
          <p className="empty-hint">Try lowering the threshold, analyzing a different watchlist, or add more stocks.</p>
        </div>
      )}

      {/* Results state - with qualifying stocks */}
      {!isAnalyzing && hasRun && !error && results.length > 0 && (
        <div className="analysis-results">
          {results.map((stock) => (
            <div key={stock.symbol} className="analysis-card">
              <div className="analysis-card-header">
                <div className="header-left">
                  <h2>{stock.symbol}</h2>
                  <div className="score-badge-container">
                    <span className={`score-badge ${stock.analysis.trend.toLowerCase()}`}>
                      Score: {stock.analysis.strength_score}/100
                    </span>
                    <span className={`trend-label ${stock.analysis.trend.toLowerCase()}`}>
                      {stock.analysis.trend}
                    </span>
                    {stock.analysis.explanation?.rs_new_high && (
                      <span className="rs-signal rs-high">RS NEW HIGH</span>
                    )}
                    {stock.analysis.explanation?.rs_outperforming && !stock.analysis.explanation?.rs_new_high && (
                      <span className="rs-signal rs-buy">RS BUY SIGNAL</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  className="view-details-btn"
                >
                  Analyze
                </button>
              </div>

              <div className="analysis-metrics">
                <div className="metric">
                  <span className="metric-label">Current Price</span>
                  <span className="metric-value">₹{stock.analysis.indicators.current_price}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">RSI</span>
                  <span className="metric-value">{stock.analysis.indicators.rsi}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">ADX</span>
                  <span className="metric-value">{stock.analysis.indicators.adx}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Volume Ratio</span>
                  <span className="metric-value">{stock.analysis.indicators.volume_ratio}x</span>
                </div>
              </div>

              {stock.chart && stock.chart.data && (
                <div className="mini-chart">
                  <h3>Price History (1 Month)</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stock.chart.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="date" stroke="#666" hide />
                      <YAxis stroke="#666" domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '2px' }}
                        labelStyle={{ color: '#fff', fontSize: '0.75rem' }}
                        itemStyle={{ color: '#00ff00', fontSize: '0.875rem', fontWeight: '600' }}
                      />
                      <Line type="monotone" dataKey="close" stroke="#00ff00" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {stock.projection && (
                <div className="projection-preview">
                  <h3>3-Month Projection</h3>
                  <div className="projection-range-mini">
                    <div className="range-mini-item">
                      <span className="range-mini-label">Low</span>
                      <span className="range-mini-value negative">₹{stock.projection.projected_range.low}</span>
                    </div>
                    <div className="range-mini-item">
                      <span className="range-mini-label">Mid</span>
                      <span className="range-mini-value">₹{stock.projection.projected_range.mid}</span>
                    </div>
                    <div className="range-mini-item">
                      <span className="range-mini-label">High</span>
                      <span className="range-mini-value positive">₹{stock.projection.projected_range.high}</span>
                    </div>
                  </div>
                  <p className="projection-note">{stock.projection.basis}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  )
}

export default Compare
