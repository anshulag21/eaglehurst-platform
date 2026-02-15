"""
Dedicated Admin API router with proper prefix structure
"""

from fastapi import APIRouter

from .endpoints.admin import router as admin_router
from .endpoints.admin_analytics import router as admin_analytics_router

# Create dedicated admin API router
admin_api_router = APIRouter()

# Include admin management endpoints
admin_api_router.include_router(
    admin_router, 
    prefix="", 
    tags=["Admin Management"]
)

# Include admin-specific analytics endpoints
admin_api_router.include_router(
    admin_analytics_router, 
    prefix="/analytics", 
    tags=["Admin Analytics"]
)
