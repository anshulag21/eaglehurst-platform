import stripe
import os
import json

# Use the specific key provided by the user
STRIPE_SECRET_KEY = "sk_test_51SNayKFzSZuyQKLY8UzIHbMNcTf3ZgpaJkpDt4LnDmGzS2EkRXBfe0SJajHbRY0KexddS9LzCCheUCCyZlRkfYsx00xY6bFt7c"
stripe.api_key = STRIPE_SECRET_KEY

PLANS = {
    "buyer_basic": {
        "name": "Buyer Basic",
        "description": "Connect with medical practice sellers",
        "monthly_price": 3900,  # 39 GBP in cents
        "yearly_price": 39000   # 390 GBP in cents
    },
    "buyer_premium": {
        "name": "Buyer Premium",
        "description": "Premium access to connect with sellers",
        "monthly_price": 7900,
        "yearly_price": 79000
    },
    "seller_basic": {
        "name": "Seller Basic",
        "description": "List your medical practice for sale",
        "monthly_price": 9900,
        "yearly_price": 99000
    },
    "seller_premium": {
        "name": "Seller Premium",
        "description": "Premium listing features for your practice",
        "monthly_price": 19900,
        "yearly_price": 199000
    }
}

def generate_products():
    new_config = {
        "STRIPE_PRICE_IDS": {},
        "STRIPE_PRODUCT_IDS": {}
    }

    print("🚀 Generating Stripe Products and Prices...")

    for plan_key, plan_info in PLANS.items():
        print(f"\n📦 Creating product: {plan_info['name']}")
        
        # Create Product
        product = stripe.Product.create(
            name=plan_info['name'],
            description=plan_info['description'],
            metadata={"plan_id": plan_key}
        )
        new_config["STRIPE_PRODUCT_IDS"][plan_key] = product.id
        print(f"✅ Product Created: {product.id}")

        # Create Monthly Price
        monthly_price = stripe.Price.create(
            unit_amount=plan_info['monthly_price'],
            currency="gbp",
            recurring={"interval": "month"},
            product=product.id,
        )
        
        # Create Yearly Price
        yearly_price = stripe.Price.create(
            unit_amount=plan_info['yearly_price'],
            currency="gbp",
            recurring={"interval": "year"},
            product=product.id,
        )

        new_config["STRIPE_PRICE_IDS"][plan_key] = {
            "monthly": monthly_price.id,
            "yearly": yearly_price.id
        }
        print(f"💰 Prices Created: Monthly ({monthly_price.id}), Yearly ({yearly_price.id})")

    print("\n" + "="*50)
    print("🎉 SUCCESS! Copy the following into `backend/app/core/stripe_config.py`:")
    print("="*50)
    print("\nSTRIPE_PRICE_IDS = " + json.dumps(new_config["STRIPE_PRICE_IDS"], indent=4))
    print("\nSTRIPE_PRODUCT_IDS = " + json.dumps(new_config["STRIPE_PRODUCT_IDS"], indent=4))
    print("\n" + "="*50)

if __name__ == "__main__":
    generate_products()
