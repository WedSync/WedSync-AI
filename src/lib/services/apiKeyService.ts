// apiKeyService.ts
// WS-072: API Key Management Service for Third-Party Integrations
// Handles secure generation, validation, and management of API keys

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  description?: string;
  integrationType?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  allowedIps?: string[];
  allowedOrigins?: string[];
  createdAt: Date;
}

export interface APIKeyCreateInput {
  name: string;
  description?: string;
  integrationType?: string;
  scopes: string[];
  expiresIn?: number; // days
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
  allowedOrigins?: string[];
}

export interface APIKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  totalDataTransferredMB: number;
  uniqueEndpoints: number;
  mostUsedEndpoint: string;
  errorRate: number;
}

export interface RateLimitStatus {
  minuteLimitOk: boolean;
  hourLimitOk: boolean;
  dayLimitOk: boolean;
  minuteRemaining: number;
  hourRemaining: number;
  dayRemaining: number;
}

class APIKeyService {
  private readonly KEY_PREFIX = 'ws_';
  private readonly KEY_LENGTH = 32;

  /**
   * Generate a new secure API key
   */
  private generateAPIKey(): { key: string; prefix: string; hash: string } {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const key = `${this.KEY_PREFIX}${randomBytes.toString('base64url')}`;
    const prefix = key.substring(0, 10);
    const hash = this.hashAPIKey(key);

    return { key, prefix, hash };
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashAPIKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key
   */
  async createAPIKey(
    input: APIKeyCreateInput,
  ): Promise<{ apiKey: APIKey; plainKey: string }> {
    const supabase = createServerComponentClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Generate the API key
    const { key, prefix, hash } = this.generateAPIKey();

    // Calculate expiration date if specified
    const expiresAt = input.expiresIn
      ? new Date(Date.now() + input.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Start transaction
    const { data: apiKeyData, error: createError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: input.name,
        key_prefix: prefix,
        key_hash: hash,
        description: input.description,
        integration_type: input.integrationType,
        expires_at: expiresAt,
        rate_limit_per_minute: input.rateLimitPerMinute || 60,
        rate_limit_per_hour: input.rateLimitPerHour || 1000,
        rate_limit_per_day: input.rateLimitPerDay || 10000,
        allowed_ips: input.allowedIps,
        allowed_origins: input.allowedOrigins,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create API key: ${createError.message}`);
    }

    // Get scope IDs
    const { data: scopes, error: scopeError } = await supabase
      .from('api_scopes')
      .select('id, scope')
      .in('scope', input.scopes);

    if (scopeError) {
      throw new Error(`Failed to fetch scopes: ${scopeError.message}`);
    }

    // Assign scopes to the API key
    if (scopes && scopes.length > 0) {
      const scopeAssignments = scopes.map((scope) => ({
        api_key_id: apiKeyData.id,
        scope_id: scope.id,
        granted_by: user.id,
      }));

      const { error: assignError } = await supabase
        .from('api_key_scopes')
        .insert(scopeAssignments);

      if (assignError) {
        // Rollback by deleting the API key
        await supabase.from('api_keys').delete().eq('id', apiKeyData.id);
        throw new Error(`Failed to assign scopes: ${assignError.message}`);
      }
    }

    const apiKey: APIKey = {
      id: apiKeyData.id,
      name: apiKeyData.name,
      keyPrefix: apiKeyData.key_prefix,
      description: apiKeyData.description,
      integrationType: apiKeyData.integration_type,
      lastUsedAt: apiKeyData.last_used_at,
      expiresAt: apiKeyData.expires_at,
      isActive: apiKeyData.is_active,
      scopes: input.scopes,
      rateLimitPerMinute: apiKeyData.rate_limit_per_minute,
      rateLimitPerHour: apiKeyData.rate_limit_per_hour,
      rateLimitPerDay: apiKeyData.rate_limit_per_day,
      allowedIps: apiKeyData.allowed_ips,
      allowedOrigins: apiKeyData.allowed_origins,
      createdAt: apiKeyData.created_at,
    };

    return { apiKey, plainKey: key };
  }

  /**
   * Validate an API key and return its details
   */
  async validateAPIKey(key: string): Promise<APIKey | null> {
    const supabase = createServerComponentClient({ cookies });

    const hash = this.hashAPIKey(key);
    const prefix = key.substring(0, 10);

    // Find the API key
    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select(
        `
        *,
        api_key_scopes (
          api_scopes (
            scope
          )
        )
      `,
      )
      .eq('key_hash', hash)
      .eq('key_prefix', prefix)
      .eq('is_active', true)
      .single();

    if (error || !apiKeyData) {
      return null;
    }

    // Check if expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return null;
    }

    // Extract scopes
    const scopes =
      apiKeyData.api_key_scopes?.map((ks: any) => ks.api_scopes.scope) || [];

    return {
      id: apiKeyData.id,
      name: apiKeyData.name,
      keyPrefix: apiKeyData.key_prefix,
      description: apiKeyData.description,
      integrationType: apiKeyData.integration_type,
      lastUsedAt: apiKeyData.last_used_at,
      expiresAt: apiKeyData.expires_at,
      isActive: apiKeyData.is_active,
      scopes,
      rateLimitPerMinute: apiKeyData.rate_limit_per_minute,
      rateLimitPerHour: apiKeyData.rate_limit_per_hour,
      rateLimitPerDay: apiKeyData.rate_limit_per_day,
      allowedIps: apiKeyData.allowed_ips,
      allowedOrigins: apiKeyData.allowed_origins,
      createdAt: apiKeyData.created_at,
    };
  }

  /**
   * Check if an API key has a specific scope
   */
  hasScope(apiKey: APIKey, requiredScope: string): boolean {
    // Check for admin scope
    if (apiKey.scopes.includes('admin:all')) {
      return true;
    }

    // Check for exact scope match
    if (apiKey.scopes.includes(requiredScope)) {
      return true;
    }

    // Check for wildcard scopes (e.g., read:* matches read:clients)
    const [action, resource] = requiredScope.split(':');
    const wildcardScope = `${action}:*`;

    return apiKey.scopes.includes(wildcardScope);
  }

  /**
   * Check rate limits for an API key
   */
  async checkRateLimit(apiKeyId: string): Promise<RateLimitStatus> {
    const supabase = createServerComponentClient({ cookies });

    const { data, error } = await supabase.rpc('check_api_rate_limit', {
      p_api_key_id: apiKeyId,
    });

    if (error) {
      throw new Error(`Failed to check rate limit: ${error.message}`);
    }

    return {
      minuteLimitOk: data[0].minute_limit_ok,
      hourLimitOk: data[0].hour_limit_ok,
      dayLimitOk: data[0].day_limit_ok,
      minuteRemaining: data[0].minute_remaining,
      hourRemaining: data[0].hour_remaining,
      dayRemaining: data[0].day_remaining,
    };
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(apiKeyId: string): Promise<void> {
    const supabase = createServerComponentClient({ cookies });

    const { error } = await supabase.rpc('increment_api_rate_limit', {
      p_api_key_id: apiKeyId,
    });

    if (error) {
      throw new Error(`Failed to increment rate limit: ${error.message}`);
    }
  }

  /**
   * Log API key usage
   */
  async logUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    requestSize?: number,
    responseSize?: number,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
  ): Promise<void> {
    const supabase = createServerComponentClient({ cookies });

    const { error } = await supabase.from('api_key_usage').insert({
      api_key_id: apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      request_size_bytes: requestSize,
      response_size_bytes: responseSize,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage,
    });

    if (error) {
      console.error('Failed to log API usage:', error);
    }
  }

  /**
   * Get API key usage analytics
   */
  async getUsageAnalytics(
    apiKeyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<APIKeyUsageStats> {
    const supabase = createServerComponentClient({ cookies });

    const { data, error } = await supabase.rpc('get_api_key_analytics', {
      p_api_key_id: apiKeyId,
      p_start_date: startDate?.toISOString(),
      p_end_date: endDate?.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to get usage analytics: ${error.message}`);
    }

    return {
      totalRequests: data[0].total_requests,
      successfulRequests: data[0].successful_requests,
      failedRequests: data[0].failed_requests,
      avgResponseTimeMs: data[0].avg_response_time_ms,
      totalDataTransferredMB: data[0].total_data_transferred_mb,
      uniqueEndpoints: data[0].unique_endpoints,
      mostUsedEndpoint: data[0].most_used_endpoint,
      errorRate: data[0].error_rate,
    };
  }

  /**
   * List all API keys for the current user
   */
  async listAPIKeys(): Promise<APIKey[]> {
    const supabase = createServerComponentClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select(
        `
        *,
        api_key_scopes (
          api_scopes (
            scope
          )
        )
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return data.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      description: key.description,
      integrationType: key.integration_type,
      lastUsedAt: key.last_used_at,
      expiresAt: key.expires_at,
      isActive: key.is_active,
      scopes: key.api_key_scopes?.map((ks: any) => ks.api_scopes.scope) || [],
      rateLimitPerMinute: key.rate_limit_per_minute,
      rateLimitPerHour: key.rate_limit_per_hour,
      rateLimitPerDay: key.rate_limit_per_day,
      allowedIps: key.allowed_ips,
      allowedOrigins: key.allowed_origins,
      createdAt: key.created_at,
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(apiKeyId: string, reason?: string): Promise<void> {
    const supabase = createServerComponentClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', apiKeyId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Rotate an API key (revoke old, create new with same settings)
   */
  async rotateAPIKey(
    apiKeyId: string,
  ): Promise<{ apiKey: APIKey; plainKey: string }> {
    const supabase = createServerComponentClient({ cookies });

    // Get existing key details
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select(
        `
        *,
        api_key_scopes (
          api_scopes (
            scope
          )
        )
      `,
      )
      .eq('id', apiKeyId)
      .single();

    if (fetchError || !existingKey) {
      throw new Error('API key not found');
    }

    const scopes =
      existingKey.api_key_scopes?.map((ks: any) => ks.api_scopes.scope) || [];

    // Create new key with same settings
    const newKey = await this.createAPIKey({
      name: `${existingKey.name} (Rotated)`,
      description: existingKey.description,
      integrationType: existingKey.integration_type,
      scopes,
      rateLimitPerMinute: existingKey.rate_limit_per_minute,
      rateLimitPerHour: existingKey.rate_limit_per_hour,
      rateLimitPerDay: existingKey.rate_limit_per_day,
      allowedIps: existingKey.allowed_ips,
      allowedOrigins: existingKey.allowed_origins,
    });

    // Revoke old key
    await this.revokeAPIKey(apiKeyId, 'Key rotated');

    return newKey;
  }

  /**
   * Update API key settings
   */
  async updateAPIKey(
    apiKeyId: string,
    updates: Partial<APIKeyCreateInput>,
  ): Promise<APIKey> {
    const supabase = createServerComponentClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Update main key record
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({
        name: updates.name,
        description: updates.description,
        integration_type: updates.integrationType,
        rate_limit_per_minute: updates.rateLimitPerMinute,
        rate_limit_per_hour: updates.rateLimitPerHour,
        rate_limit_per_day: updates.rateLimitPerDay,
        allowed_ips: updates.allowedIps,
        allowed_origins: updates.allowedOrigins,
        updated_at: new Date().toISOString(),
      })
      .eq('id', apiKeyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update API key: ${updateError.message}`);
    }

    // Update scopes if provided
    if (updates.scopes) {
      // Remove existing scopes
      await supabase.from('api_key_scopes').delete().eq('api_key_id', apiKeyId);

      // Add new scopes
      const { data: scopes } = await supabase
        .from('api_scopes')
        .select('id, scope')
        .in('scope', updates.scopes);

      if (scopes && scopes.length > 0) {
        const scopeAssignments = scopes.map((scope) => ({
          api_key_id: apiKeyId,
          scope_id: scope.id,
          granted_by: user.id,
        }));

        await supabase.from('api_key_scopes').insert(scopeAssignments);
      }
    }

    // Fetch and return updated key
    const keys = await this.listAPIKeys();
    const key = keys.find((k) => k.id === apiKeyId);

    if (!key) {
      throw new Error('Failed to fetch updated key');
    }

    return key;
  }

  /**
   * Log integration event
   */
  async logIntegrationEvent(
    apiKeyId: string,
    integrationType: string,
    eventType: string,
    eventStatus: 'success' | 'failed' | 'pending',
    eventData?: any,
    errorDetails?: string,
  ): Promise<void> {
    const supabase = createServerComponentClient({ cookies });

    const { error } = await supabase.from('api_integration_logs').insert({
      api_key_id: apiKeyId,
      integration_type: integrationType,
      event_type: eventType,
      event_status: eventStatus,
      event_data: eventData,
      error_details: errorDetails,
    });

    if (error) {
      console.error('Failed to log integration event:', error);
    }
  }

  /**
   * Get available scopes
   */
  async getAvailableScopes(): Promise<
    Array<{ scope: string; description: string }>
  > {
    const supabase = createServerComponentClient({ cookies });

    const { data, error } = await supabase
      .from('api_scopes')
      .select('scope, description')
      .order('scope');

    if (error) {
      throw new Error(`Failed to fetch scopes: ${error.message}`);
    }

    return data.map((s) => ({
      scope: s.scope,
      description: s.description,
    }));
  }
}

export const apiKeyService = new APIKeyService();
