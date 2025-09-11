# 03-gdpr-compliance.md

# GDPR Compliance Implementation

## Overview

WedSync/WedMe processes personal data of EU residents (couples, suppliers, guests) and must comply with GDPR requirements. This document outlines our comprehensive GDPR compliance strategy.

## Legal Basis for Processing

### 1. Lawful Basis Framework

```tsx
enum LawfulBasis {
  CONSENT = 'consent',                   // Explicit opt-in
  CONTRACT = 'contract',                  // Necessary for service
  LEGAL_OBLIGATION = 'legal_obligation', // Required by law
  VITAL_INTERESTS = 'vital_interests',   // Life or death situations
  PUBLIC_TASK = 'public_task',           // Public interest
  LEGITIMATE_INTERESTS = 'legitimate_interests' // Business needs
}

interface DataProcessingActivity {
  purpose: string;
  dataCategories: string[];
  lawfulBasis: LawfulBasis;
  retention: string;
  recipients: string[];
  safeguards: string[];
}

// Processing activities registry
const processingActivities: DataProcessingActivity[] = [
  {
    purpose: 'Wedding planning coordination',
    dataCategories: ['name', 'email', 'phone', 'wedding_details'],
    lawfulBasis: LawfulBasis.CONTRACT,
    retention: '3 years after wedding date',
    recipients: ['connected_suppliers', 'couple'],
    safeguards: ['encryption', 'access_controls', 'audit_logs']
  },
  {
    purpose: 'Marketing communications',
    dataCategories: ['email', 'name', 'preferences'],
    lawfulBasis: LawfulBasis.CONSENT,
    retention: 'Until consent withdrawn',
    recipients: ['marketing_platform'],
    safeguards: ['double_opt_in', 'unsubscribe_link']
  }
];

```

### 2. Consent Management

```sql
-- Consent tracking table
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- marketing, cookies, data_sharing
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL, -- Version of consent text
  ip_address INET,
  user_agent TEXT,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent history for audit trail
CREATE TABLE consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_record_id UUID REFERENCES consent_records(id),
  action TEXT NOT NULL, -- granted, withdrawn, updated
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
  p_user_id UUID,
  p_consent_type TEXT,
  p_granted BOOLEAN,
  p_version TEXT,
  p_ip_address INET
) RETURNS UUID AS $$
DECLARE
  v_consent_id UUID;
BEGIN
  -- Insert or update consent record
  INSERT INTO consent_records (
    user_id, consent_type, granted, version,
    ip_address, granted_at
  ) VALUES (
    p_user_id, p_consent_type, p_granted, p_version,
    p_ip_address, CASE WHEN p_granted THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, consent_type) DO UPDATE
  SET
    granted = EXCLUDED.granted,
    version = EXCLUDED.version,
    granted_at = CASE WHEN EXCLUDED.granted THEN NOW() ELSE consent_records.granted_at END,
    withdrawn_at = CASE WHEN NOT EXCLUDED.granted THEN NOW() ELSE NULL END
  RETURNING id INTO v_consent_id;

  -- Log to history
  INSERT INTO consent_history (
    consent_record_id, action, new_state
  ) VALUES (
    v_consent_id,
    CASE WHEN p_granted THEN 'granted' ELSE 'withdrawn' END,
    jsonb_build_object(
      'granted', p_granted,
      'version', p_version,
      'timestamp', NOW()
    )
  );

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql;

```

### 3. Data Subject Rights Implementation

### Right to Access (Article 15)

```tsx
class DataAccessRequest {
  async handleAccessRequest(userId: string): Promise<UserDataPackage> {
    // Verify identity
    await this.verifyIdentity(userId);

    // Collect all user data
    const userData = await this.collectUserData(userId);

    // Generate comprehensive report
    const report = {
      personalData: userData.personal,
      processingActivities: userData.activities,
      recipients: userData.recipients,
      retentionPeriods: userData.retention,
      rights: this.getUserRights(),
      sources: userData.sources,
      exportedAt: new Date().toISOString()
    };

    // Log the request
    await this.logDataRequest(userId, 'access');

    // Send encrypted package
    return this.encryptAndSend(report, userId);
  }

  private async collectUserData(userId: string): Promise<any> {
    const queries = [
      this.getPersonalData(userId),
      this.getFormResponses(userId),
      this.getActivityLogs(userId),
      this.getCommunications(userId),
      this.getConnectedSuppliers(userId),
      this.getConsentRecords(userId),
      this.getPaymentHistory(userId)
    ];

    const results = await Promise.all(queries);

    return {
      personal: results[0],
      forms: results[1],
      activities: results[2],
      communications: results[3],
      suppliers: results[4],
      consents: results[5],
      payments: results[6]
    };
  }
}

```

### Right to Rectification (Article 16)

```tsx
class DataRectification {
  async handleRectificationRequest(
    userId: string,
    corrections: DataCorrections
  ): Promise<void> {
    // Verify identity
    await this.verifyIdentity(userId);

    // Validate corrections
    const validated = await this.validateCorrections(corrections);

    // Apply corrections with audit trail
    for (const correction of validated) {
      await this.applyCorrection(userId, correction);
    }

    // Notify connected parties if required
    if (corrections.notifyRecipients) {
      await this.notifyDataRecipients(userId, corrections);
    }

    // Log the request
    await this.logDataRequest(userId, 'rectification', corrections);
  }

  private async applyCorrection(
    userId: string,
    correction: Correction
  ): Promise<void> {
    // Store old value for audit
    const oldValue = await this.getCurrentValue(userId, correction.field);

    // Update the field
    await this.updateField(userId, correction.field, correction.newValue);

    // Create audit entry
    await this.createAuditEntry({
      userId,
      action: 'rectification',
      field: correction.field,
      oldValue,
      newValue: correction.newValue,
      reason: correction.reason,
      timestamp: new Date()
    });
  }
}

```

### Right to Erasure (Article 17)

```tsx
class DataErasure {
  async handleErasureRequest(
    userId: string,
    reason: string
  ): Promise<void> {
    // Verify identity
    await this.verifyIdentity(userId);

    // Check if erasure is allowed
    const canErase = await this.checkErasureEligibility(userId);

    if (!canErase.eligible) {
      throw new Error(`Cannot erase: ${canErase.reason}`);
    }

    // Perform erasure
    await this.performErasure(userId, reason);

    // Notify recipients
    await this.notifyErasureToRecipients(userId);

    // Log the erasure
    await this.logDataRequest(userId, 'erasure', { reason });
  }

  private async performErasure(
    userId: string,
    reason: string
  ): Promise<void> {
    // Start transaction
    const trx = await db.transaction();

    try {
      // Anonymize data that must be retained for legal reasons
      await this.anonymizeRequiredData(userId, trx);

      // Delete personal data
      await this.deletePersonalData(userId, trx);

      // Crypto-shred encrypted data
      await this.cryptoShredUserData(userId, trx);

      // Remove from all marketing lists
      await this.removeFromMarketing(userId, trx);

      // Delete backups after retention period
      await this.scheduleBackupDeletion(userId, trx);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

```

### Right to Data Portability (Article 20)

```tsx
class DataPortability {
  async handlePortabilityRequest(
    userId: string,
    format: 'json' | 'csv' | 'xml'
  ): Promise<PortableData> {
    // Verify identity
    await this.verifyIdentity(userId);

    // Collect portable data (only data provided by user)
    const data = await this.collectPortableData(userId);

    // Format data according to request
    const formatted = this.formatData(data, format);

    // Create machine-readable package
    const package = {
      version: '1.0',
      created: new Date().toISOString(),
      format,
      data: formatted,
      schema: this.getDataSchema()
    };

    // Log request
    await this.logDataRequest(userId, 'portability');

    return package;
  }

  private async collectPortableData(userId: string): Promise<any> {
    // Only data provided by the user or generated through their use
    return {
      profile: await this.getUserProfile(userId),
      weddingDetails: await this.getWeddingDetails(userId),
      guestList: await this.getGuestList(userId),
      formResponses: await this.getFormResponses(userId),
      preferences: await this.getPreferences(userId),
      // Exclude: logs, analytics, inferred data
    };
  }
}

```

### 4. Privacy by Design

```tsx
// Data minimization principle
class DataMinimization {
  // Only collect necessary fields
  validateFormFields(fields: FormField[]): FormField[] {
    return fields.filter(field => {
      // Check if field is necessary for stated purpose
      return this.isNecessaryField(field);
    });
  }

  // Automatic data purging
  async purgeUnnecessaryData(): Promise<void> {
    // Remove data past retention period
    await this.purgeExpiredData();

    // Remove incomplete registrations > 30 days
    await this.purgeIncompleteRegistrations();

    // Anonymize old analytics data
    await this.anonymizeOldAnalytics();
  }
}

```

### 5. Data Processing Records

```sql
-- Article 30 - Records of processing activities
CREATE TABLE processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_name TEXT DEFAULT 'WedSync Ltd',
  controller_contact JSONB,
  processor_name TEXT,
  processor_contact JSONB,
  processing_purpose TEXT NOT NULL,
  data_categories TEXT[],
  data_subjects TEXT[],
  recipients TEXT[],
  international_transfers JSONB,
  retention_period TEXT,
  security_measures TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DPA (Data Processing Agreement) tracking
CREATE TABLE data_processing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID REFERENCES suppliers(id),
  agreement_version TEXT,
  signed_date DATE,
  clauses JSONB, -- Standard contractual clauses
  security_measures JSONB,
  sub_processors JSONB,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```

### 6. Breach Notification System

```tsx
class BreachNotification {
  async handleDataBreach(breach: DataBreach): Promise<void> {
    // Assess the breach
    const assessment = await this.assessBreach(breach);

    // Log breach details
    await this.logBreach(breach, assessment);

    // Determine if notification required
    if (assessment.riskLevel === 'high') {
      // Notify supervisory authority within 72 hours
      if (this.within72Hours(breach.discoveredAt)) {
        await this.notifySupervisoryAuthority(breach, assessment);
      }

      // Notify affected individuals without undue delay
      await this.notifyAffectedUsers(breach, assessment);
    }

    // Document actions taken
    await this.documentBreachResponse(breach, assessment);
  }

  private async assessBreach(breach: DataBreach): Promise<BreachAssessment> {
    return {
      riskLevel: this.calculateRiskLevel(breach),
      affectedUsers: await this.identifyAffectedUsers(breach),
      dataCategories: breach.dataCategories,
      potentialConsequences: this.assessConsequences(breach),
      mitigationMeasures: this.getMitigationMeasures(breach)
    };
  }

  private async notifySupervisoryAuthority(
    breach: DataBreach,
    assessment: BreachAssessment
  ): Promise<void> {
    const notification = {
      incidentDate: breach.occurredAt,
      discoveryDate: breach.discoveredAt,
      description: breach.description,
      dataCategories: assessment.dataCategories,
      affectedCount: assessment.affectedUsers.length,
      consequences: assessment.potentialConsequences,
      measures: assessment.mitigationMeasures,
      dpoContact: this.getDPOContact()
    };

    // Send to appropriate authority (ICO for UK)
    await this.sendToAuthority('ICO', notification);
  }
}

```

### 7. Cookie Compliance

```tsx
// Cookie consent management
class CookieCompliance {
  private cookieCategories = {
    necessary: {
      description: 'Essential for website operation',
      requiresConsent: false,
      cookies: ['session_id', 'csrf_token', 'auth_token']
    },
    functional: {
      description: 'Remember user preferences',
      requiresConsent: true,
      cookies: ['language', 'theme', 'dashboard_layout']
    },
    analytics: {
      description: 'Help us improve our service',
      requiresConsent: true,
      cookies: ['_ga', '_gid', 'amplitude_id']
    },
    marketing: {
      description: 'Personalized advertising',
      requiresConsent: true,
      cookies: ['facebook_pixel', 'google_ads']
    }
  };

  async setCookie(
    name: string,
    value: string,
    category: string
  ): Promise<void> {
    // Check if consent given for category
    const hasConsent = await this.hasConsentFor(category);

    if (!hasConsent && this.cookieCategories[category].requiresConsent) {
      return; // Don't set cookie without consent
    }

    // Set cookie with appropriate settings
    const settings = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: this.getMaxAge(category)
    };

    await this.setCookieWithSettings(name, value, settings);

    // Log cookie setting for transparency
    await this.logCookieActivity(name, category, 'set');
  }
}

```

### 8. International Data Transfers

```sql
-- Track international data transfers
CREATE TABLE international_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  source_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  legal_basis TEXT NOT NULL, -- adequacy, SCCs, BCRs
  safeguards JSONB,
  user_id UUID REFERENCES auth.users(id),
  authorized_by UUID REFERENCES auth.users(id),
  authorized_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```

### 9. Children's Data Protection

```tsx
class ChildrenDataProtection {
  private minAge = 16; // Can be 13-16 depending on member state

  async verifyAge(dateOfBirth: Date): Promise<boolean> {
    const age = this.calculateAge(dateOfBirth);

    if (age < this.minAge) {
      // Require parental consent
      return this.requireParentalConsent();
    }

    return true;
  }

  async requireParentalConsent(): Promise<boolean> {
    // Implement parental consent flow
    // - Email to parent
    // - Verification of parent identity
    // - Explicit consent recording
    return false; // Block registration until consent received
  }
}

```

### 10. Compliance Monitoring

```tsx
class GDPRComplianceMonitor {
  async runComplianceCheck(): Promise<ComplianceReport> {
    const checks = [
      this.checkConsentRecords(),
      this.checkDataRetention(),
      this.checkAccessLogs(),
      this.checkEncryption(),
      this.checkInternationalTransfers(),
      this.checkProcessorAgreements(),
      this.checkBreachProcedures(),
      this.checkPrivacyPolicy()
    ];

    const results = await Promise.all(checks);

    return {
      compliant: results.every(r => r.passed),
      checks: results,
      recommendations: this.getRecommendations(results),
      nextReview: this.getNextReviewDate()
    };
  }
}

```

## Implementation Checklist

- [ ]  Implement consent management system
- [ ]  Create data subject request workflows
- [ ]  Set up data retention policies
- [ ]  Implement right to erasure (crypto-shredding)
- [ ]  Create data portability exports
- [ ]  Set up breach notification system
- [ ]  Implement cookie consent banner
- [ ]  Create processing records registry
- [ ]  Draft privacy policy and notices
- [ ]  Appoint Data Protection Officer (if required)
- [ ]  Train staff on GDPR compliance
- [ ]  Regular compliance audits
- [ ]  Document all processing activities
- [ ]  Review and update DPAs with processors