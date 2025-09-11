# TEAM C - ROUND 1: WS-272 - RSVP System Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive integrations for RSVP system including supplier notifications, email/SMS communications, wedding website integration, guest import systems, and third-party coordination workflows
**FEATURE ID:** WS-272 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about supplier workflow integration, automated communications, guest data synchronization, and wedding ecosystem coordination

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/rsvp/
cat $WS_ROOT/wedsync/src/lib/integrations/rsvp/SupplierRSVPIntegration.ts | head -20
cat $WS_ROOT/wedsync/src/lib/integrations/rsvp/RSVPCommunications.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test rsvp-integrations
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

// Query existing integration patterns and communication services
await mcp__serena__search_for_pattern("integration.*service|notification.*service|communication.*service");
await mcp__serena__find_symbol("SupplierService", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__get_symbols_overview("src/lib/communications");
```

### B. INTEGRATION & COMMUNICATION PATTERNS (MANDATORY FOR INTEGRATIONS)
```typescript
// CRITICAL: Load existing integration and communication patterns
await mcp__serena__search_for_pattern("email.*service|sms.*service|webhook.*handler");
await mcp__serena__find_symbol("EmailService", "", true);
await mcp__serena__search_for_pattern("supplier.*notification|guest.*import");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for integrations and communications
await mcp__Ref__ref_search_documentation("Node.js email templates Resend API integration");
await mcp__Ref__ref_search_documentation("webhook processing Node.js Express validation");
await mcp__Ref__ref_search_documentation("SMS integration Twilio Node.js templates");
await mcp__Ref__ref_search_documentation("CSV parsing Node.js guest import validation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX RSVP INTEGRATION SYSTEM

### Use Sequential Thinking MCP for Complex RSVP Integration Analysis
```typescript
// Use for complex RSVP integration architecture decisions
mcp__sequential-thinking__sequentialthinking({
  thought: "This RSVP integration system requires sophisticated coordination: 1) Supplier notification system that automatically alerts caterers, venues, and planners when headcounts change, 2) Multi-channel communications with email confirmations, SMS reminders, and customizable templates, 3) Wedding website integration for seamless RSVP form embedding and real-time updates, 4) Guest import system supporting CSV/Excel formats from various sources, 5) Third-party coordination for CRM sync and vendor management platforms. The main challenges are: Reliable supplier notification delivery and batching, email/SMS template management with wedding-specific branding, website integration across different platforms and domains, guest data import validation and duplicate handling, and maintaining data consistency across multiple systems. I need to ensure reliable delivery, professional communications, seamless website integration, and robust data synchronization.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down RSVP integrations, track communication dependencies
2. **integration-specialist** - Use Serena for integration patterns and service coordination  
3. **security-compliance-officer** - Secure communications and data protection
4. **performance-optimization-expert** - Optimize notification batching and delivery
5. **test-automation-architect** - Integration testing with mock services and webhooks
6. **documentation-chronicler** - Evidence-based integration documentation with flow diagrams

## 🔒 SECURITY REQUIREMENTS FOR RSVP INTEGRATIONS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **Supplier Data Protection** - Encrypt headcount and dietary data in transit
- [ ] **Email Security** - Secure email templates and recipient validation
- [ ] **SMS Security** - Validate phone numbers and prevent spam
- [ ] **Webhook Security** - Verify webhook signatures and authenticate sources
- [ ] **Guest Import Security** - Validate and sanitize imported guest data
- [ ] **API Key Protection** - Secure storage of third-party service keys
- [ ] **Data Encryption** - Encrypt all communications and stored data
- [ ] **Access Control** - Proper permissions for supplier notifications
- [ ] **Audit Logging** - Log all integration activities and communications
- [ ] **Rate Limiting** - Protect against communication service abuse

### Wedding-Specific Integration Security:
- [ ] **Guest Privacy Protection** - Secure guest information in all communications
- [ ] **Supplier Authorization** - Verify supplier access to couple data
- [ ] **Wedding Day Communications** - Ensure reliable delivery on critical days
- [ ] **Vendor Data Isolation** - Separate vendor access to couple information

## 🧭 WEDDING ECOSYSTEM INTEGRATION REQUIREMENTS (MANDATORY FOR WEDDING FEATURES)

**❌ FORBIDDEN: Creating generic event notification systems without wedding context**
**✅ MANDATORY: RSVP integrations must coordinate seamlessly with wedding planning workflow**

### WEDDING INTEGRATION CHECKLIST
- [ ] Supplier notifications designed for wedding vendor workflows (caterers, venues, planners)
- [ ] Communication templates with wedding-appropriate language and branding
- [ ] Guest import supporting wedding invitation list formats
- [ ] Website integration optimized for wedding announcement and celebration sites
- [ ] CRM integration connecting with wedding planning and vendor management systems
- [ ] Timeline coordination ensuring RSVP deadlines align with wedding planning milestones

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION FOCUS:**
- Third-party service coordination for RSVP system connectivity
- Communication service integration for email confirmations and reminders
- Supplier notification system for automated headcount updates
- Wedding website integration for seamless RSVP form embedding
- Guest data import and synchronization from various sources
- CRM and vendor management system connectivity

### RSVP-Specific Integration Requirements:
- **Supplier Notification System**: Automated alerts for headcount and dietary changes
- **Multi-Channel Communications**: Email, SMS, and in-app notifications
- **Wedding Website Integration**: Seamless RSVP form embedding and branding
- **Guest Import System**: CSV/Excel import with validation and duplicate detection
- **Real-time Synchronization**: Live updates across all connected systems
- **Vendor Portal Integration**: Supplier dashboard connectivity

## 📋 TECHNICAL SPECIFICATION ANALYSIS

### Core RSVP Integration Services to Build:

1. **SupplierRSVPIntegration**:
   - Automated supplier notification system
   - Headcount and dietary requirement processing
   - Vendor-specific data formatting and delivery

2. **RSVPCommunications**:
   - Email confirmation and reminder system
   - SMS notification service
   - Template management and personalization

3. **WeddingWebsiteIntegration**:
   - RSVP form embedding and customization
   - Real-time response synchronization
   - Cross-domain security and CORS handling

4. **GuestImportService**:
   - CSV/Excel file processing
   - Guest data validation and cleanup
   - Duplicate detection and merging

5. **CRMIntegrationService**:
   - Wedding CRM system connectivity
   - Guest data synchronization
   - Vendor management platform integration

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY INTEGRATION SERVICES (MUST COMPLETE):
- [ ] **SupplierRSVPIntegration.ts** - Automated supplier notification system
- [ ] **RSVPCommunications.ts** - Email/SMS communication service
- [ ] **WeddingWebsiteIntegration.ts** - Website RSVP form integration
- [ ] **GuestImportService.ts** - Guest data import and processing

### COMMUNICATION SERVICES:
- [ ] **RSVPEmailService.ts** - Email confirmation and reminder system
- [ ] **RSVPSMSService.ts** - SMS notification and reminder service
- [ ] **CommunicationTemplateManager.ts** - Template management and personalization
- [ ] **NotificationBatchProcessor.ts** - Batch processing for large guest lists

### SUPPLIER INTEGRATION:
- [ ] **SupplierNotificationProcessor.ts** - Headcount change processing
- [ ] **VendorDataFormatter.ts** - Supplier-specific data formatting
- [ ] **CateringIntegration.ts** - Caterer-specific headcount and dietary data
- [ ] **VenueCapacityIntegration.ts** - Venue headcount validation

### WEBSITE & IMPORT INTEGRATION:
- [ ] **RSVPFormEmbedGenerator.ts** - Generate embeddable RSVP forms
- [ ] **GuestListImporter.ts** - CSV/Excel import processing
- [ ] **DataValidationService.ts** - Guest data validation and cleanup
- [ ] **DuplicateDetectionService.ts** - Guest duplicate identification and merging

### WEBHOOK & SYNCHRONIZATION:
- [ ] **RSVPWebhookHandler.ts** - Handle external RSVP webhooks
- [ ] **RealtimeSyncService.ts** - Real-time data synchronization
- [ ] **CRMSyncService.ts** - CRM system integration
- [ ] **IntegrationHealthMonitor.ts** - Monitor integration status and health

## 🧪 TESTING REQUIREMENTS FOR RSVP INTEGRATIONS

### Integration Tests (Required):
```typescript
// SupplierRSVPIntegration.test.ts
describe('SupplierRSVPIntegration', () => {
  describe('supplier notifications', () => {
    it('should notify caterer when headcount changes', async () => {
      const couple = await createTestCouple();
      const caterer = await createTestSupplier({ 
        vendor_type: 'catering',
        notification_preferences: { rsvp_updates: true }
      });
      await createSupplierConnection(caterer.id, couple.id);

      await supplierIntegration.processHeadcountChange(couple.id, {
        previous_count: 50,
        current_count: 55,
        change_type: 'increase'
      });

      // Verify notification sent
      const notifications = await getSupplierNotifications(caterer.id);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].notification_type).toBe('headcount_change');
      expect(notifications[0].current_count).toBe(55);
    });

    it('should format dietary requirements for caterer', async () => {
      const dietaryData = [
        { requirement: 'vegetarian', count: 5 },
        { requirement: 'gluten-free', count: 3 },
        { requirement: 'nut allergy', count: 2 }
      ];

      const formattedData = await supplierIntegration.formatDietaryRequirements(
        'catering',
        dietaryData
      );

      expect(formattedData).toMatchObject({
        dietary_summary: expect.arrayContaining([
          expect.objectContaining({
            restriction: 'vegetarian',
            guest_count: 5,
            preparation_notes: expect.stringContaining('vegetarian')
          })
        ]),
        total_special_diets: 10,
        catering_instructions: expect.any(String)
      });
    });

    it('should batch notifications for multiple suppliers', async () => {
      const suppliers = await createTestSuppliers([
        { vendor_type: 'catering' },
        { vendor_type: 'venue' },
        { vendor_type: 'photography' }
      ]);

      const startTime = Date.now();
      await supplierIntegration.batchNotifySuppliers(testCouple.id, {
        notification_type: 'final_count',
        final_headcount: 75
      });
      const endTime = Date.now();

      // Should complete batch processing quickly
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all relevant suppliers notified
      for (const supplier of suppliers.filter(s => ['catering', 'venue'].includes(s.vendor_type))) {
        const notifications = await getSupplierNotifications(supplier.id);
        expect(notifications.length).toBeGreaterThan(0);
      }
    });
  });
});

// RSVPCommunications.test.ts
describe('RSVPCommunications', () => {
  it('should send RSVP confirmation email', async () => {
    const rsvpData = {
      guest_name: 'John Smith',
      guest_email: 'john@example.com',
      attending_status: 'yes',
      meal_choice: 'chicken',
      couple_names: 'Emma & James'
    };

    const emailService = new MockEmailService();
    const communications = new RSVPCommunications(emailService);

    await communications.sendRSVPConfirmation(rsvpData);

    expect(emailService.sentEmails).toHaveLength(1);
    expect(emailService.sentEmails[0].to).toBe('john@example.com');
    expect(emailService.sentEmails[0].subject).toContain('RSVP Confirmation');
    expect(emailService.sentEmails[0].html).toContain('John Smith');
    expect(emailService.sentEmails[0].html).toContain('Emma & James');
  });

  it('should send RSVP reminder with personalization', async () => {
    const guestData = {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      rsvp_token: 'secure-token-123'
    };

    await communications.sendRSVPReminder(guestData, {
      reminder_type: 'final',
      days_until_deadline: 7,
      wedding_date: '2024-06-15'
    });

    expect(mockEmailService.sentEmails[0].html).toContain('Sarah Johnson');
    expect(mockEmailService.sentEmails[0].html).toContain('7 days');
    expect(mockEmailService.sentEmails[0].html).toContain('secure-token-123');
  });

  it('should handle SMS reminders when enabled', async () => {
    const guestData = {
      name: 'Mike Wilson',
      phone: '+1234567890',
      rsvp_preferences: { sms_enabled: true }
    };

    const smsService = new MockSMSService();
    const communications = new RSVPCommunications(mockEmailService, smsService);

    await communications.sendRSVPReminder(guestData, {
      reminder_type: 'followup',
      include_sms: true
    });

    expect(smsService.sentMessages).toHaveLength(1);
    expect(smsService.sentMessages[0].to).toBe('+1234567890');
    expect(smsService.sentMessages[0].body).toContain('Mike Wilson');
    expect(smsService.sentMessages[0].body).toContain('RSVP');
  });
});
```

### Website Integration Tests:
```typescript
// WeddingWebsiteIntegration.test.ts
describe('WeddingWebsiteIntegration', () => {
  it('should generate embeddable RSVP form code', async () => {
    const websiteConfig = {
      website_id: 'test-website-123',
      couple_id: 'couple-456',
      theme: 'elegant',
      custom_colors: {
        primary: '#8B5CF6',
        secondary: '#F3F4F6'
      }
    };

    const embedCode = await websiteIntegration.generateRSVPEmbed(websiteConfig);

    expect(embedCode).toContain('<iframe');
    expect(embedCode).toContain('test-website-123');
    expect(embedCode).toContain('#8B5CF6');
    expect(embedCode).toMatch(/src="https:\/\/.*\/rsvp\/test-website-123"/);
  });

  it('should handle CORS for wedding website domains', async () => {
    const allowedDomains = [
      'https://emma-james-wedding.com',
      'https://www.ourwedding.co.uk'
    ];

    const corsConfig = await websiteIntegration.generateCORSConfig(allowedDomains);

    expect(corsConfig.origin).toEqual(allowedDomains);
    expect(corsConfig.credentials).toBe(true);
    expect(corsConfig.methods).toContain('POST');
    expect(corsConfig.allowedHeaders).toContain('Content-Type');
  });

  it('should sync RSVP responses in real-time', async () => {
    const websocket = new MockWebSocket();
    await websiteIntegration.setupRealtimeSync('test-website-123', websocket);

    // Simulate RSVP submission
    const rsvpResponse = {
      guest_name: 'Real Time Guest',
      attending_status: 'yes',
      submitted_at: new Date().toISOString()
    };

    await websiteIntegration.broadcastRSVPUpdate('test-website-123', rsvpResponse);

    expect(websocket.sentMessages).toHaveLength(1);
    expect(websocket.sentMessages[0].type).toBe('rsvp_update');
    expect(websocket.sentMessages[0].data.guest_name).toBe('Real Time Guest');
  });
});

// GuestImportService.test.ts
describe('GuestImportService', () => {
  it('should import guests from CSV file', async () => {
    const csvContent = `Name,Email,Phone,Group
John Smith,john@example.com,+1234567890,Family
Jane Doe,jane@example.com,,Friends
Bob Johnson,bob@example.com,+0987654321,Work`;

    const importResult = await guestImportService.importFromCSV(
      testCouple.id,
      csvContent
    );

    expect(importResult.success).toBe(true);
    expect(importResult.imported_count).toBe(3);
    expect(importResult.errors).toHaveLength(0);

    // Verify guests created in database
    const guests = await getGuestsByCoupleId(testCouple.id);
    expect(guests).toHaveLength(3);
    expect(guests.find(g => g.name === 'John Smith')).toBeDefined();
  });

  it('should detect and handle duplicate guests', async () => {
    // First import
    await guestImportService.importFromCSV(testCouple.id, 
      'Name,Email\nJohn Smith,john@example.com'
    );

    // Second import with duplicate
    const secondImport = await guestImportService.importFromCSV(testCouple.id,
      'Name,Email\nJohn Smith,john@example.com\nJane Doe,jane@example.com'
    );

    expect(secondImport.duplicates_found).toBe(1);
    expect(secondImport.imported_count).toBe(1); // Only Jane Doe imported
    expect(secondImport.duplicate_details[0].name).toBe('John Smith');
  });

  it('should validate guest data during import', async () => {
    const invalidCSV = `Name,Email,Phone
,john@example.com,+1234567890
John Smith,invalid-email,not-a-phone
Jane Doe,jane@example.com,+1234567890`;

    const importResult = await guestImportService.importFromCSV(
      testCouple.id,
      invalidCSV
    );

    expect(importResult.errors).toHaveLength(2);
    expect(importResult.errors[0]).toContain('Name is required');
    expect(importResult.errors[1]).toContain('Invalid email format');
    expect(importResult.imported_count).toBe(1); // Only Jane Doe valid
  });
});
```

### Communication Integration Tests:
```typescript
// Communication service testing
describe('RSVP Communication Integration', () => {
  it('should handle email service failures gracefully', async () => {
    const failingEmailService = {
      send: jest.fn().mockRejectedValue(new Error('SMTP connection failed'))
    };

    const communications = new RSVPCommunications(failingEmailService);

    const result = await communications.sendRSVPConfirmation({
      guest_email: 'test@example.com',
      guest_name: 'Test Guest'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP connection failed');
    expect(result.retry_after).toBeDefined();
  });

  it('should queue reminders for batch processing', async () => {
    const guests = Array.from({ length: 100 }, (_, i) => ({
      id: `guest-${i}`,
      name: `Guest ${i}`,
      email: `guest${i}@example.com`
    }));

    await communications.queueRSVPReminders(guests, {
      reminder_type: 'final',
      send_at: new Date(Date.now() + 3600000) // 1 hour from now
    });

    const queuedJobs = await getReminderQueue();
    expect(queuedJobs).toHaveLength(100);
    expect(queuedJobs.every(job => job.status === 'queued')).toBe(true);
  });

  it('should respect communication preferences', async () => {
    const guestWithPreferences = {
      name: 'Selective Guest',
      email: 'selective@example.com',
      phone: '+1234567890',
      communication_preferences: {
        email: true,
        sms: false,
        reminder_frequency: 'minimal'
      }
    };

    await communications.sendRSVPReminder(guestWithPreferences);

    expect(mockEmailService.sentEmails).toHaveLength(1);
    expect(mockSMSService.sentMessages).toHaveLength(0);
  });
});
```

## 💾 WHERE TO SAVE YOUR WORK

### RSVP Integration Structure:
```
$WS_ROOT/wedsync/src/lib/integrations/rsvp/
├── SupplierRSVPIntegration.ts          # Supplier notification system
├── RSVPCommunications.ts               # Email/SMS communication service
├── WeddingWebsiteIntegration.ts        # Website RSVP integration
├── GuestImportService.ts               # Guest data import processing
├── RSVPEmailService.ts                 # Email service integration
├── RSVPSMSService.ts                   # SMS service integration
├── SupplierNotificationProcessor.ts    # Supplier notification processing
├── CommunicationTemplateManager.ts     # Template management
├── RSVPWebhookHandler.ts               # Webhook processing
├── RealtimeSyncService.ts              # Real-time synchronization
├── CRMSyncService.ts                   # CRM integration
└── IntegrationHealthMonitor.ts         # Integration monitoring
```

### Communication Templates:
```
$WS_ROOT/wedsync/src/lib/integrations/rsvp/templates/
├── email/
│   ├── rsvp-confirmation.html          # RSVP confirmation email
│   ├── rsvp-reminder.html              # RSVP reminder email
│   ├── final-reminder.html             # Final deadline reminder
│   └── supplier-notification.html      # Supplier headcount update
├── sms/
│   ├── rsvp-confirmation.txt           # SMS confirmation
│   ├── rsvp-reminder.txt               # SMS reminder
│   └── final-reminder.txt              # SMS final reminder
└── webhook/
    ├── supplier-headcount.json         # Supplier webhook payload
    └── guest-response.json             # Guest response webhook
```

### Import & Validation:
```
$WS_ROOT/wedsync/src/lib/integrations/rsvp/import/
├── GuestListImporter.ts                # CSV/Excel import
├── DataValidationService.ts           # Guest data validation
├── DuplicateDetectionService.ts       # Duplicate handling
├── ImportTemplateGenerator.ts         # Generate import templates
└── validation-schemas.ts              # Data validation schemas
```

### Webhook Handlers:
```
$WS_ROOT/wedsync/src/app/api/webhooks/rsvp/
├── supplier-notifications/route.ts    # Supplier webhook endpoint
├── guest-responses/route.ts           # Guest response webhooks
├── website-sync/route.ts              # Website synchronization
└── crm-integration/route.ts           # CRM system webhooks
```

## 🏁 COMPLETION CHECKLIST

### MANDATORY INTEGRATION REQUIREMENTS:
- [ ] Supplier notification system automatically alerts caterers and venues of headcount changes
- [ ] Email confirmation system sends branded confirmations within 30 seconds of RSVP
- [ ] SMS reminder system respects guest communication preferences and schedules
- [ ] Wedding website integration provides embeddable RSVP forms with real-time sync
- [ ] Guest import system processes CSV/Excel files with validation and duplicate detection
- [ ] Communication templates are wedding-appropriate and professionally branded
- [ ] Real-time synchronization maintains data consistency across all systems
- [ ] Webhook handlers process external integrations securely and reliably
- [ ] Integration monitoring alerts on service failures and performance issues
- [ ] TypeScript compilation successful with no 'any' types

### WEDDING CONTEXT VALIDATION:
- [ ] Supplier notifications specifically designed for wedding vendor workflows
- [ ] Communication templates use wedding-appropriate language and celebration themes
- [ ] Guest import supports traditional wedding invitation list formats
- [ ] Website integration optimized for wedding announcement and celebration sites
- [ ] CRM integration connects with wedding planning and vendor management systems
- [ ] Timeline coordination ensures RSVP deadlines align with wedding planning milestones

### RELIABILITY & PERFORMANCE:
- [ ] Email delivery achieves 99%+ success rate with proper error handling
- [ ] SMS delivery respects carrier limitations and opt-out requirements
- [ ] Supplier notifications batch process efficiently for large guest lists
- [ ] Guest import processes 1000+ guests within 30 seconds
- [ ] Real-time updates propagate within 2 seconds across all connected systems
- [ ] Integration health monitoring provides proactive failure alerts

### EVIDENCE PACKAGE:
- [ ] Integration testing results covering all communication channels
- [ ] Supplier notification delivery confirmation and acknowledgment tracking
- [ ] Email and SMS delivery reports with success rates and error handling
- [ ] Guest import validation testing with various file formats and edge cases
- [ ] Website integration testing across different domains and platforms
- [ ] Performance testing results for batch processing and real-time sync
- [ ] Security testing results for webhook handlers and API integrations

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all RSVP integration requirements!**

**SUCCESS CRITERIA:** You will have created complete RSVP system integrations that automatically coordinate with wedding suppliers for headcount updates, deliver professional email and SMS communications with wedding-appropriate branding, provide seamless website integration for couples' wedding sites, process guest imports efficiently with validation, and maintain real-time synchronization across all connected systems - all while ensuring reliable delivery and wedding-specific workflow coordination.