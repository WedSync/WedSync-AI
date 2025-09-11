/**
 * WS-183 External Analytics Connector - External analytics platform integration
 *
 * Connects with external analytics platforms (Google Analytics, Mixpanel, Segment)
 * for comprehensive data exchange and LTV insights distribution.
 */

import { createClient } from '@supabase/supabase-js';

export interface AnalyticsConnector {
  id: string;
  name: string;
  platform: 'google_analytics' | 'mixpanel' | 'segment' | 'amplitude' | 'heap';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  capabilities: string[];
  lastSync: Date;
  dataTypes: string[];
}

export interface LTVExportData {
  supplierId: string;
  supplierEmail: string;
  businessType: string;
  currentLTV: number;
  projectedLTV: number;
  cac: number;
  ltvCacRatio: number;
  churnRisk: number;
  subscriptionTier: string;
  monthsActive: number;
  totalRevenue: number;
  lastPaymentDate: Date;
  signupSource: string;
  engagementScore: number;
  supportTickets: number;
  featureUsage: Record<string, number>;
  marketingAttribution: Record<string, number>;
  cohortData: {
    signupCohort: string;
    cohortRevenue: number;
    cohortRetention: number;
  };
  exportTimestamp: Date;
}

export interface ExportResult {
  exportId: string;
  platform: string;
  recordsExported: number;
  exportSize: number;
  success: boolean;
  errors: string[];
  exportUrl?: string;
  exportTimestamp: Date;
  dataValidation: {
    recordsValidated: number;
    validationErrors: number;
    dataQualityScore: number;
  };
}

export interface SyncResult {
  syncId: string;
  platform: string;
  direction: 'import' | 'export' | 'bidirectional';
  recordsProcessed: number;
  success: boolean;
  errors: string[];
  syncDurationMs: number;
  lastSyncTimestamp: Date;
  dataMetrics: {
    uniqueSuppliers: number;
    totalRevenue: number;
    averageLTV: number;
    dataFreshness: number; // hours
  };
}

export interface PlatformHealthStatus {
  platform: string;
  isHealthy: boolean;
  responseTimeMs: number;
  lastHealthCheck: Date;
  errorRate: number;
  apiQuota: {
    used: number;
    total: number;
    resetTime: Date;
  };
  connectionStatus: 'active' | 'degraded' | 'down';
  issues: string[];
  recommendations: string[];
}

export class ExternalAnalyticsConnector {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly EXPORT_BATCH_SIZE = 1000;
  private readonly MAX_EXPORT_SIZE = 10000000; // 10MB
  private readonly SYNC_TIMEOUT_MS = 300000; // 5 minutes

  /**
   * Export LTV data to external analytics systems
   */
  async exportLTVData(
    platform: string,
    dataFilter?: {
      supplierIds?: string[];
      businessTypes?: string[];
      dateRange?: { start: Date; end: Date };
      minLTV?: number;
      includeChurned?: boolean;
    },
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const exportId = `export_${platform}_${Date.now()}`;

    try {
      // Validate platform connection
      const connector = await this.getConnector(platform);
      if (connector.status !== 'connected') {
        throw new Error(`Platform ${platform} is not connected`);
      }

      // Fetch LTV data based on filters
      const ltvData = await this.fetchLTVDataForExport(dataFilter);

      if (ltvData.length === 0) {
        throw new Error('No LTV data found for export criteria');
      }

      // Validate data before export
      const validationResult = await this.validateExportData(ltvData);

      if (validationResult.validationErrors > ltvData.length * 0.1) {
        throw new Error('Too many validation errors, export aborted');
      }

      // Process export based on platform
      let exportResult: Partial<ExportResult>;

      switch (platform) {
        case 'google_analytics':
          exportResult = await this.exportToGoogleAnalytics(
            ltvData,
            connector.config,
          );
          break;
        case 'mixpanel':
          exportResult = await this.exportToMixpanel(ltvData, connector.config);
          break;
        case 'segment':
          exportResult = await this.exportToSegment(ltvData, connector.config);
          break;
        case 'amplitude':
          exportResult = await this.exportToAmplitude(
            ltvData,
            connector.config,
          );
          break;
        case 'heap':
          exportResult = await this.exportToHeap(ltvData, connector.config);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const finalResult: ExportResult = {
        exportId,
        platform,
        recordsExported: exportResult.recordsExported || ltvData.length,
        exportSize: JSON.stringify(ltvData).length,
        success: true,
        errors: exportResult.errors || [],
        exportUrl: exportResult.exportUrl,
        exportTimestamp: new Date(),
        dataValidation: {
          recordsValidated: validationResult.recordsValidated,
          validationErrors: validationResult.validationErrors,
          dataQualityScore: validationResult.dataQualityScore,
        },
      };

      // Log export success
      await this.logExportActivity(finalResult);

      // Update connector last sync time
      await this.updateConnectorLastSync(platform);

      return finalResult;
    } catch (error) {
      console.error(`LTV data export failed for ${platform}:`, error);

      const failedResult: ExportResult = {
        exportId,
        platform,
        recordsExported: 0,
        exportSize: 0,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        exportTimestamp: new Date(),
        dataValidation: {
          recordsValidated: 0,
          validationErrors: 0,
          dataQualityScore: 0,
        },
      };

      await this.logExportActivity(failedResult);
      throw new Error(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List all available analytics connectors
   */
  async listConnectors(): Promise<AnalyticsConnector[]> {
    try {
      const { data: connectors, error } = await this.supabase
        .from('analytics_connectors')
        .select('*')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch connectors: ${error.message}`);
      }

      return (
        connectors?.map((conn) => ({
          id: conn.id,
          name: conn.name,
          platform: conn.platform,
          status: conn.status,
          config: conn.config || {},
          capabilities: conn.capabilities || [],
          lastSync: new Date(conn.last_sync),
          dataTypes: conn.data_types || [],
        })) || []
      );
    } catch (error) {
      console.error('Failed to list connectors:', error);
      throw new Error(
        `Failed to list connectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sync data with external analytics platform
   */
  async syncWithPlatform(
    platform: string,
    direction: 'import' | 'export' | 'bidirectional' = 'export',
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const syncId = `sync_${platform}_${Date.now()}`;

    try {
      const connector = await this.getConnector(platform);
      let recordsProcessed = 0;
      const errors: string[] = [];

      // Perform export sync
      if (direction === 'export' || direction === 'bidirectional') {
        try {
          const exportResult = await this.exportLTVData(platform);
          recordsProcessed += exportResult.recordsExported;
          errors.push(...exportResult.errors);
        } catch (error) {
          errors.push(
            `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Perform import sync
      if (direction === 'import' || direction === 'bidirectional') {
        try {
          const importResult = await this.importFromPlatform(
            platform,
            connector.config,
          );
          recordsProcessed += importResult.recordsImported;
          errors.push(...importResult.errors);
        } catch (error) {
          errors.push(
            `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Calculate data metrics
      const dataMetrics = await this.calculateSyncDataMetrics();

      const result: SyncResult = {
        syncId,
        platform,
        direction,
        recordsProcessed,
        success: errors.length === 0,
        errors,
        syncDurationMs: Date.now() - startTime,
        lastSyncTimestamp: new Date(),
        dataMetrics,
      };

      // Log sync activity
      await this.logSyncActivity(result);

      return result;
    } catch (error) {
      console.error(`Sync failed for ${platform}:`, error);

      return {
        syncId,
        platform,
        direction,
        recordsProcessed: 0,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        syncDurationMs: Date.now() - startTime,
        lastSyncTimestamp: new Date(),
        dataMetrics: {
          uniqueSuppliers: 0,
          totalRevenue: 0,
          averageLTV: 0,
          dataFreshness: 0,
        },
      };
    }
  }

  /**
   * Monitor integration health and status
   */
  async getIntegrationHealthStatus(): Promise<PlatformHealthStatus[]> {
    const connectors = await this.listConnectors();
    const healthStatuses: PlatformHealthStatus[] = [];

    for (const connector of connectors) {
      const status = await this.checkPlatformHealth(connector);
      healthStatuses.push(status);
    }

    // Store health check results
    await this.storeHealthCheckResults(healthStatuses);

    return healthStatuses;
  }

  /**
   * Fetch LTV data for export with filters
   */
  private async fetchLTVDataForExport(filter?: {
    supplierIds?: string[];
    businessTypes?: string[];
    dateRange?: { start: Date; end: Date };
    minLTV?: number;
    includeChurned?: boolean;
  }): Promise<LTVExportData[]> {
    let query = this.supabase.from('supplier_analytics_view').select(`
        user_id,
        email,
        business_type,
        current_ltv,
        projected_ltv,
        cac,
        ltv_cac_ratio,
        churn_risk,
        subscription_tier,
        months_active,
        total_revenue,
        last_payment_date,
        signup_source,
        engagement_score,
        support_tickets,
        feature_usage,
        marketing_attribution,
        signup_cohort,
        cohort_revenue,
        cohort_retention
      `);

    // Apply filters
    if (filter?.supplierIds && filter.supplierIds.length > 0) {
      query = query.in('user_id', filter.supplierIds);
    }

    if (filter?.businessTypes && filter.businessTypes.length > 0) {
      query = query.in('business_type', filter.businessTypes);
    }

    if (filter?.dateRange) {
      query = query
        .gte('last_payment_date', filter.dateRange.start.toISOString())
        .lte('last_payment_date', filter.dateRange.end.toISOString());
    }

    if (filter?.minLTV) {
      query = query.gte('current_ltv', filter.minLTV);
    }

    if (!filter?.includeChurned) {
      query = query.lt('churn_risk', 0.8);
    }

    const { data, error } = await query.limit(this.EXPORT_BATCH_SIZE);

    if (error) {
      throw new Error(`Failed to fetch LTV data: ${error.message}`);
    }

    return (
      data?.map((row) => ({
        supplierId: row.user_id,
        supplierEmail: row.email,
        businessType: row.business_type,
        currentLTV: row.current_ltv,
        projectedLTV: row.projected_ltv,
        cac: row.cac,
        ltvCacRatio: row.ltv_cac_ratio,
        churnRisk: row.churn_risk,
        subscriptionTier: row.subscription_tier,
        monthsActive: row.months_active,
        totalRevenue: row.total_revenue,
        lastPaymentDate: new Date(row.last_payment_date),
        signupSource: row.signup_source,
        engagementScore: row.engagement_score,
        supportTickets: row.support_tickets,
        featureUsage: row.feature_usage || {},
        marketingAttribution: row.marketing_attribution || {},
        cohortData: {
          signupCohort: row.signup_cohort,
          cohortRevenue: row.cohort_revenue,
          cohortRetention: row.cohort_retention,
        },
        exportTimestamp: new Date(),
      })) || []
    );
  }

  /**
   * Validate export data quality
   */
  private async validateExportData(data: LTVExportData[]): Promise<{
    recordsValidated: number;
    validationErrors: number;
    dataQualityScore: number;
  }> {
    let validationErrors = 0;

    for (const record of data) {
      // Check required fields
      if (!record.supplierId || !record.supplierEmail) {
        validationErrors++;
        continue;
      }

      // Check data consistency
      if (record.currentLTV < 0 || record.cac < 0) {
        validationErrors++;
        continue;
      }

      // Check LTV:CAC ratio calculation
      const expectedRatio = record.cac > 0 ? record.currentLTV / record.cac : 0;
      if (Math.abs(expectedRatio - record.ltvCacRatio) > 0.1) {
        validationErrors++;
        continue;
      }

      // Check churn risk bounds
      if (record.churnRisk < 0 || record.churnRisk > 1) {
        validationErrors++;
        continue;
      }
    }

    const dataQualityScore =
      data.length > 0 ? (data.length - validationErrors) / data.length : 1;

    return {
      recordsValidated: data.length,
      validationErrors,
      dataQualityScore,
    };
  }

  /**
   * Export to Google Analytics
   */
  private async exportToGoogleAnalytics(
    data: LTVExportData[],
    config: any,
  ): Promise<Partial<ExportResult>> {
    try {
      // Convert LTV data to Google Analytics custom events
      const events = data.map((supplier) => ({
        name: 'ltv_update',
        parameters: {
          supplier_id: supplier.supplierId,
          current_ltv: supplier.currentLTV,
          cac: supplier.cac,
          ltv_cac_ratio: supplier.ltvCacRatio,
          business_type: supplier.businessType,
          churn_risk: supplier.churnRisk,
          subscription_tier: supplier.subscriptionTier,
          signup_source: supplier.signupSource,
        },
      }));

      // Send to Google Analytics via Measurement Protocol
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: config.clientId || 'wedsync-ltv-export',
            events,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Analytics export failed: ${response.statusText}`,
        );
      }

      return {
        recordsExported: events.length,
        errors: [],
      };
    } catch (error) {
      return {
        recordsExported: 0,
        errors: [
          error instanceof Error
            ? error.message
            : 'Google Analytics export failed',
        ],
      };
    }
  }

  /**
   * Export to Mixpanel
   */
  private async exportToMixpanel(
    data: LTVExportData[],
    config: any,
  ): Promise<Partial<ExportResult>> {
    try {
      const events = data.map((supplier) => ({
        event: 'LTV Update',
        properties: {
          distinct_id: supplier.supplierId,
          supplier_email: supplier.supplierEmail,
          current_ltv: supplier.currentLTV,
          projected_ltv: supplier.projectedLTV,
          cac: supplier.cac,
          ltv_cac_ratio: supplier.ltvCacRatio,
          business_type: supplier.businessType,
          churn_risk: supplier.churnRisk,
          subscription_tier: supplier.subscriptionTier,
          months_active: supplier.monthsActive,
          total_revenue: supplier.totalRevenue,
          signup_source: supplier.signupSource,
          engagement_score: supplier.engagementScore,
          time: Math.floor(supplier.exportTimestamp.getTime() / 1000),
        },
      }));

      const response = await fetch('https://api.mixpanel.com/import', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.apiSecret}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mixpanel export failed: ${errorText}`);
      }

      const result = await response.json();

      return {
        recordsExported: result.num_records_imported || events.length,
        errors: result.failed_records
          ? [`${result.failed_records.length} records failed`]
          : [],
      };
    } catch (error) {
      return {
        recordsExported: 0,
        errors: [
          error instanceof Error ? error.message : 'Mixpanel export failed',
        ],
      };
    }
  }

  /**
   * Export to Segment
   */
  private async exportToSegment(
    data: LTVExportData[],
    config: any,
  ): Promise<Partial<ExportResult>> {
    try {
      const batchEvents = data.map((supplier) => ({
        userId: supplier.supplierId,
        event: 'LTV Updated',
        properties: {
          current_ltv: supplier.currentLTV,
          projected_ltv: supplier.projectedLTV,
          cac: supplier.cac,
          ltv_cac_ratio: supplier.ltvCacRatio,
          business_type: supplier.businessType,
          churn_risk: supplier.churnRisk,
          subscription_tier: supplier.subscriptionTier,
          months_active: supplier.monthsActive,
          total_revenue: supplier.totalRevenue,
        },
        timestamp: supplier.exportTimestamp.toISOString(),
      }));

      const response = await fetch('https://api.segment.io/v1/batch', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.writeKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch: batchEvents,
        }),
      });

      if (!response.ok) {
        throw new Error(`Segment export failed: ${response.statusText}`);
      }

      return {
        recordsExported: batchEvents.length,
        errors: [],
      };
    } catch (error) {
      return {
        recordsExported: 0,
        errors: [
          error instanceof Error ? error.message : 'Segment export failed',
        ],
      };
    }
  }

  /**
   * Export to Amplitude
   */
  private async exportToAmplitude(
    data: LTVExportData[],
    config: any,
  ): Promise<Partial<ExportResult>> {
    try {
      const events = data.map((supplier) => ({
        user_id: supplier.supplierId,
        event_type: 'LTV Updated',
        event_properties: {
          current_ltv: supplier.currentLTV,
          projected_ltv: supplier.projectedLTV,
          cac: supplier.cac,
          ltv_cac_ratio: supplier.ltvCacRatio,
          business_type: supplier.businessType,
          churn_risk: supplier.churnRisk,
        },
        user_properties: {
          email: supplier.supplierEmail,
          subscription_tier: supplier.subscriptionTier,
          months_active: supplier.monthsActive,
          total_revenue: supplier.totalRevenue,
        },
        time: supplier.exportTimestamp.getTime(),
      }));

      const response = await fetch('https://api2.amplitude.com/2/httpapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: config.apiKey,
          events,
        }),
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(
          `Amplitude export failed: ${result.error || 'Unknown error'}`,
        );
      }

      return {
        recordsExported: events.length,
        errors: [],
      };
    } catch (error) {
      return {
        recordsExported: 0,
        errors: [
          error instanceof Error ? error.message : 'Amplitude export failed',
        ],
      };
    }
  }

  /**
   * Export to Heap
   */
  private async exportToHeap(
    data: LTVExportData[],
    config: any,
  ): Promise<Partial<ExportResult>> {
    try {
      const events = data.map((supplier) => ({
        app_id: config.appId,
        identity: supplier.supplierId,
        event: 'LTV Updated',
        properties: {
          current_ltv: supplier.currentLTV,
          cac: supplier.cac,
          ltv_cac_ratio: supplier.ltvCacRatio,
          business_type: supplier.businessType,
          churn_risk: supplier.churnRisk,
          subscription_tier: supplier.subscriptionTier,
        },
        timestamp: supplier.exportTimestamp.toISOString(),
      }));

      const response = await fetch('https://heapanalytics.com/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
        }),
      });

      if (!response.ok) {
        throw new Error(`Heap export failed: ${response.statusText}`);
      }

      return {
        recordsExported: events.length,
        errors: [],
      };
    } catch (error) {
      return {
        recordsExported: 0,
        errors: [error instanceof Error ? error.message : 'Heap export failed'],
      };
    }
  }

  /**
   * Import data from external platform
   */
  private async importFromPlatform(
    platform: string,
    config: any,
  ): Promise<{
    recordsImported: number;
    errors: string[];
  }> {
    // Implementation would depend on specific platform capabilities
    // For now, return placeholder
    return {
      recordsImported: 0,
      errors: ['Import not yet implemented for ' + platform],
    };
  }

  /**
   * Get connector configuration
   */
  private async getConnector(platform: string): Promise<AnalyticsConnector> {
    const { data, error } = await this.supabase
      .from('analytics_connectors')
      .select('*')
      .eq('platform', platform)
      .single();

    if (error || !data) {
      throw new Error(`Connector not found for platform: ${platform}`);
    }

    return {
      id: data.id,
      name: data.name,
      platform: data.platform,
      status: data.status,
      config: data.config || {},
      capabilities: data.capabilities || [],
      lastSync: new Date(data.last_sync),
      dataTypes: data.data_types || [],
    };
  }

  /**
   * Check platform health
   */
  private async checkPlatformHealth(
    connector: AnalyticsConnector,
  ): Promise<PlatformHealthStatus> {
    const startTime = Date.now();
    let isHealthy = false;
    let connectionStatus: PlatformHealthStatus['connectionStatus'] = 'down';
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Platform-specific health checks
      switch (connector.platform) {
        case 'google_analytics':
          isHealthy = await this.checkGoogleAnalyticsHealth(connector.config);
          break;
        case 'mixpanel':
          isHealthy = await this.checkMixpanelHealth(connector.config);
          break;
        case 'segment':
          isHealthy = await this.checkSegmentHealth(connector.config);
          break;
        default:
          issues.push('Health check not implemented for platform');
      }

      connectionStatus = isHealthy ? 'active' : 'degraded';
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : 'Unknown health check error',
      );
      connectionStatus = 'down';
    }

    const responseTimeMs = Date.now() - startTime;

    // Generate recommendations
    if (responseTimeMs > 5000) {
      recommendations.push(
        'API response time is slow, consider checking network connectivity',
      );
    }

    if (!isHealthy) {
      recommendations.push('Review platform configuration and API credentials');
    }

    return {
      platform: connector.platform,
      isHealthy,
      responseTimeMs,
      lastHealthCheck: new Date(),
      errorRate: isHealthy ? 0 : 1,
      apiQuota: {
        used: 0, // Would be populated from platform API
        total: 10000, // Default quota
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      connectionStatus,
      issues,
      recommendations,
    };
  }

  // Platform-specific health checks
  private async checkGoogleAnalyticsHealth(config: any): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'health-check',
            events: [{ name: 'health_check' }],
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkMixpanelHealth(config: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.mixpanel.com/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            event: 'health_check',
            properties: {
              token: config.token,
              distinct_id: 'health-check',
            },
          },
        ]),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkSegmentHealth(config: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.segment.io/v1/track', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.writeKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'health-check',
          event: 'Health Check',
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Utility methods
  private async calculateSyncDataMetrics(): Promise<SyncResult['dataMetrics']> {
    const { data: metrics, error } = await this.supabase
      .from('supplier_analytics_summary')
      .select(
        'unique_suppliers, total_revenue, average_ltv, data_freshness_hours',
      )
      .single();

    if (error || !metrics) {
      return {
        uniqueSuppliers: 0,
        totalRevenue: 0,
        averageLTV: 0,
        dataFreshness: 0,
      };
    }

    return {
      uniqueSuppliers: metrics.unique_suppliers,
      totalRevenue: metrics.total_revenue,
      averageLTV: metrics.average_ltv,
      dataFreshness: metrics.data_freshness_hours,
    };
  }

  private async updateConnectorLastSync(platform: string): Promise<void> {
    await this.supabase
      .from('analytics_connectors')
      .update({ last_sync: new Date().toISOString() })
      .eq('platform', platform);
  }

  // Logging methods
  private async logExportActivity(result: ExportResult): Promise<void> {
    await this.supabase.from('export_logs').insert({
      export_id: result.exportId,
      platform: result.platform,
      records_exported: result.recordsExported,
      export_size: result.exportSize,
      success: result.success,
      errors: result.errors,
      data_quality_score: result.dataValidation.dataQualityScore,
      timestamp: result.exportTimestamp.toISOString(),
    });
  }

  private async logSyncActivity(result: SyncResult): Promise<void> {
    await this.supabase.from('sync_logs').insert({
      sync_id: result.syncId,
      platform: result.platform,
      direction: result.direction,
      records_processed: result.recordsProcessed,
      success: result.success,
      errors: result.errors,
      duration_ms: result.syncDurationMs,
      timestamp: result.lastSyncTimestamp.toISOString(),
    });
  }

  private async storeHealthCheckResults(
    statuses: PlatformHealthStatus[],
  ): Promise<void> {
    const healthRecords = statuses.map((status) => ({
      platform: status.platform,
      is_healthy: status.isHealthy,
      response_time_ms: status.responseTimeMs,
      error_rate: status.errorRate,
      connection_status: status.connectionStatus,
      issues: status.issues,
      recommendations: status.recommendations,
      timestamp: status.lastHealthCheck.toISOString(),
    }));

    await this.supabase.from('platform_health_logs').insert(healthRecords);
  }
}
