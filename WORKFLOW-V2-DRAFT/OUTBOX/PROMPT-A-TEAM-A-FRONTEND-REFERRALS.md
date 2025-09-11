# TEAM A - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Frontend/UI Development Focus

**YOUR MISSION:** Build the complete frontend referral center with gamification elements, viral sharing tools, and interactive leaderboards
**FEATURE ID:** WS-344 (Track all work with this ID)  
**TIME LIMIT:** 32 hours for comprehensive referral UI system
**THINK ULTRA HARD** about creating viral sharing mechanics that motivate wedding suppliers to actively refer competitors

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/ReferralCenter.tsx | head -20
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/\(dashboard\)/referrals/
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test referrals
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing navigation and dashboard patterns
await mcp__serena__search_for_pattern("dashboard.*navigation|sidebar.*nav");
await mcp__serena__find_symbol("DashboardLayout", "", true);
await mcp__serena__get_symbols_overview("src/components/layout/sidebar-nav.tsx");
await mcp__serena__get_symbols_overview("src/app/(dashboard)/page.tsx");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
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
await mcp__Ref__ref_search_documentation("React viral referral system UI patterns gamification leaderboard components");
await mcp__Ref__ref_search_documentation("QR code display components React social sharing widgets");
await mcp__Ref__ref_search_documentation("Next.js dashboard navigation integration patterns");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR REFERRAL UX PLANNING

### Use Sequential Thinking MCP for Viral Mechanics Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "For a successful referral system UI in the wedding industry, I need to analyze what motivates wedding photographers to refer competitors. Key insights: 1) Financial incentives (free months), 2) Social status (leaderboards), 3) Community building, 4) Simple sharing mechanics. The UI must make sharing feel beneficial rather than threatening to their business.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "The referral center needs three core sections: 1) Personal Dashboard (my stats, earnings, progress), 2) Sharing Tools (link generation, QR codes, social widgets), 3) Community Leaderboards (rankings by category/geography). Each section should use gamification psychology - progress bars, achievement badges, and social proof to drive engagement.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Critical UX consideration: Wedding suppliers are busy during peak season (May-Oct). The referral tools must work perfectly on mobile since they'll share links at wedding venues, networking events, and on-the-go. Priority: Large touch targets, one-tap sharing, QR codes that work in poor lighting conditions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Gamification elements need wedding industry context: Badges like 'Wedding Network Builder', 'Community Champion', 'Regional Leader'. Leaderboard categories should match wedding vendor types (Photography, DJ, Florist, Venue, etc.). This creates healthy competition within specializations rather than across them.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Final UI architecture: ReferralCenter as main dashboard, ReferralStats for metrics, LeaderboardView for rankings, ShareWidget for viral tools, RewardTracker for gamification. Each component must load <200ms and work offline for venue sharing. Real-time updates via Supabase realtime subscriptions.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down referral UI components and track dependencies
2. **react-ui-specialist** - Use Serena for component consistency with existing dashboard
3. **ui-ux-designer** - Ensure gamification elements follow wedding industry psychology
4. **security-compliance-officer** - Validate referral link security and user data handling
5. **test-automation-architect** - Comprehensive testing for sharing flows
6. **documentation-chronicler** - Evidence-based documentation with screenshots

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FRONTEND SECURITY CHECKLIST:
- [ ] **Input validation** - Zod schemas for all user inputs (custom messages, contact data)
- [ ] **XSS prevention** - Sanitize all referral codes and user-generated content
- [ ] **CSRF protection** - Automatic with Next.js App Router for form submissions  
- [ ] **Secure referral codes** - Never expose internal IDs or sensitive data in URLs
- [ ] **Rate limiting UI** - Disable rapid-fire referral creation to prevent abuse
- [ ] **Data sanitization** - Clean all sharing text before displaying in UI
- [ ] **Session validation** - Verify user authentication before showing referral tools
- [ ] **Privacy compliance** - Clear consent for contact data collection in referral flow

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All referral pages and components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] **Desktop navigation link** added to main supplier dashboard sidebar
- [ ] **Mobile navigation drawer** includes referral section with proper spacing
- [ ] **Navigation states** (active/current) implemented for /referrals routes
- [ ] **Breadcrumbs updated** to show "Dashboard > Referrals > [Section]"
- [ ] **Accessibility labels** for all referral navigation items (aria-label)
- [ ] **Sub-navigation** for referral sections (Stats, Leaderboard, Share)
- [ ] **Navigation icons** using Lucide React (only library allowed)
- [ ] **Mobile menu close** after referral navigation selection

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**PRIMARY RESPONSIBILITIES:**
- React components with TypeScript (strict mode, no 'any' types)
- Responsive UI design (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components integration
- Form validation with React Hook Form + Zod
- Accessibility compliance (WCAG 2.1 Level AA)
- Component performance optimization (<200ms render time)
- Real-time UI updates via Supabase subscriptions
- Mobile-first gamification elements

## 📋 REAL WEDDING SCENARIO (MANDATORY CONTEXT)

**Wedding Supplier Story:**
"Sarah runs 'Sarah's Wedding Photography' and uses WedSync Professional tier (£49/month). She knows 15+ wedding vendors in her area who still coordinate weddings via Excel/email. At a recent wedding expo, she met DJ Mike who was struggling with client coordination. Sarah opens her WedSync app, generates a referral link with custom message 'Hey Mike, this will save you 10+ hours per wedding!', shows him the QR code, and he signs up on the spot. When Mike converts to paid after his trial, Sarah earns a free month, saves £49, and climbs the regional photography leaderboard."

**Key UX Requirements from This Scenario:**
- Generate referral links in <5 seconds at networking events
- QR codes must display clearly on phone screens in varying lighting
- Custom messaging to personalize referrals for different vendor types
- Mobile-optimized sharing for on-the-go use at wedding venues
- Real-time progress tracking to see when referrals convert
- Gamified leaderboards that create friendly competition by category

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### COMPONENT 1: ReferralCenter Dashboard (12 hours)
```typescript
// /src/components/referrals/ReferralCenter.tsx
interface ReferralCenterProps {
  supplierId: string;
  currentTier: 'starter' | 'professional' | 'scale' | 'enterprise';
  currentStats: ReferralStats;
}

// Key features:
// - Personal referral statistics with progress animations
// - Quick referral link generation with one-click copy
// - QR code display with downloadable format
// - Recent referral activity feed with real-time updates
// - Earned rewards display with tier-specific benefits
// - Achievement badges with wedding-themed designs
```

### COMPONENT 2: LeaderboardView (10 hours)
```typescript
// /src/components/referrals/LeaderboardView.tsx
interface LeaderboardViewProps {
  currentSupplier: {
    id: string;
    category: 'photography' | 'dj' | 'florist' | 'venue' | 'catering' | 'other';
    location: string;
    businessName: string;
  };
  initialFilter?: 'industry' | 'geographic' | 'temporal';
}

// Key features:
// - Multi-dimensional ranking display (category, geographic, overall)
// - Interactive filtering with smooth transitions
// - User rank highlighting with surrounding context
// - Rising stars section for trending suppliers
// - Time period selection (all-time, year, quarter, month)
// - Achievement celebration animations
```

### COMPONENT 3: ShareWidget Viral Tools (6 hours)
```typescript
// /src/components/referrals/ShareWidget.tsx
interface ShareWidgetProps {
  referralCode: string;
  customLink: string;
  qrCodeUrl?: string;
  onShare: (platform: string) => void;
}

// Key features:
// - One-tap social sharing (LinkedIn, Facebook, WhatsApp, Email)
// - Custom message composer with wedding industry templates
// - QR code display with zoom and download options
// - Copy link with success feedback animation
// - Share analytics tracking for optimization
```

### COMPONENT 4: ReferralStats Metrics (4 hours)  
```typescript
// /src/components/referrals/ReferralStats.tsx
interface ReferralStatsProps {
  stats: ReferralStatsData;
  onRefresh: () => void;
  isLoading?: boolean;
}

// Key features:
// - Conversion funnel visualization with wedding-themed graphics
// - Real-time progress bars for active referrals
// - Earnings calculator showing monetary value of referrals
// - Milestone progress tracking with celebration animations
// - Historical performance charts with trend analysis
```

## 📱 MOBILE-FIRST REQUIREMENTS (60% of users on mobile)

### MOBILE UX SPECIFICATIONS:
- **Minimum viewport:** 375px (iPhone SE) with perfect functionality
- **Touch targets:** Minimum 48x48px for all interactive elements
- **Bottom navigation:** Thumb-reach optimized for referral actions
- **QR code display:** Large enough to scan in varying lighting conditions
- **Share buttons:** One-tap social sharing without leaving the app
- **Form inputs:** Auto-zoom prevention and mobile keyboard optimization
- **Loading states:** Skeleton screens for <3G network conditions
- **Offline capability:** Cache referral codes for venue sharing without signal

### RESPONSIVE BREAKPOINTS:
```css
/* Mobile First - Default */
.referral-container {
  /* 375px - 767px */
}

@media (min-width: 768px) {
  /* Tablet Layout */
  .referral-container {
    /* 768px - 1023px */
  }
}

@media (min-width: 1024px) {
  /* Desktop Layout */
  .referral-container {
    /* 1024px+ */
  }
}
```

## 🎨 UI COMPONENT SPECIFICATIONS

### REQUIRED UNTITLED UI COMPONENTS:
```typescript
// Use ONLY these approved component patterns:

// Cards & Containers
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

// Navigation & Layout  
import { Button, ButtonGroup } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Forms & Inputs
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';

// Data Display
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Feedback & Overlays
import { Toast, ToastProvider } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

### MAGIC UI ANIMATIONS (Required for Gamification):
```typescript
// Achievement and progress animations
import { NumberTicker } from '@/components/magicui/number-ticker';
import { AnimatedProgress } from '@/components/magicui/animated-progress';  
import { ConfettiButton } from '@/components/magicui/confetti-button';
import { GradientText } from '@/components/magicui/gradient-text';
import { PulsatingButton } from '@/components/magicui/pulsating-button';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
```

## 🔗 API INTEGRATION REQUIREMENTS

### FRONTEND API CALLS:
```typescript
// Required API endpoints to integrate:

// POST /api/referrals/create-link
const createReferralLink = async (customMessage?: string) => {
  const response = await fetch('/api/referrals/create-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customMessage, source: 'dashboard' })
  });
  return response.json();
};

// GET /api/referrals/stats  
const getReferralStats = async () => {
  const response = await fetch('/api/referrals/stats');
  return response.json();
};

// GET /api/referrals/leaderboard
const getLeaderboard = async (filters: LeaderboardFilters) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/referrals/leaderboard?${params}`);
  return response.json();
};

// POST /api/referrals/track-share (for analytics)
const trackShare = async (platform: string, referralCode: string) => {
  await fetch('/api/referrals/track-share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, referralCode, timestamp: Date.now() })
  });
};
```

### REAL-TIME SUBSCRIPTIONS:
```typescript
// Supabase realtime for live referral updates
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Subscribe to referral updates
const subscribeToReferralUpdates = (supplierId: string, onUpdate: Function) => {
  return supabase
    .channel('referral-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'supplier_referrals',
      filter: `referrer_id=eq.${supplierId}`
    }, onUpdate)
    .subscribe();
};
```

## 🧪 TESTING REQUIREMENTS

### UNIT TESTS (Jest + Testing Library):
```typescript
// /src/components/referrals/__tests__/ReferralCenter.test.tsx
describe('ReferralCenter Component', () => {
  it('should display current referral statistics', () => {
    // Test stats rendering
  });
  
  it('should generate referral link on button click', async () => {
    // Test link generation flow
  });
  
  it('should copy referral link to clipboard', async () => {
    // Test clipboard functionality
  });
  
  it('should display QR code when available', () => {
    // Test QR code rendering
  });
  
  it('should handle loading and error states', () => {
    // Test loading states
  });
});
```

### INTERACTIVE TESTING WITH BROWSER MCP:
```typescript
// Use Browser MCP during development for immediate feedback

// 1. Test referral dashboard rendering
await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals'});
await mcp__playwright__browser_snapshot();
await mcp__playwright__browser_take_screenshot({filename: 'referral-center-desktop.png'});

// 2. Test referral link creation flow  
await mcp__playwright__browser_click({
  element: 'Create Referral Link button',
  ref: '[data-testid="create-referral-link"]'
});
await mcp__playwright__browser_wait_for({text: 'wedsync.com/join/'});
await mcp__playwright__browser_take_screenshot({filename: 'referral-link-generated.png'});

// 3. Test QR code display and sharing
await mcp__playwright__browser_click({
  element: 'Show QR Code button', 
  ref: '[data-testid="show-qr-code"]'
});
await mcp__playwright__browser_take_screenshot({filename: 'qr-code-display.png'});

// 4. Test leaderboard interactions
await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals/leaderboard'});
await mcp__playwright__browser_select_option({
  element: 'Category filter',
  ref: '[data-testid="category-filter"]',
  values: ['photography']
});
await mcp__playwright__browser_take_screenshot({filename: 'leaderboard-filtered.png'});

// 5. Test mobile responsiveness
await mcp__playwright__browser_resize(375, 667); // iPhone SE viewport
await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals'});
await mcp__playwright__browser_take_screenshot({filename: 'referral-center-mobile.png'});

// 6. Test sharing widget functionality
await mcp__playwright__browser_click({
  element: 'WhatsApp Share button',
  ref: '[data-testid="whatsapp-share"]'
});
// Verify WhatsApp link generation

// 7. Monitor API calls during usage
const networkRequests = await mcp__playwright__browser_network_requests();
console.log('Referral API calls:', networkRequests.filter(r => r.url.includes('/api/referrals')));
```

## 💾 WHERE TO SAVE YOUR WORK

**Component Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/
├── ReferralCenter.tsx (Main dashboard component)
├── LeaderboardView.tsx (Rankings and leaderboards) 
├── ShareWidget.tsx (Viral sharing tools)
├── ReferralStats.tsx (Statistics display)
├── RewardTracker.tsx (Achievement tracking)
└── __tests__/ (Component tests)
```

**Page Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/(dashboard)/referrals/
├── page.tsx (Main referral center page)
├── leaderboard/page.tsx (Leaderboard page)
├── stats/page.tsx (Detailed statistics page)
└── layout.tsx (Referral section layout)
```

**Type Definitions:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/
└── referrals.ts (TypeScript interfaces)
```

**Test Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/__tests__/
├── ReferralCenter.test.tsx
├── LeaderboardView.test.tsx  
├── ShareWidget.test.tsx
└── integration/referral-flow.test.tsx
```

**Navigation Integration Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/layout/
├── sidebar-nav.tsx (Add referral navigation link)
└── mobile-nav.tsx (Add mobile referral menu)
```

## 🏁 COMPLETION CHECKLIST

**COMPONENT DEVELOPMENT:**
- [ ] **ReferralCenter.tsx** - Main dashboard with stats, link generation, QR codes
- [ ] **LeaderboardView.tsx** - Interactive rankings with filtering and animations
- [ ] **ShareWidget.tsx** - Social sharing tools with one-tap functionality  
- [ ] **ReferralStats.tsx** - Conversion funnel and progress visualization
- [ ] **RewardTracker.tsx** - Achievement badges and milestone progress

**PAGE INTEGRATION:**
- [ ] **Main referral page** - /dashboard/referrals route with full functionality
- [ ] **Leaderboard page** - /dashboard/referrals/leaderboard with filtering
- [ ] **Statistics page** - /dashboard/referrals/stats with detailed analytics
- [ ] **Navigation integration** - Sidebar and mobile menu links added

**TECHNICAL REQUIREMENTS:**
- [ ] **TypeScript strict mode** - No 'any' types, full type safety
- [ ] **Responsive design** - Perfect functionality on 375px to 1920px
- [ ] **Accessibility compliance** - WCAG 2.1 Level AA standards met
- [ ] **Performance optimization** - <200ms component render times
- [ ] **Real-time updates** - Supabase subscriptions for live data
- [ ] **Mobile optimization** - Touch-friendly interface with offline capability

**TESTING COVERAGE:**
- [ ] **Unit tests written** - >90% component coverage with Jest
- [ ] **Integration tests** - Full referral flow testing with Browser MCP
- [ ] **Mobile testing** - All breakpoints verified with screenshots
- [ ] **Accessibility testing** - Screen reader and keyboard navigation
- [ ] **Performance testing** - Component render time benchmarks

**SECURITY & COMPLIANCE:**
- [ ] **Input validation** - Zod schemas for all user inputs
- [ ] **XSS prevention** - All dynamic content properly sanitized  
- [ ] **Rate limiting UI** - Prevent referral creation abuse
- [ ] **Privacy compliance** - Clear consent flows for data collection

**EVIDENCE PACKAGE:**
- [ ] **File existence proof** - ls commands showing all created files
- [ ] **TypeScript compilation** - npm run typecheck passing
- [ ] **Test results** - All component tests passing
- [ ] **Screenshots** - Browser MCP captures of all UI states
- [ ] **Performance metrics** - Component render time measurements

**DEPLOYMENT READINESS:**
- [ ] **Production build** - No build errors or warnings
- [ ] **Navigation integration** - All referral routes properly integrated
- [ ] **Mobile responsiveness** - Perfect function on all device sizes  
- [ ] **API integration** - All backend endpoints properly connected
- [ ] **Real-time functionality** - Supabase subscriptions working correctly

---

**EXECUTE IMMEDIATELY - This comprehensive prompt contains all frontend requirements for the viral referral system. Focus on creating an engaging, gamified user experience that motivates wedding suppliers to actively share WedSync with their professional networks.**

**WEDDING CONTEXT REMINDER:** Every UI element should reflect that this is for wedding professionals who coordinate sacred events. The referral system helps them build a stronger vendor community while reducing their software costs through successful referrals.