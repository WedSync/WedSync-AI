# TEAM B - ROUND 1: WS-190 - Incident Response Procedures
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build automated incident response engine with security detection, GDPR compliance automation, and forensic evidence preservation systems
**FEATURE ID:** WS-190 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about automated security response, evidence chain of custody, and regulatory compliance automation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/security/
cat $WS_ROOT/wedsync/src/lib/security/incident-response-system.ts | head -20
ls -la $WS_ROOT/wedsync/src/app/api/security/incidents/
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test incident-response-system
npm test security-api
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

// Query security and API patterns
await mcp__serena__search_for_pattern("security.*api|incident.*response|automated.*security");
await mcp__serena__find_symbol("SecurityService", "", true);
await mcp__serena__get_symbols_overview("src/lib/security/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to incident response automation
# Use Ref MCP to search for security automation patterns, GDPR compliance APIs
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Security Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This incident response system must automatically detect, classify, and respond to security threats within minutes while preserving forensic evidence and maintaining GDPR compliance. I need to build systems that can handle P1 incidents affecting millions of wedding users, automatically contain threats, preserve chain of custody for evidence, and generate compliance reports within regulatory deadlines.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **security-compliance-officer** - Design GDPR compliance automation
2. **api-architect** - Create secure incident response APIs
3. **performance-optimization-expert** - Optimize automated response times
4. **postgresql-database-expert** - Design incident tracking schema
5. **test-automation-architect** - Test security response scenarios
6. **documentation-chronicler** - Document security procedures

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all incident APIs
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all incident data
- [ ] **Audit logging** - Log all security operations with user context
- [ ] **Evidence integrity** - Cryptographic hashing for forensic data
- [ ] **Encrypted storage** - All incident data encrypted at rest

## 🎯 TEAM-SPECIFIC REQUIREMENTS

### TEAM B SPECIALIZATION: **BACKEND/API FOCUS**

**API ARCHITECTURE:**
- Automated incident detection and classification engine
- Real-time threat containment and response automation
- GDPR compliance automation with deadline tracking
- Forensic evidence preservation with chain of custody
- Security API endpoints with comprehensive validation
- Database operations with encrypted incident storage

**WEDDING SECURITY CONTEXT:**
- Detect threats against guest personal data (PII protection)
- Automate venue security coordination during incidents
- Handle wedding season traffic spikes during security events
- Protect couple communication preferences during response
- Coordinate with supplier security systems automatically

## 📋 TECHNICAL SPECIFICATION ANALYSIS

Based on WS-190 specification:

### Backend Requirements:
1. **Incident Response Engine**: Automated detection, classification, and response
2. **GDPR Compliance System**: Breach notification automation within 72 hours
3. **Evidence Preservation**: Forensic data collection with chain of custody
4. **Emergency Containment**: P1 incident automated containment within 5 minutes
5. **Database Operations**: Incident tracking with timeline and compliance data

### API Architecture:
```typescript
// POST /api/security/incidents - Create new incident
interface CreateIncidentRequest {
  type: 'security_breach' | 'data_leak' | 'system_failure';
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  description: string;
  affectedSystems: string[];
  evidenceData?: Record<string, any>;
}

// GET /api/security/incidents - List incidents with filtering
interface ListIncidentsQuery {
  severity?: string;
  status?: string;
  dateRange?: { start: string; end: string };
  containsPII?: boolean;
}

// POST /api/security/incidents/{id}/containment - Execute containment
interface ContainmentRequest {
  actions: ContainmentAction[];
  emergencyMode: boolean;
  preserveEvidence: boolean;
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY DELIVERABLES:
- [ ] **Incident Response System**: Core automated response engine
- [ ] **Security APIs**: Complete incident management endpoints
- [ ] **GDPR Compliance Engine**: Automated compliance tracking
- [ ] **Evidence Preservation Service**: Forensic data collection
- [ ] **Database Migration**: Incident tracking schema implementation

### FILE STRUCTURE TO CREATE:
```
src/lib/security/
├── incident-response-system.ts     # Core incident response engine
├── gdpr-compliance-engine.ts       # Automated compliance tracking
├── evidence-preservation.ts        # Forensic evidence collection
├── threat-detection.ts             # Automated threat detection
└── containment-actions.ts          # Emergency containment procedures

src/app/api/security/
├── incidents/
│   ├── route.ts                    # GET/POST /api/security/incidents
│   ├── [id]/
│   │   ├── route.ts               # GET/PUT /api/security/incidents/{id}
│   │   ├── containment/
│   │   │   └── route.ts           # POST containment actions
│   │   ├── timeline/
│   │   │   └── route.ts           # GET incident timeline
│   │   └── evidence/
│   │       └── route.ts           # GET/POST evidence data
├── alerts/
│   └── route.ts                   # POST /api/security/alerts
└── compliance/
    ├── gdpr/
    │   └── route.ts               # GET GDPR compliance status
    └── breach-notifications/
        └── route.ts               # POST breach notifications

supabase/migrations/
├── 20250120000001_security_incidents.sql        # Main incidents table
├── 20250120000002_incident_timeline.sql         # Timeline tracking
├── 20250120000003_breach_notifications.sql      # GDPR compliance
└── 20250120000004_incident_response_rules.sql   # Automated response rules
```

### AUTOMATED RESPONSE FEATURES:
- [ ] P1 incident auto-containment within 5 minutes
- [ ] GDPR breach notification preparation within 72 hours
- [ ] Forensic evidence auto-collection and preservation
- [ ] Real-time threat classification and severity assessment
- [ ] Automated stakeholder notification based on severity

## 💾 WHERE TO SAVE YOUR WORK
- Security Libraries: $WS_ROOT/wedsync/src/lib/security/
- API Routes: $WS_ROOT/wedsync/src/app/api/security/
- Database Migrations: $WS_ROOT/wedsync/supabase/migrations/
- Types: $WS_ROOT/wedsync/src/types/security-incidents.ts
- Tests: $WS_ROOT/wedsync/__tests__/lib/security/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Incident response engine implemented with automated detection
- [ ] Security APIs created with comprehensive validation
- [ ] GDPR compliance automation operational
- [ ] Evidence preservation system with chain of custody
- [ ] Database schema deployed with all required tables
- [ ] P1 emergency containment procedures automated
- [ ] Real-time incident classification working
- [ ] All API endpoints secured with proper authentication
- [ ] Forensic evidence encryption implemented
- [ ] Automated response rules configurable
- [ ] TypeScript compilation successful
- [ ] All security tests passing
- [ ] Security requirements implemented
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 🚨 CRITICAL SUCCESS CRITERIA

### AUTOMATED RESPONSE PERFORMANCE:
- Incident detection: < 60 seconds from alert
- P1 containment initiation: < 5 minutes
- GDPR compliance preparation: < 72 hours
- Evidence preservation: < 2 minutes from incident

### SECURITY COMPLIANCE:
- All incident data encrypted at rest and in transit
- Chain of custody maintained for all forensic evidence
- GDPR Article 33/34 requirements automated
- Role-based access control for all incident data

### WEDDING CONTEXT AWARENESS:
- Guest PII protection prioritized in all responses
- Wedding season scalability for traffic spikes
- Venue security integration automated
- Couple notification preferences respected

## 🔧 IMPLEMENTATION EXAMPLE

### Core Incident Response System:
```typescript
export class IncidentResponseSystem {
  async handleSecurityAlert(alert: SecurityAlert): Promise<IncidentResponse> {
    // 1. Validate and classify threat
    const severity = await this.assessThreatSeverity(alert);
    const isValidThreat = await this.validateThreat(alert);
    
    if (!isValidThreat) {
      await this.logFalsePositive(alert);
      return { handled: true, falsePositive: true };
    }

    // 2. Create incident with forensic evidence
    const incident = await this.createIncident({
      type: alert.type,
      severity,
      title: alert.description,
      affectedSystems: alert.affectedSystems,
      evidenceData: await this.collectEvidence(alert)
    });

    // 3. Execute automated containment for P1 incidents
    if (severity === 'P1') {
      await this.executeEmergencyContainment(incident);
    }

    // 4. Check GDPR notification requirements
    if (await this.containsPII(alert.affectedSystems)) {
      await this.initiateGDPRCompliance(incident);
    }

    // 5. Start incident timeline tracking
    await this.startTimelineTracking(incident.id);

    return {
      handled: true,
      incidentId: incident.id,
      severity,
      containmentActions: incident.containmentActions,
      complianceRequired: incident.containsPII
    };
  }

  private async executeEmergencyContainment(incident: Incident): Promise<void> {
    const containmentPlan = await this.generateContainmentPlan(incident);
    
    // Execute all containment actions concurrently
    const results = await Promise.allSettled(
      containmentPlan.actions.map(action => this.executeAction(action))
    );

    // Log containment results with evidence
    await this.recordTimelineEntry(incident.id, {
      phase: 'containment',
      action_taken: 'automated_emergency_containment',
      automated_action: true,
      success: results.every(r => r.status === 'fulfilled'),
      evidence_preserved: {
        containment_results: results,
        timestamp: new Date().toISOString()
      }
    });
  }
}
```

---

**EXECUTE IMMEDIATELY - Build automated security response protecting millions of wedding users!**