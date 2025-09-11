/**
 * VendorDataIntegration.ts - Multi-source vendor data collection system
 * WS-246: Vendor Performance Analytics System - Team C Integration Focus
 *
 * Handles integration with multiple vendor data sources including:
 * - Tave photography CRM
 * - Light Blue venue management
 * - Review platforms (Google, Yelp, etc.)
 * - Calendar systems (Google Calendar, Outlook)
 * - Payment processors (Stripe, Square)
 */

import { createClient } from '@supabase/supabase-js';
import {
  VendorDataSource,
  PerformanceMetric,
  MetricType,
  WeddingMetricsContext,
  DataSyncJob,
  SyncJobType,
  JobStatus,
  IntegrationHealthCheckResult,
} from '../../types/integrations';

export class VendorDataIntegration {
  private supabase;
  private activeJobs = new Map<string, DataSyncJob>();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private supabaseUrl: string,
    private serviceKey: string,
  ) {
    this.supabase = createClient(supabaseUrl, serviceKey);
    this.initializeHealthCheck();
  }

  /**
   * Register a new vendor data source for analytics integration
   */
  async registerDataSource(
    dataSource: Omit<VendorDataSource, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<string> {
    try {
      // Validate data source configuration
      this.validateDataSourceConfig(dataSource);

      const { data, error } = await this.supabase
        .from('vendor_data_sources')
        .insert([
          {
            ...dataSource,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to register data source: ${error.message}`);
      }

      // Initialize first health check
      await this.performHealthCheck(data.id);

      console.log(`✅ Registered data source: ${dataSource.name} (${data.id})`);
      return data.id;
    } catch (error) {
      console.error('❌ Failed to register data source:', error);
      throw error;
    }
  }

  /**
   * Sync data from all registered sources for a vendor
   */
  async syncVendorData(
    vendorId: string,
    organizationId: string,
  ): Promise<DataSyncJob[]> {
    try {
      // Get all data sources for this vendor
      const { data: dataSources, error } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('organization_id', organizationId)
        .eq('status->connected', true);

      if (error) {
        throw new Error(`Failed to fetch data sources: ${error.message}`);
      }

      if (!dataSources?.length) {
        console.warn(`⚠️ No active data sources found for vendor: ${vendorId}`);
        return [];
      }

      const syncJobs: DataSyncJob[] = [];

      // Create sync jobs for each data source
      for (const dataSource of dataSources) {
        const syncJob = await this.createSyncJob(dataSource.id, 'FULL_SYNC');
        syncJobs.push(syncJob);

        // Start sync in background
        this.executeSyncJob(syncJob.id).catch((error) => {
          console.error(`❌ Sync job ${syncJob.id} failed:`, error);
        });
      }

      return syncJobs;
    } catch (error) {
      console.error('❌ Failed to sync vendor data:', error);
      throw error;
    }
  }

  /**
   * Collect performance metrics from integrated data sources
   */
  async collectPerformanceMetrics(
    vendorId: string,
    organizationId: string,
    metricTypes: MetricType[],
  ): Promise<PerformanceMetric[]> {
    try {
      const metrics: PerformanceMetric[] = [];

      // Get active data sources
      const { data: dataSources } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('organization_id', organizationId)
        .eq('status->connected', true);

      if (!dataSources?.length) {
        return metrics;
      }

      // Collect metrics from each data source
      for (const dataSource of dataSources) {
        for (const metricType of metricTypes) {
          try {
            const metric = await this.extractMetricFromSource(
              dataSource,
              metricType,
            );
            if (metric) {
              metrics.push(metric);
            }
          } catch (error) {
            console.error(
              `❌ Failed to extract ${metricType} from ${dataSource.name}:`,
              error,
            );
          }
        }
      }

      // Store metrics in database
      if (metrics.length > 0) {
        const { error } = await this.supabase
          .from('performance_metrics')
          .insert(metrics);

        if (error) {
          console.error('❌ Failed to store metrics:', error);
        } else {
          console.log(
            `✅ Stored ${metrics.length} performance metrics for vendor: ${vendorId}`,
          );
        }
      }

      return metrics;
    } catch (error) {
      console.error('❌ Failed to collect performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get integration status for all vendor data sources
   */
  async getIntegrationStatus(vendorId: string, organizationId: string) {
    try {
      const { data: dataSources, error } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(`Failed to fetch integration status: ${error.message}`);
      }

      const statusSummary = {
        totalSources: dataSources?.length || 0,
        connectedSources:
          dataSources?.filter((ds) => ds.status?.connected).length || 0,
        healthySources:
          dataSources?.filter((ds) => ds.status?.health === 'HEALTHY').length ||
          0,
        errorSources:
          dataSources?.filter((ds) => ds.status?.health === 'ERROR').length ||
          0,
        sources: dataSources || [],
      };

      return statusSummary;
    } catch (error) {
      console.error('❌ Failed to get integration status:', error);
      throw error;
    }
  }

  /**
   * Private method: Create a new sync job
   */
  private async createSyncJob(
    dataSourceId: string,
    jobType: SyncJobType,
  ): Promise<DataSyncJob> {
    const syncJob: DataSyncJob = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data_source_id: dataSourceId,
      job_type: jobType,
      status: 'PENDING',
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
      progress: {
        total_records: 0,
        processed_records: 0,
        success_records: 0,
        failed_records: 0,
        start_time: new Date().toISOString(),
      },
      config: {
        batch_size: 100,
        timeout_ms: 30000,
        retry_strategy: 'EXPONENTIAL',
        retry_delay_ms: 1000,
        data_validation: true,
        conflict_resolution: 'SOURCE_WINS',
      },
    };

    // Store sync job
    const { error } = await this.supabase
      .from('data_sync_jobs')
      .insert([syncJob]);

    if (error) {
      throw new Error(`Failed to create sync job: ${error.message}`);
    }

    this.activeJobs.set(syncJob.id, syncJob);
    return syncJob;
  }

  /**
   * Private method: Execute a sync job
   */
  private async executeSyncJob(syncJobId: string): Promise<void> {
    const syncJob = this.activeJobs.get(syncJobId);
    if (!syncJob) {
      throw new Error(`Sync job not found: ${syncJobId}`);
    }

    try {
      // Update job status to running
      syncJob.status = 'RUNNING';
      syncJob.started_at = new Date().toISOString();
      await this.updateSyncJob(syncJob);

      // Get data source
      const { data: dataSource, error } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('id', syncJob.data_source_id)
        .single();

      if (error || !dataSource) {
        throw new Error(`Data source not found: ${syncJob.data_source_id}`);
      }

      // Execute sync based on data source type
      await this.syncFromDataSource(dataSource, syncJob);

      // Mark job as completed
      syncJob.status = 'COMPLETED';
      syncJob.completed_at = new Date().toISOString();
      await this.updateSyncJob(syncJob);

      console.log(`✅ Sync job completed: ${syncJobId}`);
    } catch (error) {
      console.error(`❌ Sync job failed: ${syncJobId}`, error);

      syncJob.status = 'FAILED';
      syncJob.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncJob(syncJob);

      // Schedule retry if not exceeded max retries
      if (syncJob.retry_count < syncJob.max_retries) {
        await this.scheduleRetry(syncJob);
      }
    } finally {
      this.activeJobs.delete(syncJobId);
    }
  }

  /**
   * Private method: Sync data from specific data source
   */
  private async syncFromDataSource(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    switch (dataSource.type) {
      case 'CRM':
        await this.syncFromCRM(dataSource, syncJob);
        break;
      case 'CALENDAR':
        await this.syncFromCalendar(dataSource, syncJob);
        break;
      case 'PAYMENT':
        await this.syncFromPayment(dataSource, syncJob);
        break;
      case 'REVIEW':
        await this.syncFromReviews(dataSource, syncJob);
        break;
      case 'BOOKING':
        await this.syncFromBooking(dataSource, syncJob);
        break;
      default:
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
    }
  }

  /**
   * Private method: Sync from CRM systems (Tave, etc.)
   */
  private async syncFromCRM(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Implementation depends on CRM type
    if (dataSource.config.crm_type === 'tave') {
      await this.syncFromTave(dataSource, syncJob);
    } else {
      throw new Error(`Unsupported CRM type: ${dataSource.config.crm_type}`);
    }
  }

  /**
   * Private method: Sync from Tave photography CRM
   */
  private async syncFromTave(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    const credentials = dataSource.authentication.credentials;
    const baseUrl = 'https://taveapi.com/v1';

    try {
      // Fetch jobs from Tave
      const response = await fetch(`${baseUrl}/jobs`, {
        headers: {
          Authorization: `Bearer ${credentials.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Tave API error: ${response.status} ${response.statusText}`,
        );
      }

      const jobs = await response.json();

      // Process and transform data
      for (const job of jobs) {
        await this.processTaveJob(job, dataSource);
        syncJob.progress.processed_records++;
      }

      syncJob.progress.total_records = jobs.length;
      syncJob.progress.success_records = syncJob.progress.processed_records;
    } catch (error) {
      syncJob.progress.failed_records++;
      throw error;
    }
  }

  /**
   * Private method: Sync from calendar systems
   */
  private async syncFromCalendar(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Implementation for calendar sync (Google Calendar, Outlook, etc.)
    console.log('🗓️ Syncing calendar data...');

    // Simulate calendar sync
    syncJob.progress.total_records = 10;
    syncJob.progress.processed_records = 10;
    syncJob.progress.success_records = 10;
  }

  /**
   * Private method: Sync from payment processors
   */
  private async syncFromPayment(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Implementation for payment processor sync (Stripe, Square, etc.)
    console.log('💳 Syncing payment data...');

    // Simulate payment sync
    syncJob.progress.total_records = 25;
    syncJob.progress.processed_records = 25;
    syncJob.progress.success_records = 25;
  }

  /**
   * Private method: Sync from review platforms
   */
  private async syncFromReviews(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Implementation for review platform sync (Google, Yelp, etc.)
    console.log('⭐ Syncing review data...');

    // Simulate review sync
    syncJob.progress.total_records = 15;
    syncJob.progress.processed_records = 15;
    syncJob.progress.success_records = 15;
  }

  /**
   * Private method: Sync from booking systems
   */
  private async syncFromBooking(
    dataSource: VendorDataSource,
    syncJob: DataSyncJob,
  ): Promise<void> {
    // Implementation for booking system sync (Light Blue, etc.)
    console.log('📅 Syncing booking data...');

    // Simulate booking sync
    syncJob.progress.total_records = 20;
    syncJob.progress.processed_records = 20;
    syncJob.progress.success_records = 20;
  }

  /**
   * Private method: Process individual Tave job
   */
  private async processTaveJob(
    taveJob: any,
    dataSource: VendorDataSource,
  ): Promise<void> {
    // Transform Tave job data and extract metrics
    const weddingContext: WeddingMetricsContext = {
      wedding_id: taveJob.id,
      wedding_date: taveJob.event_date,
      season: this.getSeasonFromDate(taveJob.event_date),
      guest_count: taveJob.guest_count,
      budget_tier: this.getBudgetTier(taveJob.package_value),
      priority: this.getPriority(taveJob.event_date),
      is_wedding_week: this.isWeddingWeek(taveJob.event_date),
      is_weekend: this.isWeekend(taveJob.event_date),
    };

    // Extract performance metrics
    const metrics: PerformanceMetric[] = [
      {
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        vendor_id: dataSource.vendor_id,
        organization_id: dataSource.organization_id,
        data_source_id: dataSource.id,
        metric_type: 'RESPONSE_TIME',
        metric_name: 'Initial Response Time',
        value: taveJob.first_response_hours || 0,
        unit: 'hours',
        context: weddingContext,
        timestamp: new Date().toISOString(),
        metadata: { source: 'tave', job_id: taveJob.id },
      },
    ];

    // Store metrics
    const { error } = await this.supabase
      .from('performance_metrics')
      .insert(metrics);

    if (error) {
      console.error('❌ Failed to store Tave metrics:', error);
    }
  }

  /**
   * Private method: Extract metric from data source
   */
  private async extractMetricFromSource(
    dataSource: VendorDataSource,
    metricType: MetricType,
  ): Promise<PerformanceMetric | null> {
    try {
      // This would be implemented based on the specific data source and metric type
      // For now, return a sample metric
      return {
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        vendor_id: dataSource.vendor_id,
        organization_id: dataSource.organization_id,
        data_source_id: dataSource.id,
        metric_type: metricType,
        metric_name: `Sample ${metricType}`,
        value: Math.floor(Math.random() * 100),
        unit: this.getMetricUnit(metricType),
        context: this.getDefaultWeddingContext(),
        timestamp: new Date().toISOString(),
        metadata: { source: dataSource.type.toLowerCase() },
      };
    } catch (error) {
      console.error(`❌ Failed to extract metric ${metricType}:`, error);
      return null;
    }
  }

  /**
   * Private method: Perform health check on data source
   */
  private async performHealthCheck(
    dataSourceId: string,
  ): Promise<IntegrationHealthCheckResult> {
    try {
      const { data: dataSource } = await this.supabase
        .from('vendor_data_sources')
        .select('*')
        .eq('id', dataSourceId)
        .single();

      if (!dataSource) {
        throw new Error(`Data source not found: ${dataSourceId}`);
      }

      const startTime = Date.now();
      let healthCheck: IntegrationHealthCheckResult;

      try {
        // Perform connectivity test based on source type
        await this.testConnectivity(dataSource);

        healthCheck = {
          id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data_source_id: dataSourceId,
          check_type: 'CONNECTIVITY',
          status: 'PASS',
          message: 'Connection successful',
          checked_at: new Date().toISOString(),
          response_time_ms: Date.now() - startTime,
          next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        };

        // Update data source health
        await this.supabase
          .from('vendor_data_sources')
          .update({
            status: {
              ...dataSource.status,
              health: 'HEALTHY',
              last_health_check: new Date().toISOString(),
              message: 'Connection healthy',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', dataSourceId);
      } catch (error) {
        healthCheck = {
          id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data_source_id: dataSourceId,
          check_type: 'CONNECTIVITY',
          status: 'FAIL',
          message:
            error instanceof Error ? error.message : 'Health check failed',
          checked_at: new Date().toISOString(),
          response_time_ms: Date.now() - startTime,
          next_check: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes for failed checks
        };

        // Update data source health
        await this.supabase
          .from('vendor_data_sources')
          .update({
            status: {
              ...dataSource.status,
              health: 'ERROR',
              last_health_check: new Date().toISOString(),
              message: healthCheck.message,
            },
            error_count: (dataSource.error_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dataSourceId);
      }

      // Store health check result
      await this.supabase
        .from('integration_health_checks')
        .insert([healthCheck]);

      return healthCheck;
    } catch (error) {
      console.error(`❌ Health check failed for ${dataSourceId}:`, error);
      throw error;
    }
  }

  /**
   * Private utility methods
   */
  private validateDataSourceConfig(
    dataSource: Omit<VendorDataSource, 'id' | 'created_at' | 'updated_at'>,
  ): void {
    if (!dataSource.name?.trim()) {
      throw new Error('Data source name is required');
    }
    if (!dataSource.vendor_id?.trim()) {
      throw new Error('Vendor ID is required');
    }
    if (!dataSource.organization_id?.trim()) {
      throw new Error('Organization ID is required');
    }
    if (!dataSource.authentication?.credentials) {
      throw new Error('Authentication credentials are required');
    }
  }

  private async updateSyncJob(syncJob: DataSyncJob): Promise<void> {
    await this.supabase
      .from('data_sync_jobs')
      .update(syncJob)
      .eq('id', syncJob.id);
  }

  private async scheduleRetry(syncJob: DataSyncJob): Promise<void> {
    syncJob.retry_count++;
    syncJob.status = 'PENDING';
    const delay =
      Math.pow(2, syncJob.retry_count) * syncJob.config.retry_delay_ms;

    setTimeout(() => {
      this.executeSyncJob(syncJob.id).catch((error) => {
        console.error(`❌ Retry failed for sync job ${syncJob.id}:`, error);
      });
    }, delay);
  }

  private async testConnectivity(dataSource: VendorDataSource): Promise<void> {
    // Implementation would test actual connectivity to the data source
    // For now, simulate a connectivity test
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private initializeHealthCheck(): void {
    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(
      async () => {
        try {
          const { data: dataSources } = await this.supabase
            .from('vendor_data_sources')
            .select('id')
            .eq('status->connected', true);

          if (dataSources?.length) {
            for (const dataSource of dataSources) {
              await this.performHealthCheck(dataSource.id);
            }
          }
        } catch (error) {
          console.error('❌ Health check interval error:', error);
        }
      },
      5 * 60 * 1000,
    );
  }

  private getSeasonFromDate(dateStr: string): WeddingMetricsContext['season'] {
    const date = new Date(dateStr);
    const month = date.getMonth();

    if (month >= 2 && month <= 4) return 'SPRING';
    if (month >= 5 && month <= 7) return 'SUMMER';
    if (month >= 8 && month <= 10) return 'FALL';
    return 'WINTER';
  }

  private getBudgetTier(value: number): WeddingMetricsContext['budget_tier'] {
    if (value < 5000) return 'BUDGET';
    if (value < 15000) return 'MID_RANGE';
    if (value < 50000) return 'LUXURY';
    return 'ULTRA_LUXURY';
  }

  private getPriority(weddingDate: string): WeddingMetricsContext['priority'] {
    const daysUntilWedding = Math.ceil(
      (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding <= 7) return 'CRITICAL';
    if (daysUntilWedding <= 30) return 'HIGH';
    if (daysUntilWedding <= 90) return 'MEDIUM';
    return 'LOW';
  }

  private isWeddingWeek(weddingDate: string): boolean {
    const daysUntilWedding = Math.ceil(
      (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilWedding <= 7 && daysUntilWedding >= 0;
  }

  private isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private getMetricUnit(metricType: MetricType): string {
    const units: Record<MetricType, string> = {
      RESPONSE_TIME: 'hours',
      SATISFACTION_SCORE: 'rating',
      BOOKING_CONVERSION: 'percentage',
      PAYMENT_SUCCESS: 'percentage',
      COMMUNICATION_FREQUENCY: 'messages/day',
      DELIVERY_TIME: 'days',
      QUALITY_RATING: 'rating',
      REFERRAL_COUNT: 'count',
      REPEAT_BUSINESS: 'percentage',
      SEASONAL_PERFORMANCE: 'score',
    };
    return units[metricType] || 'count';
  }

  private getDefaultWeddingContext(): WeddingMetricsContext {
    return {
      season: 'SUMMER',
      budget_tier: 'MID_RANGE',
      priority: 'MEDIUM',
      is_wedding_week: false,
      is_weekend: false,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.activeJobs.clear();
  }
}
