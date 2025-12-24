from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "stock_analysis"
    JWT_SECRET_KEY: str = "your-secret-key-change-this"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = Path(__file__).parent / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
