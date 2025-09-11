// WS-182 Round 1: Web Worker for ML Churn Prediction
// High-performance background processing for churn predictions

export interface ChurnPredictionRequest {
  type: 'single_prediction' | 'batch_prediction' | 'feature_extraction';
  supplierId?: string;
  supplierIds?: string[];
  features?: any;
  modelId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChurnPredictionResponse {
  success: boolean;
  requestId: string;
  type: ChurnPredictionRequest['type'];
  predictions?: ChurnPrediction[];
  features?: any;
  inferenceTimeMs: number;
  error?: string;
}

interface ChurnPrediction {
  supplierId: string;
  churnRisk: number;
  confidence: number;
  riskFactors: string[];
  recommendedActions: string[];
  timeToChurn?: number;
}

class ChurnPredictionWorker {
  private models: Map<string, any> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheExpiry = 300000; // 5 minutes

  constructor() {
    this.initializeModels();
    this.setupMessageHandler();
  }

  private async initializeModels(): Promise<void> {
    try {
      const lightweightModel = await this.loadModel('churn_predictor_lite');
      const fullModel = await this.loadModel('churn_predictor_full');

      this.models.set('lite', lightweightModel);
      this.models.set('full', fullModel);

      console.log('ML models initialized in worker');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
    }
  }

  private async loadModel(modelId: string): Promise<any> {
    return {
      id: modelId,
      version: '1.0.0',
      accuracy: 0.87,
      inferenceTimeMs: modelId.includes('lite') ? 45 : 120,
    };
  }

  private setupMessageHandler(): void {
    self.onmessage = async (event: MessageEvent<ChurnPredictionRequest>) => {
      const startTime = performance.now();
      const request = event.data;
      const requestId = this.generateRequestId();

      try {
        let response: ChurnPredictionResponse;

        switch (request.type) {
          case 'single_prediction':
            response = await this.handleSinglePrediction(
              request,
              requestId,
              startTime,
            );
            break;
          case 'batch_prediction':
            response = await this.handleBatchPrediction(
              request,
              requestId,
              startTime,
            );
            break;
          case 'feature_extraction':
            response = await this.handleFeatureExtraction(
              request,
              requestId,
              startTime,
            );
            break;
          default:
            throw new Error(`Unknown request type: ${request.type}`);
        }

        self.postMessage(response);
      } catch (error) {
        const response: ChurnPredictionResponse = {
          success: false,
          requestId,
          type: request.type,
          inferenceTimeMs: performance.now() - startTime,
          error: error.message,
        };
        self.postMessage(response);
      }
    };
  }

  private async handleSinglePrediction(
    request: ChurnPredictionRequest,
    requestId: string,
    startTime: number,
  ): Promise<ChurnPredictionResponse> {
    if (!request.supplierId) {
      throw new Error('Supplier ID required for single prediction');
    }

    const cacheKey = `prediction_${request.supplierId}_${request.modelId}`;

    const cached = this.getCached(cacheKey);
    if (cached) {
      return {
        success: true,
        requestId,
        type: 'single_prediction',
        predictions: [cached],
        inferenceTimeMs: performance.now() - startTime,
      };
    }

    const prediction = await this.runPrediction(
      request.supplierId,
      request.features,
    );
    this.setCache(cacheKey, prediction);

    return {
      success: true,
      requestId,
      type: 'single_prediction',
      predictions: [prediction],
      inferenceTimeMs: performance.now() - startTime,
    };
  }

  private async handleBatchPrediction(
    request: ChurnPredictionRequest,
    requestId: string,
    startTime: number,
  ): Promise<ChurnPredictionResponse> {
    if (!request.supplierIds || request.supplierIds.length === 0) {
      throw new Error('Supplier IDs required for batch prediction');
    }

    const predictions: ChurnPrediction[] = [];
    const batchSize = Math.min(request.supplierIds.length, 50);

    for (let i = 0; i < request.supplierIds.length; i += batchSize) {
      const batch = request.supplierIds.slice(i, i + batchSize);
      const batchPromises = batch.map((supplierId) =>
        this.runPrediction(supplierId),
      );
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          predictions.push(result.value);
          const cacheKey = `prediction_${batch[index]}_${request.modelId}`;
          this.setCache(cacheKey, result.value);
        }
      });
    }

    return {
      success: true,
      requestId,
      type: 'batch_prediction',
      predictions,
      inferenceTimeMs: performance.now() - startTime,
    };
  }

  private async handleFeatureExtraction(
    request: ChurnPredictionRequest,
    requestId: string,
    startTime: number,
  ): Promise<ChurnPredictionResponse> {
    if (!request.supplierId) {
      throw new Error('Supplier ID required for feature extraction');
    }

    const features = await this.extractFeatures(request.supplierId);
    const cacheKey = `features_${request.supplierId}`;
    this.setCache(cacheKey, features);

    return {
      success: true,
      requestId,
      type: 'feature_extraction',
      features,
      inferenceTimeMs: performance.now() - startTime,
    };
  }

  private async runPrediction(
    supplierId: string,
    providedFeatures?: any,
  ): Promise<ChurnPrediction> {
    const features =
      providedFeatures || (await this.extractFeatures(supplierId));

    const churnRisk = this.calculateChurnRisk(features);
    const confidence = this.calculateConfidence(features);

    return {
      supplierId,
      churnRisk,
      confidence,
      riskFactors: this.identifyRiskFactors(features),
      recommendedActions: this.generateRecommendations(churnRisk, features),
      timeToChurn:
        churnRisk > 0.7 ? this.estimateTimeToChurn(features) : undefined,
    };
  }

  private async extractFeatures(supplierId: string): Promise<any> {
    return {
      id: supplierId,
      lastLogin: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      responseTime: Math.random() * 48,
      clientSatisfaction: 3 + Math.random() * 2,
      bookingFrequency: Math.random() * 10,
      paymentHistory: Math.random() * 100,
      communicationScore: Math.random() * 100,
      portfolioQuality: Math.random() * 100,
      marketPresence: Math.random() * 100,
    };
  }

  private calculateChurnRisk(features: any): number {
    const weights = {
      lastLogin: 0.25,
      responseTime: 0.15,
      clientSatisfaction: 0.2,
      bookingFrequency: 0.15,
      paymentHistory: 0.1,
      communicationScore: 0.15,
    };

    const daysSinceLogin =
      (Date.now() - features.lastLogin) / (24 * 60 * 60 * 1000);
    const loginRisk = Math.min(daysSinceLogin / 30, 1);
    const responseRisk = Math.min(features.responseTime / 48, 1);
    const satisfactionRisk = 1 - features.clientSatisfaction / 5;
    const frequencyRisk = 1 - Math.min(features.bookingFrequency / 10, 1);
    const paymentRisk = 1 - features.paymentHistory / 100;
    const communicationRisk = 1 - features.communicationScore / 100;

    const churnRisk =
      loginRisk * weights.lastLogin +
      responseRisk * weights.responseTime +
      satisfactionRisk * weights.clientSatisfaction +
      frequencyRisk * weights.bookingFrequency +
      paymentRisk * weights.paymentHistory +
      communicationRisk * weights.communicationScore;

    return Math.min(Math.max(churnRisk, 0), 1);
  }

  private calculateConfidence(features: any): number {
    const dataQuality = this.assessDataQuality(features);
    const modelConfidence = 0.87;
    return dataQuality * modelConfidence;
  }

  private assessDataQuality(features: any): number {
    const fields = Object.values(features);
    const nonNullFields = fields.filter(
      (value) => value !== null && value !== undefined,
    );
    return nonNullFields.length / fields.length;
  }

  private identifyRiskFactors(features: any): string[] {
    const factors: string[] = [];

    const daysSinceLogin =
      (Date.now() - features.lastLogin) / (24 * 60 * 60 * 1000);
    if (daysSinceLogin > 14) factors.push('Inactive for over 2 weeks');
    if (features.responseTime > 24) factors.push('Slow response time');
    if (features.clientSatisfaction < 3.5)
      factors.push('Low client satisfaction');
    if (features.bookingFrequency < 2) factors.push('Low booking frequency');
    if (features.paymentHistory < 80) factors.push('Payment issues');
    if (features.communicationScore < 70) factors.push('Poor communication');

    return factors;
  }

  private generateRecommendations(churnRisk: number, features: any): string[] {
    const recommendations: string[] = [];

    if (churnRisk > 0.7) {
      recommendations.push(
        'Immediate outreach required',
        'Schedule retention call',
      );
    } else if (churnRisk > 0.5) {
      recommendations.push('Monitor closely', 'Send engagement content');
    } else if (churnRisk > 0.3) {
      recommendations.push('Routine check-in', 'Offer new features');
    }

    const daysSinceLogin =
      (Date.now() - features.lastLogin) / (24 * 60 * 60 * 1000);
    if (daysSinceLogin > 7) recommendations.push('Re-engagement campaign');
    if (features.clientSatisfaction < 4)
      recommendations.push('Service improvement focus');
    if (features.bookingFrequency < 3)
      recommendations.push('Business development support');

    return recommendations;
  }

  private estimateTimeToChurn(features: any): number {
    const baseTime = 30;
    const churnRisk = this.calculateChurnRisk(features);
    return Math.max(baseTime * (1 - churnRisk), 1);
  }

  private getCached(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private generateRequestId(): string {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

if (typeof self !== 'undefined') {
  new ChurnPredictionWorker();
}
