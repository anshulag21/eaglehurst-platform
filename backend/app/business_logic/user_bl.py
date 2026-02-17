"""
User management business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..dao.user_dao import UserDAO, SellerDAO, BuyerDAO
from ..dao.base_dao import BaseDAO
from ..models.user_models import User, Seller, Buyer
from ..models.listing_models import Listing
from ..models.connection_models import Connection
from ..models.subscription_models import UserSubscription, Subscription
from ..schemas.user_schemas import (
    UserProfileUpdate, SellerProfileUpdate, BuyerProfileUpdate
)
from ..core.constants import UserType, VerificationStatus, ListingStatus, ConnectionStatus
from ..utils.file_handler import FileHandler
import logging

logger = logging.getLogger(__name__)


class UserBusinessLogic:
    def __init__(self, db: Session):
        self.db = db
        self.user_dao = UserDAO(db)
        self.seller_dao = SellerDAO(db)
        self.buyer_dao = BuyerDAO(db)
        self.file_handler = FileHandler()

    async def get_user_profile(self, user_id: UUID) -> Dict[str, Any]:
        """Get comprehensive user profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            profile_data = {
                "id": user.id,
                "email": user.email,
                "user_type": user.user_type,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "last_login": user.last_login,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }

            # Add role-specific data
            if user.user_type == UserType.SELLER and user.seller_profile:
                # Get subscription information for seller
                subscription_info = None
                seller_subscription = self.db.query(UserSubscription, Subscription).join(
                    Subscription, UserSubscription.subscription_id == Subscription.id
                ).filter(
                    UserSubscription.user_id == user.id,
                    UserSubscription.status == 'active'
                ).first()
                
                if seller_subscription:
                    user_subscription, subscription_plan = seller_subscription
                    subscription_info = {
                        "type": subscription_plan.tier,
                        "name": subscription_plan.name,
                        "status": user_subscription.status,
                        "expires_at": user_subscription.end_date.isoformat() if user_subscription.end_date else None,
                        "limits": {
                            "connections": subscription_plan.connection_limit_monthly,
                            "listings": subscription_plan.listing_limit,
                        },
                        "usage": {
                            "connections_used": user_subscription.connections_used_current_month,
                            "listings_used": user_subscription.listings_used,
                        },
                        "features": {
                            "priority_support": subscription_plan.priority_support,
                            "advanced_analytics": subscription_plan.advanced_analytics,
                            "featured_listings": subscription_plan.featured_listings,
                        }
                    }

                profile_data["seller_profile"] = {
                    "business_name": user.seller_profile.business_name,
                    "business_description": user.seller_profile.business_description,
                    "business_address": user.seller_profile.business_address,
                    "verification_status": user.seller_profile.verification_status,
                    "professional_qualifications": getattr(user.seller_profile, 'professional_qualifications', None),
                    "experience_years": getattr(user.seller_profile, 'experience_years', None),
                    "specializations": getattr(user.seller_profile, 'specializations', None),
                    "kyc_documents": user.seller_profile.kyc_documents,
                    "subscription": subscription_info,
                    "created_at": user.seller_profile.created_at
                }

            elif user.user_type == UserType.BUYER and user.buyer_profile:
                # Get subscription information
                subscription_info = None
                if user.buyer_profile.subscription_id:
                    subscription_query = self.db.query(UserSubscription, Subscription).join(
                        Subscription, UserSubscription.subscription_id == Subscription.id
                    ).filter(UserSubscription.id == user.buyer_profile.subscription_id).first()
                    
                    if subscription_query:
                        user_subscription, subscription_plan = subscription_query
                        subscription_info = {
                            "type": subscription_plan.tier,
                            "name": subscription_plan.name,
                            "status": user_subscription.status,
                            "expires_at": user_subscription.end_date.isoformat() if user_subscription.end_date else None,
                            "limits": {
                                "connections": subscription_plan.connection_limit_monthly,
                                "listings": subscription_plan.listing_limit,
                            },
                            "usage": {
                                "connections_used": user_subscription.connections_used_current_month,
                                "listings_used": user_subscription.listings_used,
                            },
                            "features": {
                                "priority_support": subscription_plan.priority_support,
                                "advanced_analytics": subscription_plan.advanced_analytics,
                                "featured_listings": subscription_plan.featured_listings,
                            }
                        }

                profile_data["buyer_profile"] = {
                    "verification_status": user.buyer_profile.verification_status,
                    "preferences": user.buyer_profile.preferences,
                    "subscription": subscription_info,
                    "created_at": user.buyer_profile.created_at
                }

            return profile_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user profile"
            )

    async def update_user_profile(self, user_id: UUID, profile_data: UserProfileUpdate) -> Dict[str, Any]:
        """Update basic user profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Update user fields
            update_data = profile_data.dict(exclude_unset=True)
            updated_user = self.user_dao.update(user, update_data)

            return {
                "id": updated_user.id,
                "first_name": updated_user.first_name,
                "last_name": updated_user.last_name,
                "phone": updated_user.phone,
                "updated_at": updated_user.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile"
            )

    async def get_seller_profile(self, user_id: UUID) -> Dict[str, Any]:
        """Get seller-specific profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.SELLER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )

            seller_profile = user.seller_profile
            if not seller_profile:
                # Create seller profile if it doesn't exist
                logger.info(f"Creating seller profile for user {user_id}")
                seller_profile = self.seller_dao.create_seller_profile(user_id, {})
                # Refresh user to get the new seller profile relationship
                self.db.refresh(user)

            # Get seller statistics
            total_listings = self.db.query(Listing).filter(
                Listing.seller_id == seller_profile.id
            ).count()

            active_listings = self.db.query(Listing).filter(
                and_(
                    Listing.seller_id == seller_profile.id,
                    Listing.status == ListingStatus.PUBLISHED
                )
            ).count()

            total_connections = self.db.query(Connection).filter(
                Connection.seller_id == seller_profile.id
            ).count()

            return {
                "id": seller_profile.id,
                "user_id": seller_profile.user_id,
                "business_name": seller_profile.business_name,
                "business_description": seller_profile.business_description,
                "business_address": seller_profile.business_address,
                "verification_status": seller_profile.verification_status,
                "professional_qualifications": getattr(seller_profile, 'professional_qualifications', None),
                "experience_years": getattr(seller_profile, 'experience_years', None),
                "specializations": getattr(seller_profile, 'specializations', None),
                "kyc_documents": seller_profile.kyc_documents,
                "created_at": seller_profile.created_at,
                "updated_at": seller_profile.updated_at,
                "statistics": {
                    "total_listings": total_listings,
                    "active_listings": active_listings,
                    "total_connections": total_connections
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting seller profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve seller profile"
            )

    async def update_seller_profile(self, user_id: UUID, profile_data: SellerProfileUpdate) -> Dict[str, Any]:
        """Update seller-specific profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.SELLER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )

            seller_profile = user.seller_profile
            if not seller_profile:
                # Create seller profile if it doesn't exist
                logger.info(f"Creating seller profile for user {user_id}")
                seller_profile = self.seller_dao.create_seller_profile(user_id, {})
                # Refresh user to get the new seller profile relationship
                self.db.refresh(user)

            # Update seller profile
            update_data = profile_data.dict(exclude_unset=True)
            
            for field, value in update_data.items():
                setattr(seller_profile, field, value)
            
            self.db.commit()
            self.db.refresh(seller_profile)

            return {
                "id": seller_profile.id,
                "business_name": seller_profile.business_name,
                "business_description": seller_profile.business_description,
                "business_address": seller_profile.business_address,
                "professional_qualifications": getattr(seller_profile, 'professional_qualifications', None),
                "experience_years": getattr(seller_profile, 'experience_years', None),
                "specializations": getattr(seller_profile, 'specializations', None),
                "updated_at": seller_profile.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating seller profile: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update seller profile"
            )

    async def upload_kyc_documents(self, user_id: UUID, documents: List[UploadFile]) -> Dict[str, Any]:
        """Upload KYC documents for seller verification"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.SELLER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )

            seller_profile = user.seller_profile
            if not seller_profile:
                # Create seller profile if it doesn't exist
                logger.info(f"Creating seller profile for user {user_id}")
                seller_profile = self.seller_dao.create_seller_profile(user_id, {})
                # Refresh user to get the new seller profile relationship
                self.db.refresh(user)

            # Upload documents
            uploaded_docs = []
            for document in documents:
                # Validate file type and size
                try:
                    self.file_handler._validate_file(document, "document")
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid document type: {document.filename} - {str(e)}"
                    )

                # Save document
                file_info = await self.file_handler.save_document(
                    document, f"kyc/{user_id}"
                )
                uploaded_docs.append(file_info)

            # Update seller profile with document info
            existing_docs = seller_profile.kyc_documents or []
            existing_docs.extend(uploaded_docs)
            seller_profile.kyc_documents = existing_docs
            
            # Update verification status to submitted for review if documents are uploaded
            if seller_profile.verification_status == VerificationStatus.PENDING:
                seller_profile.verification_status = VerificationStatus.SUBMITTED_FOR_REVIEW

            self.db.commit()
            self.db.refresh(seller_profile)

            return {
                "uploaded_documents": uploaded_docs,
                "total_documents": len(existing_docs),
                "verification_status": seller_profile.verification_status
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading KYC documents: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload KYC documents"
            )

    async def submit_seller_verification(
        self, 
        user_id: UUID, 
        verification_data: Dict[str, Any], 
        documents: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Submit comprehensive seller verification with business information and documents"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.SELLER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )

            seller_profile = user.seller_profile
            if not seller_profile:
                # Create seller profile if it doesn't exist
                logger.info(f"Creating seller profile for user {user_id}")
                seller_profile = self.seller_dao.create_seller_profile(user_id, {})
                # Refresh user to get the new seller profile relationship
                self.db.refresh(user)

            # Update business information
            seller_profile.business_name = verification_data['business_name']
            seller_profile.business_description = verification_data['business_description']
            seller_profile.business_address = verification_data['business_address']
            
            # Store business type in a custom field or use existing field
            # For now, we'll store it in the business_description or create a new field
            business_type_info = f"Business Type: {verification_data['business_type']}\n\n"
            seller_profile.business_description = business_type_info + verification_data['business_description']

            # Process and upload documents
            uploaded_docs = []
            
            # Log document information for debugging
            logger.info(f"Processing documents for user {user_id}")
            for doc_type, document in documents.items():
                if doc_type == 'additional_documents':
                    logger.info(f"Additional documents: {len(document)} files")
                    for i, doc in enumerate(document):
                        logger.info(f"  Additional doc {i}: filename='{doc.filename}', content_type='{doc.content_type}'")
                else:
                    logger.info(f"{doc_type}: filename='{document.filename}', content_type='{document.content_type}'")
            
            # Upload required documents
            for doc_type, document in documents.items():
                if doc_type == 'additional_documents':
                    # Handle multiple additional documents
                    for additional_doc in document:
                        if additional_doc.filename:  # Skip empty files
                            # Validate document
                            try:
                                self.file_handler._validate_file(additional_doc, "document")
                            except Exception as e:
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Invalid document type: {additional_doc.filename} - {str(e)}"
                                )
                            
                            # Save document
                            file_info = await self.file_handler.save_document(
                                additional_doc, f"kyc/{user_id}"
                            )
                            file_info['document_type'] = 'additional'
                            uploaded_docs.append(file_info)
                else:
                    # Handle single required documents (license, identity)
                    if document and document.filename:
                        # Validate document
                        try:
                            self.file_handler._validate_file(document, "document")
                        except Exception as e:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid document type: {document.filename} - {str(e)}"
                            )
                        
                        # Save document
                        file_info = await self.file_handler.save_document(
                            document, f"kyc/{user_id}"
                        )
                        file_info['document_type'] = doc_type
                        uploaded_docs.append(file_info)

            # Update seller profile with document info
            existing_docs = seller_profile.kyc_documents or []
            existing_docs.extend(uploaded_docs)
            seller_profile.kyc_documents = existing_docs
            
            # Set verification status to submitted for review
            seller_profile.verification_status = VerificationStatus.SUBMITTED_FOR_REVIEW
            
            # Calculate profile completion percentage
            completion_fields = [
                seller_profile.business_name,
                seller_profile.business_description,
                seller_profile.business_address,
                len(uploaded_docs) >= 2  # At least identity and license documents
            ]
            completion_percentage = sum(1 for field in completion_fields if field) / len(completion_fields) * 100
            seller_profile.profile_completion_percentage = str(int(completion_percentage))

            self.db.commit()
            self.db.refresh(seller_profile)

            return {
                "business_name": seller_profile.business_name,
                "verification_status": seller_profile.verification_status,
                "uploaded_documents": uploaded_docs,
                "total_documents": len(existing_docs),
                "profile_completion_percentage": seller_profile.profile_completion_percentage,
                "message": "Verification submitted successfully. Your information will be reviewed by our admin team."
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting seller verification: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit seller verification"
            )

    async def get_buyer_profile(self, user_id: UUID) -> Dict[str, Any]:
        """Get buyer-specific profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.BUYER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer not found"
                )

            buyer_profile = user.buyer_profile
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer profile not found"
                )

            # Get buyer statistics
            total_connections = self.db.query(Connection).filter(
                Connection.buyer_id == buyer_profile.id
            ).count()

            active_connections = self.db.query(Connection).filter(
                and_(
                    Connection.buyer_id == buyer_profile.id,
                    Connection.status.in_([ConnectionStatus.PENDING, ConnectionStatus.APPROVED])
                )
            ).count()

            profile_data = {
                "id": buyer_profile.id,
                "user_id": buyer_profile.user_id,
                "verification_status": buyer_profile.verification_status,
                "preferences": buyer_profile.preferences,
                "created_at": buyer_profile.created_at,
                "updated_at": buyer_profile.updated_at,
                "statistics": {
                    "total_connections": total_connections,
                    "active_connections": active_connections
                }
            }

            # Add subscription information
            if buyer_profile.subscription_id:
                subscription = self.db.query(UserSubscription).filter(
                    UserSubscription.id == buyer_profile.subscription_id
                ).first()
                if subscription:
                    profile_data["subscription"] = {
                        "id": subscription.id,
                        "tier": subscription.subscription.tier,
                        "status": subscription.status,
                        "current_period_start": subscription.current_period_start,
                        "current_period_end": subscription.current_period_end,
                        "connections_used": subscription.connections_used_current_month,
                        "connections_limit": subscription.subscription.connection_limit_monthly,
                        "auto_renew": subscription.auto_renew
                    }

            return profile_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting buyer profile: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve buyer profile"
            )

    async def update_buyer_profile(self, user_id: UUID, profile_data: BuyerProfileUpdate) -> Dict[str, Any]:
        """Update buyer-specific profile information"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user or user.user_type != UserType.BUYER:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer not found"
                )

            buyer_profile = user.buyer_profile
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer profile not found"
                )

            # Update buyer profile
            update_data = profile_data.dict(exclude_unset=True)
            
            for field, value in update_data.items():
                setattr(buyer_profile, field, value)
            
            self.db.commit()
            self.db.refresh(buyer_profile)

            return {
                "id": buyer_profile.id,
                "preferences": buyer_profile.preferences,
                "updated_at": buyer_profile.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating buyer profile: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update buyer profile"
            )

    async def delete_user_account(self, user_id: UUID) -> Dict[str, Any]:
        """Soft delete user account"""
        try:
            user = self.user_dao.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Soft delete - deactivate account
            user.is_active = False
            user.email = f"deleted_{user.id}@deleted.com"  # Anonymize email
            
            self.db.commit()

            return {
                "user_id": user_id,
                "deleted_at": func.now(),
                "message": "Account has been deactivated"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting user account: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user account"
            )

    async def get_user_dashboard(self, user_id: UUID, user_type: str) -> Dict[str, Any]:
        """Get role-specific dashboard data"""
        try:
            if user_type == UserType.SELLER:
                return await self._get_seller_dashboard(user_id)
            elif user_type == UserType.BUYER:
                return await self._get_buyer_dashboard(user_id)
            elif user_type == UserType.ADMIN:
                return await self._get_admin_dashboard(user_id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user type"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user dashboard: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve dashboard data"
            )

    async def _get_seller_dashboard(self, user_id: UUID) -> Dict[str, Any]:
        """Get seller dashboard data"""
        user = self.user_dao.get_by_id(user_id)
        seller_profile = user.seller_profile

        # Get listing statistics
        listings_query = self.db.query(Listing).filter(Listing.seller_id == seller_profile.id)
        total_listings = listings_query.count()
        active_listings = listings_query.filter(Listing.status == ListingStatus.PUBLISHED).count()
        draft_listings = listings_query.filter(Listing.status == ListingStatus.DRAFT).count()

        # Get connection statistics
        connections_query = self.db.query(Connection).filter(Connection.seller_id == seller_profile.id)
        total_connections = connections_query.count()
        pending_connections = connections_query.filter(Connection.status == ConnectionStatus.PENDING).count()

        # Get recent listings
        recent_listings = listings_query.order_by(Listing.created_at.desc()).limit(5).all()

        return {
            "user_type": "seller",
            "statistics": {
                "total_listings": total_listings,
                "active_listings": active_listings,
                "draft_listings": draft_listings,
                "total_connections": total_connections,
                "pending_connections": pending_connections
            },
            "recent_listings": [
                {
                    "id": listing.id,
                    "title": listing.title,
                    "status": listing.status,
                    "created_at": listing.created_at,
                    "view_count": listing.view_count
                }
                for listing in recent_listings
            ],
            "verification_status": seller_profile.verification_status
        }

    async def _get_buyer_dashboard(self, user_id: UUID) -> Dict[str, Any]:
        """Get buyer dashboard data"""
        user = self.user_dao.get_by_id(user_id)
        buyer_profile = user.buyer_profile

        # Get connection statistics
        connections_query = self.db.query(Connection).filter(Connection.buyer_id == buyer_profile.id)
        total_connections = connections_query.count()
        active_connections = connections_query.filter(
            Connection.status == ConnectionStatus.APPROVED
        ).count()

        # Get subscription info
        subscription_info = None
        if buyer_profile.subscription_id:
            subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()
            if subscription:
                subscription_info = {
                    "tier": subscription.subscription.tier,
                    "connections_used": subscription.connections_used_current_month,
                    "connections_limit": subscription.subscription.connection_limit_monthly,
                    "expires_at": subscription.current_period_end
                }

        return {
            "user_type": "buyer",
            "statistics": {
                "total_connections": total_connections,
                "active_connections": active_connections
            },
            "subscription": subscription_info,
            "verification_status": buyer_profile.verification_status
        }

    async def _get_admin_dashboard(self, user_id: UUID) -> Dict[str, Any]:
        """Get admin dashboard data"""
        # Platform statistics
        total_users = self.db.query(User).count()
        total_sellers = self.db.query(User).filter(User.user_type == UserType.SELLER).count()
        total_buyers = self.db.query(User).filter(User.user_type == UserType.BUYER).count()
        
        total_listings = self.db.query(Listing).count()
        pending_listings = self.db.query(Listing).filter(Listing.status == ListingStatus.PENDING_APPROVAL).count()
        
        total_connections = self.db.query(Connection).count()

        return {
            "user_type": "admin",
            "platform_statistics": {
                "total_users": total_users,
                "total_sellers": total_sellers,
                "total_buyers": total_buyers,
                "total_listings": total_listings,
                "pending_listings": pending_listings,
                "total_connections": total_connections
            }
        }
