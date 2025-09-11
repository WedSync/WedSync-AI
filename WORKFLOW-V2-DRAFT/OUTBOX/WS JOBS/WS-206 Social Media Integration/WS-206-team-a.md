# TEAM A - ROUND 1: WS-206 - Social Media Integration - User Interface & Sharing Components

**Date:** 2025-01-20  
**Feature ID:** WS-206 (Track all work with this ID)
**Priority:** P2 - Growth Feature
**Mission:** Build comprehensive social media sharing interface with wedding hashtag management, photo galleries, and automated posting capabilities  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Couple planning their wedding with modern social media expectations
**I want to:** Seamlessly share wedding moments, coordinate hashtags, and manage social media presence throughout the planning process
**So that:** I can keep family and friends engaged, build excitement for the wedding, and preserve memories across all social platforms

**Real Wedding Problem This Solves:**
A modern couple manages their wedding across Instagram Stories, Facebook events, TikTok videos, and Twitter updates. They struggle with inconsistent hashtags (#SarahAndMike2025 vs #SarahMike2025), scattered photo sharing, and coordinating posts with vendors who also want to share content. They need a centralized system that maintains consistent branding, coordinates with vendor posts, manages hashtag variations, and creates beautiful shareable content that builds wedding excitement while maintaining privacy controls for sensitive planning details.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Multi-platform social media integration (Instagram, Facebook, Twitter, TikTok)
- Wedding hashtag management with consistency enforcement
- Photo and video sharing with automated optimization
- Vendor coordination for social media posts
- Privacy controls for different content types
- Automated posting schedules and campaign management
- Social media analytics and engagement tracking

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Social APIs: Instagram Graph API, Facebook API, Twitter API v2, TikTok API
- Media Handling: Cloudinary or Supabase Storage for image optimization
- Scheduling: Background job processing for timed posts
- Analytics: Custom analytics dashboard with engagement metrics
- Testing: Playwright MCP, Browser MCP for social sharing flows

**Integration Points:**
- Team B social media APIs and posting engine
- Team C media storage and optimization system
- Team D privacy controls and content moderation
- Team E testing for cross-platform compatibility

---

## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Social Media UX Analysis
```typescript
// Before designing social sharing interfaces
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding social media has unique UX challenges: couples want consistent branding across platforms, vendors need coordination rights, guests need easy sharing access, but family privacy must be maintained. Need to design flexible privacy controls with intuitive sharing flows.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UX flow analysis: Hashtag creation with variations, photo upload with auto-optimization, privacy selection per post type, vendor coordination workflows, guest sharing permissions. Each flow needs mobile-first design and cross-platform consistency.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Multi-Platform Integration Strategy  
```typescript
// When integrating multiple social media platforms
mcp__sequential-thinking__sequential_thinking({
  thought: "Each social platform has different requirements: Instagram favors square images and Stories, Facebook needs event integration, Twitter requires concise text, TikTok wants vertical videos. Need unified interface that adapts content for each platform automatically.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration strategy: Common content interface with platform-specific optimization, unified analytics dashboard, coordinated posting schedules, consistent hashtag enforcement across platforms.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Wedding Privacy Considerations
```typescript
// When implementing privacy controls for weddings
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding content has complex privacy needs: engagement photos can be public, venue details should be private until after event, guest lists need strict privacy, vendor coordination requires selective sharing. Need granular privacy controls with easy management.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Privacy implementation: Content categorization with default privacy levels, guest access controls, vendor sharing permissions, timeline-based privacy (private before wedding, public after), emergency privacy lockdown for security.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 🌐 BROWSER MCP INTERACTIVE TESTING (CRITICAL!)

**🚀 Real Browser Automation with Browser MCP:**

```javascript
// BROWSER MCP - Social Media Interface Testing
// Test cross-platform sharing flows and privacy controls

// 1. TEST HASHTAG MANAGEMENT INTERFACE
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/social"});
await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_click({
  element: "Create hashtag button",
  ref: '[data-testid="create-hashtag-btn"]'
});

await mcp__playwright__browser_type({
  element: "Hashtag input",
  ref: 'input[name="primaryHashtag"]',
  text: "SarahAndMike2025"
});

// Test hashtag variation suggestions
await mcp__playwright__browser_wait_for({text: "Suggested variations"});
const suggestions = await mcp__playwright__browser_evaluate({
  function: `() => {
    return Array.from(document.querySelectorAll('[data-testid="hashtag-suggestion"]'))
      .map(el => el.textContent);
  }`
});

// 2. TEST SOCIAL SHARING INTERFACE
await mcp__playwright__browser_click({
  element: "Share photo button",
  ref: '[data-testid="share-photo-btn"]'
});

// Upload test image
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/test-wedding-photo.jpg"]
});

// Test platform selection
const platforms = ['instagram', 'facebook', 'twitter'];
for (const platform of platforms) {
  await mcp__playwright__browser_click({
    element: `${platform} checkbox`,
    ref: `input[name="platforms"][value="${platform}"]`
  });
  
  // Verify platform-specific preview
  await mcp__playwright__browser_wait_for({text: `${platform} preview`});
}

// 3. TEST PRIVACY CONTROLS
await mcp__playwright__browser_click({
  element: "Privacy settings",
  ref: '[data-testid="privacy-controls"]'
});

await mcp__playwright__browser_select_option({
  element: "Content privacy",
  ref: 'select[name="contentPrivacy"]',
  values: ["family_only"]
});

// Verify privacy preview updates
const privacyIndicator = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelector('[data-testid="privacy-indicator"]').textContent`
});

// 4. TEST RESPONSIVE DESIGN ACROSS DEVICES
const viewports = [
  {width: 375, height: 667, name: "iPhone"}, // iPhone SE
  {width: 768, height: 1024, name: "iPad"},  // iPad
  {width: 1920, height: 1080, name: "Desktop"} // Desktop
];

for (const viewport of viewports) {
  await mcp__playwright__browser_resize({
    width: viewport.width,
    height: viewport.height
  });
  
  await mcp__playwright__browser_wait_for({time: 1});
  
  // Capture responsive screenshots
  await mcp__playwright__browser_take_screenshot({
    filename: `social-interface-${viewport.name.toLowerCase()}.png`,
    fullPage: true
  });
  
  // Test mobile-specific social sharing
  if (viewport.width < 768) {
    const mobileShareBtn = await mcp__playwright__browser_evaluate({
      function: `() => document.querySelector('[data-testid="mobile-share-btn"]')?.style.display`
    });
    expect(mobileShareBtn).not.toBe('none');
  }
}

// 5. TEST VENDOR COORDINATION INTERFACE
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/social/vendors"});

await mcp__playwright__browser_click({
  element: "Add vendor access",
  ref: '[data-testid="add-vendor-btn"]'
});

await mcp__playwright__browser_type({
  element: "Vendor email",
  ref: 'input[name="vendorEmail"]',
  text: "photographer@example.com"
});

await mcp__playwright__browser_select_option({
  element: "Vendor permissions",
  ref: 'select[name="vendorPermissions"]',
  values: ["post_coordination"]
});

// Test permission preview
const permissions = await mcp__playwright__browser_evaluate({
  function: `() => {
    return Array.from(document.querySelectorAll('[data-testid="permission-item"]'))
      .map(el => el.textContent);
  }`
});
```

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load social media integration patterns and UI guidelines
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md" 
});

await mcp__Ref__ref_search_documentation({ 
  query: "React social media integration Instagram API Facebook API image optimization" 
});

await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ui" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **react-ui-specialist** --social-interface "Build comprehensive social media sharing interface"
2. **ui-ux-designer** --social-ux "Design intuitive social sharing workflows"
3. **performance-optimization-expert** --media-performance "Optimize image/video handling for social"
4. **test-automation-architect** --social-testing "Test social sharing across platforms"
5. **integration-specialist** --api-integration "Integrate with social media APIs"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Main Social Media Hub Interface
**File:** `/wedsync/src/components/social/SocialMediaHub.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { SocialHashtagManager } from './SocialHashtagManager';
import { SocialContentSharing } from './SocialContentSharing';
import { SocialAnalyticsDashboard } from './SocialAnalyticsDashboard';
import { VendorCoordination } from './VendorCoordination';
import { PrivacyControls } from './PrivacyControls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SocialPlatform {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
  followerCount?: number;
  lastPost?: string;
}

export function SocialMediaHub() {
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([
    { id: 'instagram', name: 'Instagram', connected: false, icon: '📷' },
    { id: 'facebook', name: 'Facebook', connected: false, icon: '📘' },
    { id: 'twitter', name: 'Twitter', connected: false, icon: '🐦' },
    { id: 'tiktok', name: 'TikTok', connected: false, icon: '🎵' }
  ]);

  const [weddingHashtags, setWeddingHashtags] = useState<string[]>([]);
  const [socialStats, setSocialStats] = useState({
    totalPosts: 0,
    totalEngagement: 0,
    hashtagReach: 0,
    vendorPosts: 0
  });

  useEffect(() => {
    loadSocialConnections();
    loadWeddingHashtags();
    loadSocialStats();
  }, []);

  const loadSocialConnections = async () => {
    try {
      const response = await fetch('/api/social/connections');
      const data = await response.json();
      if (data.success) {
        setConnectedPlatforms(data.platforms);
      }
    } catch (error) {
      console.error('Failed to load social connections:', error);
    }
  };

  const loadWeddingHashtags = async () => {
    try {
      const response = await fetch('/api/social/hashtags');
      const data = await response.json();
      if (data.success) {
        setWeddingHashtags(data.hashtags);
      }
    } catch (error) {
      console.error('Failed to load hashtags:', error);
    }
  };

  const loadSocialStats = async () => {
    try {
      const response = await fetch('/api/social/analytics');
      const data = await response.json();
      if (data.success) {
        setSocialStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load social stats:', error);
    }
  };

  const handlePlatformConnect = async (platformId: string) => {
    try {
      // Redirect to platform OAuth flow
      window.location.href = `/api/social/connect/${platformId}`;
    } catch (error) {
      console.error('Failed to connect platform:', error);
    }
  };

  const handlePlatformDisconnect = async (platformId: string) => {
    try {
      const response = await fetch(`/api/social/disconnect/${platformId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setConnectedPlatforms(prev => 
          prev.map(p => p.id === platformId ? { ...p, connected: false } : p)
        );
      }
    } catch (error) {
      console.error('Failed to disconnect platform:', error);
    }
  };

  const connectedCount = connectedPlatforms.filter(p => p.connected).length;

  return (
    <div className="social-media-hub space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Social Media Hub</h1>
            <p className="text-pink-100 mt-2">
              Manage your wedding's social media presence across all platforms
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold">{connectedCount}/4</div>
            <div className="text-sm text-pink-100">Platforms Connected</div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{socialStats.totalPosts}</div>
            <div className="text-xs text-pink-100">Total Posts</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{socialStats.totalEngagement}</div>
            <div className="text-xs text-pink-100">Engagement</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{socialStats.hashtagReach}</div>
            <div className="text-xs text-pink-100">Hashtag Reach</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{socialStats.vendorPosts}</div>
            <div className="text-xs text-pink-100">Vendor Posts</div>
          </div>
        </div>
      </div>

      {/* Platform Connections */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Connected Platforms</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {connectedPlatforms.map(platform => (
            <div
              key={platform.id}
              className={`border rounded-lg p-4 text-center transition-all ${
                platform.connected 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-3xl mb-2">{platform.icon}</div>
              <div className="font-medium">{platform.name}</div>
              
              {platform.connected ? (
                <div className="mt-3 space-y-2">
                  <div className="text-sm text-green-600">✓ Connected</div>
                  {platform.followerCount && (
                    <div className="text-xs text-gray-600">
                      {platform.followerCount.toLocaleString()} followers
                    </div>
                  )}
                  <button
                    onClick={() => handlePlatformDisconnect(platform.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handlePlatformConnect(platform.id)}
                  className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sharing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sharing">Share Content</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Coordination</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="sharing" className="space-y-4">
          <SocialContentSharing 
            connectedPlatforms={connectedPlatforms.filter(p => p.connected)}
            weddingHashtags={weddingHashtags}
            onPostSuccess={() => loadSocialStats()}
          />
        </TabsContent>

        <TabsContent value="hashtags" className="space-y-4">
          <SocialHashtagManager 
            hashtags={weddingHashtags}
            onHashtagsChange={setWeddingHashtags}
          />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <VendorCoordination 
            connectedPlatforms={connectedPlatforms.filter(p => p.connected)}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SocialAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacyControls />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 2. Hashtag Management Component
**File:** `/wedsync/src/components/social/SocialHashtagManager.tsx`
```typescript
'use client';

import { useState, useCallback } from 'react';
import { HashIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface HashtagVariation {
  hashtag: string;
  usage: number;
  platforms: string[];
  suggested: boolean;
}

interface SocialHashtagManagerProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
}

export function SocialHashtagManager({ hashtags, onHashtagsChange }: SocialHashtagManagerProps) {
  const [primaryHashtag, setPrimaryHashtag] = useState('');
  const [hashtagVariations, setHashtagVariations] = useState<HashtagVariation[]>([]);
  const [customHashtag, setCustomHashtag] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate hashtag variations based on couple names and wedding details
  const generateHashtagSuggestions = useCallback(async (baseHashtag: string) => {
    if (!baseHashtag.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/social/hashtags/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseHashtag })
      });
      
      const data = await response.json();
      if (data.success) {
        setHashtagVariations(data.variations);
      }
    } catch (error) {
      console.error('Failed to generate hashtag suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrimaryHashtagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (primaryHashtag.trim()) {
      generateHashtagSuggestions(primaryHashtag);
      setPrimaryHashtag('');
    }
  };

  const addCustomHashtag = () => {
    if (customHashtag.trim() && !hashtags.includes(customHashtag)) {
      const cleanHashtag = customHashtag.startsWith('#') 
        ? customHashtag 
        : `#${customHashtag}`;
      onHashtagsChange([...hashtags, cleanHashtag]);
      setCustomHashtag('');
    }
  };

  const removeHashtag = (hashtagToRemove: string) => {
    onHashtagsChange(hashtags.filter(h => h !== hashtagToRemove));
  };

  const addSuggestedHashtag = (hashtag: string) => {
    if (!hashtags.includes(hashtag)) {
      onHashtagsChange([...hashtags, hashtag]);
      // Update the variation to show it's been added
      setHashtagVariations(prev => 
        prev.map(v => 
          v.hashtag === hashtag 
            ? { ...v, suggested: false } 
            : v
        )
      );
    }
  };

  const validateHashtag = (hashtag: string): boolean => {
    // Basic hashtag validation
    return /^#[a-zA-Z0-9_]+$/.test(hashtag) && hashtag.length <= 100;
  };

  const checkHashtagAvailability = async (hashtag: string) => {
    try {
      const response = await fetch(`/api/social/hashtags/check?hashtag=${encodeURIComponent(hashtag)}`);
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Failed to check hashtag availability:', error);
      return null;
    }
  };

  return (
    <div className="hashtag-manager space-y-6">
      {/* Primary Hashtag Creation */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <HashIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Create Wedding Hashtag</h2>
        </div>
        
        <form onSubmit={handlePrimaryHashtagSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Wedding Hashtag
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-gray-400 text-sm">#</span>
                <input
                  type="text"
                  value={primaryHashtag}
                  onChange={(e) => setPrimaryHashtag(e.target.value.replace('#', ''))}
                  placeholder="SarahAndMike2025"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!primaryHashtag.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter couple names and wedding year for best suggestions
            </p>
          </div>
        </form>
      </div>

      {/* Hashtag Suggestions */}
      {hashtagVariations.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Suggested Hashtag Variations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hashtagVariations.map((variation, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 transition-all ${
                  hashtags.includes(variation.hashtag)
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-600">
                      {variation.hashtag}
                    </div>
                    {variation.usage > 0 && (
                      <div className="text-xs text-gray-500">
                        Used {variation.usage} times
                      </div>
                    )}
                    <div className="flex space-x-1 mt-1">
                      {variation.platforms.map(platform => (
                        <span key={platform} className="text-xs">
                          {platform === 'instagram' ? '📷' : 
                           platform === 'facebook' ? '📘' :
                           platform === 'twitter' ? '🐦' : '🎵'}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {hashtags.includes(variation.hashtag) ? (
                    <CheckIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <button
                      onClick={() => addSuggestedHashtag(variation.hashtag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Hashtags */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Wedding Hashtags</h3>
          <span className="text-sm text-gray-500">
            {hashtags.length} hashtags
          </span>
        </div>

        {hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {hashtags.map((hashtag, index) => (
              <div
                key={index}
                className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
              >
                <span>{hashtag}</span>
                <button
                  onClick={() => removeHashtag(hashtag)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <HashIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No hashtags added yet</p>
            <p className="text-sm">Generate suggestions or add custom hashtags below</p>
          </div>
        )}

        {/* Add Custom Hashtag */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Custom Hashtag
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-3 text-gray-400 text-sm">#</span>
              <input
                type="text"
                value={customHashtag}
                onChange={(e) => setCustomHashtag(e.target.value.replace('#', ''))}
                placeholder="CustomHashtag"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={addCustomHashtag}
              disabled={!customHashtag.trim()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Hashtag Usage Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hashtag Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use your primary hashtag consistently across all platforms</li>
          <li>• Keep hashtags short and memorable</li>
          <li>• Check that your hashtag isn't already widely used</li>
          <li>• Include your wedding year to make it unique</li>
          <li>• Share your hashtag with vendors and wedding party</li>
          <li>• Consider creating a backup hashtag in case of conflicts</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Comprehensive social media hub interface with platform connections
- [x] Advanced hashtag management with intelligent suggestions
- [x] Multi-platform content sharing interface with optimization
- [x] Privacy controls for different content types and audiences
- [x] Vendor coordination interface for collaborative posting
- [x] Mobile-responsive design optimized for social sharing
- [x] Social analytics dashboard with engagement metrics
- [x] Cross-platform posting with automatic format optimization

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
Social media features need seamless integration with wedding planning workflows and easy access from mobile devices.

### Navigation Implementation Requirements

**1. Social Hub Access Points**
```tsx
// Multiple entry points for social features
const socialNavigationPoints = [
  { location: '/dashboard', label: 'Share Update', context: 'quick_share' },
  { location: '/photos', label: 'Post Photos', context: 'media_sharing' },
  { location: '/vendors', label: 'Coordinate Posts', context: 'vendor_collaboration' },
  { location: '/timeline', label: 'Schedule Posts', context: 'timeline_sharing' }
];
```

**2. Mobile-First Social Navigation**
```tsx
// Optimized for mobile social sharing workflows
const MobileSocialNav = () => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden">
    <div className="grid grid-cols-4 gap-1 p-2">
      <SocialNavButton icon="📷" label="Share" />
      <SocialNavButton icon="💬" label="Engage" />
      <SocialNavButton icon="📊" label="Analytics" />
      <SocialNavButton icon="⚙️" label="Settings" />
    </div>
  </div>
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Social media API integrations - Required for platform connectivity
- FROM Team C: Media storage and optimization - Required for photo/video handling
- FROM Team D: Privacy controls and content moderation - Required for secure sharing

### What other teams NEED from you:
- TO Team B: UI interaction patterns - They need for API design
- TO Team E: Component testing scenarios - They need for comprehensive testing
- TO All Teams: Social sharing UI patterns - Needed for consistent integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Social Media Security:
- [x] OAuth token secure storage and refresh
- [x] Content privacy controls with granular permissions
- [x] Vendor access controls with limited posting rights
- [x] Image metadata stripping for privacy protection
- [x] Rate limiting for social platform API calls
- [x] Content moderation before posting
- [x] Emergency privacy lockdown capabilities
- [x] Wedding-specific content categorization

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Social media interface testing
describe('Social Media Hub Interface', () => {
  it('should handle cross-platform sharing workflow', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/social"});
    
    // Upload and optimize image for multiple platforms
    await mcp__playwright__browser_file_upload({
      paths: ["/test-assets/wedding-photo.jpg"]
    });
    
    // Select multiple platforms
    const platforms = ['instagram', 'facebook', 'twitter'];
    for (const platform of platforms) {
      await mcp__playwright__browser_click({
        element: `${platform} checkbox`,
        ref: `[data-platform="${platform}"]`
      });
      
      // Verify platform-specific preview
      await mcp__playwright__browser_wait_for({
        text: `${platform} optimized`
      });
    }
    
    // Add hashtags
    await mcp__playwright__browser_click({
      element: "Add hashtag",
      ref: '[data-testid="add-hashtag-btn"]'
    });
    
    // Submit post
    await mcp__playwright__browser_click({
      element: "Post to all platforms",
      ref: '[data-testid="post-submit-btn"]'
    });
    
    // Verify success confirmation
    await mcp__playwright__browser_wait_for({
      text: "Successfully posted to 3 platforms"
    });
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] Platform connections working for Instagram, Facebook, Twitter, TikTok
- [x] Hashtag generation and management fully functional
- [x] Cross-platform posting with format optimization
- [x] Privacy controls granular and intuitive
- [x] Mobile interface responsive and touch-optimized
- [x] Image/video optimization automated
- [x] Vendor coordination workflows complete
- [x] Analytics dashboard with real engagement data

### Evidence Package Required:
- [x] Cross-platform posting demonstration
- [x] Hashtag suggestion accuracy validation
- [x] Privacy controls effectiveness testing
- [x] Mobile responsiveness across devices
- [x] Performance benchmarks for media handling
- [x] Vendor coordination workflow validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/social/`
- Hooks: `/wedsync/src/hooks/useSocialMedia.ts`
- Utils: `/wedsync/src/lib/social/ui-utils.ts`
- Types: `/wedsync/src/types/social-media.ts`
- Styles: `/wedsync/src/components/social/social.css`
- Tests: `/wedsync/__tests__/components/social/`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch23/WS-206-team-a-round-1-complete.md`

---

END OF ROUND PROMPT