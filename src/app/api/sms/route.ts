import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SMSService } from '@/lib/services/sms-service';
import { z } from 'zod';

// Request validation schema
const sendSMSSchema = z.object({
  to: z.string().min(1, 'Recipient phone number is required'),
  templateId: z.string().uuid().optional(),
  content: z.string().optional(),
  variables: z.record(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
  consent_verified: z.boolean().optional().default(false),
  bypass_opt_out: z.boolean().optional().default(false),
});

/**
 * POST /api/sms - Send SMS message
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = sendSMSSchema.parse(body);

    // Initialize SMS service with user configuration
    const smsService = await SMSService.createWithUserConfig(user.id);

    // Prepare send configuration
    const sendConfig = {
      to: validatedData.to,
      templateId: validatedData.templateId,
      content: validatedData.content,
      variables: validatedData.variables || {},
      consent_verified: validatedData.consent_verified,
      bypass_opt_out: validatedData.bypass_opt_out,
    };

    if (validatedData.scheduled_for) {
      sendConfig['scheduled_for'] = new Date(validatedData.scheduled_for);
    }

    // Send SMS
    const result = await smsService.sendTemplateMessage(sendConfig);

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('SMS send error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sms - Get SMS analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 },
      );
    }

    const smsService = await SMSService.createWithUserConfig(user.id);
    const analytics = await smsService.getAnalytics(
      user.id,
      new Date(startDate),
      new Date(endDate),
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('SMS analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
