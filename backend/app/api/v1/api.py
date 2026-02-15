"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter

from .endpoints import (
    auth,
    users,
    listings,
    connections,
    subscriptions,
    services,
    notifications,
    analytics,
    blocking,
    stripe_endpoints
)
from .admin_api import admin_api_router

api_router = APIRouter()

# Include all endpoint routers
# Public API endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(listings.router, prefix="/listings", tags=["Listings"])
api_router.include_router(connections.router, prefix="/connections", tags=["Connections"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(stripe_endpoints.router, prefix="/stripe", tags=["Stripe Payments"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(blocking.router, prefix="/blocking", tags=["Blocking"])

# User analytics endpoints (non-admin)
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Dedicated admin endpoints with proper prefix
api_router.include_router(admin_api_router, prefix="/admin", tags=["Admin"])
