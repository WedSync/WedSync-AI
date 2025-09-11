# TEAM B - BATCH 12 - ROUND 2 PROMPT
**WS-146: Advanced App Store Features & Native App Wrappers**
**Generated:** 2025-01-24 | **Team:** B | **Batch:** 12 | **Round:** 2/3

## MISSION STATEMENT
Building on Round 1's PWA foundation, Team B now implements native app wrappers using Capacitor, prepares for Google Play Store and Apple App Store submissions, and creates advanced app store features including review management, A/B testing for store listings, and deep linking capabilities.

## WEDDING CONTEXT USER STORY - ADVANCED APP SCENARIOS

### Sarah's Native Camera Integration Wedding Day
**The Story:** Sarah Kim, a wedding photographer in Portland, uses the native WedSync app during Emma's outdoor wedding. She needs to quickly capture and organize behind-the-scenes shots. The app's native camera integration lets her take photos directly within WedSync, automatically geotagged with the wedding location. These images sync instantly to Emma's timeline when WiFi is available, and push notifications alert the bride about new photos without Sarah having to manually send updates.

**Native Features Required:**
- Native camera API integration via Capacitor
- Push notifications with rich media
- Background sync for photos
- Geolocation services for automatic tagging

### David's Deep Link Client Coordination
**The Story:** David Martinez, a wedding planner in Miami, shares specific client timeline sections with vendors via deep links. When florist Jessica clicks the link "wedsync://client/emma-wedding/timeline/ceremony" on her iPhone, it opens the native WedSync app directly to Emma's ceremony timeline, even if the app wasn't open. This seamless deep linking ensures vendors always access the right information instantly without navigation confusion.

**Deep Linking Requirements:**
- Custom URL scheme handling
- Universal Links (iOS) and App Links (Android)
- Deep link routing within the app
- Fallback to web version for non-app users

## TECHNICAL REQUIREMENTS - ROUND 2 ADVANCED FEATURES

### Capacitor Native App Wrapper Implementation

```typescript
// Capacitor configuration from WS-146 spec
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.wedsync.supplier',
  appName: 'WedSync',
  webDir: 'out',
  bundledWebRuntime: false,

  server: {
    androidScheme: 'https'
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#6366F1",
      showSpinner: false,
      spinnerColor: "#FFFFFF"
    },
    
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },

    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#6366F1"
    },

    StatusBar: {
      style: "default",
      backgroundColor: "#6366F1"
    },

    Camera: {
      permissions: {
        camera: "WedSync needs camera access to capture wedding photos"
      }
    }
  },

  ios: {
    scheme: 'WedSync',
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    
    // App Store metadata
    bundleId: 'app.wedsync.supplier',
    version: '1.0.0',
    buildNumber: '1',
    
    // Permissions
    permissions: {
      camera: 'WedSync uses camera to capture wedding moments',
      photos: 'WedSync needs photo access to manage wedding galleries',
      notifications: 'Get notified when couples update their details'
    }
  },

  android: {
    buildOptions: {
      keystorePath: 'android/app/wedsync-release.keystore',
      keystoreAlias: 'wedsync-key',
      releaseType: 'APK'
    },
    
    // Google Play requirements
    targetSdk: 34,
    minSdk: 21,
    versionCode: 1,
    versionName: '1.0.0'
  }
};
```

### Advanced App Store Features

```typescript
// Review management system
export class ReviewManager {
  private reviewPromptTriggers = {
    minSessionCount: 5,
    minDaysInstalled: 7,
    mustHaveCompletedAction: true,
    noRecentPromptDays: 60,
    positiveSignalsRequired: 3
  };

  async evaluateReviewPrompt(): Promise<boolean> {
    const userState = await this.getUserState();
    
    // Check all trigger conditions
    const meetsRequirements = 
      userState.sessionCount >= this.reviewPromptTriggers.minSessionCount &&
      userState.daysInstalled >= this.reviewPromptTriggers.minDaysInstalled &&
      userState.hasCompletedAction &&
      userState.daysSinceLastPrompt >= this.reviewPromptTriggers.noRecentPromptDays;

    if (!meetsRequirements) return false;

    // Check for positive signals
    const positiveSignals = this.detectPositiveSignals(userState);
    
    return positiveSignals >= this.reviewPromptTriggers.positiveSignalsRequired;
  }

  private detectPositiveSignals(userState: any): number {
    let signals = 0;

    // Just completed a wedding successfully
    if (userState.recentWeddingCompleted) signals++;

    // High client engagement
    if (userState.clientResponseRate > 0.8) signals++;

    // Using advanced features
    if (userState.automationUsage > 0) signals++;

    // Repeat usage pattern
    if (userState.consecutiveDaysActive >= 3) signals++;

    return signals;
  }

  async showReviewPrompt(): Promise<void> {
    // First ask for feedback
    const feedbackResponse = await this.showFeedbackDialog();
    
    if (feedbackResponse === 'positive') {
      // Direct to app store
      this.showAppStoreReview();
    } else if (feedbackResponse === 'negative') {
      // Direct to feedback form
      this.showFeedbackForm();
    }
    
    // Record that we showed the prompt
    localStorage.setItem('last_review_prompt', new Date().toISOString());
  }

  private openAppStoreReview(): void {
    const userAgent = navigator.userAgent;
    let reviewUrl = '';

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      // iOS App Store
      reviewUrl = 'https://apps.apple.com/app/wedsync/id1234567890?action=write-review';
    } else if (/Android/.test(userAgent)) {
      // Google Play Store
      reviewUrl = 'https://play.google.com/store/apps/details?id=app.wedsync.supplier&showAllReviews=true';
    } else {
      // Microsoft Store
      reviewUrl = 'https://www.microsoft.com/store/apps/wedsync';
    }

    window.open(reviewUrl, '_blank');
  }
}
```

### Native Features Integration

```typescript
// Native device features integration
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

export class NativeFeatureService {
  
  async initializeNativeFeatures(): Promise<void> {
    // Initialize push notifications
    await this.setupPushNotifications();
    
    // Request camera permissions
    await this.requestCameraPermissions();
    
    // Setup deep linking
    await this.setupDeepLinking();
  }

  async captureWeddingPhoto(context: 'timeline' | 'gallery' | 'notes'): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true
      });

      // Get current location for geotagging
      const location = await this.getCurrentLocation();
      
      // Upload with context
      const uploadResult = await this.uploadPhotoWithContext(image.webPath!, {
        context,
        location,
        timestamp: new Date().toISOString()
      });

      return uploadResult.url;
    } catch (error) {
      console.error('Photo capture failed:', error);
      return null;
    }
  }

  async getCurrentLocation(): Promise<{latitude: number, longitude: number} | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude
      };
    } catch (error) {
      console.error('Location access failed:', error);
      return null;
    }
  }

  private async setupPushNotifications(): Promise<void> {
    try {
      // Request permissions
      let permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        // Handle registration
        PushNotifications.addListener('registration', (token) => {
          this.sendTokenToServer(token.value);
        });
        
        // Handle incoming notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.handlePushNotification(notification);
        });
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  private async setupDeepLinking(): Promise<void> {
    // Handle app launch from deep link
    document.addEventListener('DOMContentLoaded', () => {
      // Check for launch parameters
      const urlParams = new URLSearchParams(window.location.search);
      const deepLink = urlParams.get('deeplink');
      
      if (deepLink) {
        this.handleDeepLink(deepLink);
      }
    });

    // Handle deep links while app is running
    window.addEventListener('appurlopen', (event: any) => {
      this.handleDeepLink(event.url);
    });
  }

  private handleDeepLink(url: string): void {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      
      // Route based on deep link path
      if (path.includes('/client/')) {
        const clientId = path.split('/client/')[1].split('/')[0];
        this.navigateToClient(clientId);
      } else if (path.includes('/timeline/')) {
        const timelineId = path.split('/timeline/')[1];
        this.navigateToTimeline(timelineId);
      } else if (path.includes('/forms/')) {
        const formId = path.split('/forms/')[1];
        this.navigateToForm(formId);
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
    }
  }

  async shareWeddingContent(content: {
    title: string;
    text: string;
    url?: string;
    files?: string[];
  }): Promise<void> {
    try {
      await Share.share({
        title: content.title,
        text: content.text,
        url: content.url,
        dialogTitle: 'Share Wedding Details'
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }
}
```

### Implementation Focus - Round 2
1. **Native App Wrapper Development**
   - Capacitor iOS app development
   - Android app with Google Play requirements
   - Native device API integration
   - Platform-specific optimizations

2. **App Store Submission Preparation**
   - Apple App Store submission materials
   - Google Play Store listing optimization
   - App store compliance validation
   - Privacy policy and legal requirements

3. **Advanced App Features**
   - Push notification system
   - Deep linking implementation
   - Native camera integration
   - Review management system

## MCP SERVER INTEGRATION REQUIREMENTS - ROUND 2

### Enhanced Context7 Queries
```typescript
await mcp__context7__get-library-docs("/ionic/capacitor", "native device features integration", 4000);
await mcp__context7__get-library-docs("/capacitor/camera", "mobile camera integration", 2500);
await mcp__context7__get-library-docs("/capacitor/push-notifications", "push notification setup", 3000);
```

### Supabase Native App Analytics
```sql
-- Enhanced app analytics for native features
CREATE TABLE IF NOT EXISTS native_app_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android', 'pwa'
  device_info JSONB,
  
  -- Feature usage tracking
  camera_usage_count INTEGER DEFAULT 0,
  push_notifications_enabled BOOLEAN DEFAULT false,
  deep_links_used INTEGER DEFAULT 0,
  native_shares_count INTEGER DEFAULT 0,
  
  -- Session data
  session_duration INTEGER, -- seconds
  offline_usage_time INTEGER, -- seconds spent offline
  background_sync_events INTEGER DEFAULT 0,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tracking
CREATE TABLE IF NOT EXISTS push_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  target_audience TEXT, -- 'all_users', 'active_users', 'at_risk_users'
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  deep_link_url TEXT,
  
  -- Targeting
  platform_targeting TEXT[], -- 'ios', 'android', 'pwa'
  user_segment_targeting JSONB,
  
  -- Performance metrics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## SECURITY REQUIREMENTS - ROUND 2

### Native App Security
1. **Capacitor Security Best Practices**
   - Secure native API usage with proper permissions
   - Implement certificate pinning for API calls
   - Secure storage for sensitive data
   - Proper data validation between native and web layers

2. **App Store Security Compliance**
   - iOS App Transport Security (ATS) compliance
   - Android security best practices
   - Privacy policy compliance for app stores
   - Secure handling of user permissions

### Security Implementation Checklist
- [ ] Native API permissions properly requested and handled
- [ ] Secure data storage for offline capabilities
- [ ] Push notification security with proper authentication
- [ ] Deep link validation to prevent malicious links

## TEAM DEPENDENCIES & COORDINATION - ROUND 2

### Enhanced Team Integration
- **Team A** (Performance): Native app performance must meet mobile standards
- **Team C** (Authentication): Native authentication flows and biometric support
- **Team D** (Encryption): Native secure storage and encryption APIs
- **Team E** (GDPR): App store privacy compliance and data handling

### Native App Coordination
1. **Performance Integration**
   - Native app performance testing with Team A
   - Mobile-specific optimization requirements
   - Battery usage optimization

2. **Security Coordination**
   - Native authentication with Team C
   - Secure native storage with Team D
   - Privacy compliance with Team E

## PLAYWRIGHT TESTING REQUIREMENTS - ROUND 2

### Native App Feature Testing
```typescript
describe('WS-146 Native App Features', () => {
  test('Capacitor native features integration', async () => {
    await mcp__playwright__browser_navigate({url: '/'});
    
    // Test native feature detection
    const nativeFeatures = await mcp__playwright__browser_evaluate({
      function: `() => {
        return {
          hasCapacitor: typeof window.Capacitor !== 'undefined',
          platform: window.Capacitor?.getPlatform(),
          isNative: window.Capacitor?.isNativePlatform(),
          plugins: window.Capacitor ? Object.keys(window.Capacitor.Plugins || {}) : []
        };
      }`
    });
    
    if (nativeFeatures.hasCapacitor) {
      expect(nativeFeatures.platform).toMatch(/ios|android/);
      expect(nativeFeatures.isNative).toBe(true);
      expect(nativeFeatures.plugins).toContain('Camera');
      expect(nativeFeatures.plugins).toContain('PushNotifications');
    }
  });

  test('Deep linking functionality', async () => {
    // Test deep link handling
    await mcp__playwright__browser_navigate({
      url: '/?deeplink=wedsync://client/test-client-123/timeline'
    });
    
    // Should navigate to specific client timeline
    await mcp__playwright__browser_wait_for({text: 'test-client-123'});
    
    const currentUrl = await mcp__playwright__browser_evaluate({
      function: '() => window.location.pathname'
    });
    
    expect(currentUrl).toContain('/client/test-client-123');
  });

  test('Push notification handling simulation', async () => {
    await mcp__playwright__browser_navigate({url: '/dashboard'});
    
    // Simulate push notification received
    await mcp__playwright__browser_evaluate({
      function: `() => {
        const notification = {
          title: 'Client Update',
          body: 'Emma updated her wedding timeline',
          data: {
            type: 'timeline_update',
            clientId: 'emma-wedding',
            deepLink: '/client/emma-wedding/timeline'
          }
        };
        
        // Simulate notification handler
        if (window.handlePushNotification) {
          window.handlePushNotification(notification);
        }
      }`
    });
    
    // Should show notification UI
    await mcp__playwright__browser_wait_for({text: 'Client Update'});
  });

  test('Native camera integration simulation', async () => {
    await mcp__playwright__browser_navigate({url: '/timeline/edit'});
    
    // Test camera button presence
    const cameraButton = await mcp__playwright__browser_evaluate({
      function: `() => {
        const button = document.querySelector('[data-testid="camera-capture"]');
        return button ? true : false;
      }`
    });
    
    expect(cameraButton).toBe(true);
    
    // Simulate camera capture (mock)
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Mock camera result
        const mockImageUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
        if (window.handleCameraResult) {
          window.handleCameraResult({ webPath: mockImageUri });
        }
      }`
    });
  });
});
```

### App Store Compliance Testing
```typescript
test('App store compliance validation', async () => {
  await mcp__playwright__browser_navigate({url: '/'});
  
  // Test service worker registration
  const serviceWorkerRegistered = await mcp__playwright__browser_evaluate({
    function: `() => {
      return navigator.serviceWorker.getRegistrations()
        .then(registrations => registrations.length > 0);
    }`
  });
  
  expect(serviceWorkerRegistered).toBe(true);
  
  // Test offline capability
  await mcp__playwright__browser_evaluate({
    function: `() => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    }`
  });
  
  // App should still function offline
  await mcp__playwright__browser_click({
    element: 'Dashboard link',
    ref: '[href="/dashboard"]'
  });
  
  await mcp__playwright__browser_wait_for({text: 'Dashboard'});
});

test('Review prompt triggers correctly', async () => {
  await mcp__playwright__browser_navigate({url: '/dashboard'});
  
  // Simulate user meeting review criteria
  await mcp__playwright__browser_evaluate({
    function: `() => {
      localStorage.setItem('session_count', '10');
      localStorage.setItem('days_installed', '14');
      localStorage.setItem('actions_completed', '25');
      localStorage.setItem('recent_wedding_completed', 'true');
    }`
  });
  
  // Trigger review evaluation
  await mcp__playwright__browser_evaluate({
    function: `() => {
      if (window.checkReviewPrompt) {
        window.checkReviewPrompt();
      }
    }`
  });
  
  // Should show review prompt
  await mcp__playwright__browser_wait_for({text: 'How\'s your WedSync experience?'});
});
```

## SPECIFIC IMPLEMENTATION TASKS - ROUND 2

### Day 1: Capacitor Setup and iOS App Development
1. **Capacitor Configuration**
   - Install and configure Capacitor
   - Set up iOS project with Xcode
   - Configure app icons and splash screens
   - Set up signing certificates

2. **iOS Native Features**
   - Implement camera integration
   - Add push notification support
   - Configure iOS permissions
   - Test on iOS simulator and device

### Day 2: Android App Development
1. **Android Studio Setup**
   - Configure Android project
   - Set up Google Play signing
   - Implement Android-specific features
   - Configure Android permissions

2. **Google Play Requirements**
   - Add Android App Bundle (AAB) support
   - Implement Android security requirements
   - Configure Play Console metadata
   - Test on Android devices

### Day 3: Native Device API Integration
1. **Camera and Media APIs**
   - Integrate native camera functionality
   - Add photo upload with geolocation
   - Implement native image processing
   - Test camera permissions flow

2. **Push Notification System**
   - Set up push notification infrastructure
   - Implement notification handling
   - Add rich media notifications
   - Test cross-platform notifications

### Day 4: Deep Linking Implementation
1. **Deep Link Configuration**
   - Set up custom URL schemes
   - Configure Universal Links (iOS)
   - Implement App Links (Android)
   - Create deep link routing system

2. **Deep Link Testing**
   - Test deep link navigation
   - Implement fallback handling
   - Add deep link analytics
   - Test cross-platform deep links

### Day 5: App Store Submission Preparation
1. **Apple App Store Preparation**
   - Create App Store listing
   - Generate iOS screenshots
   - Prepare App Store review notes
   - Complete iOS submission process

2. **Google Play Store Preparation**
   - Create Play Store listing
   - Generate Android screenshots
   - Prepare release notes
   - Complete Play Store submission

### Day 6: Review Management and Analytics
1. **Review Management System**
   - Implement review prompt logic
   - Add feedback collection system
   - Create review response templates
   - Set up review monitoring

2. **Advanced Analytics**
   - Track native feature usage
   - Monitor app store performance
   - Implement conversion tracking
   - Create app analytics dashboard

## ACCEPTANCE CRITERIA - ROUND 2

### Native App Functionality
- [ ] iOS app builds and runs on devices with all native features
- [ ] Android app meets Google Play Store requirements
- [ ] Native camera integration works seamlessly
- [ ] Push notifications deliver and display correctly

### App Store Submissions
- [ ] Apple App Store submission completed and approved
- [ ] Google Play Store submission completed and approved
- [ ] App store listings optimized with keywords and screenshots
- [ ] Privacy policies and terms of service compliant

### Deep Linking & Sharing
- [ ] Deep links open correct app sections on all platforms
- [ ] Universal Links (iOS) and App Links (Android) configured
- [ ] Native sharing functionality works across platforms
- [ ] Deep link analytics tracking user engagement

### Review Management
- [ ] Review prompts show only for satisfied users
- [ ] Review management system maintains 4.5+ star average
- [ ] Feedback collection system capturing user insights
- [ ] Review response system maintaining customer relationships

## SUCCESS METRICS - ROUND 2
- **App Store Approval:** Both iOS and Android apps approved
- **User Adoption:** 25%+ of web users install native app
- **Review Rating:** Maintain 4.5+ stars across all platforms
- **Native Features:** 60%+ of native app users use camera/push notifications
- **Deep Links:** 40%+ conversion rate from deep links to app usage

## ROUND 2 DELIVERABLES
1. **Native Mobile Apps**
   - iOS app with full native feature integration
   - Android app meeting Play Store requirements
   - Cross-platform native functionality
   - Native camera and push notification systems

2. **App Store Presence**
   - Apple App Store listing and approval
   - Google Play Store listing and approval
   - Optimized store listings with ASO
   - Professional app store assets

3. **Advanced App Features**
   - Deep linking system across platforms
   - Native sharing capabilities
   - Review management system
   - Advanced app analytics

4. **Testing Infrastructure**
   - Native app testing suite
   - App store compliance validation
   - Cross-platform feature testing
   - Performance testing for native apps

**TEAM B - NATIVE APPS LAUNCHED! WEDSYNC IS NOW TRULY MOBILE-FIRST! 📱✨**