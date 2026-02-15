# Eaglehurst Mobile App

A professional React Native mobile application for the Eaglehurst UK Medical Business Marketplace.

## 🎯 Overview

Eaglehurst Mobile connects buyers and sellers of medical businesses across the UK. The app provides a modern, NHS-inspired interface for browsing listings, managing connections, and facilitating secure transactions.

## ✨ Features

### For Buyers
- **Browse Listings**: Search and filter medical business opportunities
- **Save Favorites**: Bookmark interesting listings
- **Connect with Sellers**: Request connections and chat in real-time
- **Dashboard**: Track connections, saved listings, and activity

### For Sellers
- **Create Listings**: List medical businesses with detailed information
- **Manage Listings**: Edit, update, and track listing performance
- **KYC Verification**: Complete identity verification
- **Analytics**: View listing views, connection requests, and engagement
- **Subscription Management**: Manage subscription plans

### Shared Features
- **Real-time Messaging**: Chat with connections
- **Profile Management**: Update personal information
- **Notifications**: Stay updated on activity
- **Secure Authentication**: JWT-based auth with refresh tokens

## 🏗️ Architecture

```
mobile/EaglehurstMobile/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/       # Reusable UI components
│   ├── constants/        # App constants and config
│   ├── navigation/       # Navigation setup
│   ├── screens/          # Screen components
│   │   ├── auth/         # Authentication screens
│   │   ├── buyer/        # Buyer-specific screens
│   │   ├── seller/       # Seller-specific screens
│   │   └── common/       # Shared screens
│   ├── store/            # Redux state management
│   ├── theme/            # Design system (colors, typography, spacing)
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Utility functions
├── App.tsx               # Root component
└── package.json          # Dependencies
```

## 🎨 Design System

### Color Palette
- **Primary**: NHS Blue (#005EB8) - Professional, trustworthy
- **Accent**: Teal (#00A499) - Modern, clean
- **Neutral**: Grays for text and backgrounds
- **Semantic**: Success (green), Warning (amber), Error (red)

### Typography
- **iOS**: SF Pro Display/Text
- **Android**: Roboto
- Consistent sizing scale (12px - 34px)

### Spacing
- 4px base unit
- Consistent scale (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)

## 📦 Tech Stack

- **Framework**: React Native 0.73+
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper
- **HTTP Client**: Axios
- **Secure Storage**: React Native Keychain
- **Image Handling**: React Native Image Picker
- **Payments**: Stripe React Native SDK

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native development environment
- iOS: Xcode 14+ and CocoaPods
- Android: Android Studio and JDK 11+

### Installation

```bash
# Navigate to mobile directory
cd mobile/EaglehurstMobile

# Install dependencies
npm install

# iOS: Install pods
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Configuration

Create a `.env` file:

```env
API_BASE_URL=https://api.eaglehurst.com
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 📱 Screens

### Authentication Flow
- **LoginScreen**: Email/password login
- **RegisterScreen**: User registration with type selection
- **VerifyEmailScreen**: OTP email verification
- **ForgotPasswordScreen**: Password reset request

### Buyer Flow
- **BuyerDashboardScreen**: Overview of activity and stats
- **ListingsScreen**: Browse and search listings
- **ConnectionsScreen**: Manage connections with sellers
- **ProfileScreen**: User profile and settings

### Seller Flow
- **SellerDashboardScreen**: Analytics and quick actions
- **MyListingsScreen**: Manage all listings
- **CreateListingScreen**: Create new business listing
- **ProfileScreen**: User profile and settings

### Shared
- **ChatScreen**: Real-time messaging
- **ProfileScreen**: Account settings and preferences

## 🔐 Security

- **JWT Authentication**: Secure token-based auth
- **Refresh Token Rotation**: Automatic token refresh
- **Keychain Storage**: Secure credential storage
- **API Interceptors**: Automatic auth header injection
- **Input Validation**: Client-side validation

## 📊 State Management

Redux store with three main slices:

1. **authSlice**: User authentication and profile
2. **listingsSlice**: Listings data and filters
3. **connectionsSlice**: Connections and messages

## 🔄 API Integration

Complete API layer with services for:
- Authentication (login, register, verify)
- Listings (CRUD, search, media upload)
- Connections (requests, messages, status)
- User profile (update, KYC, analytics)
- Subscriptions (plans, checkout, cancel)

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linter
npm run lint

# Type check
npm run type-check
```

## 📦 Build & Deploy

### iOS

```bash
# Build for release
cd ios
xcodebuild -workspace EaglehurstMobile.xcworkspace \
  -scheme EaglehurstMobile \
  -configuration Release \
  -archivePath build/EaglehurstMobile.xcarchive \
  archive
```

### Android

```bash
# Build APK
cd android
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

## 🎯 Future Enhancements

- [ ] Push notifications
- [ ] In-app payments
- [ ] Advanced search filters
- [ ] Saved searches
- [ ] Document viewer
- [ ] Video calls
- [ ] Analytics dashboard
- [ ] Offline mode
- [ ] Biometric authentication

## 📄 License

Proprietary - Eaglehurst Ltd.

## 👥 Team

Developed by the Eaglehurst development team.

## 📞 Support

For support, email support@eaglehurst.com or visit our help center.

---

**Version**: 1.0.0  
**Last Updated**: November 2025

