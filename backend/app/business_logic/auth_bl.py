"""
Authentication Business Logic
"""

from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from pydantic import ValidationError
from uuid import uuid4
from decimal import Decimal

from ..dao.user_dao import UserDAO, SellerDAO, BuyerDAO, EmailVerificationDAO, PasswordResetDAO
from ..schemas.user_schemas import UserCreate, UserLogin, TokenResponse, EmailVerificationRequest
from ..utils.auth import AuthUtils
from ..utils.email_service import email_service
from ..core.constants import UserType, OTP_EXPIRE_MINUTES, OTP_LENGTH, SubscriptionStatus, SubscriptionTier
from ..models.user_models import User
from ..models.subscription_models import Subscription, UserSubscription, Payment
import logging

logger = logging.getLogger(__name__)


class AuthBusinessLogic:
    """Business logic for authentication operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_dao = UserDAO(db)
        self.seller_dao = SellerDAO(db)
        self.buyer_dao = BuyerDAO(db)
        self.email_verification_dao = EmailVerificationDAO(db)
        self.password_reset_dao = PasswordResetDAO(db)
    
    async def register_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        Register a new user
        
        Args:
            user_data: User registration data
            
        Returns:
            Registration response with user info
            
        Raises:
            HTTPException: If email already exists or validation fails
        """
        try:
            # Check if email already exists
            existing_user = self.user_dao.get_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Hash password
            user_dict = user_data.dict()
            user_dict['password_hash'] = AuthUtils.get_password_hash(user_data.password)
            user_dict.pop('password')
            
            # Create user
            user = User(**user_dict)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            
            # Create profile based on user type
            if user.user_type == UserType.SELLER:
                self.seller_dao.create_seller_profile(user.id, {})
            elif user.user_type == UserType.BUYER:
                self.buyer_dao.create_buyer_profile(user.id, {})
            
            # No default subscription assignment - users must purchase after verification
            
            # Generate and send OTP for email verification
            verification_token = await self._send_verification_otp(user.id, user.email)
            
            return {
                "user_id": user.id,
                "verification_token": verification_token,
                "email": user.email,
                "user_type": user.user_type,
                "verification_required": True,
                "message": "Registration successful. Please verify your email."
            }
            
        except HTTPException:
            raise
        except ValidationError as e:
            # Handle Pydantic validation errors
            self.db.rollback()
            error_messages = []
            for error in e.errors():
                field = error.get('loc', ['unknown'])[-1]  # Get the field name
                message = error.get('msg', 'Invalid value')
                error_messages.append(f"{field}: {message}")
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Validation error: {'; '.join(error_messages)}"
            )
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )
    
    async def login_user(self, login_data: UserLogin) -> TokenResponse:
        """
        Authenticate user and return tokens
        
        Args:
            login_data: User login credentials
            
        Returns:
            Token response with access and refresh tokens
            
        Raises:
            HTTPException: If credentials are invalid
        """
        # Authenticate user
        user = self.user_dao.authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Update last login
        self.user_dao.update_last_login(user.id)
        
        # Create token response
        user_data = {
            "id": str(user.id),  # Convert UUID to string
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "last_login": user.last_login,
            "created_at": user.created_at
        }
        
        # Add seller verification status and notification if applicable
        if user.user_type == UserType.SELLER and user.seller_profile:
            verification_status = user.seller_profile.verification_status
            user_data["seller_verification_status"] = verification_status
            
            # Add notification message based on verification status
            if verification_status == "pending":
                user_data["notification"] = {
                    "type": "info",
                    "title": "Profile Under Review",
                    "message": "Your seller profile is currently under review by our admin team. You will receive an email notification once the verification process is complete. Thank you for your patience!",
                    "show_on_login": True
                }
            elif verification_status == "rejected":
                user_data["notification"] = {
                    "type": "warning", 
                    "title": "Profile Verification Required",
                    "message": "Your seller profile verification was not approved. Please review the feedback and resubmit your documents for verification.",
                    "show_on_login": True
                }
        
        token_data = AuthUtils.create_token_response(user_data)
        
        return TokenResponse(**token_data)
    
    async def verify_email(self, verification_data: EmailVerificationRequest) -> Dict[str, Any]:
        """
        Verify user email with OTP
        
        Args:
            verification_data: Email and OTP code
            
        Returns:
            Verification response
            
        Raises:
            HTTPException: If OTP is invalid or expired
        """
        # Get user by email
        user = self.user_dao.get_by_email(verification_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify OTP
        is_valid = self.email_verification_dao.verify_otp(user.id, verification_data.otp)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        # Mark user as verified
        self.user_dao.verify_user(user.id)
        
        # Send welcome email
        user_name = f"{user.first_name} {user.last_name}"
        email_sent = await email_service.send_welcome_email(
            user.email, user_name, user.user_type
        )
        if not email_sent:
            logger.warning(f"Failed to send welcome email to {user.email}")
        
        return {
            "message": "Email verified successfully",
            "user_id": user.id,
            "is_verified": True
        }
    
    async def resend_otp(self, email: str) -> Dict[str, Any]:
        """
        Resend OTP for email verification
        
        Args:
            email: User email address
            
        Returns:
            Resend response
            
        Raises:
            HTTPException: If user not found or already verified
        """
        user = self.user_dao.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified"
            )
        
        # Send new OTP
        await self._send_verification_otp(user.id, email)
        
        return {
            "message": "OTP sent successfully",
            "email": email
        }
    
    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New token response
            
        Raises:
            HTTPException: If refresh token is invalid
        """
        # Verify refresh token
        payload = AuthUtils.verify_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        user = self.user_dao.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new token response
        user_data = {
            "id": user.id,
            "email": user.email,
            "user_type": user.user_type,
            "is_verified": user.is_verified,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
        
        token_data = AuthUtils.create_token_response(user_data)
        
        return TokenResponse(**token_data)
    
    async def request_password_reset(self, email: str) -> Dict[str, Any]:
        """
        Request password reset
        
        Args:
            email: User email address
            
        Returns:
            Reset request response
        """
        user = self.user_dao.get_by_email(email)
        if not user:
            # Don't reveal if email exists or not for security
            return {
                "message": "If the email exists, a reset link has been sent"
            }
        
        # Generate reset token
        reset_token = AuthUtils.generate_reset_token()
        self.password_reset_dao.create_reset_token(user.id, reset_token)
        
        # Send password reset email
        user_name = f"{user.first_name} {user.last_name}"
        email_sent = await email_service.send_password_reset_email(
            user.email, reset_token, user_name
        )
        if not email_sent:
            logger.warning(f"Failed to send password reset email to {user.email}")
        
        return {
            "message": "If the email exists, a reset link has been sent"
        }
    
    async def reset_password(self, reset_token: str, new_password: str) -> Dict[str, Any]:
        """
        Reset password using reset token
        
        Args:
            reset_token: Password reset token
            new_password: New password
            
        Returns:
            Reset response
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        # Verify reset token
        reset_record = self.password_reset_dao.verify_reset_token(reset_token)
        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Get user
        user = self.user_dao.get_by_id(reset_record.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.password_hash = AuthUtils.get_password_hash(new_password)
        self.db.commit()
        
        # Mark reset token as used
        self.password_reset_dao.use_reset_token(reset_token)
        
        return {
            "message": "Password reset successfully"
        }
    
    async def _send_verification_otp(self, user_id: UUID, email: str) -> str:
        """
        Generate and send OTP for email verification
        
        Args:
            user_id: User ID
            email: Email address to send OTP to
            
        Returns:
            verification_token: Secure token for URL
        """
        # Generate OTP and verification token
        otp_code = AuthUtils.generate_otp(OTP_LENGTH)
        verification_token = AuthUtils.generate_verification_token()
        
        # Save OTP to database
        self.email_verification_dao.create_verification(
            user_id=user_id,
            otp_code=otp_code,
            verification_token=verification_token,
            expires_in_minutes=OTP_EXPIRE_MINUTES
        )
        
        # Send email with OTP (temporarily disabled for debugging)
        user = self.user_dao.get_by_id(user_id)
        user_name = f"{user.first_name} {user.last_name}" if user else "User"
        
        # Temporarily disable email sending to debug registration
        try:
            email_sent = await email_service.send_otp_email(email, otp_code, user_name)
            if not email_sent:
                logger.warning(f"Failed to send OTP email to {email}")
        except Exception as e:
            logger.warning(f"Email service error: {e}")
            # Don't fail the registration, just log the warning
        
        # For development, log the OTP
        logger.info(f"Registration OTP for {email}: {otp_code}")
        
        return verification_token
    
    async def get_user_profile(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get user profile information
        
        Args:
            user_id: User ID
            
        Returns:
            User profile data
            
        Raises:
            HTTPException: If user not found
        """
        user = self.user_dao.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        profile_data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "last_login": user.last_login,
            "created_at": user.created_at
        }
        
        # Add type-specific profile data with subscription information
        if user.user_type == UserType.SELLER:
            seller = self.seller_dao.get_by_user_id(user.id)
            if seller:
                # Get subscription information for seller
                subscription_info = await self._get_user_subscription_info(user.id)
                
                profile_data["seller_profile"] = {
                    "business_name": seller.business_name,
                    "business_description": seller.business_description,
                    "verification_status": seller.verification_status,
                    "profile_completion_percentage": seller.profile_completion_percentage,
                    "subscription": subscription_info
                }
        
        elif user.user_type == UserType.BUYER:
            buyer = self.buyer_dao.get_by_user_id(user.id)
            if buyer:
                # Get subscription information for buyer
                subscription_info = await self._get_user_subscription_info(user.id)
                
                profile_data["buyer_profile"] = {
                    "verification_status": buyer.verification_status,
                    "preferences": buyer.preferences,
                    "subscription": subscription_info
                }
        
        return profile_data
    
    async def _get_user_subscription_info(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get user's subscription information"""
        try:
            from ..models.subscription_models import UserSubscription, Subscription
            from ..core.constants import SubscriptionStatus
            from datetime import datetime, timezone
            
            # Get subscription for the user (active or cancelled but not expired)
            subscription_query = self.db.query(UserSubscription, Subscription).join(
                Subscription, UserSubscription.subscription_id == Subscription.id
            ).filter(
                UserSubscription.user_id == user_id,
                UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED])
            ).order_by(UserSubscription.created_at.desc()).first()
            
            if not subscription_query:
                return None
            
            user_subscription, subscription_plan = subscription_query
            
            # Check if subscription is still valid based on end_date
            current_time = datetime.now()
            is_expired = user_subscription.end_date and user_subscription.end_date < current_time
            
            # If subscription is expired, don't return it
            if is_expired:
                return None
            
            # Determine effective status - if cancelled but not expired, show as active for access purposes
            effective_status = 'active' if not is_expired else 'expired'
            
            return {
                "type": subscription_plan.tier,
                "name": subscription_plan.name,
                "status": effective_status,  # Use effective status for access control
                "actual_status": user_subscription.status,  # Keep original status for display
                "expires_at": user_subscription.end_date.isoformat() if user_subscription.end_date else None,
                "cancelled_at": user_subscription.cancelled_at.isoformat() if user_subscription.cancelled_at else None,
                "is_cancelled": user_subscription.status == 'cancelled',
                "limits": {
                    "connections": subscription_plan.connection_limit_monthly,
                    "listings": subscription_plan.listing_limit,
                },
                "usage": {
                    "connections_used": user_subscription.connections_used_current_month or 0,
                    "listings_used": user_subscription.listings_used or 0,
                },
                "features": {
                    "priority_support": subscription_plan.priority_support,
                    "advanced_analytics": subscription_plan.advanced_analytics,
                    "featured_listings": subscription_plan.featured_listings,
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription info for user {user_id}: {e}")
            return None
    
    async def _assign_default_subscription(self, user: User) -> None:
        """
        Assign default subscription to a new user based on user type
        
        Args:
            user: User object to assign subscription to
        """
        try:
            # Get appropriate subscription based on user type
            if user.user_type == UserType.SELLER:
                subscription_tier = "seller_basic"
            elif user.user_type == UserType.BUYER:
                subscription_tier = "buyer_basic"
            else:
                logger.warning(f"Unknown user type: {user.user_type}")
                return
            
            default_subscription = self.db.query(Subscription).filter(
                Subscription.tier == subscription_tier,
                Subscription.is_active == True
            ).first()
            
            if not default_subscription:
                logger.warning(f"No active {subscription_tier} subscription plan found")
                return
            
            # Calculate subscription period (1 year from now)
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=365)
            
            # Create user subscription
            user_subscription = UserSubscription(
                user_id=user.id,
                subscription_id=default_subscription.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle="monthly",  # Use monthly since yearly prices are None
                start_date=start_date,
                end_date=end_date,
                trial_end_date=None,
                cancelled_at=None,
                connections_used_current_month=0,
                listings_used=0,
                usage_reset_date=start_date + timedelta(days=30),
                amount_paid=default_subscription.price_monthly,  # Use monthly price
                currency="GBP",
                stripe_subscription_id=f"sub_auto_{uuid4()}",
                stripe_customer_id=f"cus_auto_{uuid4()}"
            )
            
            self.db.add(user_subscription)
            self.db.flush()  # Get the ID
            
            # Create a payment record
            payment = Payment(
                user_subscription_id=user_subscription.id,
                amount=user_subscription.amount_paid,
                currency="GBP",
                payment_method="auto_assigned",
                status="succeeded",
                payment_date=start_date,
                stripe_payment_intent_id=f"pi_auto_{uuid4()}",
                stripe_invoice_id=f"in_auto_{uuid4()}"
            )
            
            self.db.add(payment)
            
            # Update buyer profile if user is a buyer
            if user.user_type == UserType.BUYER:
                # Get the buyer profile that was just created
                buyer = self.buyer_dao.get_by_user_id(user.id)
                if buyer:
                    buyer.subscription_id = user_subscription.id
            
            # Commit the subscription assignment
            self.db.commit()
            
            logger.info(f"Successfully assigned {default_subscription.name} subscription to user {user.email}")
            
        except Exception as e:
            logger.error(f"Error assigning default subscription to user {user.email}: {str(e)}")
            self.db.rollback()
            raise
