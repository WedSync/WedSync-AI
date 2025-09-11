# TEAM B - ROUND 1: WS-273 - Design Customization Tools
## 2025-01-14 - Development Round 1

**YOUR MISSION:** Build the backend infrastructure for design customization including database schema, API endpoints, CSS generation engine, and real-time design persistence for wedding website customization
**FEATURE ID:** WS-273 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating a robust, scalable backend that can handle thousands of couples customizing their wedding websites simultaneously

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedme/website/design/
ls -la $WS_ROOT/wedsync/src/lib/website/
ls -la $WS_ROOT/wedsync/supabase/migrations/
cat $WS_ROOT/wedsync/src/app/api/wedme/website/design/route.ts | head -20
cat $WS_ROOT/wedsync/src/lib/website/design-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **API TEST RESULTS:**
```bash
npm test api/design
# MUST show: "All API tests passing"
```

4. **DATABASE MIGRATION PROOF:**
```bash
# Show migration was applied successfully
npx supabase migration list --linked
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and database schemas
await mcp__serena__search_for_pattern("api.*route.*website|design.*engine|css.*generation");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__get_symbols_overview("src/lib");
await mcp__serena__search_for_pattern("Supabase.*client|database.*query");
```

### B. DATABASE & API DOCUMENTATION (MANDATORY)
```typescript
// CRITICAL: Load database and API patterns
await mcp__serena__read_file("$WS_ROOT/.claude/database-schema.sql");
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/API-SECURITY-STANDARDS.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to backend development
mcp__Ref__ref_search_documentation("Next.js 15 App Router API routes authentication middleware")
mcp__Ref__ref_search_documentation("Supabase PostgreSQL database design Row Level Security policies")
mcp__Ref__ref_search_documentation("CSS generation algorithms dynamic stylesheet creation")
mcp__Ref__ref_search_documentation("Google Fonts API integration server-side optimization")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex backend architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This design customization backend requires: 1) Database schema for design storage with versioning 2) API endpoints with proper validation and security 3) CSS generation engine that creates optimized stylesheets 4) Real-time sync for live preview updates 5) Performance optimization for concurrent users. I need to analyze the data flow: couples make design changes → validate input → store in database → generate CSS → return to frontend → update live preview.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down backend tasks, track API dependencies
2. **supabase-specialist** - Use database best practices and RLS policies
3. **security-compliance-officer** - Ensure API security and input validation
4. **code-quality-guardian** - Maintain API standards and error handling
5. **test-automation-architect** - Comprehensive API testing with Jest
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for design operations
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - Sanitize all design inputs, especially custom CSS
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log all design changes with user context
- [ ] **Input size limits** - Max 10MB for custom CSS, validation on all fields
- [ ] **CSS sanitization** - DOMPurify for custom CSS input to prevent injection

## 🧭 DATABASE DESIGN REQUIREMENTS (MANDATORY)

### CORE TABLES NEEDED:

#### 1. website_designs Table
```sql
CREATE TABLE website_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Theme colors (validated hex codes)
  primary_color TEXT NOT NULL DEFAULT '#6B7280',
  secondary_color TEXT NOT NULL DEFAULT '#9CA3AF',
  accent_color TEXT NOT NULL DEFAULT '#F59E0B',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  text_color TEXT NOT NULL DEFAULT '#1F2937',
  
  -- Typography settings
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  font_size_scale DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  
  -- Layout preferences
  header_style TEXT CHECK (header_style IN ('centered', 'left', 'hero')) DEFAULT 'centered',
  navigation_position TEXT CHECK (navigation_position IN ('top', 'side')) DEFAULT 'top',
  content_width TEXT CHECK (content_width IN ('narrow', 'medium', 'wide')) DEFAULT 'medium',
  
  -- Advanced customization
  custom_css TEXT CHECK (LENGTH(custom_css) <= 10000),
  is_published BOOLEAN DEFAULT false,
  
  -- Version management
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  
  -- Validation constraints
  CONSTRAINT valid_colors CHECK (
    primary_color ~* '^#[0-9A-Fa-f]{6}$' AND
    secondary_color ~* '^#[0-9A-Fa-f]{6}$' AND
    accent_color ~* '^#[0-9A-Fa-f]{6}$' AND
    background_color ~* '^#[0-9A-Fa-f]{6}$' AND
    text_color ~* '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT valid_font_scale CHECK (font_size_scale BETWEEN 0.8 AND 1.5)
);
```

#### 2. design_presets Table
```sql
CREATE TABLE design_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('classic', 'modern', 'rustic', 'elegant', 'bohemian')),
  preview_image_url TEXT,
  
  -- Theme colors
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  
  -- Typography
  heading_font TEXT NOT NULL,
  body_font TEXT NOT NULL,
  
  -- Layout
  header_style TEXT NOT NULL,
  navigation_position TEXT NOT NULL,
  content_width TEXT NOT NULL,
  
  -- Business logic
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. design_history Table
```sql
CREATE TABLE design_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID REFERENCES website_designs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('color', 'typography', 'layout', 'css')),
  previous_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'couple'
);
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

### CORE API ENDPOINTS TO BUILD:

#### 1. Design Management APIs
```typescript
// GET /api/wedme/website/design
// Load current design + presets for customizer
interface GetDesignResponse {
  success: boolean;
  design: WebsiteDesign | null;
  presets: DesignPreset[];
  error?: string;
}

// PUT /api/wedme/website/design  
// Update design with validation and CSS generation
interface UpdateDesignRequest {
  coupleId: string;
  websiteId: string;
  theme?: Partial<ThemeColors>;
  typography?: Partial<Typography>;
  layout?: Partial<LayoutSettings>;
  custom_css?: string;
}

interface UpdateDesignResponse {
  success: boolean;
  design: WebsiteDesign;
  generated_css: string;
  preview_url: string;
  error?: string;
}
```

#### 2. CSS Generation API
```typescript
// GET /api/wedme/website/design/css
// Generate optimized CSS for live preview
interface GetGeneratedCSSResponse {
  css: string;
  fonts_to_load: string[];
  cache_key: string;
  performance_metrics: {
    generation_time_ms: number;
    css_size_bytes: number;
    fonts_loaded: number;
  };
}

// POST /api/wedme/website/design/preview
// Generate preview with custom design
interface PreviewDesignRequest {
  design: Partial<WebsiteDesign>;
  content: WebsiteContent;
}
```

#### 3. Preset Management APIs
```typescript
// POST /api/wedme/website/design/preset/[presetId]
// Apply design preset with customization
interface ApplyPresetRequest {
  coupleId: string;
  websiteId: string;
  preserveCustomizations?: boolean;
}

interface ApplyPresetResponse {
  success: boolean;
  design: WebsiteDesign;
  applied_preset: DesignPreset;
  preserved_fields: string[];
}
```

### CORE BACKEND SERVICES TO BUILD:

#### 1. DesignEngine Service
```typescript
// Location: /src/lib/website/design-engine.ts
export class DesignEngine {
  // Generate optimized CSS from design object
  async generateCSS(design: WebsiteDesign): Promise<string>;
  
  // Load and optimize Google Fonts
  async loadGoogleFonts(fonts: string[]): Promise<FontLoadResult>;
  
  // Validate design configuration
  validateDesign(design: Partial<WebsiteDesign>): ValidationResult;
  
  // Generate color palettes and suggestions
  generateColorPalette(baseColor: string): ColorPalette;
  
  // Convert design to CSS variables
  generateCSSVariables(design: WebsiteDesign): CSSVariables;
  
  // Performance optimization for CSS output
  optimizeCSS(css: string): OptimizedCSS;
}
```

#### 2. PresetManager Service  
```typescript
// Location: /src/lib/website/preset-manager.ts
export class PresetManager {
  // Get presets by wedding category
  async getPresetsByCategory(category: string): Promise<DesignPreset[]>;
  
  // Apply preset with smart merging
  async applyPreset(
    coupleId: string, 
    presetId: string, 
    preserveCustomizations: boolean
  ): Promise<WebsiteDesign>;
  
  // Create custom preset from design
  async createCustomPreset(
    design: WebsiteDesign, 
    name: string, 
    isPublic: boolean
  ): Promise<DesignPreset>;
  
  // Validate preset configuration
  validatePreset(preset: Partial<DesignPreset>): ValidationResult;
}
```

#### 3. DesignHistory Service
```typescript
// Location: /src/lib/website/design-history.ts
export class DesignHistoryService {
  // Track design changes for undo/redo
  async saveDesignHistory(
    designId: string,
    changeType: ChangeType,
    previousValue: any,
    newValue: any
  ): Promise<void>;
  
  // Get design change history
  async getDesignHistory(designId: string, limit: number): Promise<DesignHistory[]>;
  
  // Undo last change
  async undoLastChange(designId: string): Promise<WebsiteDesign>;
  
  // Redo change
  async redoChange(designId: string): Promise<WebsiteDesign>;
}
```

### PERFORMANCE OPTIMIZATION REQUIREMENTS:

#### CSS Generation Performance:
- [ ] **CSS caching** - Cache generated CSS with Redis for 1 hour
- [ ] **Incremental generation** - Only regenerate changed sections
- [ ] **Font optimization** - Preload critical fonts, lazy load others
- [ ] **CSS minification** - Remove unnecessary whitespace and comments
- [ ] **Compression** - Gzip CSS responses for smaller payloads
- [ ] **CDN integration** - Serve generated CSS from edge locations

#### Database Performance:
- [ ] **Indexed queries** - Index couple_id, is_active for fast lookups
- [ ] **Connection pooling** - Efficient database connection management
- [ ] **Query optimization** - Use prepared statements for repeated queries
- [ ] **Batch operations** - Bulk insert/update for design history
- [ ] **Read replicas** - Separate read/write operations for scalability

## 📋 TECHNICAL SPECIFICATION FOCUS
**Wedding Context:** Couples need to customize their wedding website design to match their wedding theme and personal style. The backend must handle thousands of concurrent design customizations while maintaining performance and data integrity.

**Backend Requirements:**
- Secure API endpoints with comprehensive validation
- Real-time CSS generation and optimization
- Design versioning and history tracking
- Wedding-themed preset management
- Performance optimization for concurrent users
- Integration with Google Fonts API
- Database design with proper constraints and RLS

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### DATABASE DELIVERABLES:
- [ ] **Migration 004_website_designs.sql** - Complete database schema
- [ ] **RLS policies** - Row Level Security for all tables
- [ ] **Database indexes** - Optimized queries for design operations
- [ ] **Seed data** - 10+ wedding-themed design presets
- [ ] **Constraint validation** - Comprehensive data validation rules

### API DELIVERABLES:
- [ ] **GET /api/wedme/website/design** - Load design and presets
- [ ] **PUT /api/wedme/website/design** - Update design with validation
- [ ] **GET /api/wedme/website/design/css** - Generate CSS for preview
- [ ] **POST /api/wedme/website/design/preset/[id]** - Apply preset
- [ ] **POST /api/wedme/website/design/publish** - Publish design changes
- [ ] **API middleware** - withSecureValidation for all endpoints
- [ ] **Rate limiting** - Prevent API abuse and ensure performance

### SERVICE DELIVERABLES:
- [ ] **DesignEngine.ts** - CSS generation and optimization engine
- [ ] **PresetManager.ts** - Wedding preset management service
- [ ] **DesignHistoryService.ts** - Change tracking and undo/redo
- [ ] **ValidationSchemas.ts** - Zod schemas for all inputs
- [ ] **Error handling** - Consistent error responses
- [ ] **Logging service** - Audit trail for design operations

### TESTING DELIVERABLES:
- [ ] **API route tests** - 90%+ coverage for all endpoints
- [ ] **Service unit tests** - Test CSS generation and validation
- [ ] **Database tests** - Migration and constraint validation
- [ ] **Performance tests** - Load testing for concurrent operations
- [ ] **Security tests** - Input validation and injection prevention

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes**: `$WS_ROOT/wedsync/src/app/api/wedme/website/design/`
- **Services**: `$WS_ROOT/wedsync/src/lib/website/`
- **Migrations**: `$WS_ROOT/wedsync/supabase/migrations/`
- **Tests**: `$WS_ROOT/wedsync/src/__tests__/api/wedme/website/`
- **Types**: `$WS_ROOT/wedsync/src/types/website.ts`

## 🏁 COMPLETION CHECKLIST

### DATABASE IMPLEMENTATION:
- [ ] Migration file created and applied successfully
- [ ] All tables created with proper constraints
- [ ] RLS policies implemented and tested
- [ ] Database indexes created for performance
- [ ] Seed data inserted (design presets)
- [ ] Foreign key relationships validated

### API IMPLEMENTATION:
- [ ] All 5 core API endpoints implemented
- [ ] withSecureValidation middleware applied to all routes
- [ ] Zod validation schemas for all inputs
- [ ] Authentication checks for protected routes
- [ ] Rate limiting implemented (100 req/min per user)
- [ ] Error handling with sanitized responses

### SERVICE IMPLEMENTATION:
- [ ] DesignEngine service with CSS generation
- [ ] PresetManager service for wedding presets
- [ ] DesignHistoryService for change tracking
- [ ] All services pass unit tests
- [ ] Performance optimization implemented
- [ ] Logging and monitoring added

### SECURITY & VALIDATION:
- [ ] Input sanitization for all user data
- [ ] Custom CSS sanitization (XSS prevention)
- [ ] SQL injection prevention verified
- [ ] Audit logging for all design changes
- [ ] Error messages sanitized
- [ ] Security tests passing

### EVIDENCE PACKAGE:
- [ ] File existence proof (ls output)
- [ ] TypeScript compilation success
- [ ] API test results (all passing)
- [ ] Database migration success
- [ ] Performance benchmarks documented

---

**EXECUTE IMMEDIATELY - Build the rock-solid backend foundation that powers beautiful wedding website customization! Every API call should be secure, fast, and reliable for couples' special moments! 💍🔒**