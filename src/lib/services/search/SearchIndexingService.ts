/**
 * WS-248: Advanced Search System - Search Indexing Service
 *
 * SearchIndexingService: Elasticsearch integration for vendor data indexing,
 * bulk operations, real-time updates, and search performance optimization.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface IndexOperation {
  id: string;
  operation: string;
  entityType: string;
  entityIds?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress?: {
    processed: number;
    total: number;
    percentage: number;
  };
  error?: string;
  metadata?: {
    batchSize: number;
    async: boolean;
    includeRelations: boolean;
  };
}

interface IndexStats {
  indexName: string;
  documentCount: number;
  indexSize: string;
  lastUpdated: string;
  health: 'green' | 'yellow' | 'red';
  settings: {
    shards: number;
    replicas: number;
    refreshInterval: string;
  };
  mappings: {
    totalFields: number;
    dynamicMapping: boolean;
  };
}

interface BulkOperationResult {
  processed: number;
  failed: number;
  operations: IndexOperation[];
  errors: Array<{
    operation: any;
    error: string;
  }>;
}

interface IndexContext {
  userId: string;
  requestId: string;
}

interface WebhookUpdatePayload {
  eventType: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId: string;
  data?: any;
}

// =====================================================================================
// SEARCH INDEXING SERVICE
// =====================================================================================

export class SearchIndexingService {
  private supabase: any;
  private indexMappings: Record<string, any>;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.indexMappings = this.getIndexMappings();
  }

  // =====================================================================================
  // MAIN INDEX OPERATIONS
  // =====================================================================================

  async executeOperation(
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation | null> {
    try {
      const operationId = this.generateOperationId();

      // Create operation record
      const operation: IndexOperation = {
        id: operationId,
        operation: params.operation,
        entityType: params.entityType,
        entityIds: params.entityIds,
        status: 'pending',
        startedAt: new Date().toISOString(),
        metadata: params.options || {},
      };

      // Save operation to database
      await this.saveOperation(operation, context);

      // Execute based on operation type
      switch (params.operation) {
        case 'create':
          return await this.handleCreateOperation(operation, params, context);

        case 'update':
          return await this.handleUpdateOperation(operation, params, context);

        case 'delete':
          return await this.handleDeleteOperation(operation, params, context);

        case 'bulk_index':
          return await this.handleBulkIndexOperation(
            operation,
            params,
            context,
          );

        case 'reindex':
          return await this.handleReindexOperation(operation, params, context);

        case 'optimize':
          return await this.handleOptimizeOperation(operation, params, context);

        default:
          throw new Error(`Unsupported operation: ${params.operation}`);
      }
    } catch (error) {
      console.error('Index operation execution error:', error);
      return null;
    }
  }

  // =====================================================================================
  // BULK OPERATIONS
  // =====================================================================================

  async executeBulkOperations(
    operations: any[],
    context: IndexContext,
  ): Promise<IndexOperation[]> {
    const results: IndexOperation[] = [];
    const batchSize = 50; // Process in batches to avoid memory issues

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (op, index) => {
          try {
            const operationId = this.generateOperationId();
            const operation: IndexOperation = {
              id: operationId,
              operation: `bulk_${op.action}`,
              entityType: op.entityType,
              entityIds: [op.entityId],
              status: 'processing',
              startedAt: new Date().toISOString(),
              metadata: {
                batchSize: batch.length,
                async: true,
                includeRelations: true,
              },
            };

            // Execute individual operation
            const result = await this.executeSingleBulkOperation(
              op,
              operation,
              context,
            );
            return result;
          } catch (error) {
            console.error(`Bulk operation ${i + index} failed:`, error);
            return {
              id: `failed_${i + index}`,
              operation: `bulk_${op.action}`,
              entityType: op.entityType,
              entityIds: [op.entityId],
              status: 'failed' as const,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              error: error.message,
            };
          }
        }),
      );

      results.push(...batchResults);
    }

    return results;
  }

  // =====================================================================================
  // INDIVIDUAL OPERATION HANDLERS
  // =====================================================================================

  private async handleCreateOperation(
    operation: IndexOperation,
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation> {
    operation.status = 'processing';
    await this.updateOperation(operation);

    try {
      if (params.entityIds && params.entityIds.length > 0) {
        // Index specific entities
        const results = await this.indexEntities(
          params.entityType,
          params.entityIds,
          params.options,
        );

        operation.progress = {
          processed: results.processed,
          total: params.entityIds.length,
          percentage: (results.processed / params.entityIds.length) * 100,
        };
      } else {
        // Index all entities of this type
        const allEntities = await this.getAllEntityIds(params.entityType);
        const results = await this.indexEntities(
          params.entityType,
          allEntities,
          params.options,
        );

        operation.progress = {
          processed: results.processed,
          total: allEntities.length,
          percentage: (results.processed / allEntities.length) * 100,
        };
      }

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      console.error('Create operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    await this.updateOperation(operation);
    return operation;
  }

  private async handleUpdateOperation(
    operation: IndexOperation,
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation> {
    operation.status = 'processing';
    await this.updateOperation(operation);

    try {
      const results = await this.updateIndexedEntities(
        params.entityType,
        params.entityIds || [],
        params.options,
      );

      operation.progress = {
        processed: results.processed,
        total: params.entityIds?.length || 0,
        percentage: params.entityIds?.length
          ? (results.processed / params.entityIds.length) * 100
          : 100,
      };

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      console.error('Update operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    await this.updateOperation(operation);
    return operation;
  }

  private async handleDeleteOperation(
    operation: IndexOperation,
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation> {
    operation.status = 'processing';
    await this.updateOperation(operation);

    try {
      const results = await this.deleteIndexedEntities(
        params.entityType,
        params.entityIds || [],
      );

      operation.progress = {
        processed: results.processed,
        total: params.entityIds?.length || 0,
        percentage: params.entityIds?.length
          ? (results.processed / params.entityIds.length) * 100
          : 100,
      };

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      console.error('Delete operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    await this.updateOperation(operation);
    return operation;
  }

  private async handleReindexOperation(
    operation: IndexOperation,
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation> {
    operation.status = 'processing';
    await this.updateOperation(operation);

    try {
      // Get all entities for reindexing
      const allEntities = await this.getAllEntityIds(params.entityType);

      // Delete existing index
      await this.deleteIndex(params.entityType);

      // Recreate index with proper mappings
      await this.createIndex(params.entityType);

      // Reindex all entities
      const results = await this.indexEntities(
        params.entityType,
        allEntities,
        params.options,
      );

      operation.progress = {
        processed: results.processed,
        total: allEntities.length,
        percentage: (results.processed / allEntities.length) * 100,
      };

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      console.error('Reindex operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    await this.updateOperation(operation);
    return operation;
  }

  private async handleOptimizeOperation(
    operation: IndexOperation,
    params: any,
    context: IndexContext,
  ): Promise<IndexOperation> {
    operation.status = 'processing';
    await this.updateOperation(operation);

    try {
      await this.optimizeIndices();

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      console.error('Optimize operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    await this.updateOperation(operation);
    return operation;
  }

  // =====================================================================================
  // INDEXING CORE FUNCTIONS
  // =====================================================================================

  private async indexEntities(
    entityType: string,
    entityIds: string[],
    options?: any,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    const batchSize = options?.batchSize || 100;

    for (let i = 0; i < entityIds.length; i += batchSize) {
      const batch = entityIds.slice(i, i + batchSize);

      try {
        // Get entity data
        const entities = await this.getEntityData(entityType, batch, options);

        // Transform for indexing
        const documents = entities.map((entity) =>
          this.transformEntityForIndex(entity, entityType),
        );

        // Index documents (simulate Elasticsearch bulk indexing)
        await this.bulkIndexDocuments(entityType, documents);

        processed += batch.length;
      } catch (error) {
        console.error(`Batch indexing error for ${entityType}:`, error);
        failed += batch.length;
      }
    }

    return { processed, failed };
  }

  private async updateIndexedEntities(
    entityType: string,
    entityIds: string[],
    options?: any,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const entityId of entityIds) {
      try {
        // Get updated entity data
        const entities = await this.getEntityData(
          entityType,
          [entityId],
          options,
        );

        if (entities.length > 0) {
          const document = this.transformEntityForIndex(
            entities[0],
            entityType,
          );
          await this.updateIndexedDocument(entityType, entityId, document);
          processed++;
        }
      } catch (error) {
        console.error(
          `Update indexing error for ${entityType} ${entityId}:`,
          error,
        );
        failed++;
      }
    }

    return { processed, failed };
  }

  private async deleteIndexedEntities(
    entityType: string,
    entityIds: string[],
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const entityId of entityIds) {
      try {
        await this.deleteIndexedDocument(entityType, entityId);
        processed++;
      } catch (error) {
        console.error(
          `Delete indexing error for ${entityType} ${entityId}:`,
          error,
        );
        failed++;
      }
    }

    return { processed, failed };
  }

  // =====================================================================================
  // ENTITY DATA RETRIEVAL
  // =====================================================================================

  private async getEntityData(
    entityType: string,
    entityIds: string[],
    options?: any,
  ): Promise<any[]> {
    const queries = {
      supplier: () =>
        this.supabase
          .from('suppliers')
          .select(this.getSupplierSelectFields(options?.includeRelations))
          .in('id', entityIds)
          .eq('status', 'active'),

      venue: () =>
        this.supabase
          .from('venues')
          .select(this.getVenueSelectFields(options?.includeRelations))
          .in('id', entityIds)
          .eq('status', 'active'),

      service: () =>
        this.supabase
          .from('supplier_services')
          .select(this.getServiceSelectFields(options?.includeRelations))
          .in('id', entityIds),

      portfolio: () =>
        this.supabase
          .from('supplier_portfolios')
          .select(this.getPortfolioSelectFields(options?.includeRelations))
          .in('id', entityIds),

      review: () =>
        this.supabase
          .from('supplier_reviews')
          .select(this.getReviewSelectFields(options?.includeRelations))
          .in('id', entityIds),
    };

    const query = queries[entityType];
    if (!query) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    const { data, error } = await query();

    if (error) {
      throw new Error(`Failed to get ${entityType} data: ${error.message}`);
    }

    return data || [];
  }

  private async getAllEntityIds(entityType: string): Promise<string[]> {
    const tables = {
      supplier: 'suppliers',
      venue: 'venues',
      service: 'supplier_services',
      portfolio: 'supplier_portfolios',
      review: 'supplier_reviews',
    };

    const tableName = tables[entityType];
    if (!tableName) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    let query = this.supabase.from(tableName).select('id');

    // Add status filter for entities that have status
    if (['supplier', 'venue'].includes(entityType)) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get ${entityType} IDs: ${error.message}`);
    }

    return data?.map((item: any) => item.id) || [];
  }

  // =====================================================================================
  // INDEX MANAGEMENT
  // =====================================================================================

  private async createIndex(entityType: string): Promise<void> {
    // In a real implementation, this would create an Elasticsearch index
    // For now, we'll simulate by ensuring proper database indexes exist

    try {
      await this.supabase.rpc('ensure_search_indexes', {
        entity_type: entityType,
      });

      console.log(`Search index ensured for ${entityType}`);
    } catch (error) {
      console.error(`Failed to create search index for ${entityType}:`, error);
    }
  }

  private async deleteIndex(entityType: string): Promise<void> {
    // In production, this would delete the Elasticsearch index
    console.log(`Simulating index deletion for ${entityType}`);
  }

  async optimizeIndices(): Promise<void> {
    try {
      // Optimize database indexes and refresh materialized views
      await this.supabase.rpc('optimize_search_indexes');
      await this.supabase.rpc('refresh_search_materialized_views');

      console.log('Search indices optimized successfully');
    } catch (error) {
      console.error('Index optimization error:', error);
      throw error;
    }
  }

  // =====================================================================================
  // DOCUMENT OPERATIONS
  // =====================================================================================

  private async bulkIndexDocuments(
    entityType: string,
    documents: any[],
  ): Promise<void> {
    // In production, this would be an Elasticsearch bulk operation
    // For now, we'll update the search vectors in PostgreSQL

    try {
      for (const doc of documents) {
        await this.supabase.rpc('update_search_vector', {
          entity_type: entityType,
          entity_id: doc.id,
          search_data: doc,
        });
      }
    } catch (error) {
      console.error('Bulk index documents error:', error);
      throw error;
    }
  }

  private async updateIndexedDocument(
    entityType: string,
    entityId: string,
    document: any,
  ): Promise<void> {
    try {
      await this.supabase.rpc('update_search_vector', {
        entity_type: entityType,
        entity_id: entityId,
        search_data: document,
      });
    } catch (error) {
      console.error('Update indexed document error:', error);
      throw error;
    }
  }

  private async deleteIndexedDocument(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    try {
      await this.supabase.rpc('delete_search_vector', {
        entity_type: entityType,
        entity_id: entityId,
      });
    } catch (error) {
      console.error('Delete indexed document error:', error);
      throw error;
    }
  }

  // =====================================================================================
  // DOCUMENT TRANSFORMATION
  // =====================================================================================

  private transformEntityForIndex(entity: any, entityType: string): any {
    const transformers = {
      supplier: this.transformSupplierForIndex.bind(this),
      venue: this.transformVenueForIndex.bind(this),
      service: this.transformServiceForIndex.bind(this),
      portfolio: this.transformPortfolioForIndex.bind(this),
      review: this.transformReviewForIndex.bind(this),
    };

    const transformer = transformers[entityType];
    if (!transformer) {
      throw new Error(`No transformer found for entity type: ${entityType}`);
    }

    return transformer(entity);
  }

  private transformSupplierForIndex(supplier: any): any {
    return {
      id: supplier.id,
      type: 'supplier',
      business_name: supplier.business_name,
      description: supplier.description,
      supplier_type: supplier.supplier_type,
      verified: supplier.verified,
      average_rating: supplier.average_rating,
      review_count: supplier.review_count,
      location: {
        city: supplier.city,
        state: supplier.state,
        latitude: supplier.latitude,
        longitude: supplier.longitude,
        address: `${supplier.city}, ${supplier.state}`,
      },
      contact: {
        email: supplier.contact_email,
        phone: supplier.contact_phone,
        website: supplier.website,
      },
      services: supplier.supplier_services || [],
      tags: supplier.tags || [],
      portfolio_images: supplier.portfolio_images || [],
      search_text: this.generateSearchText(supplier),
      indexed_at: new Date().toISOString(),
    };
  }

  private transformVenueForIndex(venue: any): any {
    return {
      id: venue.id,
      type: 'venue',
      name: venue.name,
      description: venue.description,
      venue_type: venue.venue_type,
      capacity: venue.capacity,
      location: {
        city: venue.city,
        state: venue.state,
        latitude: venue.latitude,
        longitude: venue.longitude,
        address: venue.address,
      },
      amenities: venue.amenities || [],
      pricing: venue.pricing || {},
      availability: venue.availability || {},
      search_text: this.generateSearchText(venue),
      indexed_at: new Date().toISOString(),
    };
  }

  private transformServiceForIndex(service: any): any {
    return {
      id: service.id,
      type: 'service',
      service_name: service.service_name,
      description: service.description,
      category: service.category,
      supplier_id: service.supplier_id,
      price_min: service.price_min,
      price_max: service.price_max,
      currency: service.currency,
      search_text: this.generateSearchText(service),
      indexed_at: new Date().toISOString(),
    };
  }

  private transformPortfolioForIndex(portfolio: any): any {
    return {
      id: portfolio.id,
      type: 'portfolio',
      supplier_id: portfolio.supplier_id,
      title: portfolio.title,
      description: portfolio.description,
      category: portfolio.category,
      tags: portfolio.tags || [],
      image_url: portfolio.image_url,
      search_text: this.generateSearchText(portfolio),
      indexed_at: new Date().toISOString(),
    };
  }

  private transformReviewForIndex(review: any): any {
    return {
      id: review.id,
      type: 'review',
      supplier_id: review.supplier_id,
      rating: review.rating,
      review_text: review.review_text,
      reviewer_name: review.reviewer_name,
      search_text: this.generateSearchText(review),
      indexed_at: new Date().toISOString(),
    };
  }

  // =====================================================================================
  // WEBHOOK HANDLING
  // =====================================================================================

  async handleWebhookUpdate(
    payload: WebhookUpdatePayload,
  ): Promise<IndexOperation> {
    try {
      const operationId = this.generateOperationId();
      const operation: IndexOperation = {
        id: operationId,
        operation: `webhook_${payload.eventType}`,
        entityType: payload.entityType,
        entityIds: [payload.entityId],
        status: 'processing',
        startedAt: new Date().toISOString(),
        metadata: {
          batchSize: 1,
          async: false,
          includeRelations: true,
        },
      };

      switch (payload.eventType) {
        case 'created':
        case 'updated':
          await this.handleWebhookUpsert(payload);
          break;

        case 'deleted':
          await this.handleWebhookDelete(payload);
          break;
      }

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
      operation.progress = {
        processed: 1,
        total: 1,
        percentage: 100,
      };

      return operation;
    } catch (error) {
      console.error('Webhook update error:', error);
      return {
        id: this.generateOperationId(),
        operation: `webhook_${payload.eventType}`,
        entityType: payload.entityType,
        entityIds: [payload.entityId],
        status: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async handleWebhookUpsert(
    payload: WebhookUpdatePayload,
  ): Promise<void> {
    const entities = await this.getEntityData(
      payload.entityType,
      [payload.entityId],
      { includeRelations: true },
    );

    if (entities.length > 0) {
      const document = this.transformEntityForIndex(
        entities[0],
        payload.entityType,
      );
      await this.updateIndexedDocument(
        payload.entityType,
        payload.entityId,
        document,
      );
    }
  }

  private async handleWebhookDelete(
    payload: WebhookUpdatePayload,
  ): Promise<void> {
    await this.deleteIndexedDocument(payload.entityType, payload.entityId);
  }

  // =====================================================================================
  // STATUS AND MONITORING
  // =====================================================================================

  async getIndexStatus(params: any): Promise<any> {
    try {
      const indices: IndexStats[] = [];
      const entityTypes = params.indexNames || [
        'supplier',
        'venue',
        'service',
        'portfolio',
        'review',
      ];

      for (const entityType of entityTypes) {
        const stats = await this.getEntityIndexStats(entityType);
        indices.push(stats);
      }

      // Get cluster health (simulate)
      const cluster = {
        health: 'green',
        activeShards: entityTypes.length,
        relocatingShards: 0,
        unassignedShards: 0,
      };

      // Get operation status
      const operations = await this.getOperationStats();

      return {
        indices,
        cluster,
        operations,
      };
    } catch (error) {
      console.error('Index status error:', error);
      return null;
    }
  }

  private async getEntityIndexStats(entityType: string): Promise<IndexStats> {
    const tableMap = {
      supplier: 'suppliers',
      venue: 'venues',
      service: 'supplier_services',
      portfolio: 'supplier_portfolios',
      review: 'supplier_reviews',
    };

    const tableName = tableMap[entityType];

    const { count } = await this.supabase
      .from(tableName)
      .select('id', { count: 'exact' });

    return {
      indexName: `${entityType}_index`,
      documentCount: count || 0,
      indexSize: `${Math.round((count || 0) * 0.5)}KB`, // Estimated
      lastUpdated: new Date().toISOString(),
      health: 'green',
      settings: {
        shards: 1,
        replicas: 0,
        refreshInterval: '1s',
      },
      mappings: {
        totalFields: Object.keys(this.indexMappings[entityType] || {}).length,
        dynamicMapping: true,
      },
    };
  }

  private async getOperationStats(): Promise<any> {
    const { data } = await this.supabase
      .from('search_indexing_jobs')
      .select('status')
      .gte(
        'started_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    data?.forEach((job: any) => {
      stats[job.status] = (stats[job.status] || 0) + 1;
    });

    return stats;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private async executeSingleBulkOperation(
    op: any,
    operation: IndexOperation,
    context: IndexContext,
  ): Promise<IndexOperation> {
    try {
      switch (op.action) {
        case 'index':
          await this.indexEntities(op.entityType, [op.entityId]);
          break;

        case 'update':
          await this.updateIndexedEntities(op.entityType, [op.entityId]);
          break;

        case 'delete':
          await this.deleteIndexedEntities(op.entityType, [op.entityId]);
          break;
      }

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
      operation.progress = {
        processed: 1,
        total: 1,
        percentage: 100,
      };
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.completedAt = new Date().toISOString();
    }

    return operation;
  }

  private generateSearchText(entity: any): string {
    const fields = [
      entity.business_name,
      entity.name,
      entity.title,
      entity.service_name,
      entity.description,
      entity.review_text,
      entity.supplier_type,
      entity.venue_type,
      entity.category,
      entity.city,
      entity.state,
      ...(entity.tags || []),
      ...(entity.amenities || []),
    ];

    return fields
      .filter((field) => field && typeof field === 'string')
      .join(' ')
      .toLowerCase();
  }

  private generateOperationId(): string {
    return `idx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async saveOperation(
    operation: IndexOperation,
    context: IndexContext,
  ): Promise<void> {
    try {
      await this.supabase.from('search_indexing_jobs').insert({
        id: operation.id,
        operation: operation.operation,
        entity_type: operation.entityType,
        entity_ids: operation.entityIds,
        status: operation.status,
        started_at: operation.startedAt,
        progress: operation.progress,
        metadata: operation.metadata,
        user_id: context.userId,
        request_id: context.requestId,
      });
    } catch (error) {
      console.error('Save operation error:', error);
    }
  }

  private async updateOperation(operation: IndexOperation): Promise<void> {
    try {
      await this.supabase
        .from('search_indexing_jobs')
        .update({
          status: operation.status,
          completed_at: operation.completedAt,
          progress: operation.progress,
          error_message: operation.error,
        })
        .eq('id', operation.id);
    } catch (error) {
      console.error('Update operation error:', error);
    }
  }

  // =====================================================================================
  // INDEX MAPPINGS & FIELD DEFINITIONS
  // =====================================================================================

  private getIndexMappings(): Record<string, any> {
    return {
      supplier: {
        business_name: { type: 'text', boost: 3 },
        description: { type: 'text', boost: 2 },
        supplier_type: { type: 'keyword' },
        location: { type: 'geo_point' },
        tags: { type: 'keyword' },
        search_text: { type: 'text' },
      },
      venue: {
        name: { type: 'text', boost: 3 },
        description: { type: 'text', boost: 2 },
        venue_type: { type: 'keyword' },
        location: { type: 'geo_point' },
        capacity: { type: 'integer' },
      },
      service: {
        service_name: { type: 'text', boost: 3 },
        description: { type: 'text', boost: 2 },
        category: { type: 'keyword' },
        price_min: { type: 'integer' },
        price_max: { type: 'integer' },
      },
      portfolio: {
        title: { type: 'text', boost: 2 },
        description: { type: 'text' },
        tags: { type: 'keyword' },
        category: { type: 'keyword' },
      },
      review: {
        review_text: { type: 'text', boost: 2 },
        rating: { type: 'integer' },
        reviewer_name: { type: 'keyword' },
      },
    };
  }

  private getSupplierSelectFields(includeRelations = true): string {
    const baseFields = `
      id, business_name, description, supplier_type, verified,
      average_rating, review_count, city, state, latitude, longitude,
      contact_email, contact_phone, website, profile_image,
      portfolio_images, tags, created_at, updated_at
    `;

    if (!includeRelations) {
      return baseFields;
    }

    return `
      ${baseFields},
      supplier_services (
        id, service_name, description, category,
        price_min, price_max, currency
      )
    `;
  }

  private getVenueSelectFields(includeRelations = true): string {
    return `
      id, name, description, venue_type, capacity,
      city, state, latitude, longitude, address,
      amenities, pricing, availability,
      created_at, updated_at
    `;
  }

  private getServiceSelectFields(includeRelations = true): string {
    return `
      id, service_name, description, category, supplier_id,
      price_min, price_max, currency, created_at, updated_at
    `;
  }

  private getPortfolioSelectFields(includeRelations = true): string {
    return `
      id, supplier_id, title, description, category,
      tags, image_url, created_at, updated_at
    `;
  }

  private getReviewSelectFields(includeRelations = true): string {
    return `
      id, supplier_id, rating, review_text,
      reviewer_name, created_at, updated_at
    `;
  }
}
