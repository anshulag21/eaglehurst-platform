"""
Authentication utilities and JWT handling
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import secrets
import string
import hashlib
import base64

from ..core.config import settings
from ..core.constants import JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthUtils:
    """Authentication utility class"""
    
    @staticmethod
    def _prepare_password_for_bcrypt(password: str) -> str:
        """
        Prepare password for bcrypt hashing.
        For passwords longer than 72 bytes, use SHA-256 pre-hashing.
        This is a recommended approach for handling long passwords with bcrypt.
        """
        password_bytes = password.encode('utf-8')
        
        # If password is 72 bytes or less, use it directly
        if len(password_bytes) <= 72:
            return password
        
        # For longer passwords, use SHA-256 pre-hashing
        # This maintains security while staying within bcrypt's limits
        sha256_hash = hashlib.sha256(password_bytes).digest()
        # Encode as base64 to get a string representation
        return base64.b64encode(sha256_hash).decode('ascii')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        prepared_password = AuthUtils._prepare_password_for_bcrypt(plain_password)
        return pwd_context.verify(prepared_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash"""
        prepared_password = AuthUtils._prepare_password_for_bcrypt(password)
        return pwd_context.hash(prepared_password)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Check token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Check expiration
            exp = payload.get("exp")
            if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired"
                )
            
            return payload
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """Generate numeric OTP"""
        digits = string.digits
        return ''.join(secrets.choice(digits) for _ in range(length))
    
    @staticmethod
    def generate_reset_token() -> str:
        """Generate password reset token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate secure verification token for email verification URLs"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_token_response(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create complete token response"""
        # Include user_type in JWT token for permission checks
        token_data = {
            "sub": str(user_data["id"]),
            "user_type": user_data.get("user_type")  # Add user_type to JWT payload
        }
        
        access_token = AuthUtils.create_access_token(data=token_data)
        refresh_token = AuthUtils.create_refresh_token(data=token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_data
        }
