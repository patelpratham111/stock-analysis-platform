from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings
from models.user import TokenData

security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[str]:
    """Decode JWT token and return email"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        return email
    except JWTError:
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> str:
    """Get current user from Bearer token or HTTP-only cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    
    # Try to get token from Authorization header first (for API calls)
    if credentials:
        token = credentials.credentials
    # Fall back to cookie (for browser requests)
    elif access_token:
        token = access_token
    
    if not token:
        raise credentials_exception
    
    email = decode_token(token)
    if email is None:
        raise credentials_exception
    
    return email

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> Optional[str]:
    """Get current user without raising exception if not authenticated"""
    token = None
    
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token
    
    if not token:
        return None
    
    return decode_token(token)
