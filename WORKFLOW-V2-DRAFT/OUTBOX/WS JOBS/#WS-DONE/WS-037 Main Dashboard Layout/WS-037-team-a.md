# TEAM A - ROUND 1: WS-037 - Main Dashboard Layout
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build comprehensive main dashboard with drag-and-drop widgets, command bar search, and responsive layout optimized for wedding professional workflows
**FEATURE ID:** WS-037 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding professional morning workflow optimization and quick access patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **DASHBOARD FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/(dashboard)/page.tsx
cat $WS_ROOT/wedsync/src/app/(dashboard)/page.tsx | head -20
ls -la $WS_ROOT/wedsync/src/components/dashboard/
cat $WS_ROOT/wedsync/src/components/dashboard/Dashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **DRAG-AND-DROP FUNCTIONALITY:**
```bash
npm test dashboard
# MUST show: "All dashboard widget tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧭 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR DASHBOARD FEATURES)

**❌ FORBIDDEN: Creating isolated dashboard without navigation integration**
**✅ MANDATORY: Dashboard must integrate seamlessly with main layout navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Dashboard as default landing page after login (/dashboard)
- [ ] Quick actions integrated into main navigation shortcuts
- [ ] Breadcrumb navigation: "Dashboard" as home base
- [ ] Mobile navigation optimized for dashboard widgets
- [ ] Command bar (Cmd+K) accessible from anywhere in application
- [ ] Active state highlighting for dashboard navigation items

### NAVIGATION INTEGRATION PATTERN:
```typescript
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CommandBarProvider>
        <DashboardShell>
          {children}
        </DashboardShell>
      </CommandBarProvider>
    </div>
  );
}
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query dashboard-related patterns
await mcp__serena__search_for_pattern("dashboard widget grid layout component");
await mcp__serena__find_symbol("Dashboard QuickActions CommandBar Widget", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for dashboard features
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL DASHBOARD UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)  
- **@dnd-kit**: Drag-and-drop functionality for widgets (MANDATORY)
- **cmdk**: Command palette/bar functionality (MANDATORY)
- **CSS Grid**: Responsive dashboard layout system
- **Lucide React**: Icons ONLY (LayoutDashboard, Search, Command, etc.)

**❌ DO NOT USE:**
- React DnD (use @dnd-kit instead)
- Any other component libraries besides Untitled UI and Magic UI

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to dashboard features
# Use Ref MCP to search for:
# - "@dnd-kit/core drag and drop React components"
# - "cmdk command palette React implementation"
# - "CSS Grid responsive dashboard layouts"
# - "React Query optimistic updates dashboard"
# - "Untitled UI dashboard component patterns"
# - "Next.js app router dashboard routing"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR DASHBOARD UI PLANNING

### Frontend-Specific Sequential Thinking for Main Dashboard

```typescript
// Complex dashboard layout architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Main Dashboard UI needs: responsive CSS Grid layout for widgets, drag-and-drop widget positioning using @dnd-kit, command bar with cmdk for global search, quick actions bar for common tasks, today's focus widget with priority algorithm, real-time activity feed, and performance metrics display. All must work seamlessly on mobile.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding professional morning workflow: Opens dashboard first to see urgent items (weddings this week needing attention, overdue form responses, timeline confirmations), uses quick actions for common tasks (add new client, create form, send message), searches for specific clients/forms via command bar, and monitors key metrics (active clients, completion rates).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Widget architecture complexity: Each widget needs drag state management, position persistence, resize capabilities, real-time data updates, loading states, error boundaries. Grid layout must be responsive (3 columns desktop, 2 tablet, 1 mobile) with smart widget sizing and overflow handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Command bar UX requirements: Cmd+K global shortcut, fuzzy search across clients/forms/actions, keyboard navigation with arrow keys, recent searches memory, contextual suggestions based on current page, instant results <200ms, and smart categorization of search results.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance considerations: Lazy load non-critical widgets, virtual scrolling for activity feed, optimistic updates for widget repositioning, service worker for offline widget state, bundle splitting for dashboard-specific code, and sub-3-second initial load time.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build responsive CSS Grid foundation first, integrate @dnd-kit for drag-drop functionality, create modular widget system with TypeScript interfaces, implement command bar with cmdk, add real-time subscriptions for live data, ensure keyboard accessibility throughout, and optimize mobile experience with touch-friendly controls.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH DASHBOARD FOCUS

Launch these agents with comprehensive dashboard UI requirements:

1. **task-tracker-coordinator** --dashboard-widgets --drag-drop-functionality --responsive-design
   - Mission: Break down dashboard components and track integration dependencies
   
2. **react-ui-specialist** --untitled-ui-components --dnd-kit-integration --command-bar
   - Mission: Use Serena to find UI patterns, build with Untitled UI + @dnd-kit
   
3. **security-compliance-officer** --dashboard-security --command-search-validation --widget-data-protection  
   - Mission: Ensure dashboard search and widget data have proper security
   
4. **code-quality-guardian** --component-consistency --typescript-interfaces --performance-optimization
   - Mission: Maintain consistency with existing UI patterns and optimize performance
   
5. **test-automation-architect** --widget-testing --drag-drop-testing --command-bar-testing
   - Mission: Write comprehensive tests for all dashboard functionality
   
6. **documentation-chronicler** --dashboard-documentation --widget-examples --wedding-workflows
   - Mission: Document dashboard components with real wedding professional use cases

## 🎯 TECHNICAL SPECIFICATION

**Core Requirements from WS-037:**
- Responsive CSS Grid layout with drag-and-drop widget positioning
- Command bar (Cmd+K) with global search functionality
- Quick actions bar with personalized most-used actions
- Today's focus widget with priority algorithm for urgent tasks
- Real-time activity feed with Supabase subscriptions
- Performance metrics display with cached data
- Widget preferences persistence and customization

## 🎨 DASHBOARD UI IMPLEMENTATION REQUIREMENTS

### Core Dashboard Components to Build:

**1. Dashboard.tsx (Main Container)**
```typescript
interface DashboardProps {
  initialData: DashboardData;
  supplierId: string;
}

interface DashboardData {
  quickActions: QuickAction[];
  todaysFocus: FocusItem[];
  recentActivity: ActivityItem[];
  metrics: DashboardMetrics;
  widgets: DashboardWidget[];
}

// Features:
// - CSS Grid responsive layout (3-2-1 columns)
// - Real-time data subscriptions via Supabase
// - Widget state persistence with optimistic updates
// - Keyboard shortcuts and accessibility
```

**2. DashboardGrid.tsx (Drag-Drop Widget Layout)**
```typescript
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

interface DashboardGridProps {
  widgets: DashboardWidget[];
  onWidgetMove: (activeId: string, overId: string) => void;
  onWidgetResize: (widgetId: string, size: WidgetSize) => void;
}

// Features:
// - Drag-and-drop with @dnd-kit
// - Widget resize handles
// - Smooth animations with Magic UI
// - Mobile touch optimization
```

**3. CommandBar.tsx (Global Search)**
```typescript
import { Command } from 'cmdk';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Features:
// - Fuzzy search across all data types
// - Keyboard navigation (up/down arrows, enter)
// - Recent searches and contextual suggestions
// - Quick actions integration
// - <200ms search response time
```

**4. QuickActionsBar.tsx (Personalized Actions)**
```typescript
interface QuickActionsBarProps {
  actions: QuickAction[];
  onActionClick: (actionId: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  usageCount: number;
  category: 'client' | 'form' | 'communication' | 'analysis';
}

// Features:
// - Usage-based personalization
// - Keyboard shortcuts display
// - Responsive button layout
// - Hover states and tooltips
```

**5. TodaysFocusWidget.tsx (Priority Tasks)**
```typescript
interface TodaysFocusWidgetProps {
  items: FocusItem[];
  onItemComplete: (itemId: string) => void;
  onItemSnooze: (itemId: string, until: Date) => void;
}

interface FocusItem {
  id: string;
  type: 'urgent_wedding' | 'overdue_response' | 'timeline_review';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  clientName: string;
  weddingDate?: Date;
}

// Features:
// - Smart priority algorithm
// - Time-sensitive highlighting
// - One-click completion actions
// - Snooze functionality
```

**6. ActivityFeed.tsx (Real-time Updates)**
```typescript
interface ActivityFeedProps {
  activities: ActivityItem[];
  isLive: boolean;
}

interface ActivityItem {
  id: string;
  type: 'form_submission' | 'client_signup' | 'payment_received';
  message: string;
  timestamp: Date;
  clientId?: string;
  metadata: Record<string, any>;
}

// Features:
// - Real-time Supabase subscription
// - Virtual scrolling for performance
// - Activity type icons and styling
// - Click-through to related items
```

### UI/UX Design Requirements:

**Visual Design:**
- Clean, professional interface following Untitled UI design system
- Wedding-themed accent colors for priority items
- Clear visual hierarchy with consistent spacing (Magic UI animations)
- Responsive breakpoints: 1440px+ (3 cols), 768-1439px (2 cols), <768px (1 col)

**Interaction Design:**
- Smooth drag-and-drop with visual feedback
- Command bar with instant search results
- Hover states and micro-interactions
- Touch-friendly mobile controls with proper touch targets

**Performance Optimizations:**
- Lazy loading of below-the-fold widgets
- Optimistic UI updates for drag-and-drop
- Service Worker for offline widget preferences
- Code splitting for dashboard-specific bundles

**Accessibility:**
- Screen reader support for all widgets
- Keyboard navigation for drag-and-drop (arrow keys + space)
- Focus management for command bar
- High contrast mode support

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Main dashboard page with responsive CSS Grid layout
- [ ] Drag-and-drop widget positioning with @dnd-kit
- [ ] Command bar with global search (Cmd+K shortcut)
- [ ] Quick actions bar with usage-based personalization
- [ ] Today's focus widget with priority algorithm
- [ ] Real-time activity feed with Supabase subscriptions
- [ ] Widget preferences persistence and state management
- [ ] Mobile-responsive design with touch optimization

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Dashboard Security Checklist:
- [ ] **Search input validation** - Use secureStringSchema for command bar queries
- [ ] **Widget data filtering** - Ensure all dashboard data filtered by supplier RLS
- [ ] **XSS prevention** - Sanitize all activity feed content display
- [ ] **CSRF protection** - Automatic with Next.js API routes
- [ ] **Rate limiting** - Client-side debouncing for search requests
- [ ] **Sensitive data protection** - Never expose internal metrics or other suppliers' data

### REQUIRED SECURITY IMPORTS:
```typescript
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { useAuthGuard } from '$WS_ROOT/wedsync/src/lib/hooks/useAuthGuard';
import { sanitizeHtml } from '$WS_ROOT/wedsync/src/lib/utils/sanitize';
```

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```typescript
// 1. DASHBOARD LAYOUT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});

// Test responsive grid layout
for (const viewport of [{width: 1440, height: 900}, {width: 768, height: 1024}, {width: 375, height: 667}]) {
  await mcp__playwright__browser_resize(viewport);
  await mcp__playwright__browser_take_screenshot({
    filename: `dashboard-${viewport.width}px.png`,
    fullPage: true
  });
}

// 2. DRAG-AND-DROP WIDGET TESTING
await mcp__playwright__browser_drag({
  startElement: 'Today\'s Focus widget',
  startRef: '[data-testid="widget-todays-focus"]',
  endElement: 'Activity Feed widget',
  endRef: '[data-testid="widget-activity-feed"]'
});

// Verify widget position persistence
await mcp__playwright__browser_navigate({url: "/clients"});
await mcp__playwright__browser_navigate_back();
await mcp__playwright__browser_snapshot();

// 3. COMMAND BAR TESTING
await mcp__playwright__browser_press_key({key: 'Meta+k'});
await mcp__playwright__browser_type({
  element: 'command input',
  ref: '[cmdk-input]',
  text: 'Sarah Johnson'
});

await mcp__playwright__browser_wait_for({text: 'Client: Sarah Johnson'});
await mcp__playwright__browser_press_key({key: 'Enter'});
await mcp__playwright__browser_wait_for({text: 'Client Profile'});

// 4. QUICK ACTIONS TESTING
await mcp__playwright__browser_click({
  element: 'Add New Client action',
  ref: '[data-testid="quick-action-new-client"]'
});
await mcp__playwright__browser_wait_for({text: 'Create New Client'});

// 5. REAL-TIME UPDATES TESTING
// Simulate real-time activity
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.supabase?.channel('dashboard-activities')
      .send({
        type: 'broadcast',
        event: 'new-activity',
        payload: { type: 'form_submission', message: 'New form submitted by Test Client' }
      });
  }`
});

await mcp__playwright__browser_wait_for({text: 'New form submitted by Test Client'});

// 6. ACCESSIBILITY TESTING
await mcp__playwright__browser_press_key({key: 'Tab'});
await mcp__playwright__browser_press_key({key: 'Tab'});
await mcp__playwright__browser_press_key({key: 'Enter'});

// Test screen reader compatibility
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Verify ARIA labels and roles
```

## 💾 WHERE TO SAVE YOUR WORK

- **Main Page**: `$WS_ROOT/wedsync/src/app/(dashboard)/page.tsx`
- **Dashboard Components**: `$WS_ROOT/wedsync/src/components/dashboard/`
  - `Dashboard.tsx`
  - `DashboardGrid.tsx`
  - `CommandBar.tsx`
  - `QuickActionsBar.tsx`
  - `TodaysFocusWidget.tsx`
  - `ActivityFeed.tsx`
  - `PerformanceSnapshot.tsx`
- **Hooks**: `$WS_ROOT/wedsync/src/lib/hooks/`
  - `useDashboardData.ts`
  - `useCommandBar.ts`
  - `useWidgetDrag.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/dashboard.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/components/dashboard/`

## 🏁 COMPLETION CHECKLIST

### Technical Implementation:
- [ ] Dashboard page loads in <3 seconds with all widgets
- [ ] Responsive CSS Grid layout works across all breakpoints
- [ ] Drag-and-drop widget positioning with smooth animations
- [ ] Command bar search with <200ms response time
- [ ] Real-time data updates without UI blocking
- [ ] Widget preferences persist between sessions

### UI/UX Quality:
- [ ] Untitled UI components used exclusively with Magic UI animations
- [ ] Wedding professional workflow optimized interface
- [ ] Touch-friendly mobile interface with proper touch targets
- [ ] Keyboard navigation and accessibility compliance
- [ ] Consistent visual hierarchy and spacing

### Integration Points:
- [ ] Ready for Team B dashboard API endpoints
- [ ] Prepared for Team C real-time subscriptions integration
- [ ] Designed for Team D mobile optimization
- [ ] Structured for Team E comprehensive testing

### Evidence Package:
- [ ] Screenshots of responsive dashboard at all breakpoints
- [ ] Demo video of drag-and-drop widget functionality
- [ ] Command bar search demonstration
- [ ] Accessibility audit results
- [ ] Performance metrics (load time, interaction response)

---

**EXECUTE IMMEDIATELY - This is a comprehensive dashboard UI prompt with all requirements!**