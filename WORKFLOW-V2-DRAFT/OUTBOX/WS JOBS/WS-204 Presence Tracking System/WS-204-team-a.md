# WS-204-TEAM-A: Presence Tracking UI Components
## Generated: 2025-01-20 | Development Manager Session | Feature: WS-204 Presence Tracking System

---

## 🎯 MISSION: REAL-TIME PRESENCE AWARENESS INTERFACE

**Your mission as Team A (Frontend/UI Specialists):** Build intuitive presence tracking components that enable wedding venue coordinators to see when photographers, caterers, and florists are online, idle, or away in real-time, providing immediate feedback for coordination decisions and eliminating 3-4 hours of phone tag per wedding.

**Impact:** Enables venue coordinators to see photographer is actively viewing timeline updates and can be messaged immediately, while caterer shows as offline 2 hours ago requiring scheduled email instead, saving critical coordination time when wedding setup changes need instant communication.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

Before you can claim completion, you MUST provide concrete evidence:

### 🔍 MANDATORY FILE PROOF
```bash
# Run these exact commands and include output in your completion report:
ls -la $WS_ROOT/wedsync/src/components/presence/
ls -la $WS_ROOT/wedsync/src/hooks/usePresence.ts
ls -la $WS_ROOT/wedsync/src/types/presence.ts
cat $WS_ROOT/wedsync/src/components/presence/PresenceIndicator.tsx | head -20
```

### 🧪 MANDATORY TEST VALIDATION
```bash
# All these commands MUST pass:
cd $WS_ROOT/wedsync && npm run typecheck
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=presence
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=PresenceIndicator
```

### 🎭 MANDATORY E2E PROOF
Your delivery MUST include Playwright test evidence showing:
- Real-time presence status updates between multiple users
- Privacy settings hiding presence when configured
- Activity tracking triggering status changes (online → idle → away)
- Typing indicators appearing and disappearing correctly
- Wedding coordinator seeing supplier presence in context

**NO EXCEPTIONS:** Without this evidence, your work is incomplete regardless of UI quality.

---

## 🧠 ENHANCED SERENA MCP ACTIVATION

### 🤖 SERENA INTELLIGENCE SETUP
```bash
# MANDATORY: Activate Serena's component pattern analysis
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/components/presence")
mcp__serena__find_symbol("PresenceIndicator")
mcp__serena__write_memory("presence-ui", "Real-time presence tracking UI components for wedding supplier coordination")
```

**Serena-Enhanced UI Development:**
1. **Component Analysis**: Map existing UI patterns for status indicators and avatars
2. **Real-time Integration**: Build on existing realtime components from WS-202/WS-203
3. **Design System Integration**: Leverage existing Avatar, Badge, and Tooltip components
4. **Type Safety**: Ensure TypeScript compatibility for presence state management

---

## 🧩 SEQUENTIAL THINKING ACTIVATION - PRESENCE UI DESIGN

```typescript
mcp__sequential_thinking__sequentialthinking({
  thought: "I need to design comprehensive presence tracking UI components for wedding coordination. Key challenges: 1) Real-time status indicators that update instantly when suppliers come online/offline 2) Privacy-respecting presence display (some users may want to appear offline) 3) Activity-based status changes (online → idle → away) with visual feedback 4) Context-aware presence (showing presence within wedding/organization context) 5) Accessible design for screen readers and keyboard navigation. The wedding context is critical - venue coordinators need immediate visual feedback about supplier availability for time-sensitive coordination.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For component architecture, I need: 1) PresenceIndicator component with colored dots and status labels 2) PresenceList component showing all team members with real-time updates 3) ActivityTracker invisible component monitoring user interactions 4) Custom usePresence hook integrating with Supabase Realtime 5) Privacy settings integration respecting user preferences. The status hierarchy should be: green=online, yellow=idle (2min), gray=away (10min), red=busy, with special handling for 'appear offline' setting.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 7
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For wedding-specific UX considerations: Venue coordinators managing multiple weddings need clear visual distinction between supplier availability. The UI should show current page being viewed (timeline, guest list, etc.) when privacy allows, typing indicators for active communication, and custom status messages for important updates like 'At venue until 6pm'. Position indicators near supplier avatars in collaboration contexts, and provide tooltips with last activity timestamps for quick decision making.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 7
})

// Continue structured analysis through accessibility, performance, integration patterns...
```

---

## 🔐 SECURITY REQUIREMENTS (TEAM A SPECIALIZATION)

### 🚨 MANDATORY SECURITY IMPLEMENTATION

**ALL presence UI components must respect privacy:**
```typescript
import { usePresenceSettings } from '@/hooks/usePresenceSettings';
import { checkPresencePermissions } from '@/lib/auth/presence-permissions';

function PresenceIndicator({ userId, viewerId }: PresenceIndicatorProps) {
  const { settings } = usePresenceSettings(userId);
  const canViewPresence = checkPresencePermissions(userId, viewerId, settings);
  
  // Respect privacy settings
  if (!canViewPresence || settings?.appearOffline) {
    return <div className="w-2 h-2 bg-gray-400 rounded-full" />; // Generic offline indicator
  }
  
  // Only show detailed presence if permitted
  if (settings?.visibility === 'nobody') {
    return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
  }
  
  // Context-based visibility (contacts, team, everyone)
  // Show real presence status based on relationship
}
```

### 🔒 TEAM A SECURITY CHECKLIST
- [ ] Respect user privacy settings (appear offline, visibility levels)
- [ ] Never display presence data for unauthorized relationships
- [ ] Sanitize custom status messages for XSS prevention
- [ ] Rate limit presence broadcasts (max 1 update per second)
- [ ] No sensitive page information in presence data
- [ ] Activity tracking respects user consent preferences
- [ ] Screen reader accessibility doesn't leak private information
- [ ] Client-side validation for all presence settings changes

---

## 💡 UI TECHNOLOGY REQUIREMENTS

### 🎨 DESIGN SYSTEM INTEGRATION
Use our premium component libraries for consistent presence design:

**Untitled UI Components (License: $247 - Premium):**
```typescript
// For presence management interfaces and settings
import { Card, Badge, Button, Switch } from '@/components/untitled-ui';
import { Avatar, Tooltip, Modal } from '@/components/untitled-ui';
```

**Magic UI Components (Free Tier):**
```typescript
// For presence animations and visual feedback
import { PulseDot, StatusIndicator, ActivityRing } from '@/components/magic-ui';
import { AnimatedBadge, FadeInOut } from '@/components/magic-ui/transitions';
```

**Mandatory Navigation Integration:**
Every presence feature MUST integrate with our navigation system:
```typescript
// Add to: src/components/navigation/NavigationItems.tsx
{
  label: 'Team Presence',
  href: '/dashboard/team',
  icon: 'users',
  badge: onlineTeamMembers > 0 ? onlineTeamMembers : undefined,
  presenceIndicator: true // Special flag for presence-aware nav items
}
```

---

## 🔧 TEAM A FRONTEND SPECIALIZATION

### 🎯 YOUR CORE DELIVERABLES

**1. Real-Time Presence Indicator Component**
```typescript
// Required: /src/components/presence/PresenceIndicator.tsx
interface PresenceIndicatorProps {
  userId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showActivity?: boolean;
  showCustomStatus?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  onClick?: () => void;
  className?: string;
}

export function PresenceIndicator({ userId, size = 'md', showLabel, showActivity, position = 'bottom-right' }: PresenceIndicatorProps) {
  // Real-time presence subscription
  // Privacy settings integration
  // Status color coding: green=online, yellow=idle, gray=away, red=busy
  // Typing indicator pulse animation
  // Custom status emoji and text display
  // Tooltip with last seen timestamp
  // Accessibility: proper ARIA labels and screen reader support
}
```

**2. Team Presence List Component**
```typescript
// Required: /src/components/presence/PresenceList.tsx
interface PresenceListProps {
  context: 'wedding' | 'organization' | 'global';
  contextId?: string;
  showOfflineUsers?: boolean;
  groupByStatus?: boolean;
  maxUsers?: number;
  allowCustomStatus?: boolean;
  onUserClick?: (userId: string) => void;
}

export function PresenceList({ context, contextId, showOfflineUsers = true, groupByStatus = true }: PresenceListProps) {
  // Real-time presence state management
  // User filtering based on context (wedding team, organization, etc.)
  // Status-based grouping (Online, Idle, Away, Offline)
  // Search and filter functionality
  // Click handlers for user profile access
  // Responsive design for mobile team coordination
}
```

**3. Activity Tracker Component**
```typescript
// Required: /src/components/presence/ActivityTracker.tsx
interface ActivityTrackerProps {
  enabled?: boolean;
  trackMouse?: boolean;
  trackKeyboard?: boolean;
  trackFocus?: boolean;
  idleTimeout?: number; // milliseconds
  awayTimeout?: number; // milliseconds
  onStatusChange?: (status: PresenceStatus) => void;
}

export function ActivityTracker({ 
  enabled = true, 
  idleTimeout = 120000, // 2 minutes
  awayTimeout = 600000, // 10 minutes
  onStatusChange 
}: ActivityTrackerProps) {
  // Mouse movement tracking with debouncing
  // Keyboard activity detection
  // Page visibility API integration
  // Window focus/blur handling
  // Idle/away timer management
  // Status change callbacks
  // Cleanup on unmount
  
  return null; // Invisible component
}
```

**4. Custom Presence Hook**
```typescript
// Required: /src/hooks/usePresence.ts
interface UsePresenceOptions {
  channelName: string;
  userId: string;
  trackActivity?: boolean;
  updateInterval?: number;
}

interface PresenceState {
  userId: string;
  status: 'online' | 'idle' | 'away' | 'offline' | 'busy';
  lastActivity: string;
  currentPage?: string;
  isTyping?: boolean;
  device?: 'desktop' | 'mobile' | 'tablet';
  customStatus?: string;
  customEmoji?: string;
}

export function usePresence({ channelName, userId, trackActivity = true }: UsePresenceOptions) {
  // Supabase Realtime Presence channel subscription
  // Local presence state management
  // Activity tracking integration
  // Status update broadcasting
  // Privacy settings enforcement
  // Cleanup and unsubscribe logic
  
  return {
    presenceState: Record<string, PresenceState[]>, // All users in channel
    myStatus: PresenceStatus,
    updateStatus: (status: Partial<PresenceState>) => void,
    setCustomStatus: (status: string, emoji?: string) => void,
    trackActivity: () => void,
    isLoading: boolean,
    error: Error | null
  };
}
```

**5. Presence Settings Panel**
```typescript
// Required: /src/components/presence/PresenceSettings.tsx
interface PresenceSettingsProps {
  userId: string;
  onSave?: (settings: PresenceSettings) => void;
}

export function PresenceSettings({ userId, onSave }: PresenceSettingsProps) {
  // Privacy visibility options: everyone, team, contacts, nobody
  // Activity tracking preferences
  // Current page sharing toggle
  // Appear offline override
  // Custom status management
  // Emoji picker integration
  // Settings save/cancel handling
}
```

---

## 💒 WEDDING INDUSTRY CONTEXT

### 🤝 REAL WEDDING SCENARIOS FOR TEAM A

**Scenario 1: Venue Coordinator Multi-Supplier Coordination**
- Coordinator sees photographer is online and viewing timeline (green dot + "viewing timeline")
- Florist shows idle for 5 minutes (yellow dot + "idle 5m")
- Caterer is away since 2 hours ago (gray dot + "away 2h")
- UI enables instant decision: message photographer now, quick note to florist, email caterer
- Visual hierarchy shows immediate availability vs. delayed response expected

**Scenario 2: Photography Team Wedding Day Management**
- Lead photographer tracks assistant presence during venue setup
- UI shows assistant is "At venue - setting up" with custom status
- Real-time typing indicators during equipment coordination messages
- Mobile-responsive presence for on-site communication
- Quick status updates: "Moving to ceremony location" visible to entire team

**Scenario 3: Multi-Wedding Venue Weekend Coordination**
- Venue coordinator managing 3 simultaneous weddings
- Presence list grouped by wedding context showing supplier availability
- Color-coded status dots enable rapid scanning of team availability
- Custom status messages provide context: "Ceremony prep - back 4pm"
- Privacy-respecting design shows presence only to authorized team members

### 🔗 WEDDING WORKFLOW UI INTEGRATION

**Context-Aware Presence Display:**
```typescript
// Wedding-specific presence contexts
const weddingPresenceContexts = {
  // Venue coordination team
  venue_coordination: {
    roles: ['venue_manager', 'coordinator', 'setup_crew'],
    showCurrentLocation: true,
    allowCustomStatus: true
  },
  
  // Photography team presence
  photography_team: {
    roles: ['lead_photographer', 'assistant', 'videographer'],  
    showEquipmentStatus: true,
    mobileOptimized: true
  },
  
  // Full wedding team (all suppliers)
  wedding_team: {
    roles: ['photographer', 'caterer', 'florist', 'dj', 'coordinator'],
    groupByVendorType: true,
    showLastSeen: true
  }
};
```

**Status Message Templates for Wedding Context:**
```typescript
const weddingStatusTemplates = [
  { emoji: '📸', text: 'At venue - ceremony prep', duration: '2 hours' },
  { emoji: '🌸', text: 'Flower delivery in progress', duration: '1 hour' },
  { emoji: '🍰', text: 'Kitchen prep - available after 3pm', duration: '4 hours' },
  { emoji: '🎵', text: 'Sound check complete', duration: '30 minutes' },
  { emoji: '📝', text: 'Timeline review', duration: '15 minutes' }
];
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### ⚡ TEAM A PERFORMANCE STANDARDS

**Real-Time Update Performance:**
- Presence status updates: < 2 seconds from activity to display
- Component re-render optimization: < 16ms per presence update
- Activity tracking overhead: < 1% CPU usage
- Memory usage: < 5MB for 100 concurrent presence subscriptions

**UI Responsiveness Targets:**
- Presence indicator render time: < 100ms
- Presence list update time: < 200ms for 50 users
- Status change animation duration: 300ms with smooth transitions
- Mobile touch response time: < 100ms for presence interactions

**Optimization Strategies:**
```typescript
// Performance optimizations for presence components
const presenceOptimizations = {
  // Debounced activity tracking
  activityDebounce: 2000, // 2 seconds
  
  // Memoized presence calculations
  useMemo: ['presenceState', 'filteredUsers', 'statusCounts'],
  
  // Virtualized lists for large teams
  virtualizeThreshold: 50, // users
  
  // Optimistic status updates
  optimisticUpdates: true,
  
  // Batched presence broadcasts
  batchInterval: 1000 // 1 second
};
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ MANDATORY TEST COVERAGE (>90%)

**Component Unit Tests:**
```typescript
describe('PresenceIndicator', () => {
  it('displays correct status colors for each presence state', () => {
    const { rerender } = render(<PresenceIndicator userId="test-user" />);
    
    // Test status color mapping
    mockPresenceState('online');
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-green-500');
    
    mockPresenceState('idle');
    rerender(<PresenceIndicator userId="test-user" />);
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-yellow-500');
    
    mockPresenceState('away'); 
    rerender(<PresenceIndicator userId="test-user" />);
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-gray-400');
  });

  it('respects privacy settings for presence visibility', () => {
    mockPresenceSettings({ visibility: 'nobody' });
    render(<PresenceIndicator userId="test-user" />);
    
    // Should show generic offline indicator
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-gray-400');
    expect(screen.queryByText('online')).not.toBeInTheDocument();
  });

  it('displays typing indicators with pulse animation', () => {
    mockPresenceState('online', { isTyping: true });
    render(<PresenceIndicator userId="test-user" showActivity />);
    
    expect(screen.getByTestId('status-dot')).toHaveClass('animate-pulse');
  });
});
```

**Integration Tests:**
```typescript
describe('PresenceList Integration', () => {
  it('updates presence states in real-time', async () => {
    render(<PresenceList context="wedding" contextId="test-wedding" />);
    
    // Mock user going online
    await mockPresenceUpdate('user-1', { status: 'online' });
    expect(screen.getByTestId('user-1-status')).toContainText('online');
    
    // Mock user going idle
    await mockPresenceUpdate('user-1', { status: 'idle' });
    expect(screen.getByTestId('user-1-status')).toContainText('idle');
  });

  it('groups users by status when enabled', () => {
    const users = mockMultipleUsers([
      { id: '1', status: 'online' },
      { id: '2', status: 'online' },
      { id: '3', status: 'idle' },
      { id: '4', status: 'away' }
    ]);
    
    render(<PresenceList users={users} groupByStatus />);
    
    expect(screen.getByText('Online (2)')).toBeInTheDocument();
    expect(screen.getByText('Idle (1)')).toBeInTheDocument();
    expect(screen.getByText('Away (1)')).toBeInTheDocument();
  });
});
```

**E2E Tests with Wedding Context:**
```typescript
describe('Wedding Coordinator Presence Workflow', () => {
  test('coordinator sees real-time supplier presence updates', async ({ page }) => {
    // Login as venue coordinator
    await page.goto('/venue/coordinator-dashboard');
    await page.fill('[data-testid="login-email"]', 'coordinator@venue.test');
    await page.click('[data-testid="login-submit"]');

    // Navigate to wedding team view
    await page.click('[data-testid="wedding-sarah-mike"]');
    await page.click('[data-testid="team-presence-tab"]');

    // Verify presence list shows wedding suppliers
    const presenceList = page.locator('[data-testid="presence-list"]');
    await expect(presenceList).toBeVisible();
    
    // Check photographer presence
    const photographerStatus = page.locator('[data-testid="photographer-presence"]');
    await expect(photographerStatus).toContainText('online');

    // Simulate photographer going idle (via separate session)
    await simulatePresenceChange('photographer-id', 'idle');
    
    // Verify status updates in coordinator view
    await expect(photographerStatus).toContainText('idle');
    await expect(photographerStatus.locator('.status-dot')).toHaveClass(/bg-yellow/);
  });

  test('typing indicators appear during active communication', async ({ page }) => {
    await page.goto('/supplier/photographer-dashboard');
    
    // Start typing in message field
    await page.fill('[data-testid="message-input"]', 'Confirming timeline...');
    
    // Switch to coordinator view (separate tab)
    const coordinatorTab = await page.context().newPage();
    await coordinatorTab.goto('/venue/coordinator-dashboard');
    
    // Verify typing indicator appears
    const typingIndicator = coordinatorTab.locator('[data-testid="photographer-typing"]');
    await expect(typingIndicator).toBeVisible();
    await expect(typingIndicator).toContainText('typing');
    
    // Stop typing, verify indicator disappears
    await page.fill('[data-testid="message-input"]', '');
    await coordinatorTab.waitForTimeout(3000);
    await expect(typingIndicator).not.toBeVisible();
  });
});
```

---

## 📚 MCP INTEGRATION WORKFLOWS

### 🔧 REQUIRED MCP OPERATIONS

**Ref MCP - UI Documentation Research:**
```typescript
await mcp__Ref__ref_search_documentation("React hooks useEffect cleanup patterns");
await mcp__Ref__ref_search_documentation("Supabase Realtime Presence React integration");  
await mcp__Ref__ref_search_documentation("Page Visibility API browser compatibility");
await mcp__Ref__ref_search_documentation("accessibility ARIA live regions");
```

**Playwright MCP - E2E Testing Execution:**
```typescript
await mcp__playwright__browser_navigate({url: '/test/presence-demo'});
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate presence state changes
    window.mockPresence = {
      updateStatus: (status) => window.dispatchEvent(new CustomEvent('presence:status', { detail: status })),
      simulateIdle: () => window.mockPresence.updateStatus('idle'),
      simulateTyping: () => window.dispatchEvent(new CustomEvent('presence:typing', { detail: { isTyping: true } }))
    };
    return { mockSetup: 'complete' };
  }`
});
```

### 🎯 AGENT COORDINATION REQUIRED

Launch specialized agents for comprehensive UI development:

```typescript
// 1. UI task coordination
await Task({
  description: "Coordinate presence UI tasks",
  prompt: `You are the task-tracker-coordinator for WS-204 Team A presence tracking UI development.
  Break down the UI implementation into component creation, hook development, styling, accessibility, and testing tasks.
  Track dependencies between presence hooks, indicator components, list views, and activity tracking integration.`,
  subagent_type: "task-tracker-coordinator"
});

// 2. React UI specialist
await Task({
  description: "Presence tracking UI components",
  prompt: `You are the react-ui-specialist for WS-204 presence tracking components.
  Create comprehensive presence UI including PresenceIndicator with real-time status dots, PresenceList with team member visibility, and ActivityTracker for status automation.
  Implement usePresence hook integrating with Supabase Realtime Presence channels.
  Focus on wedding coordination UX with immediate visual feedback for supplier availability.
  Ensure mobile-responsive design for venue coordinators managing weddings on-site.`,
  subagent_type: "react-ui-specialist"
});

// 3. Accessibility specialist  
await Task({
  description: "Presence UI accessibility implementation",
  prompt: `You are the ui-ux-designer for WS-204 presence accessibility and user experience.
  Ensure all presence indicators have proper ARIA labels and screen reader support.
  Implement keyboard navigation for presence lists and settings panels.
  Design clear visual hierarchy for status colors and typography that works for color-blind users.
  Create intuitive presence privacy settings with clear explanations of visibility levels.`,
  subagent_type: "ui-ux-designer"
});

// 4. Performance optimization specialist
await Task({
  description: "Presence UI performance optimization",
  prompt: `You are the performance-optimization-expert for WS-204 presence UI performance.
  Optimize real-time presence updates to prevent excessive re-renders with React.memo and useMemo.
  Implement efficient activity tracking with debounced event handlers.
  Create virtualized presence lists for large wedding teams (50+ suppliers).
  Ensure presence animations are smooth and don't impact UI responsiveness.`,
  subagent_type: "performance-optimization-expert"
});

// 5. Testing specialist
await Task({
  description: "Presence UI testing implementation",
  prompt: `You are the test-automation-architect for WS-204 presence UI testing.
  Create comprehensive component tests for PresenceIndicator, PresenceList, and ActivityTracker components.
  Implement E2E tests validating real-time presence updates between multiple browser sessions.
  Design tests for privacy settings ensuring unauthorized presence data is never displayed.
  Create performance tests validating presence update responsiveness and memory usage targets.`,
  subagent_type: "test-automation-architect"
});
```

---

## 🎖️ COMPLETION CRITERIA

### ✅ DEFINITION OF DONE

**Code Implementation (All MUST exist):**
- [ ] `/src/components/presence/PresenceIndicator.tsx` - Real-time status indicator with privacy respect
- [ ] `/src/components/presence/PresenceList.tsx` - Team presence list with grouping and filtering
- [ ] `/src/components/presence/ActivityTracker.tsx` - Invisible activity monitoring component
- [ ] `/src/components/presence/PresenceSettings.tsx` - Privacy and preference management panel
- [ ] `/src/hooks/usePresence.ts` - Custom hook for Supabase Realtime Presence integration
- [ ] `/src/types/presence.ts` - TypeScript interfaces for presence data structures

**Feature Validation:**
- [ ] Real-time status updates within 2 seconds of activity changes
- [ ] Privacy settings properly hide presence when configured
- [ ] Activity tracking automatically transitions: online → idle (2min) → away (10min)
- [ ] Typing indicators appear and disappear correctly
- [ ] Custom status messages display with emoji support

**Performance Validation:**
- [ ] < 100ms presence indicator render time
- [ ] < 1% CPU usage for activity tracking
- [ ] < 200ms presence list updates for 50 users
- [ ] Smooth 300ms status change animations
- [ ] Memory usage < 5MB for 100 presence subscriptions

**Accessibility Validation:**
- [ ] Screen reader announces presence changes with ARIA live regions
- [ ] Keyboard navigation works for all presence components
- [ ] Color-blind friendly status indicators (shape + color coding)
- [ ] High contrast mode compatibility
- [ ] Focus management for presence settings modals

**Wedding Context Integration:**
- [ ] Presence indicators integrated with supplier avatars in team views
- [ ] Custom wedding status templates (at venue, ceremony prep, etc.)
- [ ] Mobile-responsive design for on-site coordination
- [ ] Context-aware presence filtering by wedding/organization
- [ ] Integration with existing navigation system

---

## 📖 DOCUMENTATION REQUIREMENTS

### 📝 MANDATORY DOCUMENTATION

Create comprehensive UI component documentation:

**Component API Documentation:**
```markdown
# Presence Tracking Components

## PresenceIndicator
Real-time status indicator for user presence awareness.

### Props
- `userId: string` - User ID to track presence for
- `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Indicator size (default: 'md')
- `showLabel: boolean` - Show status text label (default: false)
- `showActivity: boolean` - Show activity details and custom status (default: true)
- `position: string` - Dot position on avatar (default: 'bottom-right')

### Status Colors
- Green: Online (active within 30 seconds)
- Yellow: Idle (inactive 2-10 minutes)
- Gray: Away (inactive > 10 minutes) or Offline
- Red: Busy (manual status)

### Privacy Handling
Component automatically respects user privacy settings and relationship permissions.

## PresenceList
Team presence overview with real-time updates and filtering.

### Props
- `context: 'wedding' | 'organization' | 'global'` - Presence context
- `contextId?: string` - Context identifier (wedding ID, org ID)
- `groupByStatus: boolean` - Group users by online/idle/away (default: true)
- `showOfflineUsers: boolean` - Include offline users (default: true)

### Wedding Context Usage
```tsx
// Show presence for specific wedding team
<PresenceList 
  context="wedding" 
  contextId="sarah-mike-wedding"
  groupByStatus={true}
/>
```
```

**Wedding Coordinator Usage Guide:**
```markdown
# Presence Tracking for Wedding Coordination

## Real-Time Supplier Availability
- **Green Dot**: Supplier is online and available for immediate messages
- **Yellow Dot**: Supplier is idle but likely to see messages soon (< 10 min)
- **Gray Dot**: Supplier is away or offline, expect delayed response
- **Red Dot**: Supplier is busy, avoid non-urgent interruptions

## Custom Status Messages
Suppliers can set context-aware status:
- "📸 At venue - ceremony prep"
- "🌸 Flower delivery in progress" 
- "🍰 Kitchen prep - available after 3pm"

## Privacy Considerations
- Some suppliers may choose to appear offline for focus time
- Presence visibility respects team/contact relationships
- Activity details only shown when privacy settings allow

## Mobile Coordination
- Presence indicators work on mobile for on-site coordination
- Touch-optimized presence lists for quick team overview
- Typing indicators help avoid message collision during urgent coordination
```

---

## 💼 WEDDING BUSINESS IMPACT

### 📊 SUCCESS METRICS

**Coordination Efficiency Gains:**
- 3-4 hours saved per wedding from eliminated phone tag
- 90% reduction in "Are you available?" messages
- Instant visibility into supplier availability for time-sensitive coordination
- Real-time feedback prevents delayed responses during critical wedding setup

**Communication Quality Improvements:**
- Immediate vs. delayed communication decisions based on presence
- Reduced interruption of suppliers during focus work (busy status)
- Context-aware messaging with custom status integration
- Mobile coordination efficiency for venue coordinators on-site

**Team Collaboration Enhancement:**
- Real-time typing indicators prevent message conflicts
- Activity-based status automation reduces manual status management
- Privacy-respecting presence builds trust while enabling coordination
- Wedding-specific presence contexts improve team awareness

---

**🎯 TEAM A SUCCESS DEFINITION:**
You've succeeded when venue coordinators can instantly see photographer availability through green presence indicators, make immediate communication decisions based on real-time status, and coordinate efficiently with mobile-responsive presence interfaces that respect supplier privacy while enabling critical wedding day coordination.

---

**🚨 FINAL REMINDER - EVIDENCE REQUIRED:**
Your completion report MUST include:
1. File existence proof (`ls -la` output)
2. TypeScript compilation success (`npm run typecheck`)
3. All tests passing (`npm test`)
4. Playwright E2E evidence of real-time presence updates between users
5. Privacy settings testing showing proper access control
6. Activity tracking validation demonstrating status transitions

**No exceptions. Evidence-based delivery only.**

---

*Generated by WedSync Development Manager*  
*Feature: WS-204 Presence Tracking System*  
*Team: A (Frontend/UI Specialists)*  
*Scope: Real-time presence awareness UI components*  
*Standards: Evidence-based completion with accessibility and privacy compliance*