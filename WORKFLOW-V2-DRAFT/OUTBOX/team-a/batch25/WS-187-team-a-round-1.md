# TEAM A — BATCH 25 — ROUND 1 — WS-187 — App Store Asset Generation Interface

**Date:** 2025-01-26  
**Feature ID:** WS-187 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build automated asset generation tools for app store submission with screenshot automation and metadata optimization  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync business stakeholder preparing for app store distribution
**I want to:** Automated tools to generate all required app store assets (screenshots, icons, metadata) in the correct formats and resolutions
**So that:** I can efficiently submit to Microsoft Store, Google Play, and prepare for Apple App Store without manual asset creation

**Real Wedding Problem This Solves:**
App stores require dozens of specific asset sizes - iPhone screenshots in 1290x2796, iPad in 2048x2732, Android in various densities, plus metadata in character limits. Manual creation takes weeks and errors cause submission rejections. Automated generation ensures compliance and speeds time-to-market.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Automated screenshot generation for different device sizes and orientations
- Icon generation in all required resolutions (16x16 to 1024x1024)
- Metadata optimization with keyword analysis and character limit validation
- Asset validation against platform-specific requirements
- Batch processing for multiple platform formats simultaneously

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Image Processing: Sharp, Canvas API, Playwright screenshots
- Automation: Playwright MCP for screenshot generation
- Validation: Platform-specific requirement schemas

**Integration Points:**
- Team B Backend: Asset storage and processing API
- Team C Integration: Build pipeline and deployment automation
- Playwright MCP: Automated screenshot generation across breakpoints

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
// 1. LOAD UI STYLE GUIDE
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "sharp image-processing resize latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next build-optimization assets latest documentation"});
await mcp__Ref__ref_search_documentation({query: "playwright screenshot automation latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("ImageProcessing", "", true);
await mcp__serena__get_symbols_overview("/src/components/admin");
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

### Round 1 (Core Asset Generation):
- [ ] AppStoreAssetGenerator component with platform selection
- [ ] ScreenshotAutomation tool using Playwright MCP integration
- [ ] IconGenerator for all required resolutions and formats
- [ ] MetadataOptimizer with character limits and keyword analysis
- [ ] AssetValidator to check platform compliance
- [ ] BatchProcessor for generating multiple platform assets
- [ ] ProgressTracker with real-time generation status

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
- FROM Team B: Asset storage API endpoints - Required for saving generated assets
- FROM Team C: Build pipeline integration specs - Dependency for automation

### What other teams NEED from you:
- TO Team B: Asset specifications and upload requirements
- TO Team C: Generated assets for build integration testing

---

## 🎭 PLAYWRIGHT AUTOMATION TESTING (MANDATORY)

```javascript
// APP STORE ASSET GENERATION TESTING

// 1. AUTOMATED SCREENSHOT GENERATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
// Generate iPhone screenshots
await mcp__playwright__browser_resize({width: 1290, height: 2796});
await mcp__playwright__browser_take_screenshot({filename: 'iphone-dashboard.png'});

// 2. MULTIPLE PLATFORM FORMATS
const platforms = [
  {name: 'iPhone', width: 1290, height: 2796},
  {name: 'iPad', width: 2048, height: 2732},
  {name: 'Android', width: 1080, height: 1920}
];

for (const platform of platforms) {
  await mcp__playwright__browser_resize(platform);
  await mcp__playwright__browser_take_screenshot({
    filename: `${platform.name.toLowerCase()}-screenshot.png`
  });
}
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Asset generator creates all required screenshot sizes automatically
- [ ] Icon generator produces all resolutions from 16x16 to 1024x1024
- [ ] Metadata optimizer validates character limits for all platforms
- [ ] Batch processing completes full asset generation in under 5 minutes
- [ ] Asset validation ensures 100% platform compliance

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Main: `/wedsync/src/components/admin/AppStoreAssetGenerator.tsx`
- Screenshots: `/wedsync/src/lib/app-store/screenshot-automation.ts`
- Icons: `/wedsync/src/lib/app-store/icon-generation.ts`
- Tests: `/wedsync/src/__tests__/app-store-assets.test.tsx`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY