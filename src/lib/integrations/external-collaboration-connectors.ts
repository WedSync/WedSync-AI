/**
 * WS-244 Real-Time Collaboration System - External Collaboration Connectors
 * Team C - Google Docs and Office 365 Integration
 *
 * Handles bidirectional synchronization with external collaboration services
 * including Google Docs, Office 365, and other third-party platforms.
 */

import * as Y from 'yjs';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import {
  ExternalServiceConnection,
  ExternalServiceType,
  SyncMode,
  GoogleDocConnection,
  Office365Connection,
  ExternalServiceConfig,
  Operation,
  CollaborationError,
  CollaborationErrorCode,
  AuditAction,
} from '../../types/collaboration';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Rate limiting configuration for external services
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

/**
 * External service API adapters
 */
abstract class ExternalServiceAdapter {
  protected rateLimiter: Map<string, number[]> = new Map();
  protected authCredentials: any;

  constructor(protected config: RateLimitConfig) {}

  abstract connect(credentials: any): Promise<void>;
  abstract getDocument(externalId: string): Promise<any>;
  abstract updateDocument(
    externalId: string,
    operations: Operation[],
  ): Promise<void>;
  abstract subscribeToChanges(
    externalId: string,
    callback: (changes: any[]) => void,
  ): Promise<void>;
  abstract disconnect(): Promise<void>;

  protected async checkRateLimit(serviceKey: string): Promise<void> {
    const now = Date.now();
    const requests = this.rateLimiter.get(serviceKey) || [];

    // Remove requests older than 1 minute
    const recentRequests = requests.filter((time) => now - time < 60000);

    if (recentRequests.length >= this.config.requestsPerMinute) {
      const waitTime = 60000 - (now - recentRequests[0]);
      throw new CollaborationError(`Rate limit exceeded, wait ${waitTime}ms`, {
        code: CollaborationErrorCode.RATE_LIMIT_EXCEEDED,
      });
    }

    recentRequests.push(now);
    this.rateLimiter.set(serviceKey, recentRequests);
  }
}

/**
 * Google Docs API Adapter
 */
class GoogleDocsAdapter extends ExternalServiceAdapter {
  private docsApi: any;
  private driveApi: any;

  constructor() {
    super({
      requestsPerMinute: 100, // Google Docs API limits
      burstLimit: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
    });
  }

  async connect(credentials: any): Promise<void> {
    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      this.docsApi = google.docs({ version: 'v1', auth });
      this.driveApi = google.drive({ version: 'v3', auth });
      this.authCredentials = credentials;
    } catch (error) {
      throw new CollaborationError('Failed to connect to Google Docs', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async getDocument(documentId: string): Promise<any> {
    await this.checkRateLimit('google_docs');

    try {
      const response = await this.docsApi.documents.get({
        documentId,
        includeTabsContent: true,
      });

      return this.convertGoogleDocToYjs(response.data);
    } catch (error: any) {
      if (error.code === 404) {
        throw new CollaborationError('Google Doc not found', {
          code: CollaborationErrorCode.DOCUMENT_NOT_FOUND,
        });
      }
      throw new CollaborationError('Failed to get Google Doc', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async updateDocument(
    documentId: string,
    operations: Operation[],
  ): Promise<void> {
    await this.checkRateLimit('google_docs');

    try {
      const requests = operations.map((op) =>
        this.operationToGoogleDocsRequest(op),
      );

      await this.docsApi.documents.batchUpdate({
        documentId,
        resource: {
          requests,
        },
      });
    } catch (error) {
      throw new CollaborationError('Failed to update Google Doc', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async subscribeToChanges(
    documentId: string,
    callback: (changes: any[]) => void,
  ): Promise<void> {
    // Google Docs doesn't have real-time webhooks, so we use polling
    const pollInterval = 5000; // 5 seconds

    let lastRevisionId: string | null = null;

    const poll = async () => {
      try {
        const response = await this.driveApi.files.get({
          fileId: documentId,
          fields: 'modifiedTime,version',
        });

        const currentRevisionId = response.data.version;

        if (lastRevisionId && currentRevisionId !== lastRevisionId) {
          // Document was modified, fetch changes
          const changes = await this.getChangesSince(
            documentId,
            lastRevisionId,
          );
          callback(changes);
        }

        lastRevisionId = currentRevisionId;
      } catch (error) {
        console.error('Error polling Google Doc changes:', error);
      }

      setTimeout(poll, pollInterval);
    };

    poll();
  }

  async disconnect(): Promise<void> {
    // Clean up resources
    this.docsApi = null;
    this.driveApi = null;
    this.authCredentials = null;
  }

  private convertGoogleDocToYjs(googleDoc: any): string {
    // Convert Google Docs structure to plain text
    let text = '';

    if (googleDoc.body?.content) {
      for (const element of googleDoc.body.content) {
        if (element.paragraph?.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun?.content) {
              text += textElement.textRun.content;
            }
          }
        }
      }
    }

    return text;
  }

  private operationToGoogleDocsRequest(operation: Operation): any {
    switch (operation.type) {
      case 'insert':
        return {
          insertText: {
            location: { index: operation.position },
            text: operation.content,
          },
        };

      case 'delete':
        return {
          deleteContentRange: {
            range: {
              startIndex: operation.position,
              endIndex: operation.position + operation.length,
            },
          },
        };

      case 'format':
        return {
          updateTextStyle: {
            range: {
              startIndex: operation.position,
              endIndex: operation.position + operation.length,
            },
            textStyle: this.attributesToGoogleDocsStyle(
              operation.attributes || {},
            ),
            fields: Object.keys(operation.attributes || {}).join(','),
          },
        };

      default:
        throw new Error(`Unsupported operation type: ${operation.type}`);
    }
  }

  private attributesToGoogleDocsStyle(attributes: any): any {
    const style: any = {};

    if (attributes.bold) style.bold = true;
    if (attributes.italic) style.italic = true;
    if (attributes.underline) style.underline = true;
    if (attributes.color)
      style.foregroundColor = { color: { rgbColor: attributes.color } };
    if (attributes.fontSize)
      style.fontSize = { magnitude: attributes.fontSize, unit: 'PT' };

    return style;
  }

  private async getChangesSince(
    documentId: string,
    revisionId: string,
  ): Promise<any[]> {
    // This would implement change detection logic
    // For now, return empty array as placeholder
    return [];
  }
}

/**
 * Office 365 API Adapter
 */
class Office365Adapter extends ExternalServiceAdapter {
  private graphClient: Client | null = null;

  constructor() {
    super({
      requestsPerMinute: 60, // Microsoft Graph API limits
      burstLimit: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 60000,
    });
  }

  async connect(credentials: any): Promise<void> {
    try {
      this.graphClient = Client.init({
        authProvider: {
          getAccessToken: async () => credentials.accessToken,
        },
      });

      this.authCredentials = credentials;
    } catch (error) {
      throw new CollaborationError('Failed to connect to Office 365', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async getDocument(fileId: string): Promise<any> {
    await this.checkRateLimit('office365');

    if (!this.graphClient) {
      throw new Error('Office 365 client not initialized');
    }

    try {
      // Get file content from OneDrive/SharePoint
      const response = await this.graphClient
        .api(`/me/drive/items/${fileId}/content`)
        .get();

      return response; // This would need proper conversion to Y.js format
    } catch (error: any) {
      if (error.status === 404) {
        throw new CollaborationError('Office 365 file not found', {
          code: CollaborationErrorCode.DOCUMENT_NOT_FOUND,
        });
      }
      throw new CollaborationError('Failed to get Office 365 file', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async updateDocument(fileId: string, operations: Operation[]): Promise<void> {
    await this.checkRateLimit('office365');

    if (!this.graphClient) {
      throw new Error('Office 365 client not initialized');
    }

    try {
      // Convert operations to Office 365 format and apply
      const content = this.operationsToOfficeContent(operations);

      await this.graphClient
        .api(`/me/drive/items/${fileId}/content`)
        .put(content);
    } catch (error) {
      throw new CollaborationError('Failed to update Office 365 file', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        context: error,
      });
    }
  }

  async subscribeToChanges(
    fileId: string,
    callback: (changes: any[]) => void,
  ): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Office 365 client not initialized');
    }

    try {
      // Create webhook subscription
      const subscription = await this.graphClient.api('/subscriptions').post({
        changeType: 'updated',
        notificationUrl: `${process.env.WEBHOOK_BASE_URL}/office365/webhook`,
        resource: `/me/drive/items/${fileId}`,
        expirationDateTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      });

      // Store subscription for cleanup later
      console.log('Created Office 365 subscription:', subscription.id);
    } catch (error) {
      console.error('Failed to create Office 365 subscription:', error);
      // Fall back to polling
      this.startPolling(fileId, callback);
    }
  }

  async disconnect(): Promise<void> {
    this.graphClient = null;
    this.authCredentials = null;
  }

  private operationsToOfficeContent(operations: Operation[]): string {
    // Convert Y.js operations to Office document format
    // This is a simplified implementation
    return operations.map((op) => op.content).join('');
  }

  private startPolling(
    fileId: string,
    callback: (changes: any[]) => void,
  ): void {
    const pollInterval = 10000; // 10 seconds
    let lastModified: string | null = null;

    const poll = async () => {
      try {
        if (!this.graphClient) return;

        const response = await this.graphClient
          .api(`/me/drive/items/${fileId}`)
          .select('lastModifiedDateTime')
          .get();

        const currentModified = response.lastModifiedDateTime;

        if (lastModified && currentModified !== lastModified) {
          // File was modified, fetch changes
          callback([{ type: 'modified', timestamp: currentModified }]);
        }

        lastModified = currentModified;
      } catch (error) {
        console.error('Error polling Office 365 changes:', error);
      }

      setTimeout(poll, pollInterval);
    };

    poll();
  }
}

/**
 * Main External Collaboration Connectors Service
 */
export class ExternalCollaborationConnectors {
  private supabaseClient: SupabaseClient;
  private connections: Map<string, ExternalServiceConnection> = new Map();
  private adapters: Map<ExternalServiceType, ExternalServiceAdapter> =
    new Map();

  constructor() {
    this.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize adapters
    this.adapters.set(ExternalServiceType.GOOGLE_DOCS, new GoogleDocsAdapter());
    this.adapters.set(ExternalServiceType.OFFICE_365, new Office365Adapter());
  }

  /**
   * Connect to Google Docs
   */
  async connectGoogleDocs(
    documentId: string,
    googleDocId: string,
    syncMode: SyncMode = SyncMode.BIDIRECTIONAL,
  ): Promise<GoogleDocConnection> {
    try {
      // Get OAuth credentials for Google
      const { data: credentials, error } = await this.supabaseClient
        .from('external_service_credentials')
        .select('*')
        .eq('service_type', 'google_docs')
        .eq('document_id', documentId)
        .single();

      if (error || !credentials) {
        throw new CollaborationError('Google Docs credentials not found', {
          code: CollaborationErrorCode.AUTHENTICATION_FAILED,
          documentId,
        });
      }

      const adapter = this.adapters.get(ExternalServiceType.GOOGLE_DOCS)!;
      await adapter.connect(credentials);

      const connection: GoogleDocConnection = {
        id: crypto.randomUUID(),
        type: ExternalServiceType.GOOGLE_DOCS,
        documentId,
        externalId: googleDocId,
        syncMode,
        status: 'connected' as any,
        lastSync: new Date(),
        configuration: {
          syncInterval: 30000, // 30 seconds
          conflictResolutionStrategy: 'yjs_wins',
          fieldsToSync: ['content', 'title'],
          transformations: [],
        },
        googleDocId,
        drivePermissions: [],
      };

      // Store connection
      this.connections.set(connection.id, connection);
      await this.persistConnection(connection);

      // Start synchronization
      await this.startSync(connection);

      await this.logAuditEvent(
        documentId,
        'system',
        AuditAction.DOCUMENT_ACCESSED,
        {
          externalService: 'google_docs',
          externalId: googleDocId,
          syncMode,
        },
      );

      return connection;
    } catch (error) {
      throw new CollaborationError('Failed to connect to Google Docs', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        documentId,
        context: error,
      });
    }
  }

  /**
   * Connect to Office 365
   */
  async connectOffice365(
    documentId: string,
    office365FileId: string,
    permissions: any,
  ): Promise<Office365Connection> {
    try {
      // Get OAuth credentials for Office 365
      const { data: credentials, error } = await this.supabaseClient
        .from('external_service_credentials')
        .select('*')
        .eq('service_type', 'office_365')
        .eq('document_id', documentId)
        .single();

      if (error || !credentials) {
        throw new CollaborationError('Office 365 credentials not found', {
          code: CollaborationErrorCode.AUTHENTICATION_FAILED,
          documentId,
        });
      }

      const adapter = this.adapters.get(ExternalServiceType.OFFICE_365)!;
      await adapter.connect(credentials);

      const connection: Office365Connection = {
        id: crypto.randomUUID(),
        type: ExternalServiceType.OFFICE_365,
        documentId,
        externalId: office365FileId,
        syncMode: SyncMode.BIDIRECTIONAL,
        status: 'connected' as any,
        lastSync: new Date(),
        configuration: {
          syncInterval: 30000,
          conflictResolutionStrategy: 'yjs_wins',
          fieldsToSync: ['content', 'title'],
          transformations: [],
        },
        office365FileId,
        permissions,
      };

      this.connections.set(connection.id, connection);
      await this.persistConnection(connection);

      await this.startSync(connection);

      await this.logAuditEvent(
        documentId,
        'system',
        AuditAction.DOCUMENT_ACCESSED,
        {
          externalService: 'office_365',
          externalId: office365FileId,
        },
      );

      return connection;
    } catch (error) {
      throw new CollaborationError('Failed to connect to Office 365', {
        code: CollaborationErrorCode.EXTERNAL_SERVICE_ERROR,
        documentId,
        context: error,
      });
    }
  }

  /**
   * Disconnect from external service
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const adapter = this.adapters.get(connection.type);
      if (adapter) {
        await adapter.disconnect();
      }

      // Update status
      connection.status = 'disconnected' as any;
      await this.persistConnection(connection);

      this.connections.delete(connectionId);
    } catch (error) {
      console.error('Error disconnecting from external service:', error);
    }
  }

  /**
   * Sync document with external service
   */
  async syncDocument(
    connectionId: string,
    operations: Operation[],
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const adapter = this.adapters.get(connection.type);
    if (!adapter) {
      throw new Error(`Adapter not found for: ${connection.type}`);
    }

    try {
      await adapter.updateDocument(connection.externalId, operations);
      connection.lastSync = new Date();
      await this.persistConnection(connection);
    } catch (error) {
      throw new CollaborationError('Failed to sync with external service', {
        code: CollaborationErrorCode.SYNC_FAILED,
        context: error,
      });
    }
  }

  /**
   * Start bidirectional synchronization
   */
  private async startSync(
    connection: ExternalServiceConnection,
  ): Promise<void> {
    const adapter = this.adapters.get(connection.type);
    if (!adapter) return;

    // Subscribe to external changes
    await adapter.subscribeToChanges(connection.externalId, async (changes) => {
      try {
        // Convert external changes to Y.js operations
        const operations = await this.convertExternalChangesToOperations(
          changes,
          connection,
        );

        // Apply to local document
        await this.applyExternalOperations(connection.documentId, operations);
      } catch (error) {
        console.error('Error processing external changes:', error);
      }
    });
  }

  /**
   * Convert external service changes to Y.js operations
   */
  private async convertExternalChangesToOperations(
    changes: any[],
    connection: ExternalServiceConnection,
  ): Promise<Operation[]> {
    const operations: Operation[] = [];

    for (const change of changes) {
      const operation: Operation = {
        id: crypto.randomUUID(),
        type: change.type || 'insert',
        clientId: 0, // External client
        timestamp: new Date(),
        position: change.position || 0,
        length: change.length || 0,
        content: change.content,
        attributes: change.attributes,
        userId: 'external',
        documentId: connection.documentId,
      };

      operations.push(operation);
    }

    return operations;
  }

  /**
   * Apply external operations to local document
   */
  private async applyExternalOperations(
    documentId: string,
    operations: Operation[],
  ): Promise<void> {
    // This would integrate with the document sync service
    console.log(
      `Applying ${operations.length} external operations to document ${documentId}`,
    );
  }

  /**
   * Persist connection to database
   */
  private async persistConnection(
    connection: ExternalServiceConnection,
  ): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('external_service_connections')
        .upsert([
          {
            id: connection.id,
            document_id: connection.documentId,
            service_type: connection.type,
            external_id: connection.externalId,
            sync_mode: connection.syncMode,
            status: connection.status,
            last_sync: connection.lastSync.toISOString(),
            configuration: connection.configuration,
          },
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error persisting connection:', error);
    }
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(
    documentId: string,
    userId: string,
    action: AuditAction,
    details: any,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('audit_logs').insert([
        {
          id: crypto.randomUUID(),
          document_id: documentId,
          user_id: userId,
          action,
          details,
          timestamp: new Date().toISOString(),
          organization_id: 'default',
        },
      ]);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Get all connections for a document
   */
  async getConnections(
    documentId: string,
  ): Promise<ExternalServiceConnection[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('external_service_connections')
        .select('*')
        .eq('document_id', documentId)
        .eq('status', 'connected');

      if (error) throw error;

      return (
        data?.map((row) => ({
          id: row.id,
          type: row.service_type,
          documentId: row.document_id,
          externalId: row.external_id,
          syncMode: row.sync_mode,
          status: row.status,
          lastSync: new Date(row.last_sync),
          configuration: row.configuration,
        })) || []
      );
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  /**
   * Health check for all external services
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const health: { [key: string]: boolean } = {};

    for (const [type, adapter] of this.adapters) {
      try {
        // This would implement actual health check logic
        health[type] = true;
      } catch (error) {
        health[type] = false;
      }
    }

    return health;
  }
}
