from services.indicators import calculate_all_indicators
from services.relative_strength import calculate_relative_strength
from services.data_fetcher import fetch_historical_data, fetch_nifty_data
from datetime import datetime

def calculate_strength_score(symbol: str) -> dict:
    """Calculate weighted probability score (0-100) with improved logic"""
    stock_df = fetch_historical_data(symbol)
    nifty_df = fetch_nifty_data()
    
    if stock_df is None:
        return {"error": "Unable to fetch stock data"}
    
    indicators = calculate_all_indicators(stock_df)
    
    score = 0
    explanation = {}
    
    # 1. Relative Strength vs NIFTY (20 points) - Trend strength weighted
    if nifty_df is not None:
        rs = calculate_relative_strength(stock_df, nifty_df)
        if rs.get("is_new_high"):
            score += 20
            explanation["rs_new_high"] = "+20 (RS at new high vs NIFTY)"
        elif rs.get("trend") == "Outperforming":
            score += 12
            explanation["rs_outperforming"] = "+12 (Outperforming NIFTY)"
        else:
            explanation["rs_underperforming"] = "0 (Underperforming NIFTY)"
    
    # 2. EMA Alignment (15 points)
    emas = indicators["emas"]
    if emas["ema_10"] > emas["ema_20"] > emas["ema_50"]:
        score += 15
        explanation["ema_alignment"] = "+15 (Strong uptrend - EMA 10 > 20 > 50)"
    elif emas["ema_10"] > emas["ema_20"]:
        score += 8
        explanation["ema_partial"] = "+8 (Short-term uptrend)"
    else:
        explanation["ema_weak"] = "0 (No clear uptrend)"
    
    # 3. RSI (12 points) - Avoid overbought
    rsi = indicators["rsi"]
    if 55 <= rsi <= 75:
        score += 12
        explanation["rsi_strong"] = "+12 (RSI in strong zone 55-75)"
    elif 45 <= rsi < 55:
        score += 6
        explanation["rsi_moderate"] = "+6 (RSI neutral)"
    elif rsi > 80:
        explanation["rsi_overbought"] = "0 (RSI overbought - caution)"
    else:
        explanation["rsi_weak"] = "0 (RSI weak)"
    
    # 4. MACD (10 points) - Momentum indicator
    macd = indicators["macd"]
    if macd["is_bullish"] and macd["histogram"] > 0:
        score += 10
        explanation["macd_bullish"] = "+10 (MACD bullish crossover)"
    elif macd["is_bullish"]:
        score += 5
        explanation["macd_positive"] = "+5 (MACD above signal)"
    else:
        explanation["macd_bearish"] = "0 (MACD bearish)"
    
    # 5. ADX Trend Strength (10 points)
    adx = indicators["adx"]
    if adx >= 25:
        score += 10
        explanation["adx_strong"] = "+10 (Strong trend - ADX ≥ 25)"
    elif adx >= 20:
        score += 5
        explanation["adx_moderate"] = "+5 (Moderate trend)"
    else:
        explanation["adx_weak"] = "0 (Weak trend)"
    
    # 6. Volume (8 points)
    vol_ratio = indicators["volume_ratio"]
    if vol_ratio > 1.5:
        score += 8
        explanation["volume_high"] = "+8 (High volume confirmation)"
    elif vol_ratio > 1.0:
        score += 4
        explanation["volume_moderate"] = "+4 (Above average volume)"
    else:
        explanation["volume_low"] = "0 (Low volume)"
    
    # 7. SMA 50 Rising (8 points)
    sma = indicators["sma_50"]
    if sma["is_rising"]:
        score += 8
        explanation["sma_rising"] = "+8 (50-SMA rising)"
    else:
        explanation["sma_falling"] = "0 (50-SMA not rising)"
    
    # 8. Volatility Penalty (up to -10 points)
    volatility = indicators["volatility"]
    if volatility > 50:
        penalty = -10
        score = max(0, score + penalty)
        explanation["volatility_high"] = f"{penalty} (High volatility penalty)"
    elif volatility > 35:
        penalty = -5
        score = max(0, score + penalty)
        explanation["volatility_moderate"] = f"{penalty} (Moderate volatility penalty)"
    else:
        explanation["volatility_low"] = "+0 (Acceptable volatility)"
    
    # 9. Price above EMAs (7 points)
    current_price = float(stock_df['Close'].iloc[-1])
    if current_price > emas["ema_50"]:
        score += 7
        explanation["price_above_ema"] = "+7 (Price > 50 EMA)"
    elif current_price > emas["ema_20"]:
        score += 3
        explanation["price_above_ema"] = "+3 (Price > 20 EMA)"
    else:
        explanation["price_below_ema"] = "0 (Price below key EMAs)"
    
    # 10. Liquidity (10 points)
    current_volume = float(stock_df['Volume'].iloc[-1])
    liquidity = current_price * current_volume
    if liquidity > 10_000_000:  # 1 crore
        score += 10
        explanation["liquidity"] = "+10 (High liquidity)"
    elif liquidity > 5_000_000:
        score += 5
        explanation["liquidity"] = "+5 (Moderate liquidity)"
    else:
        explanation["liquidity"] = "0 (Low liquidity)"
    
    # Determine trend
    if score >= 70:
        trend = "Bullish"
    elif score >= 40:
        trend = "Neutral"
    else:
        trend = "Weak"
    
    return {
        "symbol": symbol,
        "strength_score": min(100, score),  # Cap at 100
        "trend": trend,
        "explanation": explanation,
        "indicators": {
            "emas": emas,
            "rsi": round(rsi, 2),
            "macd": macd,
            "adx": round(adx, 2),
            "atr": round(indicators["atr"], 2),
            "volatility": round(volatility, 2),
            "sma_50": round(sma["value"], 2),
            "volume_ratio": round(vol_ratio, 2),
            "current_price": round(current_price, 2)
        },
        "timestamp": datetime.utcnow()
    }
