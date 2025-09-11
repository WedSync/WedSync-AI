# 06-app-store-preparation.md

# App Store Preparation Guide for WedSync/WedMe

## Overview

While WedSync/WedMe will initially launch as Progressive Web Apps (PWAs), preparing for eventual native app store presence is crucial for market reach and credibility. This guide covers both immediate PWA app store strategies and future native app preparations.

## PWA to App Store Strategy

### Current Options for PWAs

### 1. Microsoft Store (Immediate)

```json
// manifest.json for Microsoft Store
{
  "name": "WedSync - Wedding Vendor Platform",
  "short_name": "WedSync",
  "description": "Professional wedding vendor management platform",
  "categories": ["business", "productivity"],
  "iarc_rating_id": "e84b8d71-ff39-4c75-b6e3-23f3bcb7bcac",
  "screenshots": [
    {
      "src": "/screenshots/desktop-dashboard.png",
      "sizes": "1280x800",
      "type": "image/png",
      "platform": "wide"
    },
    {
      "src": "/screenshots/mobile-forms.png",
      "sizes": "750x1334",
      "type": "image/png",
      "platform": "narrow"
    }
  ]
}

```

### 2. Google Play Store (via TWA)

```xml
<!-- Trusted Web Activity configuration -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity">
            <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="https://wedsync.app" />
            <meta-data android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
                android:value="#6366F1" />
            <meta-data android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
                android:value="#FFFFFF" />
        </activity>
    </application>
</manifest>

```

### 3. Apple App Store (Wrapped PWA)

Using Capacitor or similar to wrap the PWA with native shell:

```jsx
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'app.wedsync.mobile',
  appName: 'WedSync',
  webDir: 'out',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true
  }
};

```

## App Store Optimization (ASO)

### App Titles and Subtitles

### WedSync (Supplier App)

```
Primary Title: WedSync - Wedding Vendor Hub
Subtitle: Manage Clients & Automate Workflows
Alternative: WedSync for Wedding Professionals

Keywords Focus:
- wedding vendor
- wedding planner app
- photographer tools
- wedding business
- client management

```

### WedMe (Couple App)

```
Primary Title: WedMe - Wedding Planning Hub
Subtitle: Coordinate All Your Wedding Vendors
Alternative: WedMe - Your Wedding Command Center

Keywords Focus:
- wedding planning
- wedding organizer
- vendor coordination
- wedding checklist
- wedding timeline

```

### App Descriptions

### WedSync Description Structure

```markdown
## Short Description (80 chars)
"Streamline your wedding business with automated workflows and client management"

## Full Description (4000 chars)

### Opening Hook (First 255 chars - most important!)
Transform your wedding business with WedSync - the all-in-one platform that saves
you 10+ hours per wedding. Manage clients, automate communications, and coordinate
with other vendors seamlessly.

### Key Features
⭐ SMART CLIENT MANAGEMENT
• Import existing clients instantly
• Track wedding timelines and tasks
• Never chase information again

📝 INTELLIGENT FORMS
• Convert PDFs to smart forms with AI
• Auto-populate client information
• Collect responses seamlessly

🚀 WORKFLOW AUTOMATION
• Build visual customer journeys
• Automate emails and reminders
• Track client engagement

📊 BUSINESS INSIGHTS
• Monitor performance metrics
• Track conversion rates
• Identify growth opportunities

### Social Proof
Join 5,000+ wedding professionals who've transformed their business with WedSync.

### Call to Action
Download now and start your 30-day free trial - no credit card required!

```

## Visual Assets Requirements

### App Icons

```tsx
// Icon size requirements for all platforms
const ICON_SIZES = {
  ios: [
    { size: '20x20', scales: [2, 3] },      // Notification
    { size: '29x29', scales: [2, 3] },      // Settings
    { size: '40x40', scales: [2, 3] },      // Spotlight
    { size: '60x60', scales: [2, 3] },      // iPhone
    { size: '76x76', scales: [1, 2] },      // iPad
    { size: '83.5x83.5', scales: [2] },     // iPad Pro
    { size: '1024x1024', scales: [1] }      // App Store
  ],
  android: [
    { size: '48x48', dpi: 'mdpi' },
    { size: '72x72', dpi: 'hdpi' },
    { size: '96x96', dpi: 'xhdpi' },
    { size: '144x144', dpi: 'xxhdpi' },
    { size: '192x192', dpi: 'xxxhdpi' },
    { size: '512x512', dpi: 'store' }
  ],
  pwa: [
    '72x72', '96x96', '128x128', '144x144',
    '152x152', '192x192', '384x384', '512x512'
  ]
};

```

### Screenshots Specifications

```tsx
interface ScreenshotRequirements {
  ios: {
    'iPhone 6.7"': { size: '1290x2796', devices: ['iPhone 15 Pro Max'] },
    'iPhone 6.5"': { size: '1242x2688', devices: ['iPhone 11 Pro Max'] },
    'iPhone 5.5"': { size: '1242x2208', devices: ['iPhone 8 Plus'] },
    'iPad 12.9"': { size: '2048x2732', devices: ['iPad Pro'] },
    required: 3,
    maximum: 10
  },
  android: {
    phone: { size: '1080x1920', ratio: '16:9' },
    tablet7: { size: '1200x1920', ratio: '16:10' },
    tablet10: { size: '1600x2560', ratio: '16:10' },
    required: 2,
    maximum: 8
  }
}

```

### Screenshot Content Strategy

```tsx
// Screenshot flow for maximum conversion
const SCREENSHOT_SEQUENCE = [
  {
    order: 1,
    title: "Your Complete Dashboard",
    focus: "Show populated dashboard with real data",
    caption: "See everything at a glance"
  },
  {
    order: 2,
    title: "Smart Forms That Auto-Fill",
    focus: "Form builder with AI generation",
    caption: "Create forms in seconds, not hours"
  },
  {
    order: 3,
    title: "Visual Workflow Builder",
    focus: "Journey canvas with nodes",
    caption: "Automate your entire client journey"
  },
  {
    order: 4,
    title: "Real Client Success",
    focus: "Testimonial or metric",
    caption: '"Saved me 15 hours this week!" - Sarah P.'
  },
  {
    order: 5,
    title: "Works With Your Tools",
    focus: "Integration logos",
    caption: "Connects with tools you already use"
  }
];

```

## App Store Metadata

### Category Selection

```yaml
WedSync:
  primary_category: Business
  secondary_category: Productivity

WedMe:
  primary_category: Lifestyle
  secondary_category: Productivity

# Alternative categories to consider
alternatives:
  - Planning
  - Events
  - Social

```

### Age Rating & Content

```jsx
// Content rating questionnaire answers
const contentRating = {
  violence: 'none',
  sexualContent: 'none',
  profanity: 'none',
  drugs: 'none',
  gambling: 'none',
  horror: 'none',
  userGenerated: 'yes', // Users can create content
  webAccess: 'unrestricted',
  personalInfo: 'yes', // Collects user data
  location: 'optional',
  ageRating: '4+' // Suitable for all ages
};

```

### Privacy Policy Requirements

```markdown
## Required Privacy Policy Sections

1. **Information We Collect**
   - Account information (name, email, phone)
   - Wedding details (date, venue, vendors)
   - Usage analytics (anonymized)
   - Device information (for optimization)

2. **How We Use Information**
   - Provide core services
   - Send transaction emails
   - Improve platform features
   - Customer support

3. **Data Sharing**
   - Only between connected couples/vendors
   - No selling to third parties
   - Legal compliance when required

4. **Data Security**
   - End-to-end encryption
   - GDPR compliance
   - Regular security audits
   - Data breach protocols

5. **User Rights**
   - Access your data
   - Export your data
   - Delete your account
   - Opt-out of marketing

```

## Release Strategy

### Phased Rollout Plan

```tsx
interface ReleasePhases {
  phase1: {
    name: 'Soft Launch',
    duration: '2 weeks',
    regions: ['UK'],
    features: 'Core features only',
    users: 'Beta testers'
  },
  phase2: {
    name: 'Limited Release',
    duration: '1 month',
    regions: ['UK', 'Ireland'],
    features: 'All features except marketplace',
    users: 'Early adopters'
  },
  phase3: {
    name: 'Full Release',
    duration: 'Ongoing',
    regions: ['Global English-speaking'],
    features: 'Complete platform',
    users: 'General public'
  }
}

```

### Version Numbering Strategy

```jsx
// Semantic versioning for app stores
const VERSION_STRATEGY = {
  format: 'MAJOR.MINOR.PATCH',
  examples: {
    launch: '1.0.0',
    bugFix: '1.0.1',
    feature: '1.1.0',
    majorUpdate: '2.0.0'
  },
  buildNumber: {
    format: 'YYYYMMDD.HHMM',
    example: '20250315.1430'
  }
};

```

## Review Management

### Review Prompt Strategy

```tsx
// In-app review prompt logic
const reviewPromptTriggers = {
  conditions: {
    minSessionCount: 5,
    minDaysInstalled: 7,
    successfulAction: true, // Just completed a wedding
    noRecentPrompt: 60 // Days since last prompt
  },

  timing: {
    afterSuccessfulBooking: true,
    afterPositiveFeedback: true,
    notDuringActiveTask: true
  },

  message: "Enjoying WedSync? Help other wedding pros discover us!"
};

```

### Review Response Templates

```markdown
## Positive Review Response (5 stars)
"Thank you so much for your support, [Name]! We're thrilled WedSync
is helping your business. Your success is our success! 🎉"

## Constructive Review Response (3-4 stars)
"Thanks for your honest feedback, [Name]. We'd love to learn more
about your experience. Please email support@wedsync.app so we can help!"

## Negative Review Response (1-2 stars)
"We're sorry to hear about your experience. This isn't the standard
we aim for. Please contact support@wedsync.app immediately so we can
make this right."

```

## Launch Checklist

### Pre-Launch Requirements

- [ ]  App icons in all required sizes
- [ ]  Screenshots for all device types
- [ ]  Privacy policy URL live
- [ ]  Terms of service URL live
- [ ]  Support email configured
- [ ]  App preview video (optional but recommended)
- [ ]  Localized descriptions (UK/US English minimum)
- [ ]  Content rating questionnaire completed
- [ ]  Test builds on all target devices

### Technical Requirements

- [ ]  Deep linking configured
- [ ]  Push notifications setup
- [ ]  Analytics integration
- [ ]  Crash reporting enabled
- [ ]  Offline functionality tested
- [ ]  Accessibility compliance verified
- [ ]  Performance benchmarks met
- [ ]  Security audit completed

### Marketing Preparation

- [ ]  Press kit ready
- [ ]  Launch announcement drafted
- [ ]  Influencer outreach list
- [ ]  App store ads configured (optional)
- [ ]  Social media campaign scheduled
- [ ]  Email campaign to beta users
- [ ]  Website app store badges added

## Native App Roadmap

### Future Native Features

```tsx
interface NativeEnhancements {
  ios: {
    widgets: ['Today wedding', 'Client counter'],
    siri: ['Check timeline', 'Add note'],
    watch: ['Notifications', 'Quick actions'],
    carPlay: ['Directions to venue']
  },
  android: {
    widgets: ['Dashboard summary', 'Quick add'],
    assistant: ['Voice commands'],
    wear: ['Notifications', 'Timeline'],
    auto: ['Navigation to venues']
  }
}

```

### Platform-Specific Optimizations

- iOS: Face ID/Touch ID for quick login
- Android: Material You theming
- Both: Native camera integration for document scanning
- Both: Calendar app integration
- Both: Contact app sync for client management

## Success Metrics

### App Store KPIs

- Downloads: 1,000 in first month
- Rating: Maintain 4.5+ stars
- Reviews: 50+ in first quarter
- Conversion: 25% download to activation
- Retention: 60% monthly active users
- Updates: Monthly feature releases

### ROI Tracking

- Customer acquisition cost via app stores
- Lifetime value of app store users
- Organic vs paid download ratio
- Cross-platform usage patterns
- App store as discovery channel percentage