# TEAM A — BATCH 25 — ROUND 1 — WS-186 — Portfolio Management Frontend Interface

**Date:** 2025-01-26  
**Feature ID:** WS-186 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build responsive portfolio management interface with drag-and-drop organization for wedding vendor image galleries  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer managing my business presence on WedSync
**I want to:** Upload and organize my wedding portfolio with intuitive drag-and-drop interface and visual feedback
**So that:** I can showcase my best work effectively to attract couples without spending hours on manual organization

**Real Wedding Problem This Solves:**
Wedding photographers currently spend 3 hours manually organizing each wedding's 500+ photos into categories (ceremony, reception, portraits). They struggle with creating galleries that load quickly and look professional across devices. This interface will reduce portfolio management from hours to minutes with AI-assisted organization and responsive galleries.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Drag-and-drop image organization with visual feedback
- Bulk upload with progress indicators and AI processing status  
- Category management (ceremony, reception, portraits, details)
- Hero image selection and featured work curation
- Responsive gallery views for all device sizes
- Integration with Team B's image processing API

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions  
- Testing: Playwright MCP, Browser MCP, Vitest
- Drag-Drop: @dnd-kit/core, @dnd-kit/sortable
- Image Processing: react-image-gallery, sharp integration

**Integration Points:**
- Team B Image Processing API: `/api/portfolio/upload` endpoint
- Team D AI Services: Image tagging and categorization
- CDN Storage: Optimized image variants and caching

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

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
  // Get correct library ID first
await mcp__Ref__ref_search_documentation({query: "core drag-drop sortable latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next file-upload image-processing latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss grid-layout responsive latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react hook form file-upload progress latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("FileUpload", "", true);
await mcp__serena__find_symbol("DragDropZone", "", true);
await mcp__serena__get_symbols_overview("/src/components/ui");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Portfolio management interface implementation"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "React component architecture and drag-drop patterns"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Responsive gallery and upload interfaces" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "File upload security and validation"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Drag-drop and upload testing"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab "Visual portfolio testing" --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style "Component structure and best practices"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant portfolio and image components first
- Understand existing file upload patterns and conventions
- Check integration points with backend APIs
- Review similar drag-drop implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed component architecture plan
- Design drag-drop interaction flows
- Plan responsive breakpoints and mobile experience
- Write test cases FIRST (TDD)
- Consider error handling and edge cases

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI component patterns
- Use Ref MCP @dnd-kit examples as templates
- Implement with parallel agents
- Focus on accessibility and responsive design

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including drag-drop scenarios
- Verify with Playwright across devices
- Create visual evidence package
- Generate accessibility reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Interface Implementation):
- [ ] PortfolioManager component with drag-drop functionality
- [ ] BulkUploadZone with progress indicators and file validation
- [ ] ImageGallery component with responsive grid layout
- [ ] CategoryManager for organizing by ceremony/reception/portraits
- [ ] HeroImageSelector for featured work curation
- [ ] Basic Playwright tests for drag-drop interactions
- [ ] Mobile-responsive design working on all breakpoints

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
- FROM Team B: Image processing API endpoints - Required for upload functionality
- FROM Team D: AI tagging service interface - Dependency for auto-categorization

### What other teams NEED from you:
- TO Team B: Component specifications for API integration - They need this for their processing pipeline
- TO Team C: Asset requirements for CDN optimization - Blocking their integration work

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL FILE UPLOADS

**EVERY file upload MUST use the security framework:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withFileValidation } from '@/lib/validation/middleware';

export const PortfolioUpload = withFileValidation(
  ['image/jpeg', 'image/png', 'image/webp'], // Allowed MIME types
  10 * 1024 * 1024, // Max 10MB per file
  async (request, validatedFiles) => {
    // Files are validated and safe
    return await processPortfolioImages(validatedFiles);
  }
);
```

### SECURITY CHECKLIST FOR PORTFOLIO COMPONENTS
- [ ] **File Type Validation**: Only allow image MIME types - NEVER trust file extensions
- [ ] **File Size Limits**: Enforce 10MB max per image, 100MB total per batch
- [ ] **Image Dimension Limits**: Max 10000x10000 pixels to prevent memory attacks
- [ ] **Malware Scanning**: Validate image headers and scan for embedded malware
- [ ] **CSRF Protection**: All upload forms include CSRF tokens
- [ ] **Input Sanitization**: Sanitize all metadata, captions, and descriptions
- [ ] **Authentication Check**: Verify user owns the portfolio being modified

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// PORTFOLIO-SPECIFIC TESTING APPROACH

// 1. DRAG-AND-DROP VALIDATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/supplier/portfolio"});
const portfolioStructure = await mcp__playwright__browser_snapshot();

// 2. MULTI-FILE UPLOAD TESTING
await mcp__playwright__browser_file_upload({
  paths: [
    '/test/portfolio/ceremony-1.jpg',
    '/test/portfolio/ceremony-2.jpg',
    '/test/portfolio/reception-1.jpg'
  ]
});

// 3. DRAG-AND-DROP BETWEEN CATEGORIES
await mcp__playwright__browser_drag({
  startElement: "Ceremony photo",
  startRef: "[data-testid='image-ceremony-1']",
  endElement: "Reception category",
  endRef: "[data-testid='category-reception']"
});

// 4. RESPONSIVE PORTFOLIO TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({filename: `portfolio-${width}px.png`});
  // Verify grid layout adapts correctly
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Drag-and-drop between categories works smoothly
- [ ] Bulk upload handles 20+ images without performance issues  
- [ ] Mobile portfolio gallery is fully functional
- [ ] Hero image selection persists across page reloads
- [ ] Upload progress indicators display accurately


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

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Portfolio interface supports drag-drop organization
- [ ] Bulk upload processes 20+ images with progress tracking
- [ ] Components are fully responsive (375px to 1920px)
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors and accessibility violations

### Performance & Integration:
- [ ] Image gallery loads within 1 second for 50+ images
- [ ] Drag operations have <100ms response time
- [ ] Upload progress updates in real-time
- [ ] Mobile experience is smooth and touch-friendly
- [ ] Ready for Team B API integration

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/supplier/PortfolioManager.tsx`
- Gallery: `/wedsync/src/components/supplier/ImageGallery.tsx`
- Upload: `/wedsync/src/components/supplier/BulkUploadZone.tsx`
- Tests: `/wedsync/src/__tests__/portfolio-interface.test.tsx`
- Types: `/wedsync/src/types/portfolio.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch25/WS-186-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-186) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch25)

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip responsive design - mobile is critical for wedding suppliers
- Do NOT ignore drag-drop accessibility for keyboard users
- Do NOT claim completion without visual evidence and working demos
- REMEMBER: Teams B, C, D, E work in PARALLEL - coordinate dependencies

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] PortfolioManager component with drag-drop complete
- [ ] BulkUploadZone with progress indicators working
- [ ] ImageGallery responsive across all breakpoints
- [ ] Security validation implemented for all uploads
- [ ] Playwright tests covering drag-drop scenarios
- [ ] Code committed and evidence package created
- [ ] Report created with screenshots and demos

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY