#!/usr/bin/env python3
"""
Stripe Webhook Setup Utility

This script helps set up Stripe webhooks for both development and production environments.
"""

import os
import sys
import stripe
from typing import List, Dict, Any

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.config import settings
from app.core.stripe_config import STRIPE_SECRET_KEY, WEBHOOK_ENDPOINT

# Configure Stripe
stripe.api_key = STRIPE_SECRET_KEY

def create_webhook_endpoint(url: str, events: List[str]) -> Dict[str, Any]:
    """
    Create a new webhook endpoint in Stripe
    
    Args:
        url: The webhook endpoint URL
        events: List of events to listen for
        
    Returns:
        Dictionary containing webhook endpoint details
    """
    try:
        webhook_endpoint = stripe.WebhookEndpoint.create(
            url=url,
            enabled_events=events,
            description=f"CareAcquire Platform Webhook - {url}"
        )
        
        return {
            "success": True,
            "webhook_id": webhook_endpoint.id,
            "webhook_secret": webhook_endpoint.secret,
            "url": webhook_endpoint.url,
            "events": webhook_endpoint.enabled_events
        }
        
    except stripe.error.StripeError as e:
        return {
            "success": False,
            "error": str(e)
        }

def list_webhook_endpoints() -> List[Dict[str, Any]]:
    """List all existing webhook endpoints"""
    try:
        webhooks = stripe.WebhookEndpoint.list()
        return [
            {
                "id": webhook.id,
                "url": webhook.url,
                "status": webhook.status,
                "events": webhook.enabled_events,
                "created": webhook.created
            }
            for webhook in webhooks.data
        ]
    except stripe.error.StripeError as e:
        print(f"Error listing webhooks: {e}")
        return []

def delete_webhook_endpoint(webhook_id: str) -> bool:
    """Delete a webhook endpoint"""
    try:
        stripe.WebhookEndpoint.delete(webhook_id)
        return True
    except stripe.error.StripeError as e:
        print(f"Error deleting webhook {webhook_id}: {e}")
        return False

def main():
    """Main function to set up webhooks"""
    print("🔧 Stripe Webhook Setup Utility")
    print("=" * 50)
    
    # Required events for subscription management
    required_events = [
        "customer.subscription.created",
        "customer.subscription.updated", 
        "customer.subscription.deleted",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
        "checkout.session.completed"
    ]
    
    print(f"Current webhook URL: {WEBHOOK_ENDPOINT}")
    print(f"Environment: {'Development' if 'localhost' in WEBHOOK_ENDPOINT else 'Production'}")
    print()
    
    # List existing webhooks
    print("📋 Existing Webhook Endpoints:")
    existing_webhooks = list_webhook_endpoints()
    
    if not existing_webhooks:
        print("  No existing webhooks found.")
    else:
        for i, webhook in enumerate(existing_webhooks, 1):
            print(f"  {i}. ID: {webhook['id']}")
            print(f"     URL: {webhook['url']}")
            print(f"     Status: {webhook['status']}")
            print(f"     Events: {len(webhook['events'])} events")
            print()
    
    # Ask user what to do
    print("🚀 What would you like to do?")
    print("1. Create new webhook endpoint")
    print("2. List all webhook endpoints")
    print("3. Delete existing webhook endpoint")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        # Create new webhook
        print(f"\n🔨 Creating webhook endpoint: {WEBHOOK_ENDPOINT}")
        result = create_webhook_endpoint(WEBHOOK_ENDPOINT, required_events)
        
        if result["success"]:
            print("✅ Webhook endpoint created successfully!")
            print(f"   Webhook ID: {result['webhook_id']}")
            print(f"   Webhook Secret: {result['webhook_secret']}")
            print(f"   URL: {result['url']}")
            print(f"   Events: {len(result['events'])} events configured")
            print()
            print("🔑 IMPORTANT: Add this to your environment variables:")
            print(f"   STRIPE_WEBHOOK_SECRET={result['webhook_secret']}")
            print()
            print("📝 For development, you can also use Stripe CLI:")
            print("   stripe listen --forward-to localhost:8000/api/v1/stripe/webhooks/stripe")
        else:
            print(f"❌ Failed to create webhook: {result['error']}")
    
    elif choice == "2":
        # List webhooks (already done above)
        pass
    
    elif choice == "3":
        # Delete webhook
        if not existing_webhooks:
            print("❌ No webhooks to delete.")
            return
            
        print("\n🗑️  Select webhook to delete:")
        for i, webhook in enumerate(existing_webhooks, 1):
            print(f"  {i}. {webhook['url']} (ID: {webhook['id']})")
        
        try:
            selection = int(input("\nEnter webhook number to delete: ")) - 1
            if 0 <= selection < len(existing_webhooks):
                webhook_to_delete = existing_webhooks[selection]
                if delete_webhook_endpoint(webhook_to_delete['id']):
                    print(f"✅ Deleted webhook: {webhook_to_delete['url']}")
                else:
                    print("❌ Failed to delete webhook")
            else:
                print("❌ Invalid selection")
        except ValueError:
            print("❌ Invalid input")
    
    elif choice == "4":
        print("👋 Goodbye!")
    
    else:
        print("❌ Invalid choice")

if __name__ == "__main__":
    main()
