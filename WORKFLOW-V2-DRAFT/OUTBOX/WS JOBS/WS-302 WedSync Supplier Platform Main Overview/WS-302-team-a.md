# TEAM A - ROUND 1: WS-302 - WedSync Supplier Platform Main Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Create the comprehensive WedSync Supplier Platform main dashboard and navigation system with mobile-first design and wedding vendor workflows
**FEATURE ID:** WS-302 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding vendor workflows and mobile optimization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/supplier-platform
cat $WS_ROOT/wedsync/src/components/supplier-platform/SupplierPlatformLayout.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test supplier-platform
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

// Query specific areas relevant to supplier platform UI
await mcp__serena__search_for_pattern("dashboard layout navigation sidebar");
await mcp__serena__find_symbol("DashboardLayout SupplierDashboard", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/layouts");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI for Supplier Platform
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Load existing dashboard patterns to maintain consistency
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/(dashboard)/");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries
- These are explicitly forbidden - use ONLY Untitled UI + Magic UI

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to supplier platform features
# Use Ref MCP to search for:
# - "Next.js dashboard layout responsive design"
# - "React Navigation sidebar mobile"
# - "Tailwind CSS navigation patterns dashboard"
# - "Wedding vendor management UI patterns"
# - "Untitled UI dashboard components"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing dashboard/layout patterns
await mcp__serena__find_referencing_symbols("DashboardLayout Sidebar Navigation");
await mcp__serena__search_for_pattern("layout.tsx dashboard sidebar");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Frontend-Specific Sequential Thinking Patterns

#### Pattern 1: Complex UI Architecture Analysis
```typescript
// Before building complex supplier platform UI components
mcp__sequential-thinking__sequential_thinking({
  thought: "WedSync Supplier Platform main dashboard needs: responsive navigation sidebar with sections for clients/bookings/forms/communications, main dashboard with KPI widgets, quick actions for wedding vendors, mobile-first design for photographers/florists using phones on-site, and role-based menu visibility.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management analysis: Navigation state needs persistence (user preferences), KPI widgets require real-time data, quick actions need optimistic UI updates, mobile navigation drawer for small screens, role-based visibility requires permission context throughout component tree.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: SupplierPlatformLayout (main wrapper), NavigationSidebar (desktop/mobile responsive), DashboardHeader (user context, notifications), KPIWidgets (metrics overview), QuickActions (context-aware buttons). Each needs proper TypeScript interfaces and error boundaries for wedding vendor workflows.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding vendor UX considerations: Photographers access this on mobile between shoots, venue coordinators need desktop for multi-tasking, florists use tablets for client consultations. Need touch-friendly interactions, offline capability for key features, fast loading on mobile networks, and clear visual hierarchy for busy wedding professionals.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down supplier platform UI work, track progress, identify blockers
   - **Sequential Thinking Usage**: Complex component breakdown, dependency analysis, mobile-first considerations

2. **react-ui-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Use Serena to find existing patterns, ensure consistency with Untitled UI components
   - **Sequential Thinking Usage**: Architecture decisions, component design patterns, responsive strategies

3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Ensure navigation and dashboard components follow security patterns
   - **Sequential Thinking Usage**: Role-based access analysis, data exposure prevention

4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure code matches existing dashboard patterns found by Serena
   - **Sequential Thinking Usage**: Code review decisions, component architecture, mobile optimization

5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write tests BEFORE code, verify responsive behavior with Playwright
   - **Sequential Thinking Usage**: Test strategy planning, responsive test cases, accessibility testing

6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document supplier platform components with actual code snippets and mobile screenshots
   - **Sequential Thinking Usage**: Documentation strategy, user journey mapping, mobile usage scenarios

**AGENT COORDINATION:** Agents work in parallel but share Serena insights AND Sequential Thinking analysis results

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
Use Serena to understand existing dashboard and layout patterns BEFORE writing any code:
```typescript
// Find all related dashboard components and their relationships
await mcp__serena__find_symbol("DashboardLayout NavigationSidebar", "", true);
// Understand existing navigation patterns
await mcp__serena__search_for_pattern("sidebar navigation responsive mobile");
// Analyze integration points with authentication and permissions
await mcp__serena__find_referencing_symbols("useSession getSession auth");
```
- [ ] Identified existing dashboard patterns to follow
- [ ] Found all navigation integration points
- [ ] Understood role-based access requirements
- [ ] Located responsive design implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed plan:
- [ ] Architecture decisions based on existing dashboard patterns
- [ ] Test cases written FIRST (TDD) for responsive behavior
- [ ] Security measures for role-based navigation
- [ ] Performance considerations for mobile users

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use dashboard patterns discovered by Serena
- [ ] Maintain consistency with existing layouts
- [ ] Include code examples in comments
- [ ] Test continuously during development

## 📋 TECHNICAL SPECIFICATION

Based on `/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-302-wedsync-supplier-platform-main-overview-technical.md`:

### Core Requirements:
- **Comprehensive Navigation**: Dashboard overview, client management, forms, communications, journey builder
- **Mobile-First Design**: 60% of wedding vendors use mobile devices
- **Role-Based Access**: Different features for different subscription tiers
- **Performance Optimization**: <2s load time on mobile networks
- **Wedding Vendor Workflows**: Quick access to today's weddings, client communications, urgent tasks

### Key Components to Build:
1. **SupplierPlatformLayout**: Main wrapper with responsive navigation
2. **NavigationSidebar**: Collapsible sidebar with role-based menu items
3. **DashboardHeader**: User context, notifications, search
4. **KPIWidgets**: Revenue, bookings, client satisfaction metrics
5. **QuickActions**: Context-aware action buttons for wedding vendors

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **SupplierPlatformLayout Component** (`$WS_ROOT/wedsync/src/components/supplier-platform/SupplierPlatformLayout.tsx`)
  - Responsive layout with mobile-first approach
  - Integration with existing authentication system
  - Role-based navigation visibility
  - Evidence: Screenshots at 375px, 768px, 1920px breakpoints

- [ ] **NavigationSidebar Component** (`$WS_ROOT/wedsync/src/components/supplier-platform/NavigationSidebar.tsx`)
  - Collapsible sidebar for desktop
  - Mobile drawer navigation
  - Wedding vendor specific menu items
  - Evidence: Mobile navigation interaction video

- [ ] **DashboardHeader Component** (`$WS_ROOT/wedsync/src/components/supplier-platform/DashboardHeader.tsx`)
  - User profile context
  - Notification bell with unread count
  - Global search functionality
  - Evidence: Component renders correctly with user data

- [ ] **Navigation Integration** 
  - Update main app layout to use SupplierPlatformLayout
  - Integrate with existing route structure
  - Mobile navigation state persistence
  - Evidence: Navigation works across all dashboard pages

- [ ] **Responsive Testing**
  - Test at all breakpoints (375px, 768px, 1920px)
  - Touch-friendly interactions for mobile
  - Accessibility compliance (screen readers)
  - Evidence: Playwright test results showing responsive behavior

## 🔗 DEPENDENCIES

### What you need from other teams:
- **Team B**: API endpoints for navigation data, user preferences
- **Team C**: Integration points for real-time notifications
- **Team D**: Mobile platform requirements and PWA considerations

### What others need from you:
- **Team B**: Component interfaces for data requirements
- **Team C**: Navigation event hooks for real-time updates
- **Team E**: Component documentation and testing interfaces

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COMPONENT SECURITY CHECKLIST:
- [ ] **Role-based rendering** - Hide features based on subscription tier
- [ ] **Authentication integration** - Verify user session in layout
- [ ] **Data sanitization** - Escape all user-provided display data
- [ ] **Navigation state security** - Don't expose unauthorized routes
- [ ] **Error boundaries** - Prevent crashes from exposing sensitive data

### REQUIRED SECURITY PATTERNS:
```typescript
// Role-based navigation visibility
const { user, subscription } = useAuth();
const canAccessFeature = (feature: string) => {
  return subscription.tier_features.includes(feature);
};

// Secure navigation rendering
{canAccessFeature('journey_builder') && (
  <NavigationItem href="/journey-builder" icon={Workflow}>
    Journey Builder
  </NavigationItem>
)}
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary accessibility-first testing requirements:

```javascript
// REVOLUTIONARY TESTING APPROACH - Supplier Platform Focus!

// 1. RESPONSIVE NAVIGATION TESTING (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
const dashboardStructure = await mcp__playwright__browser_snapshot();

// 2. MOBILE NAVIGATION FLOW (WEDDING VENDOR SPECIFIC!)
await mcp__playwright__browser_resize({width: 375, height: 667}); // iPhone SE
await mcp__playwright__browser_click({
  element: "Mobile menu button", 
  ref: "[data-testid='mobile-menu-toggle']"
});
await mcp__playwright__browser_wait_for({text: "Client Management"});
await mcp__playwright__browser_drag({
  startElement: "Navigation drawer", startRef: "[data-testid='nav-drawer']",
  endElement: "Closed position", endRef: "[data-testid='nav-closed']"
});

// 3. ROLE-BASED NAVIGATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test different subscription tiers show different menu items
    const menuItems = Array.from(document.querySelectorAll('[data-testid^="nav-item-"]'));
    return menuItems.map(item => item.textContent);
  }`
});

// 4. PERFORMANCE MEASUREMENT FOR WEDDING VENDORS (Mobile Focus)
const mobileMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    navigationLoadTime: performance.getEntriesByName('navigation')[0]?.duration || 0,
    sidebarRenderTime: performance.getEntriesByName('sidebar')[0]?.duration || 0,
    mobileMenuInteraction: performance.getEntriesByName('mobile-menu')[0]?.duration || 0
  })`
});

// 5. ACCESSIBILITY VALIDATION FOR WEDDING PROFESSIONALS
const accessibilityCheck = await mcp__playwright__browser_snapshot();
// Verify navigation can be operated via keyboard (important for busy vendors)
await mcp__playwright__browser_press_key({key: "Tab"}); // Navigate via keyboard
await mcp__playwright__browser_press_key({key: "Enter"}); // Activate navigation
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All React components complete WITH EVIDENCE (show component tree)
- [ ] Tests written FIRST and passing (show test-first commits)
- [ ] Untitled UI patterns followed (list components used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero accessibility violations (show a11y audit results)

### Code Quality Evidence:
```typescript
// Include actual navigation component showing pattern compliance
// Example from your implementation:
export const NavigationSidebar = ({ isOpen, onClose, userRole }: NavigationSidebarProps) => {
  // Following pattern from existing-dashboard-layout.tsx:45-67
  // Serena confirmed this matches 8 other navigation implementations
  const navigation = useMemo(() => {
    return getNavigationItems(userRole).filter(item => 
      hasPermission(userRole, item.requiredPermission)
    );
  }, [userRole]);

  return (
    <SidebarContainer isOpen={isOpen}>
      {/* Wedding vendor specific navigation items */}
    </SidebarContainer>
  );
}
```

### Integration Evidence:
- [ ] Show how navigation integrates with existing auth system
- [ ] Include Serena analysis of layout integration points  
- [ ] Demonstrate mobile navigation works across all pages
- [ ] Prove role-based visibility functions correctly

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const mobileMetrics = {
  navigationLoad: "0.6s",  // Target: <1s
  sidebarToggle: "120ms", // Target: <150ms
  mobileDrawer: "80ms",   // Target: <100ms
  bundleIncrease: "18kb", // Acceptable: <25kb for navigation
}
```

## 💾 WHERE TO SAVE

### Component Files:
- `$WS_ROOT/wedsync/src/components/supplier-platform/SupplierPlatformLayout.tsx`
- `$WS_ROOT/wedsync/src/components/supplier-platform/NavigationSidebar.tsx`
- `$WS_ROOT/wedsync/src/components/supplier-platform/DashboardHeader.tsx`
- `$WS_ROOT/wedsync/src/components/supplier-platform/KPIWidgets.tsx`
- `$WS_ROOT/wedsync/src/components/supplier-platform/QuickActions.tsx`

### Type Definitions:
- `$WS_ROOT/wedsync/src/types/supplier-platform.ts`

### Test Files:
- `$WS_ROOT/wedsync/tests/supplier-platform/navigation.test.tsx`
- `$WS_ROOT/wedsync/tests/supplier-platform/responsive.test.tsx`

### Integration Files:
- `$WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx` (update to use new layout)

## ⚠️ CRITICAL WARNINGS

### Things that will break the wedding vendor workflow:
- **Slow mobile navigation** - Vendors use phones between client meetings
- **Complex UI on small screens** - Keep interactions simple and touch-friendly
- **Missing offline functionality** - Wedding venues often have poor connectivity
- **Role confusion** - Different vendor types need different features visible
- **Breaking existing navigation** - Must maintain backward compatibility

### Mobile-First Failures to Avoid:
- **Tiny touch targets** - Minimum 44x44px for wedding vendor fingers
- **Complex gestures** - Keep swipes simple, avoid multi-touch
- **Slow loading** - 3G networks at wedding venues are common
- **Missing breadcrumbs** - Vendors need to know where they are in deep navigation

## 🧭 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR ALL UI FEATURES)

### EVERY UI FEATURE MUST INTEGRATE INTO PARENT NAVIGATION

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboard components must connect to SupplierPlatformLayout**

#### NAVIGATION INTEGRATION CHECKLIST

1. **Main Dashboard Integration:**
```typescript
// MUST update main dashboard layout to use SupplierPlatformLayout
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupplierPlatformLayout>
      {children}
    </SupplierPlatformLayout>
  );
}
```

2. **Navigation Menu Items:**
```typescript
// MUST define all navigation items with proper routing
const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    requiredPermission: "dashboard:view"
  },
  {
    title: "Client Management", 
    href: "/dashboard/clients",
    icon: Users,
    requiredPermission: "clients:view"
  },
  {
    title: "Forms",
    href: "/dashboard/forms", 
    icon: FileText,
    requiredPermission: "forms:view"
  }
];
```

3. **Mobile Navigation Support:**
```typescript
// MUST implement mobile drawer navigation
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// Mobile navigation state management
const closeMobileMenu = () => setMobileMenuOpen(false);
const openMobileMenu = () => setMobileMenuOpen(true);
```

4. **Role-Based Menu Visibility:**
```typescript
// MUST show/hide menu items based on user subscription and role
const filteredNavigation = navigationItems.filter(item => 
  hasPermission(user.role, user.subscription.tier, item.requiredPermission)
);
```

#### COMPLETION CRITERIA: NAVIGATION INTEGRATION

**⚠️ FEATURE IS NOT COMPLETE UNTIL NAVIGATION IS INTEGRATED**

- [ ] Desktop navigation sidebar implemented and functional
- [ ] Mobile drawer navigation working smoothly
- [ ] Navigation active states implemented (current page highlighting)  
- [ ] Breadcrumbs updated for deep navigation
- [ ] Accessibility labels for all navigation items
- [ ] Navigation integration tested with Browser MCP across all dashboard pages

**EVIDENCE REQUIRED:**
```typescript
// Show navigation integration code:
// 1. SupplierPlatformLayout implementation
// 2. Mobile navigation state management
// 3. Role-based menu filtering
// 4. Screenshots showing navigation in context on desktop and mobile
// 5. Navigation testing results showing smooth transitions
```

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Component Security Verification:
```bash
# Verify role-based navigation is implemented
grep -r "hasPermission\|canAccess" $WS_ROOT/wedsync/src/components/supplier-platform/
# Should show permission checks in navigation components

# Check for proper authentication integration
grep -r "useAuth\|useSession\|getSession" $WS_ROOT/wedsync/src/components/supplier-platform/
# Should be present in layout and navigation components

# Verify no hardcoded role assumptions
grep -r "admin\|user\|guest" $WS_ROOT/wedsync/src/components/supplier-platform/ | grep -v "permission"
# Should return minimal results (roles should go through permission system)
```

### Final Security Checklist:
- [ ] NO hardcoded role checks (use permission system)
- [ ] ALL navigation items respect user permissions  
- [ ] NO unauthorized routes exposed in navigation
- [ ] Navigation state doesn't leak sensitive information
- [ ] Authentication verified in layout wrapper
- [ ] Error boundaries prevent navigation crashes
- [ ] TypeScript compiles with NO errors
- [ ] Component tests pass including role-based rendering tests

### Final Navigation Integration Checklist:
- [ ] SupplierPlatformLayout integrates with existing app structure
- [ ] Mobile navigation drawer works smoothly on touch devices
- [ ] Desktop sidebar collapses/expands properly
- [ ] Active navigation states highlight current page correctly
- [ ] All dashboard pages render within the new layout
- [ ] Navigation persists user preferences (collapsed/expanded state)
- [ ] Responsive breakpoints work correctly (375px, 768px, 1920px)
- [ ] Accessibility compliance verified with screen reader testing

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**🚨 CRITICAL: You MUST update the project dashboard immediately after completing this feature!**

### STEP 1: Update Feature Status JSON
**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-302 and update:
```json
{
  "id": "WS-302-supplier-platform-main-overview",
  "status": "completed",
  "completion": "100%", 
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team A",
  "notes": "Supplier platform navigation and layout completed. Mobile-first responsive design with role-based navigation."
}
```

### STEP 2: Create Completion Report
**Location**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`
**Filename**: `WS-302-supplier-platform-main-overview-team-a-round1-complete.md`

Use the standard completion report template with supplier platform specific evidence.

---

**WedSync Supplier Platform - Revolutionizing Wedding Vendor Workflows! 🎯📱💼**