#!/bin/bash

# WS-146: Native App Build Script for App Store Submissions
# This script builds and prepares the iOS and Android apps for store submission

set -e  # Exit on any error

echo "🚀 Starting WedSync Native App Build Process"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}❌ Error: Run this script from the wedsync project root${NC}"
    exit 1
fi

# Function to log steps
log_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check required tools
log_step "Checking required tools..."

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    log_error "npx is not installed"
    exit 1
fi

# Check if Capacitor CLI is available
if ! npx cap --version &> /dev/null; then
    log_error "Capacitor CLI is not available. Installing..."
    npm install @capacitor/cli
fi

log_success "All required tools are available"

# Install dependencies
log_step "Installing dependencies..."
npm ci
log_success "Dependencies installed"

# Run TypeScript checks
log_step "Running TypeScript checks..."
npm run typecheck
log_success "TypeScript checks passed"

# Run tests
log_step "Running tests..."
npm run test:ci
log_success "Tests passed"

# Build the Next.js application
log_step "Building Next.js application..."
npm run build
log_success "Next.js build completed"

# Create native app directories if they don't exist
log_step "Setting up native platforms..."

# Add iOS platform
if [ ! -d "ios" ]; then
    log_step "Adding iOS platform..."
    npx cap add ios
    log_success "iOS platform added"
else
    log_step "iOS platform already exists, syncing..."
    npx cap sync ios
    log_success "iOS platform synced"
fi

# Add Android platform
if [ ! -d "android" ]; then
    log_step "Adding Android platform..."
    npx cap add android
    log_success "Android platform added"
else
    log_step "Android platform already exists, syncing..."
    npx cap sync android
    log_success "Android platform synced"
fi

# Copy web assets to native platforms
log_step "Copying web assets to native platforms..."
npx cap copy
log_success "Web assets copied to native platforms"

# Generate app icons and splash screens
log_step "Generating app icons and splash screens..."

# Check if cordova-res is available for generating icons
if command -v cordova-res &> /dev/null; then
    cordova-res ios --skip-config --copy
    cordova-res android --skip-config --copy
    log_success "Icons and splash screens generated"
else
    log_warning "cordova-res not found. Install with: npm install -g cordova-res"
    log_warning "You'll need to manually add app icons and splash screens"
fi

# iOS specific preparations
log_step "Preparing iOS app for App Store submission..."

# Check if we have iOS development environment
if command -v xcodebuild &> /dev/null; then
    echo "Xcode is available"
    
    # Open iOS project
    log_step "Opening iOS project in Xcode..."
    npx cap open ios &
    
    log_success "iOS project opened in Xcode"
    echo "📱 iOS App Store Submission Checklist:"
    echo "   1. Set up signing certificates in Xcode"
    echo "   2. Configure App Store Connect app listing"
    echo "   3. Add app screenshots (required sizes: 6.5\", 5.5\", iPad Pro)"
    echo "   4. Set version and build numbers"
    echo "   5. Archive and upload to App Store Connect"
    
else
    log_warning "Xcode not found. iOS build requires macOS with Xcode installed"
    echo "📱 To complete iOS build:"
    echo "   1. Install Xcode from Mac App Store"
    echo "   2. Run: npx cap open ios"
    echo "   3. Build and archive in Xcode"
fi

# Android specific preparations
log_step "Preparing Android app for Google Play submission..."

# Check if we have Android development environment
if command -v android &> /dev/null || [ -d "$ANDROID_HOME" ]; then
    echo "Android SDK is available"
    
    # Generate Android App Bundle (AAB) - preferred format for Google Play
    log_step "Building Android App Bundle..."
    
    cd android
    if command -v ./gradlew &> /dev/null; then
        chmod +x ./gradlew
        ./gradlew bundleRelease
        log_success "Android App Bundle (AAB) created"
        
        # Also build APK for testing
        ./gradlew assembleRelease
        log_success "Android APK created for testing"
        
        echo "📦 Built files location:"
        echo "   AAB: android/app/build/outputs/bundle/release/app-release.aab"
        echo "   APK: android/app/build/outputs/apk/release/app-release.apk"
    else
        log_error "Gradle wrapper not found in android directory"
    fi
    cd ..
    
else
    log_warning "Android SDK not found"
    echo "🤖 To complete Android build:"
    echo "   1. Install Android Studio"
    echo "   2. Set ANDROID_HOME environment variable"
    echo "   3. Run: npx cap open android"
    echo "   4. Build -> Generate Signed Bundle/APK"
fi

# Create app store assets directory
log_step "Creating app store assets directory..."
mkdir -p app-store-assets/{ios,android,common}

# iOS assets structure
mkdir -p app-store-assets/ios/{screenshots/{6.5-inch,5.5-inch,ipad-pro},metadata}
mkdir -p app-store-assets/android/{screenshots/{phone,tablet},metadata}
mkdir -p app-store-assets/common/{icons,descriptions,privacy-policy}

log_success "App store assets directory structure created"

# Generate metadata templates
log_step "Generating app store metadata templates..."

# iOS App Store metadata template
cat > app-store-assets/ios/metadata/app-store-info.txt << EOF
WedSync - Wedding Management Platform

APP STORE LISTING:
Title: WedSync
Subtitle: Professional Wedding Management
Keywords: wedding, planning, management, vendors, couples, timeline, forms

DESCRIPTION:
Transform your wedding business with WedSync - the comprehensive platform designed specifically for wedding professionals.

KEY FEATURES:
• Client Management: Organize all your wedding clients in one place
• Smart Forms: Create and customize forms for client information
• Timeline Builder: Visual wedding day timeline creation
• Real-time Communication: Stay connected with couples
• Native Camera Integration: Capture moments directly in the app
• Offline Functionality: Work anywhere, sync when connected
• Push Notifications: Never miss important client updates

Perfect for wedding planners, photographers, venues, and all wedding vendors.

CATEGORY: Business
AGE RATING: 4+ (No objectionable content)
PRICE: Free with in-app purchases
EOF

# Android Play Store metadata template
cat > app-store-assets/android/metadata/play-store-info.txt << EOF
WedSync - Wedding Management Platform

PLAY STORE LISTING:
Title: WedSync
Short Description: Professional wedding management platform for vendors and couples
Long Description:
Transform your wedding business with WedSync - the comprehensive platform designed specifically for wedding professionals.

KEY FEATURES:
✓ Client Management - Organize all your wedding clients in one place
✓ Smart Forms - Create and customize forms for client information  
✓ Timeline Builder - Visual wedding day timeline creation
✓ Real-time Communication - Stay connected with couples
✓ Native Camera Integration - Capture moments directly in the app
✓ Offline Functionality - Work anywhere, sync when connected
✓ Push Notifications - Never miss important client updates

Perfect for wedding planners, photographers, venues, and all wedding vendors.

CATEGORY: Business
CONTENT RATING: Everyone
PRICE: Free
IN-APP PURCHASES: Yes
EOF

# Privacy policy template
cat > app-store-assets/common/privacy-policy/privacy-policy.md << EOF
# WedSync Privacy Policy

Last updated: $(date +"%B %d, %Y")

## Introduction
WedSync ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.

## Information We Collect
- Account information (name, email, phone number)
- Wedding and client data you choose to store
- Photos and media you capture or upload
- Device information for app functionality
- Usage analytics to improve our service

## How We Use Your Information
- Provide and maintain our services
- Process and manage your wedding projects
- Send important notifications about your account
- Improve app functionality and user experience
- Comply with legal obligations

## Data Storage and Security
- All data is encrypted in transit and at rest
- We use industry-standard security measures
- Regular security audits and updates
- Compliance with GDPR and CCPA regulations

## Your Rights
- Access your personal data
- Correct inaccurate information
- Delete your account and data
- Export your data
- Opt out of marketing communications

## Contact Us
If you have questions about this Privacy Policy, please contact us at:
Email: privacy@wedsync.app
Website: https://wedsync.app/privacy
EOF

log_success "Metadata templates created"

# Create build summary
log_step "Creating build summary..."

BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

cat > build-summary.txt << EOF
WedSync Native App Build Summary
Generated: $BUILD_DATE

BUILD INFORMATION:
- Git Branch: $GIT_BRANCH
- Git Hash: $GIT_HASH  
- Node Version: $NODE_VERSION
- NPM Version: $NPM_VERSION
- Capacitor Version: $(npx cap --version)

PLATFORMS:
- iOS: $([ -d "ios" ] && echo "✅ Ready" || echo "❌ Not configured")
- Android: $([ -d "android" ] && echo "✅ Ready" || echo "❌ Not configured")

NEXT STEPS:
1. Review and customize app store metadata in app-store-assets/
2. Add app screenshots for both platforms
3. Test apps on physical devices
4. Submit for app store review

iOS SUBMISSION:
- Open ios/WedsSync.xcworkspace in Xcode
- Archive and upload to App Store Connect
- Fill out app store listing information
- Submit for review

ANDROID SUBMISSION:
- Upload AAB file to Google Play Console
- Fill out store listing information
- Set up content rating questionnaire
- Submit for review

EOF

log_success "Build summary created: build-summary.txt"

echo ""
echo "🎉 Native App Build Process Complete!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo "1. Review build-summary.txt for detailed next steps"
echo "2. Add app screenshots to app-store-assets/ directories"
echo "3. Customize app store metadata in the templates"
echo "4. Test on physical devices before submission"
echo ""
echo "🏪 App Store Submission:"
echo "• iOS: Use Xcode to archive and upload to App Store Connect"
echo "• Android: Upload AAB to Google Play Console"
echo ""
echo "📱 Files created:"
echo "• iOS app: ios/ directory"
echo "• Android app: android/ directory"  
echo "• App store assets: app-store-assets/ directory"
echo "• Build summary: build-summary.txt"
echo ""

if command -v open &> /dev/null; then
    echo "Opening app-store-assets directory..."
    open app-store-assets/
fi