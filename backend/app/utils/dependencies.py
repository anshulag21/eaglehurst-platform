"""
FastAPI dependencies for authentication and authorization
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.constants import UserType
from ..models.user_models import User
from ..dao.user_dao import UserDAO
from .auth import AuthUtils

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    
    # Verify token
    payload = AuthUtils.verify_token(credentials.credentials)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user from database
    user_dao = UserDAO(db)
    user = user_dao.get_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    # Add JWT payload user_type to user object for permission checks
    # Priority 1: JWT user_type, Priority 2: User model user_type
    jwt_user_type = payload.get("user_type") or payload.get("role")
    if jwt_user_type:
        user.jwt_user_type = jwt_user_type
    else:
        user.jwt_user_type = user.user_type
    
    return user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current authenticated and verified user"""
    
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    
    return current_user


async def get_current_seller(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current authenticated seller"""
    
    if current_user.user_type != UserType.SELLER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )
    
    return current_user


async def get_current_buyer(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current authenticated buyer"""
    
    if current_user.user_type != UserType.BUYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer access required"
        )
    
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current authenticated admin"""
    
    # Check both DB and JWT (if available) for admin role
    is_admin = current_user.user_type == UserType.ADMIN
    if hasattr(current_user, 'jwt_user_type') and current_user.jwt_user_type == UserType.ADMIN:
        is_admin = True
        
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


async def get_current_seller_or_admin(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current authenticated seller or admin"""
    
    # Check both DB and JWT (if available)
    is_seller = current_user.user_type == UserType.SELLER
    is_admin = current_user.user_type == UserType.ADMIN
    
    if hasattr(current_user, 'jwt_user_type'):
        if current_user.jwt_user_type == UserType.SELLER:
            is_seller = True
        if current_user.jwt_user_type == UserType.ADMIN:
            is_admin = True
            
    if not (is_seller or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller or admin access required"
        )
    
    return current_user


async def get_current_buyer_or_admin(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current authenticated buyer or admin"""
    
    # Check both DB and JWT (if available)
    is_buyer = current_user.user_type == UserType.BUYER
    is_admin = current_user.user_type == UserType.ADMIN
    
    if hasattr(current_user, 'jwt_user_type'):
        if current_user.jwt_user_type == UserType.BUYER:
            is_buyer = True
        if current_user.jwt_user_type == UserType.ADMIN:
            is_admin = True
            
    if not (is_buyer or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer or admin access required"
        )
    
    return current_user


async def get_optional_current_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    
    if credentials is None:
        return None
    
    try:
        # Verify token
        payload = AuthUtils.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            return None
        
        # Get user from database
        user_dao = UserDAO(db)
        user = user_dao.get_by_id(user_id)
        
        if user is None or not user.is_active:
            return None
        
        return user
        
    except HTTPException:
        return None


class PermissionChecker:
    """Permission checker for resource-based access control"""
    
    def __init__(self, required_permissions: list):
        self.required_permissions = required_permissions
    
    def __call__(self, current_user: User = Depends(get_current_verified_user)):
        """Check if user has required permissions"""
        
        # Admin users have all permissions
        if current_user.user_type == UserType.ADMIN:
            return current_user
        
        # Check specific permissions based on user type and requirements
        user_permissions = self._get_user_permissions(current_user)
        
        for permission in self.required_permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
        
        return current_user
    
    def _get_user_permissions(self, user: User) -> list:
        """Get user permissions based on user type"""
        
        base_permissions = ["read_profile", "update_profile"]
        
        if user.user_type == UserType.SELLER:
            return base_permissions + [
                "create_listing",
                "update_listing",
                "delete_listing",
                "view_connections",
                "respond_connections",
                "send_messages",
                "view_analytics"
            ]
        
        elif user.user_type == UserType.BUYER:
            return base_permissions + [
                "view_listings",
                "create_connection",
                "send_messages",
                "save_listings"
            ]
        
        elif user.user_type == UserType.ADMIN:
            return ["*"]  # All permissions
        
        return base_permissions


# Common permission checkers
require_listing_management = PermissionChecker(["create_listing", "update_listing"])
require_connection_management = PermissionChecker(["view_connections", "respond_connections"])
require_messaging = PermissionChecker(["send_messages"])
require_analytics = PermissionChecker(["view_analytics"])
