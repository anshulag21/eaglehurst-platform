"""
Application constants for CareAcquire platform
"""

from enum import Enum


class UserType(str, Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"


class VerificationStatus(str, Enum):
    PENDING = "pending"  # New user, no documents submitted yet
    SUBMITTED_FOR_REVIEW = "submitted_for_review"  # Documents submitted, under admin review
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class BusinessType(str, Enum):
    FULL_SALE = "full_sale"
    PARTIAL_SALE = "partial_sale"
    FUNDRAISING = "fundraising"


class ConnectionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    SYSTEM = "system"


class ServiceType(str, Enum):
    LEGAL = "legal"
    VALUATION = "valuation"


class ServiceRequestStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class SubscriptionTier(str, Enum):
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


# JWT Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# OTP Configuration
OTP_EXPIRE_MINUTES = 10
OTP_LENGTH = 6

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# File Upload
MAX_FILE_SIZE_MB = 10
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".wmv"}

# Subscription Limits
SUBSCRIPTION_LIMITS = {
    SubscriptionTier.SILVER: {
        "connections_per_month": 5,
        "listings_limit": 2,
        "priority_support": False,
        "advanced_analytics": False,
    },
    SubscriptionTier.GOLD: {
        "connections_per_month": 15,
        "listings_limit": 5,
        "priority_support": True,
        "advanced_analytics": False,
    },
    SubscriptionTier.PLATINUM: {
        "connections_per_month": 50,
        "listings_limit": 20,
        "priority_support": True,
        "advanced_analytics": True,
    },
}

# Rate Limiting
RATE_LIMIT_PER_MINUTE = 60
RATE_LIMIT_PER_HOUR = 1000

# Email Templates
EMAIL_TEMPLATES = {
    "welcome": "welcome_email.html",
    "otp_verification": "otp_verification.html",
    "listing_approved": "listing_approved.html",
    "listing_rejected": "listing_rejected.html",
    "connection_request": "connection_request.html",
    "subscription_expiring": "subscription_expiring.html",
}

# Notification Types
class NotificationType(str, Enum):
    CONNECTION_REQUEST = "connection_request"
    CONNECTION_APPROVED = "connection_approved"
    CONNECTION_REJECTED = "connection_rejected"
    LISTING_APPROVED = "listing_approved"
    LISTING_REJECTED = "listing_rejected"
    NEW_MESSAGE = "new_message"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    KYC_APPROVED = "kyc_approved"
    KYC_REJECTED = "kyc_rejected"

# UK Medical Business Required Fields
UK_MEDICAL_BUSINESS_FIELDS = [
    "practice_name",
    "practice_type",
    "location",
    "premises_type",  # owned/leased
    "nhs_contract_details",
    "private_patient_base",
    "staff_count",
    "patient_list_size",
    "annual_revenue",
    "net_profit",
    "equipment_inventory",
    "cqc_registration",
    "professional_indemnity_insurance",
    "lease_agreement_details",
    "goodwill_valuation",
]

# Error Messages
ERROR_MESSAGES = {
    "UNAUTHORIZED": "Authentication required",
    "FORBIDDEN": "Insufficient permissions",
    "NOT_FOUND": "Resource not found",
    "VALIDATION_ERROR": "Invalid input data",
    "SUBSCRIPTION_REQUIRED": "Valid subscription required",
    "VERIFICATION_REQUIRED": "Account verification required",
    "RATE_LIMITED": "Too many requests",
    "FILE_TOO_LARGE": f"File size exceeds {MAX_FILE_SIZE_MB}MB limit",
    "INVALID_FILE_TYPE": "File type not allowed",
    "LISTING_LIMIT_EXCEEDED": "Subscription listing limit exceeded",
    "CONNECTION_LIMIT_EXCEEDED": "Monthly connection limit exceeded",
}

# Success Messages
SUCCESS_MESSAGES = {
    "REGISTRATION_SUCCESS": "Registration successful. Please verify your email.",
    "LOGIN_SUCCESS": "Login successful",
    "LOGOUT_SUCCESS": "Logout successful",
    "PROFILE_UPDATED": "Profile updated successfully",
    "LISTING_CREATED": "Listing created successfully",
    "LISTING_UPDATED": "Listing updated successfully",
    "CONNECTION_SENT": "Connection request sent successfully",
    "MESSAGE_SENT": "Message sent successfully",
    "SUBSCRIPTION_ACTIVATED": "Subscription activated successfully",
}

# Payment Status
class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

# Billing Period
class BillingPeriod(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
