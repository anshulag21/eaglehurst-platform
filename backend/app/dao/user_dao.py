"""
User Data Access Object for user-related database operations
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta

from .base_dao import BaseDAO
from ..models.user_models import User, Seller, Buyer, EmailVerification, PasswordReset
from ..schemas.user_schemas import UserCreate, UserUpdate
from ..core.constants import UserType, VerificationStatus


class UserDAO(BaseDAO[User, UserCreate, UserUpdate]):
    """Data Access Object for User operations"""
    
    def __init__(self, db: Session):
        super().__init__(User, db)
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        return self.db.query(User).filter(User.email == email).first()
    
    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with proper validation"""
        # Check if email already exists
        existing_user = self.get_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Create user
        user_dict = user_data.dict()
        user_dict.pop('password')  # Remove password from dict
        
        user = User(**user_dict)
        user.password_hash = user_data.password  # This will be hashed by the model
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        from ..utils.auth import AuthUtils
        
        user = self.get_by_email(email)
        if not user:
            return None
        
        if not AuthUtils.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        return user
    
    def update_last_login(self, user_id: UUID) -> None:
        """Update user's last login timestamp"""
        self.db.query(User).filter(User.id == user_id).update({
            "last_login": datetime.utcnow()
        })
        self.db.commit()
    
    def verify_user(self, user_id: UUID) -> bool:
        """Mark user as verified"""
        result = self.db.query(User).filter(User.id == user_id).update({
            "is_verified": True
        })
        self.db.commit()
        return result > 0
    
    def deactivate_user(self, user_id: UUID) -> bool:
        """Deactivate user account"""
        result = self.db.query(User).filter(User.id == user_id).update({
            "is_active": False
        })
        self.db.commit()
        return result > 0
    
    def activate_user(self, user_id: UUID) -> bool:
        """Activate user account"""
        result = self.db.query(User).filter(User.id == user_id).update({
            "is_active": True
        })
        self.db.commit()
        return result > 0
    
    def get_users_by_type(self, user_type: UserType, skip: int = 0, limit: int = 100) -> List[User]:
        """Get users by type with pagination"""
        return self.db.query(User).filter(
            User.user_type == user_type
        ).offset(skip).limit(limit).all()
    
    def search_users(
        self,
        search_term: str,
        user_type: Optional[UserType] = None,
        is_verified: Optional[bool] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Search users with filters"""
        query = self.db.query(User)
        
        # Search in name and email
        if search_term:
            search_filter = or_(
                User.first_name.ilike(f"%{search_term}%"),
                User.last_name.ilike(f"%{search_term}%"),
                User.email.ilike(f"%{search_term}%")
            )
            query = query.filter(search_filter)
        
        # Apply filters
        if user_type:
            query = query.filter(User.user_type == user_type)
        if is_verified is not None:
            query = query.filter(User.is_verified == is_verified)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()


class SellerDAO(BaseDAO[Seller, dict, dict]):
    """Data Access Object for Seller operations"""
    
    def __init__(self, db: Session):
        super().__init__(Seller, db)
    
    def get_by_user_id(self, user_id: UUID) -> Optional[Seller]:
        """Get seller profile by user ID"""
        return self.db.query(Seller).filter(Seller.user_id == user_id).first()
    
    def create_seller_profile(self, user_id: UUID, profile_data: Dict[str, Any]) -> Seller:
        """Create seller profile"""
        seller = Seller(user_id=user_id, **profile_data)
        self.db.add(seller)
        self.db.commit()
        self.db.refresh(seller)
        return seller
    
    def update_verification_status(
        self,
        seller_id: UUID,
        status: VerificationStatus,
        admin_notes: Optional[str] = None
    ) -> bool:
        """Update seller verification status"""
        update_data = {"verification_status": status}
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        
        result = self.db.query(Seller).filter(Seller.id == seller_id).update(update_data)
        self.db.commit()
        return result > 0
    
    def get_pending_verification(self, skip: int = 0, limit: int = 100) -> List[Seller]:
        """Get sellers pending verification"""
        return self.db.query(Seller).filter(
            Seller.verification_status == VerificationStatus.PENDING
        ).offset(skip).limit(limit).all()
    
    def update_kyc_documents(self, seller_id: UUID, documents: Dict[str, Any]) -> bool:
        """Update KYC documents"""
        result = self.db.query(Seller).filter(Seller.id == seller_id).update({
            "kyc_documents": documents
        })
        self.db.commit()
        return result > 0
    
    def get_verified_sellers(self, skip: int = 0, limit: int = 100) -> List[Seller]:
        """Get verified sellers"""
        return self.db.query(Seller).filter(
            Seller.verification_status == VerificationStatus.APPROVED
        ).offset(skip).limit(limit).all()


class BuyerDAO(BaseDAO[Buyer, dict, dict]):
    """Data Access Object for Buyer operations"""
    
    def __init__(self, db: Session):
        super().__init__(Buyer, db)
    
    def get_by_user_id(self, user_id: UUID) -> Optional[Buyer]:
        """Get buyer profile by user ID"""
        return self.db.query(Buyer).filter(Buyer.user_id == user_id).first()
    
    def create_buyer_profile(self, user_id: UUID, profile_data: Optional[Dict[str, Any]] = None) -> Buyer:
        """Create buyer profile"""
        data = profile_data or {}
        buyer = Buyer(user_id=user_id, **data)
        self.db.add(buyer)
        self.db.commit()
        self.db.refresh(buyer)
        return buyer
    
    def update_preferences(self, buyer_id: UUID, preferences: Dict[str, Any]) -> bool:
        """Update buyer preferences"""
        result = self.db.query(Buyer).filter(Buyer.id == buyer_id).update({
            "preferences": preferences
        })
        self.db.commit()
        return result > 0
    
    def get_buyers_with_subscription(self, skip: int = 0, limit: int = 100) -> List[Buyer]:
        """Get buyers with active subscriptions"""
        return self.db.query(Buyer).filter(
            Buyer.subscription_id.isnot(None)
        ).offset(skip).limit(limit).all()


class EmailVerificationDAO(BaseDAO[EmailVerification, dict, dict]):
    """Data Access Object for Email Verification operations"""
    
    def __init__(self, db: Session):
        super().__init__(EmailVerification, db)
    
    def create_verification(self, user_id: UUID, otp_code: str, verification_token: str, expires_in_minutes: int = 10) -> EmailVerification:
        """Create email verification record"""
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        verification = EmailVerification(
            user_id=user_id,
            otp_code=otp_code,
            verification_token=verification_token,
            expires_at=expires_at
        )
        
        self.db.add(verification)
        self.db.commit()
        self.db.refresh(verification)
        return verification
    
    def get_by_token(self, verification_token: str) -> Optional[EmailVerification]:
        """Get verification record by token"""
        return self.db.query(EmailVerification).filter(
            and_(
                EmailVerification.verification_token == verification_token,
                EmailVerification.expires_at > datetime.utcnow(),
                EmailVerification.is_used == False
            )
        ).first()
    
    def verify_otp(self, user_id: UUID, otp_code: str) -> bool:
        """Verify OTP code"""
        verification = self.db.query(EmailVerification).filter(
            and_(
                EmailVerification.user_id == user_id,
                EmailVerification.otp_code == otp_code,
                EmailVerification.expires_at > datetime.utcnow(),
                EmailVerification.is_used == False
            )
        ).first()
        
        if verification:
            verification.is_used = True
            self.db.commit()
            return True
        
        return False
    
    def cleanup_expired(self) -> int:
        """Clean up expired verification records"""
        result = self.db.query(EmailVerification).filter(
            EmailVerification.expires_at < datetime.utcnow()
        ).delete()
        self.db.commit()
        return result


class PasswordResetDAO(BaseDAO[PasswordReset, dict, dict]):
    """Data Access Object for Password Reset operations"""
    
    def __init__(self, db: Session):
        super().__init__(PasswordReset, db)
    
    def create_reset_token(self, user_id: UUID, reset_token: str, expires_in_hours: int = 24) -> PasswordReset:
        """Create password reset token"""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        
        reset = PasswordReset(
            user_id=user_id,
            reset_token=reset_token,
            expires_at=expires_at
        )
        
        self.db.add(reset)
        self.db.commit()
        self.db.refresh(reset)
        return reset
    
    def verify_reset_token(self, reset_token: str) -> Optional[PasswordReset]:
        """Verify reset token and return if valid"""
        return self.db.query(PasswordReset).filter(
            and_(
                PasswordReset.reset_token == reset_token,
                PasswordReset.expires_at > datetime.utcnow(),
                PasswordReset.is_used == False
            )
        ).first()
    
    def use_reset_token(self, reset_token: str) -> bool:
        """Mark reset token as used"""
        result = self.db.query(PasswordReset).filter(
            PasswordReset.reset_token == reset_token
        ).update({"is_used": True})
        self.db.commit()
        return result > 0
    
    def cleanup_expired(self) -> int:
        """Clean up expired reset tokens"""
        result = self.db.query(PasswordReset).filter(
            PasswordReset.expires_at < datetime.utcnow()
        ).delete()
        self.db.commit()
        return result
