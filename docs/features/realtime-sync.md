# Real-Time Sync System - Complete Implementation Guide

## Overview
The real-time sync system ensures that when any data changes anywhere in WedSync/WedMe, it instantly updates across all connected users and interfaces. When a couple updates their wedding date in WedMe, all connected suppliers see it immediately. When a supplier adds a note, their team sees it instantly.

## Core Components

### 1. WebSocket Connection Manager
**Location**: `/app/lib/realtime/connection-manager.ts`

#### Connection Establishment
**Sub-agent instructions**: Create persistent connection system:

**Connection Flow**:
1. User logs in to platform
2. WebSocket connection opens automatically
3. Connection authenticated with user token
4. User subscribes to relevant channels
5. Heartbeat starts (every 30 seconds)
6. Reconnection on disconnect (exponential backoff)

**Connection States**:
- Connecting (yellow indicator)
- Connected (green indicator)
- Disconnected (red indicator)
- Reconnecting (yellow pulsing)
- Error (red with retry button)

#### Visual Connection Indicator
**Sub-agent instructions**: Add status indicator to UI:

**Location in UI**: Top-right corner of dashboard
- Green dot = Connected and syncing
- Yellow dot = Connecting or slow connection
- Red dot = Disconnected
- Click for details and manual reconnect

### 2. Channel Architecture

#### Channel Types
**Sub-agent instructions**: Implement Supabase Realtime channels:

**Supplier Channels**:
supplier:[supplier_id] - Private supplier data
supplier:[supplier_id]:team - Team updates
supplier:[supplier_id]:clients - Client list changes
supplier:[supplier_id]:forms - Form submissions
supplier:[supplier_id]:journeys - Journey progress

**Couple Channels**:
couple:[couple_id] - Private couple data
couple:[couple_id]:suppliers - Connected suppliers
couple:[couple_id]:tasks - Task updates
couple:[couple_id]:timeline - Timeline changes

**Shared Channels**:
wedding:[wedding_id] - All vendors and couple for a wedding
form:[form_id] - Specific form collaboration
journey:[journey_id]:[client_id] - Journey execution updates

#### Channel Subscription Management
**Sub-agent instructions**: Build subscription system:

**Auto-Subscribe Logic**:
- Subscribe to user's primary channel on login
- Subscribe to active client channels when viewing
- Subscribe to form channels when editing
- Unsubscribe from inactive channels after 5 minutes
- Maximum 50 concurrent channel subscriptions

### 3. Data Synchronization Events

#### Core Fields Sync
**Sub-agent instructions**: Sync these fields instantly:

**When Couple Updates in WedMe**:
- Wedding date → All connected supplier forms update
- Venue change → All suppliers see new venue
- Guest count → Catering and venue get updates
- Contact info → All suppliers see new details
- Timeline changes → All vendors get notifications

**Visual Feedback**:
- Field glows briefly when updated
- Toast notification shows what changed
- Update indicator shows who made change
- Timestamp of last update visible

#### Form Response Sync
**Sub-agent instructions**: Create form sync system:

**Real-Time Form Updates**:
- Couple starts filling form → Supplier sees "Currently filling"
- Each field save → Updates in supplier dashboard
- Form submitted → Instant notification to supplier
- Supplier adds note → Couple sees immediately

**Progress Indicators**:
- Show "Jane is typing..." in fields
- Display completion percentage in real-time
- Show which fields were just updated
- Lock fields being edited by others

### 4. Collaborative Editing

#### Conflict Resolution
**Sub-agent instructions**: Handle simultaneous edits:

**Locking Strategy**:
- User clicks field → Field locks for 30 seconds
- Visual indicator shows who is editing
- Other users see field as read-only
- Lock releases on save or timeout
- Warning before overwriting changes

**Merge Strategy**:
- Last write wins for simple fields
- Operational transformation for text areas
- Append strategy for lists
- Manual resolution for conflicts
- Version history for rollback

#### Presence Indicators
**Sub-agent instructions**: Show who's online:

**Active User Display**:
- Avatar circles at top of shared screens
- Green dot for active, grey for idle
- Cursor position in shared documents
- "Viewing" indicator on client profiles
- Team member locations in app

### 5. Notification System

#### Instant Notifications
**Sub-agent instructions**: Build notification engine:

**Notification Types**:
- Toast notifications (temporary, auto-dismiss)
- Bell icon notifications (persistent)
- Email notifications (important only)
- SMS alerts (critical only)
- Push notifications (mobile app)

**Notification Triggers**:
- New form submission
- Journey milestone reached
- Client message received
- Team member mention
- Payment received
- Meeting booked
- Task completed

#### Notification Center
**Location**: `/app/components/notifications/center.tsx`

**Sub-agent instructions**: Create notification UI:

**Features**:
- Dropdown from bell icon
- Unread count badge
- Mark as read/unread
- Filter by type
- Clear all option
- Settings link
- Time-based grouping

### 6. Dashboard Live Updates

#### Activity Feed Updates
**Sub-agent instructions**: Build live activity stream:

**Real-Time Events Shown**:
- "Emma just completed the timeline form"
- "James updated the guest count to 150"
- "Sarah from Catering viewed the dietary requirements"
- "New message from venue coordinator"
- "Photography journey moved to next stage"

**Update Animation**:
- New items slide in from top
- Fade in with subtle highlight
- Auto-scroll if at top of feed
- Pause on hover
- Click to see details

#### Metrics Updates
**Sub-agent instructions**: Update numbers live:

**Live Metrics**:
- Active clients count
- Forms completed today
- Revenue (if payment integrated)
- Team member activity
- Response time average

**Update Strategy**:
- Numbers animate when changing
- Color flash for significant changes
- Smooth transitions, no jumps
- Cache previous value for comparison

### 7. Client List Sync

#### Live Client Status
**Sub-agent instructions**: Sync client states:

**Status Indicators**:
- 🟢 Online now (in WedMe dashboard)
- 🟡 Recently active (last 24 hours)
- ⚫ Inactive (more than 7 days)
- 📝 Currently filling form
- 💬 Has unread message

**Sorting Updates**:
- Active clients bubble to top
- Recently updated highlighted
- New clients appear with animation
- Deleted clients fade out

### 8. Journey Execution Sync

#### Journey Progress Updates
**Sub-agent instructions**: Build journey sync:

**Live Journey Updates**:
- Module execution in real-time
- Email opened notifications
- Form completed alerts
- Journey stage progression
- Failed action warnings

**Visual Updates**:
- Progress bar advances smoothly
- Current stage highlights
- Completed stages show checkmark
- Failed stages show warning
- Time until next action countdown

### 9. Calendar Sync

#### Meeting Updates
**Sub-agent instructions**: Sync calendar events:

**Real-Time Calendar Sync**:
- New meeting appears immediately
- Reschedules update across all views
- Cancellations remove instantly
- Attendee changes sync
- Meeting reminders coordinate

**Visual Calendar Updates**:
- Events fade in when created
- Drag to reschedule (others see moving)
- Color changes for status updates
- Conflict warnings appear instantly

### 10. Team Collaboration Sync

#### Multi-User Editing
**Sub-agent instructions**: Handle team features:

**Team Sync Features**:
- See where team members are in app
- Shared notes update live
- Task assignments notify instantly
- Permission changes apply immediately
- Team chat messages appear real-time

**Collision Prevention**:
- Show "Bob is editing this" warnings
- Prevent same record edits
- Queue conflicting actions
- Merge non-conflicting changes

### 11. Offline Handling

#### Offline Queue System
**Sub-agent instructions**: Build offline support:

**Offline Behavior**:
- Detect connection loss immediately
- Show offline banner
- Queue all changes locally
- Store in browser localStorage
- Track order of operations

**Sync on Reconnection**:
- Check for conflicts
- Apply changes in order
- Notify of any failures
- Request refresh if needed
- Show sync progress

#### Offline Indicators
**Sub-agent instructions**: Show offline state:

**Visual Indicators**:
- Grey overlay on real-time sections
- "Last synced: 2 minutes ago" text
- Disabled real-time features
- Queue count badge
- Sync button when reconnected

### 12. Performance Optimization

#### Debouncing Strategies
**Sub-agent instructions**: Optimize updates:

**Debounce Rules**:
- Text input: 500ms after stop typing
- Slider/number: 200ms after change
- Checkbox/radio: Immediate
- Form save: Batch every 2 seconds
- Analytics: Batch every 10 seconds

#### Data Compression
**Sub-agent instructions**: Minimize data transfer:

**Compression Strategies**:
- Send only changed fields
- Use field IDs not names
- Compress large text fields
- Batch multiple updates
- Use binary protocols for media

### 13. Mobile Sync Optimization

#### Mobile-Specific Sync
**Sub-agent instructions**: Optimize for mobile:

**Mobile Strategies**:
- Reduce update frequency on cellular
- Prioritize visible content sync
- Defer background updates
- Compress images more aggressively
- Pause sync on low battery

**Mobile Indicators**:
- Sync status in status bar
- Pull-to-refresh gesture
- Last sync timestamp
- Data usage warning
- Sync settings access

### 14. Security & Privacy

#### Encrypted Channels
**Sub-agent instructions**: Secure real-time data:

**Security Measures**:
- TLS encryption for WebSocket
- Token refresh without disconnect
- Channel access validation
- Rate limiting per user
- Audit log of sync events

#### Privacy Controls
**Sub-agent instructions**: Respect privacy:

**Privacy Features**:
- Suppliers can't see other suppliers' data
- Couples control what syncs to vendors
- Team members see based on permissions
- Option to disable presence indicators
- Anonymous mode for sensitive edits

### 15. Error Handling

#### Sync Error Management
**Sub-agent instructions**: Handle sync failures:

**Error Scenarios**:
- Connection timeout → Auto retry
- Authentication failure → Re-login prompt
- Conflict detected → Resolution dialog
- Server error → Fallback to polling
- Rate limit → Queue and slow down

**Error Notifications**:
- Subtle for auto-resolved issues
- Clear for user action needed
- Detailed logs for debugging
- Report option for persistent issues

### 16. Analytics Tracking

#### Sync Metrics
**Sub-agent instructions**: Track performance:

**Metrics to Track**:
- Connection uptime percentage
- Average latency
- Messages per second
- Reconnection frequency
- Sync failure rate
- Conflict frequency

**Performance Dashboard**:
- Real-time connection stats
- Historical performance graphs
- Error rate trends
- User concurrency levels
- Channel subscription counts

## Testing Checklist for Claude Code

1. Open same account in two browser tabs
2. Update a field in one tab, verify instant update in other
3. Test couple updating wedding date, check supplier sees it
4. Disconnect internet, make changes, reconnect and verify sync
5. Have two users edit same field simultaneously
6. Test with 10+ users in same wedding
7. Verify mobile sync works properly
8. Test notification delivery across devices
9. Check performance with slow connection
10. Verify offline queue works correctly
11. Test reconnection after server restart
12. Verify presence indicators accuracy
13. Test real-time search updates
14. Check calendar sync across users
15. Test team collaboration features

## Common Issues to Prevent

1. Memory leaks from unclosed connections
2. Infinite sync loops
3. Lost updates during disconnection
4. Race conditions in concurrent edits
5. Channel subscription limits exceeded
6. Battery drain on mobile devices
7. Excessive server load from polling
8. Security vulnerabilities in channels
9. Sync storms from bulk updates
10. UI freezing during large syncs

## Priority Implementation Order

1. **Phase 1**: Basic WebSocket connection and auth
2. **Phase 2**: Core fields synchronization
3. **Phase 3**: Form and journey sync
4. **Phase 4**: Presence indicators
5. **Phase 5**: Offline queue system
6. **Phase 6**: Conflict resolution
7. **Phase 7**: Team collaboration
8. **Phase 8**: Performance optimization

## Sub-Agent Specific Instructions

### WebSocket Agent
- Establish Supabase Realtime connection
- Handle authentication and refresh
- Manage reconnection logic
- Implement heartbeat system
- Monitor connection health

### Sync Engine Agent
- Process incoming updates
- Queue outgoing changes
- Handle conflict resolution
- Manage offline queue
- Coordinate bulk updates

### UI Update Agent
- Apply DOM updates smoothly
- Animate changes visually
- Update presence indicators
- Manage notification display
- Handle loading states

### Conflict Resolution Agent
- Detect simultaneous edits
- Implement locking mechanism
- Merge non-conflicting changes
- Present resolution options
- Track resolution history

### Performance Agent
- Monitor sync metrics
- Optimize data payloads
- Implement debouncing
- Manage subscription limits
- Cache frequently accessed data

### Mobile Sync Agent
- Detect network conditions
- Optimize for battery life
- Compress data for cellular
- Handle app background/foreground
- Manage push notifications