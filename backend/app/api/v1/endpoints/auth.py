"""
Authentication API endpoints
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.user_schemas import (
    UserCreate, UserLogin, TokenResponse, EmailVerificationRequest,
    ResendOTPRequest, PasswordResetRequest, PasswordResetConfirm, TokenVerificationRequest, ResendOTPTokenRequest
)
from ....schemas.common_schemas import SuccessResponse
from ....business_logic.auth_bl import AuthBusinessLogic
from ....utils.dependencies import get_current_user
from ....models.user_models import User
from ....dao.user_dao import EmailVerificationDAO

router = APIRouter()


@router.post("/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user
    
    - **email**: Valid email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, digit)
    - **user_type**: Either 'buyer' or 'seller'
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **phone**: Optional phone number
    """
    import logging
    from pydantic import ValidationError
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Registration request received for email: {user_data.email}")
        logger.info(f"Password length: {len(user_data.password)}")
        
        auth_bl = AuthBusinessLogic(db)
        result = await auth_bl.register_user(user_data)
        
        return SuccessResponse(
            success=True,
            message="Registration successful. Please verify your email.",
            data=result
        )
    except ValidationError as e:
        # Handle Pydantic validation errors
        error_messages = []
        for error in e.errors():
            field = error.get('loc', ['unknown'])[-1]  # Get the field name
            message = error.get('msg', 'Invalid value')
            error_messages.append(f"{field}: {message}")
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {'; '.join(error_messages)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like email already exists)
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )


@router.post("/login", response_model=SuccessResponse)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
) -> Any:
    """
    User login
    
    - **email**: Registered email address
    - **password**: User password
    
    Returns JWT access and refresh tokens wrapped in success response
    """
    auth_bl = AuthBusinessLogic(db)
    token_response = await auth_bl.login_user(login_data)
    
    return SuccessResponse(
        success=True,
        message="Login successful",
        data=token_response.dict()
    )


@router.get("/verify-token/{verification_token}", response_model=SuccessResponse)
async def get_verification_details(
    verification_token: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get verification details by secure token
    
    - **verification_token**: Secure verification token from URL
    
    Returns user email and verification status (without exposing email in URL)
    """
    verification_dao = EmailVerificationDAO(db)
    verification = verification_dao.get_by_token(verification_token)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired verification token"
        )
    
    # Check if user is already verified
    user = verification.user
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already verified. Please login."
        )
    
    return SuccessResponse(
        success=True,
        message="Verification token is valid",
        data={
            "email": user.email,
            "user_id": str(user.id),
            "expires_at": verification.expires_at.isoformat(),
            "user_type": user.user_type
        }
    )


@router.post("/verify-email", response_model=SuccessResponse)
async def verify_email(
    verification_data: EmailVerificationRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Verify email address with OTP (legacy endpoint)
    
    - **email**: Email address to verify
    - **otp**: 6-digit OTP code sent to email
    """
    auth_bl = AuthBusinessLogic(db)
    result = await auth_bl.verify_email(verification_data)
    
    return SuccessResponse(
        success=True,
        message="Email verified successfully",
        data=result
    )


@router.post("/verify-email-token", response_model=SuccessResponse)
async def verify_email_with_token(
    verification_data: TokenVerificationRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Verify email address with secure token and OTP
    
    - **verification_token**: Secure verification token from registration
    - **otp**: 6-digit OTP code sent to email
    """
    verification_dao = EmailVerificationDAO(db)
    verification = verification_dao.get_by_token(verification_data.verification_token)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired verification token"
        )
    
    # Check if user is already verified
    user = verification.user
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already verified. Please login."
        )
    
    # Verify OTP using the user_id from the token
    if not verification_dao.verify_otp(user.id, verification_data.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Mark user as verified
    user.is_verified = True
    db.commit()
    
    return SuccessResponse(
        success=True,
        message="Email verified successfully",
        data={
            "user_id": str(user.id),
            "email": user.email,
            "is_verified": True
        }
    )


@router.post("/resend-otp", response_model=SuccessResponse)
async def resend_otp(
    request_data: ResendOTPRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Resend OTP for email verification (legacy endpoint)
    
    - **email**: Email address to resend OTP to
    """
    auth_bl = AuthBusinessLogic(db)
    result = await auth_bl.resend_otp(request_data.email)
    
    return SuccessResponse(
        success=True,
        message="OTP sent successfully",
        data=result
    )


@router.post("/resend-otp-token", response_model=SuccessResponse)
async def resend_otp_with_token(
    request_data: ResendOTPTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Resend OTP using verification token
    
    - **verification_token**: Secure verification token from registration
    """
    verification_dao = EmailVerificationDAO(db)
    verification = verification_dao.get_by_token(request_data.verification_token)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired verification token"
        )
    
    user = verification.user
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already verified. Please login."
        )
    
    # Generate new OTP and update the existing verification record
    from ....utils.auth import AuthUtils
    from ....core.config import OTP_LENGTH, OTP_EXPIRE_MINUTES
    from datetime import datetime, timedelta
    
    new_otp = AuthUtils.generate_otp(OTP_LENGTH)
    verification.otp_code = new_otp
    verification.expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    verification.is_used = False  # Reset usage status
    db.commit()
    
    # Send email with new OTP
    from ....utils.email_service import email_service
    import logging
    logger = logging.getLogger(__name__)
    
    user_name = f"{user.first_name} {user.last_name}" if user else "User"
    
    try:
        email_sent = await email_service.send_otp_email(user.email, new_otp, user_name)
        if not email_sent:
            logger.warning(f"Failed to send OTP email to {user.email}")
    except Exception as e:
        logger.warning(f"Email service error: {e}")
    
    # For development, log the OTP
    logger.info(f"Resent OTP for {user.email}: {new_otp}")
    
    return SuccessResponse(
        success=True,
        message="OTP sent successfully",
        data={"email": user.email}
    )


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    """
    auth_bl = AuthBusinessLogic(db)
    return await auth_bl.refresh_token(refresh_token)


@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    request_data: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Request password reset
    
    - **email**: Email address for password reset
    
    Sends password reset link to email if account exists
    """
    auth_bl = AuthBusinessLogic(db)
    result = await auth_bl.request_password_reset(request_data.email)
    
    return SuccessResponse(
        success=True,
        message="If the email exists, a reset link has been sent",
        data=result
    )


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Reset password using reset token
    
    - **token**: Password reset token from email
    - **new_password**: New password (min 8 chars, uppercase, lowercase, digit)
    """
    auth_bl = AuthBusinessLogic(db)
    result = await auth_bl.reset_password(reset_data.token, reset_data.new_password)
    
    return SuccessResponse(
        success=True,
        message="Password reset successfully",
        data=result
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    User logout
    
    Note: With JWT tokens, logout is handled client-side by removing tokens.
    This endpoint is provided for consistency and future token blacklisting.
    """
    # TODO: Implement token blacklisting if needed
    # For now, logout is handled client-side
    
    return SuccessResponse(
        success=True,
        message="Logged out successfully",
        data={"user_id": current_user.id}
    )


@router.get("/me", response_model=SuccessResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get current user profile information
    
    Returns detailed profile information for the authenticated user
    """
    auth_bl = AuthBusinessLogic(db)
    profile_data = await auth_bl.get_user_profile(current_user.id)
    
    return SuccessResponse(
        success=True,
        message="Profile retrieved successfully",
        data=profile_data
    )


@router.get("/verify-token", response_model=SuccessResponse)
async def verify_token(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Verify if the current token is valid
    
    Returns user information if token is valid
    """
    return SuccessResponse(
        success=True,
        message="Token is valid",
        data={
            "user_id": current_user.id,
            "email": current_user.email,
            "user_type": current_user.user_type,
            "is_verified": current_user.is_verified,
            "is_active": current_user.is_active
        }
    )
