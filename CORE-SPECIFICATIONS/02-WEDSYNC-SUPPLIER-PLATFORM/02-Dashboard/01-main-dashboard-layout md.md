# 01-main-dashboard-layout.md

## Purpose

The primary interface suppliers see after login. Must provide immediate value while progressively revealing advanced features.

## Key Implementation Requirements

### Layout Structure

- **Persistent top navigation**: Logo, search, notifications, user menu
- **Contextual sidebar**: Changes based on current section
- **Main content area**: Responsive grid system for widgets
- **Command bar**: Universal search with keyboard shortcuts (Cmd+K)

### Priority Zones

1. **Quick Actions Bar**: Most common tasks (New Form, Add Client, Send Update)
2. **Today's Focus Widget**: Time-sensitive items requiring attention
3. **Activity Feed**: Real-time client engagement tracking
4. **Performance Snapshot**: Key metrics at a glance

### Responsive Behavior

- Desktop: 3-column layout with collapsible sidebar
- Tablet: 2-column with condensed navigation
- Mobile: Single column with bottom tab navigation

### Data Requirements

- Real-time updates via Supabase subscriptions
- Aggregate metrics cached for performance
- Lazy load non-critical widgets
- Prefetch common next actions

### User Customization

- Drag-and-drop widget positioning
- Collapsible sections with state persistence
- User preference storage in database
- Default layouts by vendor type

## Critical Success Factors

- Time to first meaningful action < 3 seconds
- All critical info visible without scrolling on desktop
- Mobile-first design for day-of wedding access
- Clear visual hierarchy guiding user attention