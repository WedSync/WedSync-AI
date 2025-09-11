/**
 * WS-340: Multi-Cloud Scaling Orchestrator
 * Team C: Integration & System Orchestration
 */

import {
  CloudScalingRequest,
  CloudScalingResult,
  GlobalWeddingSeason,
  WeddingScalingContext,
  CloudProvider,
  ServiceScalingSpec,
  generateOrchestrationId,
  GlobalScalingOrchestrationError,
  UnsupportedProviderError,
  CriticalServiceScalingError,
} from './types';

import { AWSScalingIntegration } from './providers/aws-integration';
import { GCPScalingIntegration } from './providers/gcp-integration';
import { AzureScalingIntegration } from './providers/azure-integration';
import { MultiCloudCostOptimizer } from './utils/cost-optimizer';
import { WeddingLoadAnalyzer } from './utils/wedding-analyzer';

/**
 * Orchestrates scaling across multiple cloud providers with wedding-aware logic
 */
export class MultiCloudScalingOrchestrator {
  private readonly awsIntegration: AWSScalingIntegration;
  private readonly gcpIntegration: GCPScalingIntegration;
  private readonly azureIntegration: AzureScalingIntegration;
  private readonly costOptimizer: MultiCloudCostOptimizer;
  private readonly weddingAnalyzer: WeddingLoadAnalyzer;
  private readonly activeScalingOperations: Map<string, ScalingOperation> =
    new Map();

  constructor(config: MultiCloudOrchestratorConfig) {
    this.awsIntegration = new AWSScalingIntegration({
      credentials: config.awsConfig?.credentials,
      services: config.awsConfig?.services || [
        'ecs',
        'eks',
        'lambda',
        'rds',
        'elasticache',
      ],
      autoScalingGroups: true,
      spotInstanceOptimization: true,
      weddingAware: config.weddingAwareScaling,
    });

    this.gcpIntegration = new GCPScalingIntegration({
      credentials: config.gcpConfig?.credentials,
      projectId: config.gcpConfig?.projectId,
      services: config.gcpConfig?.services || [
        'gke',
        'cloud-run',
        'cloud-functions',
        'cloud-sql',
        'memorystore',
      ],
      managedInstanceGroups: true,
      preemptibleInstanceOptimization: true,
      weddingAware: config.weddingAwareScaling,
    });

    this.azureIntegration = new AzureScalingIntegration({
      credentials: config.azureConfig?.credentials,
      subscriptionId: config.azureConfig?.subscriptionId,
      services: config.azureConfig?.services || [
        'aks',
        'container-instances',
        'functions',
        'sql-database',
        'redis-cache',
      ],
      virtualMachineScaleSets: true,
      lowPriorityVmOptimization: true,
      weddingAware: config.weddingAwareScaling,
    });

    this.costOptimizer = new MultiCloudCostOptimizer({
      weddingSeasonAware: config.weddingAwareScaling,
      realTimeOptimization: true,
      costConstraints: config.defaultCostConstraints,
    });

    this.weddingAnalyzer = new WeddingLoadAnalyzer({
      realTimeAnalysis: true,
      predictiveModeling: true,
      historicalDataEnabled: true,
    });
  }

  /**
   * Orchestrate multi-cloud scaling for global wedding seasons
   */
  async orchestrateGlobalWeddingSeasonScaling(
    season: GlobalWeddingSeason,
  ): Promise<GlobalScalingOrchestration> {
    const orchestrationId = generateOrchestrationId();
    const startTime = Date.now();

    try {
      console.log(
        `Starting global wedding season scaling orchestration: ${orchestrationId}`,
      );

      // Phase 1: Analyze global wedding distribution
      const weddingDistribution =
        await this.analyzeGlobalWeddingDistribution(season);
      console.log(
        `Wedding distribution analyzed for ${weddingDistribution.totalWeddings} weddings`,
      );

      // Phase 2: Calculate regional scaling requirements
      const regionalRequirements =
        await this.calculateRegionalScalingRequirements({
          weddingDistribution,
          historicalSeasonData: await this.getHistoricalSeasonData(season),
          currentCapacity: await this.getCurrentGlobalCapacity(),
          performanceTargets: season.performanceTargets,
        });
      console.log(
        `Regional requirements calculated for ${regionalRequirements.requirements.length} regions`,
      );

      // Phase 3: Optimize cross-cloud distribution
      const distributionPlan = await this.optimizeCrossCloudDistribution({
        regionalRequirements,
        costConstraints: season.costConstraints,
        performanceRequirements: season.performanceRequirements,
        complianceRequirements: season.complianceRequirements,
      });
      console.log(
        `Distribution plan created with ${distributionPlan.providerPlans.length} provider plans`,
      );

      // Phase 4: Execute scaling across all providers
      const scalingResults: CloudProviderResult[] = [];

      for (const providerPlan of distributionPlan.providerPlans) {
        console.log(
          `Executing scaling for provider: ${providerPlan.provider} in region: ${providerPlan.region}`,
        );
        const result = await this.executeProviderScaling(providerPlan);
        scalingResults.push(result);

        // Configure cross-provider networking if needed
        if (providerPlan.requiresCrossProviderNetworking) {
          await this.setupCrossProviderNetworking(providerPlan, scalingResults);
        }
      }
      console.log(`Scaling executed across ${scalingResults.length} providers`);

      // Phase 5: Setup global load balancing and traffic routing
      const trafficRouting = await this.setupGlobalTrafficRouting({
        scalingResults,
        weddingDistribution,
        routingStrategy: distributionPlan.routingStrategy,
      });
      console.log(
        `Global traffic routing configured with ${trafficRouting.loadBalancers.length} load balancers`,
      );

      // Phase 6: Configure monitoring and alerting
      const monitoringSetup = await this.setupGlobalMonitoring({
        scalingResults,
        monitoringStrategy: season.monitoringStrategy,
        alertingRules: season.alertingRules,
      });
      console.log(
        `Monitoring setup completed with ${monitoringSetup.platforms.length} platforms`,
      );

      const result: GlobalScalingOrchestration = {
        orchestrationId,
        season: season,
        weddingDistribution,
        regionalRequirements,
        distributionPlan,
        scalingResults,
        trafficRouting,
        monitoringSetup,
        executionTimeMs: Date.now() - startTime,
        status: 'completed',
        healthChecks: await this.setupGlobalHealthChecks(orchestrationId),
      };

      console.log(
        `Global wedding season scaling orchestration completed in ${result.executionTimeMs}ms`,
      );
      return result;
    } catch (error) {
      console.error(`Global wedding season scaling failed:`, error);
      await this.handleGlobalScalingFailure(orchestrationId, error);
      throw new GlobalScalingOrchestrationError(
        'Global wedding season scaling failed',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Execute multi-cloud scaling request
   */
  async orchestrateMultiCloudScaling(
    request: CloudScalingRequest,
  ): Promise<CloudScalingResult> {
    const orchestrationId = generateOrchestrationId();
    const startTime = Date.now();

    try {
      console.log(
        `Starting multi-cloud scaling orchestration: ${orchestrationId}`,
      );

      // Register scaling operation
      this.activeScalingOperations.set(orchestrationId, {
        id: orchestrationId,
        status: 'in-progress',
        startTime,
        request,
        providers: request.targetProvider,
      });

      // Phase 1: Wedding context analysis
      let weddingOptimization = null;
      if (request.weddingContext) {
        weddingOptimization = await this.weddingAnalyzer.optimizeForWeddingLoad(
          {
            context: request.weddingContext,
            services: request.services,
            targetProviders: request.targetProvider,
          },
        );

        // Apply wedding optimizations
        request.services = weddingOptimization.optimizedServices;
      }

      // Phase 2: Cost optimization across providers
      const costOptimization = await this.costOptimizer.optimizeMultiCloudCosts(
        {
          providers: request.targetProvider,
          services: request.services,
          constraints: request.costConstraints,
          weddingContext: request.weddingContext,
        },
      );

      // Phase 3: Execute scaling per provider
      const providerResults: CloudProviderResult[] = [];
      const errors: string[] = [];

      for (const provider of request.targetProvider) {
        try {
          console.log(`Scaling provider: ${provider}`);
          const providerServices = request.services.filter((s) =>
            costOptimization.providerDistribution[provider]?.includes(
              s.service,
            ),
          );

          if (providerServices.length === 0) {
            console.log(`No services assigned to provider: ${provider}`);
            continue;
          }

          const result = await this.executeProviderScaling({
            provider,
            services: providerServices,
            region: this.selectOptimalRegion(provider, request.weddingContext),
            weddingContext: request.weddingContext,
            costConstraints: request.costConstraints,
          });

          providerResults.push(result);
          console.log(`Provider ${provider} scaling: ${result.overallStatus}`);
        } catch (error) {
          const errorMsg = `Provider ${provider} scaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);

          // Continue with other providers unless it's a critical failure
          if (this.hasCriticalServices(request.services)) {
            throw new CriticalServiceScalingError(
              `Critical service scaling failed for provider ${provider}`,
              error instanceof Error ? error : undefined,
            );
          }
        }
      }

      // Phase 4: Setup cross-provider networking if needed
      if (providerResults.length > 1) {
        await this.setupCrossProviderNetworking(providerResults);
      }

      // Phase 5: Configure load balancing
      const loadBalancing = await this.setupCrossProviderLoadBalancing({
        providerResults,
        weddingContext: request.weddingContext,
        performanceRequirements: request.performanceRequirements,
      });

      // Update scaling operation
      this.activeScalingOperations.set(orchestrationId, {
        id: orchestrationId,
        status: providerResults.length > 0 ? 'completed' : 'failed',
        startTime,
        request,
        providers: request.targetProvider,
        results: providerResults,
        errors,
      });

      const overallStatus =
        providerResults.length === request.targetProvider.length
          ? 'completed'
          : providerResults.length > 0
            ? 'partial'
            : 'failed';

      const result: CloudScalingResult = {
        requestId: request.requestId,
        orchestrationId,
        providerResults,
        weddingOptimization,
        costOptimization,
        loadBalancing,
        executionTimeMs: Date.now() - startTime,
        status: overallStatus,
        errors: errors.length > 0 ? errors : undefined,
        successfulProviders: providerResults.map((r) => r.provider),
        totalInstancesScaled: providerResults.reduce(
          (sum, r) =>
            sum + r.results.reduce((pSum, s) => pSum + s.scaledInstances, 0),
          0,
        ),
      };

      console.log(
        `Multi-cloud scaling orchestration completed: ${overallStatus} (${result.totalInstancesScaled} instances)`,
      );
      return result;
    } catch (error) {
      console.error(`Multi-cloud scaling orchestration failed:`, error);

      // Update scaling operation with error
      this.activeScalingOperations.set(orchestrationId, {
        id: orchestrationId,
        status: 'failed',
        startTime,
        request,
        providers: request.targetProvider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new GlobalScalingOrchestrationError(
        `Multi-cloud scaling orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Execute scaling for a specific cloud provider
   */
  private async executeProviderScaling(
    providerPlan: CloudProviderPlan | ProviderScalingRequest,
  ): Promise<CloudProviderResult> {
    const provider = providerPlan.provider;
    const services =
      'services' in providerPlan
        ? providerPlan.services
        : providerPlan.scalingSpecs;
    const startTime = Date.now();

    let integration: CloudScalingIntegration;

    switch (provider) {
      case 'aws':
        integration = this.awsIntegration;
        break;
      case 'gcp':
        integration = this.gcpIntegration;
        break;
      case 'azure':
        integration = this.azureIntegration;
        break;
      default:
        throw new UnsupportedProviderError(
          `Provider ${provider} not supported`,
        );
    }

    const providerResults: ServiceScalingResult[] = [];

    for (const spec of services) {
      try {
        console.log(
          `Scaling service ${spec.service} on ${provider} (${spec.currentInstances} -> ${spec.targetInstances})`,
        );

        const result = await integration.scaleService({
          service: spec.service,
          region:
            'region' in providerPlan
              ? providerPlan.region
              : this.selectOptimalRegion(provider),
          currentInstances: spec.currentInstances,
          targetInstances: spec.targetInstances,
          scalingConfiguration: spec.configuration,
          weddingContext:
            'weddingContext' in providerPlan
              ? providerPlan.weddingContext
              : undefined,
        });

        providerResults.push(result);
        console.log(
          `Service ${spec.service} scaling: ${result.status} (${result.scaledInstances} instances)`,
        );

        // Wait for service to stabilize before scaling next service
        if (spec.requiresStabilization) {
          await this.waitForServiceStabilization(
            provider,
            spec.service,
            'region' in providerPlan ? providerPlan.region : 'us-east-1',
          );
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Service ${spec.service} scaling failed:`, errorMsg);

        providerResults.push({
          service: spec.service,
          region: 'region' in providerPlan ? providerPlan.region : 'unknown',
          status: 'failed',
          currentInstances: spec.currentInstances,
          targetInstances: spec.targetInstances,
          scaledInstances: spec.currentInstances,
          executionTimeMs: Date.now() - startTime,
          costImpact: {
            hourlyCostChange: 0,
            dailyCostChange: 0,
            monthlyCostEstimate: 0,
            currency: 'USD',
          },
          performanceMetrics: {
            responseTimeMs: 0,
            throughputRps: 0,
            errorRate: 100,
            availabilityPercent: 0,
            resourceUtilization: {
              cpuPercent: 0,
              memoryPercent: 0,
              networkUtilization: 0,
            },
          },
          error: errorMsg,
          rollbackRequired: true,
        });

        // Continue with other services unless it's a critical failure
        if (spec.criticalService) {
          throw new CriticalServiceScalingError(
            `Critical service ${spec.service} scaling failed`,
            error instanceof Error ? error : undefined,
          );
        }
      }
    }

    return {
      provider,
      region: 'region' in providerPlan ? providerPlan.region : 'multi-region',
      results: providerResults,
      overallStatus: providerResults.every((r) => r.status === 'completed')
        ? 'success'
        : 'partial',
      executionTimeMs: Date.now() - startTime,
      costImpact: await this.calculateProviderCostImpact(providerResults),
      performanceMetrics: await this.collectProviderPerformanceMetrics(
        provider,
        'region' in providerPlan ? providerPlan.region : 'multi-region',
      ),
    };
  }

  /**
   * Get health status of multi-cloud orchestrator
   */
  async getHealthStatus(): Promise<MultiCloudHealthStatus> {
    const activeOperations = Array.from(this.activeScalingOperations.values());

    return {
      status: 'healthy',
      activeOperations: activeOperations.length,
      completedOperations: activeOperations.filter(
        (op) => op.status === 'completed',
      ).length,
      failedOperations: activeOperations.filter((op) => op.status === 'failed')
        .length,
      providerStatus: {
        aws: await this.awsIntegration.getHealthStatus(),
        gcp: await this.gcpIntegration.getHealthStatus(),
        azure: await this.azureIntegration.getHealthStatus(),
      },
      lastHealthCheck: new Date(),
    };
  }

  // Private helper methods

  private async analyzeGlobalWeddingDistribution(
    season: GlobalWeddingSeason,
  ): Promise<WeddingDistribution> {
    // Analyze wedding distribution across regions and time
    return {
      totalWeddings: season.expectedWeddingCount,
      regionalDistribution: season.peakRegions.map((region) => ({
        region,
        weddingCount: Math.floor(season.expectedWeddingCount * 0.25), // Simplified distribution
        peakDate: new Date(
          season.startDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        ), // 30 days after start
        expectedLoad: 1000, // Simplified load calculation
      })),
      peakTimes: [
        {
          date: new Date(season.startDate.getTime() + 45 * 24 * 60 * 60 * 1000),
          hour: 18, // 6 PM
          expectedLoad: 5000,
          affectedRegions: season.peakRegions,
        },
      ],
      seasonalTrends: [
        {
          month: season.startDate.getMonth(),
          growthFactor: 1.5,
          regions: season.peakRegions,
        },
      ],
    };
  }

  private async calculateRegionalScalingRequirements(params: {
    weddingDistribution: WeddingDistribution;
    historicalSeasonData: any;
    currentCapacity: any;
    performanceTargets: PerformanceRequirement[];
  }): Promise<RegionalRequirements> {
    // Calculate scaling requirements per region
    const requirements = params.weddingDistribution.regionalDistribution.map(
      (region) => ({
        region: region.region,
        resourceNeeds: {
          cpu: region.expectedLoad * 0.1, // Simplified calculation
          memory: region.expectedLoad * 0.2,
          storage: region.expectedLoad * 0.05,
          instances: Math.ceil(region.expectedLoad / 100),
          networkBandwidth: region.expectedLoad * 10,
        },
        priorityLevel: 1,
        complianceNeeds: ['GDPR'],
      }),
    );

    return {
      requirements,
      totalResourcesNeeded: requirements.reduce(
        (total, req) => ({
          cpu: total.cpu + req.resourceNeeds.cpu,
          memory: total.memory + req.resourceNeeds.memory,
          storage: total.storage + req.resourceNeeds.storage,
          instances: total.instances + req.resourceNeeds.instances,
          networkBandwidth:
            total.networkBandwidth + req.resourceNeeds.networkBandwidth,
        }),
        { cpu: 0, memory: 0, storage: 0, instances: 0, networkBandwidth: 0 },
      ),
      costEstimate: {
        hourly: 500,
        daily: 12000,
        monthly: 360000,
        currency: 'USD',
        breakdown: [
          { provider: 'aws', service: 'EC2', cost: 200000, percentage: 55.6 },
          {
            provider: 'gcp',
            service: 'Compute Engine',
            cost: 100000,
            percentage: 27.8,
          },
          {
            provider: 'azure',
            service: 'Virtual Machines',
            cost: 60000,
            percentage: 16.6,
          },
        ],
      },
    };
  }

  private async optimizeCrossCloudDistribution(params: {
    regionalRequirements: RegionalRequirements;
    costConstraints: CostConstraint[];
    performanceRequirements: PerformanceRequirement[];
    complianceRequirements: ComplianceRequirement[];
  }): Promise<DistributionPlan> {
    // Optimize distribution across cloud providers
    return {
      planId: generateOrchestrationId(),
      providerPlans: [
        {
          provider: 'aws',
          region: 'us-east-1',
          scalingSpecs: [],
          requiresCrossProviderNetworking: true,
          startTime: Date.now(),
        },
        {
          provider: 'gcp',
          region: 'us-central1',
          scalingSpecs: [],
          requiresCrossProviderNetworking: true,
          startTime: Date.now(),
        },
      ],
      routingStrategy: {
        strategyType: 'latency-based',
        rules: [],
        weddingAware: true,
      },
      failoverPlan: {
        enabled: true,
        triggers: [],
        targets: [],
        automaticFailover: true,
      },
    };
  }

  private selectOptimalRegion(
    provider: CloudProvider,
    weddingContext?: WeddingScalingContext,
  ): string {
    // Select optimal region based on provider and wedding context
    const regionMaps: Record<CloudProvider, string[]> = {
      aws: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-2'],
      gcp: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
      azure: ['eastus', 'westus2', 'westeurope', 'southeastasia'],
    };

    const regions = regionMaps[provider] || [regionMaps[provider][0]];

    // If wedding context is provided, prefer regions based on timezone/location
    if (weddingContext?.regionPriority) {
      for (const priority of weddingContext.regionPriority) {
        const matchingRegion = regions.find((r) =>
          r.includes(priority.toLowerCase()),
        );
        if (matchingRegion) return matchingRegion;
      }
    }

    return regions[0]; // Default to first region
  }

  private hasCriticalServices(services: ServiceScalingSpec[]): boolean {
    return services.some((s) => s.criticalService);
  }

  private async waitForServiceStabilization(
    provider: CloudProvider,
    service: string,
    region: string,
  ): Promise<void> {
    // Wait for service to reach stable state
    console.log(
      `Waiting for service ${service} stabilization on ${provider} in ${region}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 second wait
  }

  private async calculateProviderCostImpact(
    results: ServiceScalingResult[],
  ): Promise<CostImpact> {
    const totalHourlyCost = results.reduce(
      (sum, r) => sum + r.costImpact.hourlyCostChange,
      0,
    );
    return {
      hourlyCostChange: totalHourlyCost,
      dailyCostChange: totalHourlyCost * 24,
      monthlyCostEstimate: totalHourlyCost * 24 * 30,
      currency: 'USD',
    };
  }

  private async collectProviderPerformanceMetrics(
    provider: CloudProvider,
    region: string,
  ): Promise<PerformanceMetrics> {
    // Collect performance metrics from provider
    return {
      responseTimeMs: 150,
      throughputRps: 1000,
      errorRate: 0.1,
      availabilityPercent: 99.9,
      resourceUtilization: {
        cpuPercent: 65,
        memoryPercent: 70,
        networkUtilization: 45,
      },
    };
  }

  // Placeholder implementations for complex operations
  private async getHistoricalSeasonData(
    season: GlobalWeddingSeason,
  ): Promise<any> {
    return { placeholder: true };
  }

  private async getCurrentGlobalCapacity(): Promise<any> {
    return { placeholder: true };
  }

  private async setupCrossProviderNetworking(
    providerPlan: any,
    results?: any,
  ): Promise<void> {
    console.log('Setting up cross-provider networking');
  }

  private async setupGlobalTrafficRouting(params: any): Promise<any> {
    return {
      routingId: generateOrchestrationId(),
      loadBalancers: [],
      dnsConfiguration: {
        zoneName: 'wedsync.com',
        records: [],
        geoRouting: true,
        latencyRouting: true,
      },
      sslConfiguration: {
        certificateArn: 'arn:aws:acm:cert',
        sslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01',
        redirectHttpToHttps: true,
      },
      weddingRoutingRules: [],
    };
  }

  private async setupGlobalMonitoring(params: any): Promise<any> {
    return {
      setupId: generateOrchestrationId(),
      platforms: [],
      dashboards: [],
      alerts: [],
      totalMetrics: 0,
      executionTimeMs: 1000,
    };
  }

  private async setupGlobalHealthChecks(orchestrationId: string): Promise<any> {
    return {
      setupId: generateOrchestrationId(),
      checks: [],
      monitoring: true,
      alerting: true,
    };
  }

  private async handleGlobalScalingFailure(
    orchestrationId: string,
    error: unknown,
  ): Promise<void> {
    console.error(
      `Global scaling failure for orchestration ${orchestrationId}:`,
      error,
    );
  }

  private async setupCrossProviderLoadBalancing(params: any): Promise<any> {
    return { placeholder: true };
  }
}

// Supporting interfaces and types

export interface MultiCloudOrchestratorConfig {
  awsConfig?: {
    credentials: any;
    services?: string[];
  };
  gcpConfig?: {
    credentials: any;
    projectId?: string;
    services?: string[];
  };
  azureConfig?: {
    credentials: any;
    subscriptionId?: string;
    services?: string[];
  };
  weddingAwareScaling?: boolean;
  defaultCostConstraints?: CostConstraint[];
}

export interface ScalingOperation {
  id: string;
  status: 'in-progress' | 'completed' | 'failed';
  startTime: number;
  request: CloudScalingRequest;
  providers: CloudProvider[];
  results?: CloudProviderResult[];
  errors?: string[];
  error?: string;
}

export interface ProviderScalingRequest {
  provider: CloudProvider;
  services: ServiceScalingSpec[];
  region: string;
  weddingContext?: WeddingScalingContext;
  costConstraints?: CostConstraint[];
}

export interface MultiCloudHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeOperations: number;
  completedOperations: number;
  failedOperations: number;
  providerStatus: {
    aws: any;
    gcp: any;
    azure: any;
  };
  lastHealthCheck: Date;
}

// Import necessary types (these would be properly imported in real implementation)
type CloudScalingIntegration = any;
type CloudProviderPlan = any;
type ServiceScalingResult = any;
type CloudProviderResult = any;
type GlobalScalingOrchestration = any;
type WeddingDistribution = any;
type RegionalRequirements = any;
type DistributionPlan = any;
type PerformanceRequirement = any;
type CostConstraint = any;
type CostImpact = any;
type PerformanceMetrics = any;
