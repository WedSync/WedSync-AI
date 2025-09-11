import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { cookies } from 'next/headers';

const channelConfigSchema = z.object({
  channelName: z.string().min(1),
  targetSystems: z.array(z.string()),
  isActive: z.boolean().default(true),
  routingRules: z
    .array(
      z.object({
        eventType: z.string(),
        condition: z.enum(['equals', 'contains', 'startsWith', 'matches']),
        value: z.string(),
        targetSystems: z.array(z.string()),
      }),
    )
    .default([]),
  notificationSettings: z
    .object({
      enableWhatsApp: z.boolean().default(false),
      enableSlack: z.boolean().default(false),
      enableEmail: z.boolean().default(true),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    })
    .default({
      enableWhatsApp: false,
      enableSlack: false,
      enableEmail: true,
      priority: 'normal',
    }),
});

const integrationSystemSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'photography-crm',
    'venue-management',
    'whatsapp',
    'slack',
    'email',
  ]),
  config: z.object({
    webhookUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    secretKey: z.string().optional(),
    authToken: z.string().optional(),
    customSettings: z.record(z.unknown()).optional(),
  }),
  isActive: z.boolean().default(true),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAuthenticatedUser(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('Authentication required');
    }

    return user;
  } catch (error) {
    throw new Error('Authentication failed');
  }
}

async function getOrganizationId(userId: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error('Organization not found');
  }

  return data.organization_id;
}

// GET - Retrieve channel configurations
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const organizationId = await getOrganizationId(user.id);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('channel_integration_configs')
      .select(
        `
        *,
        target_systems:integration_configs(id, name, type, is_active)
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve configurations' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      configurations: data || [],
    });
  } catch (error) {
    console.error('GET /api/integrations/channel-config error:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST - Create or update channel configuration
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const organizationId = await getOrganizationId(user.id);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await request.json();
    const validatedData = channelConfigSchema.parse(requestBody);

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('channel_integration_configs')
      .select('id')
      .eq('channel_name', validatedData.channelName)
      .eq('organization_id', organizationId)
      .single();

    const configData = {
      channel_name: validatedData.channelName,
      organization_id: organizationId,
      routing_rules: validatedData.routingRules,
      notification_settings: validatedData.notificationSettings,
      is_active: validatedData.isActive,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabase
        .from('channel_integration_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new configuration
      const { data, error } = await supabase
        .from('channel_integration_configs')
        .insert({
          ...configData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Update channel subscriptions
    await updateChannelSubscriptions(
      supabase,
      result.id,
      validatedData.targetSystems,
      organizationId,
    );

    return NextResponse.json(
      {
        success: true,
        configuration: result,
      },
      { status: existingConfig ? 200 : 201 },
    );
  } catch (error) {
    console.error('POST /api/integrations/channel-config error:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT - Update integration system
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const organizationId = await getOrganizationId(user.id);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await request.json();
    const { systemId, ...systemData } = requestBody;

    if (!systemId) {
      return NextResponse.json(
        { error: 'System ID required' },
        { status: 400 },
      );
    }

    const validatedData = integrationSystemSchema.parse(systemData);

    const { data, error } = await supabase
      .from('integration_configs')
      .update({
        name: validatedData.name,
        type: validatedData.type,
        config: validatedData.config,
        is_active: validatedData.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', systemId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update integration system' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Integration system not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      system: data,
    });
  } catch (error) {
    console.error('PUT /api/integrations/channel-config error:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE - Remove channel configuration
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const organizationId = await getOrganizationId(user.id);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const channelName = searchParams.get('channelName');

    if (!configId && !channelName) {
      return NextResponse.json(
        { error: 'Configuration ID or channel name required' },
        { status: 400 },
      );
    }

    let deleteQuery = supabase
      .from('channel_integration_configs')
      .delete()
      .eq('organization_id', organizationId);

    if (configId) {
      deleteQuery = deleteQuery.eq('id', configId);
    } else if (channelName) {
      deleteQuery = deleteQuery.eq('channel_name', channelName);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/integrations/channel-config error:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function updateChannelSubscriptions(
  supabase: any,
  configId: string,
  targetSystems: string[],
  organizationId: string,
): Promise<void> {
  // Delete existing subscriptions
  await supabase
    .from('channel_subscriptions')
    .delete()
    .eq('config_id', configId);

  // Create new subscriptions
  if (targetSystems.length > 0) {
    const subscriptions = targetSystems.map((systemId) => ({
      config_id: configId,
      target_system_id: systemId,
      organization_id: organizationId,
      is_active: true,
      created_at: new Date().toISOString(),
    }));

    await supabase.from('channel_subscriptions').insert(subscriptions);
  }
}
