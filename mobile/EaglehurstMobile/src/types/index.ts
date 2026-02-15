/**
 * TypeScript Type Definitions
 */

// User Types
export interface User {
  id: string;
  email: string;
  user_type: 'buyer' | 'seller' | 'admin';
  first_name: string;
  last_name: string;
  phone: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  buyer_profile?: BuyerProfile;
  seller_profile?: SellerProfile;
}

export interface BuyerProfile {
  verification_status: 'pending' | 'approved' | 'rejected';
  subscription?: Subscription;
}

export interface SellerProfile {
  business_name?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  subscription?: Subscription;
}

export interface Subscription {
  type: string;
  name: string;
  status: string;
  expires_at?: string;
  limits: {
    connections: number;
    listings: number;
  };
  usage: {
    connections_used: number;
    listings_used: number;
  };
  features: {
    priority_support: boolean;
    advanced_analytics: boolean;
    featured_listings: boolean;
  };
}

export interface SellerAnalytics {
  total_listings: number;
  total_views: number;
  total_inquiries: number;
  total_saved: number;
  active_listings: number;
  average_views_per_listing: number;
  conversion_rate: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  user_type: 'buyer' | 'seller';
  first_name: string;
  last_name: string;
  phone: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Listing Types
export interface Listing {
  id: string;
  listing_id: string;
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  postcode?: string;
  region?: string;
  asking_price: number | null;
  price_range?: string;
  media_files: MediaFile[];
  is_connected: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published';
  created_at: string;
  updated_at: string;
  practice_name?: string;
  practice_type?: string;
  nhs_contract?: boolean;
  patient_list_size?: number;
  staff_count?: number;
  premises_type?: 'owned' | 'leased';
  cqc_registered?: boolean;
  annual_revenue?: number;
  net_profit?: number;
  seller_info?: {
    business_name: string;
    contact_available: boolean;
  };
  // Stats (only for listing owners/sellers)
  view_count?: number;
  connection_count?: number;
  saved_count?: number;
  last_viewed_at?: string;
}

export interface MediaFile {
  id: string;
  file_url: string;
  file_type: 'image' | 'video' | 'document';
  file_name: string;
  is_primary: boolean;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  postcode?: string;
  region?: string;
  asking_price: number;
  practice_name?: string;
  practice_type?: string;
  premises_type?: 'owned' | 'leased';
  nhs_contract?: boolean;
  nhs_contract_details?: string;
  private_patient_base?: number;
  staff_count?: number;
  patient_list_size?: number;
  equipment_inventory?: string;
  cqc_registered?: boolean;
  cqc_registration_number?: string;
  professional_indemnity_insurance?: boolean;
  insurance_details?: string;
  lease_agreement_details?: string;
  property_value?: number;
  goodwill_valuation?: number;
  annual_revenue?: number;
  net_profit?: number;
  is_draft: boolean;
}

// Connection Types
export interface Connection {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'rejected';
  initial_message: string;
  response_message?: string;
  seller_initiated: boolean;
  requested_at: string;
  responded_at?: string;
  last_activity: string;
  listing?: Listing;
  other_party?: {
    id: string;
    name: string;
    email: string;
    user_type: string;
    business_name?: string;
  };
  unread_messages: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

export interface ConnectionCreateRequest {
  listing_id: string;
  initial_message: string;
}

export interface ConnectionUpdateRequest {
  status: 'approved' | 'rejected';
  response_message?: string;
}

// Message Types
export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file';
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  read_at?: string;
  is_edited: boolean;
  edited_at?: string;
  sender_name?: string;
  sender_type?: string;
  created_at: string;
}

export interface MessageCreateRequest {
  content: string;
  message_type?: 'text' | 'file';
  file_url?: string;
  file_name?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// Filter Types
export interface ListingFilters {
  business_type?: 'full_sale' | 'partial_sale' | 'fundraising';
  location?: string;
  min_price?: number;
  max_price?: number;
  practice_type?: string;
  nhs_contract?: boolean;
  cqc_registered?: boolean;
  sort_by?: 'price' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { verificationToken: string; email: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type BuyerTabParamList = {
  BuyerDashboard: undefined;
  Listings: undefined;
  SavedListings: undefined;
  Connections: undefined;
  Profile: undefined;
};

export type SellerTabParamList = {
  SellerDashboard: undefined;
  MyListings: undefined;
  Connections: undefined;
  Profile: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ListingDetail: { listingId: string };
  MessageThread: { connectionId: string };
  Subscription: undefined;
  Settings: undefined;
};

export type SellerStackParamList = {
  SellerTabs: undefined;
  CreateListing: undefined;
  EditListing: { listingId: string };
  ListingDetail: { listingId: string };
  MessageThread: { connectionId: string };
  KYCUpload: undefined;
  Subscription: undefined;
  Settings: undefined;
};

