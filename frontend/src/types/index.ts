// Notification Types
export interface Notification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  show_on_login?: boolean;
}

// User Types
export interface User {
  id: string;
  email: string;
  user_type: 'buyer' | 'seller' | 'admin';
  is_verified: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  notification?: Notification;
  seller_verification_status?: 'pending' | 'approved' | 'rejected';
}

export interface UserProfile extends User {
  first_name: string;
  last_name: string;
  phone: string;
  buyer_profile?: {
    verification_status: 'pending' | 'approved' | 'rejected';
    preferences?: any;
    subscription?: {
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
    };
  };
  seller_profile?: {
    business_name?: string;
    verification_status: 'pending' | 'approved' | 'rejected';
    subscription?: {
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
    };
  };
}

// Authentication Types
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

// Media Types
export interface MediaFile {
  id: string;
  file_url: string;
  file_type: 'image' | 'video' | 'document';
  file_name: string;
  file_size?: number;
  display_order: number;
  is_primary: boolean;
  caption?: string;
}

// Listing Types
export interface Listing {
  id: string;
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  asking_price: number | null;
  price_range?: string;
  images: string[]; // Deprecated - use media_files
  media_files: MediaFile[];
  primary_image?: string;
  created_at: string;
  updated_at: string;
  is_connected: boolean;
  patient_list_size?: number;
  staff_count?: number;
  view_count?: number;
  connection_count?: number;
  saved_count?: number;
  last_viewed_at?: string;
  business_summary?: string;
  postcode?: string;
  region?: string;
  seller_info?: {
    business_name: string;
    contact_available: boolean;
  };
  business_details?: BusinessDetails;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published' | 'pending_approval';
  financial_data?: {
    asking_price: string;
    annual_revenue: string;
    net_profit: string;
    financial_statements: unknown[];
  };
  // Pending edit information (for seller listings)
  has_pending_edit?: boolean;
  pending_edit_created_at?: string;
  pending_edit_reason?: string;
}

export interface BusinessDetails {
  practice_name: string;
  practice_type: string;
  nhs_contract: boolean;
  patient_list_size: number;
  staff_count: number;
  premises_type: 'owned' | 'leased';
  cqc_registered: boolean;
  annual_revenue: number;
  net_profit: number;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  asking_price: number;
  business_details: BusinessDetails;
  scheduled_publish_date?: string;
  is_draft: boolean;
}

// Connection Types
export interface Connection {
  id: string;
  listing: {
    id: string;
    title: string;
  };
  other_party: {
    id: string;
    name: string;
    user_type: 'buyer' | 'seller';
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  seller_initiated?: boolean;
  initial_message?: string;
  response_message?: string;
  requested_at: string;
  responded_at?: string;
  last_activity: string;
  last_message?: {
    content: string;
    timestamp: string;
  };
}

// Message Types
export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  created_at: string;
}

// Subscription Types
export interface Subscription {
  type: string;
  expires_at: string;
  limits: {
    connections: number;
    listings: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  features: {
    connection_limit: number;
    listing_limit: number;
    priority_support: boolean;
    advanced_analytics: boolean;
  };
}

// Service Types
export interface ServiceRequest {
  id: string;
  service_type: 'legal' | 'valuation';
  listing_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  details: {
    description: string;
    urgency: 'low' | 'medium' | 'high';
    preferred_contact: 'email' | 'phone';
    additional_info?: string;
  };
  created_at: string;
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

// Filter and Search Types
export interface ListingFilters {
  business_type?: 'full_sale' | 'partial_sale' | 'fundraising';
  location?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'price' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Dashboard Types
export interface DashboardStats {
  total_users: number;
  active_listings: number;
  pending_approvals: number;
  monthly_revenue: number;
  new_registrations_today: number;
}

export interface SellerAnalytics {
  profile_visits: number;
  listing_views: number;
  connection_requests: number;
  messages_received: number;
  weekly_trends: {
    date: string;
    views: number;
    connections: number;
  }[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'connection_request' | 'message' | 'listing_approved' | 'listing_rejected' | 'subscription_expiring';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

// Form Types
export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

// Theme Types
export interface ThemeMode {
  mode: 'light' | 'dark';
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export interface SavedListingItem {
  id: string;
  listing: Listing;
  notes: string | null;
  saved_at: string;
}

export interface SavedListingsResponse {
  items: SavedListingItem[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}
