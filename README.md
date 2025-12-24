# Stock Analysis Platform

A full-stack probability-based stock analysis tool for NSE (National Stock Exchange) stocks with real-time data, technical indicators, and multi-watchlist management.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green) ![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen) ![Python](https://img.shields.io/badge/Python-3.10+-yellow)

## ⚠️ Disclaimer

**For educational purposes only. No guaranteed returns. This is a technical analysis tool, not investment advice.**

---

## Features

- 🔐 **Authentication** - JWT + Google OAuth 2.0
- 📊 **Default Watchlist** - Auto-populated with curated NSE stocks on signup
- 📁 **Multiple Watchlists** - Create unlimited custom watchlists
- 🎯 **Probability Scoring** - 0-100 strength score based on technical analysis
- 📈 **Technical Indicators** - RSI, ADX, MACD, EMA, Volume Analysis
- 💪 **Relative Strength** - Performance comparison vs NIFTY 50
- 🔮 **Price Projections** - 3-month probabilistic trend forecasting
- ⚡ **Real-time Data** - Live market feed with sparkline charts
- 🔍 **Watchlist Analyzer** - Find opportunities with threshold filtering

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Python FastAPI |
| Database | MongoDB |
| Auth | JWT + Google OAuth 2.0 |
| Data | yfinance (Yahoo Finance API) |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB 7.0+

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/stock-analysis.git
cd stock-analysis
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings (MongoDB URL, JWT secret, etc.)

# Start server
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Start MongoDB

```bash
# Using MongoDB Community Server
mongod --dbpath /path/to/data

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### 5. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Project Structure

```
├── backend/
│   ├── auth/           # Authentication (JWT, OAuth)
│   ├── models/         # Pydantic models
│   ├── services/       # Business logic (scoring, projections)
│   ├── main.py         # FastAPI entry point
│   ├── config.py       # Settings management
│   ├── database.py     # MongoDB connection
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route pages
│   │   ├── services/   # API client
│   │   └── App.jsx     # Main app component
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=stock_analysis

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/logout` | Logout (clear session) |
| GET | `/auth/me` | Get current user |
| GET | `/auth/google/login` | Initiate Google OAuth |

### Stocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/price/{symbol}` | Get stock price |
| POST | `/analyze?symbol=X` | Analyze stock |
| GET | `/projection/{symbol}` | Get price projection |
| GET | `/chart/{symbol}` | Get chart data |
| GET | `/comparison/{symbol}` | Compare vs NIFTY |

### Watchlists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/watchlists` | Get all watchlists |
| POST | `/watchlists` | Create watchlist |
| GET | `/watchlists/{id}` | Get watchlist with prices |
| DELETE | `/watchlists/{id}` | Delete watchlist |
| POST | `/watchlists/add-stock` | Add stock to watchlist(s) |
| GET | `/watchlists/{id}/analyze` | Analyze watchlist |

---

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add authorized redirect URI: `http://localhost:8000/auth/google/callback`
7. Copy Client ID and Client Secret to `backend/.env`

See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for detailed instructions.

---

## Usage Guide

### For New Users
1. Register an account (or use Google OAuth)
2. Default watchlist is auto-created with curated stocks
3. Go to **Analyze** to find profitable opportunities
4. Click on any stock for detailed analysis

### Managing Watchlists
- **Default Watchlist**: Pre-loaded, can be customized or reset
- **Custom Watchlists**: Create unlimited lists for different strategies
- **Smart Addition**: Add stocks to multiple watchlists at once

### Analysis Threshold
- **70-80**: Conservative (only strongest signals)
- **60-70**: Balanced (recommended)
- **40-60**: Aggressive (more opportunities)

---

## Scripts

### Windows
```bash
# Start backend
start-backend.bat

# Start frontend
start-frontend.bat

# Check MongoDB
check-mongodb.bat
```

### Unix/Mac
```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is for educational purposes. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [yfinance](https://github.com/ranaroussi/yfinance) for stock data
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
- [Recharts](https://recharts.org/) for charts
