# Development Build Guide for EyyTrike

This guide explains how to create and use development builds for the EyyTrike mobile app.

## Prerequisites

1. **Expo CLI** - Install globally if not already installed:
   ```bash
   npm install -g expo-cli
   ```

2. **EAS CLI** - Install globally:
   ```bash
   npm install -g eas-cli
   ```

3. **Expo Account** - Make sure you're logged in:
   ```bash
   eas login
   ```

4. **Android Studio** (for Android builds) or **Xcode** (for iOS builds)

## Method 1: Using EAS Build (Recommended for Cloud Builds)

### For Android Development Build

1. **Navigate to the project directory:**
   ```bash
   cd Eyy
   ```

2. **Build the development client for Android:**
   ```bash
   eas build --profile development --platform android
   ```

3. **Install on device:**
   - After the build completes, EAS will provide a download link
   - Download the APK and install it on your Android device
   - Or scan the QR code with your device

### For iOS Development Build

1. **Build the development client for iOS:**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Install on device:**
   - For iOS, you'll need to use TestFlight or install via Xcode
   - EAS will provide instructions after the build completes

## Method 2: Local Development Build (Faster for Testing)

### For Android (Local Build)

1. **Navigate to the project directory:**
   ```bash
   cd Eyy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build and run on Android device/emulator:**
   ```bash
   npx expo run:android
   ```

   This will:
   - Build the native Android app locally
   - Install it on a connected device or emulator
   - Start the Metro bundler

### For iOS (Local Build - macOS only)

1. **Navigate to the project directory:**
   ```bash
   cd Eyy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build and run on iOS device/simulator:**
   ```bash
   npx expo run:ios
   ```

   This will:
   - Build the native iOS app locally
   - Install it on a connected device or simulator
   - Start the Metro bundler

## After Installing the Development Build

Once you have the development build installed on your device:

1. **Start the development server:**
   ```bash
   cd Eyy
   npx expo start --dev-client
   ```

2. **Connect your device:**
   - Open the development build app on your device
   - Scan the QR code shown in the terminal
   - Or press `a` for Android or `i` for iOS in the terminal

## Development Build vs Expo Go

**Development Build** (what you're using):
- ✅ Supports custom native code
- ✅ Supports all Expo modules
- ✅ Can use native modules not available in Expo Go
- ✅ Better for production-like testing

**Expo Go**:
- ❌ Limited to Expo SDK modules
- ❌ Cannot use custom native code
- ✅ Faster for quick testing (no build needed)

## Troubleshooting

### Dependency Installation Issues

If you encounter peer dependency conflicts during `npm install`, use:
```bash
npm install --legacy-peer-deps
```

This is safe to use and will allow npm to install packages even with minor version mismatches in peer dependencies.

### Android Build Issues

1. **Gradle issues:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

2. **Clear Metro cache:**
   ```bash
   npx expo start --clear
   ```

### iOS Build Issues

1. **Pod installation:**
   ```bash
   cd ios
   pod install
   cd ..
   npx expo run:ios
   ```

2. **Clear build folder:**
   ```bash
   cd ios
   rm -rf build
   cd ..
   ```

## Quick Commands Reference

```bash
# Start development server with dev client
npx expo start --dev-client

# Build Android locally
npx expo run:android

# Build iOS locally
npx expo run:ios

# Build with EAS (Android)
eas build --profile development --platform android

# Build with EAS (iOS)
eas build --profile development --platform ios

# Clear cache and restart
npx expo start --clear --dev-client
```

## Notes

- The development build needs to be rebuilt whenever you add new native dependencies
- JavaScript changes can be hot-reloaded without rebuilding
- Your `eas.json` is already configured for development builds
- The project uses Expo SDK 54 with `expo-dev-client` installed

