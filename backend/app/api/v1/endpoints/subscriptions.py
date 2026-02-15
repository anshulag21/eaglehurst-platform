"""
Subscription management endpoints
"""

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....services.stripe_service import StripeService
from ....utils.dependencies import get_current_user
from ....models.user_models import User
from ....schemas.common_schemas import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/current", response_model=SuccessResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get current user's subscription details with usage statistics
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


@router.get("/history", response_model=SuccessResponse)
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user's payment history from Stripe
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