/**
 * WS-244 Real-Time Collaboration System - Document Synchronization Service
 * Team C - Y.js Integration and Document Persistence
 *
 * Handles document synchronization, persistence, snapshots, and versioning
 * for real-time collaborative editing with PostgreSQL storage.
 */

import * as Y from 'yjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Operation,
  DocumentSnapshot,
  DocumentMetadata,
  StateVector,
  SyncResult,
  DocumentType,
  CollaborationError,
  CollaborationErrorCode,
  CollaboratorInfo,
  AuditLogEntry,
  AuditAction,
} from '../../types/collaboration';
import { OperationalTransformEngine } from './operational-transform-engine';

/**
 * Configuration for document synchronization
 */
interface SyncServiceConfig {
  snapshotInterval: number; // ms between snapshots
  maxVersions: number; // max versions to keep
  operationBatchSize: number; // max operations per batch
  conflictRetentionDays: number; // days to keep conflict history
  compressionEnabled: boolean; // enable document compression
}

/**
 * Document synchronization service with PostgreSQL persistence
 */
export class DocumentSynchronizationService {
  private supabaseClient: SupabaseClient;
  private otEngine: OperationalTransformEngine;
  private snapshotTimers: Map<string, NodeJS.Timeout> = new Map();
  private syncQueue: Map<string, Operation[]> = new Map();
  private documentCache: Map<string, Y.Doc> = new Map();

  private readonly config: SyncServiceConfig = {
    snapshotInterval: 300000, // 5 minutes
    maxVersions: 50,
    operationBatchSize: 100,
    conflictRetentionDays: 30,
    compressionEnabled: true,
  };

  constructor(config?: Partial<SyncServiceConfig>) {
    this.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.otEngine = new OperationalTransformEngine();

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Synchronize document with operations and client state vector
   */
  public async syncDocument(
    documentId: string,
    operations: Operation[],
    clientVector: StateVector,
    userId: string,
  ): Promise<SyncResult> {
    try {
      const startTime = Date.now();

      // Get or create document
      const document = await this.getOrCreateDocument(documentId);

      // Get server state vector
      const serverVector = this.getStateVector(document);

      // Determine missing operations
      const missingOps = await this.getMissingOperations(
        documentId,
        clientVector,
        serverVector,
      );

      // Apply operational transform to incoming operations
      const transformedOps: Operation[] = [];
      const conflicts: any[] = [];

      for (const operation of operations) {
        try {
          // Validate operation
          await this.validateOperation(operation, userId, documentId);

          // Transform operation against server state
          const transformed = await this.otEngine.transformOperation(
            operation,
            missingOps,
            document,
          );

          // Apply to document
          await this.applyOperationToDocument(transformed, document);
          transformedOps.push(transformed);

          // Queue for batch persistence
          this.queueOperation(documentId, transformed);
        } catch (error) {
          conflicts.push({
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Persist queued operations
      await this.persistQueuedOperations(documentId);

      // Update document metadata
      await this.updateDocumentMetadata(
        documentId,
        userId,
        transformedOps.length,
      );

      // Schedule snapshot if needed
      this.scheduleSnapshot(documentId, document);

      // Log audit event
      await this.logAuditEvent({
        documentId,
        userId,
        action: AuditAction.SYNC_COMPLETED,
        details: {
          operationsApplied: transformedOps.length,
          conflicts: conflicts.length,
          syncLatency: Date.now() - startTime,
        },
      });

      const syncResult: SyncResult = {
        success: conflicts.length === 0,
        documentId,
        operationsApplied: transformedOps.length,
        conflicts,
        timestamp: new Date(),
        clientVector: this.getStateVector(document),
        serverVector: this.getStateVector(document),
      };

      return syncResult;
    } catch (error) {
      throw new CollaborationError('Document synchronization failed', {
        code: CollaborationErrorCode.SYNC_FAILED,
        documentId,
        context: error,
      });
    }
  }

  /**
   * Create document snapshot for versioning and recovery
   */
  public async createSnapshot(
    documentId: string,
    document: Y.Doc,
    userId: string,
  ): Promise<DocumentSnapshot> {
    try {
      // Get document metadata
      const metadata = await this.getDocumentMetadata(documentId);
      if (!metadata) {
        throw new Error(`Document metadata not found: ${documentId}`);
      }

      // Encode document state
      const encodedState = Y.encodeStateAsUpdate(document);

      // Compress if enabled
      const content = this.config.compressionEnabled
        ? await this.compressData(encodedState)
        : encodedState;

      const snapshot: DocumentSnapshot = {
        id: crypto.randomUUID(),
        documentId,
        version: metadata.version + 1,
        stateVector: this.getStateVector(document),
        content,
        metadata: {
          ...metadata,
          version: metadata.version + 1,
          lastModified: new Date(),
        },
        createdAt: new Date(),
        createdBy: userId,
        size: content.length,
      };

      // Persist snapshot to database
      const { error } = await this.supabaseClient
        .from('document_snapshots')
        .insert([
          {
            id: snapshot.id,
            document_id: snapshot.documentId,
            version: snapshot.version,
            state_vector: snapshot.stateVector,
            content: Array.from(snapshot.content),
            metadata: snapshot.metadata,
            created_at: snapshot.createdAt.toISOString(),
            created_by: snapshot.createdBy,
            size: snapshot.size,
          },
        ]);

      if (error) throw error;

      // Clean up old versions
      await this.cleanupOldVersions(documentId);

      // Log audit event
      await this.logAuditEvent({
        documentId,
        userId,
        action: AuditAction.DOCUMENT_MODIFIED,
        details: {
          snapshotId: snapshot.id,
          version: snapshot.version,
          size: snapshot.size,
        },
      });

      return snapshot;
    } catch (error) {
      throw new CollaborationError('Failed to create document snapshot', {
        code: CollaborationErrorCode.SYNC_FAILED,
        documentId,
        context: error,
      });
    }
  }

  /**
   * Load document from latest snapshot or create new
   */
  public async loadDocument(documentId: string): Promise<Y.Doc> {
    try {
      // Check cache first
      const cached = this.documentCache.get(documentId);
      if (cached) {
        return cached;
      }

      // Get latest snapshot
      const { data: snapshot, error } = await this.supabaseClient
        .from('document_snapshots')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const document = new Y.Doc();

      if (!error && snapshot) {
        // Restore from snapshot
        const content = this.config.compressionEnabled
          ? await this.decompressData(new Uint8Array(snapshot.content))
          : new Uint8Array(snapshot.content);

        Y.applyUpdate(document, content);

        // Apply operations after snapshot
        await this.applyOperationsAfterSnapshot(
          document,
          documentId,
          snapshot.version,
        );
      } else {
        // Create new document
        await this.initializeNewDocument(document, documentId);
      }

      // Cache document
      this.documentCache.set(documentId, document);

      return document;
    } catch (error) {
      throw new CollaborationError('Failed to load document', {
        code: CollaborationErrorCode.DOCUMENT_NOT_FOUND,
        documentId,
        context: error,
      });
    }
  }

  /**
   * Get document metadata
   */
  public async getDocumentMetadata(
    documentId: string,
  ): Promise<DocumentMetadata | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('documents')
        .select(
          `
          *,
          collaborators:document_collaborators(
            user_id,
            permissions,
            last_seen,
            is_online,
            users(name, email, avatar_url)
          )
        `,
        )
        .eq('id', documentId)
        .single();

      if (error) return null;

      return {
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        collaborators: data.collaborators.map((collab: any) => ({
          userId: collab.user_id,
          name: collab.users.name,
          email: collab.users.email,
          avatar: collab.users.avatar_url,
          permissions: collab.permissions,
          lastSeen: new Date(collab.last_seen),
          isOnline: collab.is_online,
          cursor: null, // Cursor info is ephemeral
        })) as CollaboratorInfo[],
        permissions: data.permissions,
        organizationId: data.organization_id,
        lastModified: new Date(data.last_modified),
        version: data.version,
        type: data.type as DocumentType,
      };
    } catch (error) {
      console.error('Error fetching document metadata:', error);
      return null;
    }
  }

  /**
   * Update document metadata
   */
  private async updateDocumentMetadata(
    documentId: string,
    userId: string,
    operationCount: number,
  ): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('documents')
        .update({
          last_modified: new Date().toISOString(),
          modified_by: userId,
          operation_count: operationCount,
        })
        .eq('id', documentId);

      if (error) throw error;

      // Update collaborator last seen
      await this.supabaseClient.from('document_collaborators').upsert([
        {
          document_id: documentId,
          user_id: userId,
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ]);
    } catch (error) {
      console.error('Error updating document metadata:', error);
    }
  }

  /**
   * Get or create document
   */
  private async getOrCreateDocument(documentId: string): Promise<Y.Doc> {
    let document = this.documentCache.get(documentId);

    if (!document) {
      document = await this.loadDocument(documentId);
    }

    return document;
  }

  /**
   * Get missing operations for client synchronization
   */
  private async getMissingOperations(
    documentId: string,
    clientVector: StateVector,
    serverVector: StateVector,
  ): Promise<Operation[]> {
    try {
      const missingOps: Operation[] = [];

      // Find operations that client doesn't have
      for (const [clientId, serverClock] of Object.entries(serverVector)) {
        const clientClock = clientVector[parseInt(clientId)] || 0;

        if (serverClock > clientClock) {
          // Client is missing operations from this client
          const { data, error } = await this.supabaseClient
            .from('document_operations')
            .select('*')
            .eq('document_id', documentId)
            .eq('client_id', clientId)
            .gt('clock', clientClock)
            .lte('clock', serverClock)
            .order('clock', { ascending: true });

          if (!error && data) {
            missingOps.push(...data.map(this.dbRowToOperation));
          }
        }
      }

      return missingOps;
    } catch (error) {
      console.error('Error getting missing operations:', error);
      return [];
    }
  }

  /**
   * Validate operation before applying
   */
  private async validateOperation(
    operation: Operation,
    userId: string,
    documentId: string,
  ): Promise<void> {
    // Check user permissions
    const { data: permissions, error } = await this.supabaseClient
      .from('document_collaborators')
      .select('permissions')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !permissions?.write) {
      throw new CollaborationError('User does not have write permissions', {
        code: CollaborationErrorCode.UNAUTHORIZED_DOCUMENT,
        userId,
        documentId,
      });
    }

    // Validate operation structure
    if (
      !operation.id ||
      !operation.type ||
      typeof operation.position !== 'number'
    ) {
      throw new CollaborationError('Invalid operation structure', {
        code: CollaborationErrorCode.INVALID_OPERATION,
        operationId: operation.id,
      });
    }

    // Additional validation based on operation type
    switch (operation.type) {
      case 'insert':
        if (!operation.content && operation.content !== '') {
          throw new CollaborationError('Insert operation missing content', {
            code: CollaborationErrorCode.INVALID_OPERATION,
            operationId: operation.id,
          });
        }
        break;

      case 'delete':
        if (!operation.length || operation.length <= 0) {
          throw new CollaborationError(
            'Delete operation missing valid length',
            {
              code: CollaborationErrorCode.INVALID_OPERATION,
              operationId: operation.id,
            },
          );
        }
        break;
    }
  }

  /**
   * Apply operation to Y.js document
   */
  private async applyOperationToDocument(
    operation: Operation,
    document: Y.Doc,
  ): Promise<void> {
    try {
      const text = document.getText('content');

      switch (operation.type) {
        case 'insert':
          text.insert(
            operation.position,
            operation.content,
            operation.attributes,
          );
          break;

        case 'delete':
          text.delete(operation.position, operation.length);
          break;

        case 'format':
          if (operation.attributes) {
            text.format(
              operation.position,
              operation.length,
              operation.attributes,
            );
          }
          break;

        case 'embed':
          text.insertEmbed(
            operation.position,
            operation.content,
            operation.attributes,
          );
          break;
      }
    } catch (error) {
      throw new CollaborationError('Failed to apply operation to document', {
        code: CollaborationErrorCode.INVALID_OPERATION,
        operationId: operation.id,
        context: error,
      });
    }
  }

  /**
   * Queue operation for batch persistence
   */
  private queueOperation(documentId: string, operation: Operation): void {
    if (!this.syncQueue.has(documentId)) {
      this.syncQueue.set(documentId, []);
    }

    const queue = this.syncQueue.get(documentId)!;
    queue.push(operation);

    // Trigger batch persist if queue is full
    if (queue.length >= this.config.operationBatchSize) {
      setImmediate(() => this.persistQueuedOperations(documentId));
    }
  }

  /**
   * Persist queued operations to database
   */
  private async persistQueuedOperations(documentId: string): Promise<void> {
    const queue = this.syncQueue.get(documentId);
    if (!queue || queue.length === 0) return;

    try {
      const operations = queue.splice(0); // Clear queue

      const dbRows = operations.map((op) => ({
        id: op.id,
        document_id: op.documentId,
        user_id: op.userId,
        client_id: op.clientId,
        type: op.type,
        position: op.position,
        length: op.length,
        content: op.content,
        attributes: op.attributes,
        timestamp: op.timestamp.toISOString(),
        parent_id: op.parentId,
      }));

      const { error } = await this.supabaseClient
        .from('document_operations')
        .insert(dbRows);

      if (error) throw error;
    } catch (error) {
      console.error('Error persisting operations:', error);
      // Re-queue operations on failure
      if (this.syncQueue.has(documentId)) {
        this.syncQueue.get(documentId)!.unshift(...queue);
      }
    }
  }

  /**
   * Get state vector from Y.js document
   */
  private getStateVector(document: Y.Doc): StateVector {
    const sv = Y.encodeStateVector(document);
    // Convert to object format for easier handling
    const stateVector: StateVector = {};

    // This would need proper implementation based on Y.js internals
    // For now, return a simplified version
    return stateVector;
  }

  /**
   * Schedule automatic snapshots
   */
  private scheduleSnapshot(documentId: string, document: Y.Doc): void {
    // Clear existing timer
    const existingTimer = this.snapshotTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new snapshot
    const timer = setTimeout(async () => {
      try {
        await this.createSnapshot(documentId, document, 'system');
        this.scheduleSnapshot(documentId, document); // Reschedule
      } catch (error) {
        console.error('Error creating scheduled snapshot:', error);
      }
    }, this.config.snapshotInterval);

    this.snapshotTimers.set(documentId, timer);
  }

  /**
   * Apply operations after a snapshot
   */
  private async applyOperationsAfterSnapshot(
    document: Y.Doc,
    documentId: string,
    snapshotVersion: number,
  ): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient
        .from('document_operations')
        .select('*')
        .eq('document_id', documentId)
        .gt('version', snapshotVersion)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      for (const row of data || []) {
        const operation = this.dbRowToOperation(row);
        await this.applyOperationToDocument(operation, document);
      }
    } catch (error) {
      console.error('Error applying operations after snapshot:', error);
    }
  }

  /**
   * Initialize new document
   */
  private async initializeNewDocument(
    document: Y.Doc,
    documentId: string,
  ): Promise<void> {
    // Initialize basic document structure
    const text = document.getText('content');
    text.insert(0, ''); // Empty content

    // Create document record
    const { error } = await this.supabaseClient.from('documents').insert([
      {
        id: documentId,
        title: 'New Document',
        content: '',
        version: 1,
        type: 'text',
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      },
    ]);

    if (error && error.code !== '23505') {
      // Ignore duplicate key errors
      throw error;
    }
  }

  /**
   * Convert database row to Operation
   */
  private dbRowToOperation(row: any): Operation {
    return {
      id: row.id,
      type: row.type,
      clientId: row.client_id,
      timestamp: new Date(row.timestamp),
      position: row.position,
      length: row.length,
      content: row.content,
      attributes: row.attributes,
      parentId: row.parent_id,
      userId: row.user_id,
      documentId: row.document_id,
    };
  }

  /**
   * Clean up old document versions
   */
  private async cleanupOldVersions(documentId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient
        .from('document_snapshots')
        .select('id, version')
        .eq('document_id', documentId)
        .order('version', { ascending: false })
        .limit(this.config.maxVersions + 10);

      if (error) throw error;

      if (data && data.length > this.config.maxVersions) {
        const toDelete = data.slice(this.config.maxVersions).map((s) => s.id);

        await this.supabaseClient
          .from('document_snapshots')
          .delete()
          .in('id', toDelete);
      }
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
    }
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: Uint8Array): Promise<Uint8Array> {
    // Implementation would use compression library
    return data; // Placeholder
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Uint8Array): Promise<Uint8Array> {
    // Implementation would use compression library
    return data; // Placeholder
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(entry: Partial<AuditLogEntry>): Promise<void> {
    try {
      await this.supabaseClient.from('audit_logs').insert([
        {
          id: crypto.randomUUID(),
          document_id: entry.documentId,
          user_id: entry.userId,
          action: entry.action,
          details: entry.details,
          timestamp: new Date().toISOString(),
          organization_id: entry.organizationId || 'default',
        },
      ]);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    // Clear all timers
    for (const timer of this.snapshotTimers.values()) {
      clearTimeout(timer);
    }
    this.snapshotTimers.clear();

    // Clear caches
    this.documentCache.clear();
    this.syncQueue.clear();
  }
}
