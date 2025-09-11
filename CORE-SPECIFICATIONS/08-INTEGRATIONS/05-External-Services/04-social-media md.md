# 04-social-media.md

## What to Build

Implement social media integrations for authentication, profile enrichment, content sharing, and marketing capabilities across Instagram, Facebook, and Pinterest.

## Key Technical Requirements

### OAuth Social Login

```
// app/lib/auth/social-providers.ts
import { SupabaseClient } from '@supabase/supabase-js';

export class SocialAuthProvider {
  constructor(private supabase: SupabaseClient) {}
  
  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/auth/callback`,
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    return { data, error };
  }
  
  async signInWithFacebook() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/auth/callback`,
        scopes: 'email public_profile pages_show_list instagram_basic'
      }
    });
    
    return { data, error };
  }
}
```

### Instagram Business API

```
// app/lib/social/instagram-client.ts
export class InstagramBusinessAPI {
  private accessToken: string;
  private businessAccountId: string;
  
  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.businessAccountId = businessAccountId;
  }
  
  async getProfile() {
    const response = await fetch(
      `[https://graph.facebook.com/v18.0/${this.businessAccountId}?`](https://graph.facebook.com/v18.0/${this.businessAccountId}?`) +
      `fields=biography,followers_count,media_count,profile_picture_url,username&` +
      `access_token=${this.accessToken}`
    );
    
    return response.json();
  }
  
  async getRecentMedia(limit = 25) {
    const response = await fetch(
      `[https://graph.facebook.com/v18.0/${this.businessAccountId}/media?`](https://graph.facebook.com/v18.0/${this.businessAccountId}/media?`) +
      `fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&` +
      `limit=${limit}&access_token=${this.accessToken}`
    );
    
    return response.json();
  }
  
  async getInsights() {
    const response = await fetch(
      `[https://graph.facebook.com/v18.0/${this.businessAccountId}/insights?`](https://graph.facebook.com/v18.0/${this.businessAccountId}/insights?`) +
      `metric=impressions,reach,profile_views&period=day&` +
      `access_token=${this.accessToken}`
    );
    
    return response.json();
  }
  
  async getHashtagSearch(hashtag: string) {
    // Search for wedding-related hashtags
    const hashtagId = await this.getHashtagId(hashtag);
    
    const response = await fetch(
      `[https://graph.facebook.com/v18.0/${hashtagId}/recent_media?`](https://graph.facebook.com/v18.0/${hashtagId}/recent_media?`) +
      `fields=id,media_type,media_url,permalink&` +
      `user_id=${this.businessAccountId}&` +
      `access_token=${this.accessToken}`
    );
    
    return response.json();
  }
}
```

### Pinterest API Integration

```
// app/lib/social/pinterest-client.ts
export class PinterestAPI {
  private accessToken: string;
  private baseUrl = '[https://api.pinterest.com/v5](https://api.pinterest.com/v5)';
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  async createBoard(name: string, description: string) {
    const response = await fetch(`${this.baseUrl}/boards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        privacy: 'PUBLIC'
      })
    });
    
    return response.json();
  }
  
  async createPin({
    boardId,
    imageUrl,
    title,
    description,
    link
  }: PinData) {
    const response = await fetch(`${this.baseUrl}/pins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: imageUrl
        },
        title,
        description,
        link,
        alt_text: title
      })
    });
    
    return response.json();
  }
  
  async searchWeddingIdeas(query: string) {
    const response = await fetch(
      `${this.baseUrl}/search/pins?query=${encodeURIComponent(query)}&` +
      `page_size=25`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );
    
    return response.json();
  }
}
```

### Social Sharing Component

```
// app/components/social/ShareWidget.tsx
export const SocialShareWidget = ({ 
  content,
  images,
  url 
}: ShareWidgetProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  
  const shareToInstagram = async () => {
    // Instagram requires native app - generate share intent
    const shareUrl = `instagram://library?LocalIdentifier=${images[0]}`;
    
    if (isMobile()) {
      window.location.href = shareUrl;
    } else {
      // Show QR code for mobile scanning
      generateQRCode(shareUrl);
    }
  };
  
  const shareToFacebook = () => {
    FB.ui({
      method: 'share',
      href: url,
      quote: content
    }, (response) => {
      trackShare('facebook', response);
    });
  };
  
  const shareToPinterest = async () => {
    const pinUrl = `[https://pinterest.com/pin/create/button/?`](https://pinterest.com/pin/create/button/?`) +
      `url=${encodeURIComponent(url)}&` +
      `media=${encodeURIComponent(images[0])}&` +
      `description=${encodeURIComponent(content)}`;
    
    [window.open](http://window.open)(pinUrl, '_blank', 'width=750,height=600');
  };
  
  const shareToWhatsApp = () => {
    const text = `${content} ${url}`;
    const whatsappUrl = `[https://wa.me/?text=${encodeURIComponent(text)}`](https://wa.me/?text=${encodeURIComponent(text)}`);
    [window.open](http://window.open)(whatsappUrl, '_blank');
  };
  
  return (
    <div className="social-share-widget">
      <h3>Share Your Wedding Updates</h3>
      
      <div className="platform-grid">
        <button onClick={shareToInstagram} className="instagram">
          <Instagram /> Share to Instagram
        </button>
        
        <button onClick={shareToFacebook} className="facebook">
          <Facebook /> Share to Facebook
        </button>
        
        <button onClick={shareToPinterest} className="pinterest">
          <Pinterest /> Save to Pinterest
        </button>
        
        <button onClick={shareToWhatsApp} className="whatsapp">
          <MessageCircle /> Send via WhatsApp
        </button>
      </div>
      
      <ShareAnalytics platforms={selectedPlatforms} />
    </div>
  );
};
```

### Instagram Feed Display

```
// app/components/social/InstagramFeed.tsx
export const InstagramFeed = ({ username }: { username: string }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadInstagramFeed();
  }, [username]);
  
  const loadInstagramFeed = async () => {
    try {
      // Load from our cached/proxied endpoint
      const response = await fetch(
        `/api/social/instagram/feed?username=${username}`
      );
      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error('Failed to load Instagram feed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="instagram-feed-widget">
      <div className="feed-header">
        <Instagram className="w-6 h-6" />
        <span>@{username}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {[posts.map](http://posts.map)(post => (
          <a
            key={[post.id](http://post.id)}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden"
          >
            <img
              src={post.thumbnail_url || [post.media](http://post.media)_url}
              alt={post.caption?.substring(0, 100)}
              className="object-cover w-full h-full hover:scale-110 
                         transition-transform"
            />
            {[post.media](http://post.media)_type === 'VIDEO' && (
              <PlayCircle className="absolute top-2 right-2 text-white" />
            )}
          </a>
        ))}
      </div>
      
      <a
        href={`[https://instagram.com/${username}`](https://instagram.com/${username}`)}
        target="_blank"
        className="block text-center mt-4 text-primary"
      >
        View More on Instagram →
      </a>
    </div>
  );
};
```

### Database Schema

```
-- Store social media connections
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  platform TEXT CHECK (platform IN ('instagram', 'facebook', 'pinterest', 'tiktok')),
  account_id TEXT,
  username TEXT,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expires_at TIMESTAMPTZ,
  profile_data JSONB,
  is_business BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track social shares
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  platform TEXT,
  content_type TEXT, -- 'gallery', 'update', 'vendor_profile'
  content_id UUID,
  share_url TEXT,
  engagement_data JSONB, -- likes, comments, shares
  shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache Instagram media
CREATE TABLE instagram_media_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT,
  media_id TEXT UNIQUE,
  media_type TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  permalink TEXT,
  timestamp TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Social Media Webhook Handler

```
// app/api/webhooks/social/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('X-Hub-Signature-256');
  const body = await request.text();
  
  // Verify webhook signature (Facebook/Instagram)
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FACEBOOK_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const data = JSON.parse(body);
  
  // Handle different webhook events
  for (const entry of data.entry) {
    if (entry.changes) {
      for (const change of entry.changes) {
        await handleSocialWebhook(change);
      }
    }
  }
  
  return new Response('OK', { status: 200 });
}

async function handleSocialWebhook(change: any) {
  switch (change.field) {
    case 'mentions':
      // Handle Instagram mentions
      await processMention(change.value);
      break;
    
    case 'comments':
      // Handle comments on posts
      await processComment(change.value);
      break;
    
    case 'photos':
      // Handle new photos tagged
      await processTaggedPhoto(change.value);
      break;
  }
}
```

## Critical Implementation Notes

1. **API Rate Limits**: Instagram has strict rate limits - implement caching
2. **Token Management**: Facebook/Instagram tokens expire - implement refresh
3. **Platform Policies**: Follow each platform's developer policies strictly
4. **Content Rights**: Ensure proper permissions for reposting content
5. **Privacy Settings**: Respect user privacy settings on all platforms
6. **Mobile Deep Linking**: Instagram sharing requires mobile app
7. **Webhook Verification**: Each platform has different verification methods
8. **GDPR Compliance**: Handle social data according to privacy laws

## Testing Checklist

- [ ]  OAuth flow works for all platforms
- [ ]  Token refresh handles expiration
- [ ]  Instagram feed loads correctly
- [ ]  Share functionality works on mobile
- [ ]  Pinterest board creation succeeds
- [ ]  Webhooks verify signatures properly
- [ ]  Rate limiting prevents API errors
- [ ]  Privacy settings are respected