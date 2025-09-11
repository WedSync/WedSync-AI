# TEAM C - ROUND 1: WS-211 - Client Dashboard Templates - Integration & Assignment Logic

**Date:** 2025-08-28  
**Feature ID:** WS-211 (Track all work with this ID)  
**Priority:** P1 (High value for supplier efficiency)  
**Mission:** Build template assignment automation and integrate with existing client management systems  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer managing 30+ active clients with different packages  
**I want to:** Create reusable dashboard templates for each service tier that automatically apply to new clients  
**So that:** I save 2 hours per client on dashboard setup and ensure consistent experiences, saving 60+ hours monthly  

**Real Wedding Problem This Solves:**  
When a photographer books a luxury client at The Willows venue, the system should automatically apply both the luxury package template AND the venue-specific template with parking maps and preferred vendor contacts. Complex assignment logic handles multiple conditions while maintaining client data integrity.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Auto-assignment based on package/venue/tags
- Template assignment rule engine with priorities
- Integration with existing client management
- Template inheritance and override system
- Real-time template updates
- Cross-system data synchronization

**Technology Stack (VERIFIED):**
- Integration: Supabase realtime for live updates
- Rules Engine: JSON-based condition evaluation
- Client Management: Existing client database integration
- Real-time: WebSocket connections for template changes
- Testing: Integration testing with multiple systems

**Integration Points:**
- Client Management: Automatic template assignment on client creation
- Template System: Rule-based assignment with Team B's APIs
- User Interface: Real-time updates for Team A's components
- Mobile Platform: Template sync with Team D's mobile optimization

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Load integration and real-time documentation:
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database changes webhooks"});
await mcp__Ref__ref_search_documentation({query: "JSON logic evaluation rules engine JavaScript"});
await mcp__Ref__ref_search_documentation({query: "Next.js API integration patterns middleware"});
await mcp__Ref__ref_search_documentation({query: "Client management systems integration patterns"});

// 2. Review existing client management patterns:
await Grep({
  pattern: "client.*create|client.*update|assign|automation",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src",
  output_mode: "files_with_matches"
});

// 3. Check existing integration patterns:
await Grep({
  pattern: "webhook|realtime|integration|automation",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src",
  output_mode: "files_with_matches"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build template assignment automation system"
2. **integration-specialist** --think-hard "Integrate template system with client management"
3. **supabase-specialist** --think-ultra-hard "Implement realtime template updates"
4. **nextjs-fullstack-developer** --integration-focused "Create assignment rule engine"
5. **test-automation-architect** --integration-testing "Test cross-system integration"
6. **security-compliance-officer** --data-integrity "Ensure assignment security"
7. **performance-optimization-expert** --real-time "Optimize real-time updates"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Analyze existing client creation workflow
- Review current dashboard assignment patterns
- Understand template assignment rule requirements
- Map integration points across systems

### **PLAN PHASE**
- Design template assignment rule engine
- Plan integration with client management
- Design real-time update architecture
- Create assignment priority system

### **CODE PHASE**
- Implement template assignment automation
- Build rule evaluation engine
- Create real-time template synchronization
- Add integration middleware and webhooks

### **COMMIT PHASE**
- Test assignment automation thoroughly
- Validate cross-system integration
- Ensure real-time updates work reliably
- Create integration documentation

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Template assignment rule engine with JSON-based conditions
- [ ] Automatic template assignment on client creation/update
- [ ] Template assignment priority system
- [ ] Real-time template update synchronization
- [ ] Integration middleware for client management
- [ ] Assignment override and customization system

### Code Files to Create:
```typescript
// /wedsync/src/lib/templates/assignment-engine.ts
export class TemplateAssignmentEngine {
  async autoAssignTemplate(client: Client): Promise<DashboardTemplate> {
    // 1. Get all active assignment rules for supplier
    // 2. Evaluate rules in priority order
    // 3. Apply matching template with overrides
    // 4. Handle fallback to default template
    // 5. Log assignment for audit trail
  }
  
  evaluateRule(rule: AssignmentRule, client: Client): boolean {
    // JSON-based condition evaluation
    // Handle package, venue, tag, and custom conditions
    // Support AND/OR logic operators
  }
}

// /wedsync/src/lib/templates/assignment-middleware.ts
export async function templateAssignmentMiddleware(
  req: NextRequest,
  event: 'client.created' | 'client.updated'
) {
  // Automatic template assignment on client changes
  // Handle bulk assignment operations
  // Manage assignment conflicts and resolution
}

// /wedsync/src/lib/realtime/template-sync.ts
export class TemplateRealtimeSync {
  async subscribeToTemplateUpdates(clientId: string) {
    // Real-time template updates for active clients
    // Handle template modifications affecting assigned clients
    // Sync assignment changes across user sessions
  }
  
  async broadcastTemplateAssignment(assignment: TemplateAssignment) {
    // Notify all relevant clients about template changes
    // Handle real-time dashboard updates
  }
}

// /wedsync/src/lib/templates/assignment-rules.ts
export interface AssignmentRule {
  id: string;
  templateId: string;
  ruleType: 'package' | 'venue' | 'tag' | 'custom';
  conditions: JsonLogicCondition;
  priority: number;
  isActive: boolean;
}

export class RuleEvaluator {
  evaluate(conditions: JsonLogicCondition, context: ClientContext): boolean {
    // Handle complex JSON logic conditions
    // Support nested AND/OR operations
    // Custom field evaluation
  }
}
```

### Integration Services:
```typescript
// /wedsync/src/services/template-integration.ts
export class TemplateIntegrationService {
  // Client Management Integration
  async onClientCreated(client: Client): Promise<void> {
    // Auto-assign template based on package/venue
    // Create initial dashboard structure
    // Notify relevant systems
  }
  
  async onClientUpdated(client: Client, changes: ClientChanges): Promise<void> {
    // Re-evaluate template assignment if package/venue changed
    // Handle template migration with data preservation
    // Update dashboard structure as needed
  }
  
  // Template Management Integration
  async onTemplateUpdated(template: DashboardTemplate): Promise<void> {
    // Update all clients using this template
    // Handle breaking changes gracefully
    // Notify active dashboard sessions
  }
  
  // Real-time Synchronization
  async syncTemplateChanges(templateId: string): Promise<void> {
    // Find all affected clients
    // Calculate necessary updates
    // Broadcast changes to active sessions
  }
}
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Template component state management interfaces
- FROM Team B: Template CRUD APIs and assignment endpoints
- FROM Team D: Mobile template synchronization requirements

### What other teams NEED from you:
- TO Team A: Real-time template update events and data structures
- TO Team B: Assignment rule requirements and validation needs
- TO Team D: Template assignment APIs for mobile platform
- TO Team E: Integration testing scenarios and mock data

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Assignment Security:
- [ ] Template assignment validates client ownership
- [ ] Assignment rules cannot access other suppliers' data
- [ ] Real-time updates respect user permissions
- [ ] Assignment audit logging for compliance
- [ ] Override permissions validated per user role

### Integration Security:
- [ ] Webhook signatures validated for authenticity
- [ ] Real-time connections authenticated and authorized
- [ ] Assignment middleware respects rate limits
- [ ] Cross-system data validation at all boundaries
- [ ] Assignment conflicts resolved securely

### Data Integrity:
- [ ] Template assignments maintain referential integrity
- [ ] Assignment rule evaluation is deterministic
- [ ] Real-time updates handle network failures gracefully
- [ ] Assignment history preserved for audit trails
- [ ] Override data validated and sanitized

---

## 🎭 INTEGRATION TESTING

```javascript
// Template assignment automation testing
describe('Template Assignment Integration', () => {
  test('Auto-assign template on client creation', async () => {
    // Create client with luxury package
    const client = await createTestClient({
      package: 'luxury',
      venue: { name: 'The Willows' },
      supplier_id: testSupplierId
    });
    
    // Verify template was assigned automatically
    const assignment = await getTemplateAssignment(client.id);
    expect(assignment.template.name).toBe('Luxury Experience Dashboard');
    expect(assignment.assignment_rule).toBe('package');
    
    // Verify dashboard was created with template sections
    const dashboard = await getDashboardForClient(client.id);
    expect(dashboard.sections).toHaveLength(6); // Luxury template has 6 sections
    expect(dashboard.sections.find(s => s.type === 'album_design')).toBeDefined();
  });

  test('Re-assign template when client package changes', async () => {
    // Update client from standard to luxury package
    await updateClient(testClientId, { package: 'luxury' });
    
    // Verify template was re-assigned
    const newAssignment = await getTemplateAssignment(testClientId);
    expect(newAssignment.template.category).toBe('luxury');
    expect(newAssignment.assignment_rule).toBe('package');
    
    // Verify dashboard was updated with new sections
    const updatedDashboard = await getDashboardForClient(testClientId);
    expect(updatedDashboard.sections.find(s => s.type === 'album_design')).toBeDefined();
  });

  test('Real-time template updates', async () => {
    const templateId = testTemplate.id;
    const clientSocket = new WebSocket(`ws://localhost:3000/api/realtime/templates/${templateId}`);
    
    // Listen for real-time updates
    const updatePromise = new Promise((resolve) => {
      clientSocket.onmessage = (event) => {
        const update = JSON.parse(event.data);
        if (update.type === 'template_updated') {
          resolve(update.data);
        }
      };
    });
    
    // Update template
    await updateTemplate(templateId, { name: 'Updated Luxury Template' });
    
    // Verify real-time update received
    const update = await updatePromise;
    expect(update.template.name).toBe('Updated Luxury Template');
  });

  test('Assignment rule priority evaluation', async () => {
    // Create rules with different priorities
    await createAssignmentRule({
      templateId: venueTemplateId,
      ruleType: 'venue',
      conditions: { venue: 'The Willows' },
      priority: 10
    });
    
    await createAssignmentRule({
      templateId: packageTemplateId,
      ruleType: 'package',
      conditions: { package: 'luxury' },
      priority: 5
    });
    
    // Create client matching both rules
    const client = await createTestClient({
      package: 'luxury',
      venue: { name: 'The Willows' }
    });
    
    // Verify higher priority rule wins
    const assignment = await getTemplateAssignment(client.id);
    expect(assignment.template_id).toBe(venueTemplateId); // Priority 10 > 5
  });
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Assignment Automation:
- [ ] Templates auto-assign on client creation with 100% accuracy
- [ ] Assignment rules evaluate correctly with complex conditions
- [ ] Priority system resolves conflicts deterministically
- [ ] Template re-assignment works when client data changes
- [ ] Assignment overrides preserve custom configurations

### Integration Functionality:
- [ ] Real-time template updates work across all active sessions
- [ ] Client management integration seamless and reliable
- [ ] Assignment middleware handles all edge cases gracefully
- [ ] Cross-system data synchronization maintains consistency
- [ ] Integration error handling comprehensive and logged

### Performance & Reliability:
- [ ] Assignment evaluation completes within 100ms
- [ ] Real-time updates delivered within 200ms
- [ ] Integration handles concurrent operations safely
- [ ] Assignment system scales to 1000+ concurrent clients
- [ ] Error recovery maintains system stability

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Assignment Engine: `/wedsync/src/lib/templates/assignment-engine.ts`
- Integration Services: `/wedsync/src/services/template-integration.ts`
- Real-time Sync: `/wedsync/src/lib/realtime/template-sync.ts`
- Middleware: `/wedsync/src/lib/templates/assignment-middleware.ts`
- Tests: `/wedsync/tests/integration/template-assignment/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch32/WS-211-team-c-round-1-complete.md`

**Evidence Package Required:**
- Template assignment automation test results
- Real-time synchronization demonstration
- Integration testing report with all systems
- Performance benchmarks for assignment operations
- Assignment rule evaluation accuracy validation

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Template assignment automation implemented and tested
- [ ] Assignment rule engine working with JSON conditions
- [ ] Real-time template synchronization functional
- [ ] Client management integration complete
- [ ] Assignment priority system working correctly
- [ ] Cross-system integration validated
- [ ] Performance targets met for all operations
- [ ] Integration documentation complete
- [ ] Evidence package created with test results

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY