/**
 * WS-343 CRM Integration Hub - Team C
 * CRM Provider Interface and Core Types
 *
 * This file defines the unified interface that all CRM providers must implement,
 * along with wedding-specific data models and authentication configurations.
 *
 * @priority CRITICAL - Core platform integration layer
 * @weddingContext Handles irreplaceable wedding data - zero tolerance for loss
 */

import { z } from 'zod';

/**
 * Canonical Wedding Data Model
 *
 * Represents wedding data in WedSync's unified format across all CRM providers.
 * This is the single source of truth for wedding data structure.
 */
export const WeddingDataSchema = z.object({
  // Core Wedding Identification (Immutable)
  weddingId: z.string().min(1, 'Wedding ID is required'),
  weddingDate: z.string().datetime('Wedding date must be valid ISO datetime'),

  // Couple Information (Primary Contact Data)
  couples: z.object({
    partner1: z.object({
      firstName: z.string().min(1, 'Partner 1 first name required'),
      lastName: z.string().min(1, 'Partner 1 last name required'),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    partner2: z.object({
      firstName: z.string().min(1, 'Partner 2 first name required'),
      lastName: z.string().min(1, 'Partner 2 last name required'),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
  }),

  // Venue Information (Critical for wedding day coordination)
  venue: z
    .object({
      name: z.string(),
      address: z.string().optional(),
      coordinates: z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
        .optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
    })
    .optional(),

  // Wedding Details
  guestCount: z.number().int().min(0).optional(),
  budget: z.number().min(0).optional(),
  packages: z.array(
    z.object({
      name: z.string(),
      price: z.number().min(0),
      description: z.string().optional(),
      services: z.array(z.string()),
    }),
  ),

  // Wedding Timeline & Coordination (Critical for vendor coordination)
  timeline: z.array(
    z.object({
      time: z.string().datetime(),
      event: z.string(),
      location: z.string().optional(),
      vendors: z.array(z.string()),
      notes: z.string().optional(),
    }),
  ),

  // Vendor Coordination Notes
  vendorNotes: z.array(
    z.object({
      timestamp: z.string().datetime(),
      author: z.string(),
      note: z.string(),
      category: z.enum(['general', 'timeline', 'logistics', 'emergency']),
    }),
  ),

  // Status and Metadata
  status: z.enum(['inquiry', 'booked', 'completed', 'cancelled']),
  source: z.string(), // CRM provider identifier
  lastSync: z.string().datetime(),
  externalId: z.string(), // ID in source CRM system
});

export type WeddingData = z.infer<typeof WeddingDataSchema>;

/**
 * Authentication Configuration for Different CRM Providers
 *
 * Supports multiple authentication methods:
 * - API Key: Simple header-based auth (Tave)
 * - OAuth2 PKCE: Secure flow for public clients (HoneyBook)
 * - Basic Auth: Username/password (Seventeen Hats)
 * - Screen Scraping: For CRMs without APIs (Light Blue)
 */
export const AuthConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('api_key'),
    apiKey: z.string().min(10, 'API key too short'),
    headerName: z.string().default('X-API-Key'),
  }),
  z.object({
    type: z.literal('oauth2_pkce'),
    clientId: z.string().min(1, 'OAuth client ID required'),
    clientSecret: z.string().min(1, 'OAuth client secret required'),
    authUrl: z.string().url('Auth URL must be valid'),
    tokenUrl: z.string().url('Token URL must be valid'),
    scopes: z.array(z.string()),
    redirectUrl: z.string().url('Redirect URL must be valid'),
  }),
  z.object({
    type: z.literal('basic_auth'),
    username: z.string().min(1, 'Username required'),
    password: z.string().min(1, 'Password required'),
  }),
  z.object({
    type: z.literal('screen_scraping'),
    loginUrl: z.string().url('Login URL must be valid'),
    username: z.string().min(1, 'Username required'),
    password: z.string().min(1, 'Password required'),
    sessionCookies: z.record(z.string()).optional(),
  }),
]);

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * CRM Provider Capabilities Definition
 *
 * Defines what each provider can do - critical for determining
 * sync strategies and user expectations.
 */
export interface ProviderCapabilities {
  // Real-time sync capabilities
  hasWebhooks: boolean;
  supportsBidirectionalSync: boolean;
  hasRealTimeUpdates: boolean;

  // API limitations
  maxRequestsPerMinute: number;
  maxRequestsPerHour?: number;
  batchSize?: number;

  // Feature support
  supportsFileUploads: boolean;
  canCreateWeddings: boolean;
  canUpdateWeddings: boolean;
  canDeleteWeddings: boolean;

  // Wedding-specific field support
  weddingFieldSupport: {
    venue: boolean;
    timeline: boolean;
    guestCount: boolean;
    budget: boolean;
    vendorNotes: boolean;
    customFields: boolean;
  };
}

/**
 * Sync Options for Controlling Import Behavior
 */
export interface SyncOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  limit?: number;
  offset?: number;
  includeCompleted?: boolean;
  includeArchived?: boolean;
  forceFullSync?: boolean;
}

/**
 * Connection Test Result with Wedding-Aware Status
 */
export interface ConnectionTestResult {
  success: boolean;
  accountInfo?: {
    accountName: string;
    userEmail: string;
    planType: string;
    weddingCount?: number;
  };
  rateLimitStatus?: {
    remaining: number;
    resetTime: Date;
  };
  error?: string;
}

/**
 * Sync Result with Wedding-Critical Error Classification
 */
export interface SyncResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    weddingCritical: boolean; // Escalate during wedding season
    context?: Record<string, any>;
  };
  metadata: {
    provider: string;
    timestamp: string;
    requestId: string;
    rateLimitRemaining?: number;
    processingTime?: number;
  };
}

/**
 * Field Mapping Configuration
 *
 * Defines how wedding data fields map between WedSync's canonical format
 * and each CRM provider's specific field structure.
 */
export interface CRMFieldMapping {
  wedsyncField: string; // Field name in WeddingData
  crmField: string; // Field path in CRM (e.g., 'jobs.0.event_date')
  fieldType:
    | 'text'
    | 'email'
    | 'phone'
    | 'date'
    | 'number'
    | 'boolean'
    | 'array';
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  isRequired: boolean;
  transformRules?: {
    format?: string;
    dateFormat?: string;
    defaultValue?: any;
    validation?: string; // Regex for validation
  };
}

/**
 * Webhook Processing Result
 */
export interface WebhookProcessResult {
  action: 'create' | 'update' | 'delete' | 'ignore';
  recordType: 'client' | 'project' | 'booking' | 'payment' | 'unknown';
  recordId: string | null;
  data?: any;
  metadata?: Record<string, any>;
}

/**
 * Core CRM Provider Interface
 *
 * ALL CRM providers must implement this unified interface.
 * This ensures consistent behavior across different CRM systems
 * while allowing for provider-specific implementations.
 *
 * @wedding_safety This interface includes wedding-critical error handling
 * and Saturday read-only mode support.
 */
export abstract class CRMProviderInterface {
  protected authConfig: AuthConfig;
  protected capabilities: ProviderCapabilities;
  protected baseUrl: string;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
  }

  // ========================================
  // PROVIDER IDENTIFICATION
  // ========================================

  /**
   * Get unique provider identifier (e.g., 'tave', 'honeybook')
   */
  abstract getProviderName(): string;

  /**
   * Get provider display name (e.g., 'Táve', 'HoneyBook')
   */
  abstract getDisplayName(): string;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  // ========================================
  // AUTHENTICATION MANAGEMENT
  // ========================================

  /**
   * Authenticate with CRM provider
   * @returns Auth result with token information
   */
  abstract testConnection(
    authConfig: AuthConfig,
  ): Promise<ConnectionTestResult>;

  /**
   * Refresh authentication if needed (OAuth tokens)
   * @returns Updated auth configuration
   */
  abstract refreshAuth(authConfig: AuthConfig): Promise<AuthConfig>;

  // ========================================
  // WEDDING DATA OPERATIONS
  // ========================================

  /**
   * Get all weddings from CRM provider
   * @param authConfig Provider authentication
   * @param options Sync filtering options
   * @returns List of wedding data in canonical format
   */
  abstract getAllClients(
    authConfig: AuthConfig,
    options?: SyncOptions,
  ): Promise<CRMClient[]>;

  /**
   * Get specific wedding by external ID
   * @param authConfig Provider authentication
   * @param clientId External CRM client ID
   * @returns Single wedding data
   */
  abstract getClientById(
    authConfig: AuthConfig,
    clientId: string,
  ): Promise<CRMClient>;

  /**
   * Create new wedding in CRM provider (if supported)
   * @param authConfig Provider authentication
   * @param clientData Wedding data to create
   * @returns External CRM ID of created wedding
   */
  abstract createClient(
    authConfig: AuthConfig,
    clientData: Partial<CRMClient>,
  ): Promise<string>;

  /**
   * Update existing wedding in CRM provider (if supported)
   * @param authConfig Provider authentication
   * @param clientId External CRM client ID
   * @param clientData Updated wedding data
   */
  abstract updateClient(
    authConfig: AuthConfig,
    clientId: string,
    clientData: Partial<CRMClient>,
  ): Promise<void>;

  // ========================================
  // FIELD MAPPING & METADATA
  // ========================================

  /**
   * Get available fields from CRM provider
   * @returns List of field definitions with types
   */
  abstract getAvailableFields(): Promise<CRMFieldDefinition[]>;

  /**
   * Get default field mappings for this provider
   * @returns Default mapping configuration
   */
  abstract getDefaultFieldMappings(): CRMFieldMapping[];

  // ========================================
  // REAL-TIME SYNC (OPTIONAL)
  // ========================================

  /**
   * Setup webhooks for real-time updates (if provider supports)
   * @param authConfig Provider authentication
   * @param webhookUrl WedSync webhook endpoint
   */
  setupWebhooks?(authConfig: AuthConfig, webhookUrl: string): Promise<void>;

  /**
   * Validate incoming webhook signature
   * @param payload Webhook payload
   * @param signature Webhook signature header
   * @returns True if signature is valid
   */
  validateWebhook?(payload: any, signature: string): boolean;

  /**
   * Process incoming webhook data
   * @param payload Webhook payload
   * @returns Processed webhook result
   */
  processWebhook?(payload: any): Promise<WebhookProcessResult>;

  // ========================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // (Must be implemented by each provider)
  // ========================================

  /**
   * Transform provider data to WedSync canonical format
   * @param providerData Raw data from CRM provider
   * @returns Wedding data in canonical format
   */
  protected abstract transformToCanonical(providerData: any): WeddingData;

  /**
   * Transform canonical data to provider format
   * @param weddingData Wedding data in canonical format
   * @returns Data formatted for CRM provider
   */
  protected abstract transformFromCanonical(weddingData: WeddingData): any;

  /**
   * Make authenticated API request to provider
   * @param endpoint API endpoint
   * @param options Request options
   * @returns API response
   */
  protected abstract makeRequest(
    endpoint: string,
    options?: RequestInit,
  ): Promise<any>;

  /**
   * Handle rate limiting for this provider
   * @param retryAfterSeconds Seconds to wait before retry
   */
  protected abstract handleRateLimit(retryAfterSeconds?: number): Promise<void>;
}

/**
 * CRM Client Data Structure
 *
 * Represents client/wedding data as imported from CRM systems.
 * This is the working format during import/export operations.
 */
export interface CRMClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  weddingDate?: string;
  partnerName?: string;
  venueInfo?: {
    name: string;
    address: string;
    coordinator?: string;
  };
  customFields: Record<string, any>;
  lastModified: Date;
  tags?: string[];
}

/**
 * CRM Field Definition
 *
 * Describes available fields in a CRM provider.
 */
export interface CRMFieldDefinition {
  fieldName: string;
  displayName: string;
  fieldType:
    | 'text'
    | 'email'
    | 'phone'
    | 'date'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect';
  isRequired: boolean;
  isPrimary?: boolean; // Key identification field
  options?: string[]; // For select fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

/**
 * Wedding-Specific Error Codes
 *
 * Standardized error codes across all CRM providers
 * with wedding industry context.
 */
export enum CRMErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Data Errors
  WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND',
  INVALID_WEDDING_DATE = 'INVALID_WEDDING_DATE',
  DUPLICATE_WEDDING = 'DUPLICATE_WEDDING',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Provider Specific
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  FEATURE_NOT_SUPPORTED = 'FEATURE_NOT_SUPPORTED',

  // Wedding Day Protection
  SATURDAY_READONLY_MODE = 'SATURDAY_READONLY_MODE',
  WEDDING_DAY_PROTECTION = 'WEDDING_DAY_PROTECTION',

  // System Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Wedding Safety Check Status
 *
 * Used to determine appropriate safety measures during sync operations.
 */
export interface WeddingSafetyStatus {
  isSaturday: boolean;
  isWeddingSeason: boolean; // May-October
  hasUpcomingWeddings: boolean; // Within 48 hours
  safetyLevel: 'safe' | 'caution' | 'critical' | 'readonly';
  recommendedAction: string;
}

/**
 * CRM Integration Health Check
 */
export interface IntegrationHealthCheck {
  providerName: string;
  isHealthy: boolean;
  lastSuccessfulSync: Date | null;
  consecutiveFailures: number;
  rateLimitStatus?: {
    remaining: number;
    resetTime: Date;
  };
  issues: string[];
  recommendations: string[];
}
