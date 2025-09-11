# TEAM E - BATCH 12 - ROUND 1: WS-149 GDPR Compliance System

## 🚀 MISSION OVERVIEW

**Team E**, you're implementing the **GDPR Compliance System (WS-149)** - the comprehensive privacy framework that ensures WedSync meets the strictest global data protection requirements. This isn't just about avoiding fines; it's about building trust with couples and wedding suppliers by giving them complete control over their personal data.

### 🎯 WEDDING CONTEXT & USER STORIES

**Primary User Story:**
*As Emma, a bride-to-be from Berlin, I need absolute confidence that my personal wedding details, guest information, and vendor communications are handled in full compliance with GDPR, with clear consent management and the ability to export or delete all my data if I change my mind about using WedSync.*

**Real Wedding Scenario:**
Sophie's Photography Studio serves clients across the EU and must comply with GDPR when handling couple's personal data, wedding guest lists, venue contracts, and intimate photos. When Sophie's client Emma asks "What data do you have about me?" and "Can I get a copy of everything?", Sophie needs a system that can instantly provide a complete, accurate data export while maintaining full audit compliance.

**Critical GDPR Scenarios:**
1. **Data Subject Access Request**: Couple requests all personal data held by their wedding photographer → System generates complete data export → Delivered within 30 days
2. **Right to Be Forgotten**: Bride cancels wedding and wants all data deleted → Crypto-shredding ensures data cannot be recovered → Audit trail proves compliance
3. **Consent Withdrawal**: Guest withdraws consent for photo sharing → System automatically removes from all albums and galleries → Vendor notified immediately
4. **Data Breach Response**: Wedding venue database compromised → Automated notifications sent within 72 hours → Detailed breach reports generated
5. **Cross-Border Transfers**: UK wedding supplier works with EU couples → Data transfer safeguards implemented → Adequacy decisions respected

### 🔒 TECHNICAL SPECIFICATIONS

**Core GDPR Database Schema:**
```sql
-- Consent management system
CREATE TABLE gdpr.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_subject_id UUID NOT NULL, -- Could be couple, guest, or vendor
    data_subject_type TEXT NOT NULL CHECK (data_subject_type IN ('couple', 'guest', 'vendor', 'contact')),
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_method TEXT NOT NULL, -- 'explicit', 'opt_in', 'implied'
    consent_evidence JSONB NOT NULL, -- IP, timestamp, method details
    purpose_description TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    retention_period INTERVAL,
    can_withdraw BOOLEAN DEFAULT true,
    processing_location TEXT, -- Country/region
    third_party_sharing BOOLEAN DEFAULT false,
    third_parties JSONB,
    marketing_consent BOOLEAN DEFAULT false,
    profiling_consent BOOLEAN DEFAULT false,
    automated_decision_making BOOLEAN DEFAULT false,
    consent_given_at TIMESTAMPTZ NOT NULL,
    consent_expires_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    withdrawal_method TEXT,
    last_confirmed_at TIMESTAMPTZ,
    consent_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data subject rights management
CREATE TABLE gdpr.data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT UNIQUE NOT NULL, -- Human-readable reference
    data_subject_id UUID NOT NULL,
    data_subject_email TEXT NOT NULL,
    data_subject_name TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN (
        'access', 'rectification', 'erasure', 'portability',
        'restrict_processing', 'object_to_processing', 'withdraw_consent'
    )),
    request_details JSONB NOT NULL,
    identity_verification_status TEXT DEFAULT 'pending' CHECK (
        identity_verification_status IN ('pending', 'verified', 'failed', 'not_required')
    ),
    identity_verification_method TEXT,
    identity_verified_at TIMESTAMPTZ,
    identity_verified_by UUID REFERENCES user_profiles(id),
    
    status TEXT DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'identity_pending', 'in_progress', 
        'completed', 'rejected', 'partially_completed'
    )),
    
    -- Response timing
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ NOT NULL, -- 30 days for access, varies by type
    completed_at TIMESTAMPTZ,
    
    -- Processing details
    assigned_to UUID REFERENCES user_profiles(id),
    processing_notes TEXT,
    rejection_reason TEXT,
    completion_details JSONB,
    
    -- Data export/deletion details
    export_format TEXT, -- 'json', 'csv', 'pdf'
    export_file_path TEXT,
    export_file_size_bytes INTEGER,
    deletion_method TEXT, -- 'logical', 'physical', 'crypto_shred'
    deletion_scope JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data breach incident management
CREATE TABLE gdpr.data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT UNIQUE NOT NULL, -- e.g., "BR-2025-001"
    
    -- Breach details
    breach_type TEXT NOT NULL CHECK (breach_type IN (
        'confidentiality', 'integrity', 'availability', 'combined'
    )),
    breach_cause TEXT NOT NULL CHECK (breach_cause IN (
        'cyber_attack', 'human_error', 'system_failure', 'physical_breach',
        'third_party', 'malicious_insider', 'accidental_disclosure'
    )),
    severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Timeline
    occurred_at TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Impact assessment
    data_subjects_affected INTEGER DEFAULT 0,
    data_categories_affected TEXT[] NOT NULL,
    potential_consequences TEXT NOT NULL,
    risk_assessment JSONB NOT NULL,
    
    -- Notification requirements
    supervisory_authority_notification_required BOOLEAN DEFAULT false,
    supervisory_authority_notified_at TIMESTAMPTZ,
    data_subject_notification_required BOOLEAN DEFAULT false,
    data_subject_notifications_sent_at TIMESTAMPTZ,
    
    -- Response details
    containment_measures JSONB NOT NULL,
    remedial_actions JSONB NOT NULL,
    lessons_learned TEXT,
    
    -- Legal and compliance
    dpo_notified_at TIMESTAMPTZ,
    legal_team_notified_at TIMESTAMPTZ,
    external_counsel_engaged BOOLEAN DEFAULT false,
    regulatory_fines_amount DECIMAL(15,2) DEFAULT 0,
    
    status TEXT DEFAULT 'investigating' CHECK (status IN (
        'investigating', 'contained', 'resolved', 'closed'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies
CREATE TABLE gdpr.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL,
    data_category TEXT NOT NULL,
    purpose TEXT NOT NULL,
    retention_period INTERVAL NOT NULL,
    legal_basis TEXT NOT NULL,
    retention_criteria TEXT NOT NULL,
    deletion_method TEXT NOT NULL DEFAULT 'logical',
    review_frequency INTERVAL DEFAULT INTERVAL '12 months',
    last_reviewed_at TIMESTAMPTZ,
    next_review_due TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy impact assessments
CREATE TABLE gdpr.privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pia_id TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    data_controller UUID REFERENCES organizations(id),
    dpo_id UUID REFERENCES user_profiles(id),
    
    -- Assessment scope
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects_categories TEXT[] NOT NULL,
    processing_activities JSONB NOT NULL,
    
    -- Risk assessment
    privacy_risks JSONB NOT NULL,
    risk_mitigation_measures JSONB NOT NULL,
    residual_risk_level TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high')),
    
    -- Consultation and review
    stakeholders_consulted JSONB,
    data_subjects_consulted BOOLEAN DEFAULT false,
    consultation_details TEXT,
    
    -- Approval and monitoring
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'under_review', 'approved', 'rejected', 'requires_updates'
    )),
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    review_due_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for GDPR compliance
CREATE TABLE gdpr.compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    data_subject_id UUID,
    user_id UUID REFERENCES user_profiles(id),
    organization_id UUID REFERENCES organizations(id),
    event_details JSONB NOT NULL,
    legal_basis TEXT,
    purpose TEXT,
    data_categories TEXT[],
    processing_location TEXT,
    retention_applied BOOLEAN DEFAULT false,
    consent_required BOOLEAN DEFAULT false,
    consent_status TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**GDPR API Endpoints:**
```typescript
// POST /api/gdpr/consent/record
interface ConsentRecordRequest {
  data_subject_id: string;
  data_subject_type: 'couple' | 'guest' | 'vendor' | 'contact';
  purpose: string;
  legal_basis: string;
  consent_given: boolean;
  consent_method: 'explicit' | 'opt_in' | 'implied';
  consent_evidence: {
    ip_address: string;
    timestamp: string;
    user_agent: string;
    method_details: Record<string, any>;
  };
  data_categories: string[];
  retention_period?: string;
  third_party_sharing?: boolean;
  marketing_consent?: boolean;
}

// POST /api/gdpr/subject-request/submit
interface DataSubjectRequestSubmission {
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restrict_processing' | 'object_to_processing' | 'withdraw_consent';
  data_subject_email: string;
  data_subject_name: string;
  identity_verification: {
    method: 'email_verification' | 'document_upload' | 'sms_verification';
    evidence: Record<string, any>;
  };
  request_details: Record<string, any>;
  preferred_format?: 'json' | 'csv' | 'pdf';
}

// POST /api/gdpr/breach/report
interface DataBreachReport {
  breach_type: 'confidentiality' | 'integrity' | 'availability' | 'combined';
  breach_cause: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  occurred_at: string;
  discovered_at: string;
  data_subjects_affected: number;
  data_categories_affected: string[];
  potential_consequences: string;
  risk_assessment: Record<string, any>;
  containment_measures: Record<string, any>;
}

// GET /api/gdpr/export/data-subject/{id}
interface DataSubjectExport {
  data_subject_id: string;
  export_timestamp: string;
  personal_data: {
    profile_information: Record<string, any>;
    communication_records: Array<Record<string, any>>;
    transaction_history: Array<Record<string, any>>;
    consent_history: Array<Record<string, any>>;
    uploaded_files: Array<{
      filename: string;
      upload_date: string;
      file_size: number;
      file_type: string;
    }>;
  };
  processing_activities: Array<{
    purpose: string;
    legal_basis: string;
    data_categories: string[];
    retention_period: string;
    third_parties: string[];
  }>;
  metadata: {
    export_format: string;
    total_records: number;
    date_range: { from: string; to: string };
    verification_hash: string;
  };
}
```

### 🛠️ MCP SERVER USAGE INSTRUCTIONS

**Context7 Documentation (REQUIRED):**
```typescript
// Get GDPR compliance documentation
await mcp__context7__resolve_library_id("gdpr-compliance");
await mcp__context7__get_library_docs("/gdpr/gdpr-guide", "data subject rights", 3000);

await mcp__context7__resolve_library_id("privacy-by-design");
await mcp__context7__get_library_docs("/privacy/privacy-design", "consent management", 2500);

await mcp__context7__resolve_library_id("data-retention");
await mcp__context7__get_library_docs("/retention/data-lifecycle", "automated deletion", 2000);
```

**PostgreSQL MCP Operations (REQUIRED):**
```sql
-- Test GDPR compliance queries
SELECT 
    COUNT(*) as total_data_subjects,
    COUNT(CASE WHEN consent_given = true THEN 1 END) as consented_subjects,
    COUNT(CASE WHEN withdrawn_at IS NOT NULL THEN 1 END) as withdrawn_consents,
    AVG(EXTRACT(epoch FROM (consent_expires_at - consent_given_at))) as avg_consent_duration_seconds
FROM gdpr.consent_records 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Identify data subjects with pending requests
SELECT 
    dsr.request_id,
    dsr.data_subject_email,
    dsr.request_type,
    dsr.status,
    dsr.due_date,
    EXTRACT(days FROM (dsr.due_date - NOW())) as days_until_due
FROM gdpr.data_subject_requests dsr
WHERE dsr.status IN ('submitted', 'in_progress', 'identity_pending')
ORDER BY dsr.due_date ASC;

-- Data retention compliance check
SELECT 
    rp.policy_name,
    rp.data_category,
    rp.retention_period,
    COUNT(*) as records_due_for_deletion
FROM gdpr.retention_policies rp
JOIN gdpr.compliance_audit_log cal ON cal.data_categories && ARRAY[rp.data_category]
WHERE cal.created_at < (NOW() - rp.retention_period)
AND rp.active = true
GROUP BY rp.policy_name, rp.data_category, rp.retention_period;
```

**Supabase MCP Configuration:**
```typescript
// Enable RLS for GDPR tables
await mcp__supabase__execute_sql(`
    ALTER TABLE gdpr.consent_records ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can access own consent records" ON gdpr.consent_records
        FOR ALL USING (
            data_subject_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid() 
                AND up.role IN ('admin', 'dpo', 'privacy_officer')
            )
        );
    
    ALTER TABLE gdpr.data_subject_requests ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Data subjects can access own requests" ON gdpr.data_subject_requests
        FOR ALL USING (
            data_subject_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid()
                AND up.role IN ('admin', 'dpo', 'privacy_officer')
            )
        );
        
    -- Function for automated data retention
    CREATE OR REPLACE FUNCTION gdpr.execute_retention_policy()
    RETURNS void AS $$
    BEGIN
        -- Mark records for deletion based on retention policies
        INSERT INTO gdpr.scheduled_deletions (
            table_name, record_id, deletion_reason, scheduled_for
        )
        SELECT 
            'user_profiles', 
            up.id,
            'retention_policy_' || rp.id,
            NOW() + INTERVAL '7 days' -- Grace period
        FROM user_profiles up
        JOIN gdpr.retention_policies rp ON rp.data_category = 'profile_data'
        WHERE up.created_at < (NOW() - rp.retention_period)
        AND rp.active = true
        AND NOT EXISTS (
            SELECT 1 FROM gdpr.scheduled_deletions sd
            WHERE sd.table_name = 'user_profiles' 
            AND sd.record_id = up.id::text
        );
    END;
    $$ LANGUAGE plpgsql;
`);
```

### 🧪 TESTING REQUIREMENTS

**GDPR Compliance Tests:**
```typescript
test('Complete data subject access request workflow', async ({ page }) => {
  // Setup: Create test user with comprehensive data
  await page.evaluate(async () => {
    await fetch('/api/debug/create-gdpr-test-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gdpr.test@wedsync.com',
        name: 'Emma Schmidt',
        create_comprehensive_data: true,
        data_points: [
          'profile', 'photos', 'communications', 'contracts', 
          'payments', 'guest_lists', 'vendor_interactions'
        ]
      })
    });
  });
  
  // Navigate to data subject request portal
  await page.goto('/privacy/data-request');
  
  // Fill out access request form
  await page.fill('[data-testid="requester-email"]', 'gdpr.test@wedsync.com');
  await page.fill('[data-testid="requester-name"]', 'Emma Schmidt');
  await page.selectOption('[data-testid="request-type"]', 'access');
  await page.fill('[data-testid="request-details"]', 'I would like a complete copy of all personal data you hold about me for my wedding planning.');
  await page.selectOption('[data-testid="export-format"]', 'json');
  
  // Submit request
  await page.click('[data-testid="submit-request"]');
  await page.waitForSelector('[data-testid="request-submitted"]');
  
  // Verify request was logged
  const requestId = await page.textContent('[data-testid="request-id"]');
  expect(requestId).toMatch(/^DSR-\d{4}-\d{3}$/); // Format: DSR-2025-001
  
  // Simulate identity verification (would normally require external verification)
  await page.evaluate(async (reqId) => {
    await fetch('/api/debug/verify-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: reqId,
        verification_method: 'email_verification',
        verified: true
      })
    });
  }, requestId);
  
  // Check request processing (simulate admin processing)
  await page.goto(`/admin/gdpr/requests/${requestId}`);
  await page.click('[data-testid="process-request"]');
  
  // Wait for data export generation
  await page.waitForSelector('[data-testid="export-ready"]', { timeout: 30000 });
  
  // Verify export contains all expected data categories
  const exportDetails = await page.evaluate(async (reqId) => {
    const response = await fetch(`/api/gdpr/export/verify/${reqId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }, requestId);
  
  expect(exportDetails.data_categories).toContain('profile_information');
  expect(exportDetails.data_categories).toContain('communication_records');
  expect(exportDetails.data_categories).toContain('uploaded_files');
  expect(exportDetails.total_records).toBeGreaterThan(0);
  expect(exportDetails.export_format).toBe('json');
  expect(exportDetails.verification_hash).toBeDefined();
  
  // Verify completion within legal timeframe (30 days)
  expect(exportDetails.processing_time_hours).toBeLessThan(24); // Should be much faster than 30 days
});

test('GDPR erasure (right to be forgotten) with crypto-shredding', async ({ page }) => {
  // Setup test user with encrypted data
  await page.evaluate(async () => {
    await fetch('/api/debug/create-encrypted-test-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'erasure.test@wedsync.com',
        name: 'Hans Mueller',
        create_encrypted_data: true,
        encryption_level: 'advanced'
      })
    });
  });
  
  // Verify data exists before erasure
  const preErasureData = await page.evaluate(async () => {
    const response = await fetch('/api/debug/check-user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'erasure.test@wedsync.com'
      })
    });
    return response.json();
  });
  
  expect(preErasureData.user_exists).toBe(true);
  expect(preErasureData.encrypted_fields_count).toBeGreaterThan(0);
  
  // Submit erasure request
  await page.goto('/privacy/data-request');
  await page.fill('[data-testid="requester-email"]', 'erasure.test@wedsync.com');
  await page.fill('[data-testid="requester-name"]', 'Hans Mueller');
  await page.selectOption('[data-testid="request-type"]', 'erasure');
  await page.fill('[data-testid="request-details"]', 'Please delete all my personal data as I no longer wish to use your service.');
  
  await page.click('[data-testid="submit-request"]');
  const erasureRequestId = await page.textContent('[data-testid="request-id"]');
  
  // Verify identity and process erasure
  await page.evaluate(async (reqId) => {
    await fetch('/api/debug/verify-and-process-erasure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: reqId,
        verification_confirmed: true,
        deletion_method: 'crypto_shred'
      })
    });
  }, erasureRequestId);
  
  await page.waitForTimeout(5000); // Allow processing time
  
  // Verify complete data erasure
  const postErasureData = await page.evaluate(async () => {
    const response = await fetch('/api/debug/check-user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'erasure.test@wedsync.com'
      })
    });
    return response.json();
  });
  
  expect(postErasureData.user_exists).toBe(false);
  expect(postErasureData.data_recoverable).toBe(false);
  expect(postErasureData.crypto_shred_completed).toBe(true);
  
  // Verify audit trail exists (should be anonymized)
  const auditTrail = await page.evaluate(async (reqId) => {
    const response = await fetch(`/api/gdpr/audit/erasure/${reqId}`, {
      method: 'GET'
    });
    return response.json();
  }, erasureRequestId);
  
  expect(auditTrail.erasure_completed).toBe(true);
  expect(auditTrail.data_subject_identifier).toBe('[ERASED]');
  expect(auditTrail.deletion_method).toBe('crypto_shred');
});

test('Data breach notification compliance (72-hour rule)', async ({ page }) => {
  // Simulate data breach detection
  await page.goto('/admin/security/breach-simulation');
  
  // Configure breach scenario
  await page.selectOption('[data-testid="breach-type"]', 'confidentiality');
  await page.selectOption('[data-testid="breach-cause"]', 'cyber_attack');
  await page.selectOption('[data-testid="severity-level"]', 'high');
  await page.fill('[data-testid="affected-subjects"]', '150');
  await page.check('[data-testid="includes-sensitive-data"]');
  
  const breachStartTime = Date.now();
  
  // Initiate breach response
  await page.click('[data-testid="initiate-breach-response"]');
  await page.waitForSelector('[data-testid="breach-response-initiated"]');
  
  const breachId = await page.textContent('[data-testid="breach-id"]');
  expect(breachId).toMatch(/^BR-\d{4}-\d{3}$/);
  
  // Verify immediate actions triggered
  await page.waitForSelector('[data-testid="dpo-notified"]', { timeout: 5000 });
  await page.waitForSelector('[data-testid="containment-initiated"]', { timeout: 5000 });
  
  // Check supervisory authority notification requirement
  const notificationAssessment = await page.evaluate(async (bId) => {
    const response = await fetch(`/api/gdpr/breach/assess-notification/${bId}`, {
      method: 'GET'
    });
    return response.json();
  }, breachId);
  
  expect(notificationAssessment.supervisory_authority_required).toBe(true); // High severity breach
  expect(notificationAssessment.data_subject_notification_required).toBe(true); // Sensitive data involved
  expect(notificationAssessment.deadline_hours).toBe(72);
  
  // Simulate breach resolution and verify compliance
  await page.click('[data-testid="mark-breach-contained"]');
  await page.fill('[data-testid="containment-details"]', 'Security vulnerability patched, affected systems isolated, monitoring enhanced');
  await page.click('[data-testid="submit-containment"]');
  
  // Verify notifications sent within timeframe
  const notificationStatus = await page.evaluate(async (bId) => {
    const response = await fetch(`/api/gdpr/breach/notification-status/${bId}`, {
      method: 'GET'
    });
    return response.json();
  }, breachId);
  
  const breachProcessingTime = Date.now() - breachStartTime;
  expect(breachProcessingTime).toBeLessThan(3600000); // Under 1 hour (well within 72-hour requirement)
  expect(notificationStatus.supervisory_authority_notified).toBe(true);
  expect(notificationStatus.data_subjects_notified).toBe(true);
});

test('Cookie consent banner and granular consent management', async ({ page }) => {
  // Navigate to site as new visitor
  await page.goto('/');
  
  // Verify cookie consent banner appears
  await page.waitForSelector('[data-testid="cookie-consent-banner"]');
  
  // Check granular consent options
  const consentOptions = await page.$$('[data-testid^="consent-option-"]');
  expect(consentOptions.length).toBeGreaterThanOrEqual(4); // Essential, Analytics, Marketing, Personalization
  
  // Verify essential cookies are pre-selected and disabled (can't be unchecked)
  const essentialCheckbox = await page.$('[data-testid="consent-option-essential"] input');
  const isEssentialChecked = await essentialCheckbox.isChecked();
  const isEssentialDisabled = await essentialCheckbox.isDisabled();
  
  expect(isEssentialChecked).toBe(true);
  expect(isEssentialDisabled).toBe(true);
  
  // Test selective consent
  await page.check('[data-testid="consent-option-analytics"] input');
  await page.uncheck('[data-testid="consent-option-marketing"] input');
  await page.check('[data-testid="consent-option-personalization"] input');
  
  await page.click('[data-testid="save-consent-preferences"]');
  await page.waitForSelector('[data-testid="consent-saved-confirmation"]');
  
  // Verify consent was recorded properly
  const consentRecord = await page.evaluate(async () => {
    const response = await fetch('/api/gdpr/consent/current-user', {
      method: 'GET'
    });
    return response.json();
  });
  
  expect(consentRecord.essential).toBe(true);
  expect(consentRecord.analytics).toBe(true);
  expect(consentRecord.marketing).toBe(false);
  expect(consentRecord.personalization).toBe(true);
  expect(consentRecord.consent_method).toBe('explicit');
  expect(consentRecord.evidence.timestamp).toBeDefined();
  expect(consentRecord.evidence.ip_address).toBeDefined();
  
  // Test consent withdrawal
  await page.goto('/privacy/manage-consent');
  await page.uncheck('[data-testid="current-consent-analytics"] input');
  await page.click('[data-testid="update-consent"]');
  
  // Verify withdrawal was recorded
  const updatedConsent = await page.evaluate(async () => {
    const response = await fetch('/api/gdpr/consent/current-user', {
      method: 'GET'
    });
    return response.json();
  });
  
  expect(updatedConsent.analytics).toBe(false);
  expect(updatedConsent.last_modified).toBeDefined();
});
```

### 🔄 INTEGRATION DEPENDENCIES

**Team Coordination Requirements:**
- **Team D (WS-148)**: Your GDPR erasure relies on their crypto-shredding functionality for permanent data deletion
- **Team C (WS-147)**: Authentication security enhancements must support GDPR identity verification requirements
- **Team A & B**: Consent management affects all frontend components and user workflows
- **All Teams**: Every feature must respect GDPR consent status and data retention policies

**Cross-Feature Impact:**
```typescript
// Every data collection point needs consent management
interface GDPRDataCollection {
  client_profile: {
    data_categories: ['name', 'email', 'phone', 'address', 'wedding_details'];
    legal_basis: 'contract';
    consent_required: false; // Contract performance
    retention_period: '7 years'; // Legal requirement
  };
  
  marketing_communications: {
    data_categories: ['email', 'preferences', 'engagement_history'];
    legal_basis: 'consent';
    consent_required: true;
    retention_period: 'until_withdrawn';
  };
  
  photo_sharing: {
    data_categories: ['photos', 'faces', 'location_data'];
    legal_basis: 'consent';
    consent_required: true; // Explicit consent needed
    retention_period: '2 years';
  };
  
  analytics_tracking: {
    data_categories: ['usage_patterns', 'device_info', 'performance_metrics'];
    legal_basis: 'legitimate_interests';
    consent_required: true; // Can be objected to
    retention_period: '13 months';
  };
}
```

### 🎯 ACCEPTANCE CRITERIA

**Core GDPR Rights Implementation:**
- [ ] Data subject access requests processed within 30 days (automated for common cases)
- [ ] Right to rectification allows users to update all personal data
- [ ] Right to erasure with crypto-shredding ensures data is truly unrecoverable
- [ ] Data portability exports in machine-readable formats (JSON, CSV)
- [ ] Right to restrict processing stops automated data usage
- [ ] Right to object to processing respected for all marketing activities

**Consent Management:**
- [ ] Granular consent options for different purposes (analytics, marketing, personalization)
- [ ] Consent banner complies with EU requirements (clear, specific, informed)
- [ ] Easy consent withdrawal mechanism available at all times
- [ ] Consent records include proof of how/when consent was given
- [ ] Age verification for users under 16 (where applicable)

**Data Breach Response:**
- [ ] Automated breach detection and classification system
- [ ] Supervisory authority notification within 72 hours for high-risk breaches
- [ ] Data subject notification system for breaches likely to cause harm
- [ ] Breach response workflows with defined roles and responsibilities
- [ ] Comprehensive breach documentation for regulatory compliance

**Privacy by Design:**
- [ ] Data minimization principles applied to all data collection
- [ ] Purpose limitation enforced through technical controls
- [ ] Storage limitation with automated data retention enforcement
- [ ] Accuracy maintained through data validation and update mechanisms
- [ ] Accountability demonstrated through comprehensive audit logs

**International Compliance:**
- [ ] Adequacy decisions respected for international data transfers
- [ ] Standard contractual clauses implemented where needed
- [ ] Data localization requirements met for specific jurisdictions
- [ ] Cross-border data flow controls and monitoring

### 📊 SUCCESS METRICS

**Compliance Performance:**
- Data subject request processing time: Average <7 days (legal limit: 30 days)
- Consent withdrawal processing: Immediate (within 24 hours)
- Data breach notification time: <24 hours (legal limit: 72 hours)
- Data retention policy compliance: 100% automated enforcement
- Privacy impact assessment coverage: 100% of high-risk processing

**User Experience Metrics:**
- Consent banner interaction rate: >85% engagement
- Data subject request satisfaction: >95% positive feedback
- Privacy policy readability: Automated scoring >8/10
- Consent withdrawal completion rate: >95% successful
- Privacy preferences accessibility: Full keyboard navigation support

**Business Impact:**
- Zero regulatory fines or penalties
- Wedding suppliers confidently serve EU customers
- Trust metrics: Increased customer confidence in data handling
- Competitive advantage in privacy-conscious markets
- Reduced legal risks and insurance costs

This implementation establishes WedSync as the most privacy-compliant wedding platform globally, giving couples and suppliers complete confidence in their data protection.

---

**Ready to build trust through bulletproof privacy compliance? Let's make GDPR our competitive advantage! 🛡️⚖️**