from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class WatchlistItem(BaseModel):
    symbol: str
    added_at: datetime = datetime.utcnow()

class StockPrice(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: datetime

class AnalysisResult(BaseModel):
    symbol: str
    strength_score: int  # 0-100
    trend: str  # Bullish / Neutral / Weak
    explanation: dict
    indicators: dict
    timestamp: datetime

class ProjectionResult(BaseModel):
    symbol: str
    current_price: float
    projected_range: dict  # {low, mid, high}
    timeframe: str
    confidence: str
    basis: str
    timestamp: datetime
