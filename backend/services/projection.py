import numpy as np
from services.data_fetcher import fetch_historical_data, fetch_nifty_data
from services.indicators import calculate_ema, calculate_atr
from datetime import datetime, timedelta

def calculate_projection(symbol: str, months: int = 3) -> dict:
    """Calculate probabilistic price projection"""
    df = fetch_historical_data(symbol, period="6mo")
    
    if df is None:
        return {"error": "Unable to fetch data"}
    
    current_price = float(df['Close'].iloc[-1])
    
    # Calculate trend using EMA
    emas = calculate_ema(df, [10, 20, 50])
    ema_10 = emas['ema_10']
    ema_50 = emas['ema_50']
    
    # Calculate volatility using ATR
    atr = calculate_atr(df)
    atr_percent = (atr / current_price) * 100
    
    # Determine trend direction
    if ema_10 > ema_50:
        trend_direction = "upward"
        trend_multiplier = 1.0 + (0.02 * months)  # 2% per month
    else:
        trend_direction = "downward"
        trend_multiplier = 1.0 - (0.01 * months)  # 1% per month
    
    # Calculate projected mid point
    projected_mid = current_price * trend_multiplier
    
    # Calculate range based on ATR (volatility)
    volatility_range = projected_mid * (atr_percent / 100) * months
    
    projected_low = projected_mid - volatility_range
    projected_high = projected_mid + volatility_range
    
    # Confidence based on trend strength
    ema_diff_percent = abs((ema_10 - ema_50) / ema_50) * 100
    if ema_diff_percent > 5:
        confidence = "Moderate"
    elif ema_diff_percent > 2:
        confidence = "Low-Moderate"
    else:
        confidence = "Low"
    
    return {
        "symbol": symbol,
        "current_price": round(current_price, 2),
        "projected_range": {
            "low": round(projected_low, 2),
            "mid": round(projected_mid, 2),
            "high": round(projected_high, 2)
        },
        "timeframe": f"{months} months",
        "confidence": confidence,
        "basis": f"Based on {trend_direction} EMA trend and ATR volatility. This is a probabilistic range, not a guarantee.",
        "timestamp": datetime.utcnow()
    }

def get_chart_data(symbol: str, period: str = "6mo") -> dict:
    """Get historical data for charting with OHLCV"""
    df = fetch_historical_data(symbol, period=period)
    
    if df is None:
        return {"error": "Unable to fetch data"}
    
    # Convert to list of dicts for JSON serialization
    chart_data = []
    for index, row in df.iterrows():
        chart_data.append({
            "date": index.strftime("%Y-%m-%d"),
            "open": round(float(row['Open']), 2),
            "high": round(float(row['High']), 2),
            "low": round(float(row['Low']), 2),
            "close": round(float(row['Close']), 2),
            "volume": int(row['Volume'])
        })
    
    return {
        "symbol": symbol,
        "data": chart_data,
        "period": period
    }

def get_comparison_data(symbol: str) -> dict:
    """Get stock vs NIFTY comparison data"""
    stock_df = fetch_historical_data(symbol, period="1y")
    nifty_df = fetch_nifty_data(period="1y")
    
    if stock_df is None or nifty_df is None:
        return {"error": "Unable to fetch comparison data"}
    
    # Align dates
    common_dates = stock_df.index.intersection(nifty_df.index)
    stock_aligned = stock_df.loc[common_dates]['Close']
    nifty_aligned = nifty_df.loc[common_dates]['Close']
    
    # Calculate returns for different periods
    def calculate_return(series, days):
        if len(series) < days:
            return None
        return ((series.iloc[-1] / series.iloc[-days]) - 1) * 100
    
    return {
        "symbol": symbol,
        "returns": {
            "1d": {
                "stock": round(calculate_return(stock_aligned, 1) or 0, 2),
                "nifty": round(calculate_return(nifty_aligned, 1) or 0, 2)
            },
            "1m": {
                "stock": round(calculate_return(stock_aligned, 20) or 0, 2),
                "nifty": round(calculate_return(nifty_aligned, 20) or 0, 2)
            },
            "3m": {
                "stock": round(calculate_return(stock_aligned, 60) or 0, 2),
                "nifty": round(calculate_return(nifty_aligned, 60) or 0, 2)
            },
            "1y": {
                "stock": round(calculate_return(stock_aligned, 252) or 0, 2),
                "nifty": round(calculate_return(nifty_aligned, 252) or 0, 2)
            }
        }
    }
