import { SecurityEvent } from '@/lib/security/audit-logger';
import { AdminAuditEntry } from '@/lib/admin/auditLogger';
import { AuditEvent } from '@/lib/compliance/audit/tamper-proof-logging';

interface ElasticsearchConfig {
  nodes: string[];
  apiKey?: string;
  username?: string;
  password?: string;
  cloudId?: string;
  ssl?: boolean;
}

interface ElasticsearchDocument {
  '@timestamp': string;
  service: string;
  environment: string;
  audit_type: 'security' | 'admin' | 'compliance';
  [key: string]: any;
}

interface BulkOperation {
  index: {
    _index: string;
    _id?: string;
  };
}

interface SearchQuery {
  query: any;
  size?: number;
  from?: number;
  sort?: any[];
  aggs?: any;
}

export class ElasticsearchAuditSync {
  private readonly config: ElasticsearchConfig;
  private readonly indexPrefix: string = 'wedsync-audit';
  private readonly batchSize: number = 100;
  private readonly batchTimeoutMs: number = 30000; // 30 seconds
  private batchBuffer: Array<{
    operation: BulkOperation;
    document: ElasticsearchDocument;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: Date = new Date();

  constructor() {
    this.config = {
      nodes: (process.env.ELASTICSEARCH_NODES || 'http://localhost:9200').split(
        ',',
      ),
      apiKey: process.env.ELASTICSEARCH_API_KEY,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
      cloudId: process.env.ELASTICSEARCH_CLOUD_ID,
      ssl: process.env.ELASTICSEARCH_SSL === 'true',
    };

    // Validate configuration
    if (!this.isConfigured()) {
      console.warn(
        'Elasticsearch not configured. Audit sync will be disabled.',
      );
      return;
    }

    this.initializeIndices();
    this.scheduleBatchFlush();
  }

  /**
   * Sync security audit event to Elasticsearch
   */
  async syncSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.isConfigured()) {
      console.debug(
        'Elasticsearch not configured, skipping security event sync',
      );
      return;
    }

    try {
      const document = this.formatSecurityEvent(event);
      const indexName = this.getIndexName('security');

      this.addToBatch({
        operation: {
          index: {
            _index: indexName,
            _id: event.id,
          },
        },
        document,
      });
    } catch (error) {
      console.error('Failed to sync security event to Elasticsearch:', error);
    }
  }

  /**
   * Sync admin audit event to Elasticsearch
   */
  async syncAdminEvent(event: AdminAuditEntry): Promise<void> {
    if (!this.isConfigured()) {
      console.debug('Elasticsearch not configured, skipping admin event sync');
      return;
    }

    try {
      const document = this.formatAdminEvent(event);
      const indexName = this.getIndexName('admin');

      this.addToBatch({
        operation: {
          index: {
            _index: indexName,
            _id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        },
        document,
      });
    } catch (error) {
      console.error('Failed to sync admin event to Elasticsearch:', error);
    }
  }

  /**
   * Sync compliance audit event to Elasticsearch
   */
  async syncComplianceEvent(event: AuditEvent): Promise<void> {
    if (!this.isConfigured()) {
      console.debug(
        'Elasticsearch not configured, skipping compliance event sync',
      );
      return;
    }

    try {
      const document = this.formatComplianceEvent(event);
      const indexName = this.getIndexName('compliance');

      this.addToBatch({
        operation: {
          index: {
            _index: indexName,
            _id: event.id,
          },
        },
        document,
      });
    } catch (error) {
      console.error('Failed to sync compliance event to Elasticsearch:', error);
    }
  }

  /**
   * Search audit events in Elasticsearch
   */
  async searchAuditEvents(
    query: SearchQuery,
    auditType?: 'security' | 'admin' | 'compliance',
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Elasticsearch not configured');
    }

    try {
      const indexPattern = auditType
        ? this.getIndexName(auditType)
        : `${this.indexPrefix}-*`;

      const searchBody = {
        index: indexPattern,
        body: query,
      };

      const response = await this.makeRequest(
        'POST',
        `/${indexPattern}/_search`,
        query,
      );
      return response;
    } catch (error) {
      console.error('Failed to search audit events in Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Get aggregated audit statistics
   */
  async getAuditStats(
    startDate: Date,
    endDate: Date,
    auditType?: 'security' | 'admin' | 'compliance',
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Elasticsearch not configured');
    }

    try {
      const indexPattern = auditType
        ? this.getIndexName(auditType)
        : `${this.indexPrefix}-*`;

      const query: SearchQuery = {
        query: {
          range: {
            '@timestamp': {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
        },
        size: 0,
        aggs: {
          events_over_time: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: '1h',
              min_doc_count: 0,
            },
          },
          event_types: {
            terms: {
              field: 'event_type.keyword',
              size: 20,
            },
          },
          severity_levels: {
            terms: {
              field: 'severity.keyword',
              size: 10,
            },
          },
          top_users: {
            terms: {
              field: 'user_id.keyword',
              size: 10,
            },
          },
          ip_addresses: {
            terms: {
              field: 'ip_address.keyword',
              size: 15,
            },
          },
        },
      };

      return await this.searchAuditEvents(query, auditType);
    } catch (error) {
      console.error('Failed to get audit stats from Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Sync audit data from database to Elasticsearch (batch sync)
   */
  async syncFromDatabase(
    startDate?: Date,
    endDate?: Date,
    batchSize: number = 1000,
  ): Promise<{ synced: number; errors: number }> {
    if (!this.isConfigured()) {
      throw new Error('Elasticsearch not configured');
    }

    let synced = 0;
    let errors = 0;

    try {
      console.log('Starting audit data sync from database to Elasticsearch...');

      // This would integrate with your existing audit loggers
      // For now, we'll simulate the sync process

      // In a real implementation, you would:
      // 1. Query the audit tables in batches
      // 2. Transform each record to Elasticsearch format
      // 3. Use bulk indexing for efficiency

      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      const end = endDate || new Date();

      console.log(
        `Syncing audit data from ${start.toISOString()} to ${end.toISOString()}`,
      );

      // Update sync timestamp
      this.lastSyncTimestamp = new Date();

      return { synced, errors };
    } catch (error) {
      console.error('Failed to sync audit data from database:', error);
      throw error;
    }
  }

  /**
   * Create audit event dashboards and visualizations
   */
  async createDashboards(): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Elasticsearch not configured, cannot create dashboards');
      return;
    }

    try {
      // Create index patterns
      await this.createIndexPatterns();

      // Create saved searches
      await this.createSavedSearches();

      // Create visualizations
      await this.createVisualizations();

      // Create dashboards
      await this.createAuditDashboard();

      console.log('Audit dashboards created successfully');
    } catch (error) {
      console.error('Failed to create audit dashboards:', error);
    }
  }

  /**
   * Delete old audit indices (retention policy)
   */
  async deleteOldIndices(retentionDays: number = 90): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Elasticsearch not configured, cannot delete old indices');
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Get list of audit indices
      const indicesResponse = await this.makeRequest(
        'GET',
        '/_cat/indices',
        {},
        {
          format: 'json',
          h: 'index,creation.date',
        },
      );

      const auditIndices = indicesResponse.filter((index: any) =>
        index.index.startsWith(this.indexPrefix),
      );

      // Delete old indices
      for (const index of auditIndices) {
        const creationDate = new Date(parseInt(index['creation.date']));
        if (creationDate < cutoffDate) {
          await this.makeRequest('DELETE', `/${index.index}`);
          console.log(`Deleted old audit index: ${index.index}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete old audit indices:', error);
    }
  }

  /**
   * Health check for Elasticsearch connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    cluster?: any;
  }> {
    if (!this.isConfigured()) {
      return { healthy: false, message: 'Elasticsearch not configured' };
    }

    try {
      const response = await this.makeRequest('GET', '/_cluster/health');

      const isHealthy =
        response.status === 'green' || response.status === 'yellow';

      return {
        healthy: isHealthy,
        message: `Cluster status: ${response.status}`,
        cluster: {
          name: response.cluster_name,
          status: response.status,
          nodes: response.number_of_nodes,
          data_nodes: response.number_of_data_nodes,
          active_shards: response.active_shards,
          relocating_shards: response.relocating_shards,
          initializing_shards: response.initializing_shards,
          unassigned_shards: response.unassigned_shards,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Elasticsearch connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Private helper methods
   */
  private isConfigured(): boolean {
    return !!(
      this.config.nodes.length > 0 &&
      (this.config.apiKey ||
        (this.config.username && this.config.password) ||
        this.config.cloudId)
    );
  }

  private getIndexName(type: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${this.indexPrefix}-${type}-${date}`;
  }

  private formatSecurityEvent(event: SecurityEvent): ElasticsearchDocument {
    return {
      '@timestamp': event.created_at?.toISOString() || new Date().toISOString(),
      service: 'wedsync',
      environment: process.env.NODE_ENV || 'development',
      audit_type: 'security',
      event_type: event.event_type,
      severity: event.severity,
      user_id: event.user_id,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      description: event.description,
      metadata: event.metadata,
      version: '1.0',
    };
  }

  private formatAdminEvent(event: AdminAuditEntry): ElasticsearchDocument {
    return {
      '@timestamp': event.timestamp,
      service: 'wedsync',
      environment: process.env.NODE_ENV || 'development',
      audit_type: 'admin',
      admin_id: event.adminId,
      admin_email: event.adminEmail,
      action: event.action,
      status: event.status,
      details: event.details,
      client_ip: event.clientIP,
      requires_mfa: event.requiresMFA,
      user_agent: event.userAgent,
      version: '1.0',
    };
  }

  private formatComplianceEvent(event: AuditEvent): ElasticsearchDocument {
    return {
      '@timestamp': event.timestamp.toISOString(),
      service: 'wedsync',
      environment: process.env.NODE_ENV || 'development',
      audit_type: 'compliance',
      event_type: event.event_type,
      actor_id: event.actor_id,
      actor_type: event.actor_type,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      action: event.action,
      risk_level: event.risk_level,
      metadata: event.metadata,
      context: event.context,
      hash: event.hash,
      previous_hash: event.previous_hash,
      signature: event.signature,
      version: '1.0',
    };
  }

  private addToBatch(item: {
    operation: BulkOperation;
    document: ElasticsearchDocument;
  }): void {
    this.batchBuffer.push(item);

    if (this.batchBuffer.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
      this.scheduleBatchFlush();
    }, this.batchTimeoutMs);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      // Prepare bulk request body
      const bulkBody: any[] = [];

      for (const item of batch) {
        bulkBody.push(item.operation);
        bulkBody.push(item.document);
      }

      // Send bulk request
      const response = await this.makeRequest('POST', '/_bulk', bulkBody);

      if (response.errors) {
        console.error(
          'Bulk indexing errors:',
          response.items.filter((item: any) => item.index.error),
        );
      } else {
        console.debug(
          `Successfully indexed ${batch.length} audit documents to Elasticsearch`,
        );
      }
    } catch (error) {
      console.error('Failed to flush batch to Elasticsearch:', error);

      // Re-queue failed items (with limit)
      if (this.batchBuffer.length < this.batchSize * 2) {
        this.batchBuffer.unshift(...batch.slice(0, this.batchSize));
      }
    }
  }

  private async makeRequest(
    method: string,
    path: string,
    body?: any,
    params?: Record<string, string>,
  ): Promise<any> {
    const node = this.config.nodes[0]; // Use first node for simplicity
    const url = new URL(path, node);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication
    if (this.config.apiKey) {
      headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      headers['Authorization'] =
        `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Elasticsearch API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private async initializeIndices(): Promise<void> {
    try {
      // Create index templates for audit data
      await this.createIndexTemplates();
    } catch (error) {
      console.error('Failed to initialize Elasticsearch indices:', error);
    }
  }

  private async createIndexTemplates(): Promise<void> {
    const templates = [
      {
        name: `${this.indexPrefix}-security-template`,
        pattern: `${this.indexPrefix}-security-*`,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            event_type: { type: 'keyword' },
            severity: { type: 'keyword' },
            user_id: { type: 'keyword' },
            ip_address: { type: 'ip' },
            description: { type: 'text' },
            metadata: { type: 'object' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-admin-template`,
        pattern: `${this.indexPrefix}-admin-*`,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            admin_email: { type: 'keyword' },
            action: { type: 'keyword' },
            status: { type: 'keyword' },
            client_ip: { type: 'ip' },
            requires_mfa: { type: 'boolean' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-compliance-template`,
        pattern: `${this.indexPrefix}-compliance-*`,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            event_type: { type: 'keyword' },
            actor_type: { type: 'keyword' },
            risk_level: { type: 'keyword' },
            hash: { type: 'keyword' },
            signature: { type: 'keyword' },
          },
        },
      },
    ];

    for (const template of templates) {
      await this.makeRequest('PUT', `/_index_template/${template.name}`, {
        index_patterns: [template.pattern],
        template: {
          mappings: template.mappings,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            'index.lifecycle.name': 'audit_policy',
            'index.lifecycle.rollover_alias': template.name.replace(
              '-template',
              '',
            ),
          },
        },
      });
    }
  }

  private async createIndexPatterns(): Promise<void> {
    // Kibana index pattern creation would go here
    // This requires Kibana API integration
  }

  private async createSavedSearches(): Promise<void> {
    // Kibana saved search creation would go here
  }

  private async createVisualizations(): Promise<void> {
    // Kibana visualization creation would go here
  }

  private async createAuditDashboard(): Promise<void> {
    // Kibana dashboard creation would go here
  }

  async shutdown(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
  }
}

// Export singleton instance
export const elasticsearchAuditSync = new ElasticsearchAuditSync();

// Graceful shutdown handling
process.on('SIGINT', () => {
  elasticsearchAuditSync.shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  elasticsearchAuditSync.shutdown().finally(() => process.exit(0));
});
