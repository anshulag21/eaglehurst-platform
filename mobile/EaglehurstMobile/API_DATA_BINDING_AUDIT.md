# API Data Binding Audit & Fixes

## Issue: Incorrect Data Mapping Between Backend and Frontend

### Problems Identified:

1. **verification_status Field Mismatch**
   - Frontend: Accessing `user.verification_status` 
   - Backend: Returns `user.is_verified` (boolean) + `seller_profile.verification_status` (enum)
   - Result: Always shows "Not Verified" because field doesn't exist on user

2. **Missing Profile Data in Auth Response**
   - Backend returns: `{ user: { id, email, is_verified, ... } }`
   - Frontend expects: `{ user: { ..., seller_profile: { verification_status } } }`
   - Seller/Buyer profiles not included in login/register response

3. **listing_id vs id Mismatch** (Already Fixed)
   - Backend: `{ id: "uuid" }`
   - Frontend: Uses `listing_id` as key
   - Fixed with transformListing()

### Solutions:

#### Option 1: Fetch Profile After Login (Recommended)
- Keep auth response simple
- Fetch seller/buyer profile separately after login
- Store profile data in Redux state

#### Option 2: Include Profile in Auth Response
- Modify backend to include profile in TokenResponse
- More data in one request
- Requires backend schema changes

### Recommended Approach: Option 1

