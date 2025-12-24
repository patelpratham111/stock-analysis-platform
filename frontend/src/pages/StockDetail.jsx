import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stocks, watchlist } from '../services/api'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Star, Clock, Activity, 
  BarChart3, Calendar, ArrowLeft, X, Check, AlertCircle, Loader2
} from 'lucide-react'
import './StockDetail.css'

function StockDetail() {
  const { symbol } = useParams()
  const navigate = useNavigate()
  
  const [priceData, setPriceData] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [projection, setProjection] = useState(null)
  const [chartData, setChartData] = useState([])
  const [comparison, setComparison] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('6mo')
  const [loading, setLoading] = useState(true)
  
  // Watchlist modal state
  const [showWatchlistModal, setShowWatchlistModal] = useState(false)
  const [watchlists, setWatchlists] = useState([])
  const [selectedWatchlists, setSelectedWatchlists] = useState([])
  const [loadingWatchlists, setLoadingWatchlists] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [addResult, setAddResult] = useState(null)

  const periods = [
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' }
  ]

  useEffect(() => {
    loadAllData()
  }, [symbol, selectedPeriod])

  const loadAllData = async () => {
    try {
      const [priceRes, analysisRes, projectionRes, chartRes, comparisonRes] = await Promise.all([
        stocks.getPrice(symbol),
        stocks.analyze(symbol),
        stocks.getProjection(symbol),
        stocks.getChart(symbol, selectedPeriod),
        stocks.getComparison(symbol)
      ])
      
      setPriceData(priceRes.data)
      setAnalysis(analysisRes.data)
      setProjection(projectionRes.data)
      setChartData(chartRes.data.data)
      setComparison(comparisonRes.data)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToWatchlist = async () => {
    setShowWatchlistModal(true)
    setLoadingWatchlists(true)
    setAddResult(null)
    setSelectedWatchlists([])
    
    try {
      const response = await watchlist.checkStock(symbol)
      setWatchlists(response.data.watchlists)
    } catch (err) {
      console.error('Failed to load watchlists', err)
    } finally {
      setLoadingWatchlists(false)
    }
  }

  const handleWatchlistToggle = (watchlistId) => {
    setSelectedWatchlists(prev => 
      prev.includes(watchlistId)
        ? prev.filter(id => id !== watchlistId)
        : [...prev, watchlistId]
    )
  }

  const handleConfirmAdd = async () => {
    if (selectedWatchlists.length === 0) return
    
    setAddingToWatchlist(true)
    try {
      const response = await watchlist.addStock(symbol, selectedWatchlists)
      setAddResult({
        success: true,
        added_count: response.data.added_count,
        duplicate_count: response.data.duplicate_count,
        added_watchlists: response.data.added_watchlists,
        skipped_watchlists: response.data.skipped_watchlists
      })
      
      // Refresh watchlist data after adding
      const refreshResponse = await watchlist.checkStock(symbol)
      setWatchlists(refreshResponse.data.watchlists)
      setSelectedWatchlists([])
    } catch (err) {
      setAddResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to add stock'
      })
    } finally {
      setAddingToWatchlist(false)
    }
  }

  const closeModal = () => {
    setShowWatchlistModal(false)
    setAddResult(null)
    setSelectedWatchlists([])
  }

  const availableWatchlists = watchlists.filter(wl => !wl.already_added)
  const allAlreadyAdded = watchlists.length > 0 && availableWatchlists.length === 0

  if (loading) {
    return (
      <div className="stock-detail-new">
        {/* Header Skeleton */}
        <div className="detail-header skeleton-header">
          <div className="skeleton-back-btn"></div>
          <div className="header-content">
            <div className="header-left">
              <div className="skeleton-line" style={{ width: '200px', height: '32px', marginBottom: '12px' }}></div>
              <div className="skeleton-line" style={{ width: '150px', height: '48px', marginBottom: '8px' }}></div>
              <div className="skeleton-line" style={{ width: '180px', height: '16px' }}></div>
            </div>
            <div className="skeleton-line" style={{ width: '160px', height: '40px' }}></div>
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="metrics-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="metric-card skeleton-card">
              <div className="skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '8px' }}></div>
              <div className="skeleton-line" style={{ width: '120px', height: '20px' }}></div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="chart-container skeleton-chart">
          <div className="chart-header">
            <div className="skeleton-line" style={{ width: '150px', height: '24px' }}></div>
            <div className="skeleton-line" style={{ width: '300px', height: '36px' }}></div>
          </div>
          <div className="skeleton-line" style={{ width: '100%', height: '400px', marginTop: '20px' }}></div>
          <div className="skeleton-line" style={{ width: '100%', height: '100px', marginTop: '10px' }}></div>
        </div>

        {/* Analysis & Prediction Skeleton */}
        <div className="analysis-prediction-grid">
          <div className="analysis-card-new skeleton-card">
            <div className="skeleton-line" style={{ width: '180px', height: '24px', marginBottom: '20px' }}></div>
            <div className="skeleton-circle" style={{ width: '120px', height: '120px', margin: '0 auto 20px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '60px', marginBottom: '10px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '60px', marginBottom: '10px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '60px' }}></div>
          </div>
          <div className="projection-card-new skeleton-card">
            <div className="skeleton-line" style={{ width: '180px', height: '24px', marginBottom: '20px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '150px', marginBottom: '20px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '40px', marginBottom: '10px' }}></div>
            <div className="skeleton-line" style={{ width: '120px', height: '32px' }}></div>
          </div>
        </div>

        {/* Comparison Skeleton */}
        <div className="comparison-section skeleton-card">
          <div className="skeleton-line" style={{ width: '250px', height: '24px', marginBottom: '20px' }}></div>
          <div className="comparison-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="comparison-item">
                <div className="skeleton-line" style={{ width: '60px', height: '16px', marginBottom: '12px' }}></div>
                <div className="skeleton-line" style={{ width: '100%', height: '50px', marginBottom: '8px' }}></div>
                <div className="skeleton-line" style={{ width: '140px', height: '24px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isPositive = priceData?.change >= 0
  const trendClass = analysis?.trend.toLowerCase()

  return (
    <div className="stock-detail-new">
      {/* Header Section */}
      <div className="detail-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        
        <div className="header-content">
          <div className="header-left">
            <div className="stock-title">
              <h1>{symbol}</h1>
              <span className="exchange-badge">NSE</span>
            </div>
            
            <div className="price-section">
              <div className="current-price">₹{priceData?.price}</div>
              <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span>{isPositive ? '+' : ''}{priceData?.change} ({priceData?.change_percent}%)</span>
              </div>
            </div>
            
            <div className="last-updated">
              <Clock size={14} />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          <button onClick={handleAddToWatchlist} className="watchlist-btn">
            <Star size={20} />
            Add to Watchlist
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Day Range</span>
          <span className="metric-value">₹{priceData?.day_low} - ₹{priceData?.day_high}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">52W Range</span>
          <span className="metric-value">₹{priceData?.low_52w} - ₹{priceData?.high_52w}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Volume</span>
          <span className="metric-value">{(priceData?.volume / 1000000).toFixed(2)}M</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Market Cap</span>
          <span className="metric-value">
            {priceData?.market_cap ? `₹${(priceData.market_cap / 10000000).toFixed(0)}Cr` : 'N/A'}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">P/E Ratio</span>
          <span className="metric-value">{priceData?.pe_ratio || 'N/A'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">P/B Ratio</span>
          <span className="metric-value">{priceData?.pb_ratio || 'N/A'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Sector</span>
          <span className="metric-value">{priceData?.sector}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Industry</span>
          <span className="metric-value">{priceData?.industry}</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">
            <BarChart3 size={24} />
            <h2>Price Chart</h2>
          </div>
          <div className="period-selector">
            {periods.map(period => (
              <button
                key={period.value}
                className={`period-btn ${selectedPeriod === period.value ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(period.value)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff00" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00ff00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#888" />
            <YAxis stroke="#888" domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#00ff00" 
              fillOpacity={1}
              fill="url(#colorPrice)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Volume Chart */}
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="volume" fill="#666" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis & Prediction Section */}
      <div className="analysis-prediction-grid">
        {/* Analysis Card */}
        <div className="analysis-card-new">
          <h3>Technical Analysis</h3>
          <div className="score-display-new">
            <div className={`score-circle ${trendClass}`}>
              <span className="score-number">{analysis?.strength_score}</span>
              <span className="score-label">/ 100</span>
            </div>
            <div className="score-info">
              <span className={`trend-badge-new ${trendClass}`}>{analysis?.trend}</span>
              <span className="probability-label">
                {analysis?.strength_score >= 70 ? 'High Probability' : 
                 analysis?.strength_score >= 40 ? 'Medium Probability' : 'Low Probability'}
              </span>
            </div>
          </div>

          <div className="indicators-list">
            <div className="indicator-item">
              <span>RSI</span>
              <span className="indicator-val">{analysis?.indicators.rsi}</span>
            </div>
            <div className="indicator-item">
              <span>ADX</span>
              <span className="indicator-val">{analysis?.indicators.adx}</span>
            </div>
            <div className="indicator-item">
              <span>Volume Ratio</span>
              <span className="indicator-val">{analysis?.indicators.volume_ratio}x</span>
            </div>
            {analysis?.indicators.macd && (
              <div className="indicator-item">
                <span>MACD</span>
                <span className={`indicator-val ${analysis.indicators.macd.is_bullish ? 'positive' : 'negative'}`}>
                  {analysis.indicators.macd.is_bullish ? 'Bullish' : 'Bearish'}
                </span>
              </div>
            )}
          </div>

          <div className="disclaimer-box">
            ⚠️ Prediction is based on technical analysis, not financial advice.
          </div>
        </div>

        {/* Projection Card */}
        <div className="projection-card-new">
          <h3>3-Month Projection</h3>
          <div className="projection-visual">
            <div className="projection-bar">
              <div className="projection-marker low">
                <span className="marker-label">Low</span>
                <span className="marker-value">₹{projection?.projected_range.low}</span>
              </div>
              <div className="projection-marker mid">
                <span className="marker-label">Target</span>
                <span className="marker-value">₹{projection?.projected_range.mid}</span>
              </div>
              <div className="projection-marker high">
                <span className="marker-label">High</span>
                <span className="marker-value">₹{projection?.projected_range.high}</span>
              </div>
            </div>
          </div>
          <p className="projection-note">{projection?.basis}</p>
          <div className="confidence-badge">
            Confidence: {projection?.confidence}
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      {comparison && (
        <div className="comparison-section">
          <h3>Performance vs NIFTY 50</h3>
          <div className="comparison-grid">
            {Object.entries(comparison.returns).map(([period, data]) => (
              <div key={period} className="comparison-item">
                <span className="comparison-period">{period.toUpperCase()}</span>
                <div className="comparison-values">
                  <div className="comparison-row">
                    <span className="comparison-label">{symbol}</span>
                    <span className={`comparison-value ${data.stock >= 0 ? 'positive' : 'negative'}`}>
                      {data.stock >= 0 ? '+' : ''}{data.stock}%
                    </span>
                  </div>
                  <div className="comparison-row">
                    <span className="comparison-label">NIFTY</span>
                    <span className={`comparison-value ${data.nifty >= 0 ? 'positive' : 'negative'}`}>
                      {data.nifty >= 0 ? '+' : ''}{data.nifty}%
                    </span>
                  </div>
                </div>
                <div className={`outperformance ${data.stock > data.nifty ? 'positive' : 'negative'}`}>
                  {data.stock > data.nifty ? '✓ Outperforming' : '✗ Underperforming'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Modal */}
      {showWatchlistModal && (
        <div className="watchlist-modal-overlay" onClick={closeModal}>
          <div className="watchlist-modal" onClick={e => e.stopPropagation()}>
            <div className="watchlist-modal-header">
              <h3>Add {symbol} to Watchlist</h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="watchlist-modal-body">
              {loadingWatchlists ? (
                <div className="watchlist-loading">
                  <Loader2 size={24} className="spinning" />
                  <span>Loading watchlists...</span>
                </div>
              ) : addResult ? (
                <div className={`add-result ${addResult.success ? 'success' : 'error'}`}>
                  {addResult.success ? (
                    <>
                      <Check size={32} className="result-icon success" />
                      <h4>
                        {addResult.added_count > 0 
                          ? `Added to ${addResult.added_count} watchlist${addResult.added_count > 1 ? 's' : ''}`
                          : 'No changes made'}
                      </h4>
                      {addResult.added_watchlists?.length > 0 && (
                        <p className="result-detail success">
                          ✓ Added to: {addResult.added_watchlists.join(', ')}
                        </p>
                      )}
                      {addResult.skipped_watchlists?.length > 0 && (
                        <p className="result-detail warning">
                          ⚠ Already in: {addResult.skipped_watchlists.join(', ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={32} className="result-icon error" />
                      <h4>Failed to add</h4>
                      <p className="result-detail error">{addResult.message}</p>
                    </>
                  )}
                  <button className="modal-done-btn" onClick={closeModal}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {allAlreadyAdded ? (
                    <div className="all-added-message">
                      <AlertCircle size={24} />
                      <p>This stock is already in all your watchlists</p>
                    </div>
                  ) : (
                    <p className="modal-subtitle">Select watchlists to add this stock</p>
                  )}

                  <div className="watchlist-options">
                    {watchlists.map(wl => (
                      <div 
                        key={wl.id} 
                        className={`watchlist-option ${wl.already_added ? 'disabled' : ''} ${selectedWatchlists.includes(wl.id) ? 'selected' : ''}`}
                        onClick={() => !wl.already_added && handleWatchlistToggle(wl.id)}
                      >
                        <div className="watchlist-option-info">
                          <span className="watchlist-option-name">
                            {wl.name}
                            {wl.is_default && <span className="default-badge">Default</span>}
                          </span>
                          <span className="watchlist-option-count">{wl.stock_count} stocks</span>
                        </div>
                        <div className="watchlist-option-status">
                          {wl.already_added ? (
                            <span className="already-added-badge">Already Added</span>
                          ) : (
                            <div className={`checkbox ${selectedWatchlists.includes(wl.id) ? 'checked' : ''}`}>
                              {selectedWatchlists.includes(wl.id) && <Check size={14} />}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!loadingWatchlists && !addResult && !allAlreadyAdded && (
              <div className="watchlist-modal-footer">
                <button className="modal-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button 
                  className="modal-add-btn"
                  onClick={handleConfirmAdd}
                  disabled={selectedWatchlists.length === 0 || addingToWatchlist}
                >
                  {addingToWatchlist ? (
                    <>
                      <Loader2 size={16} className="spinning" />
                      Adding...
                    </>
                  ) : (
                    `Add to ${selectedWatchlists.length} Watchlist${selectedWatchlists.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StockDetail
