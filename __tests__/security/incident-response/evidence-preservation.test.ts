/**
 * WS-190 Team E: Evidence Preservation Test Suite
 * 
 * Comprehensive testing for forensic evidence collection, chain of custody,
 * and digital evidence preservation for security incident investigations.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EvidencePreservationManager } from '@/lib/security/evidence-preservation';
import { ForensicCollector } from '@/lib/security/forensic-collector';
import { ChainOfCustody } from '@/lib/security/chain-of-custody';
import { CryptographicVerification } from '@/lib/security/crypto-verification';

// Mock dependencies
vi.mock('@/lib/security/forensic-collector');
vi.mock('@/lib/security/chain-of-custody');
vi.mock('@/lib/security/crypto-verification');

describe('WS-190: Evidence Preservation System', () => {
  let evidenceManager: EvidencePreservationManager;
  let mockForensicCollector: any;
  let mockChainOfCustody: any;
  let mockCryptoVerification: any;

  beforeEach(() => {
    mockForensicCollector = {
      captureSystemSnapshot: vi.fn(),
      preserveLogFiles: vi.fn(),
      collectDatabaseEvidence: vi.fn(),
      captureNetworkTraffic: vi.fn(),
      preserveFileSystem: vi.fn(),
      collectMemoryDump: vi.fn(),
    };

    mockChainOfCustody = {
      initializeEvidence: vi.fn(),
      recordAccess: vi.fn(),
      transferCustody: vi.fn(),
      validateIntegrity: vi.fn(),
      generateCustodyReport: vi.fn(),
    };

    mockCryptoVerification = {
      generateHash: vi.fn().mockReturnValue('sha256:abc123...'),
      verifyIntegrity: vi.fn().mockReturnValue(true),
      signEvidence: vi.fn(),
      timestampEvidence: vi.fn(),
      createMerkleTree: vi.fn(),
    };

    (ForensicCollector as any).mockImplementation(() => mockForensicCollector);
    (ChainOfCustody as any).mockImplementation(() => mockChainOfCustody);
    (CryptographicVerification as any).mockImplementation(() => mockCryptoVerification);

    evidenceManager = new EvidencePreservationManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Incident Evidence Collection', () => {
    test('should automatically preserve evidence when security incident detected', async () => {
      const securityIncident = {
        id: 'incident-001',
        type: 'data_breach',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        affectedSystems: ['user-service', 'payment-service'],
        suspectedCompromise: ['database', 'api-endpoints'],
        preservationTrigger: 'AUTOMATIC_DETECTION'
      };

      const evidenceCollection = await evidenceManager.preserveIncidentEvidence(securityIncident);

      expect(evidenceCollection.evidenceId).toBeDefined();
      expect(evidenceCollection.collectionStarted).toBe(true);
      expect(evidenceCollection.preservedArtifacts).toContain('system_logs');
      expect(evidenceCollection.preservedArtifacts).toContain('database_snapshot');
      expect(evidenceCollection.preservedArtifacts).toContain('network_traffic');
      
      expect(mockForensicCollector.captureSystemSnapshot).toHaveBeenCalledWith({
        systems: ['user-service', 'payment-service'],
        timestamp: expect.any(Date),
        incidentId: 'incident-001'
      });
    });

    test('should preserve wedding-specific evidence during data breaches', async () => {
      const weddingDataBreach = {
        id: 'wedding-breach-001',
        type: 'unauthorized_guest_data_access',
        affectedWeddings: ['wedding-123', 'wedding-456'],
        affectedTables: ['guest_profiles', 'dietary_requirements', 'seating_arrangements'],
        suspiciousActivity: {
          unusualQueries: 150,
          dataExfiltration: true,
          accessPatterns: 'BULK_EXPORT'
        },
        weddingContext: {
          upcomingWeddings: true,
          seasonPeak: 'SUMMER_SEASON',
          vendorInvolvement: ['caterers', 'venues']
        }
      };

      const weddingEvidenceCollection = await evidenceManager.preserveWeddingBreachEvidence(weddingDataBreach);

      expect(weddingEvidenceCollection.weddingDataSnapshot).toBeDefined();
      expect(weddingEvidenceCollection.guestDataImages).toHaveLength(2); // Two weddings
      expect(weddingEvidenceCollection.queryLogPreservation).toBe(true);
      expect(weddingEvidenceCollection.vendorAccessLogs).toBeDefined();
      
      expect(mockForensicCollector.collectDatabaseEvidence).toHaveBeenCalledWith({
        tables: ['guest_profiles', 'dietary_requirements', 'seating_arrangements'],
        weddingIds: ['wedding-123', 'wedding-456'],
        preservationType: 'FORENSIC_COPY'
      });
    });

    test('should capture payment fraud evidence with financial data protection', async () => {
      const paymentFraudIncident = {
        id: 'payment-fraud-001',
        type: 'fraudulent_transactions',
        suspectedTransactions: [
          { id: 'tx-123', amount: 50000, cardLast4: '1234' },
          { id: 'tx-124', amount: 75000, cardLast4: '5678' }
        ],
        fraudIndicators: ['velocity_check_failed', 'geo_location_mismatch', 'device_fingerprint_new'],
        affectedVendors: ['photography-vendor-1', 'venue-vendor-2'],
        financialImpact: 125000
      };

      const paymentEvidenceCollection = await evidenceManager.preservePaymentFraudEvidence(paymentFraudIncident);

      expect(paymentEvidenceCollection.transactionLogs).toBeDefined();
      expect(paymentEvidenceCollection.pciComplianceValidated).toBe(true);
      expect(paymentEvidenceCollection.sensitiveDataRedacted).toBe(true);
      expect(paymentEvidenceCollection.fraudAnalysisReports).toHaveLength(2);
      
      expect(mockForensicCollector.preserveLogFiles).toHaveBeenCalledWith({
        logTypes: ['payment_gateway', 'fraud_detection', 'transaction_processing'],
        timeRange: expect.any(Object),
        redactionRequired: true
      });
    });

    test('should collect network traffic evidence during cyber attacks', async () => {
      const cyberAttackIncident = {
        id: 'cyberattack-001',
        type: 'advanced_persistent_threat',
        attackVectors: ['sql_injection', 'privilege_escalation', 'lateral_movement'],
        compromisedEndpoints: ['api.wedsync.com', 'admin.wedsync.com'],
        attackDuration: '6 hours',
        dataExfiltrationSuspected: true,
        maliciousIPs: ['192.168.999.1', '10.0.0.255']
      };

      const networkEvidenceCollection = await evidenceManager.preserveNetworkEvidence(cyberAttackIncident);

      expect(networkEvidenceCollection.packetCaptures).toBeDefined();
      expect(networkEvidenceCollection.dnsLogs).toBeDefined();
      expect(networkEvidenceCollection.firewallLogs).toBeDefined();
      expect(networkEvidenceCollection.trafficAnalysis).toBeDefined();
      
      expect(mockForensicCollector.captureNetworkTraffic).toHaveBeenCalledWith({
        endpoints: ['api.wedsync.com', 'admin.wedsync.com'],
        suspiciousIPs: ['192.168.999.1', '10.0.0.255'],
        captureType: 'DEEP_PACKET_INSPECTION'
      });
    });
  });

  describe('Chain of Custody Management', () => {
    test('should establish chain of custody immediately upon evidence collection', async () => {
      const evidenceItem = {
        id: 'evidence-001',
        type: 'DATABASE_SNAPSHOT',
        sourceSystem: 'production-db',
        collectionMethod: 'AUTOMATED_FORENSIC_COPY',
        collectedBy: 'security-system',
        collectionTimestamp: new Date(),
        originalLocation: '/var/lib/postgresql/data',
        evidenceSize: '2.5GB'
      };

      const custodyChain = await evidenceManager.establishChainOfCustody(evidenceItem);

      expect(custodyChain.custodyId).toBeDefined();
      expect(custodyChain.initialCustodian).toBe('security-system');
      expect(custodyChain.evidenceHash).toBe('sha256:abc123...');
      expect(custodyChain.integrityVerified).toBe(true);
      
      expect(mockChainOfCustody.initializeEvidence).toHaveBeenCalledWith({
        evidence: evidenceItem,
        initialHash: 'sha256:abc123...',
        timestamp: expect.any(Date)
      });
    });

    test('should track all access attempts to preserved evidence', async () => {
      const evidenceAccess = {
        evidenceId: 'evidence-001',
        accessedBy: 'security-analyst-jane',
        accessPurpose: 'FORENSIC_ANALYSIS',
        accessType: 'READ_ONLY',
        accessDuration: '2 hours',
        toolsUsed: ['wireshark', 'volatility', 'autopsy'],
        accessLocation: 'SOC_WORKSTATION_5'
      };

      const accessRecord = await evidenceManager.recordEvidenceAccess(evidenceAccess);

      expect(accessRecord.accessId).toBeDefined();
      expect(accessRecord.accessLogged).toBe(true);
      expect(accessRecord.integrityMaintained).toBe(true);
      
      expect(mockChainOfCustody.recordAccess).toHaveBeenCalledWith({
        evidence: evidenceAccess,
        preAccessHash: expect.any(String),
        postAccessHash: expect.any(String)
      });
    });

    test('should validate evidence integrity throughout custody chain', async () => {
      const evidenceValidation = {
        evidenceId: 'evidence-001',
        validationType: 'SCHEDULED_INTEGRITY_CHECK',
        checkFrequency: 'DAILY',
        originalHash: 'sha256:abc123...',
        checksumAlgorithms: ['SHA256', 'MD5', 'SHA1']
      };

      const integrityCheck = await evidenceManager.validateEvidenceIntegrity(evidenceValidation);

      expect(integrityCheck.integrityMaintained).toBe(true);
      expect(integrityCheck.hashesMatched).toBe(true);
      expect(integrityCheck.lastValidated).toBeInstanceOf(Date);
      expect(integrityCheck.tampering_detected).toBe(false);
      
      expect(mockCryptoVerification.verifyIntegrity).toHaveBeenCalledWith({
        originalHash: 'sha256:abc123...',
        currentEvidence: expect.any(Object)
      });
    });

    test('should transfer custody between authorized personnel', async () => {
      const custodyTransfer = {
        evidenceId: 'evidence-001',
        fromCustodian: 'security-system',
        toCustodian: 'forensic-analyst-john',
        transferReason: 'DETAILED_ANALYSIS',
        authorization: 'incident-commander-approval-001',
        transferLocation: 'SECURE_FORENSIC_LAB',
        witnessedBy: 'security-manager-alice'
      };

      const transferResult = await evidenceManager.transferEvidenceCustody(custodyTransfer);

      expect(transferResult.transferCompleted).toBe(true);
      expect(transferResult.newCustodian).toBe('forensic-analyst-john');
      expect(transferResult.integrityVerified).toBe(true);
      
      expect(mockChainOfCustody.transferCustody).toHaveBeenCalledWith({
        transfer: custodyTransfer,
        integrityCheck: true,
        witnessSignature: expect.any(String)
      });
    });
  });

  describe('Digital Forensics Standards', () => {
    test('should create bit-for-bit copies of critical systems', async () => {
      const systemImaging = {
        systemId: 'compromised-server-1',
        systemType: 'APPLICATION_SERVER',
        imagingMethod: 'DD_FORENSIC_COPY',
        preserveMetadata: true,
        includeUnallocatedSpace: true,
        compressionLevel: 'NONE', // Maintain forensic integrity
        hashVerification: ['SHA256', 'MD5']
      };

      const forensicImage = await evidenceManager.createForensicImage(systemImaging);

      expect(forensicImage.imageCreated).toBe(true);
      expect(forensicImage.bitForBitCopy).toBe(true);
      expect(forensicImage.integrityHashes).toHaveProperty('SHA256');
      expect(forensicImage.integrityHashes).toHaveProperty('MD5');
      expect(forensicImage.imageSize).toBeGreaterThan(0);
      
      expect(mockForensicCollector.preserveFileSystem).toHaveBeenCalledWith({
        systemId: 'compromised-server-1',
        imagingType: 'FORENSIC_DUPLICATE',
        writeBlocker: true
      });
    });

    test('should preserve volatile memory for advanced analysis', async () => {
      const memoryAcquisition = {
        systemId: 'infected-workstation',
        memoryType: 'PHYSICAL_MEMORY',
        acquisitionTool: 'VOLATILITY_FRAMEWORK',
        preserveProcesses: true,
        preserveNetworkConnections: true,
        malwareAnalysis: true,
        encryptionKeys: true
      };

      const memoryImage = await evidenceManager.acquireMemoryEvidence(memoryAcquisition);

      expect(memoryImage.memoryDumped).toBe(true);
      expect(memoryImage.processListCaptured).toBe(true);
      expect(memoryImage.networkConnectionsPreserved).toBe(true);
      expect(memoryImage.volatileDataPreserved).toBe(true);
      
      expect(mockForensicCollector.collectMemoryDump).toHaveBeenCalledWith({
        system: 'infected-workstation',
        dumpType: 'FULL_PHYSICAL_MEMORY',
        analysisReady: true
      });
    });

    test('should document forensic procedures for court admissibility', async () => {
      const forensicDocumentation = {
        incidentId: 'incident-001',
        evidenceCollectionProcedures: [
          'NIST_SP_800_86', // NIST forensic guidelines
          'ISO_IEC_27037', // International forensic standards
          'ACPO_GUIDELINES' // UK police forensic guidelines
        ],
        toolsUsed: ['EnCase', 'FTK', 'Volatility', 'Wireshark'],
        analystCertifications: ['GCFA', 'GCIH', 'EnCE'],
        qualityAssurance: true
      };

      const forensicReport = await evidenceManager.generateForensicReport(forensicDocumentation);

      expect(forensicReport.courtAdmissible).toBe(true);
      expect(forensicReport.standardsCompliant).toBe(true);
      expect(forensicReport.chainOfCustodyComplete).toBe(true);
      expect(forensicReport.analystQualified).toBe(true);
      expect(forensicReport.proceduresDocumented).toBe(true);
    });
  });

  describe('Legal and Regulatory Compliance', () => {
    test('should preserve evidence for regulatory investigation requirements', async () => {
      const regulatoryPreservation = {
        incidentId: 'regulatory-001',
        regulatoryBody: 'ICO_UK', // UK Information Commissioner's Office
        investigationType: 'GDPR_BREACH_INVESTIGATION',
        preservationOrder: 'FORMAL_NOTICE',
        retentionPeriod: '7_YEARS',
        evidenceTypes: [
          'DATA_BREACH_LOGS',
          'INCIDENT_RESPONSE_RECORDS',
          'REMEDIATION_DOCUMENTATION'
        ]
      };

      const regulatoryEvidence = await evidenceManager.preserveRegulatoryEvidence(regulatoryPreservation);

      expect(regulatoryEvidence.preservationCompliant).toBe(true);
      expect(regulatoryEvidence.retentionScheduled).toBe(true);
      expect(regulatoryEvidence.regulatoryAccess).toBe(true);
      expect(regulatoryEvidence.preservationPeriod).toBe('7_YEARS');
    });

    test('should handle law enforcement evidence requests', async () => {
      const lawEnforcementRequest = {
        requestId: 'le-request-001',
        requestingAgency: 'NATIONAL_CRIME_AGENCY',
        legalAuthority: 'COURT_ORDER',
        requestType: 'PRODUCTION_ORDER',
        requestedEvidence: [
          'USER_COMMUNICATIONS',
          'TRANSACTION_RECORDS',
          'ACCESS_LOGS'
        ],
        timeframe: '2023-01-01_to_2023-12-31',
        urgency: 'STANDARD'
      };

      const lawEnforcementResponse = await evidenceManager.handleLawEnforcementRequest(lawEnforcementRequest);

      expect(lawEnforcementResponse.requestValid).toBe(true);
      expect(lawEnforcementResponse.evidenceProvided).toBe(true);
      expect(lawEnforcementResponse.legalProcessFollowed).toBe(true);
      expect(lawEnforcementResponse.privacyProtected).toBe(true);
    });

    test('should maintain audit trails for all evidence handling', async () => {
      const auditTrailGeneration = {
        evidenceId: 'evidence-001',
        auditPeriod: '2024-01-01_to_2024-01-31',
        auditScope: 'COMPLETE_CHAIN_OF_CUSTODY',
        includeSystemLogs: true,
        includeUserActions: true,
        includeIntegrityChecks: true
      };

      const auditTrail = await evidenceManager.generateAuditTrail(auditTrailGeneration);

      expect(auditTrail.trailComplete).toBe(true);
      expect(auditTrail.allActionsLogged).toBe(true);
      expect(auditTrail.integrityValidated).toBe(true);
      expect(auditTrail.auditableEvents).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should preserve evidence without impacting production systems', async () => {
      const performanceConstrainedCollection = {
        productionSystemId: 'high-traffic-api',
        trafficLevel: 'PEAK_WEDDING_SEASON',
        concurrentUsers: 10000,
        preservationMethod: 'LOW_IMPACT_COLLECTION',
        maxResourceUsage: '10%', // CPU/Memory limit
        collectionWindow: 'OFF_PEAK_HOURS'
      };

      const startTime = Date.now();
      const evidenceCollection = await evidenceManager.preserveEvidenceWithConstraints(performanceConstrainedCollection);
      const collectionTime = Date.now() - startTime;

      expect(evidenceCollection.impactMinimal).toBe(true);
      expect(evidenceCollection.productionUnaffected).toBe(true);
      expect(collectionTime).toBeLessThan(30000); // Less than 30 seconds
      expect(evidenceCollection.resourceUsageWithinLimits).toBe(true);
    });

    test('should handle large-scale evidence collection during major incidents', async () => {
      const largescaleCollection = {
        incidentId: 'major-incident-001',
        evidenceVolume: '10TB',
        systemsAffected: 50,
        collectionMethod: 'PARALLEL_ACQUISITION',
        priorityEvidence: ['DATABASE_SNAPSHOTS', 'LOG_FILES'],
        secondaryEvidence: ['SYSTEM_IMAGES', 'NETWORK_CAPTURES']
      };

      const startTime = Date.now();
      const largescaleEvidence = await evidenceManager.collectLargescaleEvidence(largescaleCollection);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(3600000); // Less than 1 hour
      expect(largescaleEvidence.priorityEvidenceCollected).toBe(true);
      expect(largescaleEvidence.parallelCollectionSuccessful).toBe(true);
      expect(largescaleEvidence.integrityMaintained).toBe(true);
    });

    test('should scale storage for evidence retention requirements', async () => {
      const storageRequirements = {
        expectedEvidenceVolume: '100TB',
        retentionPeriod: '7_YEARS',
        accessPattern: 'INFREQUENT_ACCESS',
        redundancyLevel: 'TRIPLE_REDUNDANCY',
        encryptionRequired: true,
        complianceStandards: ['SOX', 'GDPR', 'PCI_DSS']
      };

      const storageProvisioning = await evidenceManager.provisionEvidenceStorage(storageRequirements);

      expect(storageProvisioning.capacityAdequate).toBe(true);
      expect(storageProvisioning.redundancyConfigured).toBe(true);
      expect(storageProvisioning.encryptionEnabled).toBe(true);
      expect(storageProvisioning.complianceValidated).toBe(true);
    });
  });

  describe('Integration and Automation', () => {
    test('should integrate with SIEM systems for automated evidence collection', async () => {
      const siemIntegration = {
        siemSystem: 'SPLUNK_ENTERPRISE',
        alertThreshold: 'HIGH_SEVERITY',
        autoCollectionRules: [
          'AUTHENTICATION_FAILURES > 100',
          'DATA_EXFILTRATION_DETECTED',
          'MALWARE_SIGNATURE_MATCH'
        ],
        evidenceTypes: ['LOG_CORRELATION', 'THREAT_INTELLIGENCE']
      };

      const siemEvidenceCollection = await evidenceManager.integrateSIEMCollection(siemIntegration);

      expect(siemEvidenceCollection.integrationActive).toBe(true);
      expect(siemEvidenceCollection.autoCollectionEnabled).toBe(true);
      expect(siemEvidenceCollection.alertsCorrelated).toBe(true);
    });

    test('should provide APIs for external forensic tools', async () => {
      const externalToolIntegration = {
        toolName: 'VOLATILITY_FRAMEWORK',
        integrationMethod: 'REST_API',
        evidenceAccess: 'READ_ONLY',
        authenticationRequired: true,
        auditingEnabled: true
      };

      const toolIntegration = await evidenceManager.integrateExternalTool(externalToolIntegration);

      expect(toolIntegration.integrationSuccessful).toBe(true);
      expect(toolIntegration.secureAccess).toBe(true);
      expect(toolIntegration.auditingEnabled).toBe(true);
    });
  });
});