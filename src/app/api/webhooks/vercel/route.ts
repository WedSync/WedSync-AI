import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  VercelWebhookHandler,
  VercelWebhookPayload,
} from '@/lib/integrations/VercelWebhookHandler';
import { supabase } from '@/lib/supabase/client';

// Security patterns from the specification
interface SecurityError extends Error {
  code: string;
  details?: any;
}

class SecurityError extends Error {
  constructor(
    public code: string,
    public details?: any,
  ) {
    super(`Security error: ${code}`);
    this.name = 'SecurityError';
  }
}

async function enforceRateLimit(
  key: string,
  type: string,
  limits: { requests: number; windowMs: number },
) {
  // Simplified rate limiting - in production would use Redis or similar
  const now = Date.now();
  const windowStart = now - limits.windowMs;

  try {
    const { data: requests } = await supabase
      .from('rate_limit_attempts')
      .select('created_at')
      .eq('key', key)
      .eq('type', type)
      .gte('created_at', new Date(windowStart).toISOString())
      .order('created_at', { ascending: false })
      .limit(limits.requests);

    if (requests && requests.length >= limits.requests) {
      throw new SecurityError('RATE_LIMIT_EXCEEDED', {
        key,
        type,
        attempts: requests.length,
        limit: limits.requests,
      });
    }

    // Log this attempt
    await supabase.from('rate_limit_attempts').insert({
      key,
      type,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof SecurityError) {
      throw error;
    }
    console.error('Rate limiting check failed:', error);
  }
}

async function withSecureValidation<T>(
  handler: (request: NextRequest) => Promise<T>,
  options: {
    rateLimits: Record<string, { requests: number; windowMs: number }>;
    auditLog: {
      action: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
  },
): Promise<NextResponse> {
  return (async function (request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    let auditDetails: any = {};

    try {
      // Rate limiting
      const rateLimitKey = `webhook:${request.ip || 'unknown'}`;
      await enforceRateLimit(
        rateLimitKey,
        'vercel_webhook',
        options.rateLimits.vercel_webhook,
      );

      // Execute the handler
      const result = await handler(request);

      // Log successful audit
      auditDetails = {
        success: true,
        duration: Date.now() - startTime,
        result: typeof result === 'object' ? 'processed' : result,
      };

      await logAuditEvent(options.auditLog, auditDetails, request);

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('Webhook processing failed:', error);

      auditDetails = {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode:
          error instanceof SecurityError ? error.code : 'PROCESSING_ERROR',
      };

      await logAuditEvent(options.auditLog, auditDetails, request);

      if (error instanceof SecurityError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Security validation failed',
            code: error.code,
          },
          { status: error.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403 },
        );
      }

      return NextResponse.json(
        { success: false, error: 'Webhook processing failed' },
        { status: 500 },
      );
    }
  })(request);
}

async function logAuditEvent(
  auditConfig: { action: string; riskLevel: string },
  details: any,
  request: NextRequest,
) {
  try {
    await supabase.from('audit_logs').insert({
      action: auditConfig.action,
      risk_level: auditConfig.riskLevel,
      details,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

const webhookHandler = new VercelWebhookHandler();

const processVercelWebhook = async (payload: VercelWebhookPayload) => {
  return await webhookHandler.processWebhook(payload);
};

const VercelWebhookHandlerSecure = withSecureValidation(
  async (request: NextRequest) => {
    const body = await request.text();
    const signature = request.headers.get('X-Vercel-Signature');

    // 1. Verify webhook signature
    if (!signature) {
      throw new SecurityError('WEBHOOK_SIGNATURE_MISSING');
    }

    const expectedSignature = createHmac(
      'sha1',
      process.env.VERCEL_WEBHOOK_SECRET!,
    )
      .update(body)
      .digest('hex');

    if (`sha1=${expectedSignature}` !== signature) {
      throw new SecurityError('WEBHOOK_SIGNATURE_INVALID', {
        expected: 'sha1=' + expectedSignature.substring(0, 8) + '...',
        received: signature.substring(0, 16) + '...',
      });
    }

    // 2. Parse and validate webhook payload
    const payload = JSON.parse(body);

    if (!payload.type || !payload.data) {
      throw new SecurityError('WEBHOOK_PAYLOAD_INVALID', {
        type: payload.type || 'missing',
        hasData: !!payload.data,
      });
    }

    // 3. Rate limiting for webhooks
    const webhookId = payload.data.deploymentId || 'unknown';
    await enforceRateLimit(`webhook:${webhookId}`, 'vercel_webhook', {
      requests: 10,
      windowMs: 60000, // 10 webhooks per minute per deployment
    });

    return await processVercelWebhook(payload);
  },
  {
    rateLimits: {
      vercel_webhook: { requests: 50, windowMs: 60000 },
    },
    auditLog: {
      action: 'VERCEL_WEBHOOK',
      riskLevel: 'MEDIUM',
    },
  },
);

export async function POST(request: NextRequest) {
  return VercelWebhookHandlerSecure;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Vercel webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
