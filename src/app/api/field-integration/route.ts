/**
 * Field Integration API Routes
 * Handles field integration operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { fieldIntegrationService } from '@/lib/services/field-integration-service';
import { FieldIntegrationAdapterFactory } from '@/lib/integrations/field-integration-adapters';
import { z } from 'zod';

// Request validation schemas
const ConnectIntegrationSchema = z.object({
  type: z.enum(['api', 'file', 'database', 'webhook', 'external_form']),
  name: z.string().min(1),
  config: z
    .object({
      endpoint: z.string().optional(),
      apiKey: z.string().optional(),
      connectionString: z.string().optional(),
      fileContent: z.string().optional(),
      fileType: z.enum(['csv', 'json']).optional(),
      customHeaders: z.record(z.string()).optional(),
    })
    .optional(),
});

const SyncFieldsSchema = z.object({
  sourceId: z.string(),
});

const TransformFieldsSchema = z.object({
  sourceFields: z.array(z.any()),
  mappings: z.array(
    z.object({
      sourceField: z.string(),
      targetField: z.string(),
      transformation: z.enum([
        'none',
        'uppercase',
        'lowercase',
        'date_format',
        'custom',
      ]),
      customTransformation: z.string().optional(),
      required: z.boolean(),
    }),
  ),
  targetFormId: z.string(),
});

const SaveConfigSchema = z.object({
  name: z.string().min(1),
  sourceId: z.string(),
  targetFormId: z.string(),
  mappings: z.array(
    z.object({
      sourceField: z.string(),
      targetField: z.string(),
      transformation: z.enum([
        'none',
        'uppercase',
        'lowercase',
        'date_format',
        'custom',
      ]),
      customTransformation: z.string().optional(),
      required: z.boolean(),
    }),
  ),
  autoSync: z.boolean().default(false),
  syncInterval: z.number().min(1).default(60),
  isActive: z.boolean().default(true),
});

/**
 * GET - List integration sources and configurations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sourceId = searchParams.get('sourceId');

    switch (action) {
      case 'sources':
        // In a real implementation, fetch from database
        const mockSources = [
          {
            id: '1',
            name: 'Wedding API Integration',
            type: 'api',
            endpoint: 'https://api.wedding-vendor.com/fields',
            status: 'connected',
            lastSync: new Date().toISOString(),
            fieldsCount: 25,
            organizationId: user.id,
          },
        ];
        return NextResponse.json({ sources: mockSources });

      case 'configs':
        // In a real implementation, fetch configurations from database
        const mockConfigs = [];
        return NextResponse.json({ configs: mockConfigs });

      case 'schema':
        if (!sourceId) {
          return NextResponse.json(
            { error: 'Source ID required' },
            { status: 400 },
          );
        }

        // Get field schema for a specific source
        try {
          // In real implementation, get source from database and create adapter
          const mockSource = {
            id: sourceId,
            name: 'Mock Source',
            type: 'api' as const,
            endpoint: 'https://api.example.com',
            status: 'connected' as const,
          };

          const adapter =
            FieldIntegrationAdapterFactory.createAdapter(mockSource);
          const schema = await adapter.getFieldSchema();

          return NextResponse.json({ schema });
        } catch (error) {
          console.error('Schema fetch error:', error);
          return NextResponse.json(
            { error: 'Failed to fetch schema' },
            { status: 500 },
          );
        }

      case 'history':
        // Get sync history
        const mockHistory = [
          {
            id: '1',
            sourceId: sourceId || '1',
            timestamp: new Date().toISOString(),
            status: 'success',
            fieldsCount: 15,
            message: 'Fields synchronized successfully',
          },
        ];
        return NextResponse.json({ history: mockHistory });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('GET /api/field-integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST - Create integration, sync fields, transform fields, save configuration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'connect':
        try {
          const validatedData = ConnectIntegrationSchema.parse(body);

          const source = await fieldIntegrationService.connectIntegrationSource(
            validatedData.type,
            {
              name: validatedData.name,
              ...validatedData.config,
            },
          );

          // In real implementation, save to database with organizationId
          // await supabase.from('field_integration_sources').insert({
          //   id: source.id,
          //   organization_id: user.id,
          //   name: source.name,
          //   type: source.type,
          //   endpoint: source.endpoint,
          //   credentials: source.credentials,
          //   status: source.status,
          //   created_at: new Date().toISOString()
          // });

          return NextResponse.json({ source });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request data', details: error.errors },
              { status: 400 },
            );
          }
          throw error;
        }

      case 'sync':
        try {
          const { sourceId } = SyncFieldsSchema.parse(body);

          const fields =
            await fieldIntegrationService.syncFieldsFromSource(sourceId);

          return NextResponse.json({ fields });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request data', details: error.errors },
              { status: 400 },
            );
          }

          console.error('Field sync error:', error);
          return NextResponse.json(
            { error: 'Failed to sync fields' },
            { status: 500 },
          );
        }

      case 'transform':
        try {
          const validatedData = TransformFieldsSchema.parse(body);

          // Get target form fields (in real implementation, fetch from database)
          const mockTargetFields = [
            {
              id: 'name',
              type: 'text' as const,
              label: 'Full Name',
              required: true,
              order: 1,
            },
            {
              id: 'email',
              type: 'email' as const,
              label: 'Email Address',
              required: true,
              order: 2,
            },
          ];

          const transformedFields = fieldIntegrationService.transformFields(
            validatedData.sourceFields,
            validatedData.mappings,
            mockTargetFields,
          );

          return NextResponse.json({ transformedFields });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request data', details: error.errors },
              { status: 400 },
            );
          }

          console.error('Field transformation error:', error);
          return NextResponse.json(
            { error: 'Failed to transform fields' },
            { status: 500 },
          );
        }

      case 'save_config':
        try {
          const validatedData = SaveConfigSchema.parse(body);

          const config = {
            id: `config_${Date.now()}`,
            name: validatedData.name,
            source: {
              id: validatedData.sourceId,
              name: 'Source Name', // In real implementation, fetch from database
              type: 'api' as const,
              status: 'connected' as const,
            },
            targetFormId: validatedData.targetFormId,
            mappings: validatedData.mappings,
            autoSync: validatedData.autoSync,
            syncInterval: validatedData.syncInterval,
            validationRules: [],
            isActive: validatedData.isActive,
          };

          await fieldIntegrationService.saveIntegrationConfig(config);

          // In real implementation, save to database
          // await supabase.from('field_integration_configs').insert({
          //   id: config.id,
          //   organization_id: user.id,
          //   name: config.name,
          //   source_id: config.source.id,
          //   target_form_id: config.targetFormId,
          //   mappings: config.mappings,
          //   auto_sync: config.autoSync,
          //   sync_interval: config.syncInterval,
          //   is_active: config.isActive,
          //   created_at: new Date().toISOString()
          // });

          return NextResponse.json({ config });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request data', details: error.errors },
              { status: 400 },
            );
          }

          console.error('Config save error:', error);
          return NextResponse.json(
            { error: 'Failed to save configuration' },
            { status: 500 },
          );
        }

      case 'execute':
        try {
          const { configId } = z.object({ configId: z.string() }).parse(body);

          const transformedFields =
            await fieldIntegrationService.executeIntegration(configId);

          return NextResponse.json({ transformedFields });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request data', details: error.errors },
              { status: 400 },
            );
          }

          console.error('Integration execution error:', error);
          return NextResponse.json(
            { error: 'Failed to execute integration' },
            { status: 500 },
          );
        }

      case 'validate':
        try {
          const { mappings, sourceFields, targetFormId } = body;

          // Get target form fields (in real implementation, fetch from database)
          const mockTargetFields = [
            {
              id: 'name',
              type: 'text' as const,
              label: 'Full Name',
              required: true,
              order: 1,
            },
            {
              id: 'email',
              type: 'email' as const,
              label: 'Email Address',
              required: true,
              order: 2,
            },
          ];

          const validationErrors = fieldIntegrationService.validateMappings(
            mappings,
            sourceFields,
            mockTargetFields,
          );

          return NextResponse.json({
            isValid: validationErrors.length === 0,
            errors: validationErrors,
          });
        } catch (error) {
          console.error('Mapping validation error:', error);
          return NextResponse.json(
            { error: 'Failed to validate mappings' },
            { status: 500 },
          );
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/field-integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update integration source or configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, id } = body;

    switch (action) {
      case 'update_source':
        // Update integration source
        const { name, status, settings } = body;

        // In real implementation, update in database
        // await supabase.from('field_integration_sources')
        //   .update({ name, status, settings, updated_at: new Date().toISOString() })
        //   .eq('id', id)
        //   .eq('organization_id', user.id);

        return NextResponse.json({ success: true });

      case 'update_config':
        // Update integration configuration
        const { isActive, autoSync, syncInterval } = body;

        // In real implementation, update in database
        // await supabase.from('field_integration_configs')
        //   .update({
        //     is_active: isActive,
        //     auto_sync: autoSync,
        //     sync_interval: syncInterval,
        //     updated_at: new Date().toISOString()
        //   })
        //   .eq('id', id)
        //   .eq('organization_id', user.id);

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('PUT /api/field-integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove integration source or configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID required' },
        { status: 400 },
      );
    }

    switch (type) {
      case 'source':
        // Delete integration source and related configurations
        // In real implementation, delete from database
        // await supabase.from('field_integration_configs')
        //   .delete()
        //   .eq('source_id', id)
        //   .eq('organization_id', user.id);
        //
        // await supabase.from('field_integration_sources')
        //   .delete()
        //   .eq('id', id)
        //   .eq('organization_id', user.id);

        return NextResponse.json({ success: true });

      case 'config':
        // Delete integration configuration
        // In real implementation, delete from database
        // await supabase.from('field_integration_configs')
        //   .delete()
        //   .eq('id', id)
        //   .eq('organization_id', user.id);

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('DELETE /api/field-integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
