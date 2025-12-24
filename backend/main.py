from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from datetime import timedelta, datetime
from typing import List, Optional
from functools import lru_cache
import asyncio

from config import settings
from database import users_collection, watchlists_collection, init_db
from models.user import UserCreate, UserLogin, UserResponse, Token
from models.stock import WatchlistItem, StockPrice, AnalysisResult, ProjectionResult
from models.watchlist import WatchlistCreate, WatchlistUpdate, AddStockToWatchlist
from auth.security import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from services.data_fetcher import fetch_latest_price, fetch_historical_data, fetch_minimal_price
from services.scoring import calculate_strength_score
from services.projection import calculate_projection, get_chart_data, get_comparison_data

app = FastAPI(
    title="Stock Analysis API",
    description="High-performance stock analysis API with caching and async operations",
    version="2.0.0"
)

# Add GZip compression middleware for faster responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for stock prices (TTL: 2 minutes)
price_cache = {}
PRICE_CACHE_TTL = 120  # seconds

# In-memory cache for market feed (TTL: 2 minutes)
market_feed_cache = {"data": None, "timestamp": None}
MARKET_FEED_CACHE_TTL = 120  # seconds

def get_cached_price(symbol: str):
    """Get cached stock price if available and not expired"""
    if symbol in price_cache:
        cached_data, timestamp = price_cache[symbol]
        if (datetime.utcnow() - timestamp).total_seconds() < PRICE_CACHE_TTL:
            return cached_data
    return None

def cache_price(symbol: str, data: dict):
    """Cache stock price data"""
    price_cache[symbol] = (data, datetime.utcnow())

def get_cached_market_feed():
    """Get cached market feed if available and not expired"""
    if market_feed_cache["data"] and market_feed_cache["timestamp"]:
        age = (datetime.utcnow() - market_feed_cache["timestamp"]).total_seconds()
        if age < MARKET_FEED_CACHE_TTL:
            return market_feed_cache["data"]
    return None

def cache_market_feed(data: list):
    """Cache market feed data"""
    market_feed_cache["data"] = data
    market_feed_cache["timestamp"] = datetime.utcnow()

async def fetch_price_with_cache(symbol: str):
    """Fetch stock price with caching"""
    # Check cache first
    cached = get_cached_price(symbol)
    if cached:
        return cached
    
    # Fetch fresh data
    price_data = fetch_latest_price(symbol)
    if price_data:
        cache_price(symbol, price_data)
    return price_data

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
async def root():
    return {
        "message": "Stock Analysis API",
        "disclaimer": "For educational purposes only. No guaranteed returns."
    }

# Popular NSE stocks for market feed (reduced to 15 for faster loading)
POPULAR_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "BAJFINANCE",
    "KOTAKBANK", "LT", "ASIANPAINT", "AXISBANK", "MARUTI"
]

# Default watchlist stocks - single source of truth (cleaned - removed delisted/problematic stocks)
custom_stocks = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "BAJFINANCE",
    "KOTAKBANK", "LT", "ASIANPAINT", "AXISBANK", "MARUTI",
    "HCLTECH", "WIPRO", "TATAMOTORS", "SUNPHARMA", "TITAN",
    "ADANIPORTS", "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC",
    "MUTHOOTMF.NS", "MUTHOOTFIN.NS",
    "DMCC.NS", "PARAS.NS", "GVPTECH.NS", "GSFC.NS", "GNFC.NS",
    "GIPCL.NS", "GMDCLTD.NS", "KOHINOOR.NS", "DIVGIITTS.NS", "ASIANHOTNR.NS",
    "AHLEAST.NS", "BLUECOAST.NS", "ALPHAGEO.NS", "JPASSOCIAT.NS", "JPPOWER.NS",
    "OMKARCHEM.NS", "PREMIER.NS", "WEALTH.NS", "YAARI.NS", "KALYANKJIL.NS",
    "KICL.NS", "RCOM.NS", "MORARJEE.NS", "IVC.NS",
    "GLFL.NS", "EUROTEXIND.NS", "FINOPB.NS", "FINPIPE.NS",
    "FINCABLES.NS", "VLSFINANCE.NS", "PEARLPOLY.NS", "HERCULES.NS", "MADHUSUDAN-SM.NS",
    "MADHUCON.NS", "GOLDENTOBC.NS", "RPGLIFE.NS", "MUKTAARTS.NS",
    "ANKITMETAL.NS", "PRIMESECU.NS", "HYBRIDFIN.NS", "UNIVPHOTO.NS", "SHANTIGEAR.NS",
    "STEL.NS", "BGRENERGY.NS", "ESSARSHPNG.NS", "NKIND.NS", "ELECTHERM.NS",
    "SIRCA.NS", "UTKARSHBNK.NS", "PAR.NS", "UJJIVANSFB.NS", "ANSALAPI.NS",
    "SUPREMEINF.NS", "NPST.NS", "VISASTEEL.NS", "BEPL.NS", "GAYAHWS.NS",
    "SANDESH.NS", "CRIZAC.NS", "JINDALPHOT.NS", "SETCO.NS", "PONNIERODE.NS",
    "MUNJALSHOW.NS", "UNITEDTEA.NS", "MEP.NS", "IITL.NS", "REGENCERAM.NS",
    "GTL.NS", "NSIL.NS", "NAGREEKCAP.NS", "VHL.NS",
    "JMA.NS", "HCL-INSYS.NS", "HATHWAY.NS", "TIL.NS", "AAATECH.NS",
    "SCILAL.NS", "SHYAMTEL.NS", "GVKPIL.NS", "SADBHIN.NS", "JYOTISTRUC.NS",
    "ARSSINFRA.NS", "MHRIL.NS", "DGCONTENT.NS", "PRITI.NS", "MAHSCOOTER.NS",
    "GANGESSECU.NS", "LIKHITHA.NS", "UNIENTER.NS", "ODIGMA.NS", "IMPAL.NS",
    "MOIL.NS", "PGHH.NS", "SOUTHBANK.NS", "INTENTECH.NS", "GLOBAL.NS",
    "BILVYAPAR.NS", "PRAKASHSTL.NS", "ROLTA.NS", "WINSOME.NS", "TPHQ.NS",
    "SHRENIK.NS", "SITINET.NS", "MAITHANALL.NS", "CHEMBONDCH.NS", "BLAL.NS",
    "WANBURY.NS", "GFLLIMITED.NS", "VINYLINDIA.NS", "INDSWFTLTD.NS", "VSTTILLERS.NS",
    "HONDAPOWER.NS", "STEELCAS.NS", "WENDT.NS", "GMRP&UI.NS", "KSOLVES.NS",
    "STARPAPER.NS", "UNITECH.NS", "MTNL.NS", "ITDC.NS", "KAYA.NS",
    "SURANASOL.NS", "PODDARMENT.NS", "SUMMITSEC.NS", "SHEKHAWATI.NS", "DHRUV.NS",
    "BFINVEST.NS", "TMB.NS", "ASMS.NS", "LFIC.NS",
    "CONSOFINVT.NS", "SIMBHALS.NS", "CSBBANK.NS", "MAHAPEXLTD.NS", "VOLTAMP.NS",
    "NUCLEUS.NS", "HMT.NS", "WILLAMAGOR.NS", "HINDCOMPOS.NS", "CMSINFO.NS",
    "NESCO.NS", "DCBBANK.NS", "MADRASFERT.NS", "EQUITASBNK.NS", "STCINDIA.NS",
    "JITFINFRA.NS", "UYFINCORP.NS", "KTKBANK.NS", "HEADSUP.NS", "BCG.NS",
    "SILINV.NS", "CORALFINAC.NS", "DENORA.NS", "DENTA.NS", "NAGAFERT.NS",
    "RADAAN.NS", "ORISSAMINE.NS", "WELINV.NS", "VARDMNPOLY.NS", "DIACABS.NS",
    "DHANBANK.NS", "RUBFILA.NS", "VSTIND.NS", "LPDC.NS", "GMBREW.NS",
    "VARDHACRLC.NS", "FOSECOIND.NS", "NEXTMEDIA.NS", "HINDMOTORS.NS",
    "GTLINFRA.NS", "DISHTV.NS", "RIIL.NS", "AMRUTANJAN.NS", "3PLAND.NS",
    "SUVIDHAA.NS", "JSFB.NS", "JAICORPLTD.NS", "21STCENMGM.NS", "KSB.NS",
    "S&SPOWER.NS", "SWARAJENG.NS", "KSCL.NS", "ATLANTAA.NS", "CAPITALSFB.NS",
    "ABAN.NS", "NITCO.NS", "BLBLIMITED.NS", "PSB.NS", "NBIFIN.NS",
    "SPENCERS.NS", "KAVDEFENCE.NS", "TECILCHEM.NS", "TNTELE.NS",
    "SURYODAY.NS", "IMPEXFERRO.NS", "GARUDA.NS", "KRIDHANINF.NS", "NAHARCAP.NS",
    "SPARC.NS", "TCIFINANCE.NS", "BALKRISHNA.NS", "AEROFLEX.NS",
    "PRAXIS.NS", "ZENITHSTL.NS", "TREEHOUSE.NS", "TRACXN.NS", "BOMDYEING.NS",
    "SANWARIA.NS", "GANDHITUBE.NS", "DCMFINSERV.NS", "DIGIDRIVE.NS", "DIAMINESQ.NS",
    "PARSVNATH.NS", "CYBERMEDIA.NS", "NDLVENTURE.NS", "INDOBORAX.NS", "SOTL.NS",
    "ESAFSFB.NS", "FINEORG.NS", "TVVISION.NS", "63MOONS.NS",
    "ROLLT.NS", "GEECEE.NS", "TAINWALCHM.NS", "EIMCOELECO.NS", "RHFL.NS",
    "WONDERLA.NS", "QUICKHEAL.NS", "MAZDA.NS", "LMW.NS", "VHLTD.NS",
    "KRONOX.NS", "SMLT.NS", "ROML.NS", "SABTNL.NS", "MACPOWER.NS",
    "SUVEN.NS", "OILCOUNTUB.NS", "FLEXITUFF.NS", "TARAPUR.NS", "ORTEL.NS",
    "TIJARIA.NS", "ALPSINDUS.NS", "EXCEL.NS", "OSWALGREEN.NS", "LINCOLN.NS",
    "EXCELINDUS.NS", "DNAMEDIA.NS", "OSWALAGRO.NS"
]

# Removed problematic stocks: HDIL.NS, CINEVISTA.NS, FCSSOFT.NS, TIMESGTY.NS, SUNDARMHLD.NS, GANESHHOUC.NS, HINDNATGLS.NS, IL&FSTRANS.NS, IL&FSENGG.NS

@app.get("/market-feed")
async def get_market_feed(current_user: str = Depends(get_current_user)):
    """Get default market feed with popular stocks including sparkline data (cached & optimized)"""
    # Check cache first
    cached_feed = get_cached_market_feed()
    if cached_feed:
        return {"stocks": cached_feed, "cached": True}
    
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    def fetch_stock_with_sparkline(symbol):
        try:
            # Check cache first
            cached = get_cached_price(symbol)
            if cached:
                return cached
            
            price_data = fetch_latest_price(symbol)
            if price_data:
                # Get last 7 days for sparkline (lighter query)
                df = fetch_historical_data(symbol, period="1mo")
                if df is not None and len(df) >= 7:
                    sparkline = df['Close'].tail(7).tolist()
                    price_data["sparkline"] = [round(float(p), 2) for p in sparkline]
                else:
                    price_data["sparkline"] = []
                
                # Cache the result
                cache_price(symbol, price_data)
                return price_data
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            return None
    
    # Fetch stocks in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_stock_with_sparkline, symbol) for symbol in POPULAR_STOCKS]
        stocks_data = [future.result() for future in futures if future.result() is not None]
    
    # Cache the market feed
    cache_market_feed(stocks_data)
    
    return {"stocks": stocks_data, "cached": False}

# All available NSE stock symbols for search (used as fallback cache only)
ALL_STOCK_SYMBOLS = list(set(POPULAR_STOCKS + custom_stocks))

# Search cache - stores recent search results (TTL: 5 minutes)
search_cache = {}
SEARCH_CACHE_TTL = 300  # 5 minutes


def get_cached_search(query: str):
    """Get cached search results if available and not expired"""
    cache_key = query.upper().strip()
    if cache_key in search_cache:
        cached_data, timestamp = search_cache[cache_key]
        if (datetime.utcnow() - timestamp).total_seconds() < SEARCH_CACHE_TTL:
            return cached_data
    return None


def cache_search_results(query: str, results: list):
    """Cache search results"""
    cache_key = query.upper().strip()
    search_cache[cache_key] = (results, datetime.utcnow())
    # Limit cache size
    if len(search_cache) > 500:
        # Remove oldest entries
        oldest_keys = sorted(search_cache.keys(), key=lambda k: search_cache[k][1])[:100]
        for key in oldest_keys:
            del search_cache[key]


async def search_yahoo_finance(query: str) -> list:
    """
    Search stocks using Yahoo Finance search API.
    This is the PRIMARY search source - supports partial, prefix, and fuzzy matching.
    """
    import httpx

    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {
        "q": query,
        "quotesCount": 15,
        "newsCount": 0,
        "listsCount": 0,
        "enableFuzzyQuery": True,
        "quotesQueryId": "tss_match_phrase_query",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            results = []
            quotes = data.get("quotes", [])

            for quote in quotes:
                symbol = quote.get("symbol", "")
                name = quote.get("shortname") or quote.get("longname") or ""
                exchange = quote.get("exchange", "")
                quote_type = quote.get("quoteType", "")

                # Filter for Indian stocks (NSE/BSE) or include all equity types
                is_indian = symbol.endswith(".NS") or symbol.endswith(".BO")
                is_equity = quote_type in ["EQUITY", "ETF", "MUTUALFUND"]

                # Prioritize Indian stocks but include others
                if is_indian or is_equity:
                    # Determine exchange badge
                    if symbol.endswith(".NS"):
                        exchange_badge = "NSE"
                    elif symbol.endswith(".BO"):
                        exchange_badge = "BSE"
                    else:
                        exchange_badge = exchange[:3].upper() if exchange else "US"

                    results.append(
                        {
                            "symbol": symbol,
                            "name": name,
                            "exchange": exchange_badge,
                            "type": quote_type,
                            "isIndian": is_indian,
                        }
                    )

            # Sort: Indian stocks first, then by relevance (order from Yahoo)
            results.sort(key=lambda x: (0 if x["isIndian"] else 1))

            return results[:12]

    except Exception as e:
        print(f"Yahoo Finance search error: {e}")
        return []


def rank_search_results(results: list, query: str) -> list:
    """
    Rank search results with smart priority:
    1. Symbol starts with query (highest)
    2. Symbol contains query
    3. Company name starts with query
    4. Company name contains query
    """
    query_upper = query.upper().strip()

    def get_score(item):
        symbol = item["symbol"].upper().replace(".NS", "").replace(".BO", "")
        name = item["name"].upper()

        # Symbol exact match
        if symbol == query_upper:
            return 100
        # Symbol starts with query
        if symbol.startswith(query_upper):
            return 90
        # Symbol contains query
        if query_upper in symbol:
            return 80
        # Name starts with query
        if name.startswith(query_upper):
            return 70
        # Name contains query (word boundary)
        words = name.split()
        for word in words:
            if word.startswith(query_upper):
                return 65
        # Name contains query anywhere
        if query_upper in name:
            return 60
        return 50  # Default score for Yahoo results

    for item in results:
        item["score"] = get_score(item)

    # Sort by score (highest first), then Indian stocks first
    results.sort(key=lambda x: (-x["score"], 0 if x.get("isIndian") else 1, x["symbol"]))

    return results


@app.get("/stocks/search")
async def search_stocks(q: str, current_user: str = Depends(get_current_user)):
    """
    🔍 LIVE STOCK SEARCH using Yahoo Finance API
    
    Features:
    - Partial matching: NYK → NYKAA
    - Prefix matching: MUTHOOT → MUTHOOTMF  
    - Fuzzy matching: Built into Yahoo Finance
    - Searches both symbol AND company name
    - Case-insensitive
    - Returns results for 2+ characters
    
    This is a COMPLETE REDESIGN - no longer uses static stock list!
    """
    if not q or len(q) < 2:
        return {"results": [], "query": q, "source": "none"}

    query = q.strip()

    # Check cache first
    cached = get_cached_search(query)
    if cached:
        return {"results": cached, "query": query, "source": "cache"}

    # Search Yahoo Finance (PRIMARY SOURCE)
    yahoo_results = await search_yahoo_finance(query)

    if yahoo_results:
        # Rank results with smart priority
        ranked_results = rank_search_results(yahoo_results, query)

        # Build final response
        final_results = []
        for r in ranked_results[:10]:
            final_results.append(
                {
                    "symbol": r["symbol"],
                    "name": r["name"],
                    "exchange": r.get("exchange", "NSE"),
                    "matchType": "symbol"
                    if query.upper() in r["symbol"].upper()
                    else "name",
                }
            )

        # Cache results
        cache_search_results(query, final_results)

        return {"results": final_results, "query": query, "source": "yahoo"}

    # Fallback: No results from Yahoo
    return {"results": [], "query": query, "source": "yahoo"}

# Auth Routes
@app.post("/auth/register")
async def register(user: UserCreate, response: Response):
    """Register new user with HTTP-only cookie"""
    try:
        # Check if user exists
        existing = await users_collection.find_one({"email": user.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        hashed_password = get_password_hash(user.password)
        user_doc = {
            "email": user.email,
            "name": user.name,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow()
        }
        result = await users_collection.insert_one(user_doc)
        
        # Create empty default watchlist (populate later for faster registration)
        await watchlists_collection.insert_one({
            "user_id": str(result.inserted_id),
            "name": "Default",
            "stocks": [],
            "is_default": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Generate token
        access_token = create_access_token(data={"sub": user.email})
        
        # Set HTTP-only cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=False  # Set to True in production with HTTPS
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user.email,
                "name": user.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Registration failed. Make sure MongoDB is running on mongodb://localhost:27017"
        )

@app.post("/auth/login")
async def login(user: UserLogin, response: Response):
    """Login user with HTTP-only cookie"""
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    # Set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "name": db_user["name"]
        }
    }

@app.post("/auth/logout")
async def logout(response: Response):
    """Logout user by clearing cookie"""
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

@app.get("/auth/google/login")
async def google_login():
    """Initiate Google OAuth flow"""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        "response_type=code&"
        "scope=openid email profile&"
        "access_type=offline&"
        "prompt=consent"
    )
    return {"auth_url": google_auth_url}

@app.get("/auth/google/callback")
async def google_callback(code: str, response: Response):
    """Handle Google OAuth callback"""
    import httpx
    
    # Exchange authorization code for access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Get access token
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            if not access_token:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            userinfo_response = await client.get(userinfo_url, headers=headers)
            userinfo_response.raise_for_status()
            user_info = userinfo_response.json()
            
            email = user_info.get("email")
            name = user_info.get("name", email.split("@")[0])
            google_id = user_info.get("id")
            
            if not email:
                raise HTTPException(status_code=400, detail="Email not provided by Google")
            
            # Check if user exists
            existing_user = await users_collection.find_one({"email": email})
            
            if existing_user:
                # Update Google ID if not set
                if not existing_user.get("google_id"):
                    await users_collection.update_one(
                        {"email": email},
                        {"$set": {"google_id": google_id, "updated_at": datetime.utcnow()}}
                    )
            else:
                # Create new user
                user_doc = {
                    "email": email,
                    "name": name,
                    "google_id": google_id,
                    "hashed_password": "",  # No password for OAuth users
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                result = await users_collection.insert_one(user_doc)
                
                # Create empty default watchlist
                await watchlists_collection.insert_one({
                    "user_id": str(result.inserted_id),
                    "name": "Default",
                    "stocks": [],
                    "is_default": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
            
            # Generate JWT token
            jwt_token = create_access_token(data={"sub": email})
            
            # Redirect to frontend with success and set cookie
            from fastapi.responses import RedirectResponse
            redirect_url = f"{settings.FRONTEND_URL}/?auth=success"
            redirect_response = RedirectResponse(url=redirect_url, status_code=302)
            
            # Set HTTP-only cookie on the redirect response
            redirect_response.set_cookie(
                key="access_token",
                value=jwt_token,
                httponly=True,
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                samesite="lax",
                secure=False  # Set to True in production with HTTPS
            )
            
            return redirect_response
            
        except httpx.HTTPError as e:
            print(f"Google OAuth error: {e}")
            # Redirect to frontend with error
            from fastapi.responses import RedirectResponse
            redirect_url = f"{settings.FRONTEND_URL}/login?error=oauth_failed"
            return RedirectResponse(url=redirect_url)
        except Exception as e:
            print(f"Unexpected error during Google OAuth: {e}")
            from fastapi.responses import RedirectResponse
            redirect_url = f"{settings.FRONTEND_URL}/login?error=oauth_failed"
            return RedirectResponse(url=redirect_url)

@app.get("/auth/me")
async def get_auth_me(current_user: str = Depends(get_current_user)):
    """Get current authenticated user (validates session)"""
    user = await users_collection.find_one({"email": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user["email"],
        "name": user["name"],
        "authenticated": True
    }

@app.get("/user/me")
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    """Get current user information (legacy endpoint)"""
    user = await users_collection.find_one({"email": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user["email"],
        "name": user["name"]
    }

# Protected Routes
@app.get("/price/{symbol}")
async def get_price(symbol: str, current_user: str = Depends(get_current_user)):
    """Get stock price with caching"""
    price_data = await fetch_price_with_cache(symbol)
    if not price_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    return price_data

@app.get("/watchlist/analyze")
async def analyze_watchlist(threshold: int = 65, current_user: str = Depends(get_current_user)):
    """Analyze all stocks in user's watchlist and return those above threshold"""
    user = await users_collection.find_one({"email": current_user})
    watchlist_doc = await watchlists_collection.find_one({"user_id": str(user["_id"])})
    
    if not watchlist_doc or not watchlist_doc.get("stocks"):
        return {"qualifying_stocks": [], "total_analyzed": 0, "threshold": threshold}
    
    qualifying_stocks = []
    
    for item in watchlist_doc["stocks"]:
        symbol = item["symbol"]
        try:
            # Analyze stock
            analysis = calculate_strength_score(symbol)
            
            if "error" not in analysis and analysis["strength_score"] >= threshold:
                # Get projection
                projection = calculate_projection(symbol, months=3)
                
                # Get chart data
                chart = get_chart_data(symbol)
                
                qualifying_stocks.append({
                    "symbol": symbol,
                    "analysis": analysis,
                    "projection": projection if "error" not in projection else None,
                    "chart": chart if "error" not in chart else None
                })
        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            continue
    
    # Sort by score (highest first)
    qualifying_stocks.sort(key=lambda x: x["analysis"]["strength_score"], reverse=True)
    
    return {
        "qualifying_stocks": qualifying_stocks,
        "total_analyzed": len(watchlist_doc["stocks"]),
        "threshold": threshold
    }

# Watchlist Management Routes
@app.get("/watchlists")
async def get_all_watchlists(current_user: str = Depends(get_current_user)):
    """Get all watchlists for current user (lightweight - no prices)"""
    user = await users_collection.find_one({"email": current_user})
    watchlists = await watchlists_collection.find({"user_id": str(user["_id"])}).to_list(100)
    
    result = []
    for wl in watchlists:
        result.append({
            "id": str(wl["_id"]),
            "name": wl.get("name", "Unnamed Watchlist"),
            "stock_count": len(wl.get("stocks", [])),
            "is_default": wl.get("is_default", False),
            "created_at": wl.get("created_at"),
            "updated_at": wl.get("updated_at")
        })
    
    return {"watchlists": result}

@app.get("/watchlists/{watchlist_id}/symbols")
async def get_watchlist_symbols(watchlist_id: str, current_user: str = Depends(get_current_user)):
    """Get watchlist symbols only (ultra-fast, no price fetching)"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    watchlist = await watchlists_collection.find_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"])
    })
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    symbols = [stock["symbol"] for stock in watchlist.get("stocks", [])]
    
    return {
        "id": str(watchlist["_id"]),
        "name": watchlist.get("name", "Unnamed Watchlist"),
        "is_default": watchlist.get("is_default", False),
        "symbols": symbols,
        "total_stocks": len(symbols)
    }

@app.post("/watchlists")
async def create_watchlist(watchlist: WatchlistCreate, current_user: str = Depends(get_current_user)):
    """Create a new watchlist"""
    user = await users_collection.find_one({"email": current_user})
    
    # Check if name already exists
    existing = await watchlists_collection.find_one({
        "user_id": str(user["_id"]),
        "name": watchlist.name
    })
    if existing:
        raise HTTPException(status_code=400, detail="Watchlist with this name already exists")
    
    new_watchlist = {
        "user_id": str(user["_id"]),
        "name": watchlist.name,
        "stocks": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await watchlists_collection.insert_one(new_watchlist)
    
    return {
        "id": str(result.inserted_id),
        "name": watchlist.name,
        "message": "Watchlist created successfully"
    }

@app.get("/watchlists/{watchlist_id}")
async def get_watchlist(watchlist_id: str, current_user: str = Depends(get_current_user), limit: int = 20, offset: int = 0, minimal: bool = True):
    """Get specific watchlist with stock prices (ULTRA-FAST with minimal data)"""
    from bson import ObjectId
    from concurrent.futures import ThreadPoolExecutor
    from services.data_fetcher import fetch_minimal_price
    
    user = await users_collection.find_one({"email": current_user})
    watchlist = await watchlists_collection.find_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"])
    })
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    all_stocks = watchlist.get("stocks", [])
    total_stocks = len(all_stocks)
    
    # Get paginated stocks (offset-based)
    stocks = all_stocks[offset:offset + limit]
    
    # Fetch MINIMAL prices in parallel with aggressive caching
    def fetch_stock_minimal_cached(item):
        try:
            symbol = item["symbol"]
            
            # Check cache first (2-min TTL)
            cached = get_cached_price(symbol)
            if cached:
                # Return only essential fields from cache
                return {
                    "symbol": symbol,
                    "price": cached.get("price"),
                    "change": cached.get("change"),
                    "change_percent": cached.get("change_percent"),
                    "added_at": item["added_at"]
                }
            
            # Fetch MINIMAL data (only 5 days, no info API call)
            if minimal:
                price_data = fetch_minimal_price(symbol)
            else:
                price_data = fetch_latest_price(symbol)
            
            if price_data:
                # Cache it
                cache_price(symbol, price_data)
                return {
                    **price_data,
                    "added_at": item["added_at"]
                }
        except Exception as e:
            print(f"Error fetching {item['symbol']}: {e}")
            pass
        return None
    
    # Use ThreadPoolExecutor with 30 workers for maximum parallelism
    with ThreadPoolExecutor(max_workers=30) as executor:
        stocks_with_prices = list(filter(None, executor.map(fetch_stock_minimal_cached, stocks)))
    
    has_more = (offset + limit) < total_stocks
    
    return {
        "id": str(watchlist["_id"]),
        "name": watchlist.get("name", "Unnamed Watchlist"),
        "is_default": watchlist.get("is_default", False),
        "stocks": stocks_with_prices,
        "total_stocks": total_stocks,
        "loaded": len(stocks_with_prices),
        "offset": offset,
        "limit": limit,
        "has_more": has_more,
        "created_at": watchlist.get("created_at"),
        "updated_at": watchlist.get("updated_at")
    }

@app.put("/watchlists/{watchlist_id}")
async def update_watchlist(watchlist_id: str, watchlist: WatchlistUpdate, current_user: str = Depends(get_current_user)):
    """Rename watchlist"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    result = await watchlists_collection.update_one(
        {"_id": ObjectId(watchlist_id), "user_id": str(user["_id"])},
        {"$set": {"name": watchlist.name, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    return {"message": "Watchlist updated successfully"}

@app.delete("/watchlists/{watchlist_id}")
async def delete_watchlist(watchlist_id: str, current_user: str = Depends(get_current_user)):
    """Delete watchlist"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    # Prevent deletion of default watchlist
    watchlist = await watchlists_collection.find_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"])
    })
    
    if watchlist and watchlist.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default watchlist. Use reset instead.")
    
    result = await watchlists_collection.delete_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    return {"message": "Watchlist deleted successfully"}

@app.get("/watchlists/default/info")
async def get_default_watchlist_info(current_user: str = Depends(get_current_user)):
    """Get default watchlist metadata"""
    return {
        "default_stocks": custom_stocks,
        "total_count": len(custom_stocks),
        "description": "System default watchlist with curated NSE stocks"
    }

@app.post("/watchlists/create-default")
async def create_default_watchlist(current_user: str = Depends(get_current_user)):
    """Create default watchlist if it doesn't exist"""
    user = await users_collection.find_one({"email": current_user})
    
    # Check if default already exists
    existing = await watchlists_collection.find_one({
        "user_id": str(user["_id"]),
        "is_default": True
    })
    
    if existing:
        return {
            "message": "Default watchlist already exists",
            "watchlist_id": str(existing["_id"])
        }
    
    # Create default watchlist
    default_stocks = [
        {"symbol": symbol, "added_at": datetime.utcnow()}
        for symbol in custom_stocks
    ]
    
    result = await watchlists_collection.insert_one({
        "user_id": str(user["_id"]),
        "name": "Default",
        "stocks": default_stocks,
        "is_default": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    return {
        "message": "Default watchlist created successfully",
        "watchlist_id": str(result.inserted_id),
        "stock_count": len(custom_stocks)
    }

@app.post("/watchlists/{watchlist_id}/reset-default")
async def reset_default_watchlist(watchlist_id: str, current_user: str = Depends(get_current_user)):
    """Reset default watchlist to original custom_stocks"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    # Verify it's a default watchlist
    watchlist = await watchlists_collection.find_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"]),
        "is_default": True
    })
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Default watchlist not found")
    
    # Reset to custom_stocks
    default_stocks = [
        {"symbol": symbol, "added_at": datetime.utcnow()}
        for symbol in custom_stocks
    ]
    
    await watchlists_collection.update_one(
        {"_id": ObjectId(watchlist_id)},
        {
            "$set": {
                "stocks": default_stocks,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Default watchlist reset successfully",
        "stock_count": len(custom_stocks)
    }

@app.post("/watchlists/populate-default")
async def populate_default_watchlist(background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user)):
    """Populate empty default watchlist with custom_stocks (background task)"""
    from bson import ObjectId
    user = await users_collection.find_one({"email": current_user})
    
    # Find default watchlist
    watchlist = await watchlists_collection.find_one({
        "user_id": str(user["_id"]),
        "is_default": True
    })
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Default watchlist not found")
    
    # Only populate if empty
    if len(watchlist.get("stocks", [])) > 0:
        return {
            "message": "Default watchlist already populated",
            "stock_count": len(watchlist.get("stocks", []))
        }
    
    # Populate in background
    async def populate_stocks():
        default_stocks = [
            {"symbol": symbol, "added_at": datetime.utcnow()}
            for symbol in custom_stocks
        ]
        
        await watchlists_collection.update_one(
            {"_id": ObjectId(watchlist["_id"])},
            {
                "$set": {
                    "stocks": default_stocks,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    # Add to background tasks
    background_tasks.add_task(populate_stocks)
    
    return {
        "message": "Default watchlist population started in background",
        "stock_count": len(custom_stocks)
    }

@app.post("/watchlists/fix-default")
async def fix_default_watchlist(current_user: str = Depends(get_current_user)):
    """Fix default watchlist - add name and update stocks"""
    from bson import ObjectId
    user = await users_collection.find_one({"email": current_user})
    
    # Find ALL default watchlists (to handle duplicates)
    all_defaults = await watchlists_collection.find({
        "user_id": str(user["_id"]),
        "is_default": True
    }).to_list(100)
    
    if not all_defaults:
        # Create if doesn't exist
        default_stocks = [
            {"symbol": symbol, "added_at": datetime.utcnow()}
            for symbol in custom_stocks
        ]
        result = await watchlists_collection.insert_one({
            "user_id": str(user["_id"]),
            "name": "Default",
            "stocks": default_stocks,
            "is_default": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        return {
            "message": "Default watchlist created",
            "stock_count": len(custom_stocks)
        }
    
    # Keep the first one, delete the rest
    keep_watchlist = all_defaults[0]
    
    if len(all_defaults) > 1:
        for wl in all_defaults[1:]:
            await watchlists_collection.delete_one({"_id": ObjectId(wl["_id"])})
    
    # Update the kept one
    default_stocks = [
        {"symbol": symbol, "added_at": datetime.utcnow()}
        for symbol in custom_stocks
    ]
    
    await watchlists_collection.update_one(
        {"_id": ObjectId(keep_watchlist["_id"])},
        {
            "$set": {
                "name": "Default",
                "stocks": default_stocks,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    duplicates_removed = len(all_defaults) - 1
    message = "Default watchlist fixed and updated"
    if duplicates_removed > 0:
        message += f" ({duplicates_removed} duplicate(s) removed)"
    
    return {
        "message": message,
        "stock_count": len(custom_stocks)
    }

@app.post("/watchlists/cleanup-invalid")
async def cleanup_invalid_stocks(current_user: str = Depends(get_current_user)):
    """Remove invalid/delisted stocks from all watchlists"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    # List of invalid stocks to remove
    invalid_stocks = [
        "HDIL.NS", "CINEVISTA.NS", "FCSSOFT.NS", "TIMESGTY.NS", 
        "SUNDARMHLD.NS", "GANESHHOUC.NS", "HINDNATGLS.NS",
        "IL&FSTRANS.NS", "IL&FSENGG.NS"
    ]
    
    # Remove from all user's watchlists
    result = await watchlists_collection.update_many(
        {"user_id": str(user["_id"])},
        {
            "$pull": {
                "stocks": {"symbol": {"$in": invalid_stocks}}
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {
        "message": f"Cleaned up invalid stocks from {result.modified_count} watchlist(s)",
        "removed_stocks": invalid_stocks
    }

@app.post("/watchlists/add-stock")
async def add_stock_to_watchlists(data: AddStockToWatchlist, current_user: str = Depends(get_current_user)):
    """Add stock to one or multiple watchlists with duplicate prevention"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    # Normalize symbol to uppercase for case-insensitive comparison
    normalized_symbol = data.symbol.upper()
    
    # Verify stock exists
    price_data = fetch_latest_price(normalized_symbol)
    if not price_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # Track results for each watchlist
    added_count = 0
    duplicate_count = 0
    added_watchlists = []
    skipped_watchlists = []
    
    # Add to each watchlist with duplicate check
    for watchlist_id in data.watchlist_ids:
        # Check if stock already exists in this watchlist (case-insensitive)
        watchlist_doc = await watchlists_collection.find_one({
            "_id": ObjectId(watchlist_id),
            "user_id": str(user["_id"])
        })
        
        if not watchlist_doc:
            continue
        
        watchlist_name = watchlist_doc.get("name", "Unnamed")
        
        # Check for duplicate (case-insensitive)
        existing_symbols = [stock["symbol"].upper() for stock in watchlist_doc.get("stocks", [])]
        
        if normalized_symbol in existing_symbols:
            duplicate_count += 1
            skipped_watchlists.append(watchlist_name)
            continue
        
        # Add stock if not duplicate
        await watchlists_collection.update_one(
            {"_id": ObjectId(watchlist_id), "user_id": str(user["_id"])},
            {
                "$push": {
                    "stocks": {
                        "symbol": normalized_symbol,
                        "added_at": datetime.utcnow()
                    }
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        added_count += 1
        added_watchlists.append(watchlist_name)
    
    # Return detailed response
    return {
        "added_count": added_count,
        "duplicate_count": duplicate_count,
        "added_watchlists": added_watchlists,
        "skipped_watchlists": skipped_watchlists,
        "symbol": normalized_symbol
    }

@app.get("/watchlists/check-stock/{symbol}")
async def check_stock_in_watchlists(symbol: str, current_user: str = Depends(get_current_user)):
    """Check which watchlists already contain a stock"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    normalized_symbol = symbol.upper()
    
    # Get all user's watchlists
    watchlists = await watchlists_collection.find({"user_id": str(user["_id"])}).to_list(100)
    
    result = []
    for wl in watchlists:
        existing_symbols = [stock["symbol"].upper() for stock in wl.get("stocks", [])]
        already_added = normalized_symbol in existing_symbols
        
        result.append({
            "id": str(wl["_id"]),
            "name": wl.get("name", "Unnamed Watchlist"),
            "stock_count": len(wl.get("stocks", [])),
            "is_default": wl.get("is_default", False),
            "already_added": already_added
        })
    
    return {"watchlists": result, "symbol": normalized_symbol}

@app.delete("/watchlists/{watchlist_id}/stocks/{symbol}")
async def remove_stock_from_watchlist(watchlist_id: str, symbol: str, current_user: str = Depends(get_current_user)):
    """Remove stock from watchlist"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    
    await watchlists_collection.update_one(
        {"_id": ObjectId(watchlist_id), "user_id": str(user["_id"])},
        {
            "$pull": {"stocks": {"symbol": symbol.upper()}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Stock removed from watchlist"}

@app.get("/watchlists/{watchlist_id}/analyze")
async def analyze_specific_watchlist(watchlist_id: str, threshold: int = 65, current_user: str = Depends(get_current_user)):
    """Analyze specific watchlist"""
    from bson import ObjectId
    
    user = await users_collection.find_one({"email": current_user})
    watchlist = await watchlists_collection.find_one({
        "_id": ObjectId(watchlist_id),
        "user_id": str(user["_id"])
    })
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    if not watchlist.get("stocks"):
        return {"qualifying_stocks": [], "total_analyzed": 0, "threshold": threshold, "watchlist_name": watchlist["name"]}
    
    qualifying_stocks = []
    
    for item in watchlist["stocks"]:
        symbol = item["symbol"]
        try:
            analysis = calculate_strength_score(symbol)
            
            if "error" not in analysis and analysis["strength_score"] >= threshold:
                projection = calculate_projection(symbol, months=3)
                chart = get_chart_data(symbol)
                
                qualifying_stocks.append({
                    "symbol": symbol,
                    "analysis": analysis,
                    "projection": projection if "error" not in projection else None,
                    "chart": chart if "error" not in chart else None
                })
        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            continue
    
    qualifying_stocks.sort(key=lambda x: x["analysis"]["strength_score"], reverse=True)
    
    return {
        "qualifying_stocks": qualifying_stocks,
        "total_analyzed": len(watchlist["stocks"]),
        "threshold": threshold,
        "watchlist_name": watchlist["name"]
    }

# Legacy endpoints for backward compatibility
@app.get("/watchlist")
async def get_default_watchlist(current_user: str = Depends(get_current_user)):
    """Get first watchlist (legacy support)"""
    user = await users_collection.find_one({"email": current_user})
    watchlist = await watchlists_collection.find_one({"user_id": str(user["_id"])})
    
    if not watchlist:
        return {"stocks": []}
    
    stocks_with_prices = []
    for item in watchlist.get("stocks", []):
        price_data = fetch_latest_price(item["symbol"])
        if price_data:
            stocks_with_prices.append({
                **price_data,
                "added_at": item["added_at"]
            })
    
    return {"stocks": stocks_with_prices}

@app.post("/watchlist/add")
async def add_to_default_watchlist(symbol: str, current_user: str = Depends(get_current_user)):
    """Add to first watchlist (legacy support)"""
    user = await users_collection.find_one({"email": current_user})
    
    price_data = fetch_latest_price(symbol)
    if not price_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    await watchlists_collection.update_one(
        {"user_id": str(user["_id"])},
        {
            "$addToSet": {
                "stocks": {
                    "symbol": symbol.upper(),
                    "added_at": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Stock added to watchlist", "symbol": symbol}

@app.delete("/watchlist/remove/{symbol}")
async def remove_from_default_watchlist(symbol: str, current_user: str = Depends(get_current_user)):
    """Remove from first watchlist (legacy support)"""
    user = await users_collection.find_one({"email": current_user})
    
    await watchlists_collection.update_one(
        {"user_id": str(user["_id"])},
        {
            "$pull": {"stocks": {"symbol": symbol.upper()}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Stock removed from watchlist"}

@app.post("/analyze")
async def analyze_stock(symbol: str, current_user: str = Depends(get_current_user)):
    result = calculate_strength_score(symbol)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.get("/projection/{symbol}")
async def get_projection(symbol: str, months: int = 3, current_user: str = Depends(get_current_user)):
    result = calculate_projection(symbol, months)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.get("/chart/{symbol}")
async def get_chart(symbol: str, period: str = "6mo", current_user: str = Depends(get_current_user)):
    result = get_chart_data(symbol, period)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.get("/comparison/{symbol}")
async def get_stock_comparison(symbol: str, current_user: str = Depends(get_current_user)):
    """Get stock vs NIFTY comparison"""
    result = get_comparison_data(symbol)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
