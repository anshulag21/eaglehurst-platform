"""
Stripe configuration and constants
"""

import os
from typing import Dict
from .config import settings

# Stripe API Keys
STRIPE_PUBLISHABLE_KEY = settings.STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY = settings.STRIPE_SECRET_KEY

# Webhook endpoint secret
STRIPE_WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET

# Stripe Price IDs for subscription plans
STRIPE_PRICE_IDS: Dict[str, Dict[str, str]] = {
    "buyer_basic": {
        "monthly": "price_1T1r95FzSZuyQKLYb0ceYU1v",
        "yearly": "price_1T1r95FzSZuyQKLYAlLlaIUt"
    },
    "buyer_premium": {
        "monthly": "price_1T1r96FzSZuyQKLYUUAMFl06",
        "yearly": "price_1T1r97FzSZuyQKLYBdSpqMUp"
    },
    "seller_basic": {
        "monthly": "price_1T1r98FzSZuyQKLYDsENVFaV",
        "yearly": "price_1T1r98FzSZuyQKLYCHhH9Rg3"
    },
    "seller_premium": {
        "monthly": "price_1T1r99FzSZuyQKLYCxCSWJjG",
        "yearly": "price_1T1r9AFzSZuyQKLYkZ7dznjo"
    }
}

# Stripe Product IDs
STRIPE_PRODUCT_IDS: Dict[str, str] = {
    "buyer_basic": "prod_TzqqvSGE0yOqdX",
    "buyer_premium": "prod_Tzqq9iG7iTq8A1",
    "seller_basic": "prod_TzqqjSqx0IdoZl",
    "seller_premium": "prod_Tzqq9wTUkD88ge"
}

# Success/Cancel URLs
SUCCESS_URL = settings.STRIPE_SUCCESS_URL or f"{settings.FRONTEND_URL}/subscriptions/success"
CANCEL_URL = settings.STRIPE_CANCEL_URL or f"{settings.FRONTEND_URL}/subscriptions"

# Webhook endpoint - use backend URL from config
WEBHOOK_ENDPOINT = os.getenv("STRIPE_WEBHOOK_URL", f"{settings.API_URL}/api/v1/stripe/webhooks/stripe")

# Subscription plan configurations
SUBSCRIPTION_PLANS = {
    "buyer_basic": {
        "name": "Buyer Basic",
        "description": "Connect with medical practice sellers",
        "features": {
            "connections_per_month": 10,
            "priority_support": False,
            "advanced_analytics": False
        }
    },
    "buyer_premium": {
        "name": "Buyer Premium", 
        "description": "Premium access to connect with sellers",
        "features": {
            "connections_per_month": -1,  # Unlimited
            "priority_support": True,
            "advanced_analytics": True
        }
    },
    "seller_basic": {
        "name": "Seller Basic",
        "description": "List your medical practice for sale", 
        "features": {
            "listings_limit": 2,
            "priority_support": False,
            "advanced_analytics": False,
            "featured_listings": False
        }
    },
    "seller_premium": {
        "name": "Seller Premium",
        "description": "Premium listing features for your practice",
        "features": {
            "listings_limit": -1,  # Unlimited
            "priority_support": True, 
            "advanced_analytics": True,
            "featured_listings": True
        }
    }
}
