// POST /api/crm/integrations - Create Integration
// GET /api/crm/integrations - List Integrations
// Generated for WS-343 - CRM Integration Hub Backend

import { withSecureValidation } from '@/lib/validation/middleware';
import { CRMIntegrationService } from '@/services/CRMIntegrationService';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Validation schemas
const CreateIntegrationSchema = z.object({
  crm_provider: z.enum([
    'tave',
    'lightblue',
    'honeybook',
    'seventeen',
    'shootq',
    'pixieset',
    'iris_works',
    'dubsado',
    'studio_ninja',
    'custom',
  ]),
  connection_name: z.string().min(1).max(100),
  auth_config: z.record(z.any()),
  sync_config: z.object({
    auto_sync_enabled: z.boolean(),
    sync_interval_minutes: z.number().min(15).max(1440),
    sync_direction: z.enum(['import_only', 'export_only', 'bidirectional']),
    import_historical_data: z.boolean(),
    conflict_resolution: z.enum([
      'wedsync_wins',
      'crm_wins',
      'newest_wins',
      'manual_review',
    ]),
  }),
});

const GetIntegrationsSchema = z.object({});

export const POST = withSecureValidation(
  CreateIntegrationSchema,
  async (request, { user, validatedData }) => {
    const crmService = new CRMIntegrationService();

    try {
      // Get supplier ID from authenticated user
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, subscription_tier')
        .eq('auth_user_id', user.id)
        .single();

      if (supplierError || !supplier) {
        return Response.json(
          {
            error: 'SUPPLIER_NOT_FOUND',
            message: 'Supplier profile not found for this user',
          },
          { status: 404 },
        );
      }

      // Check tier limits for integrations
      const tierLimits = {
        free: 0,
        starter: 1,
        professional: 3,
        scale: 5,
        enterprise: 999,
      };

      const currentTier = supplier.subscription_tier || 'free';
      const maxIntegrations =
        tierLimits[currentTier as keyof typeof tierLimits] || 0;

      // Count existing integrations
      const { count: existingCount, error: countError } = await supabase
        .from('crm_integrations')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id);

      if (countError) {
        console.error('Error counting integrations:', countError);
        return Response.json(
          {
            error: 'DATABASE_ERROR',
            message: 'Failed to verify integration limits',
          },
          { status: 500 },
        );
      }

      if ((existingCount || 0) >= maxIntegrations) {
        return Response.json(
          {
            error: 'INTEGRATION_LIMIT_REACHED',
            message: 'Integration limit reached',
            details: `Your ${currentTier} plan allows ${maxIntegrations} integrations. Upgrade to add more.`,
            current_count: existingCount,
            limit: maxIntegrations,
            upgrade_url: '/pricing',
          },
          { status: 402 },
        );
      }

      // Validate auth config based on provider
      const authValidationError = validateAuthConfig(
        validatedData.crm_provider,
        validatedData.auth_config,
      );
      if (authValidationError) {
        return Response.json(
          {
            error: 'INVALID_AUTH_CONFIG',
            message: 'Authentication configuration is invalid',
            details: authValidationError,
          },
          { status: 400 },
        );
      }

      // Create integration
      const integration = await crmService.createIntegration(
        supplier.id,
        validatedData.crm_provider,
        validatedData.connection_name,
        validatedData.auth_config,
        validatedData.sync_config,
      );

      // Log audit trail
      await crmService.logAuditEvent(user.id, 'integration_created', {
        integration_id: integration.id,
        provider: validatedData.crm_provider,
        connection_name: validatedData.connection_name,
      });

      // For OAuth providers, return authorization URL
      let authUrl = null;
      if (
        ['honeybook', 'pixieset', 'dubsado'].includes(
          validatedData.crm_provider,
        )
      ) {
        try {
          authUrl = await crmService.generateOAuthUrl(
            integration.id,
            validatedData.crm_provider,
          );
        } catch (oauthError) {
          console.error('OAuth URL generation failed:', oauthError);
          // Don't fail the integration creation, just log the error
        }
      }

      return Response.json(
        {
          success: true,
          integration,
          auth_url: authUrl,
          message: 'Integration created successfully',
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('Failed to create CRM integration:', error);

      // Log the error for debugging
      await crmService.logAuditEvent(user.id, 'integration_creation_failed', {
        provider: validatedData.crm_provider,
        error: (error as Error).message,
      });

      return Response.json(
        {
          error: 'INTEGRATION_CREATION_FAILED',
          message: 'Failed to create integration',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'An internal error occurred',
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withSecureValidation(
  GetIntegrationsSchema,
  async (request, { user }) => {
    const crmService = new CRMIntegrationService();

    try {
      // Get supplier ID from authenticated user
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (supplierError || !supplier) {
        return Response.json(
          {
            error: 'SUPPLIER_NOT_FOUND',
            message: 'Supplier profile not found for this user',
          },
          { status: 404 },
        );
      }

      // List integrations for this supplier
      const integrations = await crmService.listIntegrations(supplier.id);

      // Remove sensitive auth config from response
      const sanitizedIntegrations = integrations.map((integration) => ({
        ...integration,
        auth_config: sanitizeAuthConfig(integration.auth_config),
      }));

      return Response.json({
        success: true,
        integrations: sanitizedIntegrations,
        total: integrations.length,
      });
    } catch (error) {
      console.error('Failed to list CRM integrations:', error);
      return Response.json(
        {
          error: 'INTEGRATION_LIST_FAILED',
          message: 'Failed to retrieve integrations',
          details: 'An internal error occurred',
        },
        { status: 500 },
      );
    }
  },
);

// Helper functions

function validateAuthConfig(
  provider: string,
  authConfig: Record<string, any>,
): string | null {
  switch (provider) {
    case 'tave':
      if (!authConfig.api_key) {
        return 'API key is required for Tave integration';
      }
      if (!authConfig.endpoint_base_url) {
        return 'Base URL is required for Tave integration';
      }
      break;

    case 'lightblue':
      if (!authConfig.username || !authConfig.password) {
        return 'Username and password are required for Light Blue integration';
      }
      break;

    case 'honeybook':
      if (!authConfig.client_id) {
        return 'Client ID is required for HoneyBook integration';
      }
      break;

    case 'seventeen':
    case 'shootq':
    case 'iris_works':
    case 'studio_ninja':
      if (!authConfig.api_key) {
        return `API key is required for ${provider} integration`;
      }
      break;

    case 'pixieset':
    case 'dubsado':
      if (!authConfig.client_id) {
        return `Client ID is required for ${provider} integration`;
      }
      break;

    case 'custom':
      if (!authConfig.endpoint_base_url) {
        return 'Base URL is required for custom integration';
      }
      break;

    default:
      return `Unsupported provider: ${provider}`;
  }

  return null;
}

function sanitizeAuthConfig(
  authConfig: Record<string, any>,
): Record<string, any> {
  const sanitized = { ...authConfig };

  // Remove sensitive fields from response
  const sensitiveFields = [
    'api_key',
    'access_token',
    'refresh_token',
    'password',
    'api_secret',
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***HIDDEN***';
    }
  }

  return sanitized;
}
