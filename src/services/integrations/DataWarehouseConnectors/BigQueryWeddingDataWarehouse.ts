import { BigQuery } from '@google-cloud/bigquery';
import {
  DataWarehouseConnector,
  WeddingReportData,
  DataSynchronizationRequest,
  IntegrationHealthStatus,
  DataValidationResult,
} from '../../../types/integrations/integration-types';
import {
  WeddingMetrics,
  VendorReportData,
  BookingReportData,
} from '../../../types/integrations/bi-platform-types';

export interface BigQueryConfig {
  projectId: string;
  keyFilename: string;
  location: string;
  datasetId: string;
  tablePrefix: string;
  maxRetries: number;
  timeoutMs: number;
}

export interface BigQueryTableSchema {
  name: string;
  fields: {
    name: string;
    type:
      | 'STRING'
      | 'INTEGER'
      | 'FLOAT'
      | 'BOOLEAN'
      | 'TIMESTAMP'
      | 'DATE'
      | 'RECORD'
      | 'REPEATED';
    mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
    description?: string;
    fields?: BigQueryTableSchema['fields'];
  }[];
  timePartitioning?: {
    type: 'DAY' | 'HOUR';
    field: string;
  };
  clustering?: string[];
}

export interface BigQueryETLJob {
  id: string;
  name: string;
  sourceQuery: string;
  destinationTable: string;
  schedule: string;
  writeDisposition: 'WRITE_TRUNCATE' | 'WRITE_APPEND' | 'WRITE_EMPTY';
  labels?: { [key: string]: string };
}

export class BigQueryWeddingDataWarehouse implements DataWarehouseConnector {
  private bigquery: BigQuery;
  private config: BigQueryConfig;
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private connectionPool: Map<string, BigQuery> = new Map();

  constructor(config: BigQueryConfig) {
    this.config = config;
    this.bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      location: config.location,
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection by running a simple query
      const query = `SELECT 1 as test_connection`;
      const [rows] = await this.bigquery.query({
        query,
        location: this.config.location,
      });

      // Ensure dataset exists
      await this.ensureDatasetExists();

      // Create wedding-specific tables and views
      await this.createWeddingSchema();

      // Set up data quality monitoring
      await this.createDataQualityMonitoring();

      // Create materialized views for performance
      await this.createMaterializedViews();

      this.isConnected = true;
      console.log('BigQuery Wedding Data Warehouse connected successfully');
    } catch (error) {
      console.error('Failed to connect to BigQuery:', error);
      throw new Error(`BigQuery connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.connectionPool.clear();
    console.log('BigQuery Wedding Data Warehouse disconnected');
  }

  async syncData(request: DataSynchronizationRequest): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('BigQuery connection not established');
    }

    try {
      const { data, targetTable, syncMode } = request;
      const tableName = `${this.config.tablePrefix}_${targetTable}`;

      // Transform wedding data for BigQuery format
      const transformedData = await this.transformWeddingData(data);

      // Validate data quality before insertion
      const validationResult = await this.validateData(
        transformedData,
        targetTable,
      );
      if (!validationResult.isValid) {
        throw new Error(
          `Data validation failed: ${validationResult.errors.join(', ')}`,
        );
      }

      // Insert data into BigQuery
      await this.insertData(tableName, transformedData, syncMode);

      // Update data lineage and metadata
      await this.updateDataLineage(tableName, request);

      // Trigger downstream processes
      await this.triggerDownstreamProcessing(tableName, transformedData.length);

      return true;
    } catch (error) {
      console.error('BigQuery data synchronization failed:', error);
      await this.logError('SYNC_FAILED', error as Error, request);
      return false;
    }
  }

  async createReport(
    reportType: string,
    parameters: any,
  ): Promise<WeddingReportData> {
    if (!this.isConnected) {
      throw new Error('BigQuery connection not established');
    }

    try {
      const reportQuery = this.buildReportQuery(reportType, parameters);
      const [rows] = await this.bigquery.query({
        query: reportQuery,
        location: this.config.location,
        labels: {
          report_type: reportType,
          generated_by: 'wedsync_reporting',
        },
      });

      const reportData: WeddingReportData = {
        reportId: `bigquery_${reportType}_${Date.now()}`,
        reportType,
        generatedAt: new Date(),
        data: rows,
        metadata: {
          source: 'BigQuery Wedding Data Warehouse',
          rowCount: rows.length,
          parameters,
          executionTime: Date.now(),
        },
      };

      // Cache report for performance
      await this.cacheReport(reportData);

      return reportData;
    } catch (error) {
      console.error('BigQuery report generation failed:', error);
      throw new Error(`Report generation failed: ${error}`);
    }
  }

  async executeQuery(query: string, parameters?: any[]): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('BigQuery connection not established');
    }

    try {
      // Add safety checks for query
      this.validateQuery(query);

      const [rows] = await this.bigquery.query({
        query,
        params: parameters,
        location: this.config.location,
      });

      return rows;
    } catch (error) {
      console.error('BigQuery query execution failed:', error);
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  async getHealthStatus(): Promise<IntegrationHealthStatus> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const testQuery = `SELECT COUNT(*) as table_count 
                        FROM \`${this.config.projectId}.${this.config.datasetId}.INFORMATION_SCHEMA.TABLES\``;
      await this.bigquery.query({
        query: testQuery,
        location: this.config.location,
      });

      // Check table health
      const tableHealth = await this.checkTableHealth();

      // Check data quality metrics
      const dataQuality = await this.checkDataQuality();

      // Check ETL job statuses
      const etlStatus = await this.checkETLJobStatus();

      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();

      return {
        isHealthy:
          tableHealth.isHealthy && dataQuality.isHealthy && etlStatus.isHealthy,
        lastChecked: this.lastHealthCheck,
        responseTimeMs: responseTime,
        details: {
          connection: 'Connected',
          tableHealth: tableHealth.details,
          dataQuality: dataQuality.details,
          etlJobs: etlStatus.details,
          lastDataSync: await this.getLastSyncTime(),
        },
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async ensureDatasetExists(): Promise<void> {
    const dataset = this.bigquery.dataset(this.config.datasetId);
    const [exists] = await dataset.exists();

    if (!exists) {
      await dataset.create({
        location: this.config.location,
        metadata: {
          description: 'WedSync Wedding Industry Data Warehouse',
          labels: {
            environment: 'production',
            application: 'wedsync',
            team: 'data-engineering',
          },
        },
      });
    }
  }

  private async createWeddingSchema(): Promise<void> {
    const schemas: BigQueryTableSchema[] = [
      {
        name: 'dim_suppliers',
        fields: [
          {
            name: 'supplier_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Unique supplier identifier',
          },
          {
            name: 'business_name',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Supplier business name',
          },
          {
            name: 'supplier_type',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Type of wedding service',
          },
          {
            name: 'location',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Primary business location',
          },
          {
            name: 'rating',
            type: 'FLOAT',
            mode: 'NULLABLE',
            description: 'Average customer rating',
          },
          {
            name: 'years_in_business',
            type: 'INTEGER',
            mode: 'NULLABLE',
            description: 'Years in wedding industry',
          },
          {
            name: 'pricing_tier',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Budget, Mid-range, Luxury',
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Record creation timestamp',
          },
          {
            name: 'updated_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Last update timestamp',
          },
        ],
        clustering: ['supplier_type', 'location'],
      },
      {
        name: 'dim_couples',
        fields: [
          {
            name: 'couple_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Unique couple identifier',
          },
          {
            name: 'partner1_name',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'First partner name',
          },
          {
            name: 'partner2_name',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Second partner name',
          },
          {
            name: 'wedding_date',
            type: 'DATE',
            mode: 'NULLABLE',
            description: 'Planned wedding date',
          },
          {
            name: 'wedding_location',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Wedding venue location',
          },
          {
            name: 'guest_count',
            type: 'INTEGER',
            mode: 'NULLABLE',
            description: 'Expected number of guests',
          },
          {
            name: 'budget_total',
            type: 'FLOAT',
            mode: 'NULLABLE',
            description: 'Total wedding budget',
          },
          {
            name: 'wedding_style',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Wedding theme/style',
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Record creation timestamp',
          },
          {
            name: 'updated_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Last update timestamp',
          },
        ],
        timePartitioning: {
          type: 'DAY',
          field: 'wedding_date',
        },
        clustering: ['wedding_location', 'wedding_style'],
      },
      {
        name: 'fact_bookings',
        fields: [
          {
            name: 'booking_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Unique booking identifier',
          },
          {
            name: 'couple_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to couple',
          },
          {
            name: 'supplier_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to supplier',
          },
          {
            name: 'booking_date',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'When booking was made',
          },
          {
            name: 'service_date',
            type: 'DATE',
            mode: 'REQUIRED',
            description: 'Date service will be provided',
          },
          {
            name: 'booking_status',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Current booking status',
          },
          {
            name: 'contract_value',
            type: 'FLOAT',
            mode: 'NULLABLE',
            description: 'Total contract value',
          },
          {
            name: 'deposit_amount',
            type: 'FLOAT',
            mode: 'NULLABLE',
            description: 'Deposit paid',
          },
          {
            name: 'commission_rate',
            type: 'FLOAT',
            mode: 'NULLABLE',
            description: 'Platform commission rate',
          },
          {
            name: 'lead_source',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'How customer found supplier',
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Record creation timestamp',
          },
          {
            name: 'updated_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Last update timestamp',
          },
        ],
        timePartitioning: {
          type: 'DAY',
          field: 'booking_date',
        },
        clustering: ['booking_status', 'supplier_id'],
      },
      {
        name: 'fact_revenue',
        fields: [
          {
            name: 'revenue_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Unique revenue record identifier',
          },
          {
            name: 'booking_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to booking',
          },
          {
            name: 'supplier_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to supplier',
          },
          {
            name: 'revenue_date',
            type: 'DATE',
            mode: 'REQUIRED',
            description: 'Date revenue was recognized',
          },
          {
            name: 'revenue_type',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Commission, Subscription, etc.',
          },
          {
            name: 'gross_amount',
            type: 'FLOAT',
            mode: 'REQUIRED',
            description: 'Gross revenue amount',
          },
          {
            name: 'net_amount',
            type: 'FLOAT',
            mode: 'REQUIRED',
            description: 'Net revenue after costs',
          },
          {
            name: 'currency',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Revenue currency',
          },
          {
            name: 'payment_method',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'How payment was made',
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Record creation timestamp',
          },
        ],
        timePartitioning: {
          type: 'DAY',
          field: 'revenue_date',
        },
        clustering: ['revenue_type', 'supplier_id'],
      },
      {
        name: 'fact_customer_satisfaction',
        fields: [
          {
            name: 'satisfaction_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Unique satisfaction record ID',
          },
          {
            name: 'booking_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to booking',
          },
          {
            name: 'couple_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to couple',
          },
          {
            name: 'supplier_id',
            type: 'STRING',
            mode: 'REQUIRED',
            description: 'Reference to supplier',
          },
          {
            name: 'survey_date',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'When survey was completed',
          },
          {
            name: 'overall_rating',
            type: 'INTEGER',
            mode: 'REQUIRED',
            description: 'Overall satisfaction rating 1-5',
          },
          {
            name: 'communication_rating',
            type: 'INTEGER',
            mode: 'NULLABLE',
            description: 'Communication rating 1-5',
          },
          {
            name: 'quality_rating',
            type: 'INTEGER',
            mode: 'NULLABLE',
            description: 'Service quality rating 1-5',
          },
          {
            name: 'value_rating',
            type: 'INTEGER',
            mode: 'NULLABLE',
            description: 'Value for money rating 1-5',
          },
          {
            name: 'would_recommend',
            type: 'BOOLEAN',
            mode: 'NULLABLE',
            description: 'Would recommend to others',
          },
          {
            name: 'feedback_text',
            type: 'STRING',
            mode: 'NULLABLE',
            description: 'Open feedback text',
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP',
            mode: 'REQUIRED',
            description: 'Record creation timestamp',
          },
        ],
        timePartitioning: {
          type: 'DAY',
          field: 'survey_date',
        },
        clustering: ['supplier_id', 'overall_rating'],
      },
    ];

    for (const schema of schemas) {
      await this.createTable(schema);
    }
  }

  private async createTable(schema: BigQueryTableSchema): Promise<void> {
    const tableName = `${this.config.tablePrefix}_${schema.name}`;
    const dataset = this.bigquery.dataset(this.config.datasetId);
    const table = dataset.table(tableName);

    const [exists] = await table.exists();
    if (exists) return;

    const options: any = {
      schema: { fields: schema.fields },
      labels: {
        environment: 'production',
        application: 'wedsync',
        table_type: schema.name.startsWith('dim_') ? 'dimension' : 'fact',
      },
    };

    if (schema.timePartitioning) {
      options.timePartitioning = schema.timePartitioning;
    }

    if (schema.clustering) {
      options.clustering = { fields: schema.clustering };
    }

    await table.create(options);
    console.log(`Created BigQuery table: ${tableName}`);
  }

  private async createDataQualityMonitoring(): Promise<void> {
    // Create data quality monitoring views and procedures
    const qualityChecks = [
      {
        name: 'data_quality_supplier_checks',
        query: `
          CREATE OR REPLACE VIEW \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_data_quality_supplier_checks\` AS
          SELECT 
            'supplier_duplicates' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM (
            SELECT supplier_id, COUNT(*) as duplicate_count
            FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\`
            GROUP BY supplier_id
            HAVING COUNT(*) > 1
          )
          UNION ALL
          SELECT 
            'supplier_missing_required_fields' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\`
          WHERE business_name IS NULL OR supplier_type IS NULL
          UNION ALL
          SELECT 
            'supplier_invalid_ratings' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\`
          WHERE rating < 1 OR rating > 5
        `,
      },
      {
        name: 'data_quality_booking_checks',
        query: `
          CREATE OR REPLACE VIEW \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_data_quality_booking_checks\` AS
          SELECT 
            'booking_future_service_dates' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\`
          WHERE service_date < CURRENT_DATE()
          UNION ALL
          SELECT 
            'booking_negative_amounts' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\`
          WHERE contract_value < 0 OR deposit_amount < 0
          UNION ALL
          SELECT 
            'booking_orphaned_records' as check_name,
            COUNT(*) as issue_count,
            CURRENT_TIMESTAMP() as last_check
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\` b
          LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\` s
            ON b.supplier_id = s.supplier_id
          LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_couples\` c
            ON b.couple_id = c.couple_id
          WHERE s.supplier_id IS NULL OR c.couple_id IS NULL
        `,
      },
    ];

    for (const check of qualityChecks) {
      try {
        await this.bigquery.query({
          query: check.query,
          location: this.config.location,
        });
        console.log(`Created data quality check: ${check.name}`);
      } catch (error) {
        console.error(
          `Failed to create data quality check ${check.name}:`,
          error,
        );
      }
    }
  }

  private async createMaterializedViews(): Promise<void> {
    const materializedViews = [
      {
        name: 'mv_supplier_performance_summary',
        query: `
          CREATE MATERIALIZED VIEW \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_mv_supplier_performance_summary\`
          PARTITION BY DATE(booking_month)
          CLUSTER BY supplier_id, supplier_type
          AS
          SELECT 
            s.supplier_id,
            s.business_name,
            s.supplier_type,
            DATE_TRUNC(b.service_date, MONTH) as booking_month,
            COUNT(DISTINCT b.booking_id) as total_bookings,
            SUM(b.contract_value) as total_contract_value,
            AVG(b.contract_value) as avg_contract_value,
            AVG(cs.overall_rating) as avg_rating,
            COUNT(DISTINCT b.couple_id) as unique_customers,
            SUM(CASE WHEN b.booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
            SUM(CASE WHEN cs.would_recommend = true THEN 1 ELSE 0 END) as recommendations,
            CURRENT_TIMESTAMP() as last_updated
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\` s
          LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\` b
            ON s.supplier_id = b.supplier_id
          LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_customer_satisfaction\` cs
            ON b.booking_id = cs.booking_id
          WHERE b.service_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)
          GROUP BY 1,2,3,4
        `,
      },
      {
        name: 'mv_revenue_analytics',
        query: `
          CREATE MATERIALIZED VIEW \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_mv_revenue_analytics\`
          PARTITION BY revenue_date
          CLUSTER BY revenue_type, supplier_id
          AS
          SELECT 
            revenue_date,
            revenue_type,
            supplier_id,
            COUNT(DISTINCT revenue_id) as transaction_count,
            SUM(gross_amount) as total_gross_revenue,
            SUM(net_amount) as total_net_revenue,
            AVG(gross_amount) as avg_transaction_value,
            SUM(gross_amount) - SUM(net_amount) as total_costs,
            CURRENT_TIMESTAMP() as last_updated
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_revenue\`
          GROUP BY 1,2,3
        `,
      },
    ];

    for (const mv of materializedViews) {
      try {
        await this.bigquery.query({
          query: mv.query,
          location: this.config.location,
        });
        console.log(`Created materialized view: ${mv.name}`);
      } catch (error) {
        console.error(`Failed to create materialized view ${mv.name}:`, error);
      }
    }
  }

  private async transformWeddingData(data: any[]): Promise<any[]> {
    return data.map((record) => ({
      ...record,
      // Ensure proper data types for BigQuery
      created_at: new Date(record.created_at || Date.now()).toISOString(),
      updated_at: new Date(record.updated_at || Date.now()).toISOString(),
      // Handle BigQuery-specific transformations
      ...(record.wedding_date && {
        wedding_date: new Date(record.wedding_date).toISOString().split('T')[0],
      }),
      ...(record.service_date && {
        service_date: new Date(record.service_date).toISOString().split('T')[0],
      }),
      // Ensure numeric fields are properly typed
      ...(record.contract_value && {
        contract_value: parseFloat(record.contract_value),
      }),
      ...(record.rating && { rating: parseFloat(record.rating) }),
      ...(record.guest_count && { guest_count: parseInt(record.guest_count) }),
    }));
  }

  private async insertData(
    tableName: string,
    data: any[],
    syncMode: string,
  ): Promise<void> {
    const table = this.bigquery.dataset(this.config.datasetId).table(tableName);

    const insertOptions: any = {
      createInsertId: true,
      skipInvalidRows: false,
      ignoreUnknownValues: false,
    };

    if (syncMode === 'replace') {
      insertOptions.writeDisposition = 'WRITE_TRUNCATE';
    } else {
      insertOptions.writeDisposition = 'WRITE_APPEND';
    }

    await table.insert(data, insertOptions);
    console.log(`Inserted ${data.length} rows into ${tableName}`);
  }

  private buildReportQuery(reportType: string, parameters: any): string {
    const reportQueries: { [key: string]: string } = {
      supplier_performance: `
        SELECT 
          s.business_name,
          s.supplier_type,
          COUNT(DISTINCT b.booking_id) as total_bookings,
          AVG(cs.overall_rating) as avg_rating,
          SUM(b.contract_value) as total_revenue,
          COUNT(DISTINCT CASE WHEN cs.would_recommend THEN b.booking_id END) as recommendations
        FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\` s
        LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\` b ON s.supplier_id = b.supplier_id
        LEFT JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_customer_satisfaction\` cs ON b.booking_id = cs.booking_id
        WHERE b.service_date BETWEEN @start_date AND @end_date
        GROUP BY s.business_name, s.supplier_type
        ORDER BY total_revenue DESC
        LIMIT 100
      `,
      revenue_analysis: `
        SELECT 
          DATE_TRUNC(revenue_date, ${parameters.groupBy || 'MONTH'}) as period,
          revenue_type,
          SUM(gross_amount) as total_gross,
          SUM(net_amount) as total_net,
          COUNT(DISTINCT revenue_id) as transaction_count,
          AVG(gross_amount) as avg_transaction_value
        FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_revenue\`
        WHERE revenue_date BETWEEN @start_date AND @end_date
        GROUP BY period, revenue_type
        ORDER BY period DESC, total_gross DESC
      `,
      customer_satisfaction: `
        SELECT 
          s.supplier_type,
          AVG(cs.overall_rating) as avg_overall_rating,
          AVG(cs.communication_rating) as avg_communication_rating,
          AVG(cs.quality_rating) as avg_quality_rating,
          AVG(cs.value_rating) as avg_value_rating,
          COUNT(CASE WHEN cs.would_recommend THEN 1 END) / COUNT(*) as recommendation_rate,
          COUNT(*) as total_responses
        FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_customer_satisfaction\` cs
        JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\` b ON cs.booking_id = b.booking_id
        JOIN \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\` s ON b.supplier_id = s.supplier_id
        WHERE cs.survey_date BETWEEN @start_date AND @end_date
        GROUP BY s.supplier_type
        ORDER BY avg_overall_rating DESC
      `,
    };

    return reportQueries[reportType] || reportQueries.supplier_performance;
  }

  private async validateData(
    data: any[],
    targetTable: string,
  ): Promise<DataValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation rules
    for (let i = 0; i < data.length; i++) {
      const record = data[i];

      // Check required fields based on table
      if (targetTable.includes('suppliers')) {
        if (!record.supplier_id) errors.push(`Row ${i}: Missing supplier_id`);
        if (!record.business_name)
          errors.push(`Row ${i}: Missing business_name`);
        if (!record.supplier_type)
          errors.push(`Row ${i}: Missing supplier_type`);
      }

      if (targetTable.includes('bookings')) {
        if (!record.booking_id) errors.push(`Row ${i}: Missing booking_id`);
        if (!record.couple_id) errors.push(`Row ${i}: Missing couple_id`);
        if (!record.supplier_id) errors.push(`Row ${i}: Missing supplier_id`);
        if (record.contract_value < 0)
          warnings.push(`Row ${i}: Negative contract value`);
      }

      // Data type validations
      if (record.rating && (record.rating < 1 || record.rating > 5)) {
        warnings.push(`Row ${i}: Rating outside valid range (1-5)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  private validateQuery(query: string): void {
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+OR\s+REPLACE\s+TABLE/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(
          `Query contains potentially dangerous pattern: ${pattern}`,
        );
      }
    }
  }

  private async updateDataLineage(
    tableName: string,
    request: DataSynchronizationRequest,
  ): Promise<void> {
    // Log data lineage for audit and debugging
    console.log(`Data lineage updated for ${tableName}:`, {
      sourceSystem: request.sourceSystem,
      recordCount: Array.isArray(request.data) ? request.data.length : 1,
      syncMode: request.syncMode,
      timestamp: new Date().toISOString(),
    });
  }

  private async triggerDownstreamProcessing(
    tableName: string,
    recordCount: number,
  ): Promise<void> {
    // Refresh materialized views if needed
    if (tableName.includes('fact_') && recordCount > 1000) {
      await this.refreshMaterializedViews();
    }

    // Update table statistics
    await this.updateTableStatistics(tableName);
  }

  private async refreshMaterializedViews(): Promise<void> {
    const views = [
      `${this.config.tablePrefix}_mv_supplier_performance_summary`,
      `${this.config.tablePrefix}_mv_revenue_analytics`,
    ];

    for (const viewName of views) {
      try {
        const refreshQuery = `
          CALL BQ.REFRESH_MATERIALIZED_VIEW('${this.config.projectId}.${this.config.datasetId}.${viewName}')
        `;
        await this.bigquery.query({
          query: refreshQuery,
          location: this.config.location,
        });
        console.log(`Refreshed materialized view: ${viewName}`);
      } catch (error) {
        console.error(
          `Failed to refresh materialized view ${viewName}:`,
          error,
        );
      }
    }
  }

  private async updateTableStatistics(tableName: string): Promise<void> {
    try {
      // Update table statistics for query optimization
      const statsQuery = `
        ANALYZE TABLE \`${this.config.projectId}.${this.config.datasetId}.${tableName}\`
      `;
      await this.bigquery.query({
        query: statsQuery,
        location: this.config.location,
      });
    } catch (error) {
      // Statistics update is not critical
      console.log(`Statistics update for ${tableName} skipped:`, error);
    }
  }

  private async checkTableHealth(): Promise<{
    isHealthy: boolean;
    details: any;
  }> {
    try {
      const healthQuery = `
        SELECT 
          table_name,
          row_count,
          size_bytes,
          last_modified_time,
          type
        FROM \`${this.config.projectId}.${this.config.datasetId}.__TABLES__\`
        WHERE table_id LIKE '${this.config.tablePrefix}_%'
      `;

      const [results] = await this.bigquery.query({
        query: healthQuery,
        location: this.config.location,
      });

      return {
        isHealthy: results.length > 0,
        details: {
          tableCount: results.length,
          tables: results.map((table: any) => ({
            name: table.table_name,
            rowCount: parseInt(table.row_count),
            sizeBytes: parseInt(table.size_bytes),
            lastModified: new Date(
              parseInt(table.last_modified_time),
            ).toISOString(),
          })),
        },
      };
    } catch (error) {
      return {
        isHealthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async checkDataQuality(): Promise<{
    isHealthy: boolean;
    details: any;
  }> {
    try {
      const qualityQueries = [
        `SELECT * FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_data_quality_supplier_checks\``,
        `SELECT * FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_data_quality_booking_checks\``,
      ];

      const qualityResults = [];
      for (const query of qualityQueries) {
        try {
          const [results] = await this.bigquery.query({
            query,
            location: this.config.location,
          });
          qualityResults.push(...results);
        } catch (error) {
          // Quality check views might not exist yet
          console.log('Quality check skipped:', error);
        }
      }

      const totalIssues = qualityResults.reduce(
        (sum, result) => sum + (result.issue_count || 0),
        0,
      );

      return {
        isHealthy: totalIssues < 100, // Threshold for acceptable data quality issues
        details: {
          totalIssues,
          checks: qualityResults,
        },
      };
    } catch (error) {
      return {
        isHealthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async checkETLJobStatus(): Promise<{
    isHealthy: boolean;
    details: any;
  }> {
    // For now, return healthy as ETL jobs are handled elsewhere
    // In production, this would check BigQuery transfer jobs or similar
    return {
      isHealthy: true,
      details: {
        message: 'ETL job monitoring not implemented yet',
      },
    };
  }

  private async getLastSyncTime(): Promise<string> {
    try {
      const query = `
        SELECT MAX(created_at) as last_sync
        FROM (
          SELECT MAX(created_at) as created_at FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_dim_suppliers\`
          UNION ALL
          SELECT MAX(created_at) as created_at FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_bookings\`
          UNION ALL
          SELECT MAX(created_at) as created_at FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tablePrefix}_fact_revenue\`
        )
      `;

      const [results] = await this.bigquery.query({
        query,
        location: this.config.location,
      });

      return results[0]?.last_sync || 'Unknown';
    } catch (error) {
      return 'Error retrieving sync time';
    }
  }

  private async cacheReport(reportData: WeddingReportData): Promise<void> {
    // In production, this would cache to Redis or similar
    console.log(`Report cached: ${reportData.reportId}`);
  }

  private async logError(
    errorType: string,
    error: Error,
    context?: any,
  ): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorType,
      message: error.message,
      stack: error.stack,
      context,
      component: 'BigQueryWeddingDataWarehouse',
    };

    console.error('BigQuery Integration Error:', errorLog);

    // In production, this would send to error tracking service
  }
}
