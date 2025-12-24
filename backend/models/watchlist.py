from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class WatchlistCreate(BaseModel):
    name: str

class WatchlistUpdate(BaseModel):
    name: str

class WatchlistResponse(BaseModel):
    id: str
    name: str
    user_id: str
    stocks: List[dict]
    created_at: datetime
    updated_at: datetime

class AddStockToWatchlist(BaseModel):
    symbol: str
    watchlist_ids: List[str]  # Can add to multiple watchlists
