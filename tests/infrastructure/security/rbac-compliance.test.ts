import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SecurityComplianceManager } from '../../../src/lib/services/infrastructure/security-compliance-manager';
import { RBACTestingFramework } from '../../../src/lib/services/infrastructure/rbac-testing-framework';
import { ComplianceValidator } from '../../../src/lib/services/infrastructure/compliance-validator';
import { SecurityAuditor } from '../../../src/lib/services/infrastructure/security-auditor';

describe('Security and Compliance Testing Framework', () => {
  let securityManager: SecurityComplianceManager;
  let rbacFramework: RBACTestingFramework;
  let complianceValidator: ComplianceValidator;
  let securityAuditor: SecurityAuditor;

  beforeEach(async () => {
    securityManager = new SecurityComplianceManager();
    rbacFramework = new RBACTestingFramework();
    complianceValidator = new ComplianceValidator();
    securityAuditor = new SecurityAuditor();

    await securityManager.initialize({
      complianceStandards: ['SOC2', 'GDPR', 'PCI_DSS', 'HIPAA'],
      auditingEnabled: true,
      realTimeMonitoring: true,
      weddingDataProtection: 'maximum'
    });
  });

  describe('Role-Based Access Control (RBAC) Testing', () => {
    test('should enforce role-based access to infrastructure controls', async () => {
      const userRoles = [
        {
          role: 'developer',
          permissions: ['read_infrastructure', 'deploy_staging'],
          restrictions: ['production_access', 'delete_resources', 'modify_security']
        },
        {
          role: 'admin',
          permissions: ['full_infrastructure_access', 'user_management', 'security_config'],
          restrictions: ['delete_production_data']
        },
        {
          role: 'security_officer',
          permissions: ['security_audit', 'compliance_reports', 'access_logs'],
          restrictions: ['infrastructure_changes']
        },
        {
          role: 'wedding_manager',
          permissions: ['wedding_operations', 'vendor_coordination', 'guest_management'],
          restrictions: ['infrastructure_access', 'system_configuration']
        }
      ];

      const restrictedOperations = [
        { operation: 'terminate_production_resource', requiredRole: 'admin' },
        { operation: 'access_wedding_payment_data', requiredRole: 'admin' },
        { operation: 'modify_security_policies', requiredRole: 'security_officer' },
        { operation: 'export_guest_data', requiredRole: 'admin' },
        { operation: 'access_audit_logs', requiredRole: 'security_officer' }
      ];

      for (const userRole of userRoles) {
        const testUser = await rbacFramework.createTestUser(userRole);
        
        for (const operation of restrictedOperations) {
          const accessAttempt = await rbacFramework.attemptOperation({
            user: testUser,
            operation: operation.operation,
            resourceId: 'test-resource-001'
          });

          if (userRole.role === operation.requiredRole || userRole.role === 'admin') {
            expect(accessAttempt.allowed).toBe(true);
            expect(accessAttempt.reason).toContain('sufficient permissions');
          } else {
            expect(accessAttempt.allowed).toBe(false);
            expect(accessAttempt.reason).toContain('insufficient permissions');
            expect(accessAttempt.securityViolation).toBe(true);
          }
        }
      }
    });

    test('should audit all infrastructure operations with user attribution', async () => {
      const auditableOperations = [
        { operation: 'provision_resource', user: 'admin', resourceType: 'database' },
        { operation: 'scale_service', user: 'developer', resourceType: 'compute' },
        { operation: 'backup_data', user: 'admin', resourceType: 'storage' },
        { operation: 'update_security_group', user: 'security_officer', resourceType: 'networking' }
      ];

      const auditTrail = [];
      
      for (const op of auditableOperations) {
        const testUser = await rbacFramework.createTestUser({ role: op.user });
        
        const operationResult = await rbacFramework.executeAuditedOperation({
          user: testUser,
          operation: op.operation,
          resourceType: op.resourceType,
          auditEnabled: true
        });

        auditTrail.push(operationResult.auditEntry);
        
        expect(operationResult.success).toBe(true);
        expect(operationResult.auditEntry).toBeDefined();
        expect(operationResult.auditEntry.userId).toBe(testUser.id);
        expect(operationResult.auditEntry.operation).toBe(op.operation);
        expect(operationResult.auditEntry.timestamp).toBeInstanceOf(Date);
      }

      // Verify complete audit trail
      const auditReport = await securityAuditor.generateAuditReport({
        timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
        includeOperations: auditableOperations.map(op => op.operation)
      });

      expect(auditReport.totalOperations).toBe(4);
      expect(auditReport.userOperations).toHaveProperty('admin', 2);
      expect(auditReport.userOperations).toHaveProperty('developer', 1);
      expect(auditReport.userOperations).toHaveProperty('security_officer', 1);
      expect(auditReport.securityViolations).toBe(0);
    });

    test('should validate multi-factor authentication for critical operations', async () => {
      const criticalOperations = [
        'delete_production_database',
        'export_wedding_payment_data',
        'disable_security_monitoring',
        'modify_backup_policies',
        'access_encryption_keys'
      ];

      const adminUser = await rbacFramework.createTestUser({
        role: 'admin',
        mfaEnabled: true,
        mfaDevices: ['authenticator_app', 'sms']
      });

      for (const operation of criticalOperations) {
        // Test without MFA
        const withoutMFA = await rbacFramework.attemptCriticalOperation({
          user: adminUser,
          operation,
          mfaProvided: false
        });

        expect(withoutMFA.allowed).toBe(false);
        expect(withoutMFA.reason).toContain('MFA required');
        expect(withoutMFA.mfaChallengeSent).toBe(true);

        // Test with valid MFA
        const withValidMFA = await rbacFramework.attemptCriticalOperation({
          user: adminUser,
          operation,
          mfaProvided: true,
          mfaToken: 'valid_token_123456'
        });

        expect(withValidMFA.allowed).toBe(true);
        expect(withValidMFA.mfaVerified).toBe(true);
        expect(withValidMFA.auditEntry.mfaUsed).toBe(true);
      }
    });
  });

  describe('Data Protection and Encryption Testing', () => {
    test('should encrypt sensitive wedding and payment data', async () => {
      const sensitiveDataTypes = [
        {
          type: 'wedding_payment_info',
          data: {
            cardNumber: '4532-1234-5678-9012',
            expiryDate: '12/26',
            cvv: '123',
            amount: 2500.00
          },
          encryptionLevel: 'PCI_DSS'
        },
        {
          type: 'guest_personal_data',
          data: {
            name: 'John Smith',
            email: 'john.smith@example.com',
            phone: '+1-555-123-4567',
            dietaryRestrictions: 'vegetarian'
          },
          encryptionLevel: 'GDPR_COMPLIANT'
        },
        {
          type: 'vendor_credentials',
          data: {
            vendorId: 'photographer-001',
            apiKey: 'pk_live_abcd1234efgh5678',
            webhookSecret: 'whsec_xyz789'
          },
          encryptionLevel: 'AES_256'
        }
      ];

      for (const sensitiveData of sensitiveDataTypes) {
        const encryptionResult = await securityManager.encryptSensitiveData({
          data: sensitiveData.data,
          dataType: sensitiveData.type,
          encryptionLevel: sensitiveData.encryptionLevel
        });

        expect(encryptionResult.encrypted).toBe(true);
        expect(encryptionResult.encryptionAlgorithm).toBe('AES-256-GCM');
        expect(encryptionResult.keyRotationEnabled).toBe(true);
        
        // Verify original data is not visible in encrypted form
        expect(encryptionResult.encryptedData).not.toContain(JSON.stringify(sensitiveData.data));
        
        // Test decryption
        const decryptionResult = await securityManager.decryptSensitiveData({
          encryptedData: encryptionResult.encryptedData,
          dataType: sensitiveData.type,
          decryptionKey: encryptionResult.keyId
        });

        expect(decryptionResult.decrypted).toBe(true);
        expect(decryptionResult.data).toEqual(sensitiveData.data);
      }
    });

    test('should handle secure credential rotation', async () => {
      const credentials = {
        providerId: 'aws-production',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        lastRotated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };

      const rotationResult = await securityManager.rotateProviderCredentials({
        credentials,
        rotationReason: 'scheduled_rotation',
        testNewCredentials: true,
        gracefulTransition: true
      });

      expect(rotationResult.success).toBe(true);
      expect(rotationResult.newCredentials.accessKey).not.toBe(credentials.accessKey);
      expect(rotationResult.newCredentials.secretKey).not.toBe(credentials.secretKey);
      expect(rotationResult.oldCredentialsInvalidated).toBe(true);
      expect(rotationResult.connectionTestPassed).toBe(true);
      expect(rotationResult.gracefulTransitionTime).toBeLessThan(300000); // <5 minutes
    });
  });

  describe('Compliance Validation Testing', () => {
    test('should validate GDPR compliance for wedding data handling', async () => {
      const gdprTestScenarios = [
        {
          scenario: 'data_subject_access_request',
          guestEmail: 'eu.guest@example.com',
          expectedData: ['personal_info', 'rsvp_status', 'dietary_preferences'],
          responseTimeLimit: 30 * 24 * 60 * 60 * 1000 // 30 days
        },
        {
          scenario: 'right_to_be_forgotten',
          guestEmail: 'delete.me@example.com',
          dataToDelete: 'all_personal_data',
          verifyDeletion: true
        },
        {
          scenario: 'data_portability',
          guestEmail: 'export.data@example.com',
          exportFormat: 'JSON',
          includeMetadata: true
        }
      ];

      for (const scenario of gdprTestScenarios) {
        const complianceTest = await complianceValidator.testGDPRCompliance({
          scenario: scenario.scenario,
          guestIdentifier: scenario.guestEmail,
          requestParameters: scenario
        });

        expect(complianceTest.compliant).toBe(true);
        expect(complianceTest.responseTime).toBeLessThan(scenario.responseTimeLimit || 86400000);
        
        if (scenario.scenario === 'data_subject_access_request') {
          expect(complianceTest.dataReturned).toContain('personal_info');
          expect(complianceTest.dataAccurate).toBe(true);
        }
        
        if (scenario.scenario === 'right_to_be_forgotten') {
          expect(complianceTest.dataDeleted).toBe(true);
          expect(complianceTest.deletionVerified).toBe(true);
        }
      }
    });

    test('should validate PCI DSS compliance for payment processing', async () => {
      const pciComplianceTests = [
        {
          test: 'cardholder_data_encryption',
          requirement: 'PCI_DSS_3.4',
          cardData: '4532123456789012',
          expectedResult: 'encrypted_at_rest'
        },
        {
          test: 'secure_transmission',
          requirement: 'PCI_DSS_4.1',
          transmissionMethod: 'TLS_1.3',
          expectedResult: 'encrypted_in_transit'
        },
        {
          test: 'access_control',
          requirement: 'PCI_DSS_7.1', 
          userRole: 'developer',
          accessAttempt: 'payment_data',
          expectedResult: 'access_denied'
        },
        {
          test: 'regular_security_testing',
          requirement: 'PCI_DSS_11.2',
          testType: 'vulnerability_scan',
          expectedResult: 'no_high_vulnerabilities'
        }
      ];

      for (const test of pciComplianceTests) {
        const pciTest = await complianceValidator.testPCICompliance({
          testType: test.test,
          requirement: test.requirement,
          testParameters: test
        });

        expect(pciTest.compliant).toBe(true);
        expect(pciTest.requirement).toBe(test.requirement);
        expect(pciTest.result).toBe(test.expectedResult);
        expect(pciTest.evidence).toBeDefined();
      }
    });

    test('should validate SOC 2 security controls', async () => {
      const soc2Controls = [
        {
          control: 'CC6.1', // Logical access controls
          description: 'Restrict access to system resources',
          testProcedure: 'validate_user_access_restrictions'
        },
        {
          control: 'CC6.7', // System monitoring
          description: 'Monitor system capacity and performance',
          testProcedure: 'validate_monitoring_systems'
        },
        {
          control: 'CC7.1', // System monitoring for security
          description: 'Monitor security events and incidents',
          testProcedure: 'validate_security_monitoring'
        },
        {
          control: 'A1.1', // Availability commitments
          description: 'Meet availability commitments and requirements',
          testProcedure: 'validate_uptime_commitments'
        }
      ];

      for (const control of soc2Controls) {
        const soc2Test = await complianceValidator.testSOC2Control({
          control: control.control,
          description: control.description,
          testProcedure: control.testProcedure
        });

        expect(soc2Test.controlOperating).toBe(true);
        expect(soc2Test.designEffectiveness).toBe(true);
        expect(soc2Test.operatingEffectiveness).toBe(true);
        expect(soc2Test.evidenceCollected).toBe(true);
        expect(soc2Test.deficiencies).toHaveLength(0);
      }
    });
  });

  describe('Security Incident Response Testing', () => {
    test('should respond to security incidents within defined timeframes', async () => {
      const securityIncidents = [
        {
          type: 'unauthorized_access_attempt',
          severity: 'high',
          targetResource: 'wedding_database',
          responseTimeTarget: 300 // 5 minutes
        },
        {
          type: 'data_breach_suspected',
          severity: 'critical',
          affectedRecords: 1000,
          responseTimeTarget: 60 // 1 minute
        },
        {
          type: 'malware_detection',
          severity: 'medium',
          affectedSystems: ['web_server_001'],
          responseTimeTarget: 900 // 15 minutes
        }
      ];

      for (const incident of securityIncidents) {
        const responseStart = Date.now();
        
        const incidentResponse = await securityManager.handleSecurityIncident({
          incident,
          autoResponse: true,
          notificationRequired: true,
          containmentRequired: true
        });
        
        const responseTime = Date.now() - responseStart;

        expect(responseTime).toBeLessThan(incident.responseTimeTarget * 1000);
        expect(incidentResponse.incidentContained).toBe(true);
        expect(incidentResponse.stakeholdersNotified).toBe(true);
        expect(incidentResponse.forensicsInitiated).toBe(true);
        
        if (incident.severity === 'critical') {
          expect(incidentResponse.emergencyProtocolActivated).toBe(true);
          expect(incidentResponse.regulatoryNotificationTriggered).toBe(true);
        }
      }
    });

    test('should maintain security during wedding day incidents', async () => {
      const weddingDaySecurityIncident = {
        type: 'payment_system_compromise',
        activeWeddings: 15,
        affectedPayments: 25000, // $25k in pending payments
        guestDataAtRisk: 3000,
        vendorsAffected: 45,
        incidentTime: new Date('2025-06-14T16:00:00Z') // Saturday 4PM
      };

      const weddingDaySecurityResponse = await securityManager.handleWeddingDaySecurityIncident({
        incident: weddingDaySecurityIncident,
        prioritizeWeddingContinuity: true,
        minimizeGuestImpact: true,
        preserveVendorOperations: true,
        complianceRequired: true
      });

      expect(weddingDaySecurityResponse.weddingsContinuing).toBe(15);
      expect(weddingDaySecurityResponse.alternativePaymentActivated).toBe(true);
      expect(weddingDaySecurityResponse.guestDataSecured).toBe(true);
      expect(weddingDaySecurityResponse.vendorOperationsMaintained).toBe(true);
      expect(weddingDaySecurityResponse.complianceViolations).toBe(0);
      expect(weddingDaySecurityResponse.forensicsCompromised).toBe(false);
    });
  });

  afterEach(async () => {
    await securityManager.cleanup();
    await rbacFramework.cleanup();
    await complianceValidator.cleanup();
  });
});
