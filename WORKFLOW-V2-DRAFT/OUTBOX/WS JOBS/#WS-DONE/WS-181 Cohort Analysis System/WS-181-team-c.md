# TEAM C - ROUND 1: WS-181 - Cohort Analysis System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build analytics data pipeline integration with ETL processing, external data sources, and business intelligence platform connections
**FEATURE ID:** WS-181 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about data pipeline reliability and external analytics integration accuracy

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/analytics-pipeline.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/integrations/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("analytics.*integration");
await mcp__serena__search_for_pattern("data.*pipeline");
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### B. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("ETL data pipeline Node.js best practices");
await mcp__Ref__ref_search_documentation("Google Analytics integration cohort analysis");
await mcp__Ref__ref_search_documentation("Segment analytics data collection");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Analytics data pipeline integration requires robust ETL architecture: 1) Data extraction from multiple wedding platform sources (user actions, transactions, engagement metrics) 2) Data transformation for cohort analysis standardization 3) Loading into analytics warehouse with data validation 4) Integration with external BI tools (Google Analytics, Mixpanel, Segment) 5) Real-time data synchronization while maintaining data quality. Must handle wedding industry event patterns and supplier behavior data.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

### 1. **integration-specialist**: External analytics platform integration
**Mission**: Integrate cohort analysis with external business intelligence and analytics platforms
```typescript
await Task({
  subagent_type: "integration-specialist",
  prompt: `Create external analytics platform integration for WS-181 cohort analysis system. Must include:
  
  1. Google Analytics Integration:
  - Cohort data export to Google Analytics for visualization
  - Custom event tracking for cohort milestone achievements
  - Integration with Google Analytics Intelligence API
  - Automated cohort performance reporting in GA dashboards
  
  2. Business Intelligence Platform Integration:
  - Tableau/PowerBI connector for cohort visualization
  - Looker integration for advanced cohort analytics
  - Mixpanel cohort data synchronization
  - Custom webhook endpoints for BI tool integration
  
  3. Marketing Analytics Integration:
  - Segment integration for cohort behavior tracking
  - HubSpot integration for supplier lifecycle analysis
  - Salesforce analytics integration for cohort attribution
  - Customer.io integration for cohort-based messaging
  
  Focus on enabling wedding business stakeholders to access cohort insights through their preferred analytics tools.`,
  description: "External analytics integration"
});
```

### 2. **data-analytics-engineer**: ETL pipeline architecture
**Mission**: Design comprehensive ETL pipeline for cohort analysis data processing
```typescript
await Task({
  subagent_type: "data-analytics-engineer",
  prompt: `Design ETL pipeline architecture for WS-181 cohort analysis system. Must include:
  
  1. Data Extraction Pipeline:
  - Extract supplier signup and engagement data from multiple sources
  - Transaction data extraction for revenue cohort analysis
  - User behavior data extraction for retention calculations
  - External data source integration (payment processors, email platforms)
  
  2. Data Transformation Processing:
  - Standardize data formats for cohort calculation consistency
  - Data quality validation and cleansing procedures
  - Wedding seasonality adjustment calculations
  - Supplier classification and segmentation processing
  
  3. Data Loading Optimization:
  - Batch processing for historical cohort data
  - Real-time streaming for current cohort updates
  - Data warehouse optimization for analytics queries
  - Backup and recovery procedures for analytics data
  
  Design for handling millions of wedding supplier records with high accuracy and performance.`,
  description: "ETL pipeline architecture"
});
```

### 3. **api-architect**: Data synchronization and webhook APIs
**Mission**: Create APIs for data synchronization and external system integration
```typescript
await Task({
  subagent_type: "api-architect",
  prompt: `Design data synchronization APIs for WS-181 cohort analysis integration. Must include:
  
  1. Data Synchronization APIs:
  - POST /api/integrations/analytics/sync - Trigger cohort data sync
  - GET /api/integrations/analytics/status - Check sync status
  - PUT /api/integrations/analytics/config - Update integration configuration
  - DELETE /api/integrations/analytics/{id} - Remove integration
  
  2. Webhook Management APIs:
  - POST /api/webhooks/cohort-updates - Register cohort update webhooks
  - GET /api/webhooks/cohort-events - List webhook events
  - PUT /api/webhooks/{id}/retry - Retry failed webhook deliveries
  - GET /api/webhooks/{id}/logs - View webhook delivery logs
  
  3. Data Export APIs:
  - GET /api/export/cohorts/{format} - Export cohort data (CSV, JSON, Parquet)
  - POST /api/export/cohorts/schedule - Schedule recurring exports
  - GET /api/export/status/{id} - Check export job status
  - GET /api/export/download/{id} - Download export file
  
  Design for reliable data delivery with retry mechanisms and error handling.`,
  description: "Data sync APIs"
});
```

### 4. **cloud-infrastructure-architect**: Analytics data warehouse architecture
**Mission**: Design scalable data warehouse architecture for cohort analysis
```typescript
await Task({
  subagent_type: "cloud-infrastructure-architect",
  prompt: `Design analytics data warehouse architecture for WS-181 cohort analysis system. Must include:
  
  1. Data Warehouse Design:
  - Dimensional modeling for cohort analysis queries
  - Partitioning strategy for time-series cohort data
  - Star schema design for efficient analytics queries
  - Data mart creation for specific business use cases
  
  2. Scalable Infrastructure:
  - Auto-scaling data processing resources
  - Multi-region data replication for global access
  - Cost optimization for large-scale analytics workloads
  - Disaster recovery and backup strategies
  
  3. Performance Optimization:
  - Columnar storage optimization for analytics queries
  - Caching layer for frequently accessed cohort data
  - Query optimization and index strategies
  - Resource allocation for peak analytics workloads
  
  Design for handling wedding industry data growth and seasonal traffic patterns.`,
  description: "Data warehouse architecture"
});
```

### 5. **security-compliance-officer**: Data pipeline security and governance
**Mission**: Implement security and governance for analytics data pipeline
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security and governance for WS-181 analytics data pipeline. Must include:
  
  1. Data Privacy and Security:
  - PII anonymization in cohort analysis data
  - Encryption of data in transit and at rest
  - Access control for analytics data and integrations
  - Audit logging for all data pipeline activities
  
  2. Compliance Requirements:
  - GDPR compliance for cohort analysis data processing
  - SOC2 compliance for analytics data handling
  - Data retention policies for cohort historical data
  - Right to be forgotten implementation in analytics pipeline
  
  3. Data Governance:
  - Data lineage tracking for cohort calculations
  - Data quality monitoring and alerting
  - Schema versioning and change management
  - Data classification and sensitivity labeling
  
  Ensure analytics pipeline maintains highest security standards while enabling business insights.`,
  description: "Pipeline security governance"
});
```

### 6. **devops-sre-engineer**: Pipeline reliability and monitoring
**Mission**: Implement reliability, monitoring, and alerting for analytics data pipeline
```typescript
await Task({
  subagent_type: "devops-sre-engineer",
  prompt: `Implement reliability and monitoring for WS-181 analytics data pipeline. Must include:
  
  1. Pipeline Reliability:
  - Automated failure detection and recovery
  - Data pipeline health monitoring and alerting
  - Circuit breaker patterns for external integrations
  - Graceful degradation for analytics system failures
  
  2. Monitoring and Observability:
  - Real-time pipeline performance monitoring
  - Data quality monitoring and validation alerts
  - Integration health monitoring for external systems
  - Custom metrics for cohort calculation accuracy
  
  3. Operational Excellence:
  - Automated deployment and rollback procedures
  - Infrastructure as code for analytics pipeline
  - Capacity planning and resource optimization
  - Incident response procedures for analytics outages
  
  Focus on maintaining 99.9% uptime for wedding business analytics dependencies.`,
  description: "Pipeline reliability monitoring"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ANALYTICS INTEGRATION SECURITY:
- [ ] **Data encryption** - Encrypt all analytics data in transit and at rest
- [ ] **Access control** - Implement role-based access for analytics integrations
- [ ] **PII protection** - Anonymize personal information in analytics pipelines
- [ ] **API authentication** - Secure all integration APIs with proper authentication
- [ ] **Audit logging** - Log all data pipeline activities and external integrations
- [ ] **Rate limiting** - Prevent abuse of data export and synchronization APIs
- [ ] **Data validation** - Validate data integrity throughout the pipeline

## 🎯 TEAM C SPECIALIZATION: INTEGRATION/WORKFLOW FOCUS

### SPECIFIC DELIVERABLES FOR WS-181:

#### 1. AnalyticsPipeline.ts - Core ETL pipeline orchestrator
```typescript
export class AnalyticsPipeline {
  async extractCohortData(
    extractionConfig: DataExtractionConfig
  ): Promise<RawCohortData> {
    // Extract data from multiple wedding platform sources
    // Handle incremental and full extraction modes
    // Validate data completeness and quality
  }
  
  async transformCohortData(
    rawData: RawCohortData,
    transformRules: DataTransformationRules
  ): Promise<ProcessedCohortData> {
    // Apply standardization and cleansing rules
    // Calculate derived metrics for cohort analysis
    // Handle wedding seasonality adjustments
  }
  
  async loadCohortData(
    processedData: ProcessedCohortData,
    loadConfig: DataLoadConfig
  ): Promise<LoadResult> {
    // Load data into analytics warehouse
    // Update materialized views and indexes
    // Trigger downstream integration notifications
  }
}
```

#### 2. ExternalAnalyticsIntegrator.ts - External platform integration
```typescript
export class ExternalAnalyticsIntegrator {
  async syncToGoogleAnalytics(
    cohortData: CohortAnalysisResult
  ): Promise<GoogleAnalyticsSyncResult> {
    // Export cohort data to Google Analytics
    // Create custom events and dimensions
    // Update GA dashboards with cohort metrics
  }
  
  async syncToMixpanel(
    cohortData: CohortAnalysisResult
  ): Promise<MixpanelSyncResult> {
    // Sync cohort metrics to Mixpanel
    // Update cohort user properties
    // Trigger Mixpanel cohort analysis updates
  }
  
  private async handleIntegrationFailure(
    integration: string,
    error: IntegrationError
  ): Promise<void> {
    // Implement retry logic with exponential backoff
    // Log integration failures for monitoring
    // Notify stakeholders of integration issues
  }
}
```

#### 3. /api/integrations/analytics/route.ts - Integration management APIs
```typescript
// GET /api/integrations/analytics - List active analytics integrations
// POST /api/integrations/analytics/sync - Trigger data synchronization
// PUT /api/integrations/analytics/{id}/config - Update integration config

interface AnalyticsIntegrationRequest {
  platform: 'google-analytics' | 'mixpanel' | 'segment' | 'tableau';
  configuration: IntegrationConfig;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  dataFilters: DataFilterConfig[];
}

interface AnalyticsIntegrationResponse {
  integrationId: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync?: string;
  syncStatus?: SyncStatusDetails;
  errors?: IntegrationError[];
}
```

#### 4. CohortDataExporter.ts - Data export and formatting
```typescript
export class CohortDataExporter {
  async exportToBITool(
    cohortResults: CohortAnalysisResult[],
    format: 'csv' | 'json' | 'parquet' | 'sql'
  ): Promise<ExportResult> {
    // Format cohort data for external BI tools
    // Apply data transformation for target platform
    // Generate export with metadata and schema
  }
  
  async scheduleRecurringExport(
    exportConfig: RecurringExportConfig
  ): Promise<ExportSchedule> {
    // Set up automated cohort data exports
    // Configure delivery to external systems
    // Handle export failure notifications
  }
  
  private async validateExportData(
    exportData: FormattedExportData
  ): Promise<DataValidationResult> {
    // Validate export data integrity
    // Check for missing or corrupt cohort metrics
    // Ensure data privacy compliance
  }
}
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-181 technical specification:
- **ETL Pipeline**: Extract, Transform, Load architecture for cohort data
- **External Integrations**: Google Analytics, Mixpanel, Segment, BI tools
- **Data Synchronization**: Real-time and batch synchronization capabilities
- **Export Capabilities**: Multiple format support for external analytics tools

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/integrations/analytics-pipeline.ts` - Core ETL orchestrator
- [ ] `/src/lib/integrations/external-analytics-integrator.ts` - External platform integration
- [ ] `/src/lib/integrations/cohort-data-exporter.ts` - Data export and formatting
- [ ] `/src/app/api/integrations/analytics/route.ts` - Integration management APIs
- [ ] `/src/app/api/integrations/analytics/sync/route.ts` - Data sync endpoint
- [ ] `/src/app/api/webhooks/cohort-updates/route.ts` - Webhook management
- [ ] `/src/lib/integrations/google-analytics-connector.ts` - GA integration
- [ ] `/src/lib/integrations/index.ts` - Integration exports

### MUST IMPLEMENT:
- [ ] Comprehensive ETL pipeline with data validation and quality checks
- [ ] Google Analytics integration with cohort data synchronization
- [ ] Mixpanel integration for behavioral cohort analysis
- [ ] Segment integration for cohort event tracking
- [ ] BI tool connectors (Tableau, PowerBI, Looker)
- [ ] Real-time and scheduled data synchronization
- [ ] Webhook system for external integration notifications
- [ ] Data export capabilities in multiple formats

## 💾 WHERE TO SAVE YOUR WORK
- Integration Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/integrations/`
- External Connectors: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/connectors/`
- ETL Scripts: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/scripts/analytics/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/integrations/`

## 🏁 COMPLETION CHECKLIST
- [ ] ETL pipeline implemented with data quality validation
- [ ] Google Analytics integration functional with cohort data sync
- [ ] External BI tool integrations working (Mixpanel, Segment, Tableau)
- [ ] Real-time data synchronization implemented with error handling
- [ ] Data export functionality created for multiple formats
- [ ] Webhook system deployed for integration notifications
- [ ] Security measures implemented for all external integrations
- [ ] Comprehensive testing completed for integration workflows

**WEDDING CONTEXT REMINDER:** Your analytics integration pipeline helps WedSync connect cohort insights with external business intelligence tools, enabling wedding industry stakeholders to understand which supplier acquisition channels (Instagram ads vs. wedding expo leads) produce the highest lifetime value photographers and venues. This integration empowers data-driven decisions about marketing spend and supplier recruitment strategies across the wedding ecosystem.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**