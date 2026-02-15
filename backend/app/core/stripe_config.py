"""
Stripe configuration and constants
"""

import os
from typing import Dict
from .config import settings

# Stripe API Keys
STRIPE_PUBLISHABLE_KEY = "pk_test_51SNayKFzSZuyQKLYsDI32LWsXIjqe2vGmkkjSZw8gVXW2nIT1yPf168iWeS4Sb42VUaCLjNEytOuvvKPPulq2Gf400DIyDFmZF"
STRIPE_SECRET_KEY = "sk_test_51SNayKFzSZuyQKLY8UzIHbMNcTf3ZgpaJkpDt4LnDmGzS2EkRXBfe0SJajHbRY0KexddS9LzCCheUCCyZlRkfYsx00xY6bFt7c"

# Webhook endpoint secret (to be updated when webhook is created)
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Stripe Price IDs for subscription plans
STRIPE_PRICE_IDS: Dict[str, Dict[str, str]] = {
    "buyer_basic": {
        "monthly": "price_1SRC0xFzSZuyQKLYPpB66aaX",
        "yearly": "price_1SRC20FzSZuyQKLYbvngEl27"
    },
    "buyer_premium": {
        "monthly": "price_1SRC2KFzSZuyQKLYYvYGk1Kc", 
        "yearly": "price_1SRC2aFzSZuyQKLYDie8mDJs"
    },
    "seller_basic": {
        "monthly": "price_1SRC2tFzSZuyQKLYJVnrNC9h",
        "yearly": "price_1SRC3CFzSZuyQKLYoVEvv5qC"
    },
    "seller_premium": {
        "monthly": "price_1SRC3UFzSZuyQKLYKM5Q3ZfX",
        "yearly": "price_1SRC3kFzSZuyQKLYOXgqtULe"
    }
}

# Stripe Product IDs
STRIPE_PRODUCT_IDS: Dict[str, str] = {
    "buyer_basic": "prod_TNxwiNOulQvZC4",
    "buyer_premium": "prod_TNxyhzNnBuDK0s", 
    "seller_basic": "prod_TNxy0RKPUeJEFX",
    "seller_premium": "prod_TNxzafdPtwrz0p"
}

# Success/Cancel URLs - use frontend URL from config
SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", f"{settings.FRONTEND_URL}/subscriptions/success")
CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", f"{settings.FRONTEND_URL}/subscriptions")

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
