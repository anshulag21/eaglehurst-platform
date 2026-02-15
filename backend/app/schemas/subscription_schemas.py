"""
Subscription and payment related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from ..core.constants import SubscriptionStatus, SubscriptionTier


# Subscription Plan Schemas
class SubscriptionPlanSchema(BaseModel):
    """Schema for subscription plan information"""
    id: UUID = Field(..., description="Subscription plan ID")
    name: str = Field(..., description="Plan name (Silver, Gold, Platinum)")
    tier: SubscriptionTier = Field(..., description="Plan tier")
    description: Optional[str] = Field(None, description="Plan description")
    price_monthly: Decimal = Field(..., description="Monthly price")
    price_yearly: Optional[Decimal] = Field(None, description="Yearly price")
    currency: str = Field(..., description="Currency code")
    
    # Plan Features
    connection_limit_monthly: int = Field(..., description="Monthly connection limit")
    listing_limit: int = Field(..., description="Total listing limit")
    priority_support: bool = Field(..., description="Priority support included")
    advanced_analytics: bool = Field(..., description="Advanced analytics included")
    featured_listings: bool = Field(..., description="Featured listings included")
    
    # Additional features
    features: Optional[Dict[str, Any]] = Field(None, description="Additional features")
    
    # Stripe integration
    stripe_price_id_monthly: Optional[str] = Field(None, description="Stripe monthly price ID")
    stripe_price_id_yearly: Optional[str] = Field(None, description="Stripe yearly price ID")
    
    # Plan settings
    is_active: bool = Field(..., description="Whether plan is active")
    display_order: int = Field(..., description="Display order")
    
    class Config:
        from_attributes = True


class SubscriptionPlansResponse(BaseModel):
    """Schema for subscription plans list response"""
    plans: List[SubscriptionPlanSchema] = Field(..., description="Available subscription plans")
    current_plan: Optional[SubscriptionPlanSchema] = Field(None, description="User's current plan")


# User Subscription Schemas
class SubscriptionCreateRequest(BaseModel):
    """Schema for creating a new subscription"""
    plan_id: UUID = Field(..., description="Subscription plan ID")
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$", description="Billing cycle")
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    promo_code: Optional[str] = Field(None, description="Promotional code")


class UserSubscriptionSchema(BaseModel):
    """Schema for user subscription information"""
    id: UUID = Field(..., description="User subscription ID")
    user_id: UUID = Field(..., description="User ID")
    subscription_id: UUID = Field(..., description="Subscription plan ID")
    status: SubscriptionStatus = Field(..., description="Subscription status")
    billing_cycle: str = Field(..., description="Billing cycle")
    
    # Subscription dates
    start_date: datetime = Field(..., description="Subscription start date")
    end_date: datetime = Field(..., description="Subscription end date")
    trial_end_date: Optional[datetime] = Field(None, description="Trial end date")
    cancelled_at: Optional[datetime] = Field(None, description="Cancellation date")
    
    # Usage tracking
    connections_used_current_month: int = Field(..., description="Connections used this month")
    listings_used: int = Field(..., description="Listings used")
    usage_reset_date: datetime = Field(..., description="Usage reset date")
    
    # Payment information
    amount_paid: Decimal = Field(..., description="Amount paid")
    currency: str = Field(..., description="Currency")
    
    # Stripe integration
    stripe_subscription_id: Optional[str] = Field(None, description="Stripe subscription ID")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    
    # Plan information
    plan: SubscriptionPlanSchema = Field(..., description="Subscription plan details")
    
    # Usage limits
    remaining_connections: int = Field(..., description="Remaining connections this month")
    remaining_listings: int = Field(..., description="Remaining listings")
    
    class Config:
        from_attributes = True


class SubscriptionUpdateRequest(BaseModel):
    """Schema for updating subscription"""
    plan_id: Optional[UUID] = Field(None, description="New subscription plan ID")
    billing_cycle: Optional[str] = Field(None, pattern="^(monthly|yearly)$", description="New billing cycle")


class SubscriptionCancelRequest(BaseModel):
    """Schema for cancelling subscription"""
    reason: Optional[str] = Field(None, description="Cancellation reason")
    cancel_immediately: bool = Field(False, description="Cancel immediately or at period end")


# Payment Schemas
class PaymentMethodSchema(BaseModel):
    """Schema for payment method information"""
    id: str = Field(..., description="Payment method ID")
    type: str = Field(..., description="Payment method type")
    card_brand: Optional[str] = Field(None, description="Card brand")
    card_last4: Optional[str] = Field(None, description="Last 4 digits of card")
    card_exp_month: Optional[int] = Field(None, description="Card expiration month")
    card_exp_year: Optional[int] = Field(None, description="Card expiration year")
    is_default: bool = Field(..., description="Whether this is the default payment method")


class PaymentSchema(BaseModel):
    """Schema for payment information"""
    id: UUID = Field(..., description="Payment ID")
    user_subscription_id: UUID = Field(..., description="User subscription ID")
    amount: Decimal = Field(..., description="Payment amount")
    currency: str = Field(..., description="Currency")
    payment_method: str = Field(..., description="Payment method")
    status: str = Field(..., description="Payment status")
    failure_reason: Optional[str] = Field(None, description="Failure reason if failed")
    payment_date: datetime = Field(..., description="Payment date")
    
    # Stripe integration
    stripe_payment_intent_id: Optional[str] = Field(None, description="Stripe payment intent ID")
    stripe_invoice_id: Optional[str] = Field(None, description="Stripe invoice ID")
    
    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    """Schema for payment history response"""
    payments: List[PaymentSchema] = Field(..., description="Payment history")
    total_paid: Decimal = Field(..., description="Total amount paid")
    next_payment_date: Optional[datetime] = Field(None, description="Next payment date")
    next_payment_amount: Optional[Decimal] = Field(None, description="Next payment amount")


# Usage Tracking Schemas
class UsageTrackingSchema(BaseModel):
    """Schema for usage tracking information"""
    subscription_id: UUID = Field(..., description="Subscription ID")
    current_period_start: datetime = Field(..., description="Current billing period start")
    current_period_end: datetime = Field(..., description="Current billing period end")
    
    # Connection usage
    connections_limit: int = Field(..., description="Monthly connection limit")
    connections_used: int = Field(..., description="Connections used this month")
    connections_remaining: int = Field(..., description="Remaining connections")
    
    # Listing usage
    listings_limit: int = Field(..., description="Total listing limit")
    listings_used: int = Field(..., description="Listings currently used")
    listings_remaining: int = Field(..., description="Remaining listings")
    
    # Usage history
    daily_usage: List[Dict[str, Any]] = Field(..., description="Daily usage breakdown")
    monthly_usage: List[Dict[str, Any]] = Field(..., description="Monthly usage history")


class UsageRecordRequest(BaseModel):
    """Schema for recording usage"""
    usage_type: str = Field(..., description="Type of usage (connection, listing)")
    usage_count: int = Field(1, ge=1, description="Usage count")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional usage metadata")


# Billing and Invoice Schemas
class InvoiceSchema(BaseModel):
    """Schema for invoice information"""
    id: str = Field(..., description="Invoice ID")
    subscription_id: UUID = Field(..., description="Subscription ID")
    amount_due: Decimal = Field(..., description="Amount due")
    amount_paid: Decimal = Field(..., description="Amount paid")
    currency: str = Field(..., description="Currency")
    status: str = Field(..., description="Invoice status")
    
    # Invoice dates
    created_date: datetime = Field(..., description="Invoice creation date")
    due_date: datetime = Field(..., description="Invoice due date")
    paid_date: Optional[datetime] = Field(None, description="Payment date")
    
    # Invoice details
    description: str = Field(..., description="Invoice description")
    invoice_url: Optional[str] = Field(None, description="Invoice PDF URL")
    
    # Stripe integration
    stripe_invoice_id: str = Field(..., description="Stripe invoice ID")


class BillingHistoryResponse(BaseModel):
    """Schema for billing history response"""
    invoices: List[InvoiceSchema] = Field(..., description="Invoice history")
    upcoming_invoice: Optional[InvoiceSchema] = Field(None, description="Upcoming invoice")
    total_spent: Decimal = Field(..., description="Total amount spent")


# Promo Code Schemas
class PromoCodeSchema(BaseModel):
    """Schema for promotional code information"""
    code: str = Field(..., description="Promo code")
    discount_type: str = Field(..., description="Discount type (percentage, fixed)")
    discount_value: Decimal = Field(..., description="Discount value")
    valid_until: Optional[datetime] = Field(None, description="Expiration date")
    max_uses: Optional[int] = Field(None, description="Maximum number of uses")
    current_uses: int = Field(..., description="Current number of uses")
    is_active: bool = Field(..., description="Whether code is active")


class PromoCodeValidationRequest(BaseModel):
    """Schema for promo code validation"""
    code: str = Field(..., description="Promo code to validate")
    plan_id: UUID = Field(..., description="Subscription plan ID")


class PromoCodeValidationResponse(BaseModel):
    """Schema for promo code validation response"""
    is_valid: bool = Field(..., description="Whether code is valid")
    discount_amount: Optional[Decimal] = Field(None, description="Discount amount")
    final_price: Optional[Decimal] = Field(None, description="Final price after discount")
    error_message: Optional[str] = Field(None, description="Error message if invalid")


# Subscription Analytics Schemas
class SubscriptionAnalytics(BaseModel):
    """Schema for subscription analytics"""
    total_subscribers: int = Field(..., description="Total number of subscribers")
    active_subscribers: int = Field(..., description="Active subscribers")
    trial_subscribers: int = Field(..., description="Trial subscribers")
    cancelled_subscribers: int = Field(..., description="Cancelled subscribers")
    
    # Revenue metrics
    monthly_recurring_revenue: Decimal = Field(..., description="Monthly recurring revenue")
    annual_recurring_revenue: Decimal = Field(..., description="Annual recurring revenue")
    average_revenue_per_user: Decimal = Field(..., description="Average revenue per user")
    
    # Plan distribution
    plan_distribution: Dict[str, int] = Field(..., description="Subscribers by plan")
    
    # Churn metrics
    churn_rate: Decimal = Field(..., description="Monthly churn rate")
    retention_rate: Decimal = Field(..., description="Monthly retention rate")
    
    # Growth metrics
    new_subscribers_this_month: int = Field(..., description="New subscribers this month")
    growth_rate: Decimal = Field(..., description="Monthly growth rate")


# Additional Schemas for API endpoints
class SubscriptionPurchase(BaseModel):
    """Schema for purchasing a subscription"""
    subscription_id: UUID = Field(..., description="Subscription plan ID")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")
    billing_period: str = Field("monthly", description="Billing period (monthly/yearly)")


class SubscriptionResponse(BaseModel):
    """Schema for subscription response"""
    id: UUID = Field(..., description="Subscription ID")
    tier: SubscriptionTier = Field(..., description="Subscription tier")
    status: SubscriptionStatus = Field(..., description="Subscription status")
    current_period_start: datetime = Field(..., description="Current period start")
    current_period_end: datetime = Field(..., description="Current period end")
    connections_used: int = Field(..., description="Connections used")
    connections_limit: int = Field(..., description="Connection limit")


class PaymentMethodCreate(BaseModel):
    """Schema for creating a payment method"""
    stripe_payment_method_id: str = Field(..., description="Stripe payment method ID")
    is_default: bool = Field(False, description="Set as default payment method")
