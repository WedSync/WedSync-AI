// GET /api/crm/providers - List CRM Providers
// Generated for WS-343 - CRM Integration Hub Backend

import { withSecureValidation } from '@/lib/validation/middleware';
import { CRM_PROVIDERS } from '@/types/crm';
import { z } from 'zod';

const GetProvidersSchema = z.object({});

export const GET = withSecureValidation(
  GetProvidersSchema,
  async (request, { user }) => {
    try {
      // Return provider configuration with popularity ranking
      const providers = Object.values(CRM_PROVIDERS).sort(
        (a, b) => a.popularity_rank - b.popularity_rank,
      );

      return Response.json({
        providers,
        total: providers.length,
      });
    } catch (error) {
      console.error('Failed to load CRM providers:', error);
      return Response.json(
        {
          error: 'Failed to load providers',
          details: 'An internal server error occurred',
        },
        { status: 500 },
      );
    }
  },
);
