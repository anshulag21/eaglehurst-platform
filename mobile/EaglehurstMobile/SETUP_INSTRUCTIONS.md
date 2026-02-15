# Eaglehurst Mobile App - Setup Instructions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **npm** or **yarn**
   ```bash
   npm --version   # Should be 9.x or higher
   ```

3. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

4. **Watchman** (for macOS)
   ```bash
   brew install watchman
   ```

### iOS Development (macOS only)

1. **Xcode** (14.0 or higher)
   - Download from Mac App Store
   - Install Xcode Command Line Tools:
     ```bash
     xcode-select --install
     ```

2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

### Android Development

1. **Android Studio**
   - Download from https://developer.android.com/studio
   - Install Android SDK (API 33 or higher)
   - Set up Android emulator

2. **Java Development Kit (JDK 11)**
   ```bash
   # macOS with Homebrew
   brew install openjdk@11
   
   # Set JAVA_HOME
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-11.jdk/Contents/Home
   ```

3. **Environment Variables**
   Add to `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

## 🚀 Installation Steps

### 1. Navigate to Project Directory

```bash
cd /Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/mobile/EaglehurstMobile
```

### 2. Install Dependencies

```bash
# Install npm packages
npm install

# Or with yarn
yarn install
```

This will install all required packages including:
- React Native
- React Navigation
- Redux Toolkit
- Axios
- React Native Paper
- Stripe SDK
- And more...

### 3. iOS Setup (macOS only)

```bash
# Navigate to iOS directory
cd ios

# Install CocoaPods dependencies
pod install

# Return to root
cd ..
```

### 4. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# API Configuration
API_BASE_URL=http://localhost:8000/api/v1
# For production: https://api.eaglehurst.com/api/v1

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
# For production: pk_live_...

# App Configuration
APP_ENV=development
# For production: production
```

### 5. Update Constants

Edit `src/constants/index.ts` if needed:

```typescript
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
```

For iOS Simulator, use `http://localhost:8000`  
For Android Emulator, use `http://10.0.2.2:8000`  
For physical devices, use your computer's IP address

## 🏃 Running the App

### Start Metro Bundler

In the project root:

```bash
npm start
# Or
yarn start
```

Keep this terminal window open.

### Run on iOS

In a new terminal:

```bash
npm run ios
# Or
yarn ios

# To run on specific device
npm run ios -- --simulator="iPhone 14 Pro"
```

### Run on Android

In a new terminal:

```bash
# Start Android emulator first, then:
npm run android
# Or
yarn android
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Metro Bundler Issues

```bash
# Clear cache
npm start -- --reset-cache

# Or
npx react-native start --reset-cache
```

#### 2. iOS Build Errors

```bash
# Clean build
cd ios
xcodebuild clean
pod deintegrate
pod install
cd ..

# Rebuild
npm run ios
```

#### 3. Android Build Errors

```bash
# Clean gradle
cd android
./gradlew clean
cd ..

# Rebuild
npm run android
```

#### 4. Dependency Issues

```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# iOS: Reinstall pods
cd ios
rm -rf Pods
pod install
cd ..
```

#### 5. Simulator/Emulator Not Found

**iOS:**
```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator
xcrun simctl boot "iPhone 14 Pro"
```

**Android:**
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_33
```

### Network Issues

If you can't connect to the backend API:

1. **Check Backend is Running**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Update API URL**
   - iOS Simulator: `http://localhost:8000`
   - Android Emulator: `http://10.0.2.2:8000`
   - Physical Device: `http://YOUR_COMPUTER_IP:8000`

3. **Allow Network Access**
   - iOS: Update `Info.plist` for App Transport Security
   - Android: Update `AndroidManifest.xml` for cleartext traffic

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Type Checking

```bash
# Check TypeScript types
npm run type-check
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## 📱 Running on Physical Devices

### iOS Device

1. Open `ios/EaglehurstMobile.xcworkspace` in Xcode
2. Select your device from the device dropdown
3. Click Run (⌘R)
4. Trust developer certificate on device if prompted

### Android Device

1. Enable Developer Options on device
2. Enable USB Debugging
3. Connect device via USB
4. Run:
   ```bash
   adb devices  # Verify device is connected
   npm run android
   ```

## 🔐 Stripe Setup

For payment functionality:

1. **Get Stripe Keys**
   - Sign up at https://stripe.com
   - Get publishable key from dashboard

2. **Update Environment**
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

3. **Test Cards**
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002

## 📦 Building for Production

### iOS

```bash
# Archive for App Store
cd ios
xcodebuild -workspace EaglehurstMobile.xcworkspace \
  -scheme EaglehurstMobile \
  -configuration Release \
  -archivePath build/EaglehurstMobile.xcarchive \
  archive
```

### Android

```bash
# Build release APK
cd android
./gradlew assembleRelease

# Build release AAB (for Play Store)
./gradlew bundleRelease
```

Output files:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## 🎯 Next Steps

After successful setup:

1. ✅ Test authentication flow
2. ✅ Test buyer features
3. ✅ Test seller features
4. ✅ Test messaging
5. ✅ Connect to production API
6. ✅ Submit to App Store / Play Store

## 📞 Support

If you encounter issues:

1. Check this guide thoroughly
2. Review error messages carefully
3. Search React Native documentation
4. Check GitHub issues
5. Contact development team

## 📚 Additional Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Redux Toolkit](https://redux-toolkit.js.org/introduction/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Stripe React Native](https://stripe.com/docs/mobile/react-native)

---

**Good luck with your development!** 🚀

