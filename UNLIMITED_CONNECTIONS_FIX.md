# Unlimited Connections Fix

## Issue
Users with **Buyer Premium** subscription (unlimited connections, `connection_limit_monthly = -1`) were unable to send connection requests. They received the error:
```
"Connection limit reached for current subscription"
```

## Root Cause
The connection limit validation logic in `connection_bl.py` was checking:
```python
if connections_used >= connection_limit:
    raise error
```

For unlimited plans where `connection_limit = -1`, this check evaluates to:
```python
if 0 >= -1:  # True! (WRONG!)
    raise error
```

Since any positive number is greater than `-1`, the check always failed for unlimited plans.

## Solution
Updated all connection limit checks to skip validation for unlimited plans (`-1`):

```python
# Before:
if connections_used >= connection_limit:
    raise error

# After:
if connection_limit != -1 and connections_used >= connection_limit:
    raise error
```

## Files Fixed

### `backend/app/business_logic/connection_bl.py`

**Location 1: Line 64-70** - `create_connection_request` method
```python
# Check connection limits (skip check for unlimited plans where limit = -1)
connection_limit = subscription.subscription.connection_limit_monthly
if connection_limit != -1 and subscription.connections_used_current_month >= connection_limit:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Connection limit reached for current subscription"
    )
```

**Location 2: Line 195** - Connection response (connections_remaining)
```python
"connections_remaining": -1 if subscription.subscription.connection_limit_monthly == -1 else (subscription.subscription.connection_limit_monthly - subscription.connections_used_current_month)
```

**Location 3: Line 825-830** - `check_connection_status` method (no connection exists)
```python
if user_subscription.is_effectively_active():
    # Check if unlimited (-1) or has remaining connections
    if subscription_plan.connection_limit_monthly == -1 or user_subscription.connections_used_current_month < subscription_plan.connection_limit_monthly:
        can_connect = True
        reason = None
    else:
        reason = "Connection limit reached"
```

**Location 4: Line 855-860** - `check_connection_status` method (rejected connection)
```python
if user_subscription.is_effectively_active():
    # Check if unlimited (-1) or has remaining connections
    if subscription_plan.connection_limit_monthly == -1 or user_subscription.connections_used_current_month < subscription_plan.connection_limit_monthly:
        can_connect = True
        reason = None
    else:
        reason = "Connection limit reached"
```

**Location 5: Line 936-942** - `create_seller_to_buyer_connection` method
```python
# Check if buyer has available connections (skip check for unlimited plans where limit = -1)
connection_limit = subscription.subscription.connection_limit_monthly
if connection_limit != -1 and subscription.connections_used_current_month >= connection_limit:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Buyer has reached their connection limit"
    )
```

## Impact

### Before Fix:
- ❌ Buyer Premium users (unlimited connections) couldn't send ANY connection requests
- ❌ Error: "Connection limit reached for current subscription"
- ❌ Even with 0 connections used, the check failed

### After Fix:
- ✅ Buyer Premium users can send unlimited connection requests
- ✅ Buyer Basic users (10/month) still have proper limits enforced
- ✅ `connections_remaining` returns `-1` for unlimited plans (indicating unlimited)

## Subscription Plans

### Buyer Basic
- **Connection Limit:** 10/month
- **Behavior:** Enforces limit, blocks after 10 connections

### Buyer Premium
- **Connection Limit:** -1 (unlimited)
- **Behavior:** No limit enforced, can send unlimited connections

## Testing

### Test Case 1: Buyer Premium (Unlimited)
```bash
# User: emma.healthcare@eaglehursttestdev.co.in
# Plan: Buyer Premium
# Limit: -1 (unlimited)

POST /api/v1/connections/
{
  "listing_id": "...",
  "initial_message": "..."
}

# Expected: ✅ 201 Created
# Actual: ✅ 201 Created
```

### Test Case 2: Buyer Basic (Limited)
```bash
# User: michael.buyer@eaglehursttestdev.co.in
# Plan: Buyer Basic
# Limit: 10/month
# Used: 0/10

POST /api/v1/connections/
{
  "listing_id": "...",
  "initial_message": "..."
}

# Expected: ✅ 201 Created (if under limit)
# Expected: ❌ 400 Bad Request (if at/over limit)
```

### Test Case 3: Connections Remaining
```bash
GET /api/v1/connections/

# Buyer Premium Response:
{
  "connections_remaining": -1  # Indicates unlimited
}

# Buyer Basic Response:
{
  "connections_remaining": 7  # 10 - 3 used
}
```

## Database Schema

### `subscriptions` table:
```sql
connection_limit_monthly (integer)
  - 10 for Buyer Basic
  - -1 for Buyer Premium (unlimited)
  - 0 for Seller plans (sellers don't initiate connections)
```

### `user_subscriptions` table:
```sql
connections_used_current_month (integer)
  - Tracks connections used in current billing period
  - Resets monthly based on usage_reset_date
```

## Convention
- **`-1`** = Unlimited
- **`0`** = No connections allowed
- **`> 0`** = Specific limit

This convention is consistent across the codebase and clearly distinguishes between:
- No access (0)
- Limited access (positive number)
- Unlimited access (-1)

## Related Fixes
This fix is part of the subscription system improvements. See also:
- `SUBSCRIPTION_FIELD_FIX_SUMMARY.md` - Field name corrections
- `SUBSCRIPTION_ACTIVATION_FIX.md` - Subscription activation flow

## Date Fixed
November 9, 2025

## Fixed By
AI Assistant (Claude Sonnet 4.5)

