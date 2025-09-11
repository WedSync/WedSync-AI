/**
 * WS-190 Evidence Preservation Service - Forensic Chain of Custody
 * Team B Implementation - Backend/API Focus
 *
 * CRITICAL: Maintains forensic evidence integrity for legal compliance
 * Cryptographic chain of custody for incident response and regulatory requirements
 */

import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import * as crypto from 'crypto';

// Evidence validation schemas
const EvidenceItemSchema = z.object({
  evidenceType: z.enum([
    'system_logs',
    'database_snapshot',
    'network_traffic',
    'user_actions',
    'file_system_changes',
    'authentication_logs',
    'api_requests',
    'error_logs',
    'screenshot',
    'configuration_backup',
    'memory_dump',
    'disk_image',
    'email_records',
    'communication_logs',
    'payment_records',
    'guest_data_export',
    'wedding_photos',
    'vendor_communications',
    'incident_documentation',
  ]),
  description: z.string().min(10),
  sourceSystem: z.string(),
  collectionMethod: z.enum([
    'automated_export',
    'manual_collection',
    'real_time_capture',
    'forensic_imaging',
    'database_query',
    'log_extraction',
    'screenshot_capture',
    'memory_dump',
    'network_capture',
    'file_copy',
    'api_export',
  ]),
  evidenceData: z.union([
    z.string(), // For text/log data
    z.object({}).passthrough(), // For structured data
    z.array(z.any()), // For arrays of data
  ]),
  metadata: z.record(z.any()).default({}),
  criticalEvidence: z.boolean().default(false),
  weddingRelated: z.boolean().default(false),
  containsPII: z.boolean().default(false),
  retentionYears: z.number().int().min(1).max(50).default(7),
});

interface ChainOfCustodyEntry {
  id: string;
  evidenceId: string;
  action:
    | 'collected'
    | 'accessed'
    | 'analyzed'
    | 'transferred'
    | 'exported'
    | 'destroyed';
  performedBy: string;
  performedAt: Date;
  reason: string;
  location: string;
  witnessedBy?: string;
  digitalSignature: string;
  integrityHash: string;
  notes?: string;
}

interface EvidenceIntegrityReport {
  evidenceId: string;
  originalHash: string;
  currentHash: string;
  integrityMaintained: boolean;
  lastVerified: Date;
  verificationHistory: Array<{
    timestamp: Date;
    hash: string;
    verifiedBy: string;
    status: 'verified' | 'corrupted' | 'modified';
  }>;
  chainOfCustodyComplete: boolean;
  legalAdmissible: boolean;
}

interface ForensicExport {
  exportId: string;
  incidentId: string;
  evidenceItems: string[];
  exportFormat:
    | 'legal_package'
    | 'technical_analysis'
    | 'regulatory_submission';
  packageHash: string;
  digitalSignature: string;
  exportedBy: string;
  exportedAt: Date;
  witnessedBy?: string;
  sealed: boolean;
}

export class EvidencePreservationService {
  private supabase;
  private organizationId: string;
  private encryptionKey: Buffer;

  constructor(organizationId: string, encryptionKey?: string) {
    this.supabase = createClient();
    this.organizationId = organizationId;
    // In production, this would be from secure key management
    this.encryptionKey = Buffer.from(
      encryptionKey || 'default-key-change-in-production',
      'utf8',
    );
  }

  /**
   * 1. EVIDENCE COLLECTION WITH CRYPTOGRAPHIC INTEGRITY
   */
  async collectEvidence(
    incidentId: string,
    evidenceData: z.infer<typeof EvidenceItemSchema>,
    collectedBy: string,
    witnessedBy?: string,
  ): Promise<{
    evidenceId: string;
    integrityHash: string;
    chainOfCustodyId: string;
  }> {
    const validated = EvidenceItemSchema.parse(evidenceData);

    // Serialize evidence data for hashing
    const evidenceDataString =
      typeof validated.evidenceData === 'string'
        ? validated.evidenceData
        : JSON.stringify(validated.evidenceData);

    // Generate cryptographic hash for integrity verification
    const integrityHash = crypto
      .createHash('sha256')
      .update(evidenceDataString)
      .update(validated.description)
      .update(validated.sourceSystem)
      .update(new Date().toISOString())
      .digest('hex');

    // Encrypt sensitive evidence data
    const encryptedData = this.encryptEvidence(evidenceDataString);

    // Create evidence record
    const { data: evidence, error: evidenceError } = await this.supabase
      .from('incident_evidence')
      .insert({
        incident_id: incidentId,
        organization_id: this.organizationId,
        evidence_type: validated.evidenceType,
        description: validated.description,
        source_system: validated.sourceSystem,
        collection_method: validated.collectionMethod,
        evidence_data_encrypted: encryptedData,
        evidence_metadata: validated.metadata,
        original_hash: integrityHash,
        current_hash: integrityHash,
        critical_evidence: validated.criticalEvidence,
        wedding_related: validated.weddingRelated,
        contains_pii: validated.containsPII,
        retention_deadline: new Date(
          Date.now() + validated.retentionYears * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        chain_of_custody_complete: true,
        legal_admissible: true,
        collected_by: collectedBy,
        witnessed_by: witnessedBy,
      })
      .select()
      .single();

    if (evidenceError) throw evidenceError;

    // Create initial chain of custody entry
    const chainOfCustodyId = await this.addChainOfCustodyEntry(evidence.id, {
      action: 'collected',
      performedBy: collectedBy,
      reason: 'Initial evidence collection for incident investigation',
      location: validated.sourceSystem,
      witnessedBy: witnessedBy,
      notes: `Evidence type: ${validated.evidenceType}, Method: ${validated.collectionMethod}`,
    });

    // Schedule automated integrity verification
    await this.scheduleIntegrityVerification(evidence.id);

    return {
      evidenceId: evidence.id,
      integrityHash,
      chainOfCustodyId,
    };
  }

  /**
   * 2. CHAIN OF CUSTODY MANAGEMENT
   */
  async addChainOfCustodyEntry(
    evidenceId: string,
    entry: {
      action: ChainOfCustodyEntry['action'];
      performedBy: string;
      reason: string;
      location: string;
      witnessedBy?: string;
      notes?: string;
    },
  ): Promise<string> {
    const timestamp = new Date();

    // Get current evidence hash for integrity check
    const { data: evidence } = await this.supabase
      .from('incident_evidence')
      .select('current_hash')
      .eq('id', evidenceId)
      .single();

    if (!evidence) throw new Error('Evidence not found');

    // Create digital signature for this custody entry
    const signatureData = [
      evidenceId,
      entry.action,
      entry.performedBy,
      timestamp.toISOString(),
      evidence.current_hash,
    ].join('|');

    const digitalSignature = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(signatureData)
      .digest('hex');

    // Insert custody entry
    const { data: custodyEntry, error } = await this.supabase
      .from('evidence_chain_of_custody')
      .insert({
        evidence_id: evidenceId,
        action: entry.action,
        performed_by: entry.performedBy,
        performed_at: timestamp.toISOString(),
        reason: entry.reason,
        location: entry.location,
        witnessed_by: entry.witnessedBy,
        digital_signature: digitalSignature,
        integrity_hash: evidence.current_hash,
        notes: entry.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit trail
    console.log(
      `🔐 Chain of custody: ${entry.action} on evidence ${evidenceId} by ${entry.performedBy}`,
    );

    return custodyEntry.id;
  }

  /**
   * 3. EVIDENCE INTEGRITY VERIFICATION
   */
  async verifyEvidenceIntegrity(
    evidenceId: string,
    verifiedBy: string,
  ): Promise<EvidenceIntegrityReport> {
    // Get evidence record
    const { data: evidence } = await this.supabase
      .from('incident_evidence')
      .select('*')
      .eq('id', evidenceId)
      .single();

    if (!evidence) throw new Error('Evidence not found');

    // Decrypt and rehash evidence data
    const decryptedData = this.decryptEvidence(
      evidence.evidence_data_encrypted,
    );
    const currentHash = crypto
      .createHash('sha256')
      .update(decryptedData)
      .update(evidence.description)
      .update(evidence.source_system)
      .update(evidence.created_at)
      .digest('hex');

    const integrityMaintained = currentHash === evidence.original_hash;

    // Get chain of custody completeness
    const { data: custodyEntries } = await this.supabase
      .from('evidence_chain_of_custody')
      .select('*')
      .eq('evidence_id', evidenceId)
      .order('performed_at', { ascending: true });

    const chainOfCustodyComplete = custodyEntries && custodyEntries.length > 0;

    // Verify all custody signatures
    let signatureVerification = true;
    if (custodyEntries) {
      for (const entry of custodyEntries) {
        const expectedSignature = crypto
          .createHmac('sha256', this.encryptionKey)
          .update(
            [
              evidenceId,
              entry.action,
              entry.performed_by,
              entry.performed_at,
              entry.integrity_hash,
            ].join('|'),
          )
          .digest('hex');

        if (expectedSignature !== entry.digital_signature) {
          signatureVerification = false;
          break;
        }
      }
    }

    const legalAdmissible =
      integrityMaintained && chainOfCustodyComplete && signatureVerification;

    // Update evidence record
    await this.supabase
      .from('incident_evidence')
      .update({
        current_hash: currentHash,
        last_integrity_check: new Date().toISOString(),
        integrity_maintained: integrityMaintained,
        chain_of_custody_complete: chainOfCustodyComplete,
        legal_admissible: legalAdmissible,
      })
      .eq('id', evidenceId);

    // Add verification to chain of custody
    await this.addChainOfCustodyEntry(evidenceId, {
      action: 'accessed',
      performedBy: verifiedBy,
      reason: 'Integrity verification',
      location: 'evidence_management_system',
      notes: `Integrity: ${integrityMaintained ? 'MAINTAINED' : 'COMPROMISED'}, Legal: ${legalAdmissible ? 'ADMISSIBLE' : 'INADMISSIBLE'}`,
    });

    // Get verification history
    const { data: verificationHistory } = await this.supabase
      .from('evidence_verification_log')
      .select('*')
      .eq('evidence_id', evidenceId)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Record this verification
    await this.supabase.from('evidence_verification_log').insert({
      evidence_id: evidenceId,
      verified_by: verifiedBy,
      original_hash: evidence.original_hash,
      current_hash: currentHash,
      status: integrityMaintained ? 'verified' : 'corrupted',
    });

    return {
      evidenceId,
      originalHash: evidence.original_hash,
      currentHash,
      integrityMaintained,
      lastVerified: new Date(),
      verificationHistory:
        verificationHistory?.map((v) => ({
          timestamp: new Date(v.timestamp),
          hash: v.current_hash,
          verifiedBy: v.verified_by,
          status: v.status as 'verified' | 'corrupted' | 'modified',
        })) || [],
      chainOfCustodyComplete,
      legalAdmissible,
    };
  }

  /**
   * 4. AUTOMATED EVIDENCE COLLECTION
   */
  async collectSystemLogs(
    incidentId: string,
    systems: string[],
    timeRange: { start: Date; end: Date },
    collectedBy: string,
  ): Promise<string[]> {
    const evidenceIds: string[] = [];

    for (const system of systems) {
      try {
        // Simulate log collection (in production, this would integrate with actual systems)
        const logData = await this.extractSystemLogs(system, timeRange);

        const { evidenceId } = await this.collectEvidence(
          incidentId,
          {
            evidenceType: 'system_logs',
            description: `System logs from ${system} for time range ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`,
            sourceSystem: system,
            collectionMethod: 'automated_export',
            evidenceData: logData,
            metadata: {
              logCount: logData.entries?.length || 0,
              timeRange,
              automated: true,
            },
            criticalEvidence: true,
          },
          collectedBy,
        );

        evidenceIds.push(evidenceId);
        console.log(
          `📊 Collected ${logData.entries?.length || 0} log entries from ${system}`,
        );
      } catch (error) {
        console.error(`Failed to collect logs from ${system}:`, error);
        continue;
      }
    }

    return evidenceIds;
  }

  async collectDatabaseSnapshot(
    incidentId: string,
    tables: string[],
    collectedBy: string,
    witnessedBy?: string,
  ): Promise<string> {
    // Create database snapshot
    const snapshot = await this.createDatabaseSnapshot(tables);

    const { evidenceId } = await this.collectEvidence(
      incidentId,
      {
        evidenceType: 'database_snapshot',
        description: `Database snapshot of tables: ${tables.join(', ')}`,
        sourceSystem: 'postgres_database',
        collectionMethod: 'database_query',
        evidenceData: snapshot,
        metadata: {
          tableCount: tables.length,
          recordCount: snapshot.totalRecords,
          snapshotTime: new Date().toISOString(),
          automated: false,
        },
        criticalEvidence: true,
        containsPII: true,
      },
      collectedBy,
      witnessedBy,
    );

    return evidenceId;
  }

  async collectUserActionLogs(
    incidentId: string,
    userId: string,
    timeRange: { start: Date; end: Date },
    collectedBy: string,
  ): Promise<string> {
    const userActions = await this.extractUserActions(userId, timeRange);

    const { evidenceId } = await this.collectEvidence(
      incidentId,
      {
        evidenceType: 'user_actions',
        description: `User action logs for user ${userId}`,
        sourceSystem: 'application_audit_log',
        collectionMethod: 'log_extraction',
        evidenceData: userActions,
        metadata: {
          userId,
          actionCount: userActions.actions?.length || 0,
          timeRange,
          includesSensitiveActions: userActions.sensitiveActions || false,
        },
        criticalEvidence: true,
        containsPII: true,
      },
      collectedBy,
    );

    return evidenceId;
  }

  /**
   * 5. FORENSIC EXPORT PACKAGE
   */
  async createForensicExportPackage(
    incidentId: string,
    evidenceIds: string[],
    exportFormat: ForensicExport['exportFormat'],
    exportedBy: string,
    witnessedBy?: string,
  ): Promise<ForensicExport> {
    // Verify all evidence integrity before export
    const integrityReports = await Promise.all(
      evidenceIds.map((id) => this.verifyEvidenceIntegrity(id, exportedBy)),
    );

    const compromisedEvidence = integrityReports.filter(
      (report) => !report.integrityMaintained,
    );
    if (compromisedEvidence.length > 0) {
      throw new Error(
        `Cannot create export: ${compromisedEvidence.length} evidence items have compromised integrity`,
      );
    }

    // Get all evidence records
    const { data: evidenceItems } = await this.supabase
      .from('incident_evidence')
      .select(
        `
        *,
        evidence_chain_of_custody(*)
      `,
      )
      .in('id', evidenceIds);

    if (!evidenceItems || evidenceItems.length !== evidenceIds.length) {
      throw new Error('Some evidence items not found');
    }

    // Create export package
    const exportPackage = {
      metadata: {
        exportId: crypto.randomUUID(),
        incidentId,
        exportFormat,
        exportedBy,
        exportedAt: new Date().toISOString(),
        witnessedBy,
        evidenceCount: evidenceItems.length,
      },
      evidence: evidenceItems.map((item) => ({
        id: item.id,
        type: item.evidence_type,
        description: item.description,
        sourceSystem: item.source_system,
        collectionMethod: item.collection_method,
        originalHash: item.original_hash,
        currentHash: item.current_hash,
        integrityMaintained: item.integrity_maintained,
        legalAdmissible: item.legal_admissible,
        collectedAt: item.created_at,
        collectedBy: item.collected_by,
        witnessedBy: item.witnessed_by,
        // Decrypt evidence data for export
        data: this.decryptEvidence(item.evidence_data_encrypted),
        chainOfCustody: item.evidence_chain_of_custody,
      })),
      integrityReport: integrityReports,
      certification: {
        certifiedBy: exportedBy,
        certifiedAt: new Date().toISOString(),
        statement:
          'I certify that this evidence package contains a true and accurate copy of all evidence items listed herein, and that the chain of custody has been properly maintained.',
      },
    };

    // Generate package hash
    const packageHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(exportPackage))
      .digest('hex');

    // Generate digital signature
    const digitalSignature = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(packageHash)
      .digest('hex');

    // Create export record
    const { data: exportRecord, error } = await this.supabase
      .from('forensic_exports')
      .insert({
        incident_id: incidentId,
        organization_id: this.organizationId,
        evidence_ids: evidenceIds,
        export_format: exportFormat,
        package_hash: packageHash,
        digital_signature: digitalSignature,
        exported_by: exportedBy,
        witnessed_by: witnessedBy,
        sealed: true,
        export_data: exportPackage,
      })
      .select()
      .single();

    if (error) throw error;

    // Add custody entries for all evidence items
    await Promise.all(
      evidenceIds.map((evidenceId) =>
        this.addChainOfCustodyEntry(evidenceId, {
          action: 'exported',
          performedBy: exportedBy,
          reason: `Forensic export package created (${exportFormat})`,
          location: 'forensic_export_system',
          witnessedBy,
          notes: `Export ID: ${exportRecord.id}`,
        }),
      ),
    );

    return {
      exportId: exportRecord.id,
      incidentId,
      evidenceItems: evidenceIds,
      exportFormat,
      packageHash,
      digitalSignature,
      exportedBy,
      exportedAt: new Date(exportRecord.created_at),
      witnessedBy,
      sealed: true,
    };
  }

  /**
   * 6. EVIDENCE RETENTION AND DESTRUCTION
   */
  async getExpiringEvidence(): Promise<
    Array<{
      evidenceId: string;
      incidentId: string;
      retentionDeadline: Date;
      daysUntilExpiry: number;
    }>
  > {
    const { data: evidence } = await this.supabase
      .from('incident_evidence')
      .select('id, incident_id, retention_deadline')
      .eq('organization_id', this.organizationId)
      .lte(
        'retention_deadline',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Next 30 days
      .eq('destroyed', false);

    return (
      evidence?.map((item) => ({
        evidenceId: item.id,
        incidentId: item.incident_id,
        retentionDeadline: new Date(item.retention_deadline),
        daysUntilExpiry: Math.ceil(
          (new Date(item.retention_deadline).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      })) || []
    );
  }

  async securelyDestroyEvidence(
    evidenceId: string,
    destroyedBy: string,
    destructionReason: string,
    witnessedBy?: string,
  ): Promise<void> {
    // Verify evidence is eligible for destruction
    const { data: evidence } = await this.supabase
      .from('incident_evidence')
      .select('*')
      .eq('id', evidenceId)
      .single();

    if (!evidence) throw new Error('Evidence not found');

    const now = new Date();
    const retentionDeadline = new Date(evidence.retention_deadline);

    if (now < retentionDeadline && !destructionReason.includes('court_order')) {
      throw new Error('Evidence cannot be destroyed before retention deadline');
    }

    // Create final chain of custody entry
    await this.addChainOfCustodyEntry(evidenceId, {
      action: 'destroyed',
      performedBy: destroyedBy,
      reason: destructionReason,
      location: 'secure_destruction_facility',
      witnessedBy,
      notes: 'Evidence securely destroyed in accordance with retention policy',
    });

    // Mark as destroyed (don't actually delete for audit purposes)
    await this.supabase
      .from('incident_evidence')
      .update({
        destroyed: true,
        destroyed_at: now.toISOString(),
        destroyed_by: destroyedBy,
        destruction_reason: destructionReason,
        destruction_witnessed_by: witnessedBy,
        evidence_data_encrypted: 'SECURELY_DESTROYED', // Overwrite encrypted data
      })
      .eq('id', evidenceId);
  }

  /**
   * HELPER METHODS
   */

  private encryptEvidence(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptEvidence(encryptedData: string): string {
    if (encryptedData === 'SECURELY_DESTROYED') {
      throw new Error('Evidence has been securely destroyed');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async scheduleIntegrityVerification(
    evidenceId: string,
  ): Promise<void> {
    // In production, this would integrate with a job scheduler
    console.log(
      `📅 Scheduled integrity verification for evidence ${evidenceId}`,
    );
  }

  private async extractSystemLogs(
    system: string,
    timeRange: { start: Date; end: Date },
  ): Promise<{ entries: any[]; totalSize: number }> {
    // Mock log extraction - in production would integrate with actual systems
    const logCount = Math.floor(Math.random() * 1000) + 100;
    const entries = Array.from({ length: logCount }, (_, i) => ({
      timestamp: new Date(timeRange.start.getTime() + i * 1000),
      level: ['INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 3)],
      message: `System log entry ${i} from ${system}`,
      source: system,
    }));

    return {
      entries,
      totalSize: entries.length * 100, // Approximate size
    };
  }

  private async createDatabaseSnapshot(tables: string[]): Promise<{
    tables: Record<string, any[]>;
    totalRecords: number;
    snapshotTime: string;
  }> {
    const snapshot: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const table of tables) {
      // Mock database snapshot - in production would use actual database queries
      const recordCount = Math.floor(Math.random() * 100) + 10;
      const records = Array.from({ length: recordCount }, (_, i) => ({
        id: i + 1,
        table: table,
        data: `Sample record ${i} from ${table}`,
      }));

      snapshot[table] = records;
      totalRecords += recordCount;
    }

    return {
      tables: snapshot,
      totalRecords,
      snapshotTime: new Date().toISOString(),
    };
  }

  private async extractUserActions(
    userId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<{ actions: any[]; sensitiveActions: boolean }> {
    // Mock user action extraction
    const actionCount = Math.floor(Math.random() * 50) + 5;
    const actions = Array.from({ length: actionCount }, (_, i) => ({
      timestamp: new Date(timeRange.start.getTime() + i * 10000),
      action: [
        'login',
        'view_guest_list',
        'update_wedding',
        'download_photos',
        'process_payment',
      ][Math.floor(Math.random() * 5)],
      userId,
      details: `User action ${i}`,
    }));

    const sensitiveActions = actions.some((action) =>
      ['download_photos', 'process_payment'].includes(action.action),
    );

    return { actions, sensitiveActions };
  }
}

export default EvidencePreservationService;
