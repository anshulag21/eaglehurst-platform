# Eaglehurst Mobile - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
cd mobile/EaglehurstMobile
npm install
```

For iOS (macOS only):
```bash
cd ios && pod install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
API_BASE_URL=http://localhost:8000/api/v1
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
APP_ENV=development
```

### 3. Run the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## 📱 What's Included

### For Buyers
- Browse medical business listings
- Save favorite listings
- Connect with sellers
- Real-time messaging
- Profile management

### For Sellers
- Create & manage listings
- View analytics
- Manage connections
- Real-time messaging
- Subscription management

## 🎨 Design

- NHS-inspired professional design
- Modern, clean interface
- UK audience focused
- Platform-specific fonts

## 🔐 Security

- JWT authentication
- Secure token storage (Keychain)
- Auto token refresh
- Input validation

## 📚 Documentation

- `README.md` - Full documentation
- `SETUP_INSTRUCTIONS.md` - Detailed setup
- `../MOBILE_APP_FINAL_STATUS.md` - Complete status

## 🆘 Troubleshooting

**Metro Bundler Issues:**
```bash
npm start -- --reset-cache
```

**iOS Build Errors:**
```bash
cd ios && pod install && cd ..
npm run ios
```

**Android Build Errors:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

## ✅ Ready to Go!

The app is fully functional and ready for testing. All screens, navigation, API integration, and state management are complete.

**Happy coding!** 🎉

