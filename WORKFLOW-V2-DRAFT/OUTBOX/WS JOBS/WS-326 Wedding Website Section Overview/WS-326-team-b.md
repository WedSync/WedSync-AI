# TEAM B - ROUND 1: WS-326 - Wedding Website Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the backend/API infrastructure for wedding website management including database operations, content storage, domain management, and secure API endpoints
**FEATURE ID:** WS-326 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating scalable, secure API architecture that supports thousands of wedding websites with custom content

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedding-websites/
ls -la $WS_ROOT/wedsync/supabase/migrations/
cat $WS_ROOT/wedsync/src/app/api/wedding-websites/route.ts | head -20
cat $WS_ROOT/wedsync/src/lib/wedding-websites/service.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --testPathPattern="wedding-websites.*api"
# MUST show: "All tests passing"
```

4. **DATABASE MIGRATION TEST:**
```bash
cd $WS_ROOT/wedsync && npx supabase migration up --local
# MUST show: "All migrations applied successfully"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and database schema
await mcp__serena__search_for_pattern("api.*route|database.*migration|supabase.*client");
await mcp__serena__find_symbol("createSupabaseClient", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__find_symbol("withSecureValidation", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// Load the SAAS UI Style Guide for understanding data requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to API development and database design
await mcp__Ref__ref_search_documentation("Next.js 15 API routes Supabase integration patterns");
await mcp__Ref__ref_search_documentation("PostgreSQL database schema design website content storage");
await mcp__Ref__ref_search_documentation("Zod validation middleware API security patterns");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX API ARCHITECTURE

### Use Sequential Thinking MCP for Backend Planning
```typescript
// Plan the wedding website API architecture
mcp__sequential-thinking__sequential_thinking({
  thought: "For wedding website backend, I need: 1) Database schema for websites, themes, and content, 2) CRUD API endpoints for website management, 3) File storage for images/media, 4) Custom domain handling, 5) Publishing/unpublishing logic, 6) Security for couple data protection.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design considerations: wedding_websites table with JSONB for flexible content, themes table for template definitions, website_pages for multi-page sites, media_assets for images/files. Need proper foreign keys to couples table and RLS policies for data security.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints, track database dependencies
2. **nextjs-fullstack-developer** - Use Serena for API pattern consistency  
3. **security-compliance-officer** - Ensure API security and data validation
4. **code-quality-guardian** - Maintain TypeScript/API standards
5. **test-automation-architect** - API testing with comprehensive coverage
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all website content output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log website creation/updates with user context

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { secureStringSchema, secureContentSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**PRIMARY RESPONSIBILITIES:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware implementation
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation
- File storage and media handling

### WEDDING WEBSITE API REQUIREMENTS

#### 1. DATABASE MIGRATION
```sql
-- File: $WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_wedding_websites.sql

CREATE TABLE IF NOT EXISTS wedding_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subdomain VARCHAR(100) UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  theme_id VARCHAR(50) DEFAULT 'classic',
  title VARCHAR(200) NOT NULL,
  content JSONB DEFAULT '{}',
  seo_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wedding_website_themes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  preview_image VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wedding_website_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  alt_text VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE wedding_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_website_media ENABLE ROW LEVEL SECURITY;

-- Couples can only access their own website data
CREATE POLICY "Couples can manage their wedding websites" ON wedding_websites
  FOR ALL USING (
    couple_id IN (
      SELECT id FROM clients 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Insert default themes
INSERT INTO wedding_website_themes (id, name, description, config) VALUES
('classic', 'Classic Elegance', 'Timeless and sophisticated', '{"colors": {"primary": "#8B4513", "secondary": "#F5F5DC"}, "fonts": {"heading": "serif", "body": "sans-serif"}}'),
('modern', 'Modern Minimalist', 'Clean and contemporary', '{"colors": {"primary": "#2C3E50", "secondary": "#ECF0F1"}, "fonts": {"heading": "sans-serif", "body": "sans-serif"}}'),
('rustic', 'Rustic Charm', 'Natural and warm', '{"colors": {"primary": "#8B4513", "secondary": "#DEB887"}, "fonts": {"heading": "serif", "body": "serif"}}'),
('beach', 'Beach Bliss', 'Coastal and relaxed', '{"colors": {"primary": "#20B2AA", "secondary": "#F0F8FF"}, "fonts": {"heading": "sans-serif", "body": "sans-serif"}}'),
('garden', 'Garden Party', 'Fresh and floral', '{"colors": {"primary": "#228B22", "secondary": "#F0FFF0"}, "fonts": {"heading": "serif", "body": "sans-serif"}}');
```

#### 2. API ROUTES IMPLEMENTATION

**Main Wedding Websites API:**
```typescript
// File: $WS_ROOT/wedsync/src/app/api/wedding-websites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { createWeddingWebsiteSchema, updateWeddingWebsiteSchema } from '$WS_ROOT/wedsync/src/lib/validation/wedding-website-schemas';
import { WeddingWebsiteService } from '$WS_ROOT/wedsync/src/lib/wedding-websites/service';

export const GET = async (request: NextRequest) => {
  // Get wedding websites for authenticated user's couples
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const websites = await WeddingWebsiteService.getByOrganization(session.user.organizationId);
  return NextResponse.json({ websites });
};

export const POST = withSecureValidation(
  createWeddingWebsiteSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for website creation
    const rateLimitResult = await rateLimitService.checkRateLimit(request, 'website-creation', 5, 3600);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const website = await WeddingWebsiteService.create(validatedData, session.user.organizationId);
    return NextResponse.json({ website }, { status: 201 });
  }
);
```

**Individual Website Management API:**
```typescript
// File: $WS_ROOT/wedsync/src/app/api/wedding-websites/[id]/route.ts

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const website = await WeddingWebsiteService.getById(params.id, session.user.organizationId);
  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  return NextResponse.json({ website });
};

export const PUT = withSecureValidation(
  updateWeddingWebsiteSchema,
  async (request: NextRequest, validatedData, { params }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await WeddingWebsiteService.update(params.id, validatedData, session.user.organizationId);
    return NextResponse.json({ website });
  }
);

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await WeddingWebsiteService.delete(params.id, session.user.organizationId);
  return NextResponse.json({ message: 'Website deleted successfully' });
};
```

#### 3. VALIDATION SCHEMAS
```typescript
// File: $WS_ROOT/wedsync/src/lib/validation/wedding-website-schemas.ts

import { z } from 'zod';
import { secureStringSchema, secureContentSchema } from './schemas';

export const createWeddingWebsiteSchema = z.object({
  coupleId: z.string().uuid('Invalid couple ID'),
  title: secureStringSchema.min(1, 'Title is required').max(200, 'Title too long'),
  subdomain: secureStringSchema
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain too long')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  themeId: z.enum(['classic', 'modern', 'rustic', 'beach', 'garden']).default('classic'),
  content: z.object({
    ourStory: secureContentSchema.max(5000, 'Story too long').optional(),
    weddingDetails: z.object({
      date: z.string().datetime('Invalid wedding date').optional(),
      venue: secureStringSchema.max(200, 'Venue name too long').optional(),
      address: secureStringSchema.max(500, 'Address too long').optional(),
      ceremony: secureContentSchema.max(1000, 'Ceremony details too long').optional(),
      reception: secureContentSchema.max(1000, 'Reception details too long').optional()
    }).optional(),
    rsvpSettings: z.object({
      enabled: z.boolean().default(true),
      deadline: z.string().datetime('Invalid RSVP deadline').optional(),
      guestPlusOne: z.boolean().default(false),
      mealChoices: z.array(secureStringSchema).max(10, 'Too many meal choices').optional()
    }).optional(),
    registryLinks: z.array(z.object({
      name: secureStringSchema.max(100, 'Registry name too long'),
      url: z.string().url('Invalid registry URL')
    })).max(10, 'Too many registry links').optional()
  }).default({}),
  seoSettings: z.object({
    title: secureStringSchema.max(60, 'SEO title too long').optional(),
    description: secureStringSchema.max(160, 'SEO description too long').optional(),
    keywords: z.array(secureStringSchema).max(20, 'Too many keywords').optional()
  }).optional(),
  privacySettings: z.object({
    isPrivate: z.boolean().default(false),
    password: secureStringSchema.min(6, 'Password too short').max(50, 'Password too long').optional()
  }).optional()
});

export const updateWeddingWebsiteSchema = createWeddingWebsiteSchema.partial().omit({ coupleId: true });

export const publishWebsiteSchema = z.object({
  isPublished: z.boolean(),
  customDomain: secureStringSchema
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})$/, 'Invalid domain format')
    .optional()
});
```

#### 4. SERVICE LAYER
```typescript
// File: $WS_ROOT/wedsync/src/lib/wedding-websites/service.ts

import { createSupabaseClient } from '$WS_ROOT/wedsync/src/lib/supabase/client';
import { WeddingWebsite, CreateWeddingWebsiteData, UpdateWeddingWebsiteData } from '$WS_ROOT/wedsync/src/types/wedding-website';

export class WeddingWebsiteService {
  static async getByOrganization(organizationId: string): Promise<WeddingWebsite[]> {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('wedding_websites')
      .select(`
        *,
        couple:clients(id, bride_name, groom_name, wedding_date)
      `)
      .eq('clients.organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch wedding websites: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string, organizationId: string): Promise<WeddingWebsite | null> {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('wedding_websites')
      .select(`
        *,
        couple:clients(id, bride_name, groom_name, wedding_date, organization_id)
      `)
      .eq('id', id)
      .eq('clients.organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch wedding website: ${error.message}`);
    }

    return data;
  }

  static async create(data: CreateWeddingWebsiteData, organizationId: string): Promise<WeddingWebsite> {
    const supabase = createSupabaseClient();

    // Verify couple belongs to organization
    const { data: couple, error: coupleError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.coupleId)
      .eq('organization_id', organizationId)
      .single();

    if (coupleError || !couple) {
      throw new Error('Invalid couple or unauthorized access');
    }

    // Generate unique subdomain if not provided
    let subdomain = data.subdomain;
    if (!subdomain) {
      subdomain = await this.generateUniqueSubdomain();
    }

    const { data: website, error } = await supabase
      .from('wedding_websites')
      .insert({
        ...data,
        subdomain,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create wedding website: ${error.message}`);
    }

    return website;
  }

  static async update(id: string, data: UpdateWeddingWebsiteData, organizationId: string): Promise<WeddingWebsite> {
    const supabase = createSupabaseClient();

    const { data: website, error } = await supabase
      .from('wedding_websites')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('couple_id', data.coupleId || id) // Ensure belongs to organization via RLS
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update wedding website: ${error.message}`);
    }

    return website;
  }

  static async delete(id: string, organizationId: string): Promise<void> {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('wedding_websites')
      .delete()
      .eq('id', id)
      .eq('couple_id', id); // RLS will ensure proper access

    if (error) {
      throw new Error(`Failed to delete wedding website: ${error.message}`);
    }
  }

  private static async generateUniqueSubdomain(): Promise<string> {
    const supabase = createSupabaseClient();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const subdomain = this.generateRandomSubdomain();
      
      const { data, error } = await supabase
        .from('wedding_websites')
        .select('id')
        .eq('subdomain', subdomain)
        .single();

      if (error && error.code === 'PGRST116') {
        // Subdomain is available
        return subdomain;
      }

      attempts++;
    }

    throw new Error('Unable to generate unique subdomain');
  }

  private static generateRandomSubdomain(): string {
    const adjectives = ['lovely', 'beautiful', 'sweet', 'romantic', 'elegant', 'charming'];
    const nouns = ['wedding', 'celebration', 'union', 'love', 'joy', 'bliss'];
    const randomNum = Math.floor(Math.random() * 1000);
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}-${noun}-${randomNum}`;
  }
}
```

## 📋 REAL WEDDING USER STORIES FOR BACKEND

**Emma & James (Photography Couple):**
*Backend needs: Store high-resolution photo gallery, handle 150 guest RSVP responses with meal choices, manage custom domain emma-james-wedding.com*

**Sarah & Mike (Destination Wedding):**
*Backend needs: Store travel information in structured format, handle international guest RSVPs, support multiple language content, manage accommodation booking links*

**Lisa & David (Garden Party Wedding):**
*Backend needs: Handle casual RSVP with plus-one options, store vendor information (caterer, florist), manage simple photo sharing from guests*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Database migration with wedding_websites, wedding_website_themes, and wedding_website_media tables
- [ ] Complete API routes for CRUD operations on wedding websites
- [ ] Zod validation schemas for all website data
- [ ] WeddingWebsiteService with business logic
- [ ] RLS policies for data security
- [ ] Rate limiting on website creation endpoints
- [ ] Error handling and audit logging
- [ ] Unit tests for all service methods (>90% coverage)
- [ ] API integration tests
- [ ] Evidence package with file listings and API testing results

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: `$WS_ROOT/wedsync/src/app/api/wedding-websites/`
- Service Layer: `$WS_ROOT/wedsync/src/lib/wedding-websites/`
- Validation: `$WS_ROOT/wedsync/src/lib/validation/wedding-website-schemas.ts`
- Types: `$WS_ROOT/wedsync/src/types/wedding-website.ts`
- Migration: `$WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_wedding_websites.sql`
- Tests: `$WS_ROOT/wedsync/src/__tests__/api/wedding-websites/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All API routes implemented with security validation
- [ ] Service layer with comprehensive business logic
- [ ] Zod schemas for all input validation
- [ ] RLS policies for data security
- [ ] Rate limiting implemented
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit and integration tests)
- [ ] Error handling and audit logging implemented
- [ ] Evidence package prepared with API testing results
- [ ] Performance tested (API response times <200ms)

---

**EXECUTE IMMEDIATELY - Build the robust API foundation that supports thousands of wedding websites!**