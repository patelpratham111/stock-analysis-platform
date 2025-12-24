import pandas as pd
import numpy as np
from services.data_fetcher import fetch_historical_data, fetch_nifty_data

def calculate_relative_strength(stock_df: pd.DataFrame, nifty_df: pd.DataFrame) -> dict:
    """Calculate stock's relative strength vs NIFTY"""
    # Align dates
    common_dates = stock_df.index.intersection(nifty_df.index)
    stock_aligned = stock_df.loc[common_dates]['Close']
    nifty_aligned = nifty_df.loc[common_dates]['Close']
    
    # Calculate relative strength ratio
    rs_ratio = stock_aligned / nifty_aligned
    
    # Normalize to 100
    rs_normalized = (rs_ratio / rs_ratio.iloc[0]) * 100
    
    current_rs = float(rs_normalized.iloc[-1])
    max_rs = float(rs_normalized.max())
    
    # Check if at new high
    is_new_high = current_rs >= (max_rs * 0.98)  # Within 2% of high
    
    # Calculate trend
    rs_20_days_ago = float(rs_normalized.iloc[-20]) if len(rs_normalized) > 20 else current_rs
    rs_trend = "Outperforming" if current_rs > rs_20_days_ago else "Underperforming"
    
    return {
        "current_rs": round(current_rs, 2),
        "max_rs": round(max_rs, 2),
        "is_new_high": is_new_high,
        "trend": rs_trend,
        "vs_nifty_percent": round(((current_rs / 100) - 1) * 100, 2)
    }

def get_relative_strength_score(symbol: str) -> dict:
    """Get RS score for a symbol"""
    stock_df = fetch_historical_data(symbol)
    nifty_df = fetch_nifty_data()
    
    if stock_df is None or nifty_df is None:
        return {"error": "Unable to fetch data"}
    
    return calculate_relative_strength(stock_df, nifty_df)
