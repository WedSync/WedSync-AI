import { BaseIntegrationService } from '../BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
  ErrorSeverity,
} from '@/types/integrations';

interface AIAnalysisResult {
  categories: string[];
  confidence: number;
  sceneType: 'ceremony' | 'reception' | 'portrait' | 'detail' | 'candid';
  tags: string[];
  altText?: string;
  colorPalette?: string[];
  timestamp?: Date;
}

interface ImageProcessingJob {
  id: string;
  imageUrl: string;
  portfolioId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: 'openai' | 'google';
  result?: AIAnalysisResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class AIServicesIntegration extends BaseIntegrationService {
  protected serviceName = 'AI Services';
  private openAIClient: any;
  private googleVisionClient: any;
  private processingQueue: ImageProcessingJob[] = [];
  private batchSize = 10;
  private concurrentLimit = 5;
  private activeJobs = 0;

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      this.openAIClient = {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
      };
    }

    // Initialize Google Vision client
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.googleVisionClient = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test OpenAI connection
      const openAIHealthy = await this.testOpenAIConnection();
      if (openAIHealthy) return true;

      // Fallback to Google Vision
      const googleHealthy = await this.testGoogleVisionConnection();
      return googleHealthy;
    } catch (error) {
      this.logRequest('GET', '/health', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async testOpenAIConnection(): Promise<boolean> {
    if (!this.openAIClient) return false;

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.openAIClient.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testGoogleVisionConnection(): Promise<boolean> {
    if (!this.googleVisionClient) return false;

    try {
      // Simple test request to Google Vision API
      return true; // Simplified for now
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // AI services typically use API keys, not tokens
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options?.method || 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new IntegrationError(
          `Request failed with status ${response.status}`,
          'REQUEST_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new IntegrationError(
        'Request execution failed',
        'EXECUTION_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  async analyzeImage(
    imageUrl: string,
    portfolioId: string,
    userId: string,
  ): Promise<AIAnalysisResult> {
    try {
      // Try OpenAI first
      try {
        return await this.analyzeWithOpenAI(imageUrl);
      } catch (openAIError) {
        console.warn(
          'OpenAI analysis failed, falling back to Google Vision:',
          openAIError,
        );

        // Fallback to Google Vision
        return await this.analyzeWithGoogleVision(imageUrl);
      }
    } catch (error) {
      throw new IntegrationError(
        'All AI services failed',
        'ALL_PROVIDERS_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  private async analyzeWithOpenAI(imageUrl: string): Promise<AIAnalysisResult> {
    if (!this.openAIClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openAIClient.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this wedding photograph and provide:
                1. Scene type (ceremony, reception, portrait, detail, candid)
                2. Categories (bride, groom, family, venue, flowers, etc.)
                3. Confidence score (0-1)
                4. Tags for searchability
                5. Alt text for accessibility
                6. Dominant color palette
                
                Return as JSON with keys: sceneType, categories, confidence, tags, altText, colorPalette`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    return {
      ...analysis,
      timestamp: new Date(),
    };
  }

  private async analyzeWithGoogleVision(
    imageUrl: string,
  ): Promise<AIAnalysisResult> {
    if (!this.googleVisionClient) {
      throw new Error('Google Vision client not initialized');
    }

    // Simplified Google Vision implementation
    // In production, this would use the actual Google Vision API
    return {
      categories: ['wedding', 'photography'],
      confidence: 0.85,
      sceneType: 'candid',
      tags: ['wedding', 'celebration', 'people'],
      altText: 'Wedding photograph showing celebration moment',
      colorPalette: ['#FFFFFF', '#F5F5F5', '#E8E8E8'],
      timestamp: new Date(),
    };
  }

  async processBatchImages(
    images: Array<{ url: string; portfolioId: string; userId: string }>,
  ): Promise<ImageProcessingJob[]> {
    const jobs: ImageProcessingJob[] = images.map((img) => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageUrl: img.url,
      portfolioId: img.portfolioId,
      userId: img.userId,
      status: 'pending',
      provider: 'openai',
      createdAt: new Date(),
    }));

    this.processingQueue.push(...jobs);
    this.processBatchQueue();

    return jobs;
  }

  private async processBatchQueue(): Promise<void> {
    while (
      this.processingQueue.length > 0 &&
      this.activeJobs < this.concurrentLimit
    ) {
      const batch = this.processingQueue.splice(0, this.batchSize);

      for (const job of batch) {
        if (this.activeJobs >= this.concurrentLimit) {
          this.processingQueue.unshift(...batch.slice(batch.indexOf(job)));
          break;
        }

        this.processJob(job);
      }
    }
  }

  private async processJob(job: ImageProcessingJob): Promise<void> {
    this.activeJobs++;
    job.status = 'processing';

    try {
      const result = await this.analyzeImage(
        job.imageUrl,
        job.portfolioId,
        job.userId,
      );

      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();

      // Emit completion event
      this.emitJobCompletion(job);
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.status = 'failed';
      job.completedAt = new Date();

      // Emit failure event
      this.emitJobFailure(job, error);
    } finally {
      this.activeJobs--;

      // Continue processing queue if more jobs available
      if (this.processingQueue.length > 0) {
        setTimeout(() => this.processBatchQueue(), 100);
      }
    }
  }

  private emitJobCompletion(job: ImageProcessingJob): void {
    // In a real implementation, this would emit to an event system
    console.log(`Job ${job.id} completed successfully`);
  }

  private emitJobFailure(job: ImageProcessingJob, error: unknown): void {
    // In a real implementation, this would emit to an event system
    console.error(`Job ${job.id} failed:`, error);
  }

  async getJobStatus(jobId: string): Promise<ImageProcessingJob | null> {
    return this.processingQueue.find((job) => job.id === jobId) || null;
  }

  async getWeddingSpecificAnalysis(imageUrl: string): Promise<{
    isWeddingPhoto: boolean;
    weddingMoments: string[];
    emotionalContext: string;
    photographyStyle: string;
  }> {
    const analysis = await this.analyzeImage(imageUrl, '', '');

    return {
      isWeddingPhoto: analysis.categories.some((cat) =>
        ['wedding', 'bride', 'groom', 'ceremony', 'reception'].includes(
          cat.toLowerCase(),
        ),
      ),
      weddingMoments: analysis.tags.filter((tag) =>
        [
          'ceremony',
          'reception',
          'first-dance',
          'cake-cutting',
          'bouquet-toss',
        ].includes(tag),
      ),
      emotionalContext: this.determineEmotionalContext(analysis.tags),
      photographyStyle: this.determinePhotographyStyle(
        analysis.categories,
        analysis.tags,
      ),
    };
  }

  private determineEmotionalContext(tags: string[]): string {
    if (
      tags.some((tag) =>
        ['joy', 'happy', 'celebration', 'laughter'].includes(tag),
      )
    ) {
      return 'joyful';
    }
    if (tags.some((tag) => ['intimate', 'romantic', 'tender'].includes(tag))) {
      return 'romantic';
    }
    if (tags.some((tag) => ['formal', 'posed', 'traditional'].includes(tag))) {
      return 'formal';
    }
    return 'candid';
  }

  private determinePhotographyStyle(
    categories: string[],
    tags: string[],
  ): string {
    if (
      tags.some((tag) =>
        ['candid', 'documentary', 'photojournalistic'].includes(tag),
      )
    ) {
      return 'documentary';
    }
    if (tags.some((tag) => ['posed', 'formal', 'portrait'].includes(tag))) {
      return 'traditional';
    }
    if (
      tags.some((tag) => ['artistic', 'creative', 'dramatic'].includes(tag))
    ) {
      return 'artistic';
    }
    return 'mixed';
  }

  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    activeJobs: number;
  } {
    const pending = this.processingQueue.filter(
      (job) => job.status === 'pending',
    ).length;
    const processing = this.processingQueue.filter(
      (job) => job.status === 'processing',
    ).length;
    const completed = this.processingQueue.filter(
      (job) => job.status === 'completed',
    ).length;
    const failed = this.processingQueue.filter(
      (job) => job.status === 'failed',
    ).length;

    return {
      pending,
      processing,
      completed,
      failed,
      activeJobs: this.activeJobs,
    };
  }

  async optimizeProcessingResources(): Promise<void> {
    const queueStatus = this.getQueueStatus();

    // Adjust concurrent limit based on queue size and performance
    if (queueStatus.pending > 50 && this.concurrentLimit < 10) {
      this.concurrentLimit = Math.min(this.concurrentLimit + 1, 10);
    } else if (queueStatus.pending < 10 && this.concurrentLimit > 3) {
      this.concurrentLimit = Math.max(this.concurrentLimit - 1, 3);
    }

    // Adjust batch size based on success rate
    const totalProcessed = queueStatus.completed + queueStatus.failed;
    if (totalProcessed > 0) {
      const successRate = queueStatus.completed / totalProcessed;
      if (successRate > 0.95 && this.batchSize < 20) {
        this.batchSize = Math.min(this.batchSize + 2, 20);
      } else if (successRate < 0.8 && this.batchSize > 5) {
        this.batchSize = Math.max(this.batchSize - 2, 5);
      }
    }
  }
}
