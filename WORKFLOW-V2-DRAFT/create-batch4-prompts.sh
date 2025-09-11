#!/bin/bash

# Team A - WS-056 Guest List Builder
echo "Creating Team A prompts for WS-056..."

# Round 2
cat > OUTBOX/team-a/batch4/WS-056-batch4-round-2.md << 'PROMPT'
# TEAM A - ROUND 2: WS-056 - Guest List Builder - Enhancement & Polish

**Date:** 2025-08-21  
**Feature ID:** WS-056  
**Priority:** P1  
**Mission:** Add advanced features: bulk operations, smart suggestions, and Google Contacts import  

## 🎯 ROUND 2 DELIVERABLES

### Advanced Import Features:
- [ ] Google Contacts API integration
- [ ] Duplicate detection and merging
- [ ] Smart field mapping suggestions
- [ ] Import history and rollback

### Bulk Operations:
- [ ] Select multiple guests for category changes
- [ ] Bulk email/SMS sending preparation
- [ ] Export to various formats (CSV, PDF, Excel)
- [ ] Batch table assignments

### UI Enhancements:
- [ ] Advanced filtering (dietary, age, side)
- [ ] Search with fuzzy matching
- [ ] Keyboard shortcuts for power users
- [ ] Mobile-responsive drag-drop

### Performance Optimization:
- [ ] Virtual scrolling for 500+ guests
- [ ] Lazy loading households
- [ ] Optimistic UI updates
- [ ] Background import processing

**Success Criteria:** Handle 1000+ guests smoothly, <500ms operations
PROMPT

# Round 3
cat > OUTBOX/team-a/batch4/WS-056-batch4-round-3.md << 'PROMPT'
# TEAM A - ROUND 3: WS-056 - Guest List Builder - Integration & Finalization

**Date:** 2025-08-21  
**Feature ID:** WS-056  
**Priority:** P1  
**Mission:** Full integration with RSVP system, seating charts, and vendor coordination  

## 🎯 ROUND 3 DELIVERABLES

### System Integration:
- [ ] Connect to Team B's RSVP system (WS-057)
- [ ] Feed guest counts to Team D's budget tracker (WS-059)
- [ ] Sync with Team E's wedding website (WS-060)
- [ ] Export to vendor formats (catering, venue)

### Seating Chart Integration:
- [ ] Visual table assignment interface
- [ ] Relationship-based seating suggestions
- [ ] Capacity management per table
- [ ] Print-ready seating charts

### Final Polish:
- [ ] Complete E2E testing suite
- [ ] Performance validation with 2000 guests
- [ ] Accessibility WCAG AAA compliance
- [ ] Production deployment readiness

**Success Criteria:** Zero integration failures, all systems connected
PROMPT

# Team B - WS-057 RSVP Management
echo "Creating Team B prompts for WS-057..."

cat > OUTBOX/team-b/batch4/WS-057-batch4-round-1.md << 'PROMPT'
# TEAM B - ROUND 1: WS-057 - RSVP Management - Core Implementation

**Date:** 2025-08-21  
**Feature ID:** WS-057  
**Priority:** P1  
**Mission:** Build digital RSVP system with real-time tracking and meal preferences  

## 🎯 USER STORY

**As a:** Couple managing 150 wedding invitations
**I want to:** Send digital RSVPs and track responses in real-time
**So that:** I can finalize catering counts 2 weeks before the wedding

## 🎯 ROUND 1 DELIVERABLES

### Database:
- [ ] RSVP responses table with meal choices
- [ ] RSVP links table with unique tokens
- [ ] Response history tracking

### API:
- [ ] `/api/rsvp/[token]/route.ts` - Guest RSVP endpoint
- [ ] `/api/rsvp/send/route.ts` - Bulk RSVP sending
- [ ] `/api/rsvp/track/route.ts` - Response tracking

### Frontend:
- [ ] Public RSVP form (no auth required)
- [ ] RSVP tracking dashboard
- [ ] Real-time response updates
- [ ] Meal preference management

**Integration:** Links to Team A's guest list (WS-056)
PROMPT

cat > OUTBOX/team-b/batch4/WS-057-batch4-round-2.md << 'PROMPT'
# TEAM B - ROUND 2: WS-057 - RSVP Management - Enhancement

**Date:** 2025-08-21  
**Feature ID:** WS-057  
**Mission:** Add reminder system, custom questions, and analytics  

## 🎯 ROUND 2 DELIVERABLES

### Automation:
- [ ] Automated reminder emails
- [ ] Smart follow-up scheduling
- [ ] Response rate analytics
- [ ] Deadline management

### Customization:
- [ ] Custom RSVP questions
- [ ] Dietary restriction tracking
- [ ] Plus-one management
- [ ] Song requests feature

### Communication:
- [ ] Thank you auto-responses
- [ ] Waitlist management
- [ ] Change notifications
- [ ] Vendor export formats
PROMPT

cat > OUTBOX/team-b/batch4/WS-057-batch4-round-3.md << 'PROMPT'
# TEAM B - ROUND 3: WS-057 - RSVP Management - Integration

**Date:** 2025-08-21  
**Feature ID:** WS-057  
**Mission:** Complete integration with all wedding systems  

## 🎯 ROUND 3 DELIVERABLES

### Integration:
- [ ] Full sync with guest list (Team A)
- [ ] Feed to budget tracker (Team D)
- [ ] Display on wedding website (Team E)
- [ ] Seating chart connection

### Analytics:
- [ ] Response rate dashboards
- [ ] Meal preference reports
- [ ] Final headcount summaries
- [ ] No-show predictions

### Production:
- [ ] Load testing with 1000 RSVPs
- [ ] Mobile optimization
- [ ] Multi-language support
- [ ] Backup and recovery
PROMPT

# Team C - WS-058 Task Delegation
echo "Creating Team C prompts for WS-058..."

cat > OUTBOX/team-c/batch4/WS-058-batch4-round-1.md << 'PROMPT'
# TEAM C - ROUND 1: WS-058 - Task Delegation - Core Implementation

**Date:** 2025-08-21  
**Feature ID:** WS-058  
**Priority:** P1  
**Mission:** Build task delegation system for bridal party and family helpers  

## 🎯 USER STORY

**As a:** Bride overwhelmed with 47 wedding tasks
**I want to:** Delegate specific tasks to my bridal party and family
**So that:** I reduce stress and ensure nothing falls through the cracks

## 🎯 ROUND 1 DELIVERABLES

### Database:
- [ ] Tasks table with assignees
- [ ] Task categories and priorities
- [ ] Progress tracking schema

### API:
- [ ] Task CRUD operations
- [ ] Assignment notifications
- [ ] Progress updates

### Frontend:
- [ ] Task board interface
- [ ] Delegation workflow
- [ ] Helper dashboard
- [ ] Progress tracking
PROMPT

cat > OUTBOX/team-c/batch4/WS-058-batch4-round-2.md << 'PROMPT'
# TEAM C - ROUND 2: WS-058 - Task Delegation - Enhancement

**Date:** 2025-08-21  
**Feature ID:** WS-058  

## 🎯 ROUND 2 DELIVERABLES

### Collaboration:
- [ ] Comments and discussions
- [ ] File attachments
- [ ] Task dependencies
- [ ] Deadline reminders

### Templates:
- [ ] Pre-built task lists
- [ ] Role-based assignments
- [ ] Timeline templates
- [ ] Checklist generation
PROMPT

cat > OUTBOX/team-c/batch4/WS-058-batch4-round-3.md << 'PROMPT'
# TEAM C - ROUND 3: WS-058 - Task Delegation - Integration

**Date:** 2025-08-21  
**Feature ID:** WS-058  

## 🎯 ROUND 3 DELIVERABLES

### Integration:
- [ ] Connect to wedding timeline
- [ ] Vendor task coordination
- [ ] Budget impact tracking
- [ ] Mobile app for helpers

### Reporting:
- [ ] Task completion rates
- [ ] Helper workload balance
- [ ] Critical path analysis
- [ ] Final task reports
PROMPT

# Team D - WS-059 Budget Tracker
echo "Creating Team D prompts for WS-059..."

cat > OUTBOX/team-d/batch4/WS-059-batch4-round-1.md << 'PROMPT'
# TEAM D - ROUND 1: WS-059 - Budget Tracker - Core Implementation

**Date:** 2025-08-21  
**Feature ID:** WS-059  
**Priority:** P1  
**Mission:** Build comprehensive wedding budget tracking system  

## 🎯 USER STORY

**As a:** Couple with a $25,000 wedding budget
**I want to:** Track actual spending vs. planned budget by category
**So that:** I stay on budget and avoid the 30% average wedding overspend

## 🎯 ROUND 1 DELIVERABLES

### Database:
- [ ] Budget categories schema
- [ ] Transactions tracking
- [ ] Payment schedules

### API:
- [ ] Budget CRUD operations
- [ ] Transaction management
- [ ] Category analytics

### Frontend:
- [ ] Budget dashboard
- [ ] Category breakdown
- [ ] Spending alerts
- [ ] Payment tracking
PROMPT

cat > OUTBOX/team-d/batch4/WS-059-batch4-round-2.md << 'PROMPT'
# TEAM D - ROUND 2: WS-059 - Budget Tracker - Enhancement

**Date:** 2025-08-21  
**Feature ID:** WS-059  

## 🎯 ROUND 2 DELIVERABLES

### Analytics:
- [ ] Spending trends
- [ ] Budget forecasting
- [ ] Vendor comparisons
- [ ] Savings opportunities

### Automation:
- [ ] Receipt scanning
- [ ] Bank sync (read-only)
- [ ] Automatic categorization
- [ ] Payment reminders
PROMPT

cat > OUTBOX/team-d/batch4/WS-059-batch4-round-3.md << 'PROMPT'
# TEAM D - ROUND 3: WS-059 - Budget Tracker - Integration

**Date:** 2025-08-21  
**Feature ID:** WS-059  

## 🎯 ROUND 3 DELIVERABLES

### Integration:
- [ ] Guest count impact (Team A)
- [ ] RSVP cost updates (Team B)
- [ ] Vendor payment sync
- [ ] Final reconciliation

### Reporting:
- [ ] Detailed spend reports
- [ ] Category comparisons
- [ ] Budget vs actual
- [ ] Tax documentation
PROMPT

# Team E - WS-060 Wedding Website
echo "Creating Team E prompts for WS-060..."

cat > OUTBOX/team-e/batch4/WS-060-batch4-round-1.md << 'PROMPT'
# TEAM E - ROUND 1: WS-060 - Wedding Website Builder - Core Implementation

**Date:** 2025-08-21  
**Feature ID:** WS-060  
**Priority:** P1  
**Mission:** Build drag-drop wedding website builder with templates  

## 🎯 USER STORY

**As a:** Tech-savvy couple planning our wedding
**I want to:** Create a beautiful wedding website without hiring a developer
**So that:** Guests have all wedding info in one place and we save $800

## 🎯 ROUND 1 DELIVERABLES

### Database:
- [ ] Website configurations
- [ ] Page sections schema
- [ ] Custom domains support

### Builder:
- [ ] Drag-drop editor
- [ ] Template library
- [ ] Section components
- [ ] Preview system

### Frontend:
- [ ] Public website renderer
- [ ] Mobile-responsive themes
- [ ] RSVP integration
- [ ] Photo galleries
PROMPT

cat > OUTBOX/team-e/batch4/WS-060-batch4-round-2.md << 'PROMPT'
# TEAM E - ROUND 2: WS-060 - Wedding Website - Enhancement

**Date:** 2025-08-21  
**Feature ID:** WS-060  

## 🎯 ROUND 2 DELIVERABLES

### Features:
- [ ] Custom CSS editor
- [ ] Password protection
- [ ] Multi-language support
- [ ] SEO optimization

### Content:
- [ ] Story timeline
- [ ] Wedding party intros
- [ ] Registry links
- [ ] Travel information
PROMPT

cat > OUTBOX/team-e/batch4/WS-060-batch4-round-3.md << 'PROMPT'
# TEAM E - ROUND 3: WS-060 - Wedding Website - Integration

**Date:** 2025-08-21  
**Feature ID:** WS-060  

## 🎯 ROUND 3 DELIVERABLES

### Integration:
- [ ] Live RSVP display (Team B)
- [ ] Guest list sync (Team A)
- [ ] Photo sharing system
- [ ] Vendor information

### Launch:
- [ ] Custom domain setup
- [ ] SSL certificates
- [ ] CDN optimization
- [ ] Analytics tracking
PROMPT

echo "Batch 4 prompts created successfully!"
