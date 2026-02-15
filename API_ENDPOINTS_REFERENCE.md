# Eaglehurst API Endpoints - Complete Reference

## Base URL
```
Production: https://api.eaglehurst.com/api/v1
Development: http://localhost:8000/api/v1
```

---

## 🔐 Authentication Endpoints

### POST `/auth/register`
**Description**: Register a new user (buyer or seller)
**Auth Required**: No
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "user_type": "buyer",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+447700900000"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "verification_required": true,
    "verification_token": "token_string"
  }
}
```

---

### POST `/auth/login`
**Description**: User login
**Auth Required**: No
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "buyer",
      "is_verified": true,
      "first_name": "John",
      "last_name": "Doe",
      "notification": {
        "type": "info",
        "title": "Welcome Back",
        "message": "You have 3 new messages"
      }
    }
  }
}
```

---

### POST `/auth/verify-email-token`
**Description**: Verify email with OTP
**Auth Required**: No
**Request Body**:
```json
{
  "verification_token": "token_from_registration",
  "otp": "123456"
}
```

---

### POST `/auth/resend-otp-token`
**Description**: Resend OTP for email verification
**Auth Required**: No
**Request Body**:
```json
{
  "verification_token": "token_from_registration"
}
```

---

### GET `/auth/me`
**Description**: Get current user profile
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "user_type": "buyer",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+447700900000",
    "is_verified": true,
    "buyer_profile": {
      "verification_status": "approved",
      "subscription": {
        "type": "gold",
        "name": "Gold Plan",
        "status": "active",
        "expires_at": "2024-12-31T23:59:59Z",
        "limits": {
          "connections": 10,
          "listings": 5
        },
        "usage": {
          "connections_used": 3,
          "listings_used": 0
        },
        "features": {
          "priority_support": true,
          "advanced_analytics": true,
          "featured_listings": false
        }
      }
    }
  }
}
```

---

### POST `/auth/forgot-password`
**Description**: Request password reset
**Auth Required**: No
**Request Body**:
```json
{
  "email": "user@example.com"
}
```

---

### POST `/auth/reset-password`
**Description**: Reset password with token
**Auth Required**: No
**Request Body**:
```json
{
  "token": "reset_token",
  "new_password": "NewSecurePass123!"
}
```

---

### POST `/auth/refresh-token`
**Description**: Refresh access token
**Auth Required**: No
**Request Body**:
```json
{
  "refresh_token": "refresh_token_string"
}
```

---

### POST `/auth/logout`
**Description**: Logout user
**Auth Required**: Yes

---

## 👤 User Management Endpoints

### GET `/users/profile`
**Description**: Get user profile
**Auth Required**: Yes
**Response**: Same as `/auth/me`

---

### PUT `/users/profile`
**Description**: Update user profile
**Auth Required**: Yes
**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+447700900000",
  "business_name": "Medical Practice Ltd"
}
```

---

### POST `/users/seller-verification`
**Description**: Submit seller KYC verification
**Auth Required**: Yes (Seller only)
**Content-Type**: multipart/form-data
**Request Body**:
```
business_name: "Medical Practice Ltd"
business_description: "GP practice in London"
business_type: "GP Practice"
business_address: "123 High Street, London, UK"
license_document: File
identity_document: File
additional_documents: File[]
```

---

### GET `/users/seller-analytics`
**Description**: Get seller analytics
**Auth Required**: Yes (Seller only)
**Query Params**: `?period=week|month|year`
**Response**:
```json
{
  "success": true,
  "data": {
    "profile_visits": 150,
    "listing_views": 450,
    "connection_requests": 12,
    "messages_received": 34,
    "weekly_trends": [
      {
        "date": "2024-01-01",
        "views": 45,
        "connections": 2
      }
    ]
  }
}
```

---

### POST `/users/change-password`
**Description**: Change user password
**Auth Required**: Yes
**Request Body**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

---

### GET `/users/subscription-status`
**Description**: Get subscription status and usage
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "active": true,
    "plan": "gold",
    "expires_at": "2024-12-31T23:59:59Z",
    "usage": {
      "connections_used": 3,
      "connections_limit": 10,
      "listings_used": 2,
      "listings_limit": 5
    }
  }
}
```

---

### GET `/users/notification-preferences`
**Description**: Get notification preferences
**Auth Required**: Yes

---

### PUT `/users/notification-preferences`
**Description**: Update notification preferences
**Auth Required**: Yes
**Request Body**:
```json
{
  "email_notifications": true,
  "push_notifications": true,
  "marketing_emails": false,
  "connection_requests": true,
  "messages": true,
  "listing_updates": true
}
```

---

## 📋 Listings Endpoints

### GET `/listings`
**Description**: Browse all published listings
**Auth Required**: Yes
**Query Params**:
```
?page=1
&limit=20
&business_type=full_sale|partial_sale|fundraising
&location=London
&min_price=100000
&max_price=500000
&sort_by=price|created_at|updated_at
&sort_order=asc|desc
&practice_type=GP|Dental|Pharmacy
&nhs_contract=true|false
&cqc_registered=true|false
```
**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Established GP Practice",
        "description": "Well-established practice...",
        "business_type": "full_sale",
        "location": "London",
        "asking_price": null,
        "price_range": "£500,000 - £750,000",
        "media_files": [
          {
            "id": "uuid",
            "file_url": "https://...",
            "file_type": "image",
            "is_primary": true
          }
        ],
        "is_connected": false,
        "status": "published",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 200,
      "items_per_page": 20
    }
  }
}
```

---

### GET `/listings/{listing_id}`
**Description**: Get single listing details
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Established GP Practice",
    "description": "Full description (masked if not connected)",
    "business_type": "full_sale",
    "location": "London",
    "postcode": "SW1A 1AA",
    "region": "Greater London",
    "asking_price": 650000,
    "is_connected": true,
    "media_files": [...],
    "business_details": {
      "practice_name": "Health First Medical",
      "practice_type": "GP Practice",
      "nhs_contract": true,
      "nhs_contract_details": "GMS contract",
      "patient_list_size": 5000,
      "staff_count": 12,
      "premises_type": "leased",
      "cqc_registered": true,
      "cqc_registration_number": "CQC123456",
      "annual_revenue": 800000,
      "net_profit": 200000
    },
    "seller_info": {
      "business_name": "Medical Practice Ltd",
      "contact_available": true
    }
  }
}
```

---

### POST `/listings`
**Description**: Create new listing
**Auth Required**: Yes (Seller only)
**Request Body**:
```json
{
  "title": "Established GP Practice",
  "description": "Well-established practice with loyal patient base...",
  "business_type": "full_sale",
  "location": "London",
  "postcode": "SW1A 1AA",
  "region": "Greater London",
  "asking_price": 650000,
  "practice_name": "Health First Medical",
  "practice_type": "GP Practice",
  "premises_type": "leased",
  "nhs_contract": true,
  "nhs_contract_details": "GMS contract",
  "private_patient_base": 500,
  "staff_count": 12,
  "patient_list_size": 5000,
  "equipment_inventory": "Full dental equipment...",
  "cqc_registered": true,
  "cqc_registration_number": "CQC123456",
  "professional_indemnity_insurance": true,
  "insurance_details": "Covered by Medical Defence Union",
  "lease_agreement_details": "10 year lease, 5 years remaining",
  "property_value": 300000,
  "goodwill_valuation": 350000,
  "annual_revenue": 800000,
  "net_profit": 200000,
  "is_draft": false
}
```

---

### PUT `/listings/{listing_id}`
**Description**: Update listing
**Auth Required**: Yes (Seller only, own listing)
**Request Body**: Same as create (partial updates allowed)

---

### DELETE `/listings/{listing_id}`
**Description**: Delete listing
**Auth Required**: Yes (Seller only, own listing)

---

### POST `/listings/{listing_id}/media`
**Description**: Upload media files
**Auth Required**: Yes (Seller only, own listing)
**Content-Type**: multipart/form-data
**Request Body**:
```
media_files: File[]
```

---

### DELETE `/listings/{listing_id}/media/{media_id}`
**Description**: Delete media file
**Auth Required**: Yes (Seller only, own listing)

---

### PUT `/listings/{listing_id}/media/{media_id}/primary`
**Description**: Set primary media
**Auth Required**: Yes (Seller only, own listing)

---

### GET `/listings/seller/my-listings`
**Description**: Get seller's own listings
**Auth Required**: Yes (Seller only)
**Query Params**: `?page=1&limit=20&status=published|draft|pending`

---

### POST `/listings/{listing_id}/save`
**Description**: Save listing to favorites
**Auth Required**: Yes (Buyer only)

---

### DELETE `/listings/{listing_id}/save`
**Description**: Remove from favorites
**Auth Required**: Yes (Buyer only)

---

### GET `/listings/saved`
**Description**: Get saved listings
**Auth Required**: Yes (Buyer only)
**Query Params**: `?skip=0&limit=20`
**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "listing": {...},
        "notes": null,
        "saved_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "has_more": false
  }
}
```

---

### GET `/listings/{listing_id}/analytics`
**Description**: Get listing analytics
**Auth Required**: Yes (Seller only, own listing)
**Response**:
```json
{
  "success": true,
  "data": {
    "total_views": 450,
    "unique_views": 320,
    "views_this_week": 45,
    "views_this_month": 180,
    "connection_requests": 12,
    "approved_connections": 8,
    "pending_connections": 2,
    "saved_count": 15,
    "conversion_rate": 2.67,
    "weekly_views": [
      {
        "date": "2024-01-01",
        "views": 45
      }
    ]
  }
}
```

---

## 🔗 Connection Endpoints

### GET `/connections`
**Description**: Get user's connections
**Auth Required**: Yes
**Query Params**: `?page=1&limit=20&status_filter=pending|approved|rejected&sort_by=recent`
**Response**:
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "uuid",
        "buyer_id": "uuid",
        "seller_id": "uuid",
        "listing_id": "uuid",
        "status": "approved",
        "initial_message": "I'm interested in this practice...",
        "response_message": "Thank you for your interest...",
        "seller_initiated": false,
        "requested_at": "2024-01-01T00:00:00Z",
        "responded_at": "2024-01-02T00:00:00Z",
        "last_activity": "2024-01-05T10:30:00Z",
        "listing": {
          "id": "uuid",
          "title": "Established GP Practice",
          "location": "London",
          "asking_price": 650000,
          "business_type": "full_sale"
        },
        "other_party": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "user_type": "buyer",
          "business_name": "Medical Investments Ltd"
        },
        "unread_messages": 2,
        "last_message": {
          "content": "When can we schedule a viewing?",
          "created_at": "2024-01-05T10:30:00Z",
          "sender_name": "John Doe"
        }
      }
    ],
    "total_count": 15,
    "pending_count": 3,
    "approved_count": 10,
    "rejected_count": 2
  }
}
```

---

### POST `/connections`
**Description**: Create connection request (buyer to seller)
**Auth Required**: Yes (Buyer only)
**Request Body**:
```json
{
  "listing_id": "uuid",
  "initial_message": "I'm very interested in purchasing this practice. I have experience in medical practice management and would like to discuss further."
}
```

---

### PUT `/connections/{connection_id}/status`
**Description**: Update connection status (seller response)
**Auth Required**: Yes (Seller only)
**Request Body**:
```json
{
  "status": "approved",
  "response_message": "Thank you for your interest. I'd be happy to discuss this opportunity with you."
}
```

---

### GET `/connections/{connection_id}`
**Description**: Get specific connection details
**Auth Required**: Yes

---

### GET `/connections/status/{listing_id}`
**Description**: Check connection status for a listing
**Auth Required**: Yes (Buyer only)
**Response**:
```json
{
  "success": true,
  "data": {
    "has_connection": true,
    "connection": {...}
  }
}
```

---

### POST `/connections/seller-to-buyer`
**Description**: Seller initiates connection to buyer
**Auth Required**: Yes (Seller only)
**Request Body**:
```json
{
  "buyer_id": "uuid",
  "message": "I noticed your interest in medical practices. I have a listing that might interest you."
}
```

---

### GET `/connections/buyer/requests`
**Description**: Get buyer's sent requests
**Auth Required**: Yes (Buyer only)
**Query Params**: `?page=1&limit=20`

---

### GET `/connections/seller/requests`
**Description**: Get seller's received requests
**Auth Required**: Yes (Seller only)
**Query Params**: `?page=1&limit=20&status_filter=pending`

---

### GET `/connections/stats`
**Description**: Get connection statistics
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "total_connections": 15,
    "pending_count": 3,
    "approved_count": 10,
    "rejected_count": 2,
    "total_messages": 145,
    "unread_messages": 5
  }
}
```

---

## 💬 Messaging Endpoints

### GET `/connections/{connection_id}/messages`
**Description**: Get messages for a connection
**Auth Required**: Yes
**Query Params**: `?page=1&limit=50&before_message_id=xxx&after_message_id=xxx`
**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "connection_id": "uuid",
        "sender_id": "uuid",
        "content": "When can we schedule a viewing?",
        "message_type": "text",
        "is_read": false,
        "read_at": null,
        "is_edited": false,
        "sender_name": "John Doe",
        "sender_type": "buyer",
        "created_at": "2024-01-05T10:30:00Z"
      }
    ],
    "total_count": 25,
    "unread_count": 3,
    "has_more": true
  }
}
```

---

### POST `/connections/{connection_id}/messages`
**Description**: Send message
**Auth Required**: Yes
**Request Body**:
```json
{
  "content": "I'm available next Tuesday at 2 PM for a viewing.",
  "message_type": "text"
}
```

---

### POST `/connections/{connection_id}/messages/upload`
**Description**: Upload file for message
**Auth Required**: Yes
**Content-Type**: multipart/form-data
**Request Body**:
```
file: File
```
**Response**:
```json
{
  "success": true,
  "data": {
    "file_url": "https://...",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf"
  }
}
```

---

### POST `/connections/{connection_id}/messages/read`
**Description**: Mark messages as read
**Auth Required**: Yes
**Request Body**:
```json
{
  "message_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### PUT `/connections/{connection_id}/messages/{message_id}`
**Description**: Edit message
**Auth Required**: Yes
**Request Body**:
```json
{
  "content": "Updated message content"
}
```

---

### DELETE `/connections/{connection_id}/messages/{message_id}`
**Description**: Delete message
**Auth Required**: Yes

---

## 💳 Subscription & Payment Endpoints

### GET `/subscriptions/plans`
**Description**: Get available subscription plans
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "gold",
        "name": "Gold Plan",
        "price_monthly": 99.99,
        "price_yearly": 999.99,
        "connection_limit": 10,
        "listing_limit": 5,
        "features": {
          "priority_support": true,
          "advanced_analytics": true,
          "featured_listings": false
        }
      },
      {
        "id": "platinum",
        "name": "Platinum Plan",
        "price_monthly": 199.99,
        "price_yearly": 1999.99,
        "connection_limit": -1,
        "listing_limit": -1,
        "features": {
          "priority_support": true,
          "advanced_analytics": true,
          "featured_listings": true
        }
      }
    ]
  }
}
```

---

### POST `/stripe/create-checkout-session`
**Description**: Create Stripe checkout session
**Auth Required**: Yes
**Request Body**:
```json
{
  "plan_id": "gold",
  "billing_cycle": "monthly"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_test_..."
  }
}
```

---

### GET `/stripe/config`
**Description**: Get Stripe publishable key
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "publishable_key": "pk_test_..."
  }
}
```

---

### POST `/stripe/cancel-subscription`
**Description**: Cancel current subscription
**Auth Required**: Yes

---

## 🚫 Blocking Endpoints

### POST `/blocking/block/{user_id}`
**Description**: Block a user
**Auth Required**: Yes
**Request Body**:
```json
{
  "reason": "Inappropriate behavior"
}
```

---

### POST `/blocking/unblock/{user_id}`
**Description**: Unblock a user
**Auth Required**: Yes

---

### GET `/blocking/blocked-users`
**Description**: Get blocked users
**Auth Required**: Yes
**Query Params**: `?page=1&limit=20`
**Response**:
```json
{
  "success": true,
  "data": {
    "blocked_users": [
      {
        "id": "uuid",
        "blocked_user": {
          "id": "uuid",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "user_type": "seller"
        },
        "reason": "Spam messages",
        "blocked_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 2
  }
}
```

---

### GET `/blocking/is-blocked/{user_id}`
**Description**: Check if user is blocked
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "is_blocked": true,
    "blocked_by_me": true,
    "blocked_me": false
  }
}
```

---

## 🛡️ Admin Endpoints

### GET `/admin/dashboard`
**Description**: Get admin dashboard overview
**Auth Required**: Yes (Admin only)
**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1250,
      "total_sellers": 450,
      "total_buyers": 780,
      "verified_users": 1100,
      "new_users_this_month": 85,
      "user_growth_percentage": 12.5,
      "total_listings": 320,
      "published_listings": 280,
      "pending_listings": 25,
      "draft_listings": 15,
      "total_connections": 1500,
      "active_connections": 1200,
      "pending_connections": 150,
      "active_subscriptions": 950,
      "revenue_this_month": 45000,
      "pending_service_requests": 8
    },
    "recent_activity": {
      "new_users": [...],
      "new_listings": [...],
      "new_connections": [...]
    },
    "alerts": [
      {
        "type": "verification_pending",
        "message": "Seller verifications pending",
        "count": 12,
        "priority": "high"
      }
    ]
  }
}
```

---

### GET `/admin/users`
**Description**: Get all users
**Auth Required**: Yes (Admin only)
**Query Params**: `?page=1&limit=20&user_type=seller&verification_status=pending&search=john`

---

### GET `/admin/users/{user_id}`
**Description**: Get user details
**Auth Required**: Yes (Admin only)

---

### PUT `/admin/users/{user_id}/verify`
**Description**: Verify user
**Auth Required**: Yes (Admin only)
**Request Body**:
```json
{
  "status": "approved",
  "admin_notes": "All documents verified"
}
```

---

### PUT `/admin/users/{user_id}/status`
**Description**: Update user status (activate/deactivate)
**Auth Required**: Yes (Admin only)
**Query Params**: `?is_active=false&admin_notes=Policy violation`

---

### POST `/admin/users/{user_id}/block`
**Description**: Block user (admin)
**Auth Required**: Yes (Admin only)
**Request Body**:
```json
{
  "reason": "Terms of service violation",
  "duration_days": 30
}
```

---

### POST `/admin/users/{user_id}/unblock`
**Description**: Unblock user (admin)
**Auth Required**: Yes (Admin only)

---

### GET `/admin/users/blocked`
**Description**: Get all blocked users
**Auth Required**: Yes (Admin only)
**Query Params**: `?page=1&limit=20`

---

### GET `/admin/listings/pending`
**Description**: Get pending listings for approval
**Auth Required**: Yes (Admin only)
**Query Params**: `?page=1&limit=20&business_type=full_sale`

---

### GET `/admin/listings/all`
**Description**: Get all listings
**Auth Required**: Yes (Admin only)
**Query Params**: `?page=1&limit=20&status=published&business_type=full_sale&search=dental&sort_by=created_at&sort_order=desc`

---

### GET `/admin/listings/{listing_id}`
**Description**: Get listing for review
**Auth Required**: Yes (Admin only)
**Query Params**: `?edit_id=xxx` (for reviewing edits)

---

### PUT `/admin/listings/{listing_id}/approve`
**Description**: Approve or reject listing
**Auth Required**: Yes (Admin only)
**Query Params**: `?edit_id=xxx` (for approving edits)
**Request Body**:
```json
{
  "status": "approved",
  "admin_notes": "Listing approved",
  "rejection_reason": null
}
```

---

### GET `/admin/listings/{listing_id}/connections`
**Description**: Get all connections for a listing
**Auth Required**: Yes (Admin only)

---

### GET `/admin/analytics/platform`
**Description**: Get platform analytics
**Auth Required**: Yes (Admin only)
**Query Params**: `?period=30d`

---

### GET `/admin/users/{user_id}/analytics`
**Description**: Get user analytics
**Auth Required**: Yes (Admin only)

---

## 🔔 Notification Endpoints

### GET `/notifications`
**Description**: Get user notifications
**Auth Required**: Yes
**Query Params**: `?page=1&limit=20&unread_only=true`

---

### PUT `/notifications/{notification_id}/read`
**Description**: Mark notification as read
**Auth Required**: Yes

---

### PUT `/notifications/read-all`
**Description**: Mark all notifications as read
**Auth Required**: Yes

---

### DELETE `/notifications/{notification_id}`
**Description**: Delete notification
**Auth Required**: Yes

---

### GET `/notifications/unread-count`
**Description**: Get unread notification count
**Auth Required**: Yes
**Response**:
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

## 🛠️ Service Request Endpoints

### POST `/services/request`
**Description**: Request additional service
**Auth Required**: Yes
**Request Body**:
```json
{
  "service_type": "legal",
  "listing_id": "uuid",
  "details": {
    "description": "Need legal review of practice sale contract",
    "urgency": "high",
    "preferred_contact": "email",
    "additional_info": "Available for consultation next week"
  }
}
```

---

### GET `/services/requests`
**Description**: Get user's service requests
**Auth Required**: Yes
**Query Params**: `?page=1&limit=20`

---

## 📊 Analytics Endpoints

### GET `/analytics/listing-views`
**Description**: Track listing view
**Auth Required**: Yes
**Query Params**: `?listing_id=uuid`

---

## 🔄 Error Response Format

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or missing authentication
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `SUBSCRIPTION_REQUIRED` - Valid subscription required
- `VERIFICATION_REQUIRED` - Account verification required
- `CONNECTION_LIMIT_REACHED` - Monthly connection limit exceeded
- `LISTING_LIMIT_REACHED` - Listing creation limit exceeded
- `USER_BLOCKED` - User is blocked
- `NETWORK_ERROR` - Network error occurred

---

## 📝 Notes

1. **Authentication**: All protected endpoints require `Authorization: Bearer {token}` header
2. **Pagination**: Default page size is 20, maximum is 100
3. **File Uploads**: Use `multipart/form-data` content type
4. **File Size Limits**: 10MB per file, 50MB total per request
5. **Rate Limiting**: 100 requests per minute per user
6. **Date Format**: ISO 8601 (e.g., `2024-01-01T00:00:00Z`)
7. **Currency**: All prices in GBP (£)
8. **Connection Limit**: -1 means unlimited (Platinum plan)

---

This reference covers all available API endpoints in the Eaglehurst platform! 🚀

