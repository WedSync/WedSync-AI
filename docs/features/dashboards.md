Dashboards Documentation
Overview
WedSync has three distinct dashboard systems: Supplier Dashboard (WedSync), Couple Dashboard (WedMe), and Admin Dashboard (for platform management). Each dashboard is a complex orchestration of widgets, real-time data, and interactive components.
1. Supplier Dashboard (WedSync)
Core Architecture
Dashboard Container Structure
Main Dashboard Container
├── Top Navigation Bar (persistent)
├── Command Bar (search/quick actions)
├── Main Content Area
│   ├── Priority Widget Zone
│   ├── Activity Feed Zone
│   ├── Analytics Zone
│   └── Quick Actions Zone
├── Right Sidebar (contextual)
└── Mobile Bottom Navigation (mobile only)
Navigation Components
Top Navigation Menu Items
Fixed Order (left to right):

Dashboard (home icon) - Main dashboard view
Clients - Client management system
Forms - Form builder and responses
Journeys - Customer journey builder
Communications - Email/SMS/Calendar
Growth - Referrals, reviews, analytics

Right Side Navigation Elements
Fixed Order (right to left):

Account Menu - User profile dropdown
Settings - Gear icon
Help - Question mark icon
Notifications - Bell icon with count badge
Search - Magnifying glass (mobile: hidden)

Dashboard Widgets
Priority Widget (Top Center)
Purpose: Show what needs attention today
Data Requirements:

Fetch overdue tasks from supplier_tasks table
Query upcoming weddings from weddings table (next 48 hours)
Check unread form responses from form_submissions
Calculate journey delays from customer_journeys

Display Rules:

If wedding tomorrow: Show travel time calculator
If wedding today: Show live timeline
If forms overdue: Show with red badge
Otherwise: Show next 3 priorities

Sub-Agent Task: Priority Calculator
markdown1. Query all active tasks for supplier
2. Score each task by:
   - Overdue: +100 points
   - Due today: +50 points
   - Wedding related: +30 points
   - Client waiting: +20 points
3. Sort by score descending
4. Return top 5 items
5. Format with action buttons
Wedding Day Widget (Conditional)
Appears When: Wedding in next 48 hours
Components:

Venue name and address
Travel time with traffic (Google Maps API)
Leave by time (with buffer)
Key contacts list
Weather forecast
Checklist items
Quick navigation buttons

Sub-Agent Task: Travel Time Calculator
markdown1. Get venue address from core_fields
2. Get supplier's base address from profile
3. Call Google Maps Distance Matrix API
4. Add supplier's preferred buffer time (default 30 min)
5. Check for traffic patterns at that time
6. Display: "Leave by: 10:30 AM (28 min drive + buffer)"
7. Add button: "Get Directions" (opens in maps app)
Activity Feed Widget
Purpose: Real-time client activity stream
Data Sources:

client_activities table (real-time subscription)
form_submissions table (new responses)
email_events table (opens, clicks)
journey_progress table (milestone completions)

Display Format:
[Time] [Icon] [Client Name] [Action] [Object]
2 min ago 📝 Emma & James completed "Timeline Form"
Sub-Agent Task: Activity Aggregator
markdown1. Subscribe to Supabase realtime for supplier's clients
2. Listen for changes in:
   - form_submissions (INSERT)
   - email_events (INSERT where type='opened')
   - client_sessions (UPDATE where last_seen changes)
3. Format each event with:
   - Relative timestamp (2 min, 1 hour, yesterday)
   - Appropriate icon
   - Client name (linked to profile)
   - Action verb (completed, opened, viewed)
   - Object name (form title, email subject)
4. Limit to 10 most recent
5. Auto-refresh every 30 seconds
Quick Actions Grid
Purpose: One-click access to common tasks
Button Configuration:
Row 1:
- [+ New Client] - Opens client creation modal
- [📝 Create Form] - Opens form builder
- [📧 Send Email] - Opens email composer

Row 2:  
- [📊 View Reports] - Goes to analytics
- [📥 Import Clients] - Opens import wizard
- [🎯 Start Journey] - Journey assignment modal
Sub-Agent Task: Quick Action Handler
markdownFor each button:
1. Define onClick handler
2. Track usage in analytics
3. Show loading state during action
4. Handle errors gracefully
5. Show success toast notification
6. Update relevant widgets after action
Analytics Widgets
Performance Snapshot
Displays:

Form completion rate (percentage with trend arrow)
Active clients count (with week-over-week change)
Email open rate (30-day average)
Journey progress (average completion percentage)

Sub-Agent Task: Analytics Calculator
markdown1. Query last 30 days of data
2. Calculate:
   - Form completion: (completed / total_sent) * 100
   - Active clients: COUNT(DISTINCT client_id) WHERE last_activity > 7 days ago
   - Email open rate: (opened / sent) * 100
   - Journey progress: AVG(completion_percentage)
3. Compare to previous 30-day period
4. Calculate trend (up/down/flat)
5. Format with color coding:
   - Green: Improvement
   - Yellow: Flat (±5%)
   - Red: Decline
Mobile Responsiveness
Breakpoint Behaviors
Desktop (>1024px): Full dashboard with all widgets
Tablet (768-1024px): Stack widgets vertically, hide sidebar
Mobile (<768px): 
  - Hide top nav, show bottom nav
  - Single column layout
  - Collapsible widgets
  - Swipe between sections
Mobile Bottom Navigation
[Dashboard] [Clients] [+] [Forms] [More]
    📊        👥      ➕    📝      ⋯
2. Couple Dashboard (WedMe)
Dashboard Structure
Main Container Layout
WedMe Dashboard Container
├── Welcome Header (with countdown)
├── Supplier Connection Cards
├── Task List Section
├── Timeline/Calendar View
├── Progress Tracking
└── Resource Center
Core Widgets
Wedding Countdown Header
Display Format:
"Welcome Emma & James! 
147 days until your big day!
June 15, 2025 at The Barn at Grimsby"
Sub-Agent Task: Countdown Calculator
markdown1. Get wedding_date from core_fields
2. Calculate days remaining
3. If < 30 days: Show days + hours
4. If < 7 days: Show days + hours + minutes
5. If today: Show "TODAY IS THE DAY!" with confetti
6. Update every minute (today) or hourly (otherwise)
Supplier Connection Grid
Purpose: Show all connected suppliers with status
Card Layout (per supplier):
┌─────────────────────┐
│ [Logo/Icon]         │
│ Supplier Name       │
│ Type (Photography)  │
│ Status: ✅ Connected │
│ Tasks: 2 pending    │
│ [View] [Message]    │
└─────────────────────┘
Sub-Agent Task: Supplier Card Builder
markdown1. Query couple_suppliers table for all connections
2. For each supplier:
   - Get business info from suppliers table
   - Count pending tasks from tasks table
   - Check last activity from activities table
   - Determine connection status:
     * Connected (green): Has dashboard access
     * Partial (yellow): Email only
     * Invited (gray): Invitation sent
3. Sort by: Connected first, then by category
4. Display in responsive grid (3 cols desktop, 1 mobile)
Task Manager Widget
Purpose: Central place for all couple tasks
Task Sources:

Form submissions needed
Journey-triggered tasks
Meeting scheduling
Document reviews
Manual tasks from suppliers

Sub-Agent Task: Task Aggregator
markdown1. Query all task sources:
   - form_assignments WHERE status='pending'
   - journey_tasks WHERE due_date < NOW + 7 days
   - meeting_requests WHERE not confirmed
2. Merge and deduplicate
3. Sort by:
   - Overdue first (red)
   - Due today (orange)
   - Due this week (yellow)
   - Future (gray)
4. Group by supplier if > 10 tasks
5. Show estimated time for each task
6. Add "Complete" button with appropriate action
Timeline/Journey View
Purpose: Visual progress through wedding planning
Display Modes:

Timeline View: Horizontal timeline with milestones
Calendar View: Month view with tasks/events
List View: Chronological list of everything

Sub-Agent Task: Timeline Builder
markdown1. Get all journeys for couple from customer_journeys
2. Extract all scheduled events/tasks
3. Add to timeline with:
   - Date/time
   - Supplier name
   - Task type (form, meeting, milestone)
   - Status (completed, pending, future)
4. Calculate position on timeline
5. Show progress line to current date
6. Highlight next upcoming item
7. Allow filtering by supplier/type
Progress Tracking
Overall Progress Bar
Planning Progress: 67% Complete
████████████████████░░░░░░░░
Sub-Agent Task: Progress Calculator
markdown1. Define progress categories:
   - Venue booked: 10%
   - Vendors hired: 30%
   - Guest list finalized: 10%
   - Invitations sent: 10%
   - Forms completed: 20%
   - Final details: 20%
2. Check completion of each category
3. Weight by importance
4. Calculate total percentage
5. Show category breakdown on hover
3. Admin Dashboard
Critical Metrics Section
Real-Time KPIs Grid
Layout: 2x2 grid of metric cards
Card 1: MRR (Monthly Recurring Revenue)
Current: £46,847
Change: ↑ 12.3%
New MRR: +£4,230
Churned: -£1,403
Sub-Agent Task: MRR Calculator
markdown1. Query subscriptions table WHERE status='active'
2. Sum by plan_price
3. Compare to same query 30 days ago
4. Calculate components:
   - New: New subscriptions this month
   - Expansion: Upgrades - downgrades
   - Churned: Cancelled subscriptions
   - Net: New + Expansion - Churned
5. Update every hour
6. Cache results for performance
System Health Monitor
Components:

Database latency gauge
API response times
Error rate percentage
Active user count
Server CPU/Memory usage

Sub-Agent Task: Health Monitor
markdown1. Set up monitoring endpoints:
   - /api/health/database - Test query time
   - /api/health/api - Check response time
   - /api/health/errors - Count recent errors
2. Poll every 30 seconds
3. Calculate rolling averages
4. Set thresholds:
   - Green: All normal
   - Yellow: One metric degraded
   - Red: Critical issue
5. Send alerts if red for > 5 minutes
6. Log to monitoring table
Viral Coefficient Dashboard
Viral Score Display
Viral Score: 73% 🟢
K-Factor: 1.67
Doubling Time: 47 days
Sub-Agent Task: Viral Calculator
markdown1. Calculate supplier → couple flow:
   - Count suppliers who invited couples
   - Count couples who joined
   - Calculate conversion rate
2. Calculate couple → supplier flow:
   - Count couples who invited suppliers
   - Count suppliers who joined
   - Calculate conversion rate
3. Apply formula: K = (i1 × c1) + (i2 × c2)
   Where:
   - i = invitations sent
   - c = conversion rate
4. Convert to 0-100 score
5. Calculate doubling time from K-factor
6. Update daily at midnight
User Segmentation
Segment Display Cards
Show for each segment:

Power Users (top 10%)
Growing (middle 30%)
At Risk (bottom 25%)
Churned (cancelled)

Sub-Agent Task: Segmentation Engine
markdown1. Calculate engagement score per user:
   - Login frequency (daily = 10, weekly = 5, monthly = 1)
   - Feature usage count
   - Client invitations sent
   - Forms created
   - Journey completion
2. Segment by percentiles
3. For each segment calculate:
   - Average revenue
   - Churn risk
   - Feature usage
   - Support tickets
4. Identify patterns
5. Generate recommendations
Dashboard State Management
Using Zustand Store
Store Structure:
javascriptdashboardStore = {
  // Widget visibility
  widgetStates: {
    priority: 'expanded',
    activity: 'collapsed',
    analytics: 'expanded'
  },
  
  // Data caches
  cachedMetrics: {},
  lastUpdated: {},
  
  // User preferences
  preferences: {
    defaultView: 'dashboard',
    autoRefresh: true,
    refreshInterval: 30
  }
}
Sub-Agent Task: State Manager
markdown1. Create Zustand store with:
   - Widget visibility states
   - Data caching layer
   - Refresh intervals
   - Error states
2. Implement actions:
   - toggleWidget(widgetId)
   - refreshData(widgetId)
   - updatePreference(key, value)
3. Persist preferences to localStorage
4. Sync with database every 5 minutes
Real-Time Updates
Supabase Realtime Subscriptions
Sub-Agent Task: Realtime Manager
markdown1. Set up subscriptions for:
   - client_activities (INSERT)
   - form_submissions (INSERT, UPDATE)
   - email_events (INSERT)
   - journey_progress (UPDATE)
2. Handle connection states:
   - Connected: Show green dot
   - Reconnecting: Show yellow dot
   - Disconnected: Show red dot, queue updates
3. Implement exponential backoff for reconnection
4. Batch updates to prevent UI thrashing
5. Maximum 1 re-render per second
Performance Optimization
Widget Lazy Loading
Sub-Agent Task: Performance Optimizer
markdown1. Implement React.lazy for each widget
2. Load priority widget immediately
3. Load visible widgets on mount
4. Load below-fold widgets on scroll
5. Virtualize long lists (>50 items)
6. Implement skeleton loaders
7. Cache API responses for 5 minutes
8. Use React Query for data fetching
9. Debounce search inputs (300ms)
10. Throttle scroll handlers (100ms)
Error Handling
Dashboard Error States
Sub-Agent Task: Error Handler
markdown1. Define error boundaries for each widget
2. If widget fails:
   - Show error state in that widget only
   - Log error to Sentry
   - Show "Retry" button
   - Don't crash entire dashboard
3. If API fails:
   - Show cached data if available
   - Display "Offline mode" banner
   - Queue actions for when online
4. If database fails:
   - Switch to read-only mode
   - Show maintenance message
   - Redirect to status page
Implementation Priority
Phase 1: Core Dashboard (Week 1)

Basic layout and navigation
Priority widget
Activity feed
Simple metrics

Phase 2: Real-time Features (Week 2)

Supabase subscriptions
Live activity updates
Auto-refresh logic
State management

Phase 3: Advanced Widgets (Week 3)

Wedding day calculator
Analytics widgets
Timeline views
Progress tracking

Phase 4: Optimization (Week 4)

Lazy loading
Caching layer
Error boundaries
Performance monitoring