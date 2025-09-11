# 05-phase-5-scale.md

## What to Build

Enterprise features, directory system, advanced analytics, team management, and international expansion capabilities. This phase transforms WedSync into a comprehensive platform ready for global scale.

## Month 6-7: Directory System

### Technical Requirements

```
interface DirectorySystem {
  structure: {
    geographic: 'country > region > city'
    categories: VendorCategory[]
    search: 'elasticsearch' | 'algolia'
  }
  profiles: {
    verification: ['business', 'insurance', 'portfolio']
    ranking: ['engagement', 'reviews', 'completeness']
    premium: boolean // Paid placement options
  }
  discovery: {
    filters: ['location', 'price', 'availability', 'style']
    sorting: ['relevance', 'rating', 'distance', 'price']
    recommendations: 'collaborative_filtering'
  }
}
```

### Database Schema

```
CREATE TABLE directory_profiles (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id),
  slug TEXT UNIQUE NOT NULL, -- SEO-friendly URL
  business_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  location GEOGRAPHY(POINT), -- PostGIS for geo queries
  service_areas TEXT[], -- Multiple locations served
  price_range TEXT, -- '$', '$$', '$$$', '$$$$'
  verified_status JSONB, -- {business: true, insurance: true}
  gallery JSONB, -- Portfolio images
  seo_metadata JSONB,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE directory_inquiries (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES directory_profiles(supplier_id),
  couple_name TEXT,
  email TEXT,
  phone TEXT,
  wedding_date DATE,
  message TEXT,
  source TEXT, -- 'directory', 'search', 'referral'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for location queries
CREATE INDEX idx_directory_location 
  ON directory_profiles USING GIST(location);
```

### Search Implementation

```
// Location-based search with PostGIS
const searchByLocation = async (
  lat: number, 
  lng: number, 
  radiusKm: number,
  category?: string
) => {
  const query = supabase
    .from('directory_profiles')
    .select('*')
    .filter(
      'location',
      'ste',
      `SRID=4326;POINT(${lng} ${lat})`
    )
  
  if (category) {
    query.eq('category', category)
  }
  
  // Use PostGIS for distance calculation
  const results = await supabase.rpc('nearby_suppliers', {
    lat,
    lng,
    radius_km: radiusKm
  })
  
  return results
}

// Full-text search with ranking
CREATE FUNCTION search_directory(
  search_query TEXT,
  vendor_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  supplier_id UUID,
  business_name TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.supplier_id,
    [dp.business](http://dp.business)_name,
    ts_rank(to_tsvector('english', 
      [dp.business](http://dp.business)_name || ' ' || dp.description), 
      plainto_tsquery('english', search_query)) AS rank
  FROM directory_profiles dp
  WHERE 
    (vendor_category IS NULL OR dp.category = vendor_category)
    AND to_tsvector('english', [dp.business](http://dp.business)_name || ' ' || dp.description) 
      @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC;
END;
$$;
```

## Month 7-8: Team Management

### Multi-User Account System

```
interface TeamManagement {
  roles: {
    owner: ['all_permissions']
    admin: ['manage_team', 'edit_all', 'view_analytics']
    member: ['edit_assigned', 'view_all']
    viewer: ['view_only']
  }
  permissions: [
    'manage_billing',
    'manage_team',
    'edit_forms',
    'edit_journeys',
    'view_analytics',
    'export_data'
  ]
  limits: {
    starter: 2,
    professional: 3,
    scale: 5,
    enterprise: 'unlimited'
  }
}
```

### Database Implementation

```
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  permissions TEXT[],
  invited_by UUID REFERENCES team_members(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE team_activity_logs (
  id UUID PRIMARY KEY,
  team_member_id UUID REFERENCES team_members(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for team access
CREATE POLICY team_access ON forms
  FOR ALL USING (
    supplier_id IN (
      SELECT supplier_id FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );
```

### Team Invitation Flow

```
// Invite team member
const inviteTeamMember = async (
  email: string, 
  role: TeamRole,
  permissions?: string[]
) => {
  // Check tier limits
  const currentMembers = await getTeamMemberCount(supplierId)
  const tierLimit = getTierMemberLimit(subscription.tier)
  
  if (currentMembers >= tierLimit) {
    throw new Error('Team member limit reached. Upgrade to add more.')
  }
  
  // Create invitation
  const invitation = await supabase
    .from('team_invitations')
    .insert({
      supplier_id: supplierId,
      email,
      role,
      permissions: permissions || getDefaultPermissions(role),
      token: generateSecureToken(),
      expires_at: addDays(new Date(), 7)
    })
    .select()
    .single()
  
  // Send invitation email
  await sendTeamInviteEmail(email, invitation)
  
  return invitation
}
```

## Month 8-9: Advanced Analytics

### Analytics Infrastructure

```
interface AnalyticsSystem {
  tracking: {
    events: EventTracker
    pageViews: PageTracker
    conversions: ConversionTracker
  }
  aggregation: {
    realtime: 'supabase_realtime'
    batch: 'daily_cron_jobs'
    warehouse: 'bigquery' // For scale
  }
  dashboards: {
    executive: ['mrr', 'churn', 'cac', 'ltv']
    operational: ['signups', 'activation', 'engagement']
    vendor: ['clients', 'forms', 'revenue']
  }
}
```

### Metrics Collection

```
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  supplier_id UUID,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materialized view for performance
CREATE MATERIALIZED VIEW supplier_metrics AS
SELECT 
  [s.id](http://s.id),
  [s.business](http://s.business)_name,
  COUNT(DISTINCT [c.id](http://c.id)) as total_clients,
  COUNT(DISTINCT [fr.id](http://fr.id)) as total_form_responses,
  AVG(fr.completion_rate) as avg_completion_rate,
  COUNT(DISTINCT [je.id](http://je.id)) as journeys_executed,
  s.created_at
FROM suppliers s
LEFT JOIN clients c ON c.supplier_id = [s.id](http://s.id)
LEFT JOIN form_responses fr ON fr.supplier_id = [s.id](http://s.id)
LEFT JOIN journey_executions je ON je.supplier_id = [s.id](http://s.id)
GROUP BY [s.id](http://s.id);

-- Refresh daily
CREATE OR REPLACE FUNCTION refresh_supplier_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_metrics;
END;
$$ LANGUAGE plpgsql;
```

### Predictive Analytics

```
// Churn prediction using client behavior
class ChurnPredictor {
  async calculateChurnRisk(supplierId: string): Promise<number> {
    const signals = await this.getChurnSignals(supplierId)
    
    // Weighted scoring based on historical data
    const weights = {
      lastLogin: 0.3,
      clientActivity: 0.25,
      formCompletion: 0.2,
      journeyUsage: 0.15,
      supportTickets: 0.1
    }
    
    let riskScore = 0
    
    // Days since last login
    if (signals.daysSinceLogin > 30) riskScore += weights.lastLogin
    if (signals.daysSinceLogin > 60) riskScore += weights.lastLogin
    
    // Client engagement dropping
    if (signals.clientActivityTrend < -20) riskScore += weights.clientActivity
    
    // Low feature usage
    if (signals.formCompletionRate < 50) riskScore += weights.formCompletion
    if (!signals.hasActiveJourneys) riskScore += weights.journeyUsage
    
    // Support issues
    if (signals.recentTickets > 3) riskScore += weights.supportTickets
    
    return Math.min(riskScore * 100, 100) // Convert to percentage
  }
}
```

## Month 9-10: Enterprise Features

### White-Label Capabilities

```
interface WhiteLabelConfig {
  branding: {
    removePlatformBranding: boolean
    customDomain: string
    customEmails: boolean
    customSupport: boolean
  }
  customization: {
    css: string
    logo: string
    favicon: string
    emailTemplates: Map<string, string>
  }
  pricing: {
    tier: 'enterprise'
    monthly: 149
    setupFee: 500
  }
}
```

### SSO Integration

```
// SAML 2.0 implementation for enterprise
class SSOProvider {
  async configureSAML(supplierId: string, config: SAMLConfig) {
    const samlStrategy = new SamlStrategy({
      callbackUrl: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_URL}/api/auth/saml/callback`,
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.certificate
    }, async (profile, done) => {
      // Map SAML attributes to user
      const user = await this.findOrCreateUser({
        email: [profile.email](http://profile.email),
        name: profile.displayName,
        supplierId: supplierId
      })
      
      done(null, user)
    })
    
    return samlStrategy
  }
}
```

### API Rate Limiting

```
// Redis-based rate limiting for API
class RateLimiter {
  private redis: Redis
  
  async checkLimit(key: string, tier: string): Promise<boolean> {
    const limits = {
      starter: { requests: 1000, window: 3600 },
      professional: { requests: 5000, window: 3600 },
      scale: { requests: 20000, window: 3600 },
      enterprise: { requests: 100000, window: 3600 }
    }
    
    const limit = limits[tier]
    const current = await this.redis.incr(key)
    
    if (current === 1) {
      await this.redis.expire(key, limit.window)
    }
    
    return current <= limit.requests
  }
}
```

## API Endpoints

```
const scaleEndpoints = [
  // Directory
  'GET /api/directory/search',
  'GET /api/directory/profile/:slug',
  'POST /api/directory/inquire',
  'PUT /api/directory/profile',
  
  // Team
  'GET /api/team/members',
  'POST /api/team/invite',
  'PUT /api/team/member/:id/role',
  'DELETE /api/team/member/:id',
  
  // Analytics
  'GET /api/analytics/dashboard',
  'GET /api/analytics/events',
  'POST /api/analytics/export',
  'GET /api/analytics/predictions',
  
  // Enterprise
  'POST /api/enterprise/sso/configure',
  'PUT /api/enterprise/whitelabel',
  'GET /api/enterprise/audit-log'
]
```

## Infrastructure Scaling

```
// Database read replicas
const dbConfig = {
  primary: process.env.DATABASE_URL,
  replicas: [
    process.env.DATABASE_REPLICA_1,
    process.env.DATABASE_REPLICA_2
  ],
  routing: {
    writes: 'primary',
    reads: 'round_robin' // Distribute read load
  }
}

// CDN configuration
const cdnConfig = {
  provider: 'cloudflare',
  assets: ['images', 'documents', 'static'],
  regions: ['us', 'eu', 'asia'],
  caching: {
    images: '1 year',
    documents: '1 month',
    api: '5 minutes'
  }
}
```

## Critical Implementation Notes

1. **Directory must be SEO-optimized** - Server-side rendering, meta tags, sitemaps
2. **Team permissions need careful testing** - Security is critical
3. **Analytics require data retention policy** - GDPR compliance
4. **Enterprise features need SLA** - 99.9% uptime guarantee
5. **Scale gradually** - Don't over-engineer early

## Success Criteria

1. Directory drives 30% of new supplier signups
2. Team feature adoption >50% in Scale tier
3. Analytics reduce churn by 20%
4. Enterprise tier generates $50k+ MRR
5. Platform handles 10,000+ concurrent users

## Performance Targets

- Directory search: <200ms response time
- Analytics dashboard: <1s load time
- API rate: 100 requests/second sustained
- Database: <50ms query time for 95th percentile
- Global latency: <100ms from edge locations