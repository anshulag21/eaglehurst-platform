# API Endpoint Testing Guide

## Issues Resolved

### 1. Listings Endpoint - 422 Error Fix

**Problem**: `GET /api/v1/listings/1` returned 422 Unprocessable Content

**Root Cause**: The endpoint expects a valid UUID format, but "1" is not a valid UUID.

**Solution**: Use proper UUID format for listing IDs.

#### Examples:

```bash
# ❌ Wrong - Invalid UUID format
curl -X GET "http://localhost:8000/api/v1/listings/1"
# Returns: 422 - "Input should be a valid UUID"

# ✅ Correct - Valid UUID format
curl -X GET "http://localhost:8000/api/v1/listings/123e4567-e89b-12d3-a456-426614174000"
# Returns: 404 - "Listing not found" (which is expected for non-existent listing)

# ✅ Get all listings (no authentication required)
curl -X GET "http://localhost:8000/api/v1/listings/"
# Returns: 200 - Success with empty listings array
```

### 2. Connections Endpoint - Authentication Required

**Problem**: `GET /api/v1/connections/` returned 500 Internal Server Error

**Root Cause**: The endpoint requires user authentication, but no auth token was provided.

**Solution**: Include proper authentication headers.

#### Examples:

```bash
# ❌ Wrong - No authentication
curl -X GET "http://localhost:8000/api/v1/connections/"
# Returns: 403 - "Not authenticated"

# ✅ Correct - With authentication (you need to get a token first)
# Step 1: Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Step 2: Use token in connections request
curl -X GET "http://localhost:8000/api/v1/connections/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Valid UUID Formats

UUIDs must be in one of these formats:
- `123e4567-e89b-12d3-a456-426614174000` (standard format)
- `123e4567e89b12d3a456426614174000` (no hyphens)

## Authentication Flow

1. **Register** or **Login** to get access token
2. **Include token** in Authorization header for protected endpoints
3. **Protected endpoints** include:
   - `/api/v1/connections/*` (requires any authenticated user)
   - `/api/v1/listings/{id}/save` (requires buyer role)
   - `/api/v1/listings/seller/*` (requires seller role)

## Public Endpoints (No Auth Required)

- `GET /api/v1/listings/` - Browse all listings
- `GET /api/v1/listings/{uuid}` - Get specific listing details
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /health` - Health check

## Testing with Frontend

The frontend should:
1. Use proper UUID format when calling listing detail endpoints
2. Include authentication tokens for protected routes
3. Handle 401/403 responses by redirecting to login page
