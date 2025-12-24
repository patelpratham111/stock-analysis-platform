import pandas as pd
import numpy as np
from ta.trend import EMAIndicator, ADXIndicator, SMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volatility import AverageTrueRange

def calculate_ema(df: pd.DataFrame, periods: list = [10, 20, 50]) -> dict:
    """Calculate EMA for multiple periods"""
    emas = {}
    for period in periods:
        ema = EMAIndicator(close=df['Close'], window=period)
        emas[f'ema_{period}'] = float(ema.ema_indicator().iloc[-1])
    return emas

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate RSI"""
    rsi = RSIIndicator(close=df['Close'], window=period)
    return float(rsi.rsi().iloc[-1])

def calculate_macd(df: pd.DataFrame) -> dict:
    """Calculate MACD indicator"""
    macd = MACD(close=df['Close'])
    macd_line = float(macd.macd().iloc[-1])
    signal_line = float(macd.macd_signal().iloc[-1])
    macd_histogram = float(macd.macd_diff().iloc[-1])
    
    return {
        "macd": round(macd_line, 2),
        "signal": round(signal_line, 2),
        "histogram": round(macd_histogram, 2),
        "is_bullish": macd_line > signal_line
    }

def calculate_adx(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate ADX (trend strength)"""
    adx = ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=period)
    return float(adx.adx().iloc[-1])

def calculate_atr(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate ATR (volatility)"""
    atr = AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=period)
    return float(atr.average_true_range().iloc[-1])

def calculate_volatility(df: pd.DataFrame, period: int = 20) -> float:
    """Calculate price volatility (standard deviation)"""
    returns = df['Close'].pct_change()
    volatility = returns.tail(period).std() * np.sqrt(252) * 100  # Annualized
    return float(volatility)

def calculate_sma(df: pd.DataFrame, period: int = 50) -> dict:
    """Calculate SMA and check if rising"""
    sma = SMAIndicator(close=df['Close'], window=period)
    sma_values = sma.sma_indicator()
    current_sma = float(sma_values.iloc[-1])
    prev_sma = float(sma_values.iloc[-5]) if len(sma_values) > 5 else current_sma
    is_rising = current_sma > prev_sma
    return {"value": current_sma, "is_rising": is_rising}

def calculate_volume_ratio(df: pd.DataFrame, period: int = 20) -> float:
    """Calculate current volume vs average"""
    avg_volume = df['Volume'].tail(period).mean()
    current_volume = df['Volume'].iloc[-1]
    return float(current_volume / avg_volume) if avg_volume > 0 else 1.0

def calculate_all_indicators(df: pd.DataFrame) -> dict:
    """Calculate all technical indicators"""
    return {
        "emas": calculate_ema(df),
        "rsi": calculate_rsi(df),
        "macd": calculate_macd(df),
        "adx": calculate_adx(df),
        "atr": calculate_atr(df),
        "volatility": calculate_volatility(df),
        "sma_50": calculate_sma(df),
        "volume_ratio": calculate_volume_ratio(df)
    }
