# TEAM C - ROUND 1: WS-312 - Client Dashboard Builder Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build integration systems for dashboard template data synchronization, third-party branding services, and client portal delivery mechanisms
**FEATURE ID:** WS-312 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about seamless data flow between template builder, client portals, and external branding/delivery services

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/
cat $WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/template-sync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **INTEGRATION TESTS:**
```bash
npm test integration/dashboard-templates
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

// Query integration patterns and data synchronization
await mcp__serena__search_for_pattern("integration.*service|sync.*data|webhook.*handler");
await mcp__serena__find_symbol("Integration", "src/lib/integrations", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration development
mcp__Ref__ref_search_documentation("Supabase real-time subscriptions webhooks integration patterns");
mcp__Ref__ref_search_documentation("Next.js 15 file upload image processing optimization");
mcp__Ref__ref_search_documentation("Third-party API integration error handling retry logic");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Dashboard template integration needs: 1) Real-time sync between template changes and client portals, 2) Logo upload and image processing for branding, 3) Template data population from client wedding information, 4) Email/SMS delivery for portal access links, 5) Webhook integration for template updates across connected systems.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration workflows and dependencies
2. **integration-specialist** - Focus on real-time sync and webhook handling
3. **security-compliance-officer** - Secure file upload and data synchronization
4. **code-quality-guardian** - Maintain integration architecture standards
5. **test-automation-architect** - Integration testing and failure handling validation
6. **documentation-chronicler** - Integration flow documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **File upload validation** - Secure logo/image processing pipeline
- [ ] **Webhook authentication** - HMAC signature verification
- [ ] **Data sanitization** - Clean template data during sync operations
- [ ] **Rate limiting** - Prevent integration abuse
- [ ] **Error logging** - Secure logging without exposing sensitive data
- [ ] **Access token management** - Secure third-party API credentials
- [ ] **Template sync validation** - Verify data integrity during real-time updates
- [ ] **Client portal access** - Secure portal URL generation and delivery

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**SPECIFIC RESPONSIBILITIES:**
- Real-time data synchronization between systems
- Third-party service integration (image processing, email delivery)
- Webhook handling and processing for template updates
- Data flow orchestration between dashboard builder and client portals
- Integration health monitoring and failure recovery
- File upload and branding asset management
- Template data population from multiple sources

## 📋 TECHNICAL SPECIFICATION REQUIREMENTS

### USER STORY CONTEXT
**As a:** Wedding photographer building client portals
**I want to:** Seamless integration that syncs template changes to client portals in real-time and handles branding assets automatically
**So that:** Clients always see the latest portal layout and my branding appears consistently without manual updates

### INTEGRATION SYSTEMS TO IMPLEMENT

#### 1. Template Synchronization Service
```typescript
interface TemplateSyncService {
  syncTemplateToClients: (templateId: string, changes: TemplateChanges) => Promise<void>;
  handleRealtimeUpdates: (event: SupabaseRealtimeEvent) => Promise<void>;
  populateClientData: (templateId: string, clientId: string) => Promise<ClientPortalData>;
  validateSyncIntegrity: (templateId: string) => Promise<SyncStatus>;
}

class DashboardTemplateSyncService implements TemplateSyncService {
  // Real-time synchronization using Supabase subscriptions
  // Client portal regeneration on template changes
  // Data consistency validation
}
```

#### 2. Branding Asset Management
```typescript
interface BrandingAssetService {
  uploadLogo: (file: File, supplierId: string) => Promise<BrandingAsset>;
  processImage: (assetId: string, dimensions: ImageDimensions) => Promise<ProcessedAsset>;
  optimizeForPortal: (assetId: string, portalType: string) => Promise<OptimizedAsset>;
  generateColorPalette: (logoUrl: string) => Promise<ColorPalette>;
}

interface BrandingAsset {
  id: string;
  supplierId: string;
  originalUrl: string;
  optimizedUrls: Record<string, string>;
  colorPalette?: ColorPalette;
  metadata: AssetMetadata;
}
```

#### 3. Client Portal Delivery System
```typescript
interface PortalDeliveryService {
  generatePortalUrl: (clientId: string, templateId: string) => Promise<string>;
  sendPortalInvitation: (clientId: string, portalUrl: string, method: 'email' | 'sms') => Promise<void>;
  trackPortalAccess: (portalUrl: string, clientId: string) => Promise<void>;
  updatePortalContent: (clientId: string, sections: PortalSection[]) => Promise<void>;
}
```

#### 4. Real-time Update Handler
```typescript
// Supabase real-time subscription for template changes
const handleTemplateUpdate = async (payload: RealtimePayload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch (eventType) {
    case 'UPDATE':
      await templateSyncService.syncTemplateToClients(
        newRecord.id,
        detectChanges(oldRecord, newRecord)
      );
      break;
    case 'DELETE':
      await portalDeliveryService.handleTemplateDeactivation(oldRecord.id);
      break;
  }
};

// Subscribe to template changes
supabase
  .channel('dashboard-template-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'client_dashboard_templates'
  }, handleTemplateUpdate)
  .subscribe();
```

### WEBHOOK INTEGRATION ENDPOINTS

#### 1. Template Update Webhooks
```typescript
// POST /api/webhooks/template-update
interface TemplateUpdateWebhook {
  templateId: string;
  supplierId: string;
  changes: TemplateChanges;
  timestamp: string;
  signature: string; // HMAC verification
}
```

#### 2. Client Portal Activity Webhooks
```typescript
// POST /api/webhooks/portal-activity
interface PortalActivityWebhook {
  clientId: string;
  portalId: string;
  activity: 'view' | 'interaction' | 'form_submission';
  metadata: Record<string, any>;
  timestamp: string;
}
```

### DATA SYNCHRONIZATION LOGIC

#### Template-to-Portal Data Flow
1. **Template Modified** → Real-time event triggered
2. **Identify Affected Clients** → Query portal assignments
3. **Generate Updated Portal Data** → Populate with client information
4. **Update Client Portals** → Batch update portal configurations
5. **Notify Clients (Optional)** → Send update notifications
6. **Validate Sync Integrity** → Ensure all portals updated correctly

#### Client Data Population
```typescript
const populateTemplateWithClientData = async (
  template: DashboardTemplate,
  clientData: ClientWeddingData
): Promise<PopulatedTemplate> => {
  const populatedSections = template.sections.map(section => {
    switch (section.type) {
      case 'timeline':
        return populateTimelineSection(section, clientData.timeline);
      case 'photos':
        return populatePhotoSection(section, clientData.photos);
      case 'forms':
        return populateFormSection(section, clientData.forms);
      case 'vendors':
        return populateVendorSection(section, clientData.vendors);
      // ... other section types
    }
  });
  
  return {
    ...template,
    sections: populatedSections,
    clientData
  };
};
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Template synchronization service with real-time updates
- [ ] Branding asset management with image processing
- [ ] Client portal delivery system with secure URL generation
- [ ] Webhook endpoints for template and portal activity
- [ ] Data population logic for all template section types
- [ ] Integration health monitoring and error recovery
- [ ] File upload handling with security validation
- [ ] Integration tests for all sync workflows

## 💾 WHERE TO SAVE YOUR WORK
- Sync Service: `$WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/template-sync.ts`
- Branding Service: `$WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/branding-assets.ts`
- Portal Delivery: `$WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/portal-delivery.ts`
- Webhooks: `$WS_ROOT/wedsync/src/app/api/webhooks/template-update/route.ts`
- Real-time: `$WS_ROOT/wedsync/src/lib/integrations/dashboard-templates/realtime-handler.ts`
- Types: `$WS_ROOT/wedsync/src/types/integration-dashboard.ts`
- Tests: `$WS_ROOT/wedsync/src/__tests__/integrations/dashboard-templates/`

## 🏁 COMPLETION CHECKLIST
- [ ] All integration services implemented and verified
- [ ] Real-time synchronization working correctly
- [ ] File upload and image processing functional
- [ ] Webhook endpoints properly secured and tested
- [ ] Client portal delivery system operational
- [ ] Data population logic accurate for all section types
- [ ] Integration health monitoring implemented
- [ ] Error handling and recovery mechanisms tested
- [ ] Security validation for all integration points
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 🚨 WEDDING INDUSTRY CONTEXT
Remember: Integration reliability is critical because couples depend on their portals for wedding coordination. Failed syncing could mean couples miss important timeline updates or vendor information. Build robust error recovery and ensure data consistency across all systems.

---

**EXECUTE IMMEDIATELY - Build rock-solid integrations for wedding platform success!**