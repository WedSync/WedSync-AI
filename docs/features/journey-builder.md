# Customer Journey Builder - Complete Implementation Guide

## Overview
The Customer Journey Builder is a visual automation system that lets wedding suppliers create automated workflows for client communication and task management. Think of it like a flowchart that automatically sends emails, assigns tasks, and manages the entire client experience from booking to post-wedding.

## Core Components

### 1. Visual Canvas Interface
**Location**: `/app/(supplier)/journeys/builder`

#### Main Canvas Area
- Horizontal timeline layout (left to right flow)
- Zoom controls (50%, 75%, 100%, 125%, 150%)
- Pan/drag to navigate large journeys
- Grid snap for neat alignment
- Minimap in bottom-right corner
- Auto-arrange button to clean up layout

#### Timeline Nodes (Anchor Points)
**Node Types**:
- Start Node (green circle - "Journey Begins")
- Time-Based Nodes (clock icon - "6 Weeks Before Wedding")
- Event Nodes (flag icon - "Form Completed", "Payment Received")
- End Node (red circle - "Journey Complete")

**Time-Based Triggers**:
- Relative to wedding date (X days/weeks/months before/after)
- Relative to booking date
- Specific calendar dates
- Business days only option
- Skip weekends option

#### Module Palette (Left Sidebar)
**Communication Modules**:
- Email Module (send templated emails)
- SMS Module (text messages via Twilio)
- WhatsApp Module (messages via WhatsApp Business)

**Form Modules**:
- Send Form (trigger form completion)
- Form Reminder (if not completed)
- Form Complete Check (conditional logic)

**Task Modules**:
- Create Task (internal reminders)
- Assign Task (team members)
- Task Complete Check

**Meeting Modules**:
- Send Booking Link
- Meeting Reminder
- Post-Meeting Follow-up

**Logic Modules**:
- Wait/Delay (pause journey)
- Condition Check (if-then logic)
- Split Path (A/B testing)
- Merge Paths (rejoin split paths)

**Special Modules**:
- Add Tag (categorize clients)
- Update Status (change client status)
- Send to Another Journey
- Webhook (external integrations)

### 2. Module Configuration

#### Email Module Settings
**Sub-agent instructions**: When building email module, create these fields:

**Basic Settings**:
- Email Template Selector (dropdown of saved templates)
- Subject Line (with merge tags like {{couple_names}})
- Preview Text (appears in inbox)
- From Name (business name or personal)
- Reply-To Address

**Content Editor**:
- Rich text editor with formatting tools
- Image upload/insertion
- Button/CTA insertion
- Merge tags panel (shows available variables)
- Preview mode (desktop/mobile)

**Advanced Settings**:
- Send Time (immediate or scheduled time)
- Time Zone (client's or fixed)
- Tracking (open/click tracking toggles)
- Attachments (PDFs, documents)

#### SMS/WhatsApp Module Settings
**Sub-agent instructions**: Create character counter and cost calculator:

- Message composer (160 character segments for SMS)
- Character counter with segment indicator
- Merge tags support
- Media attachments (WhatsApp only)
- Cost preview based on message length
- Opt-out compliance check

#### Form Module Settings
- Select form from dropdown
- Due date setting (X days to complete)
- Reminder schedule (after 3, 7, 14 days)
- Completion actions (what happens next)
- Partial completion handling

#### Wait/Delay Module Settings
- Wait duration (hours, days, weeks, months)
- Wait until specific time (9 AM, afternoon, evening)
- Business hours only option
- Skip weekends option
- Holiday calendar integration

### 3. Conditional Logic System

#### Condition Builder
**Sub-agent instructions**: Create visual condition builder with:

**Condition Types**:
- Form Field Values ("If venue type equals 'outdoor'")
- Client Properties ("If tag contains 'VIP'")
- Date Comparisons ("If wedding date is less than 30 days")
- Previous Actions ("If email was opened")
- External Data ("If weather forecast shows rain")

**Logic Operators**:
- AND (all conditions must be true)
- OR (any condition can be true)
- NOT (condition must be false)
- Nested groups with parentheses

**Actions Based on Conditions**:
- Send different email
- Skip modules
- Jump to different path
- Add/remove tags
- Update client status

### 4. Journey Templates

#### Pre-built Journey Templates

**Photography Journey Template**:
1. Welcome email (immediate)
2. Contract & questionnaire (day 1)
3. Contract reminder (day 3 if not signed)
4. Engagement session scheduler (2 months before)
5. Timeline planner (6 weeks before)
6. Family photo list (4 weeks before)
7. Final details (1 week before)
8. Day-before check-in (1 day before)
9. Thank you message (3 days after)
10. Sneak peek delivery (1 week after)
11. Full gallery delivery (4 weeks after)
12. Album design invite (6 weeks after)
13. Anniversary message (1 year after)

**DJ/Band Journey Template**:
1. Welcome & portal access
2. Music preference form
3. Special songs planner
4. Do-not-play list
5. Timeline coordination
6. Equipment requirements
7. Venue check-in
8. Day-of confirmation
9. Thank you & review request

**Venue Journey Template**:
1. Booking confirmation
2. Vendor list sharing
3. Menu tasting scheduler
4. Layout planning
5. Final numbers request
6. Setup schedule
7. Day-of coordination

#### Template Management
- Save any journey as template
- Edit templates without affecting active journeys
- Share templates to marketplace (Scale+ tier)
- Import templates from marketplace
- Version control for templates

### 5. Journey Execution Engine

#### Journey Activation
**Sub-agent instructions**: Build activation flow:

1. Select clients to add to journey
2. Choose start date (immediate or scheduled)
3. Set journey parameters (wedding date, etc.)
4. Preview timeline with actual dates
5. Confirm and activate

#### Execution Monitoring
**Real-time Journey View**:
- See where each client is in journey
- Upcoming actions in next 7 days
- Completed actions history
- Failed actions alerts
- Paused journeys indicator

#### Journey States
- **Draft** (being built, not active)
- **Active** (running for clients)
- **Paused** (temporarily stopped)
- **Completed** (reached end node)
- **Archived** (no longer used)

### 6. Client Journey Dashboard

#### Journey Overview Screen
**Location**: `/app/(supplier)/journeys`

**Metrics Display**:
- Total active journeys
- Clients in journeys
- Actions scheduled today
- Completion rate
- Average journey duration

**Journey List View**:
- Journey name and status
- Number of active clients
- Last edited date
- Performance metrics
- Quick actions (edit, duplicate, archive)

#### Individual Journey Analytics
- Funnel visualization (how many complete each stage)
- Drop-off points identification
- Average time between stages
- Module performance (open rates, completion rates)
- A/B test results

### 7. Testing & Preview

#### Test Mode
**Sub-agent instructions**: Create test environment:

- Test with dummy client data
- Time travel (simulate future dates)
- Fast forward through delays
- See all possible paths
- Test condition logic
- Preview all emails/SMS
- Verify form triggers

#### Journey Simulator
- Input sample client data
- Watch journey execute step-by-step
- See which paths would be taken
- Preview all communications
- Identify potential issues

### 8. Multi-Journey Management

#### Journey Coordination
**Sub-agent instructions**: Handle multiple active journeys:

- Clients can be in multiple journeys
- Priority settings for conflicting actions
- Merge duplicate actions (don't send 2 emails same day)
- Journey dependencies (complete one before starting another)

#### Journey Transitions
- End one journey → Start another
- Conditional journey switching
- Manual journey assignment
- Bulk journey operations

### 9. Integration Points

#### Form System Integration
- Forms trigger journey progression
- Form fields available as merge tags
- Conditional logic based on form responses
- Form reminder automation

#### Calendar Integration
- Meeting bookings trigger journey events
- Available dates from calendar
- Automatic meeting reminders
- Post-meeting follow-ups

#### Email System Integration
- Use email templates in journey
- Track email engagement
- Trigger actions based on opens/clicks
- Unsubscribe handling

### 10. Mobile Experience

#### Mobile Journey Management
**Sub-agent instructions**: Build responsive mobile view:

- View journey status
- See upcoming actions
- Pause/resume journeys
- Add clients to journey
- View basic analytics
- Receive push notifications for failures

Note: Full journey builder requires desktop (too complex for mobile)

### 11. Performance Optimization

#### Caching Strategy
- Cache journey structure
- Pre-calculate upcoming actions
- Store frequently used templates
- Optimize condition checking

#### Execution Efficiency
- Batch similar actions (send all 9 AM emails together)
- Queue management for large volumes
- Retry failed actions automatically
- Error handling and logging

### 12. Advanced Features

#### A/B Testing
**Sub-agent instructions**: Build split testing:

- Create variant paths (A/B or A/B/C)
- Set split percentages (50/50, 70/30, etc.)
- Define success metrics
- Automatic winner selection
- Roll out winning variant

#### Dynamic Content
- Personalization based on client data
- Dynamic sections in emails
- Conditional content blocks
- Language preferences
- Seasonal variations

#### External Integrations
- Webhook support for external systems
- Zapier integration
- API triggers
- Custom code execution (Enterprise only)

### 13. Troubleshooting Tools

#### Journey Debugger
**Sub-agent instructions**: Create debugging interface:

- Step-through execution
- Variable inspection
- Condition evaluation viewer
- Error log display
- Performance profiler

#### Health Monitoring
- Failed action alerts
- Stuck journey detection
- Performance degradation warnings
- Queue backup alerts

### 14. Compliance & Privacy

#### Data Handling
- GDPR compliance for journey data
- Unsubscribe honors across all journeys
- Data retention policies
- Audit trail of all actions

#### Communication Compliance
- CAN-SPAM compliance
- SMS opt-in verification
- WhatsApp Business policies
- Time zone respect
- Do not disturb hours

## Testing Checklist for Claude Code

1. Create simple 3-step journey (email → wait → email)
2. Add conditional logic based on form response
3. Test time-based triggers with different dates
4. Verify email sends correctly with merge tags
5. Test SMS module with character counting
6. Add multiple clients to journey
7. Test pause and resume functionality
8. Verify analytics tracking works
9. Test A/B split functionality
10. Export journey as template
11. Import and customize template
12. Test mobile view of journey status
13. Verify error handling for failed actions
14. Test journey completion and archiving
15. Check performance with 100+ clients in journey

## Common Issues to Prevent

1. Prevent infinite loops in journey logic
2. Handle timezone differences correctly
3. Respect communication time preferences
4. Prevent duplicate actions on same day
5. Handle missing merge tag data gracefully
6. Validate SMS phone numbers before sending
7. Check email deliverability before sending
8. Handle journey version updates for active clients
9. Prevent deletion of journeys with active clients
10. Ensure proper cleanup of completed journeys

## Priority Implementation Order

1. **Phase 1**: Basic journey canvas with email modules
2. **Phase 2**: Time-based triggers and wait modules
3. **Phase 3**: Conditional logic and branching
4. **Phase 4**: Form and calendar integration
5. **Phase 5**: SMS/WhatsApp modules
6. **Phase 6**: Analytics and A/B testing
7. **Phase 7**: Templates and marketplace
8. **Phase 8**: Advanced features and external integrations

## Sub-Agent Specific Instructions

### Canvas Builder Agent
- Use drag-and-drop library (dnd-kit)
- Implement zoom/pan controls
- Create connection lines between nodes
- Handle module snapping to grid
- Manage canvas state in Zustand store

### Email Template Agent
- Build rich text editor
- Implement merge tag system
- Create mobile preview
- Handle image uploads
- Generate HTML/text versions

### Execution Engine Agent
- Build queue system for actions
- Implement retry logic
- Handle timezone conversions
- Create batch processing
- Log all actions to database

### Analytics Agent
- Track journey metrics
- Build funnel visualizations
- Calculate conversion rates
- Generate performance reports
- Create exportable data

### Testing Agent
- Create test data generator
- Build journey simulator
- Implement time travel feature
- Generate test reports
- Validate journey logic