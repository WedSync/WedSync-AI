import { Client } from 'pg';
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

export interface RedshiftConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  tablePrefix: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  workloadManagementQueue?: string;
}

export interface RedshiftTableSchema {
  name: string;
  columns: {
    name: string;
    type:
      | 'varchar'
      | 'integer'
      | 'bigint'
      | 'decimal'
      | 'float'
      | 'boolean'
      | 'date'
      | 'timestamp'
      | 'char'
      | 'text';
    length?: number;
    precision?: number;
    scale?: number;
    nullable: boolean;
    primaryKey?: boolean;
    sortKey?: boolean;
    distKey?: boolean;
    encode?:
      | 'auto'
      | 'bytedict'
      | 'delta'
      | 'delta32k'
      | 'lzo'
      | 'mostly8'
      | 'mostly16'
      | 'mostly32'
      | 'raw'
      | 'runlength'
      | 'text255'
      | 'text32k'
      | 'zstd';
    description?: string;
  }[];
  sortKeys?: string[];
  distStyle?: 'auto' | 'even' | 'key' | 'all';
  distKey?: string;
}

export interface RedshiftETLProcess {
  name: string;
  sourceTable: string;
  targetTable: string;
  transformQuery: string;
  schedule: string;
  dependsOn?: string[];
  retryAttempts: number;
  enabled: boolean;
}

export class RedshiftWeddingDataWarehouse implements DataWarehouseConnector {
  private client: Client;
  private config: RedshiftConfig;
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private connectionPool: Client[] = [];

  constructor(config: RedshiftConfig) {
    this.config = config;
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectionTimeoutMillis: config.connectionTimeoutMs,
      query_timeout: config.queryTimeoutMs,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();

      // Set session parameters for optimal wedding data processing
      await this.setSessionParameters();

      // Ensure schema exists
      await this.ensureSchemaExists();

      // Create wedding-specific tables and views
      await this.createWeddingSchema();

      // Set up data quality monitoring
      await this.createDataQualityViews();

      // Create optimized materialized views
      await this.createMaterializedViews();

      // Set up stored procedures for common operations
      await this.createStoredProcedures();

      this.isConnected = true;
      console.log('Redshift Wedding Data Warehouse connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redshift:', error);
      throw new Error(`Redshift connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();

      // Close connection pool
      for (const conn of this.connectionPool) {
        await conn.end();
      }
      this.connectionPool = [];

      this.isConnected = false;
      console.log('Redshift Wedding Data Warehouse disconnected');
    } catch (error) {
      console.error('Error disconnecting from Redshift:', error);
    }
  }

  async syncData(request: DataSynchronizationRequest): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redshift connection not established');
    }

    try {
      const { data, targetTable, syncMode } = request;
      const tableName = `${this.config.schema}.${this.config.tablePrefix}_${targetTable}`;

      // Transform wedding data for Redshift format
      const transformedData = await this.transformWeddingData(
        data,
        targetTable,
      );

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

      // Use appropriate sync strategy
      if (syncMode === 'replace') {
        await this.replaceTableData(tableName, transformedData);
      } else {
        await this.appendTableData(tableName, transformedData);
      }

      // Update table statistics for query optimization
      await this.analyzeTable(tableName);

      // Log data lineage
      await this.updateDataLineage(tableName, request);

      return true;
    } catch (error) {
      console.error('Redshift data synchronization failed:', error);
      await this.logError('SYNC_FAILED', error as Error, request);
      return false;
    }
  }

  async createReport(
    reportType: string,
    parameters: any,
  ): Promise<WeddingReportData> {
    if (!this.isConnected) {
      throw new Error('Redshift connection not established');
    }

    try {
      const reportQuery = this.buildReportQuery(reportType, parameters);
      const startTime = Date.now();

      // Set query group for workload management
      if (this.config.workloadManagementQueue) {
        await this.client.query(
          `SET query_group TO '${this.config.workloadManagementQueue}';`,
        );
      }

      const result = await this.client.query(
        reportQuery,
        parameters.queryParams || [],
      );
      const executionTime = Date.now() - startTime;

      const reportData: WeddingReportData = {
        reportId: `redshift_${reportType}_${Date.now()}`,
        reportType,
        generatedAt: new Date(),
        data: result.rows,
        metadata: {
          source: 'Redshift Wedding Data Warehouse',
          rowCount: result.rows.length,
          parameters,
          executionTime,
          queryPlan: await this.getQueryPlan(reportQuery),
        },
      };

      // Cache report for performance
      await this.cacheReport(reportData);

      return reportData;
    } catch (error) {
      console.error('Redshift report generation failed:', error);
      throw new Error(`Report generation failed: ${error}`);
    }
  }

  async executeQuery(query: string, parameters?: any[]): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('Redshift connection not established');
    }

    try {
      // Add safety checks for query
      this.validateQuery(query);

      const result = await this.client.query(query, parameters);
      return result.rows;
    } catch (error) {
      console.error('Redshift query execution failed:', error);
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  async getHealthStatus(): Promise<IntegrationHealthStatus> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await this.client.query('SELECT 1 as health_check');

      // Check cluster health
      const clusterHealth = await this.checkClusterHealth();

      // Check table health
      const tableHealth = await this.checkTableHealth();

      // Check data quality metrics
      const dataQuality = await this.checkDataQuality();

      // Check query performance
      const queryPerformance = await this.checkQueryPerformance();

      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();

      return {
        isHealthy:
          clusterHealth.isHealthy &&
          tableHealth.isHealthy &&
          dataQuality.isHealthy,
        lastChecked: this.lastHealthCheck,
        responseTimeMs: responseTime,
        details: {
          connection: 'Connected',
          cluster: clusterHealth.details,
          tables: tableHealth.details,
          dataQuality: dataQuality.details,
          performance: queryPerformance,
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

  private async setSessionParameters(): Promise<void> {
    const sessionSettings = [
      'SET enable_user_activity_logging TO true',
      "SET query_group TO 'wedsync_reporting'",
      "SET statement_timeout TO '30min'",
      'SET wlm_query_slot_count TO 2',
    ];

    for (const setting of sessionSettings) {
      try {
        await this.client.query(setting);
      } catch (error) {
        console.log(`Session parameter setting skipped: ${setting}`, error);
      }
    }
  }

  private async ensureSchemaExists(): Promise<void> {
    const createSchemaQuery = `
      CREATE SCHEMA IF NOT EXISTS ${this.config.schema}
      AUTHORIZATION ${this.config.user}
    `;

    await this.client.query(createSchemaQuery);

    // Set default schema for session
    await this.client.query(`SET search_path TO ${this.config.schema}, public`);
  }

  private async createWeddingSchema(): Promise<void> {
    const schemas: RedshiftTableSchema[] = [
      {
        name: 'dim_suppliers',
        columns: [
          {
            name: 'supplier_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: true,
            sortKey: true,
            encode: 'lzo',
          },
          {
            name: 'business_name',
            type: 'varchar',
            length: 255,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'supplier_type',
            type: 'varchar',
            length: 100,
            nullable: false,
            sortKey: true,
            encode: 'bytedict',
          },
          {
            name: 'location',
            type: 'varchar',
            length: 255,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'years_in_business',
            type: 'integer',
            nullable: true,
            encode: 'delta32k',
          },
          {
            name: 'pricing_tier',
            type: 'varchar',
            length: 50,
            nullable: true,
            encode: 'bytedict',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: 20,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'email',
            type: 'varchar',
            length: 255,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'website',
            type: 'varchar',
            length: 500,
            nullable: true,
            encode: 'lzo',
          },
          { name: 'description', type: 'text', nullable: true, encode: 'lzo' },
          {
            name: 'is_active',
            type: 'boolean',
            nullable: false,
            encode: 'runlength',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
        ],
        sortKeys: ['supplier_id', 'supplier_type'],
        distStyle: 'key',
        distKey: 'supplier_id',
      },
      {
        name: 'dim_couples',
        columns: [
          {
            name: 'couple_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: true,
            sortKey: true,
            encode: 'lzo',
          },
          {
            name: 'partner1_name',
            type: 'varchar',
            length: 255,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'partner2_name',
            type: 'varchar',
            length: 255,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'wedding_date',
            type: 'date',
            nullable: true,
            sortKey: true,
            encode: 'delta32k',
          },
          {
            name: 'wedding_location',
            type: 'varchar',
            length: 500,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'guest_count',
            type: 'integer',
            nullable: true,
            encode: 'delta32k',
          },
          {
            name: 'budget_total',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'wedding_style',
            type: 'varchar',
            length: 100,
            nullable: true,
            encode: 'bytedict',
          },
          {
            name: 'email_primary',
            type: 'varchar',
            length: 255,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'phone_primary',
            type: 'varchar',
            length: 20,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'is_active',
            type: 'boolean',
            nullable: false,
            encode: 'runlength',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
        ],
        sortKeys: ['couple_id', 'wedding_date'],
        distStyle: 'key',
        distKey: 'couple_id',
      },
      {
        name: 'fact_bookings',
        columns: [
          {
            name: 'booking_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: true,
            sortKey: true,
            encode: 'lzo',
          },
          {
            name: 'couple_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'booking_date',
            type: 'timestamp',
            nullable: false,
            sortKey: true,
            encode: 'delta32k',
          },
          {
            name: 'service_date',
            type: 'date',
            nullable: false,
            sortKey: true,
            encode: 'delta32k',
          },
          {
            name: 'booking_status',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'bytedict',
          },
          {
            name: 'contract_value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'deposit_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'commission_rate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'commission_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'lead_source',
            type: 'varchar',
            length: 100,
            nullable: true,
            encode: 'bytedict',
          },
          {
            name: 'booking_channel',
            type: 'varchar',
            length: 50,
            nullable: true,
            encode: 'bytedict',
          },
          { name: 'notes', type: 'text', nullable: true, encode: 'lzo' },
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
        ],
        sortKeys: ['booking_date', 'service_date', 'booking_id'],
        distStyle: 'key',
        distKey: 'booking_id',
      },
      {
        name: 'fact_revenue',
        columns: [
          {
            name: 'revenue_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: true,
            sortKey: true,
            encode: 'lzo',
          },
          {
            name: 'booking_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'revenue_date',
            type: 'date',
            nullable: false,
            sortKey: true,
            encode: 'delta32k',
          },
          {
            name: 'revenue_type',
            type: 'varchar',
            length: 50,
            nullable: false,
            sortKey: true,
            encode: 'bytedict',
          },
          {
            name: 'gross_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: false,
            encode: 'delta',
          },
          {
            name: 'net_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: false,
            encode: 'delta',
          },
          {
            name: 'tax_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'currency',
            type: 'char',
            length: 3,
            nullable: false,
            encode: 'bytedict',
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: 50,
            nullable: true,
            encode: 'bytedict',
          },
          {
            name: 'transaction_id',
            type: 'varchar',
            length: 100,
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
        ],
        sortKeys: ['revenue_date', 'revenue_type', 'supplier_id'],
        distStyle: 'key',
        distKey: 'revenue_id',
      },
      {
        name: 'fact_customer_satisfaction',
        columns: [
          {
            name: 'satisfaction_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            primaryKey: true,
            sortKey: true,
            encode: 'lzo',
          },
          {
            name: 'booking_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'couple_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: 50,
            nullable: false,
            encode: 'lzo',
          },
          {
            name: 'survey_date',
            type: 'timestamp',
            nullable: false,
            sortKey: true,
            encode: 'delta32k',
          },
          {
            name: 'overall_rating',
            type: 'integer',
            nullable: false,
            encode: 'mostly8',
          },
          {
            name: 'communication_rating',
            type: 'integer',
            nullable: true,
            encode: 'mostly8',
          },
          {
            name: 'quality_rating',
            type: 'integer',
            nullable: true,
            encode: 'mostly8',
          },
          {
            name: 'value_rating',
            type: 'integer',
            nullable: true,
            encode: 'mostly8',
          },
          {
            name: 'timeliness_rating',
            type: 'integer',
            nullable: true,
            encode: 'mostly8',
          },
          {
            name: 'would_recommend',
            type: 'boolean',
            nullable: true,
            encode: 'runlength',
          },
          {
            name: 'feedback_text',
            type: 'text',
            nullable: true,
            encode: 'lzo',
          },
          {
            name: 'sentiment_score',
            type: 'decimal',
            precision: 3,
            scale: 2,
            nullable: true,
            encode: 'delta',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: false,
            encode: 'delta32k',
          },
        ],
        sortKeys: ['survey_date', 'supplier_id', 'overall_rating'],
        distStyle: 'key',
        distKey: 'satisfaction_id',
      },
    ];

    for (const schema of schemas) {
      await this.createTable(schema);
    }
  }

  private async createTable(schema: RedshiftTableSchema): Promise<void> {
    const tableName = `${this.config.tablePrefix}_${schema.name}`;

    // Check if table exists
    const existsQuery = `
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = '${this.config.schema}' 
      AND table_name = '${tableName}'
    `;

    const existsResult = await this.client.query(existsQuery);
    if (existsResult.rows.length > 0) return;

    // Build CREATE TABLE statement
    const columns = schema.columns
      .map((col) => {
        let colDef = `${col.name} ${this.formatColumnType(col)}`;
        if (!col.nullable) colDef += ' NOT NULL';
        if (col.encode) colDef += ` ENCODE ${col.encode}`;
        return colDef;
      })
      .join(',\n  ');

    let createQuery = `
      CREATE TABLE ${this.config.schema}.${tableName} (
        ${columns}
      )
    `;

    // Add distribution and sort keys
    if (schema.distStyle && schema.distKey) {
      createQuery += `\nDISTSTYLE KEY\nDISTKEY (${schema.distKey})`;
    } else if (schema.distStyle) {
      createQuery += `\nDISTSTYLE ${schema.distStyle}`;
    }

    if (schema.sortKeys && schema.sortKeys.length > 0) {
      createQuery += `\nSORTKEY (${schema.sortKeys.join(', ')})`;
    }

    await this.client.query(createQuery);
    console.log(`Created Redshift table: ${tableName}`);
  }

  private formatColumnType(col: RedshiftTableSchema['columns'][0]): string {
    switch (col.type) {
      case 'varchar':
        return `VARCHAR(${col.length || 255})`;
      case 'char':
        return `CHAR(${col.length || 1})`;
      case 'decimal':
        return `DECIMAL(${col.precision || 18},${col.scale || 2})`;
      case 'integer':
        return 'INTEGER';
      case 'bigint':
        return 'BIGINT';
      case 'float':
        return 'FLOAT';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'timestamp':
        return 'TIMESTAMP';
      case 'text':
        return 'TEXT';
      default:
        return col.type.toUpperCase();
    }
  }

  private async createDataQualityViews(): Promise<void> {
    const qualityViews = [
      {
        name: 'vw_data_quality_suppliers',
        query: `
          CREATE OR REPLACE VIEW ${this.config.schema}.${this.config.tablePrefix}_vw_data_quality_suppliers AS
          SELECT 
            'duplicate_supplier_ids' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Suppliers with duplicate IDs' as description
          FROM (
            SELECT supplier_id, COUNT(*) as duplicate_count
            FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers
            GROUP BY supplier_id
            HAVING COUNT(*) > 1
          ) duplicates
          UNION ALL
          SELECT 
            'suppliers_missing_required_fields' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Suppliers missing business_name or supplier_type' as description
          FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers
          WHERE business_name IS NULL OR supplier_type IS NULL
          UNION ALL
          SELECT 
            'suppliers_invalid_ratings' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Suppliers with ratings outside valid range' as description
          FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers
          WHERE rating < 1.0 OR rating > 5.0
        `,
      },
      {
        name: 'vw_data_quality_bookings',
        query: `
          CREATE OR REPLACE VIEW ${this.config.schema}.${this.config.tablePrefix}_vw_data_quality_bookings AS
          SELECT 
            'bookings_past_service_dates' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Bookings with past service dates still pending' as description
          FROM ${this.config.schema}.${this.config.tablePrefix}_fact_bookings
          WHERE service_date < GETDATE()::date AND booking_status IN ('pending', 'confirmed')
          UNION ALL
          SELECT 
            'bookings_negative_amounts' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Bookings with negative contract or deposit amounts' as description
          FROM ${this.config.schema}.${this.config.tablePrefix}_fact_bookings
          WHERE contract_value < 0 OR deposit_amount < 0
          UNION ALL
          SELECT 
            'bookings_orphaned_records' as check_name,
            COUNT(*) as issue_count,
            GETDATE() as last_check,
            'Bookings without valid supplier or couple references' as description
          FROM ${this.config.schema}.${this.config.tablePrefix}_fact_bookings b
          LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers s ON b.supplier_id = s.supplier_id
          LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_dim_couples c ON b.couple_id = c.couple_id
          WHERE s.supplier_id IS NULL OR c.couple_id IS NULL
        `,
      },
    ];

    for (const view of qualityViews) {
      try {
        await this.client.query(view.query);
        console.log(`Created data quality view: ${view.name}`);
      } catch (error) {
        console.error(
          `Failed to create data quality view ${view.name}:`,
          error,
        );
      }
    }
  }

  private async createMaterializedViews(): Promise<void> {
    // Note: Redshift doesn't have materialized views like other databases
    // Instead, we'll create optimized tables that can be refreshed periodically
    const aggregateTables = [
      {
        name: 'agg_supplier_performance_monthly',
        query: `
          CREATE TABLE IF NOT EXISTS ${this.config.schema}.${this.config.tablePrefix}_agg_supplier_performance_monthly
          DISTKEY(supplier_id)
          SORTKEY(performance_month, supplier_id)
          AS
          SELECT 
            s.supplier_id,
            s.business_name,
            s.supplier_type,
            DATE_TRUNC('month', b.service_date) as performance_month,
            COUNT(DISTINCT b.booking_id) as total_bookings,
            SUM(b.contract_value) as total_contract_value,
            AVG(b.contract_value) as avg_contract_value,
            AVG(cs.overall_rating) as avg_rating,
            COUNT(DISTINCT b.couple_id) as unique_customers,
            SUM(CASE WHEN b.booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
            SUM(CASE WHEN cs.would_recommend = true THEN 1 ELSE 0 END) as recommendations,
            GETDATE() as last_updated
          FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers s
          LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_fact_bookings b ON s.supplier_id = b.supplier_id
          LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_fact_customer_satisfaction cs ON b.booking_id = cs.booking_id
          WHERE b.service_date >= DATEADD(year, -2, GETDATE())
          GROUP BY s.supplier_id, s.business_name, s.supplier_type, DATE_TRUNC('month', b.service_date)
        `,
      },
      {
        name: 'agg_revenue_daily',
        query: `
          CREATE TABLE IF NOT EXISTS ${this.config.schema}.${this.config.tablePrefix}_agg_revenue_daily
          DISTKEY(revenue_date)
          SORTKEY(revenue_date, revenue_type)
          AS
          SELECT 
            revenue_date,
            revenue_type,
            currency,
            COUNT(DISTINCT revenue_id) as transaction_count,
            SUM(gross_amount) as total_gross_revenue,
            SUM(net_amount) as total_net_revenue,
            AVG(gross_amount) as avg_transaction_value,
            SUM(gross_amount) - SUM(net_amount) as total_costs,
            GETDATE() as last_updated
          FROM ${this.config.schema}.${this.config.tablePrefix}_fact_revenue
          GROUP BY revenue_date, revenue_type, currency
        `,
      },
    ];

    for (const table of aggregateTables) {
      try {
        await this.client.query(table.query);
        console.log(`Created aggregate table: ${table.name}`);
      } catch (error) {
        console.error(`Failed to create aggregate table ${table.name}:`, error);
      }
    }
  }

  private async createStoredProcedures(): Promise<void> {
    const procedures = [
      {
        name: 'sp_refresh_supplier_performance_agg',
        body: `
          CREATE OR REPLACE PROCEDURE ${this.config.schema}.sp_refresh_supplier_performance_agg()
          AS $$
          BEGIN
            DELETE FROM ${this.config.schema}.${this.config.tablePrefix}_agg_supplier_performance_monthly
            WHERE performance_month >= DATE_TRUNC('month', DATEADD(month, -1, GETDATE()));
            
            INSERT INTO ${this.config.schema}.${this.config.tablePrefix}_agg_supplier_performance_monthly
            SELECT 
              s.supplier_id,
              s.business_name,
              s.supplier_type,
              DATE_TRUNC('month', b.service_date) as performance_month,
              COUNT(DISTINCT b.booking_id) as total_bookings,
              SUM(b.contract_value) as total_contract_value,
              AVG(b.contract_value) as avg_contract_value,
              AVG(cs.overall_rating) as avg_rating,
              COUNT(DISTINCT b.couple_id) as unique_customers,
              SUM(CASE WHEN b.booking_status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
              SUM(CASE WHEN cs.would_recommend = true THEN 1 ELSE 0 END) as recommendations,
              GETDATE() as last_updated
            FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers s
            LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_fact_bookings b ON s.supplier_id = b.supplier_id
            LEFT JOIN ${this.config.schema}.${this.config.tablePrefix}_fact_customer_satisfaction cs ON b.booking_id = cs.booking_id
            WHERE b.service_date >= DATE_TRUNC('month', DATEADD(month, -1, GETDATE()))
            GROUP BY s.supplier_id, s.business_name, s.supplier_type, DATE_TRUNC('month', b.service_date);
            
            COMMIT;
          END;
          $$ LANGUAGE plpgsql;
        `,
      },
    ];

    for (const proc of procedures) {
      try {
        await this.client.query(proc.body);
        console.log(`Created stored procedure: ${proc.name}`);
      } catch (error) {
        console.error(`Failed to create stored procedure ${proc.name}:`, error);
      }
    }
  }

  private async transformWeddingData(
    data: any[],
    targetTable: string,
  ): Promise<any[]> {
    return data.map((record) => {
      const transformed = { ...record };

      // Ensure proper data types for Redshift
      if (record.created_at) {
        transformed.created_at = new Date(record.created_at).toISOString();
      }
      if (record.updated_at) {
        transformed.updated_at = new Date(record.updated_at).toISOString();
      }
      if (record.wedding_date) {
        transformed.wedding_date = new Date(record.wedding_date)
          .toISOString()
          .split('T')[0];
      }
      if (record.service_date) {
        transformed.service_date = new Date(record.service_date)
          .toISOString()
          .split('T')[0];
      }

      // Ensure numeric fields are properly typed
      if (record.contract_value !== undefined) {
        transformed.contract_value = parseFloat(record.contract_value) || null;
      }
      if (record.rating !== undefined) {
        transformed.rating = parseFloat(record.rating) || null;
      }
      if (record.guest_count !== undefined) {
        transformed.guest_count = parseInt(record.guest_count) || null;
      }

      // Truncate text fields to prevent overflow
      if (record.business_name && record.business_name.length > 255) {
        transformed.business_name = record.business_name.substring(0, 255);
      }
      if (record.feedback_text && record.feedback_text.length > 65535) {
        transformed.feedback_text = record.feedback_text.substring(0, 65535);
      }

      return transformed;
    });
  }

  private async replaceTableData(
    tableName: string,
    data: any[],
  ): Promise<void> {
    await this.client.query('BEGIN');

    try {
      // Truncate table
      await this.client.query(`TRUNCATE ${tableName}`);

      // Insert new data
      await this.batchInsert(tableName, data);

      await this.client.query('COMMIT');
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }

  private async appendTableData(tableName: string, data: any[]): Promise<void> {
    await this.batchInsert(tableName, data);
  }

  private async batchInsert(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    // Use COPY command for large datasets (more efficient than INSERT)
    if (data.length > 1000) {
      await this.copyFromData(tableName, data);
    } else {
      // Use batch INSERT for smaller datasets
      await this.batchInsertRows(tableName, data);
    }
  }

  private async copyFromData(tableName: string, data: any[]): Promise<void> {
    // For production, this would use S3 staging and COPY FROM S3
    // For now, we'll use batch inserts
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this.batchInsertRows(tableName, batch);
    }
  }

  private async batchInsertRows(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const values = data.map((row) =>
      columns
        .map((col) =>
          row[col] === null || row[col] === undefined
            ? 'NULL'
            : `'${String(row[col]).replace(/'/g, "''")}'`,
        )
        .join(', '),
    );

    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${values.map((row) => `(${row})`).join(', ')}
    `;

    await this.client.query(insertQuery);
  }

  private buildReportQuery(reportType: string, parameters: any): string {
    const reportQueries: { [key: string]: string } = {
      supplier_performance: `
        SELECT 
          s.business_name,
          s.supplier_type,
          s.location,
          spa.total_bookings,
          spa.avg_rating,
          spa.total_contract_value,
          spa.recommendations,
          spa.performance_month
        FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers s
        JOIN ${this.config.schema}.${this.config.tablePrefix}_agg_supplier_performance_monthly spa
          ON s.supplier_id = spa.supplier_id
        WHERE spa.performance_month BETWEEN $1 AND $2
        ORDER BY spa.total_contract_value DESC
        LIMIT 100
      `,
      revenue_analysis: `
        SELECT 
          revenue_date,
          revenue_type,
          total_gross_revenue,
          total_net_revenue,
          transaction_count,
          avg_transaction_value
        FROM ${this.config.schema}.${this.config.tablePrefix}_agg_revenue_daily
        WHERE revenue_date BETWEEN $1 AND $2
        ORDER BY revenue_date DESC, total_gross_revenue DESC
      `,
      customer_satisfaction: `
        SELECT 
          s.supplier_type,
          AVG(cs.overall_rating) as avg_overall_rating,
          AVG(cs.communication_rating) as avg_communication_rating,
          AVG(cs.quality_rating) as avg_quality_rating,
          AVG(cs.value_rating) as avg_value_rating,
          SUM(CASE WHEN cs.would_recommend THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT as recommendation_rate,
          COUNT(*) as total_responses
        FROM ${this.config.schema}.${this.config.tablePrefix}_fact_customer_satisfaction cs
        JOIN ${this.config.schema}.${this.config.tablePrefix}_fact_bookings b ON cs.booking_id = b.booking_id
        JOIN ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers s ON b.supplier_id = s.supplier_id
        WHERE cs.survey_date BETWEEN $1 AND $2
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

    // Validation rules based on target table
    for (let i = 0; i < data.length; i++) {
      const record = data[i];

      if (targetTable.includes('suppliers')) {
        if (!record.supplier_id) errors.push(`Row ${i}: Missing supplier_id`);
        if (!record.business_name)
          errors.push(`Row ${i}: Missing business_name`);
        if (!record.supplier_type)
          errors.push(`Row ${i}: Missing supplier_type`);
        if (record.rating && (record.rating < 1 || record.rating > 5)) {
          warnings.push(`Row ${i}: Rating outside valid range (1-5)`);
        }
      }

      if (targetTable.includes('bookings')) {
        if (!record.booking_id) errors.push(`Row ${i}: Missing booking_id`);
        if (!record.couple_id) errors.push(`Row ${i}: Missing couple_id`);
        if (!record.supplier_id) errors.push(`Row ${i}: Missing supplier_id`);
        if (record.contract_value && record.contract_value < 0) {
          warnings.push(`Row ${i}: Negative contract value`);
        }
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
      /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(
          `Query contains potentially dangerous pattern: ${pattern}`,
        );
      }
    }
  }

  private async analyzeTable(tableName: string): Promise<void> {
    try {
      await this.client.query(`ANALYZE ${tableName}`);
      console.log(`Analyzed table statistics: ${tableName}`);
    } catch (error) {
      console.log(`Table analysis skipped for ${tableName}:`, error);
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

  private async getQueryPlan(query: string): Promise<any> {
    try {
      const planResult = await this.client.query(`EXPLAIN ${query}`);
      return planResult.rows.map((row) => row['QUERY PLAN']).join('\n');
    } catch (error) {
      return 'Query plan unavailable';
    }
  }

  private async checkClusterHealth(): Promise<{
    isHealthy: boolean;
    details: any;
  }> {
    try {
      const clusterQuery = `
        SELECT 
          node,
          slice,
          used_disk_space,
          total_disk_space,
          (used_disk_space::FLOAT / total_disk_space::FLOAT * 100) as disk_usage_pct
        FROM stv_partitions
        WHERE part_begin = 0
      `;

      const result = await this.client.query(clusterQuery);
      const maxDiskUsage = Math.max(
        ...result.rows.map((row: any) => row.disk_usage_pct),
      );

      return {
        isHealthy: maxDiskUsage < 85, // Alert if disk usage > 85%
        details: {
          nodeCount: new Set(result.rows.map((row: any) => row.node)).size,
          maxDiskUsage: Math.round(maxDiskUsage * 100) / 100,
          nodes: result.rows,
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

  private async checkTableHealth(): Promise<{
    isHealthy: boolean;
    details: any;
  }> {
    try {
      const tableQuery = `
        SELECT 
          schemaname,
          tablename,
          size as size_mb,
          tbl_rows as row_count,
          sortkey1,
          distkey,
          CASE WHEN sortkey1_skew > 4.0 THEN 'HIGH' 
               WHEN sortkey1_skew > 2.0 THEN 'MEDIUM' 
               ELSE 'LOW' END as skew_level
        FROM svv_table_info
        WHERE schemaname = '${this.config.schema}'
        AND tablename LIKE '${this.config.tablePrefix}_%'
      `;

      const result = await this.client.query(tableQuery);
      const highSkewTables = result.rows.filter(
        (row: any) => row.skew_level === 'HIGH',
      );

      return {
        isHealthy: highSkewTables.length === 0,
        details: {
          tableCount: result.rows.length,
          totalSizeMB: result.rows.reduce(
            (sum: number, row: any) => sum + (row.size_mb || 0),
            0,
          ),
          totalRows: result.rows.reduce(
            (sum: number, row: any) => sum + (row.row_count || 0),
            0,
          ),
          highSkewTables: highSkewTables.length,
          tables: result.rows,
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
        `SELECT * FROM ${this.config.schema}.${this.config.tablePrefix}_vw_data_quality_suppliers`,
        `SELECT * FROM ${this.config.schema}.${this.config.tablePrefix}_vw_data_quality_bookings`,
      ];

      const qualityResults = [];
      for (const query of qualityQueries) {
        try {
          const result = await this.client.query(query);
          qualityResults.push(...result.rows);
        } catch (error) {
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

  private async checkQueryPerformance(): Promise<any> {
    try {
      const perfQuery = `
        SELECT 
          AVG(total_exec_time) as avg_execution_time_ms,
          MAX(total_exec_time) as max_execution_time_ms,
          COUNT(*) as query_count
        FROM stl_query
        WHERE starttime >= DATEADD(hour, -1, GETDATE())
        AND userid > 1
      `;

      const result = await this.client.query(perfQuery);
      const stats = result.rows[0];

      return {
        avgExecutionTimeMs: Math.round(stats.avg_execution_time_ms || 0),
        maxExecutionTimeMs: Math.round(stats.max_execution_time_ms || 0),
        queryCountLastHour: stats.query_count || 0,
      };
    } catch (error) {
      return {
        error: 'Performance metrics unavailable',
      };
    }
  }

  private async getLastSyncTime(): Promise<string> {
    try {
      const query = `
        SELECT MAX(last_sync) as last_sync FROM (
          SELECT MAX(created_at) as last_sync FROM ${this.config.schema}.${this.config.tablePrefix}_dim_suppliers
          UNION ALL
          SELECT MAX(created_at) as last_sync FROM ${this.config.schema}.${this.config.tablePrefix}_fact_bookings
          UNION ALL
          SELECT MAX(created_at) as last_sync FROM ${this.config.schema}.${this.config.tablePrefix}_fact_revenue
        )
      `;

      const result = await this.client.query(query);
      return result.rows[0]?.last_sync || 'Unknown';
    } catch (error) {
      return 'Error retrieving sync time';
    }
  }

  private async cacheReport(reportData: WeddingReportData): Promise<void> {
    // In production, this would cache to ElastiCache or similar
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
      component: 'RedshiftWeddingDataWarehouse',
    };

    console.error('Redshift Integration Error:', errorLog);

    // In production, this would send to CloudWatch or similar monitoring service
  }
}
