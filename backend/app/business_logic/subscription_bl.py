"""
Subscription management business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from ..dao.base_dao import BaseDAO
from ..models.user_models import User, Buyer
from ..models.subscription_models import (
    Subscription, UserSubscription, Payment, SubscriptionUsage
)
from ..schemas.subscription_schemas import SubscriptionPurchase, PaymentMethodCreate
from ..core.constants import (
    SubscriptionTier, SubscriptionStatus, PaymentStatus, BillingPeriod
)
import logging

logger = logging.getLogger(__name__)


class SubscriptionBusinessLogic:
    def __init__(self, db: Session):
        self.db = db
        self.base_dao = BaseDAO(db)

    async def get_subscription_plans(self) -> Dict[str, Any]:
        """Get all available subscription plans"""
        try:
            subscriptions = self.db.query(Subscription).filter(
                Subscription.is_active == True
            ).all()

            plans = []
            for sub in subscriptions:
                plan_data = {
                    "id": sub.id,
                    "tier": sub.tier,
                    "name": sub.name,
                    "description": sub.description,
                    "monthly_price": sub.monthly_price,
                    "yearly_price": sub.yearly_price,
                    "connections_limit": sub.connection_limit_monthly,
                    "features": sub.features,
                    "is_popular": sub.tier == SubscriptionTier.GOLD,  # Mark Gold as popular
                    "savings_yearly": round((sub.monthly_price * 12 - sub.yearly_price), 2) if sub.yearly_price else 0
                }
                plans.append(plan_data)

            # Sort by tier order (Silver, Gold, Platinum)
            tier_order = {
                SubscriptionTier.SILVER: 1,
                SubscriptionTier.GOLD: 2,
                SubscriptionTier.PLATINUM: 3
            }
            plans.sort(key=lambda x: tier_order.get(x["tier"], 999))

            return {"plans": plans}

        except Exception as e:
            logger.error(f"Error getting subscription plans: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve subscription plans"
            )

    async def get_current_subscription(self, buyer_user: User) -> Dict[str, Any]:
        """Get current user's subscription details"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer profile not found"
                )

            if not buyer_profile.subscription_id:
                return {
                    "has_subscription": False,
                    "message": "No active subscription"
                }

            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not user_subscription:
                return {
                    "has_subscription": False,
                    "message": "Subscription not found"
                }

            # Get usage statistics
            usage_stats = await self._get_usage_statistics(user_subscription.id)

            subscription_data = {
                "has_subscription": True,
                "id": user_subscription.id,
                "tier": user_subscription.subscription.tier,
                "name": user_subscription.subscription.name,
                "status": user_subscription.status,
                "billing_period": user_subscription.billing_period,
                "current_period_start": user_subscription.current_period_start,
                "current_period_end": user_subscription.current_period_end,
                "auto_renew": user_subscription.auto_renew,
                "connections_limit": user_subscription.subscription.connection_limit_monthly,
                "connections_used": user_subscription.connections_used_current_month,
                "connections_remaining": user_subscription.subscription.connection_limit_monthly - user_subscription.connections_used_current_month,
                "features": user_subscription.subscription.features,
                "usage_statistics": usage_stats,
                "next_billing_date": user_subscription.current_period_end if user_subscription.auto_renew else None,
                "amount": user_subscription.amount,
                "currency": user_subscription.currency
            }

            return subscription_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting current subscription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve current subscription"
            )

    async def purchase_subscription(
        self, buyer_user: User, subscription_data: SubscriptionPurchase
    ) -> Dict[str, Any]:
        """Purchase a new subscription"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer profile not found"
                )

            # Check if user already has an active subscription
            if buyer_profile.subscription_id:
                existing_subscription = self.db.query(UserSubscription).filter(
                    UserSubscription.id == buyer_profile.subscription_id
                ).first()
                
                if existing_subscription and existing_subscription.is_effectively_active():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="User already has an active subscription. Use upgrade endpoint instead."
                    )

            # Get subscription plan
            subscription_plan = self.db.query(Subscription).filter(
                Subscription.id == subscription_data.subscription_id
            ).first()

            if not subscription_plan or not subscription_plan.is_active:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription plan not found"
                )

            # Calculate amount based on billing period
            if subscription_data.billing_period == BillingPeriod.MONTHLY:
                amount = subscription_plan.monthly_price
            else:
                amount = subscription_plan.yearly_price

            if not amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid billing period for this subscription"
                )

            # Calculate period dates
            start_date = datetime.utcnow()
            if subscription_data.billing_period == BillingPeriod.MONTHLY:
                end_date = start_date + timedelta(days=30)
            else:
                end_date = start_date + timedelta(days=365)

            # Create user subscription
            user_subscription = UserSubscription(
                user_id=buyer_user.id,
                subscription_id=subscription_data.subscription_id,
                status=SubscriptionStatus.ACTIVE,  # In real app, would be PENDING until payment
                billing_cycle=subscription_data.billing_period,
                start_date=start_date,
                end_date=end_date,
                amount_paid=amount,
                currency="GBP",
                current_period_start=start_date,
                current_period_end=end_date,
                auto_renew=True,
                connections_used_current_month=0,
                listings_used=0,
                usage_reset_date=start_date + timedelta(days=30),
                stripe_subscription_id=f"sub_mock_{uuid4()}"  # Mock Stripe ID
            )

            self.db.add(user_subscription)
            self.db.flush()

            # Create payment record
            payment = Payment(
                user_subscription_id=user_subscription.id,
                amount=amount,
                currency="GBP",
                payment_method="card",  # Mock payment method
                stripe_payment_intent_id=f"pi_mock_{uuid4()}",  # Mock Stripe ID
                status=PaymentStatus.SUCCEEDED,  # Mock successful payment
                payment_date=start_date
            )

            self.db.add(payment)

            # Update buyer profile
            buyer_profile.subscription_id = user_subscription.id

            self.db.commit()
            self.db.refresh(user_subscription)

            return {
                "subscription_id": user_subscription.id,
                "tier": subscription_plan.tier,
                "status": user_subscription.status,
                "amount": amount,
                "currency": "GBP",
                "billing_period": subscription_data.billing_period,
                "current_period_end": end_date,
                "connections_limit": subscription_plan.connection_limit_monthly,
                "payment_id": payment.id
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error purchasing subscription: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to purchase subscription"
            )

    async def upgrade_subscription(
        self, buyer_user: User, subscription_data: SubscriptionPurchase
    ) -> Dict[str, Any]:
        """Upgrade current subscription to a higher tier"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile or not buyer_profile.subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active subscription to upgrade"
                )

            current_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not current_subscription:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Current subscription not found"
                )

            # Get new subscription plan
            new_plan = self.db.query(Subscription).filter(
                Subscription.id == subscription_data.subscription_id
            ).first()

            if not new_plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="New subscription plan not found"
                )

            # Validate upgrade (can't downgrade)
            tier_hierarchy = {
                SubscriptionTier.SILVER: 1,
                SubscriptionTier.GOLD: 2,
                SubscriptionTier.PLATINUM: 3
            }

            current_tier_level = tier_hierarchy.get(current_subscription.subscription.tier, 0)
            new_tier_level = tier_hierarchy.get(new_plan.tier, 0)

            if new_tier_level <= current_tier_level:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only upgrade to a higher tier"
                )

            # Calculate prorated amount (simplified - in real app would be more complex)
            if subscription_data.billing_period == BillingPeriod.MONTHLY:
                new_amount = new_plan.monthly_price
            else:
                new_amount = new_plan.yearly_price

            # Update subscription
            current_subscription.subscription_id = subscription_data.subscription_id
            current_subscription.billing_period = subscription_data.billing_period
            current_subscription.amount = new_amount

            # Create payment record for upgrade
            payment = Payment(
                user_subscription_id=current_subscription.id,
                amount=new_amount,
                currency="GBP",
                payment_method="card",
                stripe_payment_intent_id=f"pi_upgrade_{uuid4()}",
                status=PaymentStatus.SUCCEEDED,
                payment_date=datetime.utcnow()
            )

            self.db.add(payment)
            self.db.commit()
            self.db.refresh(current_subscription)

            return {
                "subscription_id": current_subscription.id,
                "new_tier": new_plan.tier,
                "status": current_subscription.status,
                "amount": new_amount,
                "billing_period": subscription_data.billing_period,
                "connections_limit": new_plan.connection_limit_monthly,
                "upgrade_date": datetime.utcnow()
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error upgrading subscription: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upgrade subscription"
            )

    async def cancel_subscription(self, buyer_user: User) -> Dict[str, Any]:
        """Cancel current subscription"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile or not buyer_profile.subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active subscription to cancel"
                )

            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not user_subscription:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription not found"
                )

            # Cancel at end of period
            user_subscription.auto_renew = False
            user_subscription.status = SubscriptionStatus.CANCELLED

            self.db.commit()

            return {
                "subscription_id": user_subscription.id,
                "status": user_subscription.status,
                "cancelled_at": datetime.utcnow(),
                "access_until": user_subscription.current_period_end,
                "message": "Subscription will remain active until the end of the current billing period"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling subscription: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription"
            )

    async def reactivate_subscription(self, buyer_user: User) -> Dict[str, Any]:
        """Reactivate a cancelled subscription"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile or not buyer_profile.subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No subscription to reactivate"
                )

            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not user_subscription:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription not found"
                )

            if user_subscription.status != SubscriptionStatus.CANCELLED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Subscription is not cancelled"
                )

            # Check if still within current period
            if datetime.utcnow() > user_subscription.current_period_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Subscription period has expired. Please purchase a new subscription."
                )

            # Reactivate
            user_subscription.status = SubscriptionStatus.ACTIVE
            user_subscription.auto_renew = True

            self.db.commit()

            return {
                "subscription_id": user_subscription.id,
                "status": user_subscription.status,
                "reactivated_at": datetime.utcnow(),
                "current_period_end": user_subscription.current_period_end
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error reactivating subscription: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reactivate subscription"
            )

    async def get_subscription_usage(self, buyer_user: User) -> Dict[str, Any]:
        """Get subscription usage statistics"""
        try:
            buyer_profile = buyer_user.buyer_profile
            if not buyer_profile or not buyer_profile.subscription_id:
                return {"has_subscription": False}

            user_subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not user_subscription:
                return {"has_subscription": False}

            usage_stats = await self._get_usage_statistics(user_subscription.id)

            return {
                "has_subscription": True,
                "subscription_id": user_subscription.id,
                "tier": user_subscription.subscription.tier,
                "connections_used": user_subscription.connections_used_current_month,
                "connections_limit": user_subscription.subscription.connection_limit_monthly,
                "connections_remaining": user_subscription.subscription.connection_limit_monthly - user_subscription.connections_used_current_month,
                "current_period_start": user_subscription.current_period_start,
                "current_period_end": user_subscription.current_period_end,
                "usage_statistics": usage_stats
            }

        except Exception as e:
            logger.error(f"Error getting subscription usage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve subscription usage"
            )

    async def get_subscription_history(
        self, buyer_user: User, page: int, limit: int
    ) -> Dict[str, Any]:
        """Get subscription history"""
        try:
            offset = (page - 1) * limit

            # Get all user subscriptions
            query = self.db.query(UserSubscription).filter(
                UserSubscription.user_id == buyer_user.id
            )

            total = query.count()
            subscriptions = query.order_by(desc(UserSubscription.created_at)).offset(offset).limit(limit).all()

            subscription_list = []
            for sub in subscriptions:
                subscription_data = {
                    "id": sub.id,
                    "tier": sub.subscription.tier,
                    "name": sub.subscription.name,
                    "status": sub.status,
                    "billing_period": sub.billing_cycle,
                    "amount": sub.amount_paid,
                    "currency": sub.currency,
                    "current_period_start": sub.current_period_start,
                    "current_period_end": sub.current_period_end,
                    "created_at": sub.created_at,
                    "connections_used": sub.connections_used_current_month,
                    "connections_limit": sub.subscription.connection_limit_monthly
                }
                subscription_list.append(subscription_data)

            return {
                "subscriptions": subscription_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting subscription history: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve subscription history"
            )

    async def get_payment_history(
        self, buyer_user: User, page: int, limit: int
    ) -> Dict[str, Any]:
        """Get payment history"""
        try:
            offset = (page - 1) * limit

            # Get all payments for user's subscriptions
            query = self.db.query(Payment).join(UserSubscription).filter(
                UserSubscription.user_id == buyer_user.id
            )

            total = query.count()
            payments = query.order_by(desc(Payment.payment_date)).offset(offset).limit(limit).all()

            payment_list = []
            for payment in payments:
                payment_data = {
                    "id": payment.id,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "payment_date": payment.payment_date,
                    "subscription_tier": payment.user_subscription.subscription.tier,
                    "billing_period": payment.user_subscription.billing_period,
                    "stripe_invoice_id": payment.stripe_invoice_id
                }
                payment_list.append(payment_data)

            return {
                "payments": payment_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting payment history: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve payment history"
            )

    async def add_payment_method(
        self, buyer_user: User, payment_method_data: PaymentMethodCreate
    ) -> Dict[str, Any]:
        """Add a new payment method (mock implementation)"""
        try:
            # In a real implementation, this would integrate with Stripe
            # For now, we'll just return a mock response
            
            return {
                "payment_method_id": f"pm_mock_{uuid4()}",
                "type": "card",
                "last4": "4242",
                "brand": "visa",
                "is_default": payment_method_data.is_default,
                "created_at": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error adding payment method: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add payment method"
            )

    async def get_payment_methods(self, buyer_user: User) -> Dict[str, Any]:
        """Get user's payment methods (mock implementation)"""
        try:
            # Mock payment methods
            return {
                "payment_methods": [
                    {
                        "id": "pm_mock_1",
                        "type": "card",
                        "last4": "4242",
                        "brand": "visa",
                        "exp_month": 12,
                        "exp_year": 2025,
                        "is_default": True
                    }
                ]
            }

        except Exception as e:
            logger.error(f"Error getting payment methods: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve payment methods"
            )

    async def remove_payment_method(
        self, buyer_user: User, payment_method_id: UUID
    ) -> Dict[str, Any]:
        """Remove a payment method (mock implementation)"""
        try:
            return {
                "payment_method_id": payment_method_id,
                "removed_at": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error removing payment method: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove payment method"
            )

    async def _get_usage_statistics(self, subscription_id: UUID) -> Dict[str, Any]:
        """Get detailed usage statistics for a subscription"""
        try:
            # Get usage records
            usage_records = self.db.query(SubscriptionUsage).filter(
                SubscriptionUsage.user_subscription_id == subscription_id
            ).all()

            # Aggregate usage by type
            usage_by_type = {}
            for usage in usage_records:
                if usage.usage_type not in usage_by_type:
                    usage_by_type[usage.usage_type] = 0
                usage_by_type[usage.usage_type] += usage.usage_count or 1

            return {
                "total_usage_records": len(usage_records),
                "usage_by_type": usage_by_type,
                "last_usage_date": max([u.usage_date for u in usage_records]) if usage_records else None
            }

        except Exception as e:
            logger.error(f"Error getting usage statistics: {e}")
            return {"error": "Failed to get usage statistics"}
