/**
 * App Constants
 */

export const API_CONFIG = {
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use localhost
  BASE_URL: __DEV__
    ? 'http://10.0.2.2:8000/api/v1'
    : 'https://api.eaglehurst.com/api/v1',
  TIMEOUT: 30000,
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@careacquire:access_token',
  REFRESH_TOKEN: '@careacquire:refresh_token',
  USER_DATA: '@careacquire:user_data',
  ONBOARDING_COMPLETE: '@careacquire:onboarding_complete',
};

export const SUBSCRIPTION_PLANS = {
  GOLD: {
    id: 'gold',
    name: 'Gold',
    connections: 10,
    listings: 5,
    price: {
      monthly: 99.99,
      yearly: 999.99,
    },
  },
  SILVER: {
    id: 'silver',
    name: 'Silver',
    connections: 25,
    listings: 10,
    price: {
      monthly: 149.99,
      yearly: 1499.99,
    },
  },
  PLATINUM: {
    id: 'platinum',
    name: 'Platinum',
    connections: -1, // unlimited
    listings: -1, // unlimited
    price: {
      monthly: 199.99,
      yearly: 1999.99,
    },
  },
};

export const BUSINESS_TYPES = [
  'GP Practice',
  'Dental Practice',
  'Pharmacy',
  'Optometry',
  'Physiotherapy',
  'Veterinary',
  'Other Medical',
];

export const UK_REGIONS = [
  'London',
  'South East',
  'South West',
  'East of England',
  'West Midlands',
  'East Midlands',
  'Yorkshire and the Humber',
  'North West',
  'North East',
  'Wales',
  'Scotland',
  'Northern Ireland',
];

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PHONE_REGEX: /^(\+44|0)[1-9]\d{9,10}$/,
  POSTCODE_REGEX: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  VERIFY_EMAIL: 'VerifyEmail',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  
  // Buyer
  BUYER_DASHBOARD: 'BuyerDashboard',
  LISTINGS: 'Listings',
  LISTING_DETAIL: 'ListingDetail',
  SAVED_LISTINGS: 'SavedListings',
  
  // Seller
  SELLER_DASHBOARD: 'SellerDashboard',
  MY_LISTINGS: 'MyListings',
  CREATE_LISTING: 'CreateListing',
  EDIT_LISTING: 'EditListing',
  KYC_UPLOAD: 'KYCUpload',
  
  // Shared
  MESSAGES: 'Messages',
  MESSAGE_THREAD: 'MessageThread',
  CONNECTIONS: 'Connections',
  PROFILE: 'Profile',
  SUBSCRIPTION: 'Subscription',
  SETTINGS: 'Settings',
};

// API Base URL - use environment variable or default
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Token storage keys
export const TOKEN_KEY = STORAGE_KEYS.ACCESS_TOKEN;
export const REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;
export const USER_KEY = STORAGE_KEYS.USER_DATA;

export default {
  API_CONFIG,
  STORAGE_KEYS,
  SUBSCRIPTION_PLANS,
  BUSINESS_TYPES,
  UK_REGIONS,
  FILE_UPLOAD_LIMITS,
  VALIDATION_RULES,
  PAGINATION,
  SCREEN_NAMES,
};

