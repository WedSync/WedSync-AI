/**
 * API Gateway Management System Types
 * WS-250 - Comprehensive type definitions for wedding-focused API gateway
 */

// ========================================
// Core Gateway Types
// ========================================

export interface APIRoute {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  target: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  weddingContext?: WeddingContext;
  version: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeddingContext {
  isWeddingCritical: boolean;
  saturdayProtection: boolean;
  vendorTier: VendorTier;
  seasonalPriority: boolean;
  emergencyOverride?: boolean;
}

export type VendorTier =
  | 'free'
  | 'starter'
  | 'professional'
  | 'scale'
  | 'enterprise';

export interface VendorTierConfig {
  tier: VendorTier;
  pricePerMonth: number;
  requestsPerMinute: number;
  burstLimit: number;
  concurrentConnections: number;
  priorityLevel: number;
  features: string[];
}

// ========================================
// Load Balancing Types
// ========================================

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-connections'
  | 'weighted-round-robin'
  | 'ip-hash'
  | 'least-response-time'
  | 'wedding-priority';

export interface BackendServer {
  id: string;
  url: string;
  weight: number;
  healthScore: number;
  currentConnections: number;
  responseTime: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  region: string;
  capabilities: string[];
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  maxRetries: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
  weddingSeasonAdjustments: boolean;
}

// ========================================
// Rate Limiting Types
// ========================================

export interface RateLimitRule {
  id: string;
  name: string;
  pattern: string;
  tier: VendorTier;
  limit: number;
  window: number; // seconds
  burstLimit: number;
  weddingDayMultiplier: number;
  seasonalAdjustment: number;
  enabled: boolean;
  createdAt: Date;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  tier: VendorTier;
  reason?: string;
}

export interface ThrottlingConfig {
  globalLimit: number;
  tierLimits: Record<VendorTier, number>;
  weddingSaturdayProtection: boolean;
  peakSeasonAdjustments: SeasonalConfig;
  emergencyThrottling: EmergencyThrottlingConfig;
}

export interface SeasonalConfig {
  enabled: boolean;
  peakMonths: number[]; // May = 5, Sep = 9
  trafficMultiplier: number;
  additionalCapacity: number;
}

export interface EmergencyThrottlingConfig {
  trigger: number; // CPU/memory threshold
  actionPlan: 'throttle' | 'queue' | 'reject';
  weddingAPIProtection: boolean;
  alertThreshold: number;
}

// ========================================
// Security Types
// ========================================

export interface SecurityPolicy {
  id: string;
  name: string;
  rules: SecurityRule[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  weddingProtection: boolean;
  enabled: boolean;
  createdAt: Date;
}

export interface SecurityRule {
  type:
    | 'jwt-validation'
    | 'ip-whitelist'
    | 'rate-limit'
    | 'request-validation'
    | 'sql-injection'
    | 'xss-protection';
  config: Record<string, unknown>;
  action: 'allow' | 'block' | 'log' | 'throttle';
  weddingOverride?: boolean;
}

export interface SecurityEnforcementResult {
  allowed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  blockReason?: string;
  suggestedAction?: string;
  threatLevel: number;
}

export interface JWTValidationConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: string;
  expirationGracePeriod: number;
}

// ========================================
// Analytics & Monitoring Types
// ========================================

export interface TrafficMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ip: string;
  vendorId?: string;
  weddingId?: string;
  tier: VendorTier;
  weddingContext?: WeddingContext;
}

export interface AggregatedMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorsByType: Record<string, number>;
  trafficByTier: Record<VendorTier, number>;
  weddingCriticalRequests: number;
  topEndpoints: Array<{
    path: string;
    requests: number;
    avgResponseTime: number;
  }>;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: Date;
  details: Record<string, unknown>;
  dependencyChecks: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  errorMessage?: string;
}

// ========================================
// Wedding-Specific Types
// ========================================

export interface WeddingAPIProtectionConfig {
  saturdayProtectionEnabled: boolean;
  criticalEndpoints: string[];
  priorityMultiplier: number;
  emergencyBypassEnabled: boolean;
  notificationWebhooks: string[];
  maximumLatency: number; // ms
  minimumSuccessRate: number; // percentage
}

export interface WeddingSeason {
  name: string;
  startMonth: number;
  endMonth: number;
  trafficMultiplier: number;
  additionalServers: number;
  specialHandling: boolean;
}

export interface VendorThrottlingRule {
  vendorId: string;
  tier: VendorTier;
  customLimits?: {
    requestsPerMinute: number;
    burstLimit: number;
    concurrentConnections: number;
  };
  weddingSeasonAdjustment: number;
  saturdayMultiplier: number;
  lastUpdated: Date;
}

// ========================================
// Request/Response Types
// ========================================

export interface GatewayRequest {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  ip: string;
  userAgent: string;
  vendorContext?: VendorContext;
  weddingContext?: WeddingContext;
}

export interface VendorContext {
  vendorId: string;
  tier: VendorTier;
  subscriptionStatus: 'active' | 'past_due' | 'canceled';
  lastPayment?: Date;
  customLimits?: Record<string, number>;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
  serverId: string;
  cacheHit: boolean;
  errors?: string[];
}

// ========================================
// Configuration Types
// ========================================

export interface GatewayConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  loadBalancing: LoadBalancerConfig;
  rateLimiting: ThrottlingConfig;
  security: {
    policies: SecurityPolicy[];
    jwtConfig: JWTValidationConfig;
  };
  analytics: {
    enabled: boolean;
    retention: number; // days
    realTimeMetrics: boolean;
  };
  weddingProtection: WeddingAPIProtectionConfig;
  monitoring: {
    healthCheckInterval: number;
    alertThresholds: Record<string, number>;
    webhookUrls: string[];
  };
}

// ========================================
// Error Types
// ========================================

export interface GatewayError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  requestId: string;
  context?: Record<string, unknown>;
  weddingImpact?: boolean;
}

export type GatewayErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECURITY_VIOLATION'
  | 'BACKEND_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_REQUEST'
  | 'WEDDING_DAY_PROTECTION'
  | 'TIER_LIMIT_EXCEEDED'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'SEASONAL_OVERLOAD';

// ========================================
// Circuit Breaker Types
// ========================================

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  threshold: number;
  timeout: number;
  weddingOverride?: boolean;
}

// ========================================
// Utility Types
// ========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
