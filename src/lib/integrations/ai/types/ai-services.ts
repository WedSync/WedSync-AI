/**
 * Shared AI service interfaces to prevent circular dependencies
 */

export interface AIMonitorInterface {
  trackPerformance(metrics: any): Promise<void>;
  reportError(error: any): Promise<void>;
  getHealthMetrics(): Promise<any>;
}

export interface AIServiceOrchestratorInterface {
  orchestrateServices(request: any): Promise<any>;
  optimizeResourceUsage(): Promise<void>;
  handleServiceFailure(serviceId: string, error: any): Promise<void>;
}

export interface CostOptimizerInterface {
  optimizeCosts(config: any): Promise<any>;
  generateCostRecommendations(): Promise<any[]>;
  trackUsageCosts(serviceId: string, costs: number): Promise<void>;
}

export interface AIServices {
  monitor?: AIMonitorInterface;
  orchestrator?: AIServiceOrchestratorInterface;
  costOptimizer?: CostOptimizerInterface;
}
