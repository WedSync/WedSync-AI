# TEAM A - ROUND 1: WS-190 - Incident Response Procedures
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive incident response dashboard with real-time security monitoring, GDPR compliance tracking, and interactive incident management interfaces
**FEATURE ID:** WS-190 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time security incident visualization, emergency response workflows, and compliance deadline management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/admin/security/
cat $WS_ROOT/wedsync/src/components/admin/security/IncidentDashboard.tsx | head -20
ls -la $WS_ROOT/wedsync/src/components/security/incident/
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test incident-dashboard
npm test security-components
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

// Query security dashboard and incident patterns
await mcp__serena__search_for_pattern("security.*dashboard|incident.*response|admin.*security");
await mcp__serena__find_symbol("SecurityDashboard", "", true);
await mcp__serena__get_symbols_overview("src/components/admin/");
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
- **Real-time Updates**: WebSocket/Supabase Realtime for incident updates
- **Data Visualization**: Charts.js or D3.js for incident timeline visualization

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to security dashboards and incident response
# Use Ref MCP to search for security dashboard patterns, real-time updates, compliance UI
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Dashboard Architecture
```typescript
// Use for complex UI architecture decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This incident response dashboard needs to display critical security information in real-time while maintaining clarity during high-stress emergency situations. I need to design interfaces that help security administrators quickly assess threats, track GDPR compliance deadlines, and coordinate response actions across multiple teams. The UI must be accessible 24/7 and work perfectly under pressure during actual security incidents.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **react-ui-specialist** - Design security dashboard components
2. **ui-ux-designer** - Create emergency response workflows
3. **security-compliance-officer** - Ensure GDPR compliance UI
4. **performance-optimization-expert** - Optimize real-time updates
5. **test-automation-architect** - Test emergency scenarios
6. **documentation-chronicler** - Document security procedures

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **Role-based Access Control** - Different views for security levels
- [ ] **Audit Trail Visibility** - All actions logged and displayed
- [ ] **Secure Data Display** - No sensitive data in client-side logs
- [ ] **Emergency Access Patterns** - Quick access during incidents
- [ ] **Session Security** - Auto-logout during security incidents
- [ ] **Screen Lock Protection** - Automatic screen protection
- [ ] **Accessibility Security** - Screen reader compliance for 24/7 teams

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Admin navigation link for "Security Incidents"
- [ ] Mobile security dashboard access
- [ ] Emergency access shortcuts
- [ ] Breadcrumb navigation for incident details
- [ ] Quick access from main admin dashboard

## 🎯 TEAM-SPECIFIC REQUIREMENTS

### TEAM A SPECIALIZATION: **FRONTEND/UI FOCUS**

**UI ARCHITECTURE:**
- Real-time incident response dashboard with severity-based alerts
- Interactive incident timeline with forensic evidence preservation
- GDPR compliance tracking with countdown timers
- Emergency response workflow interfaces
- Mobile-optimized security monitoring
- Accessibility-compliant 24/7 monitoring interfaces

**WEDDING SECURITY CONTEXT:**
- Display guest data breach impact during incident response
- Show venue security integration status
- Track wedding season incident patterns
- Display couple communication preferences during incidents
- Monitor supplier security connection health

## 📋 TECHNICAL SPECIFICATION ANALYSIS

Based on WS-190 specification:

### Frontend Requirements:
1. **Incident Dashboard**: Real-time security incident monitoring with severity colors
2. **Timeline Visualization**: Interactive incident response phase tracking
3. **GDPR Compliance UI**: Breach notification deadline countdown
4. **Emergency Workflows**: P1 incident emergency response interfaces
5. **Evidence Management**: Forensic evidence preservation tracking

### Component Architecture:
```typescript
// Main Dashboard Component
interface IncidentDashboardProps {
  currentIncidents: SecurityIncident[];
  userRole: 'security_lead' | 'incident_commander' | 'technical_lead';
  realTimeUpdates: boolean;
}

// Timeline Component
interface IncidentTimelineProps {
  incident: SecurityIncident;
  timelineEntries: TimelineEntry[];
  isLive: boolean;
}

// GDPR Compliance Tracker
interface GDPRComplianceProps {
  breachNotifications: BreachNotification[];
  complianceDeadlines: ComplianceDeadline[];
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY DELIVERABLES:
- [ ] **Incident Dashboard**: Real-time security monitoring interface
- [ ] **Timeline Visualization**: Interactive incident response tracking
- [ ] **GDPR Compliance Tracker**: Breach notification deadline management
- [ ] **Emergency Response UI**: P1 incident rapid response interface
- [ ] **Mobile Security Dashboard**: Touch-optimized security monitoring

### FILE STRUCTURE TO CREATE:
```
src/components/admin/security/
├── IncidentDashboard.tsx           # Main incident monitoring dashboard
├── IncidentTimeline.tsx            # Interactive incident timeline
├── GDPRComplianceTracker.tsx       # Compliance deadline tracking
├── EmergencyResponsePanel.tsx      # P1 incident emergency interface
└── SecurityMetricsOverview.tsx     # Security health metrics

src/components/security/incident/
├── IncidentCard.tsx                # Individual incident display card
├── SeverityIndicator.tsx           # Incident severity visualization
├── ContainmentActions.tsx          # Containment action buttons
├── EvidencePreservation.tsx        # Forensic evidence tracking
└── NotificationCenter.tsx          # Security alert notifications

src/components/mobile/security/
├── MobileIncidentDashboard.tsx     # Mobile security monitoring
├── EmergencyResponseMobile.tsx     # Mobile emergency response
└── SecurityAlertsMobile.tsx       # Mobile security notifications
```

### REAL-TIME FEATURES:
- [ ] WebSocket connection for live incident updates
- [ ] Auto-refresh every 30 seconds for critical data
- [ ] Push notifications for P1 incidents
- [ ] Real-time compliance countdown timers
- [ ] Live evidence preservation status

## 💾 WHERE TO SAVE YOUR WORK
- Dashboard Components: $WS_ROOT/wedsync/src/components/admin/security/
- Incident Components: $WS_ROOT/wedsync/src/components/security/incident/
- Mobile Components: $WS_ROOT/wedsync/src/components/mobile/security/
- Types: $WS_ROOT/wedsync/src/types/security-incidents.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/security/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Real-time incident dashboard implemented
- [ ] Interactive timeline visualization created
- [ ] GDPR compliance tracking UI operational
- [ ] Emergency response workflows implemented
- [ ] Mobile security dashboard functional
- [ ] Role-based access control implemented
- [ ] Real-time updates working via WebSocket
- [ ] Accessibility compliance verified
- [ ] Navigation integration complete
- [ ] Security requirements implemented
- [ ] TypeScript compilation successful
- [ ] All component tests passing
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 🚨 CRITICAL SUCCESS CRITERIA

### REAL-TIME PERFORMANCE:
- Dashboard updates within 5 seconds of incident changes
- P1 incident alerts display within 30 seconds
- Timeline visualization renders in <2 seconds
- Mobile dashboard loads in <3 seconds

### EMERGENCY USABILITY:
- All critical actions accessible within 2 clicks
- Emergency workflows clear and intuitive
- High contrast mode for 24/7 monitoring
- Touch-friendly mobile emergency response

### WEDDING CONTEXT AWARENESS:
- Guest data impact clearly displayed during incidents
- Wedding season traffic patterns visualized
- Venue security integration status monitoring
- Couple communication preferences respected

## 🎨 UI/UX DESIGN REQUIREMENTS

### Color Coding for Security Incidents:
- **P1 Critical**: Red (#DC2626) - Immediate response required
- **P2 High**: Orange (#EA580C) - Urgent attention needed  
- **P3 Medium**: Yellow (#CA8A04) - Standard response
- **P4 Low**: Blue (#2563EB) - Routine monitoring

### Dashboard Layout:
```
┌─────────────────┬──────────────────┐
│ Active Incidents│ GDPR Compliance  │
│ (Real-time)     │ Countdown        │
├─────────────────┼──────────────────┤
│ Incident        │ Emergency        │
│ Timeline        │ Response         │
│ (Interactive)   │ Actions          │
└─────────────────┴──────────────────┘
```

### Mobile Responsive Breakpoints:
- **Desktop**: Full dashboard with all panels
- **Tablet**: Stacked panels with swipe navigation
- **Mobile**: Single column with priority-based display

---

**EXECUTE IMMEDIATELY - Build bulletproof security dashboards for wedding data protection!**