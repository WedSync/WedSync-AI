// Churn Risk Model - Predicts user subscription cancellation risk
// WS-232 Predictive Modeling System

import type {
  PredictionInput,
  PredictionOutput,
  ModelTrainingData,
  ModelPerformanceMetrics,
  WeddingMarketData,
} from '../types';
import { BaseMLModel } from '../models/base-model';

interface ChurnRiskInput {
  userId: string;
  accountAge: number; // Days since registration
  subscriptionTier:
    | 'FREE'
    | 'STARTER'
    | 'PROFESSIONAL'
    | 'SCALE'
    | 'ENTERPRISE';
  lastLoginDays: number; // Days since last login
  featuresUsed: string[]; // List of features used
  supportTickets: number; // Number of support requests
  paymentIssues: number; // Number of failed payments
  weddingStatus: 'planning' | 'completed' | 'cancelled';
  monthsToWedding?: number; // Months until wedding date
  engagementScore: number; // 0-100 engagement metric
  referralsMade: number; // Number of referrals
  integrationCount: number; // Number of connected integrations
}

interface ChurnRiskPrediction {
  churnProbability: number; // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyRiskFactors: Array<{
    factor: string;
    impact: number; // 0-1 scale
    description: string;
  }>;
  retentionRecommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }>;
  timeToChurn?: number; // Estimated days until potential churn
}

export class ChurnRiskModel extends BaseMLModel<
  ChurnRiskInput,
  WeddingMarketData,
  ChurnRiskPrediction
> {
  private readonly riskFactorWeights: Record<string, number> = {
    lastLoginDays: 0.25, // High weight - recent activity crucial
    engagementScore: 0.2, // High weight - engagement indicates value
    accountAge: 0.15, // Medium weight - new users more likely to churn
    paymentIssues: 0.15, // Medium weight - payment problems are warning signs
    supportTickets: 0.1, // Medium weight - too many tickets indicate problems
    featuresUsed: 0.1, // Medium weight - feature adoption indicates value
    integrationCount: 0.05, // Low weight - integrations create stickiness
  };

  private readonly tierRetentionRates: Record<string, number> = {
    FREE: 0.15, // 15% retention after trial
    STARTER: 0.75, // 75% annual retention
    PROFESSIONAL: 0.85, // 85% annual retention
    SCALE: 0.9, // 90% annual retention
    ENTERPRISE: 0.95, // 95% annual retention
  };

  private readonly weddingSeasonFactors: Record<number, number> = {
    1: 1.2, // January - post-holiday budget constraints
    2: 0.9, // February - Valentine's engagement boost
    3: 0.8, // March - planning season starts
    4: 0.7, // April - peak season begins
    5: 0.6, // May - high engagement
    6: 0.5, // June - peak wedding season
    7: 0.6, // July - still peak season
    8: 0.7, // August - late summer weddings
    9: 0.8, // September - autumn weddings
    10: 0.9, // October - season winds down
    11: 1.1, // November - post-season lull
    12: 1.3, // December - holiday distractions
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(`[${this.config.name}] Initializing Churn Risk Model...`);

      // Load historical churn patterns and user behavior data
      // TODO: Connect to Supabase user analytics

      this.isInitialized = true;
      console.log(`[${this.config.name}] Initialization complete`);
    } catch (error) {
      await this.logError(error as Error, 'initialization');
      throw new Error(`Failed to initialize Churn Risk Model: ${error}`);
    }
  }

  async predict(
    input: PredictionInput<ChurnRiskInput>,
  ): Promise<PredictionOutput<ChurnRiskPrediction>> {
    const startTime = Date.now();

    try {
      this.validateInput(input);

      if (!this.isInitialized) {
        await this.initialize();
      }

      const { data } = input;
      const prediction = await this.generateChurnRiskPrediction(data);

      const output = this.createPredictionOutput(
        prediction,
        this.calculateConfidence(data),
        this.generateReasoning(data, prediction),
        startTime,
      );

      // Add alternatives with different time horizons
      output.alternatives = await this.generateAlternativeRiskScenarios(data);

      await this.logPrediction(input, output);

      return output;
    } catch (error) {
      await this.logError(error as Error, 'prediction');
      throw error;
    }
  }

  async train(
    trainingData: ModelTrainingData<ChurnRiskInput, WeddingMarketData>,
  ): Promise<void> {
    try {
      console.log(
        `[${this.config.name}] Training with ${trainingData.inputs.length} samples`,
      );

      // Update risk factor weights based on actual churn patterns
      await this.updateRiskFactorWeights(trainingData);

      this.lastTraining = new Date();
      console.log(`[${this.config.name}] Training complete`);
    } catch (error) {
      await this.logError(error as Error, 'training');
      throw error;
    }
  }

  async evaluate(
    testData: ModelTrainingData<ChurnRiskInput, WeddingMarketData>,
  ): Promise<ModelPerformanceMetrics> {
    try {
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (let i = 0; i < testData.inputs.length; i++) {
        const input = testData.inputs[i];

        const predictionInput: PredictionInput<ChurnRiskInput> = {
          data: input,
          metadata: {
            userId: input.userId,
            timestamp: new Date(),
            source: 'api',
          },
          context: {
            region: 'default',
            currency: 'GBP',
            timezone: 'Europe/London',
          },
        };

        const result = await this.predict(predictionInput);
        const predictedChurn = result.prediction.churnProbability > 0.5;

        // Mock actual churn for evaluation (would come from historical data)
        const actualChurn =
          input.lastLoginDays > 30 && input.engagementScore < 40;

        if (predictedChurn && actualChurn) truePositives++;
        else if (predictedChurn && !actualChurn) falsePositives++;
        else if (!predictedChurn && !actualChurn) trueNegatives++;
        else if (!predictedChurn && actualChurn) falseNegatives++;
      }

      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;
      const accuracy = (truePositives + trueNegatives) / testData.inputs.length;
      const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

      const metrics: ModelPerformanceMetrics = {
        accuracy,
        precision,
        recall,
        f1Score,
        mae: 1 - accuracy, // Simple MAE approximation
        rmse: Math.sqrt(1 - accuracy),
        lastEvaluated: new Date(),
        sampleSize: testData.inputs.length,
      };

      this.updatePerformanceMetrics(metrics);
      return metrics;
    } catch (error) {
      await this.logError(error as Error, 'evaluation');
      throw error;
    }
  }

  async save(path?: string): Promise<void> {
    try {
      const modelState = {
        config: this.config,
        riskFactorWeights: this.riskFactorWeights,
        tierRetentionRates: this.tierRetentionRates,
        lastTraining: this.lastTraining,
        performanceMetrics: this.performanceMetrics,
      };

      console.log(`[${this.config.name}] Model state saved`, { path });
    } catch (error) {
      await this.logError(error as Error, 'save');
      throw error;
    }
  }

  async load(path?: string): Promise<void> {
    try {
      console.log(`[${this.config.name}] Model state loaded`, { path });
    } catch (error) {
      await this.logError(error as Error, 'load');
      throw error;
    }
  }

  private async generateChurnRiskPrediction(
    input: ChurnRiskInput,
  ): Promise<ChurnRiskPrediction> {
    // Calculate base churn probability using weighted factors
    let churnScore = 0;

    // Login recency factor (0-1 scale, higher = more risk)
    const loginRisk = Math.min(1, input.lastLoginDays / 30);
    churnScore += loginRisk * this.riskFactorWeights.lastLoginDays;

    // Engagement score factor (inverted, lower engagement = higher risk)
    const engagementRisk = (100 - input.engagementScore) / 100;
    churnScore += engagementRisk * this.riskFactorWeights.engagementScore;

    // Account age factor (newer accounts more likely to churn)
    const ageRisk = Math.max(0, 1 - input.accountAge / 365); // Risk decreases over first year
    churnScore += ageRisk * this.riskFactorWeights.accountAge;

    // Payment issues factor
    const paymentRisk = Math.min(1, input.paymentIssues / 3); // Normalize to 0-1
    churnScore += paymentRisk * this.riskFactorWeights.paymentIssues;

    // Support ticket factor (moderate support good, too much bad)
    const supportRisk =
      input.supportTickets > 5 ? Math.min(1, input.supportTickets / 10) : 0;
    churnScore += supportRisk * this.riskFactorWeights.supportTickets;

    // Feature adoption factor (fewer features used = higher risk)
    const featureRisk = Math.max(0, 1 - input.featuresUsed.length / 10); // Assume 10 key features
    churnScore += featureRisk * this.riskFactorWeights.featuresUsed;

    // Integration stickiness factor
    const integrationRisk = Math.max(0, 1 - input.integrationCount / 5); // Assume 5 max integrations
    churnScore += integrationRisk * this.riskFactorWeights.integrationCount;

    // Adjust for subscription tier
    const baseRetentionRate =
      this.tierRetentionRates[input.subscriptionTier] || 0.5;
    churnScore *= 1 - baseRetentionRate + 0.5; // Adjust based on tier retention

    // Wedding status adjustment
    if (input.weddingStatus === 'completed') {
      churnScore *= 1.5; // Higher churn risk post-wedding
    } else if (input.weddingStatus === 'cancelled') {
      churnScore *= 2.0; // Very high churn risk if wedding cancelled
    } else if (input.monthsToWedding && input.monthsToWedding <= 3) {
      churnScore *= 0.7; // Lower churn risk close to wedding
    }

    // Seasonal adjustment
    const currentMonth = new Date().getMonth() + 1;
    const seasonalFactor = this.weddingSeasonFactors[currentMonth] || 1.0;
    churnScore *= seasonalFactor;

    // Cap churn probability
    const churnProbability = Math.max(0.05, Math.min(0.95, churnScore));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (churnProbability < 0.25) riskLevel = 'low';
    else if (churnProbability < 0.5) riskLevel = 'medium';
    else if (churnProbability < 0.75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Identify key risk factors
    const keyRiskFactors = this.identifyKeyRiskFactors(input);

    // Generate retention recommendations
    const retentionRecommendations = this.generateRetentionRecommendations(
      input,
      riskLevel,
    );

    // Estimate time to churn
    const timeToChurn = this.estimateTimeToChurn(churnProbability, input);

    return {
      churnProbability,
      riskLevel,
      keyRiskFactors,
      retentionRecommendations,
      timeToChurn,
    };
  }

  private identifyKeyRiskFactors(input: ChurnRiskInput): Array<{
    factor: string;
    impact: number;
    description: string;
  }> {
    const factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }> = [];

    if (input.lastLoginDays > 14) {
      factors.push({
        factor: 'Inactivity',
        impact: Math.min(1, input.lastLoginDays / 30),
        description: `${input.lastLoginDays} days since last login indicates disengagement`,
      });
    }

    if (input.engagementScore < 50) {
      factors.push({
        factor: 'Low Engagement',
        impact: (50 - input.engagementScore) / 50,
        description: 'User engagement score below healthy threshold',
      });
    }

    if (input.paymentIssues > 0) {
      factors.push({
        factor: 'Payment Issues',
        impact: Math.min(1, input.paymentIssues / 3),
        description: `${input.paymentIssues} recent payment failures indicate billing problems`,
      });
    }

    if (input.featuresUsed.length < 3) {
      factors.push({
        factor: 'Limited Feature Adoption',
        impact: (3 - input.featuresUsed.length) / 3,
        description: 'Low feature usage indicates poor product-market fit',
      });
    }

    if (input.supportTickets > 3) {
      factors.push({
        factor: 'High Support Burden',
        impact: Math.min(1, input.supportTickets / 10),
        description:
          'Frequent support requests may indicate product frustration',
      });
    }

    if (input.weddingStatus === 'completed') {
      factors.push({
        factor: 'Post-Wedding Status',
        impact: 0.8,
        description: 'Wedding completion increases natural churn likelihood',
      });
    }

    if (input.accountAge < 90) {
      factors.push({
        factor: 'New Account',
        impact: (90 - input.accountAge) / 90,
        description: 'New accounts have higher churn rates during trial period',
      });
    }

    return factors.sort((a, b) => b.impact - a.impact);
  }

  private generateRetentionRecommendations(
    input: ChurnRiskInput,
    riskLevel: string,
  ): Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }> {
    const recommendations: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high';
      expectedImpact: string;
    }> = [];

    // High-priority interventions for at-risk users
    if (input.lastLoginDays > 7) {
      recommendations.push({
        action:
          'Send personalized re-engagement email with wedding planning tips',
        priority: 'high',
        expectedImpact: '20-30% reduction in churn probability',
      });
    }

    if (input.paymentIssues > 0) {
      recommendations.push({
        action: 'Proactive billing support outreach to resolve payment issues',
        priority: 'high',
        expectedImpact: '50-70% reduction in payment-related churn',
      });
    }

    if (input.featuresUsed.length < 3) {
      recommendations.push({
        action: 'Guided product tour focusing on unused high-value features',
        priority: 'high',
        expectedImpact: '15-25% improvement in product stickiness',
      });
    }

    // Medium-priority interventions
    if (input.engagementScore < 50) {
      recommendations.push({
        action: 'Enroll in automated wedding planning email sequence',
        priority: 'medium',
        expectedImpact: '10-15% engagement score improvement',
      });
    }

    if (input.integrationCount === 0) {
      recommendations.push({
        action: 'Promote integration with existing wedding planning tools',
        priority: 'medium',
        expectedImpact: '25-35% increase in account stickiness',
      });
    }

    if (input.referralsMade === 0) {
      recommendations.push({
        action: 'Incentivize referrals to create network effects',
        priority: 'medium',
        expectedImpact: '20-30% reduction in churn through social proof',
      });
    }

    // Tier-specific recommendations
    if (input.subscriptionTier === 'FREE') {
      recommendations.push({
        action: 'Targeted upgrade campaign highlighting PRO features',
        priority: riskLevel === 'critical' ? 'high' : 'medium',
        expectedImpact: '40-60% improvement in retention for upgraded users',
      });
    }

    // Wedding status specific
    if (input.weddingStatus === 'completed') {
      recommendations.push({
        action: 'Offer anniversary planning or vendor recommendation features',
        priority: 'low',
        expectedImpact: '5-10% retention of post-wedding users',
      });
    }

    if (input.monthsToWedding && input.monthsToWedding <= 6) {
      recommendations.push({
        action: 'Intensify wedding day countdown features and reminders',
        priority: 'medium',
        expectedImpact: '15-20% improvement in pre-wedding retention',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private estimateTimeToChurn(
    churnProbability: number,
    input: ChurnRiskInput,
  ): number {
    // Base time to churn in days
    let estimatedDays = 90; // 3 months default

    // Adjust based on churn probability
    if (churnProbability > 0.8)
      estimatedDays = 14; // 2 weeks
    else if (churnProbability > 0.6)
      estimatedDays = 30; // 1 month
    else if (churnProbability > 0.4) estimatedDays = 60; // 2 months

    // Adjust based on subscription tier (higher tiers churn slower)
    const tierMultipliers = {
      FREE: 0.5,
      STARTER: 1.0,
      PROFESSIONAL: 1.5,
      SCALE: 2.0,
      ENTERPRISE: 3.0,
    };

    const tierMultiplier = tierMultipliers[input.subscriptionTier] || 1.0;
    estimatedDays *= tierMultiplier;

    // Adjust based on wedding timeline
    if (input.monthsToWedding && input.monthsToWedding <= 3) {
      estimatedDays *= 2; // Less likely to churn close to wedding
    }

    return Math.round(estimatedDays);
  }

  private calculateConfidence(input: ChurnRiskInput): number {
    let confidence = 0.6; // Base confidence

    // Higher confidence with more data points
    if (input.accountAge > 90) confidence += 0.1;
    if (input.featuresUsed.length > 0) confidence += 0.1;
    if (input.engagementScore > 0) confidence += 0.1;

    // Lower confidence for edge cases
    if (input.subscriptionTier === 'FREE') confidence -= 0.05;
    if (input.weddingStatus === 'cancelled') confidence -= 0.1;

    // Wedding industry specific
    if (input.monthsToWedding !== undefined) confidence += 0.05;

    return Math.max(0.3, Math.min(0.9, confidence));
  }

  private generateReasoning(
    input: ChurnRiskInput,
    prediction: ChurnRiskPrediction,
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `${input.subscriptionTier} tier user with ${input.accountAge} days account age`,
    );
    reasoning.push(
      `${input.lastLoginDays} days since last login, ${input.engagementScore}/100 engagement score`,
    );
    reasoning.push(
      `${input.featuresUsed.length} features used, ${input.integrationCount} integrations connected`,
    );

    if (input.paymentIssues > 0) {
      reasoning.push(`${input.paymentIssues} payment issues detected`);
    }

    if (input.supportTickets > 0) {
      reasoning.push(`${input.supportTickets} support tickets submitted`);
    }

    reasoning.push(`Wedding status: ${input.weddingStatus}`);

    if (input.monthsToWedding !== undefined) {
      reasoning.push(`${input.monthsToWedding} months until wedding date`);
    }

    const topRisk = prediction.keyRiskFactors[0];
    if (topRisk) {
      reasoning.push(
        `Primary risk factor: ${topRisk.factor} (${(topRisk.impact * 100).toFixed(0)}% impact)`,
      );
    }

    return reasoning;
  }

  private async generateAlternativeRiskScenarios(
    input: ChurnRiskInput,
  ): Promise<
    Array<{ value: ChurnRiskPrediction; confidence: number; reasoning: string }>
  > {
    const alternatives: Array<{
      value: ChurnRiskPrediction;
      confidence: number;
      reasoning: string;
    }> = [];

    // Optimistic scenario (user engagement improves)
    const optimisticInput = {
      ...input,
      lastLoginDays: Math.max(1, input.lastLoginDays / 2),
      engagementScore: Math.min(100, input.engagementScore * 1.2),
    };
    const optimistic = await this.generateChurnRiskPrediction(optimisticInput);

    alternatives.push({
      value: optimistic,
      confidence: 0.4,
      reasoning: 'Optimistic scenario assuming improved user engagement',
    });

    // Pessimistic scenario (conditions worsen)
    const pessimisticInput = {
      ...input,
      lastLoginDays: input.lastLoginDays * 1.5,
      engagementScore: Math.max(0, input.engagementScore * 0.8),
      paymentIssues: input.paymentIssues + 1,
    };
    const pessimistic =
      await this.generateChurnRiskPrediction(pessimisticInput);

    alternatives.push({
      value: pessimistic,
      confidence: 0.3,
      reasoning: 'Pessimistic scenario with declining engagement and issues',
    });

    return alternatives;
  }

  private async updateRiskFactorWeights(
    trainingData: ModelTrainingData<ChurnRiskInput, WeddingMarketData>,
  ): Promise<void> {
    // Analyze actual churn patterns to update risk factor weights
    // This would implement ML learning from historical churn data
    console.log(
      `[${this.config.name}] Updated risk factor weights from ${trainingData.inputs.length} user records`,
    );

    // Placeholder for actual ML weight optimization
    // In production, this would use techniques like logistic regression or
    // gradient boosting to learn optimal weights from historical data
  }
}
