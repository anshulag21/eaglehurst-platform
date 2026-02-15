# CareAcquire Mobile App - API Configuration Guide

## API Connection Setup

### Current Configuration

The app is configured to connect to the backend API at:
```
http://10.0.2.2:8000/api/v1
```

This is configured in: `src/constants/index.ts`

### Understanding the API URL

#### For Android Emulator
- **Use**: `http://10.0.2.2:8000/api/v1`
- **Why**: `10.0.2.2` is the special IP address that the Android emulator uses to refer to the host machine's `localhost`
- **Current Status**: ✅ Configured

#### For iOS Simulator
- **Use**: `http://localhost:8000/api/v1`
- **Why**: iOS simulator can directly access the host machine's localhost

#### For Physical Device
- **Use**: `http://YOUR_COMPUTER_IP:8000/api/v1`
- **Example**: `http://192.168.1.100:8000/api/v1`
- **How to find your IP**:
  ```bash
  # On macOS/Linux
  ifconfig | grep "inet " | grep -v 127.0.0.1
  
  # On Windows
  ipconfig
  ```

### Changing the API URL

Edit `src/constants/index.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://10.0.2.2:8000/api/v1'  // Change this for development
    : 'https://api.careacquire.com/api/v1',  // Production URL
  TIMEOUT: 30000,
};
```

### Verifying Backend Connection

#### 1. Check if backend is running
```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "Welcome to CareAcquire API",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/health"
}
```

#### 2. Test API endpoint
```bash
curl http://localhost:8000/api/v1/auth/test
```

#### 3. Check from emulator perspective
The emulator should be able to reach `http://10.0.2.2:8000`

### Common Issues and Solutions

#### Issue: "Network Error Occurred"

**Possible Causes:**

1. **Backend not running**
   ```bash
   # Start the backend
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Wrong API URL**
   - Android Emulator: Must use `10.0.2.2` not `localhost`
   - iOS Simulator: Can use `localhost`
   - Physical Device: Must use computer's IP address

3. **Firewall blocking connection**
   - Ensure port 8000 is not blocked by firewall
   - On macOS: System Preferences > Security & Privacy > Firewall

4. **CORS issues**
   - Backend should allow origins from mobile app
   - Check `backend/app/main.py` CORS configuration

#### Issue: "Connection Timeout"

**Solutions:**
1. Increase timeout in `API_CONFIG.TIMEOUT`
2. Check if backend is responding slowly
3. Check network connectivity

#### Issue: "401 Unauthorized"

**Solutions:**
1. Check if token is being sent correctly
2. Verify token is not expired
3. Check authentication headers in API client

### Testing API Connection

#### From Terminal
```bash
# Test root endpoint
curl http://localhost:8000/

# Test API v1 endpoint
curl http://localhost:8000/api/v1/auth/test

# Test from emulator perspective (if adb available)
adb shell curl http://10.0.2.2:8000/
```

#### From Mobile App
The app will automatically try to connect when:
- User attempts to login
- User attempts to register
- App initializes and checks authentication

### Backend API Endpoints

The backend provides these main endpoint groups:

- `/api/v1/auth` - Authentication (login, register, etc.)
- `/api/v1/users` - User management
- `/api/v1/listings` - Business listings
- `/api/v1/connections` - Buyer-seller connections
- `/api/v1/subscriptions` - Subscription management
- `/api/v1/services` - Service requests
- `/api/v1/notifications` - Notifications
- `/api/v1/admin` - Admin operations

### Environment-Specific Configuration

#### Development (Current)
```typescript
BASE_URL: 'http://10.0.2.2:8000/api/v1'
```

#### Staging
```typescript
BASE_URL: 'https://staging-api.careacquire.com/api/v1'
```

#### Production
```typescript
BASE_URL: 'https://api.careacquire.com/api/v1'
```

### Debugging API Calls

#### Enable Network Logging

The API client (`src/api/client.ts`) already has request/response interceptors that log:
- Request URL and method
- Request headers and data
- Response status and data
- Errors

Check Metro bundler logs for these messages.

#### Using React Native Debugger

1. Install React Native Debugger
2. Enable Debug JS Remotely in app
3. View Network tab to see all API calls

#### Using Flipper

1. Install Flipper
2. Enable Network plugin
3. View all network requests and responses

### Security Notes

⚠️ **Important for Production:**

1. **Never hardcode API keys** in the source code
2. **Use environment variables** for sensitive configuration
3. **Enable SSL/TLS** (HTTPS) for production
4. **Implement certificate pinning** for enhanced security
5. **Rotate tokens** regularly
6. **Validate SSL certificates** in production builds

### Quick Reference

| Environment | API URL | Notes |
|------------|---------|-------|
| Android Emulator | `http://10.0.2.2:8000/api/v1` | ✅ Current |
| iOS Simulator | `http://localhost:8000/api/v1` | Need to change |
| Physical Device | `http://YOUR_IP:8000/api/v1` | Need to change |
| Production | `https://api.careacquire.com/api/v1` | Future |

---

**Last Updated**: November 9, 2025
**Status**: ✅ Configured for Android Emulator

