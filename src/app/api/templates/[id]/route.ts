import { NextRequest, NextResponse } from 'next/server';
import { emailServiceConnector } from '@/lib/services/email-connector';
import { smsServiceConnector } from '@/lib/services/sms-connector';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RouteParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') as 'email' | 'sms';

    let template = null;

    if (templateType === 'email') {
      template = await emailServiceConnector.getTemplate(id);
      if (template) {
        (template as any).template_type = 'email';
      }
    } else if (templateType === 'sms') {
      template = await smsServiceConnector.getTemplate(id);
      if (template) {
        (template as any).template_type = 'sms';
      }
    } else {
      // Try to find in both types
      template = await emailServiceConnector.getTemplate(id);
      if (template) {
        (template as any).template_type = 'email';
      } else {
        template = await smsServiceConnector.getTemplate(id);
        if (template) {
          (template as any).template_type = 'sms';
        }
      }
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Failed to fetch template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { id } = params;
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
      max_length,
      is_active = true,
    } = body;

    // Validate required fields
    if (!template_type) {
      return NextResponse.json(
        { success: false, error: 'template_type is required' },
        { status: 400 },
      );
    }

    let updatedTemplate;

    if (template_type === 'email') {
      // Get existing template to merge changes
      const existingTemplate = await emailServiceConnector.getTemplate(id);
      if (!existingTemplate) {
        return NextResponse.json(
          { success: false, error: 'Email template not found' },
          { status: 404 },
        );
      }

      updatedTemplate = await emailServiceConnector.upsertTemplate({
        name: name || existingTemplate.name,
        subject_template: subject_template || existingTemplate.subject_template,
        html_template: html_template || existingTemplate.html_template,
        text_template: text_template || existingTemplate.text_template,
        template_variables:
          template_variables || existingTemplate.template_variables,
        category: category || existingTemplate.category,
        is_active,
      });

      // Update the ID to match the existing template
      await supabase
        .from('email_templates')
        .update({
          name: updatedTemplate.name,
          subject_template: updatedTemplate.subject_template,
          html_template: updatedTemplate.html_template,
          text_template: updatedTemplate.text_template,
          template_variables: updatedTemplate.template_variables,
          category: updatedTemplate.category,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else if (template_type === 'sms') {
      // Get existing template to merge changes
      const existingTemplate = await smsServiceConnector.getTemplate(id);
      if (!existingTemplate) {
        return NextResponse.json(
          { success: false, error: 'SMS template not found' },
          { status: 404 },
        );
      }

      updatedTemplate = await smsServiceConnector.upsertTemplate({
        name: name || existingTemplate.name,
        message_template: message_template || existingTemplate.message_template,
        template_variables:
          template_variables || existingTemplate.template_variables,
        category: category || existingTemplate.category,
        is_active,
        max_length: max_length || existingTemplate.max_length,
      });

      // Update the ID to match the existing template
      await supabase
        .from('sms_templates')
        .update({
          name: updatedTemplate.name,
          message_template: updatedTemplate.message_template,
          template_variables: updatedTemplate.template_variables,
          category: updatedTemplate.category,
          is_active,
          max_length: updatedTemplate.max_length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template_type. Must be "email" or "sms"',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        template: {
          ...updatedTemplate,
          id,
          template_type,
        },
      },
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') as 'email' | 'sms';
    const hardDelete = searchParams.get('hard_delete') === 'true';

    if (!templateType) {
      return NextResponse.json(
        { success: false, error: 'template_type query parameter is required' },
        { status: 400 },
      );
    }

    if (hardDelete) {
      // Permanently delete the template
      let deleteResult;

      if (templateType === 'email') {
        deleteResult = await supabase
          .from('email_templates')
          .delete()
          .eq('id', id);
      } else {
        deleteResult = await supabase
          .from('sms_templates')
          .delete()
          .eq('id', id);
      }

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message);
      }

      // Also remove vendor associations
      await supabase.from('vendor_templates').delete().eq('template_id', id);
    } else {
      // Soft delete - just mark as inactive
      let updateResult;

      if (templateType === 'email') {
        updateResult = await supabase
          .from('email_templates')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        updateResult = await supabase
          .from('sms_templates')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      }

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: hardDelete
          ? 'Template permanently deleted'
          : 'Template deactivated',
      },
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
