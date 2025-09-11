/**
 * BI Platform Integration Types for WedSync Reporting Engine
 * Team C - Integration Orchestration System
 *
 * Specialized types for Business Intelligence platform integrations
 * including Tableau, Power BI, Looker, and other analytics platforms.
 */

export type BIPlatform =
  | 'tableau'
  | 'powerbi'
  | 'looker'
  | 'qlik_sense'
  | 'sisense'
  | 'domo';

export type DataWarehouseType =
  | 'snowflake'
  | 'bigquery'
  | 'redshift'
  | 'databricks'
  | 'synapse';

export type CRMSystem =
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive'
  | 'zoho'
  | 'dynamics365';

// BI Platform Connector Interface
export interface BIPlatformConnector {
  platform: BIPlatform;
  connect(credentials: PlatformCredentials): Promise<BIConnection>;
  uploadReportData(
    connection: BIConnection,
    data: ReportData,
  ): Promise<UploadResult>;
  createDashboard(
    connection: BIConnection,
    config: DashboardConfig,
  ): Promise<DashboardResult>;
  scheduleRefresh(
    connection: BIConnection,
    schedule: RefreshSchedule,
  ): Promise<ScheduleResult>;
  queryPlatformStatus(connection: BIConnection): Promise<PlatformStatus>;
}

export interface BIConnection {
  connectionId: string;
  platform: BIPlatform;
  status: 'connected' | 'disconnected' | 'error';
  serverInfo: ServerInfo;
  capabilities: PlatformCapability[];
  connectedAt: Date;
  lastActivity: Date;
}

export interface ServerInfo {
  version: string;
  region: string;
  environment: 'production' | 'development' | 'staging';
  features: string[];
}

export interface PlatformCapability {
  name: string;
  supported: boolean;
  version?: string;
  limitations?: string[];
}

export interface ReportData {
  datasetId: string;
  data: Record<string, any>[];
  schema: DataSchema;
  metadata: ReportMetadata;
  transformations?: DataTransformation[];
}

export interface DataSchema {
  fields: SchemaField[];
  relationships: DataRelationship[];
  primaryKey?: string;
  indexes?: string[];
}

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  nullable: boolean;
  description?: string;
  format?: string;
  validation?: FieldValidation;
}

export type SchemaFieldType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'array';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  min?: number;
  max?: number;
}

export interface DataRelationship {
  fromField: string;
  toTable: string;
  toField: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

export interface ReportMetadata {
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  refreshFrequency: string;
}

export interface DataTransformation {
  id: string;
  type: TransformationType;
  config: TransformationConfig;
  order: number;
}

export type TransformationType =
  | 'filter'
  | 'aggregate'
  | 'join'
  | 'pivot'
  | 'unpivot'
  | 'calculate'
  | 'format';

export interface TransformationConfig {
  expression?: string;
  groupBy?: string[];
  aggregates?: AggregateFunction[];
  filters?: FilterCondition[];
  joinConfig?: JoinConfiguration;
}

export interface AggregateFunction {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'stddev';
  alias?: string;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like';
  value: any;
}

export interface JoinConfiguration {
  table: string;
  type: 'inner' | 'left' | 'right' | 'full';
  on: JoinCondition[];
}

export interface JoinCondition {
  left: string;
  right: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
}

export interface UploadResult {
  uploadId: string;
  status: 'success' | 'partial' | 'failed';
  recordsUploaded: number;
  recordsFailed: number;
  errors: UploadError[];
  datasetInfo: DatasetInfo;
  uploadTime: number;
}

export interface UploadError {
  row: number;
  field?: string;
  code: string;
  message: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  size: number;
  recordCount: number;
  lastRefresh: Date;
  nextRefresh?: Date;
}

export interface DashboardConfig {
  name: string;
  description?: string;
  template?: string;
  datasources: DatasourceConfig[];
  visualizations: VisualizationConfig[];
  layout: LayoutConfig;
  permissions: PermissionConfig;
}

export interface DatasourceConfig {
  id: string;
  name: string;
  connectionString?: string;
  datasetId?: string;
  refreshSchedule?: RefreshSchedule;
}

export interface VisualizationConfig {
  id: string;
  type: VisualizationType;
  title: string;
  datasource: string;
  query: string;
  formatting: VisualizationFormatting;
  position: Position;
}

export type VisualizationType =
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'table'
  | 'scorecard'
  | 'map'
  | 'scatter_plot'
  | 'heatmap';

export interface VisualizationFormatting {
  colors?: string[];
  fontSize?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  numberFormat?: string;
  dateFormat?: string;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConfig {
  columns: number;
  rows: number;
  margin: number;
  responsive: boolean;
}

export interface PermissionConfig {
  viewers: string[];
  editors: string[];
  public: boolean;
  shareUrl?: string;
}

export interface DashboardResult {
  dashboardId: string;
  url: string;
  status: 'created' | 'error';
  message?: string;
  createdAt: Date;
  permissions: PermissionConfig;
}

export interface RefreshSchedule {
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  enabled: boolean;
}

export interface ScheduleResult {
  scheduleId: string;
  status: 'created' | 'updated' | 'error';
  nextRun: Date;
  message?: string;
}

export interface PlatformStatus {
  platform: BIPlatform;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime: number;
  responseTime: number;
  version: string;
  lastCheck: Date;
  issues: PlatformIssue[];
}

export interface PlatformIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  startTime: Date;
  endTime?: Date;
  affectedServices: string[];
}

// Data Warehouse Connector Interface
export interface DataWarehouseConnector {
  warehouse: DataWarehouseType;
  establishConnection(config: WarehouseConfig): Promise<WarehouseConnection>;
  createReportingTables(
    connection: WarehouseConnection,
    schema: TableSchema[],
  ): Promise<void>;
  bulkInsertData(
    connection: WarehouseConnection,
    data: BulkData,
  ): Promise<InsertResult>;
  executeAnalyticsQuery(
    connection: WarehouseConnection,
    query: AnalyticsQuery,
  ): Promise<QueryResult>;
  optimizeWarehousePerformance(
    connection: WarehouseConnection,
  ): Promise<OptimizationResult>;
}

export interface WarehouseConfig {
  host: string;
  port: number;
  database: string;
  schema: string;
  credentials: WarehouseCredentials;
  connectionOptions: ConnectionOptions;
}

export interface WarehouseCredentials {
  username: string;
  password: string;
  account?: string; // For Snowflake
  warehouse?: string; // For Snowflake
  role?: string;
}

export interface ConnectionOptions {
  maxConnections: number;
  timeout: number;
  ssl: boolean;
  compression: boolean;
  readOnly: boolean;
}

export interface WarehouseConnection {
  connectionId: string;
  warehouse: DataWarehouseType;
  status: 'connected' | 'disconnected' | 'error';
  database: string;
  schema: string;
  connectedAt: Date;
  capabilities: WarehouseCapability[];
}

export interface WarehouseCapability {
  feature: string;
  supported: boolean;
  version?: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnDefinition[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  indexes?: Index[];
  partitioning?: PartitionConfig;
}

export interface ColumnDefinition {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: any;
  comment?: string;
  constraints?: ColumnConstraint[];
}

export interface ColumnConstraint {
  type: 'unique' | 'check' | 'not_null';
  expression?: string;
}

export interface ForeignKey {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: 'cascade' | 'restrict' | 'set_null';
  onUpdate: 'cascade' | 'restrict' | 'set_null';
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'bitmap';
}

export interface PartitionConfig {
  type: 'range' | 'hash' | 'list';
  columns: string[];
  partitions: PartitionDefinition[];
}

export interface PartitionDefinition {
  name: string;
  condition: string;
  tablespace?: string;
}

export interface BulkData {
  tableName: string;
  data: Record<string, any>[];
  options: BulkInsertOptions;
}

export interface BulkInsertOptions {
  batchSize: number;
  skipDuplicates: boolean;
  updateOnConflict: boolean;
  conflictColumns?: string[];
  transaction: boolean;
}

export interface InsertResult {
  insertId: string;
  status: 'success' | 'partial' | 'failed';
  recordsInserted: number;
  recordsFailed: number;
  errors: InsertError[];
  executionTime: number;
}

export interface InsertError {
  row: number;
  column?: string;
  code: string;
  message: string;
}

export interface AnalyticsQuery {
  queryId: string;
  sql: string;
  parameters?: QueryParameter[];
  options: QueryOptions;
}

export interface QueryParameter {
  name: string;
  value: any;
  dataType: string;
}

export interface QueryOptions {
  timeout: number;
  fetchSize: number;
  readOnly: boolean;
  cacheResult: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface QueryResult {
  queryId: string;
  status: 'success' | 'error' | 'timeout';
  columns: QueryColumn[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  cached: boolean;
  error?: string;
}

export interface QueryColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  precision?: number;
  scale?: number;
}

export interface OptimizationResult {
  recommendationsApplied: number;
  performanceImprovement: number;
  recommendations: PerformanceRecommendation[];
  executionTime: number;
}

export interface PerformanceRecommendation {
  type: 'index' | 'partitioning' | 'statistics' | 'query_rewrite';
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImprovement: number;
  applied: boolean;
}

// CRM Integration Connector Interface
export interface CRMIntegrationConnector {
  crmSystem: CRMSystem;
  authenticateConnection(auth: CRMAuthentication): Promise<CRMConnection>;
  syncReportMetrics(
    connection: CRMConnection,
    metrics: WeddingMetrics,
  ): Promise<SyncResult>;
  createCustomObjects(
    connection: CRMConnection,
    objects: CustomObjectDefinition[],
  ): Promise<void>;
  updateClientRecords(
    connection: CRMConnection,
    updates: ClientUpdate[],
  ): Promise<UpdateResult>;
  retrieveClientInsights(
    connection: CRMConnection,
    query: InsightQuery,
  ): Promise<ClientInsights>;
}

export interface CRMAuthentication {
  type: 'oauth2' | 'api_key' | 'basic';
  credentials: Record<string, string>;
  scopes?: string[];
}

export interface CRMConnection {
  connectionId: string;
  crmSystem: CRMSystem;
  status: 'connected' | 'disconnected' | 'error';
  organizationInfo: CRMOrganization;
  connectedAt: Date;
  permissions: CRMPermission[];
}

export interface CRMOrganization {
  id: string;
  name: string;
  domain: string;
  plan: string;
  features: string[];
}

export interface CRMPermission {
  object: string;
  actions: CRMAction[];
}

export type CRMAction = 'read' | 'write' | 'delete' | 'create';

export interface WeddingMetrics {
  organizationId: string;
  period: DateRange;
  revenue: RevenueMetrics;
  satisfaction: SatisfactionMetrics;
  performance: PerformanceMetrics;
  forecasting: ForecastingMetrics;
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  revenueGrowth: number;
  profitMargin: number;
  revenueByCategory: CategoryRevenue[];
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  count: number;
  averageValue: number;
}

export interface SatisfactionMetrics {
  averageScore: number;
  responseRate: number;
  npsScore: number;
  satisfactionByCategory: CategorySatisfaction[];
}

export interface CategorySatisfaction {
  category: string;
  score: number;
  responses: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceMetrics {
  conversionRate: number;
  leadResponseTime: number;
  projectCompletionRate: number;
  repeatClientRate: number;
}

export interface ForecastingMetrics {
  projectedRevenue: number;
  expectedBookings: number;
  seasonalTrends: SeasonalTrend[];
  confidenceLevel: number;
}

export interface SeasonalTrend {
  period: string;
  multiplier: number;
  confidence: number;
}

export interface CustomObjectDefinition {
  name: string;
  displayName: string;
  description?: string;
  properties: CustomProperty[];
  associations: ObjectAssociation[];
}

export interface CustomProperty {
  name: string;
  label: string;
  type: PropertyType;
  required: boolean;
  options?: PropertyOption[];
  validation?: PropertyValidation;
}

export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enumeration'
  | 'url'
  | 'email';

export interface PropertyOption {
  label: string;
  value: string;
  displayOrder: number;
}

export interface PropertyValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface ObjectAssociation {
  fromObject: string;
  toObject: string;
  type: AssociationType;
  required: boolean;
}

export type AssociationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_many'
  | 'parent_child';

export interface ClientUpdate {
  recordId: string;
  objectType: string;
  properties: Record<string, any>;
  associations?: AssociationUpdate[];
}

export interface AssociationUpdate {
  toObjectType: string;
  toRecordId: string;
  associationType: string;
}

export interface UpdateResult {
  updatedRecords: number;
  failedRecords: number;
  errors: UpdateError[];
  executionTime: number;
}

export interface UpdateError {
  recordId: string;
  code: string;
  message: string;
  field?: string;
}

export interface InsightQuery {
  objectType: string;
  filters: InsightFilter[];
  groupBy?: string[];
  metrics: string[];
  dateRange: DateRange;
  limit?: number;
}

export interface InsightFilter {
  property: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
}

export interface ClientInsights {
  totalRecords: number;
  insights: InsightData[];
  trends: TrendData[];
  recommendations: InsightRecommendation[];
}

export interface InsightData {
  dimension: string;
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendData {
  period: string;
  values: TrendValue[];
}

export interface TrendValue {
  metric: string;
  value: number;
}

export interface InsightRecommendation {
  type: 'opportunity' | 'risk' | 'optimization';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Platform-specific credential interfaces
export interface PlatformCredentials {
  [key: string]: any;
}

// Common result interfaces
export interface SyncResult {
  totalRecords: number;
  successfulSyncs: number;
  failedSyncs: number;
  details: SyncDetail[];
}

export interface SyncDetail {
  recordId: string;
  status: 'success' | 'error';
  error?: string;
  syncedAt: Date;
}
