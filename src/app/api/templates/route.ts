import { NextRequest, NextResponse } from 'next/server';
import { emailServiceConnector } from '@/lib/services/email-connector';
import { smsServiceConnector } from '@/lib/services/sms-connector';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Template Management API
 * Unified API for managing email and SMS templates
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') as 'email' | 'sms' | 'all';
    const category = searchParams.get('category');
    const vendorId = searchParams.get('vendor_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let templates = [];

    // Get email templates
    if (!templateType || templateType === 'email' || templateType === 'all') {
      const emailTemplates =
        await emailServiceConnector.getActiveTemplates(category);
      templates.push(
        ...emailTemplates.map((t) => ({
          ...t,
          template_type: 'email' as const,
        })),
      );
    }

    // Get SMS templates
    if (!templateType || templateType === 'sms' || templateType === 'all') {
      const smsTemplates =
        await smsServiceConnector.getActiveTemplates(category);
      templates.push(
        ...smsTemplates.map((t) => ({
          ...t,
          template_type: 'sms' as const,
        })),
      );
    }

    // Filter by vendor if specified
    if (vendorId) {
      const { data: vendorTemplates } = await supabase
        .from('vendor_templates')
        .select('template_id')
        .eq('vendor_id', vendorId);

      const vendorTemplateIds = new Set(
        vendorTemplates?.map((vt) => vt.template_id) || [],
      );
      templates = templates.filter((t) => vendorTemplateIds.has(t.id));
    }

    // Sort templates
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      data: {
        templates,
        total: templates.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      template_type,
      name,
      category,
      subject_template,
      html_template,
      text_template,
      message_template,
      template_variables,
      vendor_id,
      max_length,
    } = body;

    // Validate required fields
    if (!template_type || !name || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: template_type, name, category',
        },
        { status: 400 },
      );
    }

    if (template_type === 'email' && (!subject_template || !html_template)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email templates require subject_template and html_template',
        },
        { status: 400 },
      );
    }

    if (template_type === 'sms' && !message_template) {
      return NextResponse.json(
        { success: false, error: 'SMS templates require message_template' },
        { status: 400 },
      );
    }

    let savedTemplate;

    if (template_type === 'email') {
      savedTemplate = await emailServiceConnector.upsertTemplate({
        name,
        subject_template,
        html_template,
        text_template,
        template_variables: template_variables || [],
        category,
        is_active: true,
      });
    } else if (template_type === 'sms') {
      savedTemplate = await smsServiceConnector.upsertTemplate({
        name,
        message_template,
        template_variables: template_variables || [],
        category,
        is_active: true,
        max_length: max_length || 1600,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template_type. Must be "email" or "sms"',
        },
        { status: 400 },
      );
    }

    // Link template to vendor if specified
    if (vendor_id && savedTemplate) {
      await supabase.from('vendor_templates').upsert({
        vendor_id,
        template_id: savedTemplate.id,
        template_type,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        template: {
          ...savedTemplate,
          template_type,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
