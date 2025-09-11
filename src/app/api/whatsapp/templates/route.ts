import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppService } from '@/lib/whatsapp/service';
import { z } from 'zod';

// Template creation schema
const createTemplateSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(2),
  category: z.enum(['AUTHENTICATION', 'MARKETING', 'UTILITY']),
  components: z.array(
    z.object({
      type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']),
      format: z
        .enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'])
        .optional(),
      text: z.string().optional(),
      example: z
        .object({
          header_text: z.array(z.string()).optional(),
          body_text: z.array(z.array(z.string())).optional(),
        })
        .optional(),
      buttons: z
        .array(
          z.object({
            type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
            text: z.string(),
            url: z.string().optional(),
            phone_number: z.string().optional(),
            payload: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  message_send_ttl_seconds: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const whatsAppService = createWhatsAppService();
    const result = await whatsAppService.getMessageTemplates();

    if (result.success) {
      return NextResponse.json({
        success: true,
        templates: result.templates,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('WhatsApp templates GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    };

    // Create template via Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/message_templates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Template creation error:', data);
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to create template',
          details: data.error,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      templateId: data.id,
      status: data.status || 'PENDING',
      message: 'Template created successfully and is pending approval',
    });
  } catch (error) {
    console.error('WhatsApp template creation error:', error);

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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateName = searchParams.get('name');

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 },
      );
    }

    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    };

    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/message_templates?name=${templateName}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      console.error('Template deletion error:', data);
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to delete template',
          details: data.error,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('WhatsApp template deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
