# TEAM B - ROUND 1: WS-206 - Social Media Integration - API Backend & Posting Engine

**Date:** 2025-01-20  
**Feature ID:** WS-206 (Track all work with this ID)
**Priority:** P2 - Growth Feature
**Mission:** Build robust social media API integration backend with OAuth management, intelligent posting engine, and wedding-specific content optimization  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business technology provider
**I want to:** Seamlessly integrate with all major social media platforms with reliable posting, analytics, and content optimization
**So that:** Couples can effortlessly share their wedding journey across all platforms while maintaining consistent branding and optimal engagement

**Real Wedding Problem This Solves:**
A couple wants to post their engagement announcement simultaneously across Instagram, Facebook, Twitter, and TikTok with platform-optimized formats. Instagram needs square images with Stories, Facebook requires event linking, Twitter needs concise text, and TikTok wants vertical video. Each platform has different API requirements, rate limits, authentication flows, and content formats. The backend must handle OAuth flows, token refresh, content optimization, scheduled posting, error recovery, and analytics aggregation - all while maintaining wedding-specific business logic for hashtag enforcement and privacy controls.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Multi-platform OAuth integration (Instagram, Facebook, Twitter, TikTok)
- Robust posting engine with retry logic and error handling
- Content optimization engine for different platform requirements
- Scheduled posting system with queue management
- Social media analytics aggregation and reporting
- Wedding-specific business rules and content moderation
- Rate limiting and API quota management
- Webhook handling for real-time updates

**Technology Stack (VERIFIED):**
- Backend: Node.js with Express/Next.js API routes
- OAuth: Platform-specific OAuth 2.0 flows
- Database: PostgreSQL for tokens, posts, analytics
- Queue: Background job processing for scheduled posts
- Storage: Supabase Storage for media optimization
- APIs: Instagram Graph API, Facebook API, Twitter API v2, TikTok API
- Analytics: Custom aggregation with platform-specific metrics

**Integration Points:**
- Team A social media UI requires API endpoints
- Team C media optimization needs content processing
- Team D privacy controls need content filtering
- Team E testing requires comprehensive API validation

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

#### Pattern 1: Multi-Platform API Integration Strategy
```typescript
// Before implementing complex social media integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Each social media platform has unique API requirements: Instagram requires Facebook app approval, Twitter has strict rate limits, TikTok has complex video upload flows, Facebook needs business verification. Need unified abstraction layer that handles platform differences while maintaining flexibility.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API integration architecture: OAuth manager for token lifecycle, platform adapters for API differences, content optimizer for format requirements, posting queue for reliability, analytics aggregator for unified metrics. Each needs error handling and fallback strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Content Optimization Logic
```typescript
// When designing cross-platform content optimization
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding content needs platform-specific optimization: Instagram prefers 1:1 square images with hashtags in first comment, Facebook needs landscape images with event context, Twitter requires concise text with trending hashtags, TikTok wants vertical video with trending sounds. Need intelligent content adaptation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Optimization strategy: Image aspect ratio conversion, text length adaptation, hashtag placement optimization, video format conversion, metadata preservation for wedding context. Must maintain quality while adapting format.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Reliability and Error Recovery
```typescript
// When implementing robust posting systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding posts are time-sensitive and emotional - failures are unacceptable. Need: API rate limit handling, token expiry recovery, network failure retry, partial success handling, user notification for issues, manual retry options. System must be bulletproof for important moments.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Reliability implementation: Exponential backoff retry, circuit breaker pattern, fallback posting options, comprehensive error logging, user-friendly error messages, manual intervention workflows.",
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

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load social media API documentation and patterns
await mcp__Ref__ref_search_documentation({ 
  query: "Instagram Graph API Facebook API Twitter API v2 OAuth implementation Node.js" 
});

await mcp__supabase__search_docs({
  graphql_query: `
    query {
      searchDocs(query: "authentication OAuth tokens API integration background jobs", limit: 10) {
        nodes {
          title
          href
          content
        }
      }
    }
  `
});

await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/auth" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **api-architect** --social-apis "Design comprehensive social media API integration"
2. **integration-specialist** --oauth-flows "Implement OAuth authentication for all platforms"
3. **performance-optimization-expert** --api-performance "Optimize API calls and rate limiting"
4. **database-mcp-specialist** --social-schema "Design social media data schema"
5. **security-compliance-officer** --api-security "Secure API tokens and data handling"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Social Media Platform Manager
**File:** `/wedsync/src/lib/social/social-platform-manager.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { InstagramAPI } from './platforms/instagram-api';
import { FacebookAPI } from './platforms/facebook-api';
import { TwitterAPI } from './platforms/twitter-api';
import { TikTokAPI } from './platforms/tiktok-api';
import { z } from 'zod';

export interface SocialPlatform {
  id: string;
  name: string;
  api: SocialPlatformAPI;
}

export interface SocialPlatformAPI {
  connect(userId: string): Promise<string>; // Returns OAuth URL
  handleCallback(code: string, userId: string): Promise<boolean>;
  post(content: SocialContent, tokens: PlatformTokens): Promise<PostResult>;
  getProfile(tokens: PlatformTokens): Promise<ProfileInfo>;
  getAnalytics(tokens: PlatformTokens, postId?: string): Promise<AnalyticsData>;
  refreshToken(refreshToken: string): Promise<PlatformTokens>;
}

export interface SocialContent {
  text?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    altText?: string;
  }[];
  hashtags: string[];
  location?: {
    name: string;
    coordinates?: [number, number];
  };
  scheduledFor?: Date;
  weddingContext: {
    weddingId: string;
    eventType: string;
    privacyLevel: 'public' | 'friends' | 'private';
  };
}

export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string[];
}

export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  platformSpecificData?: Record<string, any>;
}

const PostContentSchema = z.object({
  text: z.string().optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    altText: z.string().optional()
  })).optional(),
  hashtags: z.array(z.string()),
  location: z.object({
    name: z.string(),
    coordinates: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  scheduledFor: z.string().datetime().optional(),
  weddingContext: z.object({
    weddingId: z.string().uuid(),
    eventType: z.string(),
    privacyLevel: z.enum(['public', 'friends', 'private'])
  })
});

export class SocialMediaPlatformManager {
  private static supabase = createClient();
  private static platforms: Map<string, SocialPlatform> = new Map();

  static {
    // Initialize platform APIs
    this.platforms.set('instagram', {
      id: 'instagram',
      name: 'Instagram',
      api: new InstagramAPI()
    });
    
    this.platforms.set('facebook', {
      id: 'facebook',
      name: 'Facebook',
      api: new FacebookAPI()
    });
    
    this.platforms.set('twitter', {
      id: 'twitter',
      name: 'Twitter',
      api: new TwitterAPI()
    });
    
    this.platforms.set('tiktok', {
      id: 'tiktok',
      name: 'TikTok',
      api: new TikTokAPI()
    });
  }

  // Connect user to social platform
  static async initiateConnection(userId: string, platformId: string): Promise<string> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not supported`);
    }

    try {
      const oauthUrl = await platform.api.connect(userId);
      
      // Log the connection attempt
      await this.supabase
        .from('social_connection_attempts')
        .insert({
          user_id: userId,
          platform_id: platformId,
          status: 'initiated',
          created_at: new Date().toISOString()
        });

      return oauthUrl;
    } catch (error) {
      console.error(`Failed to initiate ${platformId} connection:`, error);
      throw error;
    }
  }

  // Handle OAuth callback
  static async handleOAuthCallback(
    platformId: string, 
    code: string, 
    userId: string
  ): Promise<boolean> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not supported`);
    }

    try {
      const success = await platform.api.handleCallback(code, userId);
      
      // Update connection status
      await this.supabase
        .from('social_connections')
        .upsert({
          user_id: userId,
          platform_id: platformId,
          connected: success,
          connected_at: success ? new Date().toISOString() : null,
          status: success ? 'active' : 'failed'
        });

      return success;
    } catch (error) {
      console.error(`OAuth callback failed for ${platformId}:`, error);
      return false;
    }
  }

  // Post content to multiple platforms
  static async postToMultiplePlatforms(
    userId: string,
    platformIds: string[],
    content: SocialContent
  ): Promise<Record<string, PostResult>> {
    // Validate content
    const validatedContent = PostContentSchema.parse(content);
    
    const results: Record<string, PostResult> = {};
    const postingPromises: Promise<void>[] = [];

    for (const platformId of platformIds) {
      const promise = this.postToPlatform(userId, platformId, validatedContent)
        .then(result => {
          results[platformId] = result;
        })
        .catch(error => {
          results[platformId] = {
            success: false,
            error: error.message
          };
        });
      
      postingPromises.push(promise);
    }

    // Wait for all posts to complete
    await Promise.all(postingPromises);

    // Log aggregated results
    await this.logMultiPlatformPost(userId, platformIds, validatedContent, results);

    return results;
  }

  // Post to single platform
  private static async postToPlatform(
    userId: string,
    platformId: string,
    content: SocialContent
  ): Promise<PostResult> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not supported`);
    }

    // Get user's tokens for this platform
    const tokens = await this.getUserTokens(userId, platformId);
    if (!tokens) {
      throw new Error(`User not connected to ${platformId}`);
    }

    // Check if token needs refresh
    if (tokens.expiresAt < new Date()) {
      const refreshedTokens = await this.refreshUserTokens(userId, platformId);
      if (!refreshedTokens) {
        throw new Error(`Failed to refresh ${platformId} tokens`);
      }
      Object.assign(tokens, refreshedTokens);
    }

    try {
      // Optimize content for platform
      const optimizedContent = await this.optimizeContentForPlatform(content, platformId);
      
      // Post to platform
      const result = await platform.api.post(optimizedContent, tokens);
      
      // Store post record
      if (result.success) {
        await this.supabase
          .from('social_posts')
          .insert({
            user_id: userId,
            platform_id: platformId,
            post_id: result.postId,
            content: optimizedContent,
            wedding_id: content.weddingContext.weddingId,
            posted_at: new Date().toISOString(),
            status: 'published'
          });
      }

      return result;
    } catch (error) {
      console.error(`Failed to post to ${platformId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Optimize content for specific platform
  private static async optimizeContentForPlatform(
    content: SocialContent,
    platformId: string
  ): Promise<SocialContent> {
    const optimized = { ...content };

    switch (platformId) {
      case 'instagram':
        // Instagram optimization
        optimized.text = this.optimizeTextForInstagram(content.text || '');
        optimized.hashtags = this.optimizeHashtagsForInstagram(content.hashtags);
        if (content.media) {
          optimized.media = await this.optimizeMediaForInstagram(content.media);
        }
        break;

      case 'facebook':
        // Facebook optimization
        optimized.text = this.optimizeTextForFacebook(content.text || '');
        optimized.hashtags = this.optimizeHashtagsForFacebook(content.hashtags);
        if (content.media) {
          optimized.media = await this.optimizeMediaForFacebook(content.media);
        }
        break;

      case 'twitter':
        // Twitter optimization
        optimized.text = this.optimizeTextForTwitter(content.text || '', content.hashtags);
        optimized.hashtags = []; // Hashtags included in text for Twitter
        if (content.media) {
          optimized.media = await this.optimizeMediaForTwitter(content.media);
        }
        break;

      case 'tiktok':
        // TikTok optimization
        optimized.text = this.optimizeTextForTikTok(content.text || '');
        optimized.hashtags = this.optimizeHashtagsForTikTok(content.hashtags);
        if (content.media) {
          optimized.media = await this.optimizeMediaForTikTok(content.media);
        }
        break;
    }

    return optimized;
  }

  // Platform-specific text optimization
  private static optimizeTextForInstagram(text: string): string {
    // Instagram allows longer captions, optimize for engagement
    if (text.length > 2200) {
      return text.substring(0, 2197) + '...';
    }
    return text;
  }

  private static optimizeTextForFacebook(text: string): string {
    // Facebook has no strict limit but shorter posts perform better
    if (text.length > 500) {
      return text.substring(0, 497) + '...';
    }
    return text;
  }

  private static optimizeTextForTwitter(text: string, hashtags: string[]): string {
    // Twitter has 280 character limit including hashtags
    const hashtagText = hashtags.join(' ');
    const availableLength = 280 - hashtagText.length - 1; // -1 for space

    if (text.length > availableLength) {
      return text.substring(0, availableLength - 3) + '...' + ' ' + hashtagText;
    }
    return text + ' ' + hashtagText;
  }

  private static optimizeTextForTikTok(text: string): string {
    // TikTok allows up to 4000 characters
    if (text.length > 4000) {
      return text.substring(0, 3997) + '...';
    }
    return text;
  }

  // Hashtag optimization methods
  private static optimizeHashtagsForInstagram(hashtags: string[]): string[] {
    // Instagram allows up to 30 hashtags, but 5-10 perform better
    return hashtags.slice(0, 10);
  }

  private static optimizeHashtagsForFacebook(hashtags: string[]): string[] {
    // Facebook hashtags are less effective, limit to 2-3 most important
    return hashtags.slice(0, 3);
  }

  private static optimizeHashtagsForTikTok(hashtags: string[]): string[] {
    // TikTok allows many hashtags but trending ones are most important
    return hashtags.slice(0, 20);
  }

  // Media optimization methods (placeholder implementations)
  private static async optimizeMediaForInstagram(media: any[]): Promise<any[]> {
    // Implement Instagram media optimization (square/vertical format)
    return media; // Placeholder
  }

  private static async optimizeMediaForFacebook(media: any[]): Promise<any[]> {
    // Implement Facebook media optimization (landscape format)
    return media; // Placeholder
  }

  private static async optimizeMediaForTwitter(media: any[]): Promise<any[]> {
    // Implement Twitter media optimization (16:9 aspect ratio)
    return media; // Placeholder
  }

  private static async optimizeMediaForTikTok(media: any[]): Promise<any[]> {
    // Implement TikTok media optimization (vertical video)
    return media; // Placeholder
  }

  // Token management methods
  private static async getUserTokens(userId: string, platformId: string): Promise<PlatformTokens | null> {
    const { data } = await this.supabase
      .from('social_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .single();

    if (!data) return null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      scope: data.scope || []
    };
  }

  private static async refreshUserTokens(userId: string, platformId: string): Promise<PlatformTokens | null> {
    const platform = this.platforms.get(platformId);
    const currentTokens = await this.getUserTokens(userId, platformId);
    
    if (!platform || !currentTokens?.refreshToken) return null;

    try {
      const refreshedTokens = await platform.api.refreshToken(currentTokens.refreshToken);
      
      // Update stored tokens
      await this.supabase
        .from('social_tokens')
        .update({
          access_token: refreshedTokens.accessToken,
          refresh_token: refreshedTokens.refreshToken,
          expires_at: refreshedTokens.expiresAt.toISOString(),
          scope: refreshedTokens.scope
        })
        .eq('user_id', userId)
        .eq('platform_id', platformId);

      return refreshedTokens;
    } catch (error) {
      console.error(`Failed to refresh tokens for ${platformId}:`, error);
      return null;
    }
  }

  // Analytics aggregation
  static async getAggregatedAnalytics(userId: string, weddingId: string): Promise<any> {
    const platforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
    const analytics = {};

    for (const platformId of platforms) {
      const tokens = await this.getUserTokens(userId, platformId);
      const platform = this.platforms.get(platformId);
      
      if (tokens && platform) {
        try {
          const platformAnalytics = await platform.api.getAnalytics(tokens);
          analytics[platformId] = platformAnalytics;
        } catch (error) {
          console.error(`Failed to get analytics for ${platformId}:`, error);
          analytics[platformId] = { error: error.message };
        }
      }
    }

    return analytics;
  }

  // Logging and audit
  private static async logMultiPlatformPost(
    userId: string,
    platformIds: string[],
    content: SocialContent,
    results: Record<string, PostResult>
  ): Promise<void> {
    await this.supabase
      .from('social_post_batches')
      .insert({
        user_id: userId,
        platform_ids: platformIds,
        content,
        results,
        wedding_id: content.weddingContext.weddingId,
        created_at: new Date().toISOString()
      });
  }
}
```

#### 2. Instagram API Implementation
**File:** `/wedsync/src/lib/social/platforms/instagram-api.ts`
```typescript
import { SocialPlatformAPI, SocialContent, PlatformTokens, PostResult, ProfileInfo, AnalyticsData } from '../social-platform-manager';

export class InstagramAPI implements SocialPlatformAPI {
  private readonly clientId = process.env.INSTAGRAM_CLIENT_ID!;
  private readonly clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  private readonly redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;
  private readonly apiVersion = 'v18.0';

  async connect(userId: string): Promise<string> {
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_insights'
    ].join(',');

    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      response_type: 'code',
      state
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string): Promise<boolean> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/access_token?` +
        `grant_type=ig_exchange_token&` +
        `client_secret=${this.clientSecret}&` +
        `access_token=${tokenData.access_token}`
      );

      if (!longLivedResponse.ok) {
        throw new Error(`Long-lived token exchange failed: ${longLivedResponse.statusText}`);
      }

      const longLivedData = await longLivedResponse.json();

      // Store tokens
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      await supabase
        .from('social_tokens')
        .upsert({
          user_id: userId,
          platform_id: 'instagram',
          access_token: longLivedData.access_token,
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + longLivedData.expires_in * 1000).toISOString(),
          scope: ['instagram_basic', 'instagram_content_publish', 'instagram_insights'],
          instagram_user_id: tokenData.user_id
        });

      return true;
    } catch (error) {
      console.error('Instagram OAuth callback error:', error);
      return false;
    }
  }

  async post(content: SocialContent, tokens: PlatformTokens): Promise<PostResult> {
    try {
      const { data: tokenData } = await (await import('@/lib/supabase/server')).createClient()
        .from('social_tokens')
        .select('instagram_user_id')
        .eq('access_token', tokens.accessToken)
        .single();

      if (!tokenData?.instagram_user_id) {
        throw new Error('Instagram user ID not found');
      }

      const igUserId = tokenData.instagram_user_id;

      if (content.media && content.media.length > 0) {
        // Post with media
        return await this.postMediaContent(igUserId, content, tokens.accessToken);
      } else {
        // Text-only posts not supported on Instagram
        throw new Error('Instagram requires media content');
      }
    } catch (error) {
      console.error('Instagram posting error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async postMediaContent(
    igUserId: string,
    content: SocialContent,
    accessToken: string
  ): Promise<PostResult> {
    try {
      let mediaContainerIds: string[] = [];

      // Create media containers
      for (const media of content.media!) {
        const containerResponse = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: media.type === 'image' ? media.url : undefined,
              video_url: media.type === 'video' ? media.url : undefined,
              caption: this.buildCaption(content),
              access_token: accessToken
            })
          }
        );

        if (!containerResponse.ok) {
          throw new Error(`Failed to create media container: ${containerResponse.statusText}`);
        }

        const containerData = await containerResponse.json();
        mediaContainerIds.push(containerData.id);
      }

      // Publish media
      let publishResponse;
      
      if (mediaContainerIds.length === 1) {
        // Single media post
        publishResponse = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: mediaContainerIds[0],
              access_token: accessToken
            })
          }
        );
      } else {
        // Carousel post
        const carouselResponse = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: mediaContainerIds,
              caption: this.buildCaption(content),
              access_token: accessToken
            })
          }
        );

        if (!carouselResponse.ok) {
          throw new Error(`Failed to create carousel: ${carouselResponse.statusText}`);
        }

        const carouselData = await carouselResponse.json();
        
        publishResponse = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: carouselData.id,
              access_token: accessToken
            })
          }
        );
      }

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish post: ${publishResponse.statusText}`);
      }

      const publishData = await publishResponse.json();

      return {
        success: true,
        postId: publishData.id,
        url: `https://instagram.com/p/${publishData.id}`,
        platformSpecificData: publishData
      };
    } catch (error) {
      console.error('Instagram media posting error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private buildCaption(content: SocialContent): string {
    let caption = content.text || '';
    
    if (content.hashtags.length > 0) {
      caption += '\n\n' + content.hashtags.join(' ');
    }
    
    if (content.location) {
      caption += `\n📍 ${content.location.name}`;
    }

    return caption;
  }

  async getProfile(tokens: PlatformTokens): Promise<ProfileInfo> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count,followers_count&access_token=${tokens.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        username: data.username,
        displayName: data.username,
        followerCount: data.followers_count,
        postCount: data.media_count,
        platform: 'instagram'
      };
    } catch (error) {
      console.error('Instagram profile fetch error:', error);
      throw error;
    }
  }

  async getAnalytics(tokens: PlatformTokens, postId?: string): Promise<AnalyticsData> {
    try {
      if (postId) {
        // Get specific post analytics
        const response = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${postId}/insights?metric=impressions,reach,engagement&access_token=${tokens.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Failed to get post analytics: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          impressions: data.data.find((d: any) => d.name === 'impressions')?.values[0]?.value || 0,
          reach: data.data.find((d: any) => d.name === 'reach')?.values[0]?.value || 0,
          engagement: data.data.find((d: any) => d.name === 'engagement')?.values[0]?.value || 0,
          platform: 'instagram',
          postId
        };
      } else {
        // Get account analytics
        const response = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/me/insights?metric=impressions,reach,profile_views&period=day&access_token=${tokens.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Failed to get account analytics: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          impressions: data.data.find((d: any) => d.name === 'impressions')?.values[0]?.value || 0,
          reach: data.data.find((d: any) => d.name === 'reach')?.values[0]?.value || 0,
          profileViews: data.data.find((d: any) => d.name === 'profile_views')?.values[0]?.value || 0,
          platform: 'instagram'
        };
      }
    } catch (error) {
      console.error('Instagram analytics fetch error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<PlatformTokens> {
    try {
      // Instagram long-lived tokens can be refreshed
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
      );

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: ['instagram_basic', 'instagram_content_publish', 'instagram_insights']
      };
    } catch (error) {
      console.error('Instagram token refresh error:', error);
      throw error;
    }
  }
}

// Additional interfaces
interface ProfileInfo {
  id: string;
  username: string;
  displayName: string;
  followerCount?: number;
  postCount?: number;
  platform: string;
}

interface AnalyticsData {
  impressions: number;
  reach: number;
  engagement?: number;
  profileViews?: number;
  platform: string;
  postId?: string;
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Comprehensive social media platform manager with unified API
- [x] OAuth authentication flows for Instagram, Facebook, Twitter, TikTok
- [x] Robust posting engine with platform-specific optimization
- [x] Token management with automatic refresh and error handling
- [x] Content optimization engine for different platform requirements
- [x] Social media analytics aggregation and reporting
- [x] Wedding-specific business logic and content moderation
- [x] Error handling, retry logic, and comprehensive logging

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
Backend APIs must support navigation-aware social sharing workflows and provide data for social navigation components.

### Navigation Integration Requirements

**1. API Endpoint Organization**
```typescript
// RESTful API structure for social features
const socialAPIRoutes = {
  '/api/social/connections': 'Platform connection management',
  '/api/social/post': 'Multi-platform posting',
  '/api/social/analytics': 'Aggregated analytics data',
  '/api/social/hashtags': 'Wedding hashtag management',
  '/api/social/schedule': 'Scheduled posting management'
};
```

**2. Context-Aware API Responses**
```typescript
// Include navigation context in API responses
interface APISocialResponse {
  data: any;
  navigation?: {
    breadcrumbs: Array<{ label: string; href: string }>;
    relatedActions: Array<{ label: string; endpoint: string }>;
  };
}
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI interaction patterns and API requirements - Required for endpoint design
- FROM Team C: Media optimization requirements - Required for content processing
- FROM Team D: Privacy controls and security requirements - Required for secure API design

### What other teams NEED from you:
- TO Team A: API endpoints and data formats - Required for UI implementation
- TO Team C: Media processing requirements - Required for optimization integration
- TO Team E: API contracts and testing scenarios - Required for comprehensive testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### API Security:
- [x] OAuth tokens encrypted in database storage
- [x] API rate limiting per user and platform
- [x] Input validation and sanitization for all endpoints
- [x] HTTPS enforcement for all social media API calls
- [x] Token refresh automation with fallback handling
- [x] Wedding-specific content filtering and moderation
- [x] Audit logging for all social media operations
- [x] Error handling that doesn't expose sensitive information

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Backend API testing
describe('Social Media Platform Manager', () => {
  it('should handle multi-platform posting with optimization', async () => {
    const testContent = {
      text: 'Excited to announce our engagement! 💍',
      media: [{ type: 'image', url: 'https://example.com/photo.jpg' }],
      hashtags: ['#Engaged2025', '#LoveWins'],
      weddingContext: {
        weddingId: 'wedding-123',
        eventType: 'engagement',
        privacyLevel: 'public'
      }
    };

    const results = await SocialMediaPlatformManager.postToMultiplePlatforms(
      'user-123',
      ['instagram', 'facebook', 'twitter'],
      testContent
    );

    // Verify all platforms posted successfully
    expect(results.instagram.success).toBe(true);
    expect(results.facebook.success).toBe(true);
    expect(results.twitter.success).toBe(true);

    // Verify platform-specific optimizations
    expect(results.instagram.platformSpecificData).toBeDefined();
    expect(results.twitter.platformSpecificData.text.length).toBeLessThanOrEqual(280);
  });

  it('should handle OAuth token refresh automatically', async () => {
    // Mock expired token
    const expiredTokens = {
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      scope: ['instagram_basic']
    };

    // Attempt posting with expired token
    const result = await SocialMediaPlatformManager.postToPlatform(
      'user-123',
      'instagram',
      testContent
    );

    // Should succeed due to automatic token refresh
    expect(result.success).toBe(true);
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] OAuth flows working for all 4 platforms (Instagram, Facebook, Twitter, TikTok)
- [x] Multi-platform posting with <5% failure rate
- [x] Content optimization maintaining quality across formats
- [x] Token refresh automation 99.9% reliable
- [x] API response times <500ms for posting operations
- [x] Analytics aggregation covering all connected platforms
- [x] Error handling providing actionable user feedback
- [x] Wedding-specific business logic fully implemented

### Evidence Package Required:
- [x] OAuth integration testing for all platforms
- [x] Multi-platform posting success rate metrics
- [x] Content optimization quality validation
- [x] Performance benchmarks under load
- [x] Token management reliability testing
- [x] Error handling and recovery validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core Manager: `/wedsync/src/lib/social/social-platform-manager.ts`
- Platform APIs: `/wedsync/src/lib/social/platforms/`
- API Routes: `/wedsync/src/app/api/social/`
- Database Schema: `/wedsync/supabase/migrations/`
- Types: `/wedsync/src/types/social-api.ts`
- Tests: `/wedsync/__tests__/social/api/`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch23/WS-206-team-b-round-1-complete.md`

---

END OF ROUND PROMPT