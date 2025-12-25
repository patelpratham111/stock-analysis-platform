import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { watchlist } from '../services/api'
import { Trash2, TrendingUp, Plus, FolderPlus, RotateCcw, Edit2, Check, X, ChevronLeft, ChevronDown } from 'lucide-react'
import Toast from '../components/Toast'
import './Watchlist.css'

function Watchlist() {
  const [watchlists, setWatchlists] = useState([])
  const [selectedWatchlist, setSelectedWatchlist] = useState(null)
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [deleteWatchlistId, setDeleteWatchlistId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [mobileView, setMobileView] = useState('list') // 'list' or 'stocks'
  const navigate = useNavigate()

  useEffect(() => {
    loadWatchlists()
  }, [])

  const loadWatchlists = async () => {
    try {
      const response = await watchlist.getAll()
      const lists = response.data.watchlists
      setWatchlists(lists)
      
      // Auto-select default watchlist or first one
      if (lists.length > 0) {
        const defaultList = lists.find(w => w.is_default) || lists[0]
        selectWatchlist(defaultList.id)
      }
    } catch (err) {
      console.error('Failed to load watchlists', err)
    } finally {
      setLoading(false)
    }
  }

  const selectWatchlist = async (id, resetOffset = true) => {
    if (resetOffset) {
      setStocks([]) // Clear previous stocks
      setCurrentOffset(0)
    }
    
    const offset = resetOffset ? 0 : currentOffset
    
    try {
      // Load first batch of stocks with MINIMAL data (20 stocks)
      const response = await watchlist.getById(id, 20, offset)
      
      if (resetOffset) {
        setStocks(response.data.stocks)
      } else {
        // Append to existing stocks (Load More)
        setStocks(prev => [...prev, ...response.data.stocks])
      }
      
      setSelectedWatchlist(response.data)
      setHasMore(response.data.has_more)
      setCurrentOffset(offset + response.data.loaded)
      
      // Switch to stocks view on mobile
      setMobileView('stocks')
    } catch (err) {
      console.error('Failed to load watchlist', err)
    }
  }
  
  const handleBackToList = () => {
    setMobileView('list')
  }
  
  const handleLoadMore = async () => {
    if (!selectedWatchlist || loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const response = await watchlist.getById(selectedWatchlist.id, 20, currentOffset)
      
      // Append new stocks to existing list
      setStocks(prev => [...prev, ...response.data.stocks])
      setHasMore(response.data.has_more)
      setCurrentOffset(prev => prev + response.data.loaded)
    } catch (err) {
      console.error('Failed to load more stocks', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleRemove = async (symbol) => {
    if (!selectedWatchlist) return
    
    try {
      await watchlist.removeStock(selectedWatchlist.id, symbol)
      setStocks(stocks.filter(s => s.symbol !== symbol))
      setToast({ show: true, message: `Removed ${symbol} from watchlist`, type: 'success' })
    } catch (err) {
      setToast({ show: true, message: 'Failed to remove stock', type: 'error' })
    }
  }

  const handleCreateWatchlist = async (name) => {
    try {
      await watchlist.create(name)
      await loadWatchlists()
      setShowCreateModal(false)
      setToast({ show: true, message: `Watchlist "${name}" created successfully`, type: 'success' })
    } catch (err) {
      console.error('Failed to create watchlist:', err)
      setToast({ show: true, message: err.response?.data?.detail || 'Failed to create watchlist', type: 'error' })
    }
  }

  const handleRenameWatchlist = async (id, newName) => {
    try {
      await watchlist.update(id, newName)
      await loadWatchlists()
      setEditingId(null)
      setEditingName('')
      setToast({ show: true, message: `Watchlist renamed to "${newName}"`, type: 'success' })
    } catch (err) {
      setToast({ show: true, message: 'Failed to rename watchlist', type: 'error' })
    }
  }

  const handleDeleteWatchlist = async (id) => {
    setDeleteWatchlistId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await watchlist.delete(deleteWatchlistId)
      await loadWatchlists()
      setToast({ show: true, message: 'Watchlist deleted successfully', type: 'success' })
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.detail || 'Failed to delete watchlist', type: 'error' })
    } finally {
      setShowDeleteConfirm(false)
      setDeleteWatchlistId(null)
    }
  }

  const handleResetDefault = async () => {
    if (!selectedWatchlist?.is_default) return
    setShowResetConfirm(true)
  }

  const confirmReset = async () => {
    try {
      await watchlist.resetDefault(selectedWatchlist.id)
      await selectWatchlist(selectedWatchlist.id)
      setToast({ show: true, message: 'Default watchlist reset successfully', type: 'success' })
    } catch (err) {
      setToast({ show: true, message: 'Failed to reset watchlist', type: 'error' })
    } finally {
      setShowResetConfirm(false)
    }
  }

  const handleAnalyze = (symbol) => {
    navigate(`/stock/${symbol}`)
  }

  const startEditing = (id, currentName) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  // Skeleton loader component
  const SkeletonRow = () => (
    <div className="watchlist-card skeleton">
      <div className="card-header">
        <div className="skeleton-line" style={{ width: '120px', height: '20px' }}></div>
      </div>
      <div className="card-price">
        <div className="skeleton-line" style={{ width: '100px', height: '20px' }}></div>
        <div className="skeleton-line" style={{ width: '80px', height: '28px' }}></div>
      </div>
      <div className="skeleton-line" style={{ width: '100px', height: '36px' }}></div>
    </div>
  )

  if (loading) {
    return (
      <div className="watchlist">
        <div className="watchlist-header">
          <h1>Watchlists</h1>
          <button className="create-btn" disabled>
            <FolderPlus size={18} />
            New Watchlist
          </button>
        </div>

        <div className="watchlist-layout">
          <div className="watchlist-sidebar">
            <h3>Your Watchlists</h3>
            <div className="watchlist-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="watchlist-item skeleton">
                  <div className="skeleton-line" style={{ width: '100%', height: '40px' }}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="watchlist-content">
            <div className="content-header">
              <div className="skeleton-line" style={{ width: '200px', height: '32px', marginBottom: '1rem' }}></div>
            </div>
            <div className="watchlist-grid">
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <h1>Watchlists</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          <FolderPlus size={18} />
          <span className="btn-text">New Watchlist</span>
        </button>
      </div>

      {/* Mobile View */}
      <div className="watchlist-mobile">
        {mobileView === 'list' ? (
          <div className="mobile-watchlist-selector">
            <h3>Select a Watchlist</h3>
            <div className="mobile-watchlist-list">
              {watchlists.map(wl => (
                <div
                  key={wl.id}
                  className={`mobile-watchlist-item ${selectedWatchlist?.id === wl.id ? 'active' : ''}`}
                  onClick={() => selectWatchlist(wl.id)}
                >
                  <div className="mobile-watchlist-info">
                    <span className="mobile-watchlist-name">
                      {wl.name}
                      {wl.is_default && <span className="default-badge">Default</span>}
                    </span>
                    <span className="mobile-stock-count">{wl.stock_count} stocks</span>
                  </div>
                  <ChevronDown size={20} className="mobile-chevron" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mobile-stocks-view">
            <button className="mobile-back-btn" onClick={handleBackToList}>
              <ChevronLeft size={20} />
              <span>All Watchlists</span>
            </button>
            
            <div className="mobile-selected-header">
              <h2>{selectedWatchlist?.name}</h2>
              {selectedWatchlist?.is_default && (
                <button onClick={handleResetDefault} className="reset-btn-small">
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            {stocks.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={48} />
                <p>This watchlist is empty</p>
              </div>
            ) : (
              <>
                <div className="watchlist-grid">
                  {stocks.map((stock, index) => (
                    <div key={`${stock.symbol}-${index}`} className="watchlist-card">
                      <div className="card-header">
                        <h3>{stock.symbol}</h3>
                        <button onClick={() => handleRemove(stock.symbol)} className="remove-btn">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="card-price">
                        <span className="price">₹{stock.price}</span>
                        <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                          {stock.change >= 0 ? '+' : ''}{stock.change_percent}%
                        </span>
                      </div>
                      
                      <button onClick={() => handleAnalyze(stock.symbol)} className="analyze-btn-small">
                        Analyze
                      </button>
                    </div>
                  ))}
                </div>
                
                {hasMore && (
                  <div className="load-more-container">
                    <button 
                      onClick={handleLoadMore} 
                      className="load-more-btn"
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : `Load More (${selectedWatchlist.total_stocks - stocks.length} left)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="watchlist-layout">
        <div className="watchlist-sidebar">
          <h3>Your Watchlists</h3>
          <div className="watchlist-list">
            {watchlists.map(wl => (
              <div
                key={wl.id}
                className={`watchlist-item ${selectedWatchlist?.id === wl.id ? 'active' : ''}`}
              >
                {editingId === wl.id ? (
                  <div className="editing-container">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameWatchlist(wl.id, editingName)
                        if (e.key === 'Escape') cancelEditing()
                      }}
                      autoFocus
                      className="editing-input"
                    />
                    <div className="editing-actions">
                      <button 
                        onClick={() => handleRenameWatchlist(wl.id, editingName)} 
                        className="confirm-btn"
                        title="Save (Enter)"
                      >
                        <Check size={18} />
                        <span>Yes</span>
                      </button>
                      <button 
                        onClick={cancelEditing} 
                        className="cancel-btn"
                        title="Cancel (Esc)"
                      >
                        <X size={18} />
                        <span>No</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="watchlist-item-content" onClick={() => selectWatchlist(wl.id)}>
                      <div className="watchlist-item-name">
                        {wl.name}
                        {wl.is_default && <span className="default-badge">Default</span>}
                      </div>
                      <span className="stock-count">{wl.stock_count} stocks</span>
                    </div>
                    <div className="watchlist-item-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(wl.id, wl.name)
                        }} 
                        className="icon-btn" 
                        title="Rename"
                      >
                        <Edit2 size={14} />
                      </button>
                      {!wl.is_default && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteWatchlist(wl.id)
                          }} 
                          className="icon-btn delete" 
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="watchlist-content">
          {selectedWatchlist ? (
            <>
              <div className="content-header">
                <div>
                  <h2>{selectedWatchlist.name}</h2>
                  {selectedWatchlist.is_default && (
                    <p className="watchlist-description">System default watchlist with curated NSE stocks</p>
                  )}
                </div>
                {selectedWatchlist.is_default && (
                  <button onClick={handleResetDefault} className="reset-btn">
                    <RotateCcw size={16} />
                    Reset to Default
                  </button>
                )}
              </div>

              {stocks.length === 0 ? (
                <div className="empty-state">
                  <TrendingUp size={48} />
                  <p>This watchlist is empty</p>
                  <p className="empty-subtitle">Search for stocks and add them to this watchlist</p>
                </div>
              ) : (
                <>
                  <div className="watchlist-grid">
                    {stocks.map((stock, index) => (
                      <div key={`${stock.symbol}-${index}`} className="watchlist-card">
                        <div className="card-header">
                          <h3>{stock.symbol}</h3>
                          <button onClick={() => handleRemove(stock.symbol)} className="remove-btn">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="card-price">
                          <span className="price">₹{stock.price}</span>
                          <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                            {stock.change >= 0 ? '+' : ''}{stock.change_percent}%
                          </span>
                        </div>
                        
                        <button onClick={() => handleAnalyze(stock.symbol)} className="analyze-btn-small">
                          Analyze
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="load-more-container">
                      <button 
                        onClick={handleLoadMore} 
                        className="load-more-btn"
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <span className="spinner-small"></span>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            Load More ({selectedWatchlist.total_stocks - stocks.length} remaining)
                          </>
                        )}
                      </button>
                      <p className="load-more-info">
                        Showing {stocks.length} of {selectedWatchlist.total_stocks} stocks
                      </p>
                    </div>
                  )}
                  
                  {!hasMore && stocks.length > 20 && (
                    <div className="load-more-container">
                      <p className="all-loaded-message">
                        ✓ All {selectedWatchlist.total_stocks} stocks loaded
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Select a watchlist to view stocks</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateWatchlistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWatchlist}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Watchlist"
          message="Are you sure you want to delete this watchlist?"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeleteWatchlistId(null)
          }}
        />
      )}

      {showResetConfirm && (
        <ConfirmModal
          title="Reset Watchlist"
          message="Reset default watchlist to original stocks?"
          onConfirm={confirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
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

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateWatchlistModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a watchlist name')
      return
    }
    setError('')
    setIsCreating(true)
    try {
      await onCreate(name.trim())
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={isCreating ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Watchlist</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Watchlist name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            autoFocus
            disabled={isCreating}
            className="modal-input"
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Watchlist
