import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { createMockSupabaseClient } from '../../utils/supabase-mock';
import { AuditTestFramework } from '../../audit/framework/AuditTestFramework';

describe('HIPAA Compliance for Audit Logging', () => {
  let auditLogger: AuditLogger;
  let mockSupabase: any;
  let testFramework: AuditTestFramework;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    auditLogger = new AuditLogger(mockSupabase);
    testFramework = new AuditTestFramework();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Administrative Safeguards - §164.308', () => {
    describe('§164.308(a)(1) - Security Officer', () => {
      it('should designate security responsibility for audit logs', async () => {
        const securityOfficerActions = [
          'audit.security.policy.update',
          'audit.access.review',
          'audit.incident.investigate',
          'audit.compliance.report'
        ];

        for (const action of securityOfficerActions) {
          await auditLogger.logAction({
            userId: 'security-officer-123',
            action,
            resourceId: 'security-policy-456',
            details: { 
              policyUpdate: 'HIPAA compliance review',
              reviewer: 'Chief Security Officer'
            },
            hipaaContext: {
              coveredEntity: 'WedSync Health Services',
              securityOfficer: 'security-officer-123',
              safeguardType: 'administrative',
              requirement: '164.308(a)(1)'
            }
          });

          const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
          expect(insertCall.hipaa_covered_entity).toBe('WedSync Health Services');
          expect(insertCall.hipaa_security_officer).toBe('security-officer-123');
          expect(insertCall.hipaa_safeguard_type).toBe('administrative');
        }
      });
    });

    describe('§164.308(a)(3) - Workforce Training', () => {
      it('should audit workforce access to PHI in audit logs', async () => {
        const workforceMembers = [
          { id: 'staff-001', role: 'wedding_coordinator', clearanceLevel: 'limited_phi' },
          { id: 'staff-002', role: 'medical_coordinator', clearanceLevel: 'full_phi' },
          { id: 'staff-003', role: 'vendor_liaison', clearanceLevel: 'no_phi' }
        ];

        for (const member of workforceMembers) {
          // Simulate workforce member accessing PHI
          if (member.clearanceLevel !== 'no_phi') {
            await auditLogger.logAction({
              userId: member.id,
              action: 'wedding.guest.medical_info.access',
              resourceId: 'guest-medical-456',
              details: {
                accessType: 'view',
                medicalInfo: member.clearanceLevel === 'full_phi' ? 
                  'Full dietary and medical restrictions' : 
                  '[REDACTED - Limited PHI Access]'
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                workforceRole: member.role,
                phiAccess: true,
                clearanceLevel: member.clearanceLevel,
                minimumNecessary: true,
                requirement: '164.308(a)(3)'
              }
            });
          }
        }

        const fullPhiCall = mockSupabase.from('audit_logs').insert.mock.calls
          .find(call => call[0].hipaa_context?.clearanceLevel === 'full_phi');
        expect(fullPhiCall[0].phi_accessed).toBeTruthy();
        expect(fullPhiCall[0].minimum_necessary_applied).toBeTruthy();

        const limitedPhiCall = mockSupabase.from('audit_logs').insert.mock.calls
          .find(call => call[0].hipaa_context?.clearanceLevel === 'limited_phi');
        expect(limitedPhiCall[0].details.medicalInfo).toContain('[REDACTED');
      });
    });

    describe('§164.308(a)(4) - Information Access Management', () => {
      it('should implement role-based access for PHI in audit logs', async () => {
        const accessScenarios = [
          {
            userId: 'doctor-123',
            role: 'healthcare_provider',
            action: 'wedding.guest.medical.update',
            allowedPhi: ['medical_conditions', 'medications', 'allergies', 'accessibility_needs'],
            access: 'granted'
          },
          {
            userId: 'coordinator-456',
            role: 'wedding_coordinator',
            action: 'wedding.guest.dietary.view',
            allowedPhi: ['dietary_restrictions', 'accessibility_needs'],
            access: 'granted'
          },
          {
            userId: 'vendor-789',
            role: 'external_vendor',
            action: 'wedding.guest.medical.view',
            allowedPhi: [],
            access: 'denied'
          }
        ];

        for (const scenario of accessScenarios) {
          if (scenario.access === 'granted') {
            await auditLogger.logAction({
              userId: scenario.userId,
              action: scenario.action,
              resourceId: 'guest-phi-123',
              details: {
                phiCategories: scenario.allowedPhi,
                roleBasedAccess: true
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                workforceRole: scenario.role,
                phiAccess: true,
                accessDecision: scenario.access,
                requirement: '164.308(a)(4)'
              }
            });
          } else {
            await expect(
              auditLogger.logAction({
                userId: scenario.userId,
                action: scenario.action,
                resourceId: 'guest-phi-123',
                details: { attemptedAccess: true },
                hipaaContext: {
                  coveredEntity: 'WedSync Health Services',
                  workforceRole: scenario.role,
                  phiAccess: false,
                  accessDecision: scenario.access,
                  requirement: '164.308(a)(4)'
                }
              })
            ).rejects.toThrow(/PHI access denied/);
          }
        }
      });
    });

    describe('§164.308(a)(5) - Security Awareness Training', () => {
      it('should track security training compliance in audit logs', async () => {
        const trainingEvents = [
          'hipaa.training.completed',
          'security.awareness.updated',
          'phi.handling.certified',
          'breach.response.trained'
        ];

        for (const event of trainingEvents) {
          await auditLogger.logAction({
            userId: 'staff-123',
            action: event,
            resourceId: 'training-session-456',
            details: {
              trainingDate: new Date().toISOString(),
              certificationType: 'HIPAA Compliance',
              validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            },
            hipaaContext: {
              coveredEntity: 'WedSync Health Services',
              trainingCompliance: true,
              requirement: '164.308(a)(5)'
            }
          });
        }

        const trainingCalls = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.trainingCompliance);
        expect(trainingCalls).toHaveLength(4);
      });
    });
  });

  describe('Physical Safeguards - §164.310', () => {
    describe('§164.310(a)(1) - Facility Access Controls', () => {
      it('should audit physical access to systems containing PHI', async () => {
        const physicalAccessEvents = [
          {
            event: 'server_room.entry',
            userId: 'admin-123',
            facility: 'Primary Data Center',
            authorized: true
          },
          {
            event: 'workstation.login',
            userId: 'staff-456',
            facility: 'Office Workstation #15',
            authorized: true
          },
          {
            event: 'backup_storage.access',
            userId: 'unknown-user',
            facility: 'Backup Storage Room',
            authorized: false
          }
        ];

        for (const access of physicalAccessEvents) {
          if (access.authorized) {
            await auditLogger.logAction({
              userId: access.userId,
              action: access.event,
              resourceId: access.facility,
              details: {
                physicalLocation: access.facility,
                accessMethod: 'key_card',
                accompaniedBy: access.event === 'server_room.entry' ? 'security-officer' : null
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                physicalSafeguard: true,
                facilityAccess: true,
                authorized: access.authorized,
                requirement: '164.310(a)(1)'
              }
            });
          } else {
            // Log security incident for unauthorized access
            await auditLogger.logSecurityIncident({
              incidentType: 'unauthorized_physical_access',
              location: access.facility,
              userId: access.userId,
              timestamp: new Date().toISOString(),
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                securityIncident: true,
                requirement: '164.310(a)(1)'
              }
            });
          }
        }

        const authorizedAccess = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.authorized === true);
        expect(authorizedAccess).toHaveLength(2);

        const securityIncidents = mockSupabase.from('security_incidents').insert.mock.calls
          .filter(call => call[0].hipaa_context?.securityIncident);
        expect(securityIncidents).toHaveLength(1);
      });
    });

    describe('§164.310(b) - Workstation Use', () => {
      it('should control workstation access to PHI', async () => {
        const workstationControls = [
          {
            userId: 'staff-123',
            workstationId: 'WS-001',
            phiAccessApproved: true,
            location: 'private_office'
          },
          {
            userId: 'temp-456',
            workstationId: 'WS-PUBLIC-001',
            phiAccessApproved: false,
            location: 'public_area'
          }
        ];

        for (const control of workstationControls) {
          await auditLogger.logAction({
            userId: control.userId,
            action: 'workstation.phi_access',
            resourceId: control.workstationId,
            details: {
              workstationLocation: control.location,
              screenPrivacy: control.location === 'private_office',
              automaticLogoff: true,
              encryptionEnabled: true
            },
            hipaaContext: {
              coveredEntity: 'WedSync Health Services',
              workstationControl: true,
              phiAccessApproved: control.phiAccessApproved,
              workstationSecure: control.location === 'private_office',
              requirement: '164.310(b)'
            }
          });

          const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
          expect(insertCall.hipaa_workstation_controlled).toBeTruthy();
          
          if (control.phiAccessApproved) {
            expect(insertCall.phi_access_granted).toBeTruthy();
          } else {
            expect(insertCall.phi_access_denied).toBeTruthy();
          }
        }
      });
    });
  });

  describe('Technical Safeguards - §164.312', () => {
    describe('§164.312(a)(1) - Access Control', () => {
      it('should implement unique user identification for audit logs', async () => {
        const users = [
          { id: 'user-001', role: 'physician', phiAccess: 'full' },
          { id: 'user-002', role: 'nurse', phiAccess: 'limited' },
          { id: 'user-003', role: 'admin', phiAccess: 'administrative' },
          { id: 'user-004', role: 'vendor', phiAccess: 'none' }
        ];

        for (const user of users) {
          await auditLogger.logAction({
            userId: user.id,
            action: 'system.login',
            resourceId: 'hipaa_system',
            details: {
              authenticationMethod: 'multi_factor',
              sessionTimeout: 30, // minutes
              roleAssigned: user.role
            },
            hipaaContext: {
              coveredEntity: 'WedSync Health Services',
              uniqueUserIdentification: true,
              phiAccessLevel: user.phiAccess,
              automaticLogoff: true,
              requirement: '164.312(a)(1)'
            }
          });

          const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
          expect(insertCall.user_uniquely_identified).toBeTruthy();
          expect(insertCall.phi_access_level).toBe(user.phiAccess);
          expect(insertCall.automatic_logoff_enabled).toBeTruthy();
        }
      });

      it('should implement emergency access procedures', async () => {
        const emergencyScenario = {
          userId: 'emergency-physician-123',
          emergencyType: 'medical_emergency',
          patientId: 'guest-critical-456',
          accessReason: 'Life-threatening allergic reaction during wedding reception'
        };

        await auditLogger.logEmergencyAccess({
          userId: emergencyScenario.userId,
          resourceId: emergencyScenario.patientId,
          emergencyType: emergencyScenario.emergencyType,
          justification: emergencyScenario.accessReason,
          timestamp: new Date().toISOString(),
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            emergencyAccess: true,
            requirement: '164.312(a)(1)',
            reviewRequired: true,
            temporaryAccess: true
          }
        });

        const emergencyCall = mockSupabase.from('emergency_access_logs').insert.mock.calls[0][0];
        expect(emergencyCall.emergency_access).toBeTruthy();
        expect(emergencyCall.review_required).toBeTruthy();
        expect(emergencyCall.access_temporary).toBeTruthy();
      });
    });

    describe('§164.312(b) - Audit Controls', () => {
      it('should implement comprehensive audit controls for PHI access', async () => {
        const phiAccessEvents = [
          {
            action: 'phi.create',
            details: { recordType: 'medical_dietary_restrictions', guestId: 'guest-123' }
          },
          {
            action: 'phi.read',
            details: { recordType: 'accessibility_requirements', guestId: 'guest-123' }
          },
          {
            action: 'phi.update',
            details: { recordType: 'medical_dietary_restrictions', changes: ['added_shellfish_allergy'] }
          },
          {
            action: 'phi.delete',
            details: { recordType: 'outdated_medical_info', reason: 'data_correction' }
          }
        ];

        for (const event of phiAccessEvents) {
          await auditLogger.logAction({
            userId: 'medical-coordinator-123',
            action: event.action,
            resourceId: 'phi-record-456',
            details: event.details,
            hipaaContext: {
              coveredEntity: 'WedSync Health Services',
              auditControlsEnabled: true,
              phiOperation: event.action.split('.')[1], // create, read, update, delete
              tamperResistant: true,
              requirement: '164.312(b)'
            }
          });
        }

        const auditControlCalls = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.auditControlsEnabled);
        expect(auditControlCalls).toHaveLength(4);
        
        // Verify all CRUD operations are tracked
        const operations = auditControlCalls.map(call => call[0].hipaa_context.phiOperation);
        expect(operations).toContain('create');
        expect(operations).toContain('read');
        expect(operations).toContain('update');
        expect(operations).toContain('delete');
      });
    });

    describe('§164.312(c)(1) - Integrity Controls', () => {
      it('should implement integrity controls for PHI in audit logs', async () => {
        const integrityTest = {
          userId: 'data-manager-123',
          action: 'phi.integrity.verify',
          resourceId: 'phi-database-456'
        };

        // Simulate integrity verification
        await auditLogger.logAction({
          ...integrityTest,
          details: {
            integrityCheckType: 'hash_verification',
            checksumVerified: true,
            dataUnaltered: true,
            verificationTimestamp: new Date().toISOString()
          },
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            integrityControl: true,
            dataUnaltered: true,
            hashVerified: true,
            requirement: '164.312(c)(1)'
          }
        });

        const integrityCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
        expect(integrityCall.integrity_verified).toBeTruthy();
        expect(integrityCall.data_unaltered).toBeTruthy();
        expect(integrityCall.checksum_verified).toBeTruthy();
      });
    });

    describe('§164.312(d) - Person or Entity Authentication', () => {
      it('should verify identity before PHI access', async () => {
        const authenticationMethods = [
          {
            userId: 'physician-123',
            method: 'biometric_fingerprint',
            secondFactor: 'sms_token',
            success: true
          },
          {
            userId: 'staff-456',
            method: 'username_password',
            secondFactor: 'authenticator_app',
            success: true
          },
          {
            userId: 'unknown-789',
            method: 'username_password',
            secondFactor: 'none',
            success: false
          }
        ];

        for (const auth of authenticationMethods) {
          if (auth.success) {
            await auditLogger.logAction({
              userId: auth.userId,
              action: 'authentication.success',
              resourceId: 'hipaa_system',
              details: {
                authenticationMethod: auth.method,
                multiFactorUsed: auth.secondFactor !== 'none',
                secondFactor: auth.secondFactor
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                personAuthenticated: true,
                multiFactorAuth: auth.secondFactor !== 'none',
                requirement: '164.312(d)'
              }
            });
          } else {
            await auditLogger.logAction({
              userId: auth.userId,
              action: 'authentication.failed',
              resourceId: 'hipaa_system',
              details: {
                authenticationMethod: auth.method,
                failureReason: 'insufficient_authentication',
                phiAccessDenied: true
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                personAuthenticated: false,
                requirement: '164.312(d)'
              }
            });
          }
        }

        const successfulAuths = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.personAuthenticated === true);
        expect(successfulAuths).toHaveLength(2);

        const failedAuths = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.personAuthenticated === false);
        expect(failedAuths).toHaveLength(1);
      });
    });

    describe('§164.312(e)(1) - Transmission Security', () => {
      it('should secure PHI transmissions in audit logs', async () => {
        const transmissionScenarios = [
          {
            type: 'internal_secure',
            from: 'hipaa_system_a',
            to: 'hipaa_system_b',
            encrypted: true,
            protocol: 'TLS_1.3'
          },
          {
            type: 'external_secure',
            from: 'wedsync_hipaa',
            to: 'partner_healthcare_system',
            encrypted: true,
            protocol: 'SFTP'
          },
          {
            type: 'insecure_blocked',
            from: 'hipaa_system',
            to: 'unsecured_endpoint',
            encrypted: false,
            blocked: true
          }
        ];

        for (const transmission of transmissionScenarios) {
          if (!transmission.blocked) {
            await auditLogger.logAction({
              userId: 'system-transmission-service',
              action: 'phi.transmit',
              resourceId: `${transmission.from}-to-${transmission.to}`,
              details: {
                transmissionType: transmission.type,
                encryptionUsed: transmission.encrypted,
                protocol: transmission.protocol,
                transmissionSecure: true
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                transmissionSecurity: true,
                endToEndEncryption: transmission.encrypted,
                secureProtocol: transmission.protocol,
                requirement: '164.312(e)(1)'
              }
            });
          } else {
            await auditLogger.logSecurityEvent({
              eventType: 'insecure_transmission_blocked',
              details: {
                attemptedTransmission: transmission,
                reason: 'PHI transmission security requirements not met',
                blocked: true
              },
              hipaaContext: {
                coveredEntity: 'WedSync Health Services',
                securityViolationPrevented: true,
                requirement: '164.312(e)(1)'
              }
            });
          }
        }

        const secureTransmissions = mockSupabase.from('audit_logs').insert.mock.calls
          .filter(call => call[0].hipaa_context?.transmissionSecurity);
        expect(secureTransmissions).toHaveLength(2);
      });
    });
  });

  describe('Minimum Necessary Standard - §164.502(b)', () => {
    it('should apply minimum necessary standard to audit logs', async () => {
      const minimumNecessaryTests = [
        {
          userId: 'catering-coordinator-123',
          role: 'catering_staff',
          action: 'wedding.guest.dietary.access',
          necessaryData: ['dietary_restrictions', 'food_allergies'],
          unnecessaryData: ['medical_conditions', 'medications', 'mental_health'],
          purpose: 'meal_preparation'
        },
        {
          userId: 'accessibility-coordinator-456',
          role: 'accessibility_staff',
          action: 'wedding.guest.accessibility.access',
          necessaryData: ['mobility_needs', 'accessibility_requirements'],
          unnecessaryData: ['dietary_restrictions', 'medical_history'],
          purpose: 'accessibility_accommodation'
        }
      ];

      for (const test of minimumNecessaryTests) {
        await auditLogger.logAction({
          userId: test.userId,
          action: test.action,
          resourceId: 'guest-phi-789',
          details: {
            role: test.role,
            purpose: test.purpose,
            dataAccessed: test.necessaryData,
            dataFiltered: test.unnecessaryData,
            minimumNecessaryApplied: true
          },
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            minimumNecessary: true,
            purpose: test.purpose,
            dataJustified: true,
            requirement: '164.502(b)'
          }
        });

        const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
        expect(insertCall.minimum_necessary_applied).toBeTruthy();
        expect(insertCall.details.dataAccessed).toEqual(test.necessaryData);
        expect(insertCall.details.dataFiltered).toEqual(test.unnecessaryData);
      }
    });
  });

  describe('Business Associate Agreements - §164.504(e)', () => {
    it('should track business associate PHI access in audit logs', async () => {
      const businessAssociates = [
        {
          id: 'ba-catering-001',
          name: 'Elite Catering Services',
          agreementId: 'BAA-2024-001',
          phiAccess: 'dietary_restrictions_only'
        },
        {
          id: 'ba-medical-002',
          name: 'Event Medical Services',
          agreementId: 'BAA-2024-002',
          phiAccess: 'full_medical_information'
        }
      ];

      for (const ba of businessAssociates) {
        await auditLogger.logAction({
          userId: ba.id,
          action: 'phi.business_associate.access',
          resourceId: 'guest-phi-collection',
          details: {
            businessAssociateName: ba.name,
            baAgreementId: ba.agreementId,
            permittedPhiAccess: ba.phiAccess,
            purposeLimited: true
          },
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            businessAssociate: true,
            baAgreementActive: true,
            baAgreementId: ba.agreementId,
            phiAccessPermitted: ba.phiAccess,
            requirement: '164.504(e)'
          }
        });

        const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
        expect(insertCall.business_associate_access).toBeTruthy();
        expect(insertCall.ba_agreement_id).toBe(ba.agreementId);
        expect(insertCall.ba_agreement_active).toBeTruthy();
      }
    });
  });

  describe('Breach Notification Rule - §164.400-414', () => {
    it('should handle HIPAA breach notification in audit system', async () => {
      const breachScenarios = [
        {
          incidentId: 'breach-hipaa-2024-001',
          type: 'unauthorized_access',
          phiAffected: true,
          individualCount: 25,
          riskLevel: 'low',
          notificationRequired: false
        },
        {
          incidentId: 'breach-hipaa-2024-002', 
          type: 'data_theft',
          phiAffected: true,
          individualCount: 600,
          riskLevel: 'high',
          notificationRequired: true
        }
      ];

      for (const breach of breachScenarios) {
        const breachResponse = await auditLogger.handleHipaaBreach({
          incidentId: breach.incidentId,
          breachType: breach.type,
          discoveryDate: new Date().toISOString(),
          phiInvolved: breach.phiAffected,
          individualsAffected: breach.individualCount,
          riskAssessment: breach.riskLevel,
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            breachNotificationRule: true,
            requirement: '164.404'
          }
        });

        if (breach.individualCount >= 500) {
          expect(breachResponse.hhsNotificationRequired).toBeTruthy();
          expect(breachResponse.mediaNotificationRequired).toBeTruthy();
          expect(breachResponse.timeframeCompliance).toBe('60_days');
        } else if (breach.notificationRequired) {
          expect(breachResponse.individualNotificationRequired).toBeTruthy();
          expect(breachResponse.timeframeCompliance).toBe('60_days');
        }

        expect(breachResponse.auditTrailComplete).toBeTruthy();
        expect(breachResponse.riskAssessmentConducted).toBeTruthy();
      }
    });
  });

  describe('HIPAA Audit Log Retention', () => {
    it('should maintain HIPAA-compliant audit log retention', async () => {
      const retentionRequirements = [
        {
          recordType: 'phi_access_logs',
          retentionPeriod: 2190, // 6 years in days
          legalRequirement: 'HIPAA §164.530(j)'
        },
        {
          recordType: 'security_incident_logs',
          retentionPeriod: 2190, // 6 years in days
          legalRequirement: 'HIPAA §164.308(a)(6)'
        },
        {
          recordType: 'training_records',
          retentionPeriod: 2190, // 6 years in days
          legalRequirement: 'HIPAA §164.308(a)(5)'
        }
      ];

      for (const requirement of retentionRequirements) {
        await auditLogger.logAction({
          userId: 'retention-manager-123',
          action: 'hipaa.retention.policy.apply',
          resourceId: requirement.recordType,
          details: {
            recordType: requirement.recordType,
            retentionPeriod: requirement.retentionPeriod,
            legalBasis: requirement.legalRequirement,
            retentionActive: true
          },
          hipaaContext: {
            coveredEntity: 'WedSync Health Services',
            retentionCompliance: true,
            retentionPeriod: requirement.retentionPeriod,
            legalRequirement: requirement.legalRequirement,
            requirement: '164.530(j)'
          }
        });
      }

      const retentionLogs = mockSupabase.from('audit_logs').insert.mock.calls
        .filter(call => call[0].hipaa_context?.retentionCompliance);
      expect(retentionLogs).toHaveLength(3);
      
      retentionLogs.forEach(log => {
        expect(log[0].hipaa_retention_period).toBe(2190);
      });
    });
  });
});