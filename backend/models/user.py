from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=2, max_length=50)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Check for valid email format with proper domain
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        
        # Check minimum length before @ symbol (at least 3 chars)
        local_part = v.split('@')[0]
        if len(local_part) < 3:
            raise ValueError('Email username must be at least 3 characters')
        
        # Block obviously fake emails
        fake_domains = ['test.com', 'fake.com', 'example.com', 'temp.com']
        domain = v.split('@')[1].lower()
        if domain in fake_domains:
            raise ValueError('Please use a valid email address')
        
        return v.lower()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*)')
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        # Remove extra whitespace
        v = ' '.join(v.split())
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters')
        if not re.match(r'^[a-zA-Z\s]+$', v):
            raise ValueError('Name can only contain letters and spaces')
        return v.title()  # Capitalize first letter of each word

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
