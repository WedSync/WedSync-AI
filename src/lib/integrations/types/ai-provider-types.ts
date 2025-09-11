/**
 * AI Provider Integration Types - Shared definitions
 *
 * Shared type definitions to prevent circular dependencies in the AI
 * provider integration system. All AI services should use these types
 * to ensure compatibility and avoid circular imports.
 */

// Core AI Provider enumeration (extracted to avoid circular dependencies)
export enum AIProvider {
  PLATFORM_OPENAI = 'platform_openai',
  CLIENT_OPENAI = 'client_openai',
  CLIENT_ANTHROPIC = 'client_anthropic',
  CLIENT_AZURE_OPENAI = 'client_azure_openai',
}

// Core interfaces for AI request/response flow
export interface AIRequest {
  id: string;
  supplierId: string;
  requestType:
    | 'email_template'
    | 'image_analysis'
    | 'text_completion'
    | 'embedding'
    | 'wedding_content';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingDate?: Date;
  isWeddingDay?: boolean;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  provider: AIProvider;
  usage: {
    tokensUsed: number;
    cost: number;
    processingTime: number;
  };
  metadata?: Record<string, any>;
}

// Supplier AI configuration
export interface SupplierAIConfig {
  supplierId: string;
  currentProvider: AIProvider;
  platformConfig?: {
    tier: 'starter' | 'professional' | 'scale' | 'enterprise';
    monthlyQuota: number;
    usedQuota: number;
    resetDate: Date;
  };
  clientConfig?: {
    provider: AIProvider;
    apiKey?: string;
    organizationId?: string;
    validated: boolean;
    lastValidation: Date;
  };
  preferences: {
    preferredProvider: 'platform' | 'client' | 'auto';
    costOptimized: boolean;
    performanceOptimized: boolean;
    enableFailover: boolean;
  };
  restrictions: {
    allowMigration: boolean;
    maxCostPerRequest: number;
    maxTokensPerRequest: number;
  };
}

// Health monitoring interfaces
export interface HealthStatus {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  errorRate: number;
  rateLimitRemaining: number;
  lastChecked: Date;
  issues: string[];
}

export interface AIProviderHealthMonitorInterface {
  checkProviderHealth(
    provider: AIProvider,
    apiKey?: string,
  ): Promise<HealthStatus>;
  performRoutineHealthCheck(): Promise<void>;
}

// Migration result types
export interface MigrationResult {
  migrationId: string;
  success: boolean;
  fromProvider: AIProvider;
  toProvider: AIProvider;
  duration: number;
  requestsProcessed: number;
  errorCount: number;
  rollbackAvailable: boolean;
  metadata?: Record<string, any>;
}

// Usage tracking interfaces
export interface AIRequestTracking {
  id: string;
  supplierId: string;
  provider: AIProvider;
  requestType: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
  weddingDate?: Date;
  isWeddingDay: boolean;
  metadata?: Record<string, any>;
}

export interface AIUsageTrackingInterface {
  trackRequest(
    request: any,
    response: any,
    provider: AIProvider,
  ): Promise<void>;
}

// Platform and Client AI service interfaces
export interface PlatformAIService {
  executePlatformRequest(request: any): Promise<any>;
  validatePlatformAccess(
    supplierId: string,
  ): Promise<{ valid: boolean; error?: string }>;
}

export interface ClientAIService {
  executeClientRequest(request: AIRequest, config: any): Promise<any>;
  validateClientProvider(
    provider: AIProvider,
    apiKey: string,
  ): Promise<{ valid: boolean; error?: string }>;
}

// Service dependency injection interface
export interface AIProviderServices {
  platformAI?: PlatformAIService;
  clientAI?: ClientAIService;
  healthMonitor?: AIProviderHealthMonitorInterface;
  usageTracker?: AIUsageTrackingInterface;
}
