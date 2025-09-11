// CRM Integration Service - Core service for managing CRM integrations
// Generated for WS-343 - CRM Integration Hub Backend

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, generatePKCEPair } from '@/lib/crypto';
import type {
  CRMIntegration,
  CRMProviderType,
  SyncConfig,
  OAuth2Config,
  ApiKeyConfig,
  BasicAuthConfig,
  CRMProviderInterface,
  SyncResult,
  CRMAuditEventType,
} from '@/types/crm';

export class CRMIntegrationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  /**
   * Create a new CRM integration
   */
  async createIntegration(
    supplierId: string,
    crmProvider: CRMProviderType,
    connectionName: string,
    authConfig: Record<string, any>,
    syncConfig: SyncConfig,
  ): Promise<CRMIntegration> {
    try {
      // Validate inputs
      if (!supplierId || !crmProvider || !connectionName) {
        throw new Error(
          'Missing required fields: supplierId, crmProvider, or connectionName',
        );
      }

      // Encrypt sensitive auth data
      const encryptedAuthConfig = this.encryptAuthConfig(authConfig);

      // Insert into database
      const { data, error } = await this.supabase
        .from('crm_integrations')
        .insert({
          supplier_id: supplierId,
          crm_provider: crmProvider,
          connection_name: connectionName,
          auth_config: encryptedAuthConfig,
          sync_config: syncConfig,
          connection_status: 'pending_auth',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create integration: ${error.message}`);
      }

      // Test connection immediately for non-OAuth providers
      if (
        crmProvider !== 'honeybook' &&
        crmProvider !== 'pixieset' &&
        crmProvider !== 'dubsado'
      ) {
        try {
          const isConnected = await this.testConnection(data.id);
          await this.updateConnectionStatus(
            data.id,
            isConnected ? 'connected' : 'error',
          );

          if (isConnected) {
            // Set up default field mappings
            await this.createDefaultFieldMappings(data.id, crmProvider);
          }
        } catch (testError) {
          console.error('Connection test failed:', testError);
          await this.updateConnectionStatus(data.id, 'error', {
            message: 'Failed to establish connection',
            error: (testError as Error).message,
          });
        }
      }

      return data;
    } catch (error) {
      console.error('CRMIntegrationService.createIntegration error:', error);
      throw error;
    }
  }

  /**
   * Get integration by ID with decrypted auth config
   */
  async getIntegration(
    integrationId: string,
    decrypt = false,
  ): Promise<CRMIntegration | null> {
    try {
      const { data, error } = await this.supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (error || !data) {
        return null;
      }

      if (decrypt && data.auth_config) {
        data.auth_config = this.decryptAuthConfig(data.auth_config);
      }

      return data;
    } catch (error) {
      console.error('CRMIntegrationService.getIntegration error:', error);
      return null;
    }
  }

  /**
   * List integrations for a supplier
   */
  async listIntegrations(supplierId: string): Promise<CRMIntegration[]> {
    try {
      const { data, error } = await this.supabase
        .from('crm_integrations')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list integrations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('CRMIntegrationService.listIntegrations error:', error);
      throw error;
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<CRMIntegration>,
  ): Promise<CRMIntegration> {
    try {
      // Encrypt auth config if provided
      if (updates.auth_config) {
        updates.auth_config = this.encryptAuthConfig(updates.auth_config);
      }

      const { data, error } = await this.supabase
        .from('crm_integrations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update integration: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('CRMIntegrationService.updateIntegration error:', error);
      throw error;
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('crm_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
      }
    } catch (error) {
      console.error('CRMIntegrationService.deleteIntegration error:', error);
      throw error;
    }
  }

  /**
   * Test connection to CRM provider
   */
  async testConnection(integrationId: string): Promise<boolean> {
    try {
      const integration = await this.getIntegration(integrationId, true);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const provider = this.getCRMProviderInterface(integration.crm_provider);
      const decryptedAuthConfig = this.decryptAuthConfig(
        integration.auth_config,
      );

      return await provider.testConnection(decryptedAuthConfig);
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    integrationId: string,
    status: string,
    errorDetails?: Record<string, any>,
  ): Promise<void> {
    try {
      const updates: any = {
        connection_status: status,
        updated_at: new Date().toISOString(),
      };

      if (errorDetails) {
        updates.sync_error_details = errorDetails;
      }

      const { error } = await this.supabase
        .from('crm_integrations')
        .update(updates)
        .eq('id', integrationId);

      if (error) {
        throw new Error(`Failed to update connection status: ${error.message}`);
      }
    } catch (error) {
      console.error(
        'CRMIntegrationService.updateConnectionStatus error:',
        error,
      );
      throw error;
    }
  }

  /**
   * Generate OAuth2 authorization URL with PKCE
   */
  async generateOAuthUrl(
    integrationId: string,
    provider: CRMProviderType,
  ): Promise<string> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const providerInterface = this.getCRMProviderInterface(provider);
      const { codeVerifier, codeChallenge } = generatePKCEPair();

      // Store PKCE values in integration for later use
      const authConfig = integration.auth_config as OAuth2Config;
      authConfig.code_verifier = codeVerifier;
      authConfig.code_challenge = codeChallenge;

      await this.updateIntegration(integrationId, {
        auth_config: authConfig,
      });

      // Generate provider-specific OAuth URL
      switch (provider) {
        case 'honeybook':
          return this.generateHoneyBookOAuthUrl(integrationId, codeChallenge);
        case 'pixieset':
          return this.generatePixiesetOAuthUrl(integrationId, codeChallenge);
        case 'dubsado':
          return this.generateDubsadoOAuthUrl(integrationId, codeChallenge);
        default:
          throw new Error(`OAuth not supported for provider: ${provider}`);
      }
    } catch (error) {
      console.error('CRMIntegrationService.generateOAuthUrl error:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    integrationId: string,
    authorizationCode: string,
    state?: string,
  ): Promise<boolean> {
    try {
      const integration = await this.getIntegration(integrationId, true);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const providerInterface = this.getCRMProviderInterface(
        integration.crm_provider,
      );
      const authConfig = integration.auth_config as OAuth2Config;

      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForTokens(
        integration.crm_provider,
        authorizationCode,
        authConfig,
      );

      // Update integration with new tokens
      const updatedAuthConfig = {
        ...authConfig,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000,
        ).toISOString(),
      };

      await this.updateIntegration(integrationId, {
        auth_config: updatedAuthConfig,
        connection_status: 'connected',
      });

      // Create default field mappings
      await this.createDefaultFieldMappings(
        integrationId,
        integration.crm_provider,
      );

      return true;
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      await this.updateConnectionStatus(integrationId, 'error', {
        message: 'OAuth callback failed',
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshAccessToken(integrationId: string): Promise<boolean> {
    try {
      const integration = await this.getIntegration(integrationId, true);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const authConfig = integration.auth_config as OAuth2Config;
      if (!authConfig.refresh_token) {
        throw new Error('No refresh token available');
      }

      const tokenResponse = await this.refreshOAuthTokens(
        integration.crm_provider,
        authConfig,
      );

      // Update integration with new tokens
      const updatedAuthConfig = {
        ...authConfig,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || authConfig.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000,
        ).toISOString(),
      };

      await this.updateIntegration(integrationId, {
        auth_config: updatedAuthConfig,
      });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Create default field mappings for a provider
   */
  async createDefaultFieldMappings(
    integrationId: string,
    provider: CRMProviderType,
  ): Promise<void> {
    try {
      const defaultMappings = this.getDefaultFieldMappings(provider);

      const mappingPromises = defaultMappings.map((mapping) =>
        this.supabase.from('crm_field_mappings').insert({
          integration_id: integrationId,
          ...mapping,
        }),
      );

      await Promise.all(mappingPromises);
    } catch (error) {
      console.error('Failed to create default field mappings:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    userId: string,
    eventType: CRMAuditEventType,
    eventData: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        event_source: 'crm_integration',
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  // Private methods

  private encryptAuthConfig(
    authConfig: Record<string, any>,
  ): Record<string, any> {
    const encrypted = { ...authConfig };

    // Encrypt sensitive fields
    const sensitiveFields = [
      'api_key',
      'access_token',
      'refresh_token',
      'password',
      'api_secret',
    ];

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        try {
          encrypted[field] = encrypt(encrypted[field]);
        } catch (error) {
          console.error(`Failed to encrypt ${field}:`, error);
          throw new Error(`Encryption failed for ${field}`);
        }
      }
    }

    return encrypted;
  }

  private decryptAuthConfig(
    authConfig: Record<string, any>,
  ): Record<string, any> {
    const decrypted = { ...authConfig };

    // Decrypt sensitive fields
    const sensitiveFields = [
      'api_key',
      'access_token',
      'refresh_token',
      'password',
      'api_secret',
    ];

    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = decrypt(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error);
          // Continue with encrypted value rather than failing
        }
      }
    }

    return decrypted;
  }

  private getCRMProviderInterface(
    providerName: CRMProviderType,
  ): CRMProviderInterface {
    // Import provider classes dynamically to avoid circular dependencies
    switch (providerName) {
      case 'tave':
        const {
          TaveCRMProvider,
        } = require('@/services/crm-providers/TaveCRMProvider');
        return new TaveCRMProvider();
      case 'lightblue':
        const {
          LightBlueCRMProvider,
        } = require('@/services/crm-providers/LightBlueCRMProvider');
        return new LightBlueCRMProvider();
      case 'honeybook':
        const {
          HoneyBookCRMProvider,
        } = require('@/services/crm-providers/HoneyBookCRMProvider');
        return new HoneyBookCRMProvider();
      default:
        throw new Error(`Unsupported CRM provider: ${providerName}`);
    }
  }

  private generateHoneyBookOAuthUrl(
    integrationId: string,
    codeChallenge: string,
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.HONEYBOOK_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/oauth/callback/honeybook`,
      scope: 'read:contacts read:projects read:invoices',
      state: integrationId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://api.honeybook.com/oauth/authorize?${params.toString()}`;
  }

  private generatePixiesetOAuthUrl(
    integrationId: string,
    codeChallenge: string,
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.PIXIESET_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/oauth/callback/pixieset`,
      scope: 'read:clients read:galleries',
      state: integrationId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://api.pixieset.com/oauth/authorize?${params.toString()}`;
  }

  private generateDubsadoOAuthUrl(
    integrationId: string,
    codeChallenge: string,
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.DUBSADO_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/oauth/callback/dubsado`,
      scope: 'read:clients read:projects read:invoices',
      state: integrationId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://api.dubsado.com/oauth/authorize?${params.toString()}`;
  }

  private async exchangeCodeForTokens(
    provider: CRMProviderType,
    authorizationCode: string,
    authConfig: OAuth2Config,
  ): Promise<any> {
    // Implementation would vary by provider
    // This is a simplified example
    const tokenEndpoints = {
      honeybook: 'https://api.honeybook.com/oauth/token',
      pixieset: 'https://api.pixieset.com/oauth/token',
      dubsado: 'https://api.dubsado.com/oauth/token',
    };

    const response = await fetch(
      tokenEndpoints[provider as keyof typeof tokenEndpoints],
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: authConfig.client_id,
          code: authorizationCode,
          redirect_uri: authConfig.redirect_uri,
          code_verifier: authConfig.code_verifier!,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async refreshOAuthTokens(
    provider: CRMProviderType,
    authConfig: OAuth2Config,
  ): Promise<any> {
    const tokenEndpoints = {
      honeybook: 'https://api.honeybook.com/oauth/token',
      pixieset: 'https://api.pixieset.com/oauth/token',
      dubsado: 'https://api.dubsado.com/oauth/token',
    };

    const response = await fetch(
      tokenEndpoints[provider as keyof typeof tokenEndpoints],
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: authConfig.client_id,
          refresh_token: authConfig.refresh_token!,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private getDefaultFieldMappings(provider: CRMProviderType) {
    const baseMappings = [
      {
        crm_field_name: 'name',
        crm_field_type: 'string',
        wedsync_field_name: 'client_name',
        wedsync_field_type: 'string',
        is_required: true,
        transform_rule: { type: 'direct' },
        validation_rules: { min_length: 1, max_length: 200 },
      },
      {
        crm_field_name: 'email',
        crm_field_type: 'email',
        wedsync_field_name: 'email',
        wedsync_field_type: 'email',
        is_required: true,
        transform_rule: { type: 'direct' },
        validation_rules: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      },
      {
        crm_field_name: 'phone',
        crm_field_type: 'phone',
        wedsync_field_name: 'phone',
        wedsync_field_type: 'phone',
        is_required: false,
        transform_rule: { type: 'direct' },
        validation_rules: {},
      },
    ];

    // Provider-specific mappings
    switch (provider) {
      case 'tave':
        return [
          ...baseMappings,
          {
            crm_field_name: 'wedding_date',
            crm_field_type: 'date',
            wedsync_field_name: 'event_date',
            wedsync_field_type: 'date',
            is_required: false,
            transform_rule: { type: 'direct' },
            validation_rules: {},
          },
        ];

      case 'honeybook':
        return [
          ...baseMappings,
          {
            crm_field_name: 'event_date',
            crm_field_type: 'datetime',
            wedsync_field_name: 'event_date',
            wedsync_field_type: 'date',
            is_required: false,
            transform_rule: { type: 'formatted', format_pattern: 'YYYY-MM-DD' },
            validation_rules: {},
          },
        ];

      default:
        return baseMappings;
    }
  }
}
