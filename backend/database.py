from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

users_collection = db.get_collection("users")
watchlists_collection = db.get_collection("watchlists")

async def init_db():
    """Initialize database indexes for optimal performance"""
    # User indexes
    await users_collection.create_index("email", unique=True)
    
    # Watchlist indexes
    await watchlists_collection.create_index([("user_id", 1), ("name", 1)])
    await watchlists_collection.create_index("user_id")
    await watchlists_collection.create_index([("user_id", 1), ("is_default", 1)])
    
    # Compound index for faster queries
    await watchlists_collection.create_index([
        ("user_id", 1),
        ("updated_at", -1)
    ])
    
    # Note: We cannot create a unique index on stocks array elements in MongoDB
    # because stocks is an embedded array. Instead, we enforce uniqueness at
    # application level in the add_stock_to_watchlists endpoint.
    # The endpoint checks for duplicates before insertion (case-insensitive).
    
    print("✅ Database indexes created successfully")
