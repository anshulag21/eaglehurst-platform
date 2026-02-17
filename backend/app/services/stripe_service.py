"""
Stripe payment service for handling subscriptions
"""

import stripe
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from ..core.stripe_config import (
    STRIPE_SECRET_KEY, 
    STRIPE_PRICE_IDS, 
    SUCCESS_URL, 
    CANCEL_URL,
    SUBSCRIPTION_PLANS
)
from ..models.user_models import User
from ..models.subscription_models import UserSubscription, Subscription, Payment
from ..core.constants import SubscriptionStatus, PaymentStatus

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = STRIPE_SECRET_KEY


class StripeService:
    """Service for handling Stripe payments and subscriptions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_checkout_session(
        self, 
        user: User, 
        plan_id: str, 
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Create a Stripe checkout session for subscription
        
        Args:
            user: User object
            plan_id: Plan identifier (e.g., 'buyer_basic', 'seller_premium')
            billing_cycle: 'monthly' or 'yearly'
            
        Returns:
            Dictionary containing checkout session details
        """
        try:
            # Validate plan and billing cycle
            if plan_id not in STRIPE_PRICE_IDS:
                raise ValueError(f"Invalid plan ID: {plan_id}")
            
            if billing_cycle not in STRIPE_PRICE_IDS[plan_id]:
                raise ValueError(f"Invalid billing cycle: {billing_cycle}")
            
            price_id = STRIPE_PRICE_IDS[plan_id][billing_cycle]
            plan_config = SUBSCRIPTION_PLANS[plan_id]
            
            # Create or retrieve Stripe customer
            customer = await self._get_or_create_customer(user)
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=CANCEL_URL,
                metadata={
                    'user_id': str(user.id),
                    'plan_id': plan_id,
                    'billing_cycle': billing_cycle,
                    'user_type': user.user_type
                },
                subscription_data={
                    'metadata': {
                        'user_id': str(user.id),
                        'plan_id': plan_id,
                        'billing_cycle': billing_cycle
                    }
                }
            )
            
            logger.info(f"Created checkout session {session.id} for user {user.id}")
            
            return {
                'checkout_url': session.url,
                'session_id': session.id,
                'plan_name': plan_config['name'],
                'billing_cycle': billing_cycle
            }
            
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            raise
    
    async def _get_or_create_customer(self, user: User) -> stripe.Customer:
        """Get existing Stripe customer or create new one"""
        try:
            # Check if user already has a Stripe customer ID
            existing_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id,
                UserSubscription.stripe_customer_id.isnot(None)
            ).first()
            
            if existing_subscription and existing_subscription.stripe_customer_id:
                # Retrieve existing customer
                customer = stripe.Customer.retrieve(existing_subscription.stripe_customer_id)
                return customer
            
            # Create new customer
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                metadata={
                    'user_id': str(user.id),
                    'user_type': user.user_type
                }
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
            return customer
            
        except Exception as e:
            logger.error(f"Error getting/creating customer: {e}")
            raise
    
    async def handle_subscription_created(self, subscription) -> None:
        """Handle successful subscription creation from webhook"""
        logger.info(f"=== HANDLE SUBSCRIPTION CREATED START ===")
        
        # Simple approach - just create a basic subscription record
        try:
            # Handle both dict and Stripe object formats
            if isinstance(subscription, dict):
                subscription_id = str(subscription['id'])
                metadata = subscription.get('metadata', {})
                customer_id = str(subscription.get('customer', ''))
            else:
                subscription_id = str(subscription.id)
                metadata = subscription.metadata if hasattr(subscription, 'metadata') else {}
                customer_id = str(subscription.customer) if hasattr(subscription, 'customer') else ''
            
            logger.info(f"Processing subscription: {subscription_id}")
            
            # Get metadata safely
            user_id = metadata.get('user_id') if metadata else None
            plan_id = metadata.get('plan_id') if metadata else None
            billing_cycle = metadata.get('billing_cycle', 'monthly') if metadata else 'monthly'
            
            logger.info(f"User ID: {user_id}, Plan ID: {plan_id}")
            
            if not user_id or not plan_id:
                logger.error("Missing required metadata")
                return
            
            # Get user
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return
            
            # Check if subscription already exists
            existing_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == subscription_id
            ).first()
            
            if existing_subscription:
                logger.info(f"Subscription already exists, updating status")
                existing_subscription.status = SubscriptionStatus.ACTIVE
                self.db.commit()
                return
            
            # Get or create subscription plan
            subscription_plan = await self._get_or_create_subscription_plan(plan_id)
            logger.info(f"Got subscription plan: {subscription_plan.id}")
            
            # Use simple dates
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=30)  # Default to 30 days
            
            logger.info(f"Creating subscription record...")
            
            # Create user subscription record
            user_subscription = UserSubscription(
                user_id=user.id,
                subscription_id=subscription_plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=billing_cycle,
                start_date=start_date,
                end_date=end_date,
                stripe_subscription_id=subscription_id,
                stripe_customer_id=customer_id,
                amount_paid=0,
                connections_used_current_month=0,
                listings_used=0,
                usage_reset_date=start_date + timedelta(days=30)
            )
            
            self.db.add(user_subscription)
            
            # Update buyer profile if applicable
            if user.user_type == 'buyer' and user.buyer_profile:
                user.buyer_profile.subscription_id = user_subscription.id
            
            self.db.commit()
            logger.info(f"Successfully created subscription record")
            
        except Exception as e:
            logger.error(f"Error in handle_subscription_created: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.db.rollback()
            raise
    
    async def handle_subscription_updated(self, subscription) -> None:
        """Handle subscription updates from webhook"""
        try:
            # Handle both dict and Stripe object formats
            if isinstance(subscription, dict):
                subscription_id = str(subscription['id'])
                subscription_status = subscription.get('status', 'active')
                current_period_end = subscription.get('current_period_end')
                canceled_at = subscription.get('canceled_at')
            else:
                subscription_id = str(subscription.id)
                subscription_status = subscription.status
                current_period_end = subscription.current_period_end
                canceled_at = subscription.canceled_at
            
            # Find existing subscription
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == subscription_id
            ).first()
            
            if not user_subscription:
                logger.error(f"Subscription {subscription_id} not found in database")
                return
            
            # Update subscription details
            user_subscription.status = self._map_stripe_status(subscription_status)
            if current_period_end:
                user_subscription.end_date = datetime.fromtimestamp(current_period_end, timezone.utc)
            
            if canceled_at:
                user_subscription.cancelled_at = datetime.fromtimestamp(canceled_at, timezone.utc)
            
            self.db.commit()
            logger.info(f"Updated subscription {subscription_id}")
            
        except Exception as e:
            logger.error(f"Error handling subscription updated: {e}")
            self.db.rollback()
            raise
    
    async def handle_subscription_deleted(self, subscription) -> None:
        """Handle subscription cancellation from webhook"""
        try:
            # Handle both dict and Stripe object formats
            if isinstance(subscription, dict):
                subscription_id = str(subscription['id'])
            else:
                subscription_id = str(subscription.id)
            
            # Find existing subscription
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == subscription_id
            ).first()
            
            if not user_subscription:
                logger.error(f"Subscription {subscription_id} not found in database")
                return
            
            # Update subscription status
            user_subscription.status = SubscriptionStatus.CANCELLED
            user_subscription.cancelled_at = datetime.now(timezone.utc)
            
            # Remove subscription from buyer profile if applicable
            if user_subscription.user.user_type == 'buyer' and user_subscription.user.buyer_profile:
                user_subscription.user.buyer_profile.subscription_id = None
            
            self.db.commit()
            logger.info(f"Cancelled subscription {subscription.id}")
            
        except Exception as e:
            logger.error(f"Error handling subscription deleted: {e}")
            self.db.rollback()
            raise
    
    async def handle_invoice_payment_succeeded(self, invoice) -> None:
        """Handle successful invoice payment from webhook"""
        try:
            # Extract invoice data
            if isinstance(invoice, dict):
                subscription_id = str(invoice.get('subscription', ''))
                amount_paid = invoice.get('amount_paid', 0) / 100  # Convert from cents
                invoice_id = str(invoice['id'])
                payment_intent_id = str(invoice.get('payment_intent', ''))
                customer_id = str(invoice.get('customer', ''))
            else:
                subscription_id = str(invoice.subscription) if hasattr(invoice, 'subscription') else ''
                amount_paid = (invoice.amount_paid / 100) if hasattr(invoice, 'amount_paid') else 0
                invoice_id = str(invoice.id)
                payment_intent_id = str(invoice.payment_intent) if hasattr(invoice, 'payment_intent') else ''
                customer_id = str(invoice.customer) if hasattr(invoice, 'customer') else ''
            
            logger.info(f"Processing payment for subscription: {subscription_id}, amount: £{amount_paid}")
            
            # Find the user subscription
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == subscription_id
            ).first()
            
            if not user_subscription:
                logger.warning(f"No user subscription found for Stripe subscription: {subscription_id}")
                return
            
            # Create payment record
            payment = Payment(
                user_subscription_id=user_subscription.id,
                amount=amount_paid,
                currency="GBP",
                payment_method="stripe",
                stripe_payment_intent_id=payment_intent_id,
                stripe_invoice_id=invoice_id,
                status=PaymentStatus.SUCCEEDED,
                payment_date=datetime.now(timezone.utc)
            )
            
            self.db.add(payment)
            
            # Update subscription amount_paid if needed
            if user_subscription.amount_paid == 0:
                user_subscription.amount_paid = amount_paid
            
            self.db.commit()
            logger.info(f"Created payment record for £{amount_paid}")
            
        except Exception as e:
            logger.error(f"Error handling invoice payment succeeded: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.db.rollback()
            raise
    
    async def _get_or_create_subscription_plan(self, plan_id: str) -> Subscription:
        """Get or create subscription plan in database"""
        plan_config = SUBSCRIPTION_PLANS[plan_id]
        
        # Try to find existing plan
        existing_plan = self.db.query(Subscription).filter(
            Subscription.tier == plan_id
        ).first()
        
        if existing_plan:
            return existing_plan
        
        # Create new plan
        new_plan = Subscription(
            name=plan_config['name'],
            tier=plan_id,
            description=plan_config['description'],
            price_monthly=39 if 'basic' in plan_id else 79 if 'buyer' in plan_id else 99 if 'seller_basic' in plan_id else 199,
            connection_limit_monthly=plan_config['features'].get('connections_per_month', 0),
            listing_limit=plan_config['features'].get('listings_limit', 0),
            priority_support=plan_config['features'].get('priority_support', False),
            advanced_analytics=plan_config['features'].get('advanced_analytics', False),
            featured_listings=plan_config['features'].get('featured_listings', False)
        )
        
        self.db.add(new_plan)
        self.db.commit()
        self.db.refresh(new_plan)
        
        return new_plan
    
    def _map_stripe_status(self, stripe_status: str) -> str:
        """Map Stripe subscription status to our internal status"""
        status_mapping = {
            'active': SubscriptionStatus.ACTIVE,
            'canceled': SubscriptionStatus.CANCELLED,
            'incomplete': SubscriptionStatus.TRIAL,
            'incomplete_expired': SubscriptionStatus.EXPIRED,
            'past_due': SubscriptionStatus.EXPIRED,
            'unpaid': SubscriptionStatus.EXPIRED,
            'trialing': SubscriptionStatus.TRIAL
        }
        
        return status_mapping.get(stripe_status, SubscriptionStatus.EXPIRED)
    
    async def cancel_subscription(self, user: User) -> Dict[str, Any]:
        """Cancel user's active subscription"""
        try:
            # Find active subscription
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id,
                UserSubscription.status == SubscriptionStatus.ACTIVE
            ).first()
            
            if not user_subscription:
                raise ValueError("No active subscription found")
            
            if not user_subscription.stripe_subscription_id:
                raise ValueError("No Stripe subscription ID found")
            
            # Cancel in Stripe
            stripe.Subscription.delete(user_subscription.stripe_subscription_id)
            
            # Update local record
            user_subscription.status = SubscriptionStatus.CANCELLED
            user_subscription.cancelled_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            return {
                'success': True,
                'message': 'Subscription cancelled successfully'
            }
            
        except Exception as e:
            logger.error(f"Error cancelling subscription: {e}")
            self.db.rollback()
            raise
    
    async def get_user_subscription_details(self, user: User) -> Optional[Dict[str, Any]]:
        """Get detailed subscription information for a user"""
        try:
            # Find active or cancelled (but not expired) subscription
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id,
                UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED])
            ).order_by(UserSubscription.created_at.desc()).first()
            
            if not user_subscription:
                return None
            
            # Check if subscription is still valid based on end_date
            current_time = datetime.now(timezone.utc)
            is_expired = user_subscription.end_date and user_subscription.end_date < current_time
            
            # If subscription is expired, don't return it
            if is_expired:
                return None
            
            # Get subscription plan details
            subscription_plan = user_subscription.subscription
            
            # Get usage statistics
            usage_stats = await self._get_usage_statistics(user)
            
            # Get Stripe subscription details if available
            stripe_details = {}
            if user_subscription.stripe_subscription_id:
                try:
                    stripe_subscription = stripe.Subscription.retrieve(user_subscription.stripe_subscription_id)
                    stripe_details = {
                        'cancel_at_period_end': stripe_subscription.cancel_at_period_end,
                        'current_period_start': stripe_subscription.current_period_start,
                        'current_period_end': stripe_subscription.current_period_end,
                    }
                except Exception as e:
                    logger.warning(f"Could not retrieve Stripe subscription details: {e}")
            
            # Determine effective status for access control
            effective_status = 'active' if not is_expired else 'expired'
            
            return {
                'id': str(user_subscription.id),
                'plan_name': subscription_plan.name,
                'plan_type': subscription_plan.tier,
                'status': effective_status,  # Use effective status for access control
                'actual_status': user_subscription.status,  # Keep original status for display
                'billing_cycle': user_subscription.billing_cycle,
                'amount': user_subscription.amount_paid,
                'currency': 'GBP',  # Default currency
                'current_period_start': user_subscription.start_date.isoformat() if user_subscription.start_date else None,
                'current_period_end': user_subscription.end_date.isoformat() if user_subscription.end_date else None,
                'cancelled_at': user_subscription.cancelled_at.isoformat() if user_subscription.cancelled_at else None,
                'is_cancelled': user_subscription.status == SubscriptionStatus.CANCELLED,
                'cancel_at_period_end': stripe_details.get('cancel_at_period_end', user_subscription.status == SubscriptionStatus.CANCELLED),
                'stripe_subscription_id': user_subscription.stripe_subscription_id,
                'features': {
                    'connections_limit': subscription_plan.connection_limit_monthly,
                    'listings_limit': subscription_plan.listing_limit,
                    'priority_support': subscription_plan.priority_support,
                    'advanced_analytics': subscription_plan.advanced_analytics,
                    'featured_listings': subscription_plan.featured_listings,
                },
                'usage': usage_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription details: {e}")
            raise
    
    async def _get_usage_statistics(self, user: User) -> Dict[str, int]:
        """Get current usage statistics for the user"""
        try:
            # This would typically query your connections and listings tables
            # For now, returning mock data - you should implement actual queries
            
            # Get connections count for current period
            connections_used = 0
            listings_used = 0
            
            # If user is a buyer, count connections made
            if user.user_type == 'buyer':
                # Query connections table for current billing period
                # connections_used = self.db.query(Connection).filter(...).count()
                connections_used = 0  # Placeholder
            
            # If user is a seller, count active listings
            if user.user_type == 'seller':
                # Query listings table for active listings
                # listings_used = self.db.query(Listing).filter(...).count()
                listings_used = 0  # Placeholder
            
            return {
                'connections_used': connections_used,
                'listings_used': listings_used
            }
            
        except Exception as e:
            logger.error(f"Error getting usage statistics: {e}")
            return {'connections_used': 0, 'listings_used': 0}
    
    async def get_payment_history(self, user: User) -> list[Dict[str, Any]]:
        """Get payment history for a user from Stripe"""
        try:
            # Find user's Stripe customer ID
            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id,
                UserSubscription.stripe_customer_id.isnot(None)
            ).first()
            
            if not user_subscription or not user_subscription.stripe_customer_id:
                return []
            
            # Get payment history from Stripe
            charges = stripe.Charge.list(
                customer=user_subscription.stripe_customer_id,
                limit=50  # Limit to last 50 payments
            )
            
            payment_history = []
            for charge in charges.data:
                payment_history.append({
                    'id': charge.id,
                    'amount': charge.amount / 100,  # Convert from cents
                    'currency': charge.currency.upper(),
                    'status': charge.status,
                    'payment_date': datetime.fromtimestamp(charge.created, timezone.utc).isoformat(),
                    'description': charge.description or f"Payment for {charge.amount / 100} {charge.currency.upper()}",
                    'invoice_url': charge.receipt_url
                })
            
            return payment_history
            
        except Exception as e:
            logger.error(f"Error getting payment history: {e}")
            return []