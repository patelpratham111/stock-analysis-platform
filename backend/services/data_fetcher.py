import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

def get_nse_symbol(symbol: str) -> str:
    """Convert symbol to NSE format"""
    if not symbol.endswith('.NS'):
        return f"{symbol}.NS"
    return symbol

def fetch_latest_price(symbol: str) -> Optional[dict]:
    """Fetch latest stock price with extended information"""
    try:
        ticker = yf.Ticker(get_nse_symbol(symbol))
        info = ticker.info
        hist = ticker.history(period="1y")
        
        if hist.empty:
            return None
        
        current = hist['Close'].iloc[-1]
        previous = hist['Close'].iloc[-2] if len(hist) > 1 else current
        change = current - previous
        change_percent = (change / previous) * 100
        
        # Calculate 52-week high/low
        high_52w = hist['High'].max()
        low_52w = hist['Low'].min()
        
        # Day high/low
        day_high = hist['High'].iloc[-1]
        day_low = hist['Low'].iloc[-1]
        
        return {
            "symbol": symbol,
            "price": round(float(current), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
            "volume": int(hist['Volume'].iloc[-1]),
            "day_high": round(float(day_high), 2),
            "day_low": round(float(day_low), 2),
            "high_52w": round(float(high_52w), 2),
            "low_52w": round(float(low_52w), 2),
            "market_cap": info.get('marketCap', 0),
            "pe_ratio": round(info.get('trailingPE', 0), 2) if info.get('trailingPE') else None,
            "pb_ratio": round(info.get('priceToBook', 0), 2) if info.get('priceToBook') else None,
            "sector": info.get('sector', 'N/A'),
            "industry": info.get('industry', 'N/A'),
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

def fetch_minimal_price(symbol: str) -> Optional[dict]:
    """Fetch ONLY essential price data for watchlist (ultra-fast)"""
    try:
        ticker = yf.Ticker(get_nse_symbol(symbol))
        # Fetch only 5 days of data (minimal API call)
        hist = ticker.history(period="5d")
        
        if hist.empty or len(hist) < 2:
            return None
        
        current = hist['Close'].iloc[-1]
        previous = hist['Close'].iloc[-2]
        change = current - previous
        change_percent = (change / previous) * 100
        
        return {
            "symbol": symbol,
            "price": round(float(current), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
        }
    except Exception as e:
        print(f"Error fetching minimal price for {symbol}: {e}")
        return None

def fetch_historical_data(symbol: str, period: str = "6mo") -> Optional[pd.DataFrame]:
    """Fetch historical stock data (cached for performance)"""
    try:
        ticker = yf.Ticker(get_nse_symbol(symbol))
        # Use smaller period for sparklines to speed up
        if period == "1mo":
            df = ticker.history(period="1mo", interval="1d")
        else:
            df = ticker.history(period=period)
        if df.empty:
            return None
        return df
    except Exception as e:
        print(f"Error fetching historical data for {symbol}: {e}")
        return None

def fetch_nifty_data(period: str = "6mo") -> Optional[pd.DataFrame]:
    """Fetch NIFTY 50 data for comparison"""
    try:
        nifty = yf.Ticker("^NSEI")
        df = nifty.history(period=period)
        return df
    except Exception as e:
        print(f"Error fetching NIFTY data: {e}")
        return None
