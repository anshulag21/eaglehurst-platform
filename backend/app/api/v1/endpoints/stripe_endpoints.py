"""
Stripe payment endpoints
"""

import stripe
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ....core.database import get_db
from ....core.stripe_config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, WEBHOOK_ENDPOINT
from ....services.stripe_service import StripeService
from ....utils.dependencies import get_current_user
from ....models.user_models import User
from ....schemas.common_schemas import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Configure Stripe
stripe.api_key = STRIPE_SECRET_KEY


class CreateCheckoutSessionRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"


@router.get("/webhook-config", response_model=SuccessResponse)
async def get_webhook_config() -> Any:
    """
    Get current webhook configuration
    
    Returns webhook endpoint URL and configuration status
    """
    return SuccessResponse(
        success=True,
        message="Webhook configuration retrieved successfully",
        data={
            "webhook_url": WEBHOOK_ENDPOINT,
            "webhook_secret_configured": bool(STRIPE_WEBHOOK_SECRET),
            "environment": "development" if "localhost" in WEBHOOK_ENDPOINT else "production"
        }
    )


@router.post("/create-checkout-session", response_model=SuccessResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a Stripe checkout session for subscription
    
    - **plan_id**: Plan identifier (buyer_basic, buyer_premium, seller_basic, seller_premium)
    - **billing_cycle**: monthly or yearly
    """
    try:
        stripe_service = StripeService(db)
        
        # Validate plan matches user type
        user_type = current_user.user_type
        if user_type == 'buyer' and not request.plan_id.startswith('buyer_'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Buyers can only subscribe to buyer plans"
            )
        elif user_type == 'seller' and not request.plan_id.startswith('seller_'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sellers can only subscribe to seller plans"
            )
        
        # Create checkout session
        session_data = await stripe_service.create_checkout_session(
            user=current_user,
            plan_id=request.plan_id,
            billing_cycle=request.billing_cycle
        )
        
        return SuccessResponse(
            success=True,
            message="Checkout session created successfully",
            data=session_data
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Handle Stripe webhooks for subscription events
    """
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            logger.error("Missing Stripe signature header")
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook signature (skip in development if no webhook secret)
        if STRIPE_WEBHOOK_SECRET:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, STRIPE_WEBHOOK_SECRET
                )
            except ValueError as e:
                logger.error(f"Invalid payload: {e}")
                raise HTTPException(status_code=400, detail="Invalid payload")
            except stripe.error.SignatureVerificationError as e:
                logger.error(f"Invalid signature: {e}")
                raise HTTPException(status_code=400, detail="Invalid signature")
        else:
            # In development, parse event without signature verification
            import json
            event = json.loads(payload)
        
        stripe_service = StripeService(db)
        
        # Handle different event types
        if event['type'] == 'customer.subscription.created':
            subscription = event['data']['object']
            await stripe_service.handle_subscription_created(subscription)
            logger.info(f"Handled subscription created: {subscription['id']}")
            
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            await stripe_service.handle_subscription_updated(subscription)
            logger.info(f"Handled subscription updated: {subscription['id']}")
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            await stripe_service.handle_subscription_deleted(subscription)
            logger.info(f"Handled subscription deleted: {subscription['id']}")
            
        elif event['type'] == 'invoice.payment_succeeded':
            invoice = event['data']['object']
            await stripe_service.handle_invoice_payment_succeeded(invoice)
            logger.info(f"Payment succeeded for invoice: {invoice['id']}")
            
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            logger.warning(f"Payment failed for invoice: {invoice['id']}")
            # Handle failed payments (e.g., send notification)
            
        else:
            logger.info(f"Unhandled event type: {event['type']}")
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.post("/verify-session")
async def verify_stripe_session(
    session_id: str = Query(..., description="Stripe checkout session ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually verify and process a Stripe checkout session
    """
    try:
        logger.info(f"Verifying session {session_id} for user {current_user.id}")
        
        # Set Stripe API key
        stripe.api_key = STRIPE_SECRET_KEY
        
        # Retrieve the session from Stripe
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            logger.info(f"Retrieved session: {session.id}, status: {session.status}")
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Session not found: {e}")
            return {
                "success": False,
                "message": f"Session not found: {str(e)}",
                "data": {"session_id": session_id}
            }
        
        # Check if session belongs to current user
        session_user_id = session.metadata.get('user_id')
        if session_user_id != str(current_user.id):
            logger.error(f"Session belongs to user {session_user_id}, not {current_user.id}")
            return {
                "success": False,
                "message": "Session does not belong to current user",
                "data": {"session_id": session_id}
            }
        
        # If session is completed and has a subscription, process it
        if session.status == 'complete' and session.subscription:
            logger.info(f"Processing subscription {session.subscription}")
            
            try:
                # Retrieve the subscription
                logger.info(f"Retrieving subscription from Stripe...")
                subscription = stripe.Subscription.retrieve(session.subscription)
                logger.info(f"Retrieved subscription: {subscription.id}")
                
                # Process the subscription creation
                logger.info(f"Creating StripeService...")
                stripe_service = StripeService(db)
                logger.info(f"Calling handle_subscription_created...")
                await stripe_service.handle_subscription_created(subscription)
                logger.info(f"Successfully processed subscription")
                
                return {
                    "success": True,
                    "message": "Subscription activated successfully",
                    "data": {
                        "session_id": session_id,
                        "subscription_id": subscription.id,
                        "status": subscription.status
                    }
                }
            except Exception as process_error:
                logger.error(f"Error processing subscription: {process_error}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return {
                    "success": False,
                    "message": f"Error processing subscription: {str(process_error)}",
                    "data": {"session_id": session_id}
                }
        else:
            logger.warning(f"Session not complete or no subscription: status={session.status}, subscription={session.subscription}")
            return {
                "success": False,
                "message": "Session is not complete or has no subscription",
                "data": {
                    "session_id": session_id,
                    "status": session.status,
                    "subscription": session.subscription
                }
            }
            
    except Exception as e:
        logger.error(f"Error verifying session: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "message": f"Error processing session: {str(e)}",
            "data": {"session_id": session_id}
        }


@router.post("/cancel-subscription", response_model=SuccessResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cancel user's active subscription
    """
    try:
        stripe_service = StripeService(db)
        result = await stripe_service.cancel_subscription(current_user)
        
        return SuccessResponse(
            success=True,
            message=result['message'],
            data=result
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.get("/current-subscription", response_model=SuccessResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get current user's subscription details
    """
    try:
        stripe_service = StripeService(db)
        subscription_data = await stripe_service.get_user_subscription_details(current_user)
        
        return SuccessResponse(
            success=True,
            message="Subscription details retrieved successfully",
            data=subscription_data
        )
        
    except Exception as e:
        logger.error(f"Error getting subscription details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription details"
        )


@router.get("/payment-history", response_model=SuccessResponse)
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user's payment history
    """
    try:
        stripe_service = StripeService(db)
        payment_history = await stripe_service.get_payment_history(current_user)
        
        return SuccessResponse(
            success=True,
            message="Payment history retrieved successfully",
            data={
                "payments": payment_history
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting payment history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment history"
        )


@router.post("/test-verify")
async def test_verify_endpoint(
    session_id: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Test endpoint to debug the verify session issue"""
    try:
        logger.info(f"TEST ENDPOINT REACHED - Session: {session_id}, User: {current_user.id}")
        
        # Test basic Stripe API call
        try:
            # Just test if we can call Stripe API at all
            stripe.api_key = STRIPE_SECRET_KEY
            logger.info(f"Stripe API key set: {stripe.api_key[:10]}...")
            
            # Try to list some customers to test API connectivity
            customers = stripe.Customer.list(limit=1)
            logger.info(f"Stripe API test successful, found {len(customers.data)} customers")
            
            return {
                "success": True,
                "message": "Test endpoint working",
                "data": {
                    "session_id": session_id,
                    "user_id": str(current_user.id),
                    "stripe_api_working": True
                }
            }
        except Exception as stripe_error:
            logger.error(f"Stripe API error in test: {stripe_error}")
            return {
                "success": False,
                "message": f"Stripe API error: {str(stripe_error)}",
                "data": {"session_id": session_id}
            }
            
    except Exception as e:
        logger.error(f"Test endpoint error: {e}")
        return {
            "success": False,
            "message": f"Test endpoint error: {str(e)}",
            "data": {"session_id": session_id}
        }


@router.get("/config", response_model=SuccessResponse)
async def get_stripe_config() -> Any:
    """
    Get Stripe publishable key for frontend
    """
    from ....core.stripe_config import STRIPE_PUBLISHABLE_KEY
    
    return SuccessResponse(
        success=True,
        message="Stripe configuration retrieved",
        data={
            "publishable_key": STRIPE_PUBLISHABLE_KEY
        }
    )
