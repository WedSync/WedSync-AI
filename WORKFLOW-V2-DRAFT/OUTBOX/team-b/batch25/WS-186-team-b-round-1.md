# TEAM B — BATCH 25 — ROUND 1 — WS-186 — Portfolio Image Processing Backend Pipeline

**Date:** 2025-01-26  
**Feature ID:** WS-186 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build scalable image processing pipeline with AI metadata extraction and multi-format optimization for wedding portfolio management  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer uploading portfolio images through Team A's interface
**I want to:** My images automatically processed, optimized, and tagged without manual intervention
**So that:** I can upload raw wedding photos and receive back optimized web-ready images with intelligent categorization and SEO-friendly metadata

**Real Wedding Problem This Solves:**
Wedding photographers currently spend hours manually resizing images for web use, writing alt text, and organizing by ceremony vs reception. The processing pipeline automatically generates WebP/AVIF variants, extracts EXIF venue data, applies AI categorization, and creates responsive image sets - reducing post-wedding workflow from 3 hours to 15 minutes.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Multi-step image processing pipeline (validation → optimization → AI analysis → storage)
- Generate responsive image variants (WebP, AVIF, multiple sizes)
- AI-powered metadata extraction (venue, tags, categorization)
- EXIF data extraction and sanitization for privacy
- Integration with Team A's upload interface
- Scalable processing queue for batch uploads

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes, Supabase Edge Functions
- Image Processing: Sharp, ImageMagick via Sharp
- AI Services: Integration with Team D's tagging API
- Storage: Supabase Storage with CDN optimization
- Queue: Redis-based processing queue for scalability

**Integration Points:**
- Team A Frontend: Upload API endpoints and status callbacks
- Team D AI Services: Image analysis and tagging integration
- Team C CDN: Optimized storage and delivery infrastructure

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

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
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
// 1. LOAD UI STYLE GUIDE (for API response structure)
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "sharp image-optimization webp latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions storage latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next api-routes file-upload latest documentation"});

// 3. SERENA MCP - Review existing patterns:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("ImageProcessing", "", true);
await mcp__serena__get_symbols_overview("/src/app/api");
```


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Processing Pipeline):
- [ ] ImageProcessingPipeline class with multi-step workflow
- [ ] PortfolioUploadAPI endpoint `/api/portfolio/upload` with validation
- [ ] ImageOptimizer service for generating responsive variants
- [ ] MetadataExtractor for EXIF data and sanitization
- [ ] ProcessingQueue for handling batch uploads efficiently
- [ ] StorageIntegration with Supabase Storage and CDN
- [ ] BasicErrorHandling with retry mechanisms and logging

### Database Schema Implementation:
- [ ] Create portfolio_images table with metadata fields
- [ ] Create portfolio_processing_queue for job management
- [ ] Create image_variants table for responsive formats
- [ ] Database migration with proper indexes and constraints

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Upload component specifications - Required for API contract design
- FROM Team D: AI tagging service interface - Dependency for metadata extraction

### What other teams NEED from you:
- TO Team A: Working upload API for frontend integration - CRITICAL blocking dependency
- TO Team C: Storage requirements for CDN optimization setup

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR IMAGE PROCESSING

```typescript
// ✅ ALWAYS USE SECURE PROCESSING PIPELINE:
import { withSecureValidation } from '@/lib/validation/middleware';
import { portfolioImageSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  portfolioImageSchema,
  async (request: NextRequest, validatedData) => {
    // Step 1: Validate file headers and detect malicious content
    const securityScan = await scanImageForMalware(validatedData.file);
    if (!securityScan.safe) {
      return NextResponse.json({ error: 'File failed security scan' }, { status: 400 });
    }
    
    // Step 2: Sanitize EXIF data to remove location/personal info
    const sanitizedImage = await stripSensitiveEXIF(validatedData.file);
    
    // Step 3: Process with size/memory limits
    const processedImage = await processImageSecurely(sanitizedImage);
    
    return NextResponse.json({ success: true, data: processedImage });
  }
);
```

### SECURITY CHECKLIST FOR IMAGE PROCESSING:
- [ ] **Malware Scanning**: Scan all uploaded images for embedded malicious code
- [ ] **Memory Limits**: Enforce processing memory limits to prevent DoS attacks  
- [ ] **File Size Validation**: Strict limits on file size and image dimensions
- [ ] **EXIF Sanitization**: Remove GPS coordinates and personal metadata
- [ ] **Output Validation**: Ensure processed images are valid and safe
- [ ] **Rate Limiting**: Prevent abuse of processing endpoints
- [ ] **Access Control**: Verify user ownership of processed images

---

## 🎭 API TESTING WITH PLAYWRIGHT MCP (MANDATORY)

```javascript
// IMAGE PROCESSING API TESTING

// 1. UPLOAD API ENDPOINT TESTING
const uploadResponse = await fetch('/api/portfolio/upload', {
  method: 'POST',
  body: formData // Contains test wedding images
});

// 2. PROCESSING PIPELINE VALIDATION
await mcp__playwright__browser_navigate({url: '/api/portfolio/status/12345'});
await mcp__playwright__browser_wait_for({text: 'Processing complete'});

// 3. IMAGE VARIANT GENERATION TESTING
const variants = await fetch('/api/portfolio/variants/12345');
// Verify WebP, AVIF, and multiple size variants created
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Processing pipeline handles 50+ images simultaneously without memory issues
- [ ] Image optimization generates WebP/AVIF variants within 30 seconds per image
- [ ] Metadata extraction achieves 95%+ accuracy for venue detection
- [ ] API endpoints return consistent JSON responses with proper error codes
- [ ] Database migrations create all required tables and indexes

### Performance & Security:
- [ ] Pipeline processes 1000+ images per hour during peak load
- [ ] All security validations pass including malware scanning
- [ ] EXIF sanitization removes sensitive location data 100% of time
- [ ] Error handling provides informative responses without exposing internals
- [ ] Integration tests validate Team A frontend compatibility

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API: `/wedsync/src/app/api/portfolio/upload/route.ts`
- Pipeline: `/wedsync/src/lib/portfolio/image-processing-pipeline.ts`
- Optimization: `/wedsync/src/lib/portfolio/image-optimizer.ts`
- Metadata: `/wedsync/src/lib/portfolio/metadata-extractor.ts`
- Migration: `/wedsync/supabase/migrations/20250126000001_portfolio_management_system.sql`
- Tests: `/wedsync/src/__tests__/api/portfolio-processing.test.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch25/WS-186-team-b-round-1-complete.md`

---

## ⚠️ DATABASE MIGRATIONS (CRITICAL)

```sql
-- ⚠️ DATABASE MIGRATION PROTOCOL:
-- 1. CREATE migration files but DO NOT APPLY them
-- 2. Migration file: /wedsync/supabase/migrations/20250126000001_portfolio_management_system.sql
-- 3. SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-186.md
-- 4. SQL Expert will validate, fix patterns, and apply safely
```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Image processing pipeline complete with security validation
- [ ] Upload API working with proper error handling
- [ ] Database schema designed and migration file created
- [ ] Integration points defined for Team A and Team D
- [ ] Performance targets met for batch processing
- [ ] Security audit passed for file processing
- [ ] Documentation complete with API specifications

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY