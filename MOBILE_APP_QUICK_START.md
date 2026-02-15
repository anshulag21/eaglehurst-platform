# Eaglehurst Mobile App - Quick Start Guide

## 📱 Welcome!

This guide will help you quickly understand the Eaglehurst platform and start building the React Native mobile app.

---

## 🎯 What is Eaglehurst?

**Eaglehurst** is a marketplace platform connecting medical business sellers with potential buyers in the UK.

### The Problem It Solves
- Medical practice owners want to sell their businesses securely
- Buyers want to find legitimate medical businesses to purchase
- Both need a trusted platform with privacy controls and verification

### How It Works
1. **Sellers** create listings for their medical practices
2. **Buyers** browse listings (with limited information)
3. **Buyers** send connection requests to sellers
4. **Sellers** approve/reject requests
5. Once approved, **full details are revealed** and messaging is enabled
6. Both parties negotiate through secure messaging

---

## 📚 Documentation Overview

I've created 4 comprehensive documents for you:

### 1. **MOBILE_APP_DOCUMENTATION.md** (Main Reference)
- Complete application overview
- All API endpoints with examples
- User registration & authentication flows
- Profile management
- Listings management
- Connections & messaging
- Subscriptions & payments
- Admin features
- Security & permissions
- Mobile-specific considerations
- Recommended React Native libraries

### 2. **API_ENDPOINTS_REFERENCE.md** (API Quick Reference)
- All API endpoints organized by category
- Request/response examples
- Query parameters
- Error codes
- Authentication requirements

### 3. **USER_FLOWS_GUIDE.md** (Visual Flows)
- Complete buyer journey with diagrams
- Complete seller journey with diagrams
- Admin workflows
- Step-by-step user flows
- Screen mockups in text format

### 4. **BUYER_VS_SELLER_FEATURES.md** (Feature Comparison)
- Side-by-side comparison of buyer vs seller capabilities
- Permission matrix
- What each user type can/cannot do
- Mobile app feature priorities

---

## 🚀 Quick Start: Building the Mobile App

### Step 1: Set Up React Native Project

```bash
# Create new React Native project with TypeScript
npx react-native init EaglehurstMobile --template react-native-template-typescript

cd EaglehurstMobile

# Install core dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install axios
npm install react-native-paper react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-keychain

# For iOS
cd ios && pod install && cd ..
```

### Step 2: Project Structure

```
src/
├── api/
│   ├── client.ts              # Axios configuration
│   ├── auth.api.ts            # Auth endpoints
│   ├── listings.api.ts        # Listings endpoints
│   ├── connections.api.ts     # Connections endpoints
│   ├── users.api.ts           # User management
│   └── subscriptions.api.ts   # Subscription endpoints
│
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Loading.tsx
│   ├── listings/
│   │   ├── ListingCard.tsx
│   │   ├── ListingDetail.tsx
│   │   └── ListingFilters.tsx
│   └── messaging/
│       ├── MessageBubble.tsx
│       └── MessageInput.tsx
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── VerifyEmailScreen.tsx
│   ├── buyer/
│   │   ├── BuyerDashboardScreen.tsx
│   │   ├── ListingsScreen.tsx
│   │   ├── ListingDetailScreen.tsx
│   │   ├── SavedListingsScreen.tsx
│   │   └── ConnectionsScreen.tsx
│   ├── seller/
│   │   ├── SellerDashboardScreen.tsx
│   │   ├── MyListingsScreen.tsx
│   │   ├── CreateListingScreen.tsx
│   │   └── AnalyticsScreen.tsx
│   └── shared/
│       ├── MessagesScreen.tsx
│       ├── ProfileScreen.tsx
│       └── SubscriptionScreen.tsx
│
├── navigation/
│   ├── AppNavigator.tsx       # Main app navigation
│   ├── AuthNavigator.tsx      # Auth flow
│   ├── BuyerNavigator.tsx     # Buyer tabs
│   └── SellerNavigator.tsx    # Seller tabs
│
├── store/
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── listingsSlice.ts
│   │   ├── connectionsSlice.ts
│   │   └── messagesSlice.ts
│   └── store.ts
│
├── types/
│   └── index.ts               # TypeScript types
│
├── utils/
│   ├── storage.ts             # Secure storage
│   ├── validation.ts          # Form validation
│   └── helpers.ts             # Helper functions
│
└── constants/
    └── index.ts               # App constants
```

### Step 3: API Configuration

```typescript
// src/api/client.ts
import axios from 'axios';
import { getToken, refreshToken } from '../utils/storage';

const API_BASE_URL = 'https://api.eaglehurst.com/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Step 4: Authentication API

```typescript
// src/api/auth.api.ts
import apiClient from './client';

export const authAPI = {
  // Register
  register: async (data: {
    email: string;
    password: string;
    user_type: 'buyer' | 'seller';
    first_name: string;
    last_name: string;
    phone: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Verify email
  verifyEmail: async (verificationToken: string, otp: string) => {
    const response = await apiClient.post('/auth/verify-email-token', {
      verification_token: verificationToken,
      otp,
    });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
```

### Step 5: Navigation Setup

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.user_type === 'buyer' ? (
        <BuyerNavigator />
      ) : (
        <SellerNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
```

---

## 🎯 MVP Features (Phase 1)

### Must-Have for Launch

#### Authentication ✅
- [x] User registration (buyer/seller)
- [x] Email verification with OTP
- [x] Login/logout
- [x] Password reset

#### Buyer Features ✅
- [x] Browse listings (with filters)
- [x] View listing details (masked/unmasked)
- [x] Save listings
- [x] Send connection requests
- [x] View saved listings
- [x] Message sellers (after approval)

#### Seller Features ✅
- [x] KYC document upload
- [x] Create listing (simplified form)
- [x] View my listings
- [x] Receive connection requests
- [x] Approve/reject connections
- [x] Message buyers

#### Shared Features ✅
- [x] Profile management
- [x] Subscription selection & payment
- [x] Messaging interface
- [x] Push notifications
- [x] Settings

---

## 🔑 Key Concepts to Understand

### 1. Data Masking
**Before connection approval:**
- Price shown as range: "£500k - £750k"
- Description truncated
- No exact address
- No financial details

**After connection approval:**
- Exact price: £650,000
- Full description
- Complete address
- All financial data

### 2. Connection Flow
```
Buyer → Sends Request → Seller
                ↓
        Seller Reviews
                ↓
    Approve or Reject
                ↓
    If Approved: Full Access + Messaging
```

### 3. Subscription Limits
**Buyers:**
- Gold: 10 connections/month
- Silver: 25 connections/month
- Platinum: Unlimited

**Sellers:**
- Gold: 5 listings
- Silver: 10 listings
- Platinum: Unlimited

### 4. Verification Requirements
- **Buyers**: Optional (can browse without)
- **Sellers**: Mandatory (KYC + admin approval)
- **Listings**: All require admin approval

---

## 📱 Screen Priorities

### Phase 1 (MVP)
1. **Login Screen** ⭐⭐⭐
2. **Register Screen** ⭐⭐⭐
3. **Email Verification Screen** ⭐⭐⭐
4. **Buyer Dashboard** ⭐⭐⭐
5. **Listings Screen** (browse) ⭐⭐⭐
6. **Listing Detail Screen** ⭐⭐⭐
7. **Connection Request Modal** ⭐⭐⭐
8. **Messages Screen** ⭐⭐⭐
9. **Profile Screen** ⭐⭐⭐
10. **Subscription Screen** ⭐⭐⭐

### Phase 2
11. **Seller Dashboard** ⭐⭐
12. **Create Listing Screen** ⭐⭐
13. **My Listings Screen** ⭐⭐
14. **KYC Upload Screen** ⭐⭐
15. **Saved Listings Screen** ⭐⭐
16. **Analytics Screen** ⭐⭐

### Phase 3
17. **Advanced Search** ⭐
18. **Listing Comparison** ⭐
19. **Video Calls** ⭐
20. **Document Viewer** ⭐

---

## 🛠️ Essential Libraries

```json
{
  "dependencies": {
    // Navigation
    "@react-navigation/native": "^6.x",
    "@react-navigation/stack": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    
    // State Management
    "@reduxjs/toolkit": "^1.x",
    "react-redux": "^8.x",
    
    // API & Data
    "axios": "^1.x",
    
    // UI Components
    "react-native-paper": "^5.x",
    "react-native-vector-icons": "^10.x",
    
    // Storage
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-keychain": "^8.x",
    
    // Media
    "react-native-image-picker": "^5.x",
    "react-native-document-picker": "^9.x",
    "react-native-fast-image": "^8.x",
    
    // Payments
    "@stripe/stripe-react-native": "^0.x",
    
    // Notifications
    "@react-native-firebase/messaging": "^18.x",
    
    // Forms
    "react-hook-form": "^7.x",
    
    // Utilities
    "date-fns": "^2.x",
    "lodash": "^4.x"
  }
}
```

---

## 🔐 Security Checklist

- [ ] Store tokens in secure storage (Keychain/Keystore)
- [ ] Implement token refresh logic
- [ ] Validate all user inputs
- [ ] Handle API errors gracefully
- [ ] Implement rate limiting on client side
- [ ] Use HTTPS only
- [ ] Validate file uploads (type, size)
- [ ] Sanitize user-generated content
- [ ] Implement proper logout (clear all data)
- [ ] Handle session expiration

---

## 📊 API Endpoints Quick Reference

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `POST /auth/verify-email-token` - Verify email
- `GET /auth/me` - Get current user

### Listings
- `GET /listings` - Browse listings
- `GET /listings/{id}` - Get listing details
- `POST /listings` - Create listing (seller)
- `POST /listings/{id}/save` - Save listing (buyer)
- `GET /listings/saved` - Get saved listings

### Connections
- `GET /connections` - Get connections
- `POST /connections` - Create connection request
- `PUT /connections/{id}/status` - Approve/reject

### Messages
- `GET /connections/{id}/messages` - Get messages
- `POST /connections/{id}/messages` - Send message

### Subscriptions
- `GET /subscriptions/plans` - Get plans
- `POST /stripe/create-checkout-session` - Start payment

**Full API reference**: See `API_ENDPOINTS_REFERENCE.md`

---

## 🎨 UI/UX Guidelines

### Colors (Suggested)
- **Primary**: #1976D2 (Blue)
- **Secondary**: #388E3C (Green)
- **Error**: #D32F2F (Red)
- **Warning**: #F57C00 (Orange)
- **Success**: #388E3C (Green)
- **Background**: #FFFFFF / #F5F5F5

### Typography
- **Headings**: Bold, 20-24px
- **Body**: Regular, 14-16px
- **Captions**: Regular, 12-14px

### Spacing
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **XLarge**: 32px

### Components
- Use React Native Paper for consistent UI
- Implement loading states for all async operations
- Show error messages clearly
- Use pull-to-refresh on lists
- Implement infinite scroll for listings

---

## 🚀 Development Workflow

### 1. Start with Authentication
- Build login/register screens
- Implement token storage
- Set up API client with interceptors

### 2. Build Buyer Flow
- Listings browse screen
- Listing detail screen
- Connection request flow
- Messaging interface

### 3. Build Seller Flow
- KYC upload
- Create listing form
- Connection management
- Analytics dashboard

### 4. Add Shared Features
- Profile management
- Subscription management
- Notifications
- Settings

### 5. Polish & Test
- Error handling
- Loading states
- Offline support
- Push notifications
- Performance optimization

---

## 📝 Testing Checklist

### Buyer Flow
- [ ] Register as buyer
- [ ] Verify email
- [ ] Subscribe to plan
- [ ] Browse listings
- [ ] Save listing
- [ ] Send connection request
- [ ] Receive approval notification
- [ ] View full listing details
- [ ] Send message to seller

### Seller Flow
- [ ] Register as seller
- [ ] Verify email
- [ ] Upload KYC documents
- [ ] Wait for admin approval
- [ ] Subscribe to plan
- [ ] Create listing
- [ ] Wait for listing approval
- [ ] Receive connection request
- [ ] Approve request
- [ ] Message buyer
- [ ] View analytics

---

## 🆘 Common Issues & Solutions

### Issue: Token expired
**Solution**: Implement automatic token refresh in API interceptor

### Issue: Connection limit reached
**Solution**: Show upgrade prompt when limit is reached

### Issue: Listing not visible
**Solution**: Check if listing is approved by admin

### Issue: Cannot send message
**Solution**: Verify connection is approved

### Issue: Images not uploading
**Solution**: Check file size limits (10MB per file)

---

## 📚 Next Steps

1. **Read the documentation**:
   - Start with `MOBILE_APP_DOCUMENTATION.md`
   - Review `API_ENDPOINTS_REFERENCE.md`
   - Study `USER_FLOWS_GUIDE.md`

2. **Set up development environment**:
   - Install React Native
   - Set up iOS/Android emulators
   - Configure API base URL

3. **Build MVP features**:
   - Authentication
   - Buyer flow
   - Seller flow
   - Messaging

4. **Test thoroughly**:
   - Test all user flows
   - Handle edge cases
   - Optimize performance

5. **Deploy**:
   - iOS App Store
   - Google Play Store

---

## 🎯 Success Metrics

Track these metrics in your app:
- User registrations (buyer vs seller)
- Email verification rate
- Subscription conversion rate
- Connection requests sent
- Connection approval rate
- Messages sent
- Listings created
- Time to first connection
- User retention rate

---

## 💡 Pro Tips

1. **Start Simple**: Build MVP first, add features later
2. **Test Early**: Test on real devices, not just emulators
3. **Handle Errors**: Always show user-friendly error messages
4. **Optimize Images**: Compress images before upload
5. **Cache Data**: Cache API responses to improve performance
6. **Offline Support**: Queue actions when offline
7. **Push Notifications**: Essential for engagement
8. **Analytics**: Track user behavior from day 1
9. **Feedback**: Add in-app feedback mechanism
10. **Iterate**: Release early, iterate based on feedback

---

## 📞 Support

If you have questions while building:
1. Check the detailed documentation files
2. Review the API contracts
3. Study the user flow diagrams
4. Test the web app to understand behavior

---

## 🎉 You're Ready!

You now have everything you need to build the Eaglehurst mobile app:
- ✅ Complete API documentation
- ✅ User flow diagrams
- ✅ Feature comparisons
- ✅ Code examples
- ✅ Best practices
- ✅ Testing guidelines

**Good luck building! 🚀**

---

*Last Updated: January 2024*

