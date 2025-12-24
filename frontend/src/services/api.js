import axios from 'axios'

const API_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enable cookies
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'), // New endpoint for session validation
  getUserInfo: () => api.get('/user/me'), // Legacy endpoint
  googleLogin: () => api.get('/auth/google/login'), // Get Google OAuth URL
}

export const stocks = {
  getPrice: (symbol) => api.get(`/price/${symbol}`),
  analyze: (symbol) => api.post(`/analyze?symbol=${symbol}`),
  getProjection: (symbol, months = 3) => api.get(`/projection/${symbol}?months=${months}`),
  getChart: (symbol, period = '6mo') => api.get(`/chart/${symbol}?period=${period}`),
  getComparison: (symbol) => api.get(`/comparison/${symbol}`),
  getMarketFeed: () => api.get('/market-feed'),
}

export const watchlist = {
  // Legacy endpoints
  get: () => api.get('/watchlist'),
  add: (symbol) => api.post(`/watchlist/add?symbol=${symbol}`),
  remove: (symbol) => api.delete(`/watchlist/remove/${symbol}`),
  analyze: (threshold = 65) => api.get(`/watchlist/analyze?threshold=${threshold}`),
  
  // Multi-watchlist endpoints
  getAll: () => api.get('/watchlists'),
  getById: (id, limit, offset) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit)
    if (offset) params.append('offset', offset)
    return api.get(`/watchlists/${id}${params.toString() ? `?${params.toString()}` : ''}`)
  },
  getSymbols: (id) => api.get(`/watchlists/${id}/symbols`), // Ultra-fast, no prices
  create: (name) => api.post('/watchlists', { name }),
  update: (id, name) => api.put(`/watchlists/${id}`, { name }),
  delete: (id) => api.delete(`/watchlists/${id}`),
  addStock: (symbol, watchlistIds) => api.post('/watchlists/add-stock', { symbol, watchlist_ids: watchlistIds }),
  removeStock: (watchlistId, symbol) => api.delete(`/watchlists/${watchlistId}/stocks/${symbol}`),
  checkStock: (symbol) => api.get(`/watchlists/check-stock/${symbol}`),
  analyzeById: (id, threshold = 65) => api.get(`/watchlists/${id}/analyze?threshold=${threshold}`),
  
  // Default watchlist endpoints
  getDefaultInfo: () => api.get('/watchlists/default/info'),
  createDefault: () => api.post('/watchlists/create-default'),
  resetDefault: (id) => api.post(`/watchlists/${id}/reset-default`),
  fixDefault: () => api.post('/watchlists/fix-default'),
  cleanupInvalid: () => api.post('/watchlists/cleanup-invalid'),
  populateDefault: () => api.post('/watchlists/populate-default'),
}

export default api
