# Eaglehurst Mobile App - Complete Documentation

## 📱 Application Overview

**Eaglehurst** is a comprehensive medical business marketplace platform connecting **Sellers** (medical practice owners) with **Buyers** (potential purchasers) in the UK. The platform facilitates the buying and selling of medical businesses through a secure, subscription-based marketplace.

---

## 🎯 Core Concepts

### User Types
1. **Buyer** - Searches for medical businesses to purchase
2. **Seller** - Lists medical businesses for sale
3. **Admin** - Manages the platform, approves listings and users

### Business Model
- **Subscription-based** access (Gold, Silver, Platinum tiers)
- **Connection-based** communication (buyers request connections to sellers)
- **Masked listings** - Full details only visible after connection approval
- **Additional services** - Legal and valuation services available

---

## 🔐 Authentication & Registration Flow

### Registration Process

#### For Buyers:
1. **Sign Up** → Email, Password, Name, Phone, User Type (Buyer)
2. **Email Verification** → OTP sent to email
3. **Profile Creation** → Automatic buyer profile created
4. **Subscription Selection** → Choose a plan (required to access listings)
5. **Payment** → Stripe checkout
6. **Access Granted** → Can browse listings and send connection requests

#### For Sellers:
1. **Sign Up** → Email, Password, Name, Phone, User Type (Seller)
2. **Email Verification** → OTP sent to email
3. **Business Information** → Business name, type, description, address
4. **KYC Document Upload** → Identity document, Medical license, Additional docs
5. **Admin Verification** → Wait for admin approval
6. **Subscription Selection** → Choose a plan (required to create listings)
7. **Payment** → Stripe checkout
8. **Access Granted** → Can create and manage listings

### Authentication APIs

```typescript
// Registration
POST /auth/register
Body: {
  email: string,
  password: string,
  user_type: "buyer" | "seller",
  first_name: string,
  last_name: string,
  phone: string
}
Response: {
  user_id: string,
  email: string,
  verification_required: boolean,
  verification_token: string
}

// Email Verification
POST /auth/verify-email-token
Body: {
  verification_token: string,
  otp: string
}

// Resend OTP
POST /auth/resend-otp-token
Body: {
  verification_token: string
}

// Login
POST /auth/login
Body: {
  email: string,
  password: string
}
Response: {
  access_token: string,
  refresh_token: string,
  user: {
    id: string,
    email: string,
    user_type: string,
    is_verified: boolean,
    notification?: {
      type: "info" | "warning" | "error" | "success",
      title: string,
      message: string
    }
  }
}

// Get Current User
GET /auth/me
Response: UserProfile (detailed profile with subscription info)

// Forgot Password
POST /auth/forgot-password
Body: { email: string }

// Reset Password
POST /auth/reset-password
Body: {
  token: string,
  new_password: string
}

// Refresh Token
POST /auth/refresh-token
Body: { refresh_token: string }

// Logout
POST /auth/logout
```

---

## 👤 User Profile Management

### Profile APIs

```typescript
// Get Profile
GET /users/profile
Response: {
  id: string,
  email: string,
  user_type: "buyer" | "seller" | "admin",
  first_name: string,
  last_name: string,
  phone: string,
  is_verified: boolean,
  buyer_profile?: {
    verification_status: string,
    subscription: SubscriptionDetails
  },
  seller_profile?: {
    business_name: string,
    verification_status: string,
    subscription: SubscriptionDetails
  }
}

// Update Profile
PUT /users/profile
Body: {
  first_name?: string,
  last_name?: string,
  phone?: string,
  business_name?: string // for sellers
}

// Change Password
POST /users/change-password
Body: {
  current_password: string,
  new_password: string
}

// Seller Verification (KYC)
POST /users/seller-verification
FormData: {
  business_name: string,
  business_description: string,
  business_type: string,
  business_address: string,
  license_document: File,
  identity_document: File,
  additional_documents?: File[]
}

// Get Seller Analytics
GET /users/seller-analytics?period=week|month|year
Response: {
  profile_visits: number,
  listing_views: number,
  connection_requests: number,
  messages_received: number,
  weekly_trends: Array<{date, views, connections}>
}

// Get Subscription Status
GET /users/subscription-status
Response: {
  active: boolean,
  plan: string,
  expires_at: string,
  usage: {
    connections_used: number,
    connections_limit: number,
    listings_used: number,
    listings_limit: number
  }
}

// Notification Preferences
GET /users/notification-preferences
PUT /users/notification-preferences
Body: {
  email_notifications: boolean,
  push_notifications: boolean,
  marketing_emails: boolean,
  connection_requests: boolean,
  messages: boolean,
  listing_updates: boolean
}
```

---

## 📋 Listings Management

### Listing Types
- **Full Sale** - Complete business sale
- **Partial Sale** - Selling a portion/share
- **Fundraising** - Seeking investment

### Listing Status Flow
1. **Draft** → Seller creates but hasn't submitted
2. **Pending Approval** → Submitted to admin for review
3. **Approved/Published** → Live on platform, visible to buyers
4. **Rejected** → Admin rejected with feedback

### Listing APIs

```typescript
// Browse Listings (Buyers)
GET /listings?page=1&limit=20&business_type=full_sale&location=London&min_price=100000&max_price=500000&sort_by=price&sort_order=asc
Response: {
  items: Listing[],
  pagination: {
    current_page: number,
    total_pages: number,
    total_items: number,
    items_per_page: number
  }
}

// Get Single Listing
GET /listings/{listing_id}
Response: {
  id: string,
  title: string,
  description: string, // Masked if not connected
  business_type: string,
  location: string,
  asking_price: number | null, // Masked if not connected
  price_range?: string, // Shown when price is masked
  media_files: MediaFile[],
  is_connected: boolean,
  status: string,
  business_details?: { // Only visible if connected
    practice_name: string,
    practice_type: string,
    nhs_contract: boolean,
    patient_list_size: number,
    staff_count: number,
    premises_type: "owned" | "leased",
    cqc_registered: boolean,
    annual_revenue: number,
    net_profit: number
  },
  seller_info: {
    business_name: string,
    contact_available: boolean
  }
}

// Create Listing (Sellers)
POST /listings
Body: {
  title: string,
  description: string,
  business_type: "full_sale" | "partial_sale" | "fundraising",
  location: string,
  postcode?: string,
  region?: string,
  asking_price: number,
  annual_revenue?: number,
  net_profit?: number,
  practice_name?: string,
  practice_type?: string,
  premises_type?: "owned" | "leased",
  nhs_contract?: boolean,
  nhs_contract_details?: string,
  private_patient_base?: number,
  staff_count?: number,
  patient_list_size?: number,
  equipment_inventory?: string,
  cqc_registered?: boolean,
  cqc_registration_number?: string,
  professional_indemnity_insurance?: boolean,
  insurance_details?: string,
  lease_agreement_details?: string,
  property_value?: number,
  goodwill_valuation?: number,
  is_draft: boolean
}

// Update Listing
PUT /listings/{listing_id}
Body: Same as create (partial updates allowed)

// Delete Listing
DELETE /listings/{listing_id}

// Upload Listing Media
POST /listings/{listing_id}/media
FormData: {
  media_files: File[]
}

// Delete Media
DELETE /listings/{listing_id}/media/{media_id}

// Set Primary Media
PUT /listings/{listing_id}/media/{media_id}/primary

// Get My Listings (Sellers)
GET /listings/seller/my-listings?page=1&limit=20
Response: PaginatedResponse<Listing>

// Save Listing (Buyers)
POST /listings/{listing_id}/save

// Unsave Listing
DELETE /listings/{listing_id}/save

// Get Saved Listings
GET /listings/saved?skip=0&limit=20
Response: {
  items: Array<{
    id: string,
    listing: Listing,
    notes: string | null,
    saved_at: string
  }>,
  total: number,
  has_more: boolean
}

// Get Listing Analytics (Sellers)
GET /listings/{listing_id}/analytics
Response: {
  total_views: number,
  unique_views: number,
  views_this_week: number,
  views_this_month: number,
  connection_requests: number,
  approved_connections: number,
  saved_count: number,
  weekly_views: Array<{date, views}>
}

// Search Listings
GET /listings/search?q=dental&location=London&business_type=full_sale
```

### Listing Data Masking Rules

**Before Connection:**
- Description: Truncated/masked
- Exact asking price: Hidden (shows price range instead)
- Financial details: Hidden
- Contact information: Hidden
- Detailed business information: Hidden

**After Connection Approved:**
- Full description visible
- Exact asking price visible
- Financial statements accessible
- Contact information available
- All business details visible

---

## 🔗 Connections & Messaging

### Connection Flow

1. **Buyer** browses listings
2. **Buyer** sends connection request with initial message
3. **Seller** receives notification
4. **Seller** reviews buyer profile and message
5. **Seller** approves or rejects connection
6. If approved → **Messaging unlocked** + **Full listing details visible**

### Connection APIs

```typescript
// Get User Connections
GET /connections?page=1&limit=20&status_filter=pending|approved|rejected&sort_by=recent
Response: {
  connections: Connection[],
  total_count: number,
  pending_count: number,
  approved_count: number,
  rejected_count: number
}

// Create Connection Request (Buyer → Seller)
POST /connections
Body: {
  listing_id: string,
  initial_message: string
}

// Update Connection Status (Seller Response)
PUT /connections/{connection_id}/status
Body: {
  status: "approved" | "rejected",
  response_message?: string
}

// Get Specific Connection
GET /connections/{connection_id}

// Check Connection Status for Listing
GET /connections/status/{listing_id}
Response: {
  has_connection: boolean,
  connection?: Connection
}

// Get Buyer's Sent Requests
GET /connections/buyer/requests?page=1&limit=20

// Get Seller's Received Requests
GET /connections/seller/requests?page=1&limit=20&status_filter=pending

// Seller-to-Buyer Connection (Direct outreach)
POST /connections/seller-to-buyer
Body: {
  buyer_id: string,
  message: string
}

// Get Connection Stats
GET /connections/stats
Response: {
  total_connections: number,
  pending_count: number,
  approved_count: number,
  rejected_count: number,
  total_messages: number,
  unread_messages: number
}
```

### Messaging APIs

```typescript
// Get Messages for Connection
GET /connections/{connection_id}/messages?page=1&limit=50&before_message_id=xxx
Response: {
  messages: Message[],
  total_count: number,
  unread_count: number,
  has_more: boolean
}

// Send Message
POST /connections/{connection_id}/messages
Body: {
  content: string,
  message_type: "text" | "file",
  file_url?: string,
  file_name?: string,
  file_size?: number,
  file_type?: string
}

// Upload File for Message
POST /connections/{connection_id}/messages/upload
FormData: {
  file: File
}
Response: {
  file_url: string,
  file_name: string,
  file_size: number,
  file_type: string
}

// Mark Messages as Read
POST /connections/{connection_id}/messages/read
Body: {
  message_ids: string[]
}

// Edit Message
PUT /connections/{connection_id}/messages/{message_id}
Body: {
  content: string
}

// Delete Message
DELETE /connections/{connection_id}/messages/{message_id}
```

---

## 💳 Subscriptions & Payments

### Subscription Tiers

#### Gold Plan
- **10 connections** per month
- **5 listings** (sellers)
- Basic support
- Standard analytics

#### Silver Plan
- **25 connections** per month
- **10 listings** (sellers)
- Priority support
- Advanced analytics

#### Platinum Plan
- **Unlimited connections**
- **Unlimited listings** (sellers)
- Premium support
- Advanced analytics
- Featured listings

### Subscription APIs

```typescript
// Get Available Plans
GET /subscriptions/plans
Response: {
  plans: Array<{
    id: string,
    name: string,
    price_monthly: number,
    price_yearly: number,
    connection_limit: number,
    listing_limit: number,
    features: {
      priority_support: boolean,
      advanced_analytics: boolean,
      featured_listings: boolean
    }
  }>
}

// Create Checkout Session
POST /stripe/create-checkout-session
Body: {
  plan_id: string,
  billing_cycle: "monthly" | "yearly"
}
Response: {
  checkout_url: string,
  session_id: string
}

// Get Stripe Config
GET /stripe/config
Response: {
  publishable_key: string
}

// Cancel Subscription
POST /stripe/cancel-subscription
```

### Subscription Enforcement

- **Buyers without subscription**: Cannot send connection requests
- **Sellers without subscription**: Cannot create listings
- **Connection limit reached**: Cannot send new requests until next billing cycle or upgrade
- **Listing limit reached**: Cannot create new listings until upgrade

---

## 🛡️ Admin Features

### Admin Dashboard APIs

```typescript
// Get Dashboard Overview
GET /admin/dashboard
Response: {
  overview: {
    total_users: number,
    total_sellers: number,
    total_buyers: number,
    verified_users: number,
    new_users_this_month: number,
    user_growth_percentage: number,
    total_listings: number,
    published_listings: number,
    pending_listings: number,
    total_connections: number,
    active_connections: number,
    active_subscriptions: number,
    revenue_this_month: number,
    pending_service_requests: number
  },
  recent_activity: {
    new_users: User[],
    new_listings: Listing[],
    new_connections: Connection[]
  },
  alerts: Array<{
    type: string,
    message: string,
    count: number,
    priority: string
  }>
}

// User Management
GET /admin/users?page=1&limit=20&user_type=seller&verification_status=pending&search=john
GET /admin/users/{user_id}
PUT /admin/users/{user_id}/verify
Body: {
  status: "approved" | "rejected",
  admin_notes?: string
}
PUT /admin/users/{user_id}/status?is_active=false&admin_notes=Violation

// Listing Management
GET /admin/listings/pending?page=1&limit=20&business_type=full_sale
GET /admin/listings/all?page=1&status=published&search=dental
GET /admin/listings/{listing_id}?edit_id=xxx // For reviewing edits
PUT /admin/listings/{listing_id}/approve?edit_id=xxx
Body: {
  status: "approved" | "rejected",
  admin_notes?: string,
  rejection_reason?: string
}

// Analytics
GET /admin/analytics/platform?period=30d
GET /admin/users/{user_id}/analytics
GET /admin/listings/{listing_id}/connections
GET /listings/{listing_id}/analytics

// User Blocking
POST /admin/users/{user_id}/block
Body: {
  reason: string,
  duration_days?: number
}
POST /admin/users/{user_id}/unblock
GET /admin/users/blocked?page=1&limit=20
```

---

## 🚫 Blocking & Moderation

### Blocking Features

```typescript
// Block User (Buyer/Seller can block each other)
POST /blocking/block/{user_id}
Body: {
  reason: string
}

// Unblock User
POST /blocking/unblock/{user_id}

// Get Blocked Users
GET /blocking/blocked-users?page=1&limit=20
Response: {
  blocked_users: Array<{
    id: string,
    blocked_user: {
      id: string,
      name: string,
      email: string,
      user_type: string
    },
    reason: string,
    blocked_at: string
  }>,
  total: number
}

// Check if User is Blocked
GET /blocking/is-blocked/{user_id}
Response: {
  is_blocked: boolean,
  blocked_by_me: boolean,
  blocked_me: boolean
}
```

**Effects of Blocking:**
- Cannot send connection requests
- Cannot send messages
- Listings hidden from blocked user
- Existing connections remain but messaging disabled

---

## 📊 Analytics & Tracking

### Seller Analytics

```typescript
GET /users/seller-analytics?period=month
Response: {
  profile_visits: number,
  listing_views: number,
  connection_requests: number,
  messages_received: number,
  weekly_trends: Array<{
    date: string,
    views: number,
    connections: number
  }>
}
```

### Listing Analytics

```typescript
GET /listings/{listing_id}/analytics
Response: {
  total_views: number,
  unique_views: number,
  views_this_week: number,
  views_this_month: number,
  connection_requests: number,
  approved_connections: number,
  pending_connections: number,
  saved_count: number,
  conversion_rate: number,
  weekly_views: Array<{date, views}>
}
```

---

## 🔔 Notifications

### Notification Types
- **Connection Request** - New connection request received
- **Connection Approved** - Your connection request was approved
- **Connection Rejected** - Your connection request was rejected
- **New Message** - New message in connection
- **Listing Approved** - Your listing was approved by admin
- **Listing Rejected** - Your listing was rejected by admin
- **Subscription Expiring** - Subscription expiring soon
- **Verification Status** - KYC verification status changed

### Notification APIs

```typescript
// Get Notifications
GET /notifications?page=1&limit=20&unread_only=true

// Mark as Read
PUT /notifications/{notification_id}/read

// Mark All as Read
PUT /notifications/read-all

// Delete Notification
DELETE /notifications/{notification_id}

// Get Unread Count
GET /notifications/unread-count
```

---

## 🎨 Frontend Pages & Features

### Public Pages
- **Landing Page** - Marketing homepage
- **Login** - User authentication
- **Register** - New user signup
- **Email Verification** - OTP verification
- **Forgot Password** - Password reset request
- **Reset Password** - Set new password

### Buyer Pages
- **Buyer Dashboard** - Overview, stats, recent activity
- **Browse Listings** - Search and filter listings
- **Listing Detail** - View listing (masked/unmasked based on connection)
- **Saved Listings** - Bookmarked listings
- **Enquiry History** - Connection requests sent
- **Messages** - All conversations
- **Message Thread** - Individual conversation
- **Profile** - Edit profile information
- **Subscriptions** - Manage subscription plan
- **Blocked Users** - Manage blocked users

### Seller Pages
- **Seller Dashboard** - Overview, analytics, listings performance
- **My Listings** - All created listings
- **Create Listing** - New listing form
- **Edit Listing** - Update existing listing
- **Listing Detail** - View own listing with analytics
- **KYC Upload** - Submit verification documents
- **Enquiry History** - Connection requests received
- **Messages** - All conversations with buyers
- **Profile** - Edit profile and business information
- **Subscriptions** - Manage subscription plan
- **Blocked Users** - Manage blocked users

### Admin Pages
- **Admin Dashboard** - Platform overview and stats
- **Users Management** - All users, verification, blocking
- **Buyers Management** - Buyer-specific view
- **Buyer Detail** - Individual buyer analytics
- **Sellers Management** - Seller-specific view
- **Seller Detail** - Individual seller analytics
- **Pending Listings** - Review and approve listings
- **All Listings** - View all listings on platform
- **Listing Detail** - Full listing information
- **Listing Analytics** - Detailed listing performance
- **Listing Conversations** - View all connections for a listing
- **Platform Analytics** - Overall platform metrics
- **Services Management** - Handle service requests
- **Blocked Users** - View and manage blocked users

---

## 🔒 Security & Permissions

### Authentication
- **JWT tokens** with refresh token rotation
- **Access token** expires in 30 minutes
- **Refresh token** expires in 7 days
- Tokens stored in localStorage (mobile: SecureStore)

### Authorization Levels
1. **Public** - No authentication required
2. **Authenticated** - Any logged-in user
3. **Buyer Only** - Buyer role required
4. **Seller Only** - Seller role required
5. **Admin Only** - Admin role required

### Data Privacy
- **Masked listings** - Sensitive data hidden until connection
- **Connection-based access** - Full details only after approval
- **User blocking** - Users can block each other
- **Admin moderation** - All listings reviewed before publishing
- **GDPR compliance** - Data export and deletion available

---

## 📱 Mobile App Considerations

### Key Features for Mobile

#### 1. **Push Notifications**
- New connection requests
- Connection approved/rejected
- New messages
- Listing status updates
- Subscription reminders

#### 2. **Camera Integration**
- Take photos for listings
- Upload KYC documents
- Profile pictures

#### 3. **Offline Capabilities**
- Cache viewed listings
- Draft listings saved locally
- Message queue for offline sending

#### 4. **Mobile-Optimized UI**
- Swipe gestures for navigation
- Bottom tab navigation
- Pull-to-refresh
- Infinite scroll for listings
- Image gallery viewer
- In-app browser for external links

#### 5. **Location Services**
- Auto-detect location for search
- Map view for listings
- Distance calculations

#### 6. **File Handling**
- Document picker for uploads
- PDF viewer for documents
- Image compression before upload

### Recommended React Native Libraries

```json
{
  "dependencies": {
    "@react-navigation/native": "Navigation",
    "@react-navigation/bottom-tabs": "Tab navigation",
    "@react-navigation/stack": "Stack navigation",
    "react-native-gesture-handler": "Gestures",
    "react-native-reanimated": "Animations",
    "axios": "API calls",
    "@reduxjs/toolkit": "State management",
    "react-redux": "Redux bindings",
    "react-native-paper": "UI components",
    "react-native-vector-icons": "Icons",
    "react-native-image-picker": "Camera/gallery",
    "react-native-document-picker": "File picker",
    "react-native-pdf": "PDF viewer",
    "react-native-maps": "Maps",
    "react-native-push-notification": "Push notifications",
    "@react-native-async-storage/async-storage": "Local storage",
    "react-native-keychain": "Secure token storage",
    "react-native-fast-image": "Image caching",
    "react-native-webview": "Web views",
    "react-native-share": "Share functionality",
    "react-native-permissions": "Permission handling",
    "@stripe/stripe-react-native": "Stripe payments"
  }
}
```

### API Base URL Configuration

```typescript
// config.ts
export const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:8000/api/v1',
  },
  staging: {
    baseURL: 'https://staging-api.eaglehurst.com/api/v1',
  },
  production: {
    baseURL: 'https://api.eaglehurst.com/api/v1',
  },
};
```

### Storage Strategy

```typescript
// Secure Storage (tokens, sensitive data)
import * as SecureStore from 'expo-secure-store';

// Regular Storage (user preferences, cache)
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token Management
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
const token = await SecureStore.getItemAsync(TOKEN_KEY);
```

---

## 🚀 Getting Started with Mobile Development

### 1. **Set Up Project**
```bash
npx react-native init EaglehurstMobile --template react-native-template-typescript
cd EaglehurstMobile
```

### 2. **Install Core Dependencies**
```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install axios
npm install react-native-paper react-native-vector-icons
```

### 3. **Project Structure**
```
src/
├── api/
│   ├── client.ts          # Axios instance
│   ├── auth.api.ts        # Auth endpoints
│   ├── listings.api.ts    # Listings endpoints
│   ├── connections.api.ts # Connections endpoints
│   └── ...
├── components/
│   ├── common/            # Reusable components
│   ├── listings/          # Listing components
│   └── ...
├── screens/
│   ├── auth/              # Auth screens
│   ├── buyer/             # Buyer screens
│   ├── seller/            # Seller screens
│   └── ...
├── navigation/
│   ├── AppNavigator.tsx   # Main navigation
│   ├── AuthNavigator.tsx  # Auth flow
│   └── ...
├── store/
│   ├── slices/            # Redux slices
│   └── store.ts           # Redux store
├── types/
│   └── index.ts           # TypeScript types
├── utils/
│   ├── storage.ts         # Storage utilities
│   ├── validation.ts      # Form validation
│   └── ...
└── constants/
    └── index.ts           # App constants
```

### 4. **Key Implementation Points**

#### Authentication Flow
```typescript
// AuthNavigator.tsx
<Stack.Navigator>
  <Stack.Screen name="Login" component={LoginScreen} />
  <Stack.Screen name="Register" component={RegisterScreen} />
  <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
</Stack.Navigator>
```

#### Main App Navigation
```typescript
// AppNavigator.tsx
<Tab.Navigator>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Listings" component={ListingsScreen} />
  <Tab.Screen name="Messages" component={MessagesScreen} />
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
```

#### API Client Setup
```typescript
// api/client.ts
import axios from 'axios';
import { getToken, refreshAuthToken } from '../utils/storage';

const apiClient = axios.create({
  baseURL: API_CONFIG.production.baseURL,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      await refreshAuthToken();
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 📝 Important Business Rules

### Connection Limits
- Enforced at subscription level
- Resets monthly
- Platinum = unlimited
- Tracked in real-time

### Listing Approval
- All new listings require admin approval
- Edits to published listings also require approval
- Sellers notified of approval/rejection

### Data Masking
- Automatic based on connection status
- Cannot be bypassed
- Enforced at API level

### Verification Requirements
- Sellers must complete KYC before creating listings
- Buyers can browse without verification
- Verification required for subscriptions

### Subscription Requirements
- Buyers need subscription to send connection requests
- Sellers need subscription to create listings
- Free tier allows browsing only

---

## 🔍 Search & Filtering

### Available Filters
- **Business Type**: Full sale, Partial sale, Fundraising
- **Location**: City, Region, Postcode
- **Price Range**: Min/Max price
- **Practice Type**: GP, Dental, Pharmacy, etc.
- **NHS Contract**: Yes/No
- **CQC Registered**: Yes/No
- **Patient List Size**: Range
- **Staff Count**: Range
- **Premises Type**: Owned/Leased

### Sort Options
- **Price**: Low to High, High to Low
- **Date**: Newest First, Oldest First
- **Relevance**: Search relevance score
- **Popularity**: Most viewed, Most saved

---

## 💡 Best Practices for Mobile App

1. **Error Handling**: Show user-friendly error messages
2. **Loading States**: Display loaders for all async operations
3. **Optimistic Updates**: Update UI before API response for better UX
4. **Image Optimization**: Compress images before upload
5. **Pagination**: Implement infinite scroll for listings
6. **Caching**: Cache API responses to reduce network calls
7. **Offline Support**: Queue actions when offline
8. **Push Notifications**: Implement for real-time updates
9. **Deep Linking**: Support deep links to specific listings/messages
10. **Analytics**: Track user behavior and app performance

---

## 📞 Support & Additional Services

### Service Request Types
- **Legal Services**: Contract review, legal advice
- **Valuation Services**: Business valuation, financial assessment

### Service Request APIs
```typescript
POST /services/request
Body: {
  service_type: "legal" | "valuation",
  listing_id?: string,
  details: {
    description: string,
    urgency: "low" | "medium" | "high",
    preferred_contact: "email" | "phone",
    additional_info?: string
  }
}

GET /services/requests?page=1&limit=20
```

---

## 🎯 Summary for Mobile Development

### Must-Have Features (MVP)
1. ✅ User registration & authentication
2. ✅ Browse listings with filters
3. ✅ View listing details (with masking)
4. ✅ Send connection requests
5. ✅ Messaging system
6. ✅ Subscription management
7. ✅ Profile management
8. ✅ Push notifications

### Phase 2 Features
1. ✅ Create/edit listings (sellers)
2. ✅ KYC document upload
3. ✅ Analytics dashboard
4. ✅ Saved listings
5. ✅ Advanced search
6. ✅ User blocking
7. ✅ Service requests

### Phase 3 Features
1. ✅ Admin panel (separate app or web)
2. ✅ In-app payments
3. ✅ Video calls
4. ✅ Document sharing
5. ✅ Advanced analytics
6. ✅ Referral system

---

## 📚 Additional Resources

- **API Base URL**: `https://api.eaglehurst.com/api/v1`
- **Stripe Publishable Key**: Get from `/stripe/config`
- **Image Upload**: Use FormData with multipart/form-data
- **File Size Limits**: 10MB per file, 50MB total per listing
- **Supported Image Formats**: JPG, PNG, WebP
- **Supported Document Formats**: PDF, DOC, DOCX

---

This documentation covers the complete application structure, all APIs, user flows, and mobile development considerations. Use this as your reference guide for building the React Native mobile app! 🚀

