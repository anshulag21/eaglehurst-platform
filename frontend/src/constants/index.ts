// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8000';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// Authentication
export const TOKEN_STORAGE_KEY = 'careacquire_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'careacquire_refresh_token';
export const USER_STORAGE_KEY = 'careacquire_user';

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  EMAIL_VERIFICATION: '/email-verification',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Dashboard Routes
  DASHBOARD: '/dashboard',
  SELLER_DASHBOARD: '/dashboard/seller',
  BUYER_DASHBOARD: '/dashboard/buyer',
  ADMIN_DASHBOARD: '/dashboard/admin',
  
  // Listing Routes
  LISTINGS: '/listings',
  LISTING_DETAIL: '/listings/:id',
  LISTING_DETAILS: '/listings', // For navigation without :id
  SELLER_LISTING_DETAIL: '/listings/:id/seller',
  CREATE_LISTING: '/listings/create',
  EDIT_LISTING: '/listings/:id/edit',
  MY_LISTINGS: '/listings/my-listings',
  SAVED_LISTINGS: '/listings/saved',
  
  // Profile Routes
  PROFILE: '/profile',
  PROFILE_SUBSCRIPTION: '/profile/subscription',
  KYC_UPLOAD: '/profile/kyc',
  BLOCKED_USERS: '/profile/blocked-users',
  
  // Connection Routes
  CONNECTIONS: '/connections',
  ENQUIRY_HISTORY: '/enquiry-history',
  MESSAGES: '/messages',
  MESSAGE_THREAD: '/messages/:connectionId',
  
  // Subscription Routes
  SUBSCRIPTIONS: '/subscriptions',
  SUBSCRIPTION_SUCCESS: '/subscriptions/success',
  SUBSCRIPTION_CANCEL: '/subscriptions/cancel',
  
  // Service Routes
  SERVICES: '/services',
  SERVICE_REQUEST: '/services/request',
  
  // Admin Routes
  ADMIN_USERS: '/admin/users',
  ADMIN_BUYERS: '/admin/buyers',
  ADMIN_BUYER_DETAIL: '/admin/buyers/:buyerId',
  ADMIN_SELLERS: '/admin/sellers',
  ADMIN_SELLER_DETAIL: '/admin/sellers/:sellerId',
  ADMIN_LISTINGS: '/admin/listings',
  ADMIN_ALL_LISTINGS: '/admin/all-listings',
  ADMIN_LISTING_DETAIL: '/admin/listings/:listingId/detail',
  ADMIN_LISTING_CONVERSATIONS: '/admin/listings/:listingId/conversations',
  ADMIN_LISTING_ANALYTICS: '/admin/listings/:listingId/analytics',
  ADMIN_SERVICES: '/admin/services',
  ADMIN_ANALYTICS: '/admin/analytics',
} as const;

// Business Types
export const BUSINESS_TYPES = {
  FULL_SALE: 'full_sale',
  PARTIAL_SALE: 'partial_sale',
  FUNDRAISING: 'fundraising',
} as const;

export const BUSINESS_TYPE_LABELS = {
  [BUSINESS_TYPES.FULL_SALE]: 'Full Business Sale',
  [BUSINESS_TYPES.PARTIAL_SALE]: 'Partial Business Sale',
  [BUSINESS_TYPES.FUNDRAISING]: 'Fundraising',
} as const;

// User Types
export const USER_TYPES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;

export const USER_TYPE_LABELS = {
  [USER_TYPES.BUYER]: 'Buyer',
  [USER_TYPES.SELLER]: 'Seller',
  [USER_TYPES.ADMIN]: 'Administrator',
} as const;

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const VERIFICATION_STATUS_LABELS = {
  [VERIFICATION_STATUS.PENDING]: 'Pending Verification',
  [VERIFICATION_STATUS.APPROVED]: 'Verified',
  [VERIFICATION_STATUS.REJECTED]: 'Verification Failed',
} as const;

// Connection Status
export const CONNECTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const CONNECTION_STATUS_LABELS = {
  [CONNECTION_STATUS.PENDING]: 'Pending',
  [CONNECTION_STATUS.APPROVED]: 'Connected',
  [CONNECTION_STATUS.REJECTED]: 'Rejected',
} as const;

// Listing Status
export const LISTING_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
} as const;

export const LISTING_STATUS_LABELS = {
  [LISTING_STATUS.DRAFT]: 'Draft',
  [LISTING_STATUS.PENDING]: 'Pending Approval',
  [LISTING_STATUS.APPROVED]: 'Approved',
  [LISTING_STATUS.REJECTED]: 'Rejected',
  [LISTING_STATUS.PUBLISHED]: 'Published',
} as const;

// Service Types
export const SERVICE_TYPES = {
  LEGAL: 'legal',
  VALUATION: 'valuation',
} as const;

export const SERVICE_TYPE_LABELS = {
  [SERVICE_TYPES.LEGAL]: 'Legal Services',
  [SERVICE_TYPES.VALUATION]: 'Business Valuation',
} as const;

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  GOLD: 'gold',
  SILVER: 'silver',
  PLATINUM: 'platinum',
} as const;

export const SUBSCRIPTION_PLAN_LABELS = {
  [SUBSCRIPTION_PLANS.GOLD]: 'Gold Plan',
  [SUBSCRIPTION_PLANS.SILVER]: 'Silver Plan',
  [SUBSCRIPTION_PLANS.PLATINUM]: 'Platinum Plan',
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Validation
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^(\+44|0)[1-9]\d{8,9}$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 2000,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid UK phone number',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Registration successful! Please check your email for verification.',
  LOGIN_SUCCESS: 'Login successful!',
  PROFILE_UPDATED: 'Profile updated successfully',
  LISTING_CREATED: 'Listing created successfully',
  LISTING_UPDATED: 'Listing updated successfully',
  CONNECTION_SENT: 'Connection request sent successfully',
  MESSAGE_SENT: 'Message sent successfully',
  SUBSCRIPTION_SUCCESS: 'Subscription activated successfully',
} as const;

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#2e7d32',
  WARNING: '#ed6c02',
  ERROR: '#d32f2f',
  INFO: '#0288d1',
} as const;

// Breakpoints
export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 900,
  LG: 1200,
  XL: 1536,
} as const;

// Animation Durations
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500,
} as const;

// WebSocket Events
export const WS_EVENTS = {
  CONNECTION_NEW: 'connection:new',
  CONNECTION_APPROVED: 'connection:approved',
  CONNECTION_REJECTED: 'connection:rejected',
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  NOTIFICATION_NEW: 'notification:new',
} as const;

// Utility Functions
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /, it's a relative path from backend
  if (imagePath.startsWith('/')) {
    return `${BACKEND_BASE_URL}${imagePath}`;
  }
  
  // Otherwise, assume it's a relative path and prepend backend URL
  return `${BACKEND_BASE_URL}/${imagePath}`;
};
