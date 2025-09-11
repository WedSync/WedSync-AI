# WS-149: GDPR Compliance Technical Specification

## 1. User Story & Real-World Wedding Scenario

**As a European wedding planner Marie**, I need comprehensive GDPR compliance to legally process personal data of EU couples, suppliers, and guests while ensuring their privacy rights are protected and my business avoids €20M fines for non-compliance violations.

**Real Wedding Scenario**: Marie plans a French château wedding for a German couple with guests from 15 EU countries. She processes sensitive data including dietary restrictions (health data), VIP guests' security requirements, children's information, and payment details. When a guest requests data deletion under Article 17, Marie must comply within 30 days while maintaining other guests' privacy and wedding coordination continuity.

**Business Impact**: 
- Avoids up to €20M or 4% annual revenue GDPR fines
- Maintains legal right to operate in EU markets
- Builds client trust with transparent privacy practices
- Enables legitimate data processing for business operations
- Protects against data protection authority investigations

## 2. Technical Architecture

### GDPR Compliance Framework
```typescript
// Comprehensive GDPR compliance architecture
interface GDPRArchitecture {
  dataSubjectRights: {
    rightToAccess: DataPortabilitySystem;
    rightToRectification: DataCorrectionWorkflow;
    rightToErasure: CryptoShreddingSystem;
    rightToPortability: MachineReadableExport;
    rightToObject: ProcessingOptOutSystem;
    rightToRestrict: DataProcessingControls;
  };
  legalBasisManagement: {
    consent: ConsentManagementSystem;
    contract: ContractualNecessity;
    legalObligation: ComplianceProcessing;
    vitalInterests: EmergencyProcessing;
    publicTask: PublicInterestProcessing;
    legitimateInterests: BalancingTest;
  };
  privacyByDesign: {
    dataMinimization: AutomaticPurging;
    purposeLimitation: ProcessingRestrictions;
    storageMinimization: RetentionPolicies;
    transparency: PrivacyNotices;
    security: EncryptionByDefault;
    accountability: AuditTrails;
  };
  breachManagement: {
    detection: AutomatedMonitoring;
    assessment: RiskEvaluation;
    notification: AuthorityReporting;
    communication: DataSubjectNotification;
    documentation: IncidentResponse;
  };
}
```

### Data Protection Impact Assessment (DPIA) System
```typescript
enum DataProcessingRisk {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface DPIAAssessment {
  processingActivity: string;
  dataCategories: DataCategory[];
  riskFactors: RiskFactor[];
  safeguards: Safeguard[];
  residualRisk: DataProcessingRisk;
  approvalRequired: boolean;
  reviewDate: Date;
}
```

## 3. Database Schema

```sql
-- GDPR consent management
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- marketing, cookies, data_sharing, processing
  purpose TEXT NOT NULL, -- Specific purpose for processing
  legal_basis TEXT NOT NULL, -- consent, contract, legal_obligation, etc.
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL, -- Version of consent text/privacy policy
  language_code TEXT NOT NULL, -- Language consent was given in
  
  -- Consent metadata
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  consent_method TEXT, -- checkbox, explicit_action, pre_ticked, etc.
  
  -- Timestamps
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For time-limited consent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification
  consent_proof_hash TEXT, -- Hash of consent interaction
  
  UNIQUE(user_id, consent_type, purpose),
  INDEX idx_consent_records_user_id ON consent_records(user_id),
  INDEX idx_consent_records_granted ON consent_records(granted, expires_at),
  INDEX idx_consent_records_consent_type ON consent_records(consent_type)
);

-- Consent history for audit trail
CREATE TABLE consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_record_id UUID REFERENCES consent_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- granted, withdrawn, updated, expired
  previous_state JSONB,
  new_state JSONB,
  reason TEXT, -- Reason for change
  changed_by UUID REFERENCES auth.users(id), -- Who made the change
  change_method TEXT, -- user_action, automated, admin
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_consent_history_consent_id ON consent_history(consent_record_id),
  INDEX idx_consent_history_timestamp ON consent_history(timestamp DESC)
);

-- Data subject access requests
CREATE TABLE data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE, -- User-friendly request ID
  user_id UUID REFERENCES auth.users(id),
  requester_email TEXT NOT NULL,
  request_type TEXT NOT NULL, -- access, rectification, erasure, portability, restriction
  
  -- Identity verification
  identity_verified BOOLEAN DEFAULT false,
  verification_method TEXT, -- email_link, phone_sms, document_upload
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Request details
  request_details JSONB, -- Specific fields or data categories requested
  legal_basis_cited TEXT, -- Which GDPR article cited
  urgency_level TEXT DEFAULT 'normal', -- normal, urgent, child_data
  
  -- Processing status
  status TEXT DEFAULT 'pending', -- pending, verified, processing, completed, rejected
  assigned_to UUID REFERENCES auth.users(id), -- DPO or assigned staff
  priority INTEGER DEFAULT 3, -- 1 (urgent) to 5 (low)
  
  -- Response details
  response_data JSONB, -- Collected data for the response
  response_method TEXT, -- secure_download, encrypted_email, postal_mail
  response_sent_at TIMESTAMPTZ,
  completion_reason TEXT,
  
  -- Compliance tracking
  received_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ GENERATED ALWAYS AS (received_at + INTERVAL '30 days') STORED,
  completed_at TIMESTAMPTZ,
  
  -- Communication log
  communications JSONB DEFAULT '[]', -- Array of communications with requestor
  
  INDEX idx_dsr_user_id ON data_subject_requests(user_id),
  INDEX idx_dsr_status ON data_subject_requests(status),
  INDEX idx_dsr_due_date ON data_subject_requests(due_date),
  INDEX idx_dsr_request_type ON data_subject_requests(request_type)
);

-- GDPR processing activities registry (Article 30)
CREATE TABLE processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  
  -- Controller information
  controller_name TEXT DEFAULT 'WedSync Ltd',
  controller_contact JSONB, -- Contact details
  
  -- Joint controllers or processors
  processors JSONB DEFAULT '[]', -- Array of processor details
  joint_controllers JSONB DEFAULT '[]',
  
  -- Data categories
  personal_data_categories TEXT[], -- Names, emails, addresses, etc.
  special_categories TEXT[], -- Health, religious beliefs, etc.
  data_subjects_categories TEXT[], -- Couples, suppliers, guests, employees
  
  -- Processing details
  purposes TEXT[] NOT NULL, -- Wedding planning, marketing, etc.
  legal_basis TEXT[] NOT NULL, -- Array as multiple bases may apply
  legitimate_interests_assessment TEXT, -- For legitimate interest basis
  
  -- Recipients and transfers
  recipients TEXT[], -- Who receives the data
  international_transfers JSONB DEFAULT '[]', -- Third country transfers
  safeguards_for_transfers JSONB, -- Adequacy decisions, SCCs, etc.
  
  -- Retention and deletion
  retention_period TEXT, -- How long data is kept
  deletion_criteria TEXT, -- When data is deleted
  
  -- Security measures
  technical_safeguards TEXT[],
  organizational_safeguards TEXT[],
  
  -- DPIA requirement
  dpia_required BOOLEAN DEFAULT false,
  dpia_completed_at TIMESTAMPTZ,
  dpia_review_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  next_review_date DATE,
  
  INDEX idx_processing_activities_legal_basis ON processing_activities USING GIN(legal_basis),
  INDEX idx_processing_activities_purposes ON processing_activities USING GIN(purposes),
  INDEX idx_processing_activities_review_date ON processing_activities(next_review_date)
);

-- Data breach incidents register
CREATE TABLE data_breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id TEXT NOT NULL UNIQUE, -- User-friendly incident ID (e.g., BR-2024-001)
  
  -- Incident details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  breach_type TEXT NOT NULL, -- confidentiality, integrity, availability
  cause TEXT, -- human_error, cyberattack, system_failure, etc.
  
  -- Timeline
  occurred_at TIMESTAMPTZ, -- When breach actually happened
  discovered_at TIMESTAMPTZ NOT NULL, -- When breach was discovered
  contained_at TIMESTAMPTZ, -- When breach was contained
  resolved_at TIMESTAMPTZ, -- When breach was resolved
  
  -- Impact assessment
  affected_individuals_count INTEGER,
  data_categories_affected TEXT[],
  special_categories_affected TEXT[],
  severity TEXT NOT NULL, -- low, medium, high, critical
  likelihood_of_harm TEXT NOT NULL, -- low, medium, high
  
  -- Affected data subjects
  affected_users JSONB DEFAULT '[]', -- Array of affected user IDs
  
  -- Notifications required
  authority_notification_required BOOLEAN,
  individual_notification_required BOOLEAN,
  
  -- Authority notification (72 hour rule)
  authority_notified BOOLEAN DEFAULT false,
  authority_notification_sent_at TIMESTAMPTZ,
  authority_notification_method TEXT, -- online_form, email, phone
  authority_response JSONB,
  
  -- Individual notifications
  individuals_notified BOOLEAN DEFAULT false,
  individual_notifications_sent_at TIMESTAMPTZ,
  notification_method TEXT[], -- email, sms, postal, website_notice
  
  -- Response actions
  immediate_actions TEXT[],
  corrective_actions TEXT[],
  preventive_actions TEXT[],
  
  -- Investigation
  investigated_by UUID REFERENCES auth.users(id),
  investigation_status TEXT DEFAULT 'ongoing', -- ongoing, completed, external_review
  investigation_notes TEXT,
  root_cause_analysis JSONB,
  
  -- Documentation
  evidence_collected JSONB DEFAULT '[]',
  legal_assessment TEXT,
  lessons_learned TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'open', -- open, investigating, contained, resolved, closed
  assigned_to UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_breach_incidents_discovered_at ON data_breach_incidents(discovered_at DESC),
  INDEX idx_breach_incidents_severity ON data_breach_incidents(severity),
  INDEX idx_breach_incidents_status ON data_breach_incidents(status),
  INDEX idx_breach_incidents_authority_notification ON data_breach_incidents(authority_notification_required, authority_notified)
);

-- GDPR-compliant audit log
CREATE TABLE gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_type TEXT NOT NULL, -- data_access, data_modification, consent_change, etc.
  event_category TEXT NOT NULL, -- processing, security, consent, breach
  
  -- Data subject information
  data_subject_id UUID, -- May reference deleted users
  data_subject_email TEXT, -- Stored separately for audit trail
  
  -- Processing context
  processing_activity TEXT, -- Which registered activity
  legal_basis TEXT, -- Legal basis for this processing
  purpose TEXT, -- Specific purpose
  
  -- Technical details
  user_id UUID REFERENCES auth.users(id), -- Who performed the action
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Data accessed/modified
  data_categories TEXT[], -- Categories of personal data involved
  data_fields TEXT[], -- Specific fields accessed
  data_before JSONB, -- Previous values (encrypted if sensitive)
  data_after JSONB, -- New values (encrypted if sensitive)
  
  -- System context
  application_version TEXT,
  api_endpoint TEXT,
  request_id TEXT,
  
  -- Compliance context
  retention_applied BOOLEAN, -- Whether retention policy was applied
  consent_checked BOOLEAN, -- Whether consent was verified
  consent_valid BOOLEAN, -- Whether consent was valid
  
  -- Metadata
  severity_level TEXT DEFAULT 'normal', -- low, normal, high, critical
  automated_action BOOLEAN DEFAULT false, -- Was this an automated action
  
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for compliance queries
  INDEX idx_gdpr_audit_log_data_subject_id ON gdpr_audit_log(data_subject_id),
  INDEX idx_gdpr_audit_log_event_type ON gdpr_audit_log(event_type),
  INDEX idx_gdpr_audit_log_timestamp ON gdpr_audit_log(timestamp DESC),
  INDEX idx_gdpr_audit_log_user_id ON gdpr_audit_log(user_id),
  INDEX idx_gdpr_audit_log_processing_activity ON gdpr_audit_log(processing_activity),
  INDEX idx_gdpr_audit_log_legal_basis ON gdpr_audit_log(legal_basis)
);

-- Cookie and tracking consent
CREATE TABLE cookie_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For non-logged-in users
  
  -- Consent categories
  necessary_cookies BOOLEAN DEFAULT true, -- Always true, can't be disabled
  functional_cookies BOOLEAN DEFAULT false,
  analytics_cookies BOOLEAN DEFAULT false,
  marketing_cookies BOOLEAN DEFAULT false,
  
  -- Consent metadata
  consent_banner_version TEXT NOT NULL,
  granular_choice_made BOOLEAN DEFAULT false, -- Did user make granular choices
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '13 months'), -- 13 months max
  withdrawn_at TIMESTAMPTZ,
  
  -- Cookie details
  cookies_accepted JSONB DEFAULT '{}', -- Specific cookies accepted
  cookies_rejected JSONB DEFAULT '{}', -- Specific cookies rejected
  
  UNIQUE(user_id, consent_banner_version),
  INDEX idx_cookie_consent_user_id ON cookie_consent(user_id),
  INDEX idx_cookie_consent_expires_at ON cookie_consent(expires_at),
  INDEX idx_cookie_consent_session_id ON cookie_consent(session_id)
);

-- Data retention policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL UNIQUE,
  
  -- Data scope
  data_category TEXT NOT NULL,
  data_types TEXT[],
  applies_to_users JSONB, -- Criteria for which users this applies to
  
  -- Retention rules
  retention_period INTERVAL NOT NULL,
  retention_start_trigger TEXT NOT NULL, -- creation, last_access, inactivity, etc.
  legal_basis_for_retention TEXT,
  
  -- Deletion rules
  deletion_method TEXT NOT NULL, -- soft_delete, hard_delete, anonymization, crypto_shredding
  deletion_schedule TEXT, -- immediate, batch_monthly, etc.
  exceptions JSONB DEFAULT '[]', -- Legal hold, active legal proceedings
  
  -- Approval and compliance
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  legal_review_date DATE,
  next_review_date DATE,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_retention_policies_data_category ON data_retention_policies(data_category),
  INDEX idx_retention_policies_active ON data_retention_policies(active),
  INDEX idx_retention_policies_review_date ON data_retention_policies(next_review_date)
);

-- Create custom enum types
CREATE TYPE CONSENT_TYPE AS ENUM (
  'marketing',
  'cookies', 
  'data_sharing',
  'processing',
  'profiling',
  'automated_decision_making'
);

CREATE TYPE REQUEST_TYPE AS ENUM (
  'access',
  'rectification',
  'erasure',
  'portability',
  'restriction',
  'objection'
);

CREATE TYPE BREACH_SEVERITY AS ENUM (
  'low',
  'medium', 
  'high',
  'critical'
);
```

## 4. API Endpoints

### Data Subject Rights API
```typescript
interface DataSubjectRightsAPI {
  // Right of Access (Article 15)
  'POST /gdpr/access-request': {
    body: {
      email: string;
      identityProof?: File; // For high-risk requests
      specificData?: string[]; // Specific data categories requested
    };
    response: {
      requestId: string;
      status: 'pending_verification' | 'verified' | 'processing';
      estimatedCompletion: string;
      verificationRequired: boolean;
    };
  };

  'GET /gdpr/access-request/:requestId/verify': {
    query: { token: string };
    response: {
      verified: boolean;
      downloadUrl?: string; // Encrypted data package
      expiresAt?: string;
    };
  };

  // Right to Rectification (Article 16)
  'POST /gdpr/rectification-request': {
    body: {
      email: string;
      corrections: {
        field: string;
        currentValue: string;
        correctedValue: string;
        reason: string;
      }[];
      notifyThirdParties?: boolean;
    };
    response: {
      requestId: string;
      status: 'pending' | 'approved' | 'completed';
      affectedSystems: string[];
    };
  };

  // Right to Erasure (Article 17)
  'POST /gdpr/erasure-request': {
    body: {
      email: string;
      reason: 'withdrawal' | 'unlawful' | 'no_longer_necessary' | 'objection';
      specificData?: string[];
      retainForLegalReasons?: boolean;
    };
    response: {
      requestId: string;
      eligibilityCheck: {
        canErase: boolean;
        restrictions: string[];
        partialErasure: boolean;
      };
      estimatedCompletion?: string;
    };
  };

  // Right to Data Portability (Article 20)
  'POST /gdpr/portability-request': {
    body: {
      email: string;
      format: 'json' | 'csv' | 'xml';
      includeProcessedData?: boolean;
    };
    response: {
      requestId: string;
      dataPackageSize: number;
      downloadUrl?: string;
      expiresAt: string;
    };
  };

  // Right to Object (Article 21)
  'POST /gdpr/objection': {
    body: {
      email: string;
      processingActivity: string;
      reason: string;
      stopProcessing: boolean;
    };
    response: {
      objectionId: string;
      processingsStopped: string[];
      overridingInterests?: {
        assessment: string;
        canContinue: boolean;
      };
    };
  };

  // Right to Restrict Processing (Article 18)
  'POST /gdpr/restriction-request': {
    body: {
      email: string;
      reason: 'accuracy_contested' | 'unlawful_processing' | 'data_no_longer_needed' | 'objection_pending';
      dataCategories: string[];
      temporaryRestriction: boolean;
    };
    response: {
      restrictionId: string;
      restrictedProcessing: string[];
      reviewDate: string;
    };
  };
}
```

### Consent Management API
```typescript
interface ConsentManagementAPI {
  // Consent recording
  'POST /gdpr/consent': {
    body: {
      userId?: string;
      sessionId?: string; // For non-logged-in users
      consents: {
        type: ConsentType;
        purpose: string;
        granted: boolean;
        legalBasis: string;
        method: 'explicit' | 'opt_in' | 'pre_checked' | 'inferred';
        expiresAt?: string;
      }[];
      consentProof: {
        timestamp: string;
        userAgent: string;
        ipAddress: string;
        consentText: string;
        version: string;
      };
    };
    response: {
      consentIds: string[];
      validUntil: string;
      processingAllowed: {
        marketing: boolean;
        analytics: boolean;
        sharing: boolean;
      };
    };
  };

  // Consent withdrawal
  'DELETE /gdpr/consent': {
    body: {
      userId?: string;
      consentTypes: ConsentType[];
      reason?: string;
      withdrawAll?: boolean;
    };
    response: {
      withdrawnConsents: string[];
      affectedProcessing: string[];
      effectiveFrom: string;
    };
  };

  // Consent status check
  'GET /gdpr/consent/status': {
    query: {
      userId?: string;
      email?: string;
      purpose?: string;
    };
    response: {
      consents: {
        type: ConsentType;
        purpose: string;
        granted: boolean;
        grantedAt: string;
        expiresAt?: string;
        version: string;
        withdrawable: boolean;
      }[];
      overallStatus: 'valid' | 'expired' | 'withdrawn' | 'mixed';
    };
  };

  // Cookie consent management
  'POST /gdpr/cookies/consent': {
    body: {
      userId?: string;
      sessionId?: string;
      necessary: boolean;
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
      granularChoice: boolean;
      bannerVersion: string;
    };
    response: {
      consentId: string;
      cookiesAllowed: {
        necessary: string[];
        functional: string[];
        analytics: string[];
        marketing: string[];
      };
      expiresAt: string;
    };
  };
}
```

### GDPR Administration API
```typescript
interface GDPRAdministrationAPI {
  // Data breach reporting
  'POST /gdpr/breach/report': {
    body: {
      title: string;
      description: string;
      breachType: 'confidentiality' | 'integrity' | 'availability';
      occurredAt: string;
      discoveredAt: string;
      affectedUsers: number;
      dataCategories: string[];
      severity: 'low' | 'medium' | 'high' | 'critical';
      containmentActions: string[];
    };
    response: {
      incidentId: string;
      authorityNotificationRequired: boolean;
      individualNotificationRequired: boolean;
      reportingDeadline: string;
    };
  };

  // Processing activity registry
  'POST /gdpr/processing-activities': {
    body: {
      name: string;
      description: string;
      purposes: string[];
      legalBasis: string[];
      dataCategories: string[];
      dataSubjects: string[];
      recipients: string[];
      internationalTransfers?: {
        country: string;
        safeguards: string;
        adequacyDecision: boolean;
      }[];
      retentionPeriod: string;
      dpiaRequired: boolean;
    };
    response: {
      activityId: string;
      registrationNumber: string;
      nextReviewDate: string;
      complianceStatus: 'compliant' | 'review_needed' | 'non_compliant';
    };
  };

  // Compliance monitoring
  'GET /gdpr/compliance/status': {
    response: {
      overallScore: number; // 0-100 compliance score
      areas: {
        consentManagement: ComplianceArea;
        dataSubjectRights: ComplianceArea;
        dataProtection: ComplianceArea;
        breachResponse: ComplianceArea;
        recordKeeping: ComplianceArea;
      };
      recommendations: string[];
      nextAuditDate: string;
    };
  };

  // Compliance reporting
  'GET /gdpr/reports/compliance': {
    query: {
      startDate: string;
      endDate: string;
      format: 'json' | 'pdf' | 'csv';
      includePersonalData?: boolean;
    };
    response: {
      reportId: string;
      downloadUrl: string;
      generatedAt: string;
      expiresAt: string;
    };
  };
}
```

## 5. Frontend Components

### GDPR Consent Management Interface
```tsx
// Comprehensive consent management with granular controls
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Info, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConsentRecord {
  id: string;
  type: string;
  purpose: string;
  description: string;
  granted: boolean;
  grantedAt: string;
  expiresAt?: string;
  version: string;
  essential: boolean;
  canWithdraw: boolean;
}

interface ConsentStatus {
  consents: ConsentRecord[];
  overallStatus: 'valid' | 'expired' | 'withdrawn' | 'mixed';
  lastUpdated: string;
}

export function GDPRConsentManager() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string[]>([]);

  useEffect(() => {
    loadConsentStatus();
  }, []);

  const loadConsentStatus = async () => {
    try {
      const response = await fetch('/gdpr/consent/status', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setConsentStatus(data);
    } catch (error) {
      console.error('Failed to load consent status:', error);
    }
    setLoading(false);
  };

  const updateConsent = async (consentId: string, granted: boolean, purpose: string) => {
    setUpdating([...updating, consentId]);
    
    try {
      const response = await fetch('/gdpr/consent', {
        method: granted ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          consents: [{
            type: consentId,
            purpose,
            granted,
            method: 'explicit'
          }],
          consentProof: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ipAddress: 'client-side', // Will be set server-side
            consentText: `User ${granted ? 'granted' : 'withdrew'} consent for ${purpose}`,
            version: '2024-01'
          }
        })
      });

      if (response.ok) {
        await loadConsentStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
    
    setUpdating(updating.filter(id => id !== consentId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="text-green-500" size={16} />;
      case 'expired': return <Clock className="text-yellow-500" size={16} />;
      case 'withdrawn': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Info className="text-gray-500" size={16} />;
    }
  };

  const getConsentBadgeColor = (consent: ConsentRecord) => {
    if (!consent.granted) return 'bg-red-100 text-red-800 border-red-200';
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getConsentBadgeText = (consent: ConsentRecord) => {
    if (!consent.granted) return 'Withdrawn';
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) return 'Expired';
    return 'Active';
  };

  if (loading) return <div>Loading consent preferences...</div>;
  if (!consentStatus) return <div>Failed to load consent status</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-600" />
          Privacy & Consent Management
        </h1>
        <div className="flex items-center gap-2">
          {getStatusIcon(consentStatus.overallStatus)}
          <span className="text-sm text-gray-600">
            Last updated: {new Date(consentStatus.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900">Your Data Protection Rights</h3>
            <p className="text-sm text-blue-800 mt-1">
              Under GDPR, you have the right to control how your personal data is used. 
              You can grant, withdraw, or modify your consent at any time. Some processing 
              is necessary for our services and cannot be disabled.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="consent" className="w-full">
        <TabsList>
          <TabsTrigger value="consent">Consent Preferences</TabsTrigger>
          <TabsTrigger value="cookies">Cookie Settings</TabsTrigger>
          <TabsTrigger value="history">Consent History</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
        </TabsList>

        <TabsContent value="consent" className="space-y-4">
          <div className="grid gap-4">
            {consentStatus.consents.map((consent) => (
              <Card key={consent.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{consent.purpose}</h3>
                      <Badge className={getConsentBadgeColor(consent)}>
                        {getConsentBadgeText(consent)}
                      </Badge>
                      {consent.essential && (
                        <Badge variant="outline">Essential</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {consent.description}
                    </p>

                    <div className="text-xs text-gray-500 space-y-1">
                      {consent.granted && (
                        <div>Granted: {new Date(consent.grantedAt).toLocaleDateString()}</div>
                      )}
                      {consent.expiresAt && (
                        <div>Expires: {new Date(consent.expiresAt).toLocaleDateString()}</div>
                      )}
                      <div>Version: {consent.version}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={consent.granted}
                      onCheckedChange={(checked) => updateConsent(consent.id, checked, consent.purpose)}
                      disabled={consent.essential || updating.includes(consent.id)}
                    />
                    {updating.includes(consent.id) && (
                      <div className="text-sm text-gray-500">Updating...</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cookies" className="space-y-4">
          <CookieConsentSettings />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ConsentHistory />
        </TabsContent>

        <TabsContent value="rights" className="space-y-4">
          <DataSubjectRights />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Cookie consent settings component
function CookieConsentSettings() {
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true, // Always required
    functional: false,
    analytics: false,
    marketing: false
  });

  const updateCookieConsent = async (category: string, enabled: boolean) => {
    try {
      await fetch('/gdpr/cookies/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          ...cookieSettings,
          [category]: enabled,
          granularChoice: true,
          bannerVersion: '2024-01'
        })
      });

      setCookieSettings(prev => ({ ...prev, [category]: enabled }));
    } catch (error) {
      console.error('Failed to update cookie consent:', error);
    }
  };

  const cookieCategories = [
    {
      id: 'necessary',
      name: 'Necessary Cookies',
      description: 'Essential for the website to function properly. Cannot be disabled.',
      essential: true
    },
    {
      id: 'functional',
      name: 'Functional Cookies',
      description: 'Remember your preferences and personalize your experience.',
      essential: false
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors use our website to improve it.',
      essential: false
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements and track campaign effectiveness.',
      essential: false
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Info className="text-amber-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900">About Cookies</h3>
            <p className="text-sm text-amber-800 mt-1">
              We use cookies to enhance your experience, provide functionality, and analyze our traffic. 
              You can choose which types of cookies to accept.
            </p>
          </div>
        </div>
      </Card>

      {cookieCategories.map((category) => (
        <Card key={category.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{category.name}</h3>
                {category.essential && (
                  <Badge variant="outline">Required</Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                {category.description}
              </p>
            </div>

            <Switch
              checked={cookieSettings[category.id]}
              onCheckedChange={(checked) => updateCookieConsent(category.id, checked)}
              disabled={category.essential}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Data subject rights interface
function DataSubjectRights() {
  const [requestType, setRequestType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const submitRequest = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/gdpr/${type}-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          email: getCurrentUserEmail(),
          reason: 'User requested via privacy dashboard'
        })
      });

      const result = await response.json();
      
      // Show success message with request ID
      alert(`Request submitted successfully. Request ID: ${result.requestId}`);
    } catch (error) {
      console.error('Failed to submit request:', error);
    }
    setLoading(false);
  };

  const dataRights = [
    {
      id: 'access',
      title: 'Right of Access',
      description: 'Request a copy of all personal data we hold about you',
      action: 'Download My Data'
    },
    {
      id: 'rectification',
      title: 'Right to Rectification',
      description: 'Correct inaccurate or incomplete personal data',
      action: 'Request Correction'
    },
    {
      id: 'erasure',
      title: 'Right to Erasure',
      description: 'Request deletion of your personal data ("Right to be Forgotten")',
      action: 'Delete My Data'
    },
    {
      id: 'portability',
      title: 'Right to Data Portability',
      description: 'Receive your data in a structured, machine-readable format',
      action: 'Export My Data'
    },
    {
      id: 'objection',
      title: 'Right to Object',
      description: 'Object to processing of your personal data',
      action: 'Object to Processing'
    },
    {
      id: 'restriction',
      title: 'Right to Restrict Processing',
      description: 'Request restriction of processing in certain circumstances',
      action: 'Restrict Processing'
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <Shield className="text-green-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">Your GDPR Rights</h3>
            <p className="text-sm text-green-800 mt-1">
              Under the General Data Protection Regulation (GDPR), you have several rights 
              regarding your personal data. Click on any right below to exercise it.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {dataRights.map((right) => (
          <Card key={right.id} className="p-4">
            <h3 className="font-semibold mb-2">{right.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{right.description}</p>
            <Button
              variant="outline"
              onClick={() => submitRequest(right.id)}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Submitting...' : right.action}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Data Subject Request Portal
```tsx
// Portal for managing data subject access requests
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface DataSubjectRequest {
  id: string;
  requestId: string;
  type: string;
  status: string;
  requestedAt: string;
  dueDate: string;
  completedAt?: string;
  identityVerified: boolean;
  downloadUrl?: string;
  expiresAt?: string;
}

export function DataSubjectRequestPortal() {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [newRequest, setNewRequest] = useState({
    type: '',
    email: '',
    details: '',
    urgency: 'normal'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'existing') {
      loadExistingRequests();
    }
  }, [activeTab]);

  const loadExistingRequests = async () => {
    try {
      const response = await fetch('/gdpr/requests/my-requests', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const submitNewRequest = async () => {
    setLoading(true);
    try {
      const endpoint = `/gdpr/${newRequest.type}-request`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          email: newRequest.email,
          details: newRequest.details,
          urgency: newRequest.urgency
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Request submitted successfully. Request ID: ${result.requestId}`);
        setNewRequest({ type: '', email: '', details: '', urgency: 'normal' });
        setActiveTab('existing');
        loadExistingRequests();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.');
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-500" size={16} />;
      case 'processing': return <Clock className="text-blue-500" size={16} />;
      case 'pending': return <Clock className="text-yellow-500" size={16} />;
      default: return <AlertTriangle className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (request: DataSubjectRequest) => {
    return new Date(request.dueDate) < new Date() && request.status !== 'completed';
  };

  const requestTypes = [
    { value: 'access', label: 'Access Request', description: 'Get a copy of your personal data' },
    { value: 'rectification', label: 'Data Correction', description: 'Correct inaccurate data' },
    { value: 'erasure', label: 'Data Deletion', description: 'Delete your personal data' },
    { value: 'portability', label: 'Data Export', description: 'Export data in machine-readable format' },
    { value: 'objection', label: 'Processing Objection', description: 'Object to data processing' },
    { value: 'restriction', label: 'Restrict Processing', description: 'Limit data processing' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Subject Requests</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'new' ? 'default' : 'outline'}
            onClick={() => setActiveTab('new')}
          >
            New Request
          </Button>
          <Button
            variant={activeTab === 'existing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('existing')}
          >
            My Requests
          </Button>
        </div>
      </div>

      {activeTab === 'new' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Submit New Request</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Request Type</label>
              <Select value={newRequest.type} onValueChange={(value) => setNewRequest({...newRequest, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                value={newRequest.email}
                onChange={(e) => setNewRequest({...newRequest, email: e.target.value})}
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Details</label>
              <Textarea
                value={newRequest.details}
                onChange={(e) => setNewRequest({...newRequest, details: e.target.value})}
                placeholder="Provide any additional information about your request"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Urgency</label>
              <Select value={newRequest.urgency} onValueChange={(value) => setNewRequest({...newRequest, urgency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (30 days)</SelectItem>
                  <SelectItem value="urgent">Urgent (special circumstances)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={submitNewRequest}
              disabled={loading || !newRequest.type || !newRequest.email}
              className="w-full"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'existing' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Requests Found</h3>
              <p className="text-gray-500">You haven't submitted any data subject requests yet.</p>
              <Button
                variant="outline"
                onClick={() => setActiveTab('new')}
                className="mt-4"
              >
                Submit First Request
              </Button>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {requestTypes.find(t => t.value === request.type)?.label || request.type}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </Badge>
                      {isOverdue(request) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Request ID: {request.requestId}</div>
                      <div>Submitted: {new Date(request.requestedAt).toLocaleDateString()}</div>
                      <div>Due: {new Date(request.dueDate).toLocaleDateString()}</div>
                      {request.completedAt && (
                        <div>Completed: {new Date(request.completedAt).toLocaleDateString()}</div>
                      )}
                      {!request.identityVerified && request.status === 'pending' && (
                        <div className="text-orange-600">⚠️ Identity verification required</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {request.downloadUrl && (
                      <div className="text-center">
                        <Button size="sm" variant="outline" asChild>
                          <a href={request.downloadUrl} download>
                            <Download size={16} className="mr-1" />
                            Download
                          </a>
                        </Button>
                        {request.expiresAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expires: {new Date(request.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

## 6. Implementation Code Examples

### GDPR Compliance Service
```typescript
// Comprehensive GDPR compliance implementation
export class GDPRComplianceService {
  private readonly DATA_SUBJECT_REQUEST_DEADLINE = 30; // days
  private readonly BREACH_NOTIFICATION_DEADLINE = 72; // hours

  // Data Subject Access Request (Article 15)
  async handleAccessRequest(
    email: string,
    userId?: string,
    specificData?: string[]
  ): Promise<DataAccessResponse> {
    // Create request record
    const request = await this.createDataSubjectRequest({
      type: 'access',
      email,
      userId,
      specificData,
      status: 'pending_verification'
    });

    // Send verification email
    await this.sendVerificationEmail(request.id, email);

    // Collect user data in background
    this.collectUserDataAsync(request.id, userId || email);

    return {
      requestId: request.requestId,
      status: 'pending_verification',
      estimatedCompletion: new Date(Date.now() + this.DATA_SUBJECT_REQUEST_DEADLINE * 24 * 60 * 60 * 1000).toISOString(),
      verificationRequired: true
    };
  }

  private async collectUserDataAsync(requestId: string, identifier: string): Promise<void> {
    try {
      // Update request status
      await this.updateRequestStatus(requestId, 'processing');

      // Collect data from all sources
      const userData = await this.collectAllUserData(identifier);

      // Generate data package
      const dataPackage = await this.generateDataPackage(userData);

      // Encrypt package
      const encryptedPackage = await this.encryptDataPackage(dataPackage);

      // Store for download
      const downloadUrl = await this.storeDataPackage(requestId, encryptedPackage);

      // Update request with download link
      await this.updateRequestStatus(requestId, 'completed', { downloadUrl });

      // Send notification
      await this.sendDataReadyNotification(requestId);

    } catch (error) {
      console.error('Failed to collect user data:', error);
      await this.updateRequestStatus(requestId, 'error', { error: error.message });
    }
  }

  private async collectAllUserData(identifier: string): Promise<any> {
    const isEmail = identifier.includes('@');
    const user = isEmail 
      ? await this.getUserByEmail(identifier)
      : await this.getUserById(identifier);

    if (!user) {
      throw new Error('User not found');
    }

    // Collect data from all tables
    const queries = [
      this.getProfileData(user.id),
      this.getWeddingData(user.id),
      this.getClientData(user.id),
      this.getSupplierData(user.id),
      this.getGuestData(user.id),
      this.getFormResponses(user.id),
      this.getCommunications(user.id),
      this.getActivityLogs(user.id),
      this.getBillingData(user.id),
      this.getConsentRecords(user.id),
      this.getAuditLogs(user.id)
    ];

    const [
      profile, weddings, clients, suppliers, guests,
      forms, communications, activities, billing,
      consents, audits
    ] = await Promise.all(queries);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastLoginAt: user.last_sign_in_at
      },
      profile,
      weddings,
      clients,
      suppliers,
      guests,
      forms,
      communications,
      activities,
      billing,
      consents,
      audits,
      metadata: {
        dataExportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        gdprBasis: 'Article 15 - Right of Access'
      }
    };
  }

  // Right to Rectification (Article 16)
  async handleRectificationRequest(
    email: string,
    corrections: DataCorrection[]
  ): Promise<RectificationResponse> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Create request record
    const request = await this.createDataSubjectRequest({
      type: 'rectification',
      email,
      userId: user.id,
      requestDetails: corrections,
      status: 'processing'
    });

    const appliedCorrections: AppliedCorrection[] = [];
    const errors: CorrectionError[] = [];

    for (const correction of corrections) {
      try {
        // Validate correction
        await this.validateCorrection(correction);

        // Apply correction with audit trail
        const result = await this.applyDataCorrection(user.id, correction);
        appliedCorrections.push(result);

        // Log correction
        await this.logGDPRAuditEvent({
          eventType: 'data_rectification',
          dataSubjectId: user.id,
          eventCategory: 'processing',
          dataFields: [correction.field],
          dataBefore: { [correction.field]: correction.currentValue },
          dataAfter: { [correction.field]: correction.correctedValue },
          legalBasis: 'Article 16 - Right to Rectification',
          purpose: 'Data correction as requested by data subject'
        });

      } catch (error) {
        errors.push({
          field: correction.field,
          error: error.message
        });
      }
    }

    // Notify third parties if required
    if (corrections.some(c => c.notifyThirdParties)) {
      await this.notifyThirdPartiesOfCorrections(user.id, appliedCorrections);
    }

    await this.updateRequestStatus(request.requestId, 'completed', {
      appliedCorrections,
      errors
    });

    return {
      requestId: request.requestId,
      status: 'completed',
      correctionsApplied: appliedCorrections.length,
      errors: errors.length,
      affectedSystems: appliedCorrections.map(c => c.system)
    };
  }

  // Right to Erasure (Article 17)
  async handleErasureRequest(
    email: string,
    reason: string,
    specificData?: string[]
  ): Promise<ErasureResponse> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if erasure is allowed
    const eligibilityCheck = await this.checkErasureEligibility(user.id, reason);
    
    if (!eligibilityCheck.canErase && !eligibilityCheck.partialErasure) {
      return {
        requestId: '',
        eligibilityCheck,
        status: 'rejected'
      };
    }

    // Create request record
    const request = await this.createDataSubjectRequest({
      type: 'erasure',
      email,
      userId: user.id,
      requestDetails: { reason, specificData },
      status: 'processing'
    });

    // Perform erasure based on eligibility
    if (eligibilityCheck.canErase) {
      await this.performCompleteErasure(user.id, reason);
    } else if (eligibilityCheck.partialErasure) {
      await this.performPartialErasure(user.id, eligibilityCheck.erasableData, reason);
    }

    return {
      requestId: request.requestId,
      eligibilityCheck,
      status: 'completed',
      erasureType: eligibilityCheck.canErase ? 'complete' : 'partial'
    };
  }

  private async checkErasureEligibility(
    userId: string,
    reason: string
  ): Promise<ErasureEligibility> {
    const restrictions: string[] = [];
    let canErase = true;
    let partialErasure = false;

    // Check for active contracts
    const activeContracts = await this.getActiveContracts(userId);
    if (activeContracts.length > 0) {
      restrictions.push('Active wedding contracts require data retention');
      canErase = false;
      partialErasure = true;
    }

    // Check for legal obligations
    const legalHolds = await this.getLegalHolds(userId);
    if (legalHolds.length > 0) {
      restrictions.push('Legal proceedings require data retention');
      canErase = false;
    }

    // Check for financial records retention
    const hasFinancialData = await this.hasFinancialData(userId);
    if (hasFinancialData) {
      restrictions.push('Financial records must be retained for 7 years');
      canErase = false;
      partialErasure = true;
    }

    // Determine erasable data categories
    const erasableData = canErase 
      ? ['all']
      : await this.getErasableDataCategories(userId, restrictions);

    return {
      canErase,
      partialErasure,
      restrictions,
      erasableData,
      retentionPeriods: await this.getRetentionPeriods(userId)
    };
  }

  private async performCompleteErasure(userId: string, reason: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Crypto-shred user encryption keys
      await this.cryptoShredUserKeys(userId, trx);

      // Anonymize required data
      await this.anonymizeRequiredData(userId, trx);

      // Delete personal data
      await this.deletePersonalData(userId, trx);

      // Mark user as erased
      await trx.query(
        'UPDATE users SET gdpr_erased = true, erased_at = NOW(), erasure_reason = $1 WHERE id = $2',
        [reason, userId]
      );

      // Log erasure
      await this.logGDPRAuditEvent({
        eventType: 'complete_erasure',
        dataSubjectId: userId,
        eventCategory: 'processing',
        legalBasis: 'Article 17 - Right to Erasure',
        purpose: `Complete data erasure: ${reason}`
      });
    });

    // Schedule backup deletion
    await this.scheduleBackupDeletion(userId);

    // Notify third parties
    await this.notifyThirdPartiesOfErasure(userId);
  }

  // Data Portability (Article 20)
  async handlePortabilityRequest(
    email: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<PortabilityResponse> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Collect portable data (only user-provided or user-generated)
    const portableData = await this.collectPortableData(user.id);

    // Format data according to request
    const formattedData = await this.formatPortableData(portableData, format);

    // Create encrypted package
    const encryptedPackage = await this.encryptDataPackage(formattedData);

    // Store for download
    const downloadUrl = await this.storeDataPackage(`portability-${user.id}`, encryptedPackage);

    // Log portability request
    await this.logGDPRAuditEvent({
      eventType: 'data_portability',
      dataSubjectId: user.id,
      eventCategory: 'processing',
      legalBasis: 'Article 20 - Right to Data Portability',
      purpose: 'Data portability export'
    });

    return {
      requestId: crypto.randomUUID(),
      format,
      dataPackageSize: formattedData.length,
      downloadUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  // Consent Management
  async recordConsent(
    userId: string,
    consentData: ConsentData,
    proof: ConsentProof
  ): Promise<ConsentRecord> {
    // Create consent proof hash
    const proofHash = crypto.createHash('sha256')
      .update(JSON.stringify(proof))
      .digest('hex');

    const consent = await db.query(`
      INSERT INTO consent_records (
        user_id, consent_type, purpose, legal_basis, granted,
        version, language_code, ip_address, user_agent,
        device_fingerprint, consent_method, granted_at,
        expires_at, consent_proof_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id, consent_type, purpose) DO UPDATE
      SET granted = EXCLUDED.granted,
          version = EXCLUDED.version,
          granted_at = CASE WHEN EXCLUDED.granted THEN NOW() ELSE consent_records.granted_at END,
          withdrawn_at = CASE WHEN NOT EXCLUDED.granted THEN NOW() ELSE NULL END,
          updated_at = NOW()
      RETURNING *
    `, [
      userId,
      consentData.type,
      consentData.purpose,
      consentData.legalBasis,
      consentData.granted,
      consentData.version,
      consentData.languageCode || 'en',
      proof.ipAddress,
      proof.userAgent,
      proof.deviceFingerprint,
      consentData.method,
      consentData.granted ? new Date() : null,
      consentData.expiresAt,
      proofHash
    ]);

    // Record consent history
    await this.recordConsentHistory(consent.rows[0].id, consentData.granted ? 'granted' : 'withdrawn');

    // Log audit event
    await this.logGDPRAuditEvent({
      eventType: consentData.granted ? 'consent_granted' : 'consent_withdrawn',
      dataSubjectId: userId,
      eventCategory: 'consent',
      purpose: consentData.purpose,
      legalBasis: consentData.legalBasis
    });

    return consent.rows[0];
  }

  // Data Breach Management
  async reportDataBreach(breachData: BreachData): Promise<BreachResponse> {
    const incident = await db.query(`
      INSERT INTO data_breach_incidents (
        incident_id, title, description, breach_type, cause,
        occurred_at, discovered_at, affected_individuals_count,
        data_categories_affected, severity, likelihood_of_harm,
        authority_notification_required, individual_notification_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      `BR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      breachData.title,
      breachData.description,
      breachData.breachType,
      breachData.cause,
      breachData.occurredAt,
      breachData.discoveredAt,
      breachData.affectedCount,
      breachData.dataCategories,
      breachData.severity,
      breachData.likelihoodOfHarm,
      this.requiresAuthorityNotification(breachData),
      this.requiresIndividualNotification(breachData)
    ]);

    const breach = incident.rows[0];

    // Check 72-hour notification requirement
    if (breach.authority_notification_required) {
      const hoursUntilDeadline = this.BREACH_NOTIFICATION_DEADLINE - 
        Math.floor((Date.now() - new Date(breach.discovered_at).getTime()) / (1000 * 60 * 60));

      if (hoursUntilDeadline > 0) {
        // Schedule authority notification
        await this.scheduleAuthorityNotification(breach.id, hoursUntilDeadline);
      }
    }

    return {
      incidentId: breach.incident_id,
      authorityNotificationRequired: breach.authority_notification_required,
      individualNotificationRequired: breach.individual_notification_required,
      reportingDeadline: new Date(
        new Date(breach.discovered_at).getTime() + 
        this.BREACH_NOTIFICATION_DEADLINE * 60 * 60 * 1000
      ).toISOString()
    };
  }

  private requiresAuthorityNotification(breach: BreachData): boolean {
    // High likelihood of harm or critical severity requires notification
    return breach.severity === 'critical' || 
           breach.likelihoodOfHarm === 'high' ||
           breach.affectedCount > 100;
  }

  private requiresIndividualNotification(breach: BreachData): boolean {
    // High risk to individuals requires notification
    return breach.severity === 'critical' && 
           (breach.dataCategories.includes('financial') || 
            breach.dataCategories.includes('health'));
  }

  // GDPR Audit Logging
  private async logGDPRAuditEvent(event: GDPRAuditEvent): Promise<void> {
    await db.query(`
      INSERT INTO gdpr_audit_log (
        event_type, event_category, data_subject_id, data_subject_email,
        processing_activity, legal_basis, purpose, user_id, ip_address,
        user_agent, data_categories, data_fields, data_before, data_after,
        retention_applied, consent_checked, consent_valid, severity_level,
        automated_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      event.eventType,
      event.eventCategory,
      event.dataSubjectId,
      event.dataSubjectEmail,
      event.processingActivity,
      event.legalBasis,
      event.purpose,
      event.userId,
      event.ipAddress,
      event.userAgent,
      event.dataCategories,
      event.dataFields,
      event.dataBefore ? JSON.stringify(event.dataBefore) : null,
      event.dataAfter ? JSON.stringify(event.dataAfter) : null,
      event.retentionApplied || false,
      event.consentChecked || false,
      event.consentValid,
      event.severityLevel || 'normal',
      event.automatedAction || false
    ]);
  }
}

// Supporting interfaces and types
interface ConsentData {
  type: string;
  purpose: string;
  legalBasis: string;
  granted: boolean;
  method: string;
  version: string;
  languageCode?: string;
  expiresAt?: Date;
}

interface ConsentProof {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  timestamp: string;
  consentText: string;
}

interface DataCorrection {
  field: string;
  currentValue: string;
  correctedValue: string;
  reason: string;
  notifyThirdParties?: boolean;
}

interface BreachData {
  title: string;
  description: string;
  breachType: string;
  cause: string;
  occurredAt: Date;
  discoveredAt: Date;
  affectedCount: number;
  dataCategories: string[];
  severity: string;
  likelihoodOfHarm: string;
}

interface GDPRAuditEvent {
  eventType: string;
  eventCategory: string;
  dataSubjectId: string;
  dataSubjectEmail?: string;
  processingActivity?: string;
  legalBasis?: string;
  purpose?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  dataCategories?: string[];
  dataFields?: string[];
  dataBefore?: any;
  dataAfter?: any;
  retentionApplied?: boolean;
  consentChecked?: boolean;
  consentValid?: boolean;
  severityLevel?: string;
  automatedAction?: boolean;
}
```

## 7. Testing Requirements

### GDPR Compliance Testing Suite
```typescript
// Comprehensive GDPR compliance testing
describe('GDPR Compliance', () => {
  describe('Data Subject Rights', () => {
    it('should handle access requests within 30 days', async () => {
      const email = 'test@example.com';
      
      const response = await request(app)
        .post('/gdpr/access-request')
        .send({ email })
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(new Date(response.body.estimatedCompletion)).toBeLessThanOrEqual(
        new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
      );
    });

    it('should verify identity before providing data', async () => {
      const response = await request(app)
        .post('/gdpr/access-request')
        .send({ email: 'test@example.com' });

      expect(response.body.verificationRequired).toBe(true);
      
      // Try to access without verification
      await request(app)
        .get(`/gdpr/access-request/${response.body.requestId}/verify`)
        .expect(401);
    });

    it('should perform complete data erasure when eligible', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .post('/gdpr/erasure-request')
        .send({ 
          email: user.email, 
          reason: 'withdrawal' 
        });

      expect(response.body.eligibilityCheck.canErase).toBe(true);
      
      // Verify user data is erased
      const userData = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
      expect(userData.rows[0].gdpr_erased).toBe(true);
    });

    it('should restrict erasure when legal obligations exist', async () => {
      const user = await createTestUserWithActiveContract();
      
      const response = await request(app)
        .post('/gdpr/erasure-request')
        .send({ 
          email: user.email, 
          reason: 'withdrawal' 
        });

      expect(response.body.eligibilityCheck.canErase).toBe(false);
      expect(response.body.eligibilityCheck.restrictions).toContain('Active wedding contracts');
    });

    it('should provide data in machine-readable format for portability', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .post('/gdpr/portability-request')
        .send({ 
          email: user.email, 
          format: 'json' 
        });

      expect(response.body.downloadUrl).toBeDefined();
      expect(response.body.format).toBe('json');

      // Verify data structure
      const dataPackage = await downloadDataPackage(response.body.downloadUrl);
      expect(dataPackage).toHaveProperty('version');
      expect(dataPackage).toHaveProperty('created');
      expect(dataPackage).toHaveProperty('data');
    });
  });

  describe('Consent Management', () => {
    it('should record consent with proof', async () => {
      const user = await createTestUser();
      const consentProof = {
        timestamp: new Date().toISOString(),
        userAgent: 'test-browser',
        ipAddress: '192.168.1.1',
        consentText: 'I consent to marketing emails',
        version: '2024-01'
      };

      const response = await request(app)
        .post('/gdpr/consent')
        .send({
          userId: user.id,
          consents: [{
            type: 'marketing',
            purpose: 'Email marketing',
            granted: true,
            legalBasis: 'consent',
            method: 'explicit'
          }],
          consentProof
        });

      expect(response.body.consentIds).toHaveLength(1);
      
      // Verify consent is recorded
      const consent = await db.query(
        'SELECT * FROM consent_records WHERE user_id = $1 AND consent_type = $2',
        [user.id, 'marketing']
      );
      expect(consent.rows[0].granted).toBe(true);
      expect(consent.rows[0].consent_proof_hash).toBeDefined();
    });

    it('should allow consent withdrawal', async () => {
      const user = await createTestUserWithConsent();
      
      await request(app)
        .delete('/gdpr/consent')
        .send({
          userId: user.id,
          consentTypes: ['marketing']
        })
        .expect(200);

      // Verify consent is withdrawn
      const consent = await db.query(
        'SELECT * FROM consent_records WHERE user_id = $1 AND consent_type = $2',
        [user.id, 'marketing']
      );
      expect(consent.rows[0].granted).toBe(false);
      expect(consent.rows[0].withdrawn_at).toBeDefined();
    });

    it('should track consent history for audit', async () => {
      const user = await createTestUser();
      
      // Grant consent
      await request(app)
        .post('/gdpr/consent')
        .send({
          userId: user.id,
          consents: [{ type: 'marketing', purpose: 'Email marketing', granted: true, legalBasis: 'consent', method: 'explicit' }],
          consentProof: createConsentProof()
        });

      // Withdraw consent
      await request(app)
        .delete('/gdpr/consent')
        .send({ userId: user.id, consentTypes: ['marketing'] });

      // Check history
      const history = await db.query(
        'SELECT * FROM consent_history ch JOIN consent_records cr ON ch.consent_record_id = cr.id WHERE cr.user_id = $1',
        [user.id]
      );
      
      expect(history.rows).toHaveLength(2);
      expect(history.rows.find(h => h.action === 'granted')).toBeDefined();
      expect(history.rows.find(h => h.action === 'withdrawn')).toBeDefined();
    });
  });

  describe('Data Breach Management', () => {
    it('should require authority notification for high-risk breaches', async () => {
      const breachData = {
        title: 'Database exposure',
        description: 'Customer database exposed',
        breachType: 'confidentiality',
        cause: 'system_failure',
        occurredAt: new Date(),
        discoveredAt: new Date(),
        affectedCount: 500,
        dataCategories: ['personal', 'financial'],
        severity: 'critical',
        likelihoodOfHarm: 'high'
      };

      const response = await request(app)
        .post('/gdpr/breach/report')
        .send(breachData);

      expect(response.body.authorityNotificationRequired).toBe(true);
      expect(response.body.individualNotificationRequired).toBe(true);
      expect(new Date(response.body.reportingDeadline)).toBeLessThanOrEqual(
        new Date(Date.now() + 72 * 60 * 60 * 1000)
      );
    });

    it('should not require notification for low-risk breaches', async () => {
      const breachData = {
        title: 'Minor data exposure',
        description: 'Limited data exposure',
        breachType: 'availability',
        cause: 'human_error',
        occurredAt: new Date(),
        discoveredAt: new Date(),
        affectedCount: 5,
        dataCategories: ['contact'],
        severity: 'low',
        likelihoodOfHarm: 'low'
      };

      const response = await request(app)
        .post('/gdpr/breach/report')
        .send(breachData);

      expect(response.body.authorityNotificationRequired).toBe(false);
      expect(response.body.individualNotificationRequired).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log all data processing activities', async () => {
      const user = await createTestUser();
      
      // Simulate data access
      await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${createToken(user.id)}`);

      // Check audit log
      const auditLogs = await db.query(
        'SELECT * FROM gdpr_audit_log WHERE data_subject_id = $1',
        [user.id]
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);
      expect(auditLogs.rows[0].event_type).toBe('data_access');
      expect(auditLogs.rows[0].legal_basis).toBeDefined();
    });

    it('should track retention policy application', async () => {
      await gdprService.applyRetentionPolicies();

      const retentionLogs = await db.query(
        'SELECT * FROM gdpr_audit_log WHERE event_type = $1',
        ['data_retention_applied']
      );

      expect(retentionLogs.rows.length).toBeGreaterThan(0);
      expect(retentionLogs.rows[0].retention_applied).toBe(true);
    });
  });

  describe('Compliance Monitoring', () => {
    it('should calculate compliance score accurately', async () => {
      const response = await request(app)
        .get('/gdpr/compliance/status')
        .set('Authorization', `Bearer ${createAdminToken()}`);

      expect(response.body.overallScore).toBeGreaterThan(0);
      expect(response.body.overallScore).toBeLessThanOrEqual(100);
      expect(response.body.areas).toHaveProperty('consentManagement');
      expect(response.body.areas).toHaveProperty('dataSubjectRights');
      expect(response.body.recommendations).toBeInstanceOf(Array);
    });
  });
});

// Performance tests
describe('GDPR Performance', () => {
  it('should generate data access report within 30 seconds', async () => {
    const user = await createTestUserWithLargeDataset();
    
    const start = performance.now();
    
    const response = await request(app)
      .post('/gdpr/access-request')
      .send({ email: user.email });

    // Simulate verification and data collection
    await simulateDataCollection(response.body.requestId);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it('should handle 100 concurrent consent updates', async () => {
    const users = await createTestUsers(100);
    
    const promises = users.map(user => 
      request(app)
        .post('/gdpr/consent')
        .send({
          userId: user.id,
          consents: [{ type: 'marketing', granted: true, purpose: 'test', legalBasis: 'consent', method: 'explicit' }],
          consentProof: createConsentProof()
        })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBeGreaterThan(95); // 95% success rate
  });
});
```

## 8. Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "crypto": "^1.0.1",
    "nodemailer": "^6.9.8",
    "pdf-lib": "^1.17.1",
    "jszip": "^3.10.1",
    "validator": "^13.11.0",
    "date-fns": "^3.3.1"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "@types/jszip": "^3.4.1"
  }
}
```

### Infrastructure Dependencies
- **PostgreSQL**: GDPR-compliant database with audit logging
- **Email Service**: For notifications and verification
- **File Storage**: Secure storage for data packages
- **Backup Systems**: GDPR-compliant backup retention
- **Monitoring**: Real-time compliance monitoring

## 9. Compliance Checklist

### Legal Requirements
- [ ] **Data Protection Officer (DPO)**: Appointed if required
- [ ] **Privacy Policy**: Comprehensive and updated
- [ ] **Consent Mechanisms**: Granular and withdrawable
- [ ] **Data Processing Register**: Article 30 compliance
- [ ] **DPIAs**: For high-risk processing
- [ ] **International Transfer Safeguards**: SCCs or adequacy

### Technical Implementation  
- [ ] **Data Subject Rights**: All 6 rights implemented
- [ ] **Consent Management**: Proof and history tracking
- [ ] **Audit Logging**: Comprehensive activity tracking
- [ ] **Data Retention**: Automated policy enforcement
- [ ] **Breach Detection**: Automated monitoring
- [ ] **Encryption**: Personal data encrypted by default

### Operational Procedures
- [ ] **Incident Response**: 72-hour breach notification
- [ ] **Staff Training**: GDPR awareness and procedures
- [ ] **Vendor Management**: DPAs with all processors
- [ ] **Regular Audits**: Annual compliance assessment
- [ ] **Documentation**: All processing activities documented

## 10. Effort Estimate

### Development Phases

**Phase 1: Data Subject Rights (4-5 weeks)**
- Access request system
- Rectification workflow
- Erasure implementation
- Portability exports

**Phase 2: Consent Management (3-4 weeks)**
- Consent recording system
- Withdrawal mechanisms
- Cookie consent management
- History tracking

**Phase 3: Audit & Compliance (3-4 weeks)**
- Comprehensive audit logging
- Compliance monitoring
- Retention policies
- Reporting system

**Phase 4: Breach Management (2-3 weeks)**
- Breach detection
- Notification workflows
- Authority reporting
- Documentation system

**Phase 5: Testing & Documentation (2-3 weeks)**
- Compliance testing
- Legal review
- Documentation
- Staff training

**Total Estimated Effort: 14-19 weeks**

### Resource Requirements
- **GDPR Specialist/Lawyer**: Full-time consultation
- **Senior Backend Developer**: Full-time
- **Frontend Developer**: 60% allocation
- **DevOps Engineer**: 40% allocation
- **Data Protection Officer**: Part-time oversight

### Success Metrics
- **Compliance Score**: 95%+ in compliance audits
- **Response Time**: 100% of data subject requests within 30 days
- **Breach Notification**: 100% within 72-hour requirement
- **Consent Rates**: Maintain >70% marketing consent
- **Audit Trail**: 100% coverage of personal data processing