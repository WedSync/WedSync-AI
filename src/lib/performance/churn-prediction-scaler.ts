// WS-182 Round 1: Churn Prediction Auto-Scaler
// Auto-scaling ML infrastructure for churn prediction services

export interface ScalingConfig {
  minNodes: number;
  maxNodes: number;
  targetCPUPercent: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

export interface ScalingResult {
  success: boolean;
  scalingActions: Array<{
    action: 'scale_up' | 'scale_down' | 'maintain';
    nodeCount: number;
    reason: string;
  }>;
  currentLoad: number;
  estimatedCost: number;
}

export interface MLDemandPrediction {
  expectedRequests: number;
  peakTime: Date;
  confidence: number;
  seasonalMultiplier: number;
}

export class ChurnPredictionScaler {
  private readonly config: ScalingConfig;
  private currentNodeCount = 1;

  constructor(config: Partial<ScalingConfig> = {}) {
    this.config = {
      minNodes: 2,
      maxNodes: 20,
      targetCPUPercent: 70,
      scaleUpThreshold: 80,
      scaleDownThreshold: 50,
      ...config,
    };
  }

  async scaleMLInfrastructure(
    demandPrediction: MLDemandPrediction,
  ): Promise<ScalingResult> {
    const currentLoad = this.calculateCurrentLoad(demandPrediction);
    const recommendedNodes = this.calculateRecommendedNodes(demandPrediction);

    const scalingActions = this.determineScalingActions(
      recommendedNodes,
      currentLoad,
    );

    // Execute scaling actions
    for (const action of scalingActions) {
      await this.executeScalingAction(action);
    }

    return {
      success: true,
      scalingActions,
      currentLoad,
      estimatedCost: this.estimateCost(recommendedNodes),
    };
  }

  private calculateCurrentLoad(prediction: MLDemandPrediction): number {
    const baseLoad = (prediction.expectedRequests / 1000) * 100;
    return Math.min(baseLoad * prediction.seasonalMultiplier, 100);
  }

  private calculateRecommendedNodes(prediction: MLDemandPrediction): number {
    const loadBasedNodes = Math.ceil(prediction.expectedRequests / 500); // 500 requests per node
    const seasonalNodes = Math.ceil(
      loadBasedNodes * prediction.seasonalMultiplier,
    );

    return Math.max(
      this.config.minNodes,
      Math.min(seasonalNodes, this.config.maxNodes),
    );
  }

  private determineScalingActions(
    recommendedNodes: number,
    currentLoad: number,
  ): Array<{
    action: 'scale_up' | 'scale_down' | 'maintain';
    nodeCount: number;
    reason: string;
  }> {
    const actions: Array<{
      action: 'scale_up' | 'scale_down' | 'maintain';
      nodeCount: number;
      reason: string;
    }> = [];

    if (
      currentLoad > this.config.scaleUpThreshold &&
      this.currentNodeCount < recommendedNodes
    ) {
      actions.push({
        action: 'scale_up',
        nodeCount: Math.min(recommendedNodes, this.currentNodeCount + 2),
        reason: `High load detected: ${currentLoad}%`,
      });
    } else if (
      currentLoad < this.config.scaleDownThreshold &&
      this.currentNodeCount > recommendedNodes
    ) {
      actions.push({
        action: 'scale_down',
        nodeCount: Math.max(this.config.minNodes, this.currentNodeCount - 1),
        reason: `Low load detected: ${currentLoad}%`,
      });
    } else {
      actions.push({
        action: 'maintain',
        nodeCount: this.currentNodeCount,
        reason: `Load within acceptable range: ${currentLoad}%`,
      });
    }

    return actions;
  }

  private async executeScalingAction(action: {
    action: 'scale_up' | 'scale_down' | 'maintain';
    nodeCount: number;
    reason: string;
  }): Promise<void> {
    console.log(`Executing ${action.action}: ${action.reason}`);

    switch (action.action) {
      case 'scale_up':
        await this.scaleUp(action.nodeCount);
        break;
      case 'scale_down':
        await this.scaleDown(action.nodeCount);
        break;
      case 'maintain':
        // No action needed
        break;
    }
  }

  private async scaleUp(targetNodes: number): Promise<void> {
    console.log(
      `Scaling up from ${this.currentNodeCount} to ${targetNodes} nodes`,
    );
    this.currentNodeCount = targetNodes;
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate scaling delay
  }

  private async scaleDown(targetNodes: number): Promise<void> {
    console.log(
      `Scaling down from ${this.currentNodeCount} to ${targetNodes} nodes`,
    );
    this.currentNodeCount = targetNodes;
    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate scaling delay
  }

  private estimateCost(nodeCount: number): number {
    // Cost estimation: $0.10 per node per hour
    return nodeCount * 0.1;
  }

  getScalingMetrics(): {
    currentNodes: number;
    minNodes: number;
    maxNodes: number;
    utilizationPercent: number;
  } {
    return {
      currentNodes: this.currentNodeCount,
      minNodes: this.config.minNodes,
      maxNodes: this.config.maxNodes,
      utilizationPercent: 65, // Simulated current utilization
    };
  }
}
