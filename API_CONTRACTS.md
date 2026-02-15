# Eaglehurst - API Contracts

## Base Configuration

**Base URL**: `https://api.eaglehurst.com/v1`
**Authentication**: Bearer JWT Token
**Content-Type**: `application/json`

## Authentication Endpoints

### POST /auth/register
Register a new user

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "user_type": "buyer" | "seller",
  "first_name": "string",
  "last_name": "string",
  "phone": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user_id": "uuid",
    "email": "string",
    "verification_required": true
  }
}
```

### POST /auth/login
User login

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "user": {
      "id": "uuid",
      "email": "string",
      "user_type": "string",
      "is_verified": true
    }
  }
}
```

### POST /auth/verify-email
Verify email with OTP

**Request Body:**
```json
{
  "email": "string",
  "otp": "string"
}
```

### POST /auth/refresh-token
Refresh access token

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

## User Management Endpoints

### GET /users/profile
Get current user profile

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "string",
    "user_type": "string",
    "profile": {
      "first_name": "string",
      "last_name": "string",
      "phone": "string",
      "verification_status": "string",
      "subscription": {
        "type": "string",
        "expires_at": "datetime",
        "limits": {
          "connections": 10,
          "listings": 5
        }
      }
    }
  }
}
```

### PUT /users/profile
Update user profile

**Request Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "business_name": "string" // for sellers
}
```

### POST /users/kyc-upload
Upload KYC documents (Sellers only)

**Content-Type:** `multipart/form-data`

**Request Body:**
```
license_document: File
identity_document: File
additional_documents: File[]
```

## Listings Endpoints

### GET /listings
Get all published listings (with filtering)

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `business_type`: "full_sale" | "partial_sale" | "fundraising"
- `location`: string
- `min_price`: number
- `max_price`: number
- `sort_by`: "price" | "created_at" | "updated_at"
- `sort_order`: "asc" | "desc"

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string", // masked for non-connected buyers
        "business_type": "string",
        "location": "string",
        "asking_price": "number", // may be masked
        "images": ["string"],
        "created_at": "datetime",
        "is_connected": false // indicates if buyer is connected to seller
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

### GET /listings/{listing_id}
Get specific listing details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "business_type": "string",
    "location": "string",
    "asking_price": "number",
    "financial_data": {}, // only visible if connected
    "media_files": ["string"],
    "seller_info": {
      "business_name": "string",
      "contact_available": true
    },
    "created_at": "datetime",
    "is_connected": false
  }
}
```

### POST /listings
Create new listing (Sellers only)

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "business_type": "full_sale" | "partial_sale" | "fundraising",
  "location": "string",
  "asking_price": "number",
  "business_details": {
    "practice_name": "string",
    "practice_type": "string",
    "nhs_contract": "boolean",
    "patient_list_size": "number",
    "staff_count": "number",
    "premises_type": "owned" | "leased",
    "cqc_registered": "boolean",
    "annual_revenue": "number",
    "net_profit": "number"
  },
  "scheduled_publish_date": "datetime", // optional
  "is_draft": "boolean"
}
```

### PUT /listings/{listing_id}
Update listing (Sellers only)

### DELETE /listings/{listing_id}
Delete listing (Sellers only)

### POST /listings/{listing_id}/media
Upload media files for listing

**Content-Type:** `multipart/form-data`

## Connections Endpoints

### POST /connections
Send connection request to seller

**Request Body:**
```json
{
  "listing_id": "uuid",
  "message": "string" // optional introduction message
}
```

### GET /connections
Get user's connections

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "uuid",
        "listing": {
          "id": "uuid",
          "title": "string"
        },
        "other_party": {
          "name": "string",
          "user_type": "buyer" | "seller"
        },
        "status": "pending" | "approved" | "rejected",
        "created_at": "datetime",
        "last_message": {
          "content": "string",
          "timestamp": "datetime"
        }
      }
    ]
  }
}
```

### PUT /connections/{connection_id}
Approve/reject connection request (Sellers only)

**Request Body:**
```json
{
  "status": "approved" | "rejected",
  "message": "string" // optional response message
}
```

## Messaging Endpoints

### GET /connections/{connection_id}/messages
Get messages for a connection

**Query Parameters:**
- `page`: number
- `limit`: number

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "content": "string",
        "message_type": "text" | "file" | "system",
        "is_read": "boolean",
        "created_at": "datetime"
      }
    ]
  }
}
```

### POST /connections/{connection_id}/messages
Send message

**Request Body:**
```json
{
  "content": "string",
  "message_type": "text" | "file"
}
```

### PUT /messages/{message_id}/read
Mark message as read

## Subscriptions Endpoints

### GET /subscriptions
Get available subscription plans

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Gold",
        "price": 99.99,
        "currency": "GBP",
        "billing_cycle": "monthly",
        "features": {
          "connection_limit": 10,
          "listing_limit": 5,
          "priority_support": true,
          "advanced_analytics": true
        }
      }
    ]
  }
}
```

### POST /subscriptions/subscribe
Subscribe to a plan

**Request Body:**
```json
{
  "plan_id": "uuid",
  "payment_method_id": "string" // Stripe payment method ID
}
```

### POST /subscriptions/cancel
Cancel current subscription

## Services Endpoints

### POST /services/request
Request additional service

**Request Body:**
```json
{
  "service_type": "legal" | "valuation",
  "listing_id": "uuid", // optional, if related to specific listing
  "details": {
    "description": "string",
    "urgency": "low" | "medium" | "high",
    "preferred_contact": "email" | "phone",
    "additional_info": "string"
  }
}
```

### GET /services/requests
Get user's service requests

## Admin Endpoints

### GET /admin/dashboard
Get admin dashboard data

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_users": 1250,
      "active_listings": 89,
      "pending_approvals": 12,
      "monthly_revenue": 15750.50,
      "new_registrations_today": 8
    },
    "recent_activities": [
      {
        "type": "new_listing",
        "description": "New listing submitted for approval",
        "timestamp": "datetime"
      }
    ]
  }
}
```

### GET /admin/users
Get all users with filtering

**Query Parameters:**
- `user_type`: "buyer" | "seller" | "admin"
- `verification_status`: "pending" | "approved" | "rejected"
- `page`: number
- `limit`: number

### PUT /admin/users/{user_id}/verify
Approve/reject user verification

**Request Body:**
```json
{
  "status": "approved" | "rejected",
  "notes": "string"
}
```

### GET /admin/listings/pending
Get listings pending approval

### PUT /admin/listings/{listing_id}/approve
Approve/reject listing

**Request Body:**
```json
{
  "status": "approved" | "rejected",
  "feedback": "string"
}
```

### GET /admin/service-requests
Get all service requests

### PUT /admin/service-requests/{request_id}
Update service request status

## WebSocket Events

### Connection Events
- `connection:new` - New connection request received
- `connection:approved` - Connection request approved
- `connection:rejected` - Connection request rejected

### Message Events
- `message:new` - New message received
- `message:read` - Message marked as read

### Notification Events
- `notification:listing_approved` - Listing approved by admin
- `notification:listing_rejected` - Listing rejected by admin
- `notification:subscription_expiring` - Subscription expiring soon

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // optional additional error details
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
