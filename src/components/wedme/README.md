# WedMe File Management System - Complete Documentation

## 📖 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Components](#components)
5. [Mobile Experience](#mobile-experience)
6. [Performance Optimization](#performance-optimization)
7. [Testing](#testing)
8. [API Reference](#api-reference)
9. [Integration Guide](#integration-guide)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)

## Overview

WedMe is a comprehensive file management and sharing platform designed specifically for couples planning their wedding. It provides intelligent organization, viral sharing capabilities, vendor discovery, and magical timeline creation to help couples manage and share their wedding journey.

### Key Value Propositions

- **Magical Timeline Creation**: AI-powered storytelling that transforms wedding files into beautiful, shareable narratives
- **Viral Growth Engine**: Intelligent social media optimization to amplify wedding content reach
- **Smart Vendor Discovery**: AI analysis of wedding files to recommend relevant vendors
- **Family & Friends Sharing**: Private, secure sharing with intelligent group management
- **Mobile-First Experience**: Optimized for on-the-go wedding planning and sharing

## Architecture

### System Architecture

```
WedMe Platform Architecture

┌─────────────────────────────────────────────────────────────┐
│                    WedMe Frontend (React/TypeScript)        │
├─────────────────────────────────────────────────────────────┤
│  Mobile Components                Desktop Components         │
│  ├── MobileFileHub              ├── WeddingTimelineExperience│
│  ├── MobileTimelineView         ├── VendorDiscoveryEngine   │
│  ├── MobileSharingInterface     ├── FamilyFriendsSharing    │
│  └── MobileWedMeLayout         └── ViralGrowthDashboard    │
├─────────────────────────────────────────────────────────────┤
│                    Core Services Layer                      │
│  ├── File Management Service    ├── AI Analysis Service     │
│  ├── Timeline Generation        ├── Viral Analytics Engine  │
│  ├── Sharing Engine            └── Performance Optimizer   │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  ├── WedSync Platform Sync     ├── Social Media APIs       │
│  ├── Vendor Marketplace        └── Analytics Services      │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                              │
│  ├── File Storage (Supabase)   ├── Analytics Database      │
│  ├── User Profiles             └── Cache Layer (Redis)     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Mobile Optimization**: Framer Motion, Progressive Loading
- **State Management**: Zustand, TanStack Query
- **AI/ML**: OpenAI GPT-4, Computer Vision APIs
- **Performance**: Image optimization, lazy loading, memory management
- **Testing**: Jest, React Testing Library, Playwright
- **Backend Integration**: Supabase, WedSync Platform APIs

## Core Features

### 1. Magical Timeline Creation

Transform wedding files into compelling narratives with AI-enhanced storytelling.

#### Features:
- **Emotional Curve Analysis**: AI detects emotional peaks and valleys in wedding journey
- **Story Arc Generation**: Creates coherent narratives with beginning, middle, end
- **Smart Moment Detection**: Automatically identifies key milestones and highlights
- **Social Optimization**: Optimizes timeline content for maximum social engagement

#### Usage:
```typescript
import { WeddingTimelineExperience } from '@/components/wedme/timeline/WeddingTimelineExperience';

<WeddingTimelineExperience
  couple={coupleProfile}
  files={weddingFiles}
  onTimelineGenerated={(timeline) => {
    console.log('Generated timeline:', timeline);
    console.log('Emotional curve:', timeline.emotionalCurve);
    console.log('Story arcs:', timeline.storyArcs);
  }}
  onMomentSelect={(moment) => {
    // Handle moment selection for detailed view
  }}
  viralOptimization={true}
/>
```

### 2. Viral Growth Engine

Maximize reach and engagement through intelligent social media optimization.

#### Features:
- **Platform-Specific Optimization**: Tailored content for Instagram, Facebook, Twitter, TikTok
- **Viral Potential Analysis**: AI-powered scoring of content viral potential
- **Optimal Timing Recommendations**: Data-driven posting schedule optimization
- **Hashtag Intelligence**: Automated relevant hashtag suggestions
- **Audience Targeting**: Smart audience segmentation and targeting

#### Usage:
```typescript
import { ViralGrowthDashboard } from '@/components/wedme/viral/ViralGrowthDashboard';

<ViralGrowthDashboard
  couple={coupleProfile}
  metrics={viralMetrics}
  onOptimizeContent={(recommendations) => {
    // Apply viral optimization recommendations
    console.log('Optimization suggestions:', recommendations);
  }}
  onSchedulePost={(schedule) => {
    // Schedule optimized posts
  }}
/>
```

### 3. Smart Vendor Discovery

AI-powered vendor recommendations based on wedding file analysis.

#### Features:
- **Intelligent Analysis**: Computer vision analysis of photos/videos to identify needs
- **Vendor Matching**: Smart matching with relevant wedding vendors
- **Portfolio Integration**: Seamless vendor portfolio viewing and comparison
- **Direct Connection**: One-click vendor inquiry and connection
- **Quality Scoring**: AI-powered vendor quality assessment

#### Usage:
```typescript
import { VendorDiscoveryEngine } from '@/components/wedme/vendor-discovery/VendorDiscoveryEngine';

<VendorDiscoveryEngine
  files={weddingFiles}
  couple={coupleProfile}
  onVendorDiscovered={(vendors) => {
    console.log('Discovered vendors:', vendors);
    vendors.forEach(vendor => {
      console.log(`${vendor.name}: ${vendor.confidence * 100}% match`);
    });
  }}
  onVendorConnect={(vendor) => {
    // Handle vendor connection
  }}
/>
```

### 4. Family & Friends Sharing

Secure, intelligent sharing with privacy controls and group management.

#### Features:
- **Intelligent Grouping**: AI-powered relationship categorization
- **Privacy Controls**: Granular permission management
- **Bulk Sharing**: Efficient multi-file, multi-group sharing
- **Access Analytics**: Track who viewed, liked, commented on content
- **Smart Notifications**: Contextual sharing notifications

#### Usage:
```typescript
import { FamilyFriendsSharing } from '@/components/wedme/sharing/FamilyFriendsSharing';

<FamilyFriendsSharing
  couple={coupleProfile}
  groups={sharingGroups}
  files={selectedFiles}
  onCreateGroup={(group) => {
    // Create new sharing group with AI categorization
  }}
  onShare={(shareRequest) => {
    console.log('Sharing with groups:', shareRequest.groups);
    console.log('Privacy level:', shareRequest.privacyLevel);
  }}
/>
```

## Components

### Core Components

#### WeddingTimelineExperience
**Location**: `src/components/wedme/timeline/WeddingTimelineExperience.tsx`

The main timeline component that creates magical wedding narratives from uploaded files.

**Props**:
```typescript
interface WeddingTimelineExperienceProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  onTimelineGenerated?: (timeline: MagicalTimeline) => void;
  onMomentSelect?: (moment: TimelineMoment) => void;
  onShare?: (timeline: MagicalTimeline, groups: SharingGroup[]) => void;
  viralOptimization?: boolean;
}
```

**Key Features**:
- AI-enhanced timeline generation
- Emotional curve visualization
- Interactive moment exploration
- Social sharing optimization
- Mobile-responsive design

#### VendorDiscoveryEngine
**Location**: `src/components/wedme/vendor-discovery/VendorDiscoveryEngine.tsx`

AI-powered vendor discovery and recommendation system.

**Props**:
```typescript
interface VendorDiscoveryEngineProps {
  files: WeddingFile[];
  couple: CoupleProfile;
  onVendorDiscovered?: (vendors: VendorMatch[]) => void;
  onVendorConnect?: (vendor: VendorMatch) => void;
  discoveryMode?: 'curated' | 'browse' | 'similar' | 'trending';
}
```

**AI Analysis Capabilities**:
- Photo/video quality assessment
- Style and aesthetic analysis
- Venue type detection
- Service gap identification
- Vendor matching algorithms

#### FamilyFriendsSharing
**Location**: `src/components/wedme/sharing/FamilyFriendsSharing.tsx`

Comprehensive sharing platform with intelligent group management.

**Props**:
```typescript
interface FamilyFriendsSharingProps {
  couple: CoupleProfile;
  groups: SharingGroup[];
  files: WeddingFile[];
  onCreateGroup?: (group: Omit<SharingGroup, 'id'>) => void;
  onUpdateGroup?: (groupId: string, updates: Partial<SharingGroup>) => void;
  onShare?: (request: ViralSharingRequest) => Promise<ViralResult>;
}
```

**Privacy Features**:
- Role-based access control
- Group-specific permissions
- Content expiration settings
- Download restrictions
- View tracking and analytics

#### ViralGrowthDashboard
**Location**: `src/components/wedme/viral/ViralGrowthDashboard.tsx`

Comprehensive viral growth tracking and optimization dashboard.

**Props**:
```typescript
interface ViralGrowthDashboardProps {
  couple: CoupleProfile;
  metrics: ViralMetrics;
  onOptimizeContent?: (recommendations: ContentOptimization) => void;
  onSchedulePost?: (schedule: PostSchedule) => void;
  historicalData?: ViralMetrics[];
}
```

**Analytics Features**:
- Real-time engagement tracking
- Platform performance comparison
- Growth rate analysis
- Content optimization recommendations
- Audience insights and demographics

## Mobile Experience

### Mobile-First Design Philosophy

WedMe is designed with a mobile-first approach, recognizing that couples primarily interact with their wedding content on mobile devices.

#### Mobile Components

##### MobileFileHub
**Location**: `src/components/wedme/mobile/MobileFileHub.tsx`

Mobile-optimized file management interface with touch-friendly interactions.

**Features**:
- Grid and list view modes
- Touch gestures for selection
- Progressive loading for large file sets
- Optimized image loading
- Quick action floating buttons

##### MobileTimelineView
**Location**: `src/components/wedme/mobile/MobileTimelineView.tsx`

Mobile timeline experience with autoplay and gesture navigation.

**Features**:
- Autoplay functionality
- Swipe navigation
- Parallax scrolling effects
- Mobile-optimized moment cards
- Quick sharing actions

##### MobileSharingInterface
**Location**: `src/components/wedme/mobile/MobileSharingInterface.tsx`

Step-by-step mobile sharing workflow with AI assistance.

**Features**:
- Multi-step wizard interface
- AI content suggestions
- Platform-specific optimization
- Touch-friendly group selection
- Real-time preview

##### MobileWedMeLayout
**Location**: `src/components/wedme/mobile/MobileWedMeLayout.tsx`

Complete mobile application layout with bottom navigation.

**Features**:
- Bottom tab navigation
- Floating action buttons
- Mobile menu sidebar
- Notification management
- State persistence

### Mobile Performance Optimizations

#### Image Optimization
```typescript
import { ImageOptimizer } from '@/lib/wedme/performance-optimization';

// Automatic mobile image optimization
const optimized = await ImageOptimizer.optimizeImage(file, 'mobile');
```

#### Lazy Loading
```typescript
import { LazyLoader } from '@/lib/wedme/performance-optimization';

<LazyLoader threshold={0.1}>
  <img src={imageUrl} alt="Wedding photo" loading="lazy" />
</LazyLoader>
```

#### Progressive Loading
```typescript
import { ProgressiveLoader } from '@/lib/wedme/performance-optimization';

const progressiveLoader = new ProgressiveLoader();
const loadedFiles = await progressiveLoader.loadBatch(files, {
  batchSize: 20,
  loadDelay: 50
});
```

## Performance Optimization

### Core Optimization Strategies

#### 1. Image Optimization
**File**: `src/lib/wedme/performance-optimization.ts`

Automatic image optimization for different contexts:
- **Thumbnail**: 150x150px, 70% quality
- **Preview**: 800x600px, 80% quality
- **Mobile**: 400x300px, 75% quality
- **Full**: Original dimensions, 90% quality

#### 2. Memory Management
```typescript
import { MemoryManager } from '@/lib/wedme/performance-optimization';

const memoryManager = new MemoryManager();

// Automatic cleanup on component unmount
useEffect(() => {
  return () => {
    memoryManager.cleanup();
  };
}, []);
```

#### 3. Network Optimization
- Request queuing and batching
- Intelligent retry mechanisms
- Bandwidth-aware loading
- Cache-first strategies

#### 4. Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features loaded progressively
- Graceful degradation on slower connections

### Performance Metrics

Target performance benchmarks:
- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Mobile Lighthouse Score**: > 90

## Testing

### Test Suite Overview

Comprehensive testing coverage across all components and functionality.

#### Test Categories

1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interaction workflows  
3. **Mobile Tests**: Mobile-specific functionality
4. **Performance Tests**: Loading and optimization validation
5. **Accessibility Tests**: WCAG 2.1 compliance
6. **Visual Regression Tests**: UI consistency validation

#### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run mobile-specific tests
npm run test:mobile

# Run performance tests
npm run test:performance

# Run accessibility tests
npm run test:a11y
```

#### Test Examples

```typescript
describe('WeddingTimelineExperience', () => {
  it('generates magical timeline from wedding files', async () => {
    const mockProps = {
      couple: mockCouple,
      files: mockFiles,
      onTimelineGenerated: jest.fn()
    };

    render(<WeddingTimelineExperience {...mockProps} />);

    await waitFor(() => {
      expect(mockProps.onTimelineGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          moments: expect.any(Array),
          emotionalCurve: expect.objectContaining({
            dataPoints: expect.any(Array),
            peakMoments: expect.any(Array)
          }),
          storyArcs: expect.any(Array)
        })
      );
    });
  });
});
```

### Coverage Requirements

- **Overall Coverage**: Minimum 90%
- **Component Coverage**: 95%
- **Integration Coverage**: 85%
- **Mobile Coverage**: 90%

## API Reference

### Core Types

#### CoupleProfile
```typescript
interface CoupleProfile {
  id: string;
  partnerOne: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  partnerTwo: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  weddingDate?: Date;
  venue?: string;
  preferences?: {
    theme: string;
    colors: string[];
    style: string;
  };
  isActive: boolean;
  createdAt: Date;
}
```

#### WeddingFile
```typescript
interface WeddingFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  category: 'photos' | 'videos' | 'documents' | 'audio';
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  uploadedBy: string;
  metadata?: {
    dimensions?: { width: number; height: number };
    location?: { latitude: number; longitude: number };
    capturedAt?: Date;
    camera?: string;
    lens?: string;
    duration?: number;
    resolution?: string;
    fps?: number;
  };
  tags?: string[];
  isFavorite?: boolean;
  aiAnalysis?: {
    people?: Array<{
      name: string;
      confidence: number;
      bbox: [number, number, number, number];
    }>;
    emotions?: Array<{
      type: string;
      confidence: number;
    }>;
    scene?: string;
    quality?: number;
    suggestions?: string[];
  };
  sharedWith?: SharingGroup[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}
```

#### TimelineMoment
```typescript
interface TimelineMoment {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  category: 'milestone' | 'preparation' | 'ceremony' | 'reception' | 'honeymoon';
  location?: string;
  files?: WeddingFile[];
  participants?: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  tags?: string[];
  isHighlight?: boolean;
  aiStoryNarrative?: {
    emotionalArc: string;
    storyBeats: string[];
    suggestedMusic: string;
    cinematicStyle: string;
  };
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}
```

#### ViralSharingRequest
```typescript
interface ViralSharingRequest {
  files: WeddingFile[];
  moments?: TimelineMoment[];
  platforms: SocialPlatform[];
  groups: SharingGroup[];
  caption: string;
  privacyLevel: PrivacyLevel;
  scheduledFor?: Date;
  viralOptimization: boolean;
  autoHashtags: boolean;
  contentSuggestion?: ContentSuggestion;
}
```

#### ViralResult
```typescript
interface ViralResult {
  success: boolean;
  shareId?: string;
  platformResults: Array<{
    platform: SocialPlatform;
    success: boolean;
    postId?: string;
    error?: string;
  }>;
  analytics?: {
    estimatedReach: number;
    viralPotential: number;
    engagementPrediction: number;
  };
}
```

### Core Services

#### Timeline Generation Service
```typescript
interface TimelineGenerationService {
  generateMagicalTimeline(
    files: WeddingFile[], 
    couple: CoupleProfile,
    options?: TimelineOptions
  ): Promise<MagicalTimeline>;
  
  calculateEmotionalCurve(
    moments: TimelineMoment[]
  ): EmotionalCurve;
  
  generateStoryNarrative(
    timeline: MagicalTimeline
  ): Promise<StoryNarrative>;
}
```

#### Viral Analytics Service
```typescript
interface ViralAnalyticsService {
  trackEngagement(
    content: WeddingFile | TimelineMoment,
    platform: SocialPlatform,
    engagement: EngagementMetrics
  ): Promise<void>;
  
  calculateViralScore(
    content: WeddingFile | TimelineMoment,
    historicalData: EngagementMetrics[]
  ): Promise<number>;
  
  generateOptimizationRecommendations(
    content: WeddingFile | TimelineMoment,
    targetPlatforms: SocialPlatform[]
  ): Promise<ContentOptimization[]>;
}
```

#### Vendor Discovery Service
```typescript
interface VendorDiscoveryService {
  analyzeFiles(files: WeddingFile[]): Promise<VendorAnalysis>;
  
  findMatchingVendors(
    analysis: VendorAnalysis,
    location: string,
    budget?: number
  ): Promise<VendorMatch[]>;
  
  scoreVendorMatch(
    vendor: VendorProfile,
    analysis: VendorAnalysis
  ): Promise<number>;
}
```

## Integration Guide

### WedSync Platform Integration

WedMe integrates seamlessly with the WedSync B2B platform for vendors.

#### Integration Architecture
```typescript
// Integration Hub Component
import { WedSyncIntegrationHub } from '@/components/wedme/integration/WedSyncIntegrationHub';

<WedSyncIntegrationHub
  couple={coupleProfile}
  connectedSuppliers={suppliers}
  onSyncData={(data) => {
    // Handle bidirectional sync
  }}
  onConflictResolution={(conflicts) => {
    // Handle data conflicts
  }}
  healthCheck={true}
/>
```

#### Bidirectional Sync Features
- Real-time data synchronization
- Conflict resolution algorithms
- Health monitoring and alerts
- Automatic retry mechanisms
- Data integrity validation

### Social Media Platform APIs

#### Supported Platforms
- **Instagram**: Business API, Stories, Reels
- **Facebook**: Graph API, Pages, Events
- **Twitter**: API v2, Tweets, Spaces
- **TikTok**: Developer API, Videos
- **LinkedIn**: Marketing API, Posts

#### Authentication Flow
```typescript
// Social platform authentication
const authenticatePlatform = async (platform: SocialPlatform) => {
  const authUrl = await generateAuthUrl(platform);
  const tokens = await handleAuthCallback(authUrl);
  return tokens;
};
```

### Third-Party Integrations

#### AI/ML Services
- **OpenAI GPT-4**: Content generation and optimization
- **Google Vision API**: Image analysis and recognition
- **AWS Rekognition**: Face detection and emotion analysis
- **Azure Cognitive Services**: Content moderation

#### Analytics Services
- **Google Analytics**: Web analytics and conversion tracking
- **Facebook Analytics**: Social media performance
- **Mixpanel**: User behavior analytics
- **Segment**: Customer data platform

## Troubleshooting

### Common Issues

#### Performance Issues
**Symptom**: Slow loading times, especially on mobile
**Solutions**:
1. Check image optimization settings
2. Verify progressive loading is enabled
3. Review network request batching
4. Monitor memory usage patterns

```typescript
// Debug performance
import { PerformanceMonitor } from '@/lib/wedme/performance-optimization';

const monitor = new PerformanceMonitor();
monitor.trackPageLoad();
monitor.trackImageLoading();
monitor.generateReport();
```

#### File Upload Issues
**Symptom**: Files not uploading or processing correctly
**Solutions**:
1. Verify file size limits (50MB for videos, 10MB for images)
2. Check supported MIME types
3. Ensure stable network connection
4. Review processing queue status

#### Sharing Failures
**Symptom**: Content not sharing to social platforms
**Solutions**:
1. Verify platform authentication tokens
2. Check content compliance with platform policies
3. Review API rate limits
4. Validate file formats for each platform

#### Mobile Responsiveness
**Symptom**: Components not displaying correctly on mobile
**Solutions**:
1. Test on actual devices, not just browser dev tools
2. Verify safe area insets are implemented
3. Check touch target sizes (minimum 48x48px)
4. Review viewport meta tag configuration

### Debug Tools

#### Component Inspector
```typescript
import { WedMeDebugger } from '@/lib/wedme/debug-tools';

// Enable debug mode
<WedMeDebugger enabled={process.env.NODE_ENV === 'development'}>
  <WedMeApplication />
</WedMeDebugger>
```

#### Performance Profiler
```typescript
import { ProfilerComponent } from '@/lib/wedme/performance-optimization';

<ProfilerComponent
  id="timeline-generation"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} ${phase}: ${actualDuration}ms`);
  }}
>
  <WeddingTimelineExperience {...props} />
</ProfilerComponent>
```

### Logging and Monitoring

#### Error Tracking
- Automatic error reporting to Sentry
- User session recording for debugging
- Performance monitoring and alerts
- API response time tracking

#### User Analytics
- Feature usage analytics
- User journey tracking
- Conversion funnel analysis
- A/B testing capabilities

## Contributing

### Development Setup

#### Prerequisites
- Node.js 18+
- npm 9+
- TypeScript 5+
- React 19+

#### Installation
```bash
# Clone repository
git clone https://github.com/wedsync/wedme-platform.git
cd wedme-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

#### Development Workflow
1. Create feature branch from `main`
2. Implement feature with tests
3. Run full test suite
4. Update documentation
5. Submit pull request
6. Code review and approval
7. Merge to main

### Code Standards

#### TypeScript Guidelines
- Strict mode enabled
- No `any` types allowed
- Comprehensive type definitions
- Interface-first approach
- Proper error handling

#### React Best Practices
- Functional components with hooks
- Proper dependency arrays
- Memoization where appropriate
- Accessibility compliance
- Performance optimization

#### Testing Requirements
- Unit tests for all components
- Integration tests for workflows
- Mobile testing on real devices
- Performance benchmarking
- Accessibility validation

### Pull Request Process

1. **Pre-submission Checklist**:
   - [ ] All tests pass
   - [ ] Code coverage maintained
   - [ ] Documentation updated
   - [ ] Mobile testing completed
   - [ ] Performance benchmarks met

2. **Review Process**:
   - Code review by 2+ team members
   - Design review for UI changes
   - Performance review for optimization
   - Security review for sensitive features

3. **Deployment**:
   - Staging deployment for QA
   - Production deployment approval
   - Post-deployment monitoring
   - Rollback plan if needed

## License

This project is proprietary software owned by WedSync Ltd. All rights reserved.

## Support

For technical support or questions:
- **Email**: developers@wedsync.com
- **Documentation**: https://docs.wedsync.com/wedme
- **Status Page**: https://status.wedsync.com
- **Community**: https://community.wedsync.com

---

**Last Updated**: 2025-09-08  
**Version**: 1.0.0  
**Team**: WS-335-Team-D  
**Status**: Production Ready