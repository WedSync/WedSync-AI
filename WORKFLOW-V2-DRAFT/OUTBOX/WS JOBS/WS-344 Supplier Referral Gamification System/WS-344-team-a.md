# TEAM A - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive React components for the supplier referral dashboard with leaderboards, QR code sharing, and real-time stats tracking
**FEATURE ID:** WS-344 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating a viral referral experience that motivates wedding suppliers to refer competitors

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/referrals/
cat $WS_ROOT/wedsync/src/components/referrals/ReferralCenter.tsx | head -20
cat $WS_ROOT/wedsync/src/app/(dashboard)/referrals/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test referrals
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to referral system
await mcp__serena__search_for_pattern("dashboard.*components");
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("src/app/(dashboard)");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to referral systems
ref_search_documentation("viral referral systems React components best practices");
ref_search_documentation("leaderboard UI design patterns React TypeScript");
ref_search_documentation("QR code generation React components");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This referral system needs to balance gamification psychology with B2B professionalism. Wedding suppliers compete but also collaborate. I need to analyze: 1) What motivates B2B referrals vs B2C, 2) How to make leaderboards encouraging not discouraging, 3) How to design for mobile-first sharing, 4) Integration with existing dashboard navigation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down UI components, track dependencies
2. **react-ui-specialist** - Use Serena for component consistency  
3. **security-compliance-officer** - Ensure secure referral tracking
4. **code-quality-guardian** - Maintain component standards
5. **test-automation-architect** - Comprehensive component testing
6. **documentation-chronicler** - Evidence-based component documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COMPONENT SECURITY CHECKLIST:
- [ ] **Form validation** - Client-side Zod validation before API calls
- [ ] **XSS prevention** - Sanitize all user inputs (referral messages, names)
- [ ] **URL validation** - Validate referral links and QR codes
- [ ] **Rate limiting UI** - Prevent rapid-fire referral link generation
- [ ] **Error handling** - Never expose sensitive API details to users
- [ ] **Data sanitization** - Clean all displayed data (supplier names, stats)

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: Referral dashboard must integrate into supplier navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to main supplier dashboard
- [ ] Mobile navigation drawer includes referral section
- [ ] Navigation states (active/current) implemented for referral pages
- [ ] Breadcrumbs show "Dashboard > Referrals > [Section]"
- [ ] Accessibility labels for all referral navigation items

```typescript
// MUST update main dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
{
  title: "Referrals",
  href: "/dashboard/referrals", 
  icon: Users
}
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**YOUR SPECIFIC DELIVERABLES:**

### 1. ReferralCenter Component (Main Dashboard)
```typescript
// Location: /src/components/referrals/ReferralCenter.tsx
interface ReferralCenterProps {
  supplierId: string;
  currentTier: string;
  stats: ReferralStatsData;
}

// Key functionality:
// - Display referral statistics pipeline (5 stages)
// - Generate and share referral links
// - Show QR codes for offline sharing
// - Track referral progress in real-time
// - Display earned rewards and milestones
// - Personal referral tools section
```

### 2. LeaderboardView Component
```typescript  
// Location: /src/components/referrals/LeaderboardView.tsx
interface LeaderboardViewProps {
  currentSupplier: {
    id: string;
    category: string;
    location: string;
  };
  filters: LeaderboardFilters;
}

// Key functionality:
// - Multi-dimensional leaderboard displays
// - Category filtering (photography, venues, etc.)
// - Geographic filtering (region, city)
// - Time period selection (month, quarter, year)
// - User rank highlighting
// - Rising stars and trend indicators
```

### 3. ReferralStats Component
```typescript
// Location: /src/components/referrals/ReferralStats.tsx
interface ReferralStatsProps {
  stats: ReferralStatsData;
  onRefresh: () => void;
  rankingData: RankingData;
}

// Key functionality:
// - Real-time statistics display
// - Conversion funnel visualization
// - Achievement badges display  
// - Milestone progress tracking
// - Current rankings across categories
```

### 4. Main Referrals Page
```typescript
// Location: /src/app/(dashboard)/referrals/page.tsx
// Integration point that combines all components
// Responsive layout for desktop/mobile
// Data fetching and state management
// Navigation integration
```

### 5. QRCodeGenerator Component
```typescript
// Location: /src/components/referrals/QRCodeGenerator.tsx
// Generate QR codes for offline sharing
// Download functionality
// Custom styling for wedding industry
```

## 📋 TECHNICAL SPECIFICATION

**User Story**: As Sarah, a wedding photographer, I want a beautiful and intuitive referral dashboard where I can see my referral stats, generate links to share with other wedding suppliers, track my leaderboard rankings, and earn free months when my referrals convert to paid subscriptions.

**Wedding Context**: Wedding suppliers work in tight-knit local networks. They compete but also collaborate (photographer refers florist, venue refers caterer). The UI needs to feel professional yet gamified - encouraging healthy competition while building community.

### React Component Architecture
```typescript
// Component hierarchy:
ReferralPage
├── ReferralCenter (main dashboard)
│   ├── ReferralStats (pipeline & metrics)
│   ├── ReferralTools (links, QR codes)
│   └── RecentActivity (referral status list)
├── LeaderboardView (rankings)
│   ├── LeaderboardFilters (category/location/time)
│   ├── LeaderboardList (ranked suppliers)
│   └── UserRankHighlight (current user position)
└── MilestoneProgress (rewards & achievements)
```

### State Management
```typescript
// Use Zustand for referral state
interface ReferralStore {
  stats: ReferralStatsData;
  leaderboards: LeaderboardData;
  userRankings: UserRankings;
  referralLinks: ReferralLinks[];
  milestones: Milestone[];
  refreshStats: () => Promise<void>;
  generateLink: () => Promise<string>;
  trackConversion: (code: string) => Promise<void>;
}
```

### API Integration
```typescript
// Client-side API calls to:
// GET /api/referrals/stats - User's referral statistics
// POST /api/referrals/create-link - Generate new referral link
// GET /api/referrals/leaderboard - Leaderboard data with filters
// GET /api/referrals/milestones - Achievement progress
```

### Responsive Design Requirements
```css
/* Mobile-first approach */
/* Phone (375px+): Single column, simplified stats */
/* Tablet (768px+): Two columns, full stats */
/* Desktop (1280px+): Three columns, detailed leaderboards */
```

### Accessibility Requirements
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] **ReferralCenter component** - Main dashboard with stats pipeline
- [ ] **LeaderboardView component** - Multi-dimensional rankings
- [ ] **ReferralStats component** - Real-time metrics display
- [ ] **QRCodeGenerator component** - QR code generation and download
- [ ] **Main referrals page** - Route integration and layout
- [ ] **Navigation integration** - Dashboard menu and mobile support
- [ ] **Responsive design** - Mobile-first with 375px+ support
- [ ] **Component tests** - Jest/RTL tests for all components
- [ ] **TypeScript types** - Complete interface definitions

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/referrals/
- Pages: $WS_ROOT/wedsync/src/app/(dashboard)/referrals/
- Types: $WS_ROOT/wedsync/src/types/referrals.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/referrals/
- Styles: Using Tailwind classes (no separate CSS files)

## 🏁 COMPLETION CHECKLIST
- [ ] **Files created and verified** - All component files exist
- [ ] **TypeScript compilation** - No errors with npm run typecheck
- [ ] **Component tests** - All tests passing with coverage >90%
- [ ] **Navigation integration** - Properly connected to dashboard
- [ ] **Mobile responsive** - Works on 375px viewport
- [ ] **Accessibility compliance** - ARIA labels and keyboard navigation
- [ ] **Security validation** - Input sanitization implemented
- [ ] **Evidence package** - Screenshots and file listings
- [ ] **Senior dev review prompt** - Detailed completion report

## 🎨 DESIGN SPECIFICATIONS

### Color Scheme
```css
/* Primary referral colors */
--referral-primary: #10B981; /* Success green for conversions */
--referral-secondary: #8B5CF6; /* Purple for achievements */
--referral-accent: #F59E0B; /* Gold for leaderboard highlights */
--referral-neutral: #6B7280; /* Gray for pending states */
```

### Component Styling Patterns
```typescript
// Use consistent Untitled UI patterns:
// - Cards with subtle shadows and rounded corners
// - Button variants: primary, secondary, outline
// - Stats display with icons and trend indicators
// - Progress bars for milestone tracking
// - Badge components for achievements
```

### Animation Guidelines
```typescript
// Use Magic UI for:
// - Smooth stat counter animations
// - Progress bar filling animations  
// - Hover effects on leaderboard items
// - Slide transitions for different views
// - Loading states with skeleton components
```

## 🔧 IMPLEMENTATION NOTES

### QR Code Generation
- Use `qrcode` library for generation
- Implement download as PNG/SVG
- Add custom wedding-themed styling
- Error correction level: M (15% recovery)

### Real-time Updates
- Use React Query for data fetching
- 30-second refresh intervals for stats
- Optimistic updates for user actions
- Loading states for all async operations

### Error Handling
- Graceful degradation for API failures
- Retry mechanisms for failed requests
- User-friendly error messages
- Offline mode indicators

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for Team A Frontend work on the WS-344 Supplier Referral & Gamification System!**