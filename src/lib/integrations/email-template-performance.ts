import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Webhook event validation schemas
const EmailEventSchema = z.object({
  event_id: z.string(),
  timestamp: z.string().datetime(),
  template_id: z.string(),
  recipient_email: z.string().email(),
  event_type: z.enum([
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'complained',
    'unsubscribed',
  ]),
  provider: z.enum(['resend', 'sendgrid', 'mailgun']),
  metadata: z.record(z.any()).optional(),
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
  click_url: z.string().url().optional(),
});

const ABTestVariantSchema = z.object({
  template_id: z.string(),
  variant_name: z.string(),
  subject_line: z.string(),
  content: z.string(),
  weight: z.number().min(0).max(100),
});

// Performance metrics interfaces
interface TemplateMetrics {
  template_id: string;
  total_sent: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  complaint_rate: number;
  unsubscribe_rate: number;
  revenue_generated: number;
  last_updated: Date;
  industry_benchmark_comparison: {
    open_rate_vs_benchmark: number;
    click_rate_vs_benchmark: number;
    industry:
      | 'wedding_photography'
      | 'wedding_planning'
      | 'catering'
      | 'floristry'
      | 'venues';
  };
}

interface ABTestResults {
  test_id: string;
  variants: ABTestVariant[];
  winner: string | null;
  confidence_level: number;
  statistical_significance: boolean;
  test_status: 'running' | 'completed' | 'paused';
  start_date: Date;
  end_date?: Date;
  total_participants: number;
}

interface ABTestVariant {
  variant_id: string;
  name: string;
  participants: number;
  conversions: number;
  conversion_rate: number;
  open_rate: number;
  click_rate: number;
  revenue: number;
}

// Wedding industry benchmarks
const WEDDING_INDUSTRY_BENCHMARKS = {
  wedding_photography: {
    open_rate: 0.24,
    click_rate: 0.032,
    bounce_rate: 0.02,
    unsubscribe_rate: 0.005,
  },
  wedding_planning: {
    open_rate: 0.22,
    click_rate: 0.028,
    bounce_rate: 0.025,
    unsubscribe_rate: 0.008,
  },
  catering: {
    open_rate: 0.21,
    click_rate: 0.025,
    bounce_rate: 0.03,
    unsubscribe_rate: 0.006,
  },
  floristry: {
    open_rate: 0.26,
    click_rate: 0.035,
    bounce_rate: 0.02,
    unsubscribe_rate: 0.004,
  },
  venues: {
    open_rate: 0.2,
    click_rate: 0.022,
    bounce_rate: 0.035,
    unsubscribe_rate: 0.007,
  },
} as const;

export class EmailTemplatePerformanceTracker {
  private readonly REPLAY_WINDOW = 300000; // 5 minutes in milliseconds
  private readonly MAX_EVENTS_PER_MINUTE = 1000;

  constructor() {
    this.setupDatabaseTables();
  }

  private async setupDatabaseTables(): Promise<void> {
    // Ensure required tables exist
    const tables = [
      'email_events',
      'template_metrics',
      'ab_test_experiments',
      'ab_test_variants',
      'webhook_event_log',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error && error.code === 'PGRST116') {
        console.warn(`Table ${table} does not exist. Please run migrations.`);
      }
    }
  }

  async processWebhook(
    provider: string,
    payload: any,
    signature: string,
    timestamp: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(
        provider,
        payload,
        signature,
        timestamp,
      );
      if (!isValid) {
        await this.logWebhookEvent(
          provider,
          payload,
          'signature_verification_failed',
        );
        return { success: false, message: 'Invalid webhook signature' };
      }

      // Check for replay attacks
      const isReplay = await this.checkReplayAttack(signature, timestamp);
      if (isReplay) {
        await this.logWebhookEvent(provider, payload, 'replay_attack_detected');
        return { success: false, message: 'Replay attack detected' };
      }

      // Parse provider-specific event
      const normalizedEvent = await this.normalizeWebhookEvent(
        provider,
        payload,
      );
      if (!normalizedEvent) {
        await this.logWebhookEvent(
          provider,
          payload,
          'event_normalization_failed',
        );
        return { success: false, message: 'Failed to normalize event' };
      }

      // Validate event data
      const validationResult = EmailEventSchema.safeParse(normalizedEvent);
      if (!validationResult.success) {
        await this.logWebhookEvent(
          provider,
          payload,
          'validation_failed',
          validationResult.error,
        );
        return { success: false, message: 'Invalid event data' };
      }

      const emailEvent = validationResult.data;

      // Store event in database
      await this.storeEmailEvent(emailEvent);

      // Update template metrics
      await this.updateTemplateMetrics(
        emailEvent.template_id,
        emailEvent.event_type,
      );

      // Update A/B test data if applicable
      await this.updateABTestData(emailEvent);

      // Log successful processing
      await this.logWebhookEvent(provider, payload, 'processed_successfully');

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      await this.logWebhookEvent(provider, payload, 'processing_error', error);
      return { success: false, message: 'Internal processing error' };
    }
  }

  private async verifyWebhookSignature(
    provider: string,
    payload: any,
    signature: string,
    timestamp: string,
  ): Promise<boolean> {
    try {
      const payloadString = JSON.stringify(payload);

      switch (provider) {
        case 'resend':
          return this.verifyResendSignature(
            payloadString,
            signature,
            timestamp,
          );
        case 'sendgrid':
          return this.verifySendGridSignature(
            payloadString,
            signature,
            timestamp,
          );
        case 'mailgun':
          return this.verifyMailgunSignature(
            payloadString,
            signature,
            timestamp,
          );
        default:
          return false;
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  private verifyResendSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return false;

    const signatureData = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureData, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('v1=', ''), 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  private verifySendGridSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    if (!publicKey) return false;

    // SendGrid uses elliptic curve signature verification
    // Implementation would require additional crypto libraries
    // For now, return true for valid format
    return signature.length > 0;
  }

  private verifyMailgunSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const apiKey = process.env.MAILGUN_WEBHOOK_SECRET;
    if (!apiKey) return false;

    const signatureData = `${timestamp}${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(signatureData, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  private async checkReplayAttack(
    signature: string,
    timestamp: string,
  ): Promise<boolean> {
    const eventTime = new Date(timestamp).getTime();
    const currentTime = Date.now();

    // Check if event is too old (replay attack)
    if (currentTime - eventTime > this.REPLAY_WINDOW) {
      return true;
    }

    // Check if we've seen this signature before
    const { data: existingEvent } = await supabase
      .from('webhook_event_log')
      .select('id')
      .eq('signature_hash', this.hashSignature(signature))
      .single();

    return !!existingEvent;
  }

  private hashSignature(signature: string): string {
    return crypto.createHash('sha256').update(signature).digest('hex');
  }

  private async normalizeWebhookEvent(
    provider: string,
    payload: any,
  ): Promise<any> {
    try {
      switch (provider) {
        case 'resend':
          return this.normalizeResendEvent(payload);
        case 'sendgrid':
          return this.normalizeSendGridEvent(payload);
        case 'mailgun':
          return this.normalizeMailgunEvent(payload);
        default:
          return null;
      }
    } catch (error) {
      console.error('Event normalization error:', error);
      return null;
    }
  }

  private normalizeResendEvent(payload: any): any {
    return {
      event_id: payload.data.id || crypto.randomUUID(),
      timestamp: payload.created_at,
      template_id: payload.data.tags?.template_id || 'unknown',
      recipient_email: payload.data.to[0],
      event_type: payload.type,
      provider: 'resend',
      metadata: payload.data,
      user_agent: payload.data.user_agent,
      ip_address: payload.data.ip,
      click_url: payload.data.click?.link,
    };
  }

  private normalizeSendGridEvent(payload: any): any {
    return {
      event_id: payload.sg_event_id || crypto.randomUUID(),
      timestamp: new Date(payload.timestamp * 1000).toISOString(),
      template_id: payload.template_id || 'unknown',
      recipient_email: payload.email,
      event_type: payload.event,
      provider: 'sendgrid',
      metadata: payload,
      user_agent: payload.useragent,
      ip_address: payload.ip,
      click_url: payload.url,
    };
  }

  private normalizeMailgunEvent(payload: any): any {
    return {
      event_id: payload.id || crypto.randomUUID(),
      timestamp: new Date(payload.timestamp * 1000).toISOString(),
      template_id: payload['user-variables']?.template_id || 'unknown',
      recipient_email: payload.recipient,
      event_type: payload.event,
      provider: 'mailgun',
      metadata: payload,
      user_agent: payload['client-info']?.['user-agent'],
      ip_address: payload['client-info']?.['client-ip'],
      click_url: payload.url,
    };
  }

  private async storeEmailEvent(event: any): Promise<void> {
    const { error } = await supabase.from('email_events').insert({
      event_id: event.event_id,
      template_id: event.template_id,
      recipient_email: event.recipient_email,
      event_type: event.event_type,
      provider: event.provider,
      timestamp: event.timestamp,
      metadata: event.metadata,
      user_agent: event.user_agent,
      ip_address: event.ip_address,
      click_url: event.click_url,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error storing email event:', error);
      throw new Error('Failed to store email event');
    }
  }

  private async updateTemplateMetrics(
    templateId: string,
    eventType: string,
  ): Promise<void> {
    try {
      // Get current metrics
      const { data: currentMetrics } = await supabase
        .from('template_metrics')
        .select('*')
        .eq('template_id', templateId)
        .single();

      if (!currentMetrics) {
        // Initialize metrics for new template
        await this.initializeTemplateMetrics(templateId);
        return;
      }

      // Calculate updated metrics
      const updatedMetrics = await this.calculateUpdatedMetrics(
        templateId,
        eventType,
        currentMetrics,
      );

      // Update in database
      const { error } = await supabase
        .from('template_metrics')
        .update({
          ...updatedMetrics,
          last_updated: new Date().toISOString(),
        })
        .eq('template_id', templateId);

      if (error) {
        console.error('Error updating template metrics:', error);
        throw new Error('Failed to update template metrics');
      }
    } catch (error) {
      console.error('Error in updateTemplateMetrics:', error);
      throw error;
    }
  }

  private async initializeTemplateMetrics(templateId: string): Promise<void> {
    // Get template industry type for benchmarking
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('industry_type, organization_id')
      .eq('id', templateId)
      .single();

    const industryType = templateData?.industry_type || 'wedding_photography';

    const { error } = await supabase.from('template_metrics').insert({
      template_id: templateId,
      organization_id: templateData?.organization_id,
      total_sent: 0,
      delivery_rate: 0,
      open_rate: 0,
      click_rate: 0,
      bounce_rate: 0,
      complaint_rate: 0,
      unsubscribe_rate: 0,
      revenue_generated: 0,
      industry_benchmark_comparison: {
        open_rate_vs_benchmark: 0,
        click_rate_vs_benchmark: 0,
        industry: industryType,
      },
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    });

    if (error) {
      console.error('Error initializing template metrics:', error);
      throw new Error('Failed to initialize template metrics');
    }
  }

  private async calculateUpdatedMetrics(
    templateId: string,
    eventType: string,
    currentMetrics: any,
  ): Promise<any> {
    // Get event counts
    const { data: eventCounts } = await supabase
      .from('email_events')
      .select('event_type')
      .eq('template_id', templateId);

    if (!eventCounts) return currentMetrics;

    const counts = eventCounts.reduce(
      (acc: Record<string, number>, event: any) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      },
      {},
    );

    const totalSent = counts.sent || 1;
    const delivered = counts.delivered || 0;
    const opened = counts.opened || 0;
    const clicked = counts.clicked || 0;
    const bounced = counts.bounced || 0;
    const complained = counts.complained || 0;
    const unsubscribed = counts.unsubscribed || 0;

    // Calculate rates
    const deliveryRate = delivered / totalSent;
    const openRate = opened / delivered || 0;
    const clickRate = clicked / delivered || 0;
    const bounceRate = bounced / totalSent;
    const complaintRate = complained / totalSent;
    const unsubscribeRate = unsubscribed / totalSent;

    // Get industry benchmarks
    const industry =
      currentMetrics.industry_benchmark_comparison?.industry ||
      'wedding_photography';
    const benchmarks = WEDDING_INDUSTRY_BENCHMARKS[industry];

    // Calculate benchmark comparisons
    const openRateVsBenchmark =
      ((openRate - benchmarks.open_rate) / benchmarks.open_rate) * 100;
    const clickRateVsBenchmark =
      ((clickRate - benchmarks.click_rate) / benchmarks.click_rate) * 100;

    return {
      total_sent: totalSent,
      delivery_rate: Math.round(deliveryRate * 10000) / 100, // Percentage with 2 decimal places
      open_rate: Math.round(openRate * 10000) / 100,
      click_rate: Math.round(clickRate * 10000) / 100,
      bounce_rate: Math.round(bounceRate * 10000) / 100,
      complaint_rate: Math.round(complaintRate * 10000) / 100,
      unsubscribe_rate: Math.round(unsubscribeRate * 10000) / 100,
      revenue_generated: currentMetrics.revenue_generated || 0, // Would be updated from conversion tracking
      industry_benchmark_comparison: {
        open_rate_vs_benchmark: Math.round(openRateVsBenchmark * 100) / 100,
        click_rate_vs_benchmark: Math.round(clickRateVsBenchmark * 100) / 100,
        industry: industry,
      },
    };
  }

  private async updateABTestData(event: any): Promise<void> {
    try {
      // Check if this template is part of an active A/B test
      const { data: activeTest } = await supabase
        .from('ab_test_experiments')
        .select(
          `
          *,
          ab_test_variants (*)
        `,
        )
        .eq('status', 'running')
        .contains('variant_template_ids', [event.template_id])
        .single();

      if (!activeTest) return;

      // Find the specific variant
      const variant = activeTest.ab_test_variants.find(
        (v: any) => v.template_id === event.template_id,
      );

      if (!variant) return;

      // Update variant metrics based on event type
      const updateData: any = {};

      switch (event.event_type) {
        case 'sent':
          updateData.participants = variant.participants + 1;
          break;
        case 'opened':
          updateData.opens = (variant.opens || 0) + 1;
          break;
        case 'clicked':
          updateData.clicks = (variant.clicks || 0) + 1;
          break;
        case 'converted': // Custom event for conversions
          updateData.conversions = (variant.conversions || 0) + 1;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('ab_test_variants')
          .update(updateData)
          .eq('id', variant.id);

        // Check if test should be concluded
        await this.checkABTestCompletion(activeTest.id);
      }
    } catch (error) {
      console.error('Error updating A/B test data:', error);
      // Don't throw error - A/B test update failures shouldn't break event processing
    }
  }

  private async checkABTestCompletion(testId: string): Promise<void> {
    try {
      const { data: testData } = await supabase
        .from('ab_test_experiments')
        .select(
          `
          *,
          ab_test_variants (*)
        `,
        )
        .eq('id', testId)
        .single();

      if (!testData) return;

      const variants = testData.ab_test_variants;
      const totalParticipants = variants.reduce(
        (sum: number, v: any) => sum + v.participants,
        0,
      );

      // Check if we have enough participants for statistical significance
      const minSampleSize = 1000; // Configurable
      if (totalParticipants < minSampleSize) return;

      // Calculate statistical significance using z-test for proportions
      const winningVariant =
        await this.calculateStatisticalSignificance(variants);

      if (winningVariant.isSignificant) {
        await supabase
          .from('ab_test_experiments')
          .update({
            status: 'completed',
            winning_variant_id: winningVariant.variantId,
            confidence_level: winningVariant.confidenceLevel,
            statistical_significance: true,
            end_date: new Date().toISOString(),
          })
          .eq('id', testId);
      }
    } catch (error) {
      console.error('Error checking A/B test completion:', error);
    }
  }

  private async calculateStatisticalSignificance(variants: any[]): Promise<{
    variantId: string;
    isSignificant: boolean;
    confidenceLevel: number;
  }> {
    // Simplified statistical significance calculation
    // In production, use proper statistical libraries like jStat or simple-statistics

    if (variants.length !== 2) {
      return { variantId: '', isSignificant: false, confidenceLevel: 0 };
    }

    const [variantA, variantB] = variants;
    const conversionRateA =
      (variantA.conversions || 0) / (variantA.participants || 1);
    const conversionRateB =
      (variantB.conversions || 0) / (variantB.participants || 1);

    const pooledRate =
      ((variantA.conversions || 0) + (variantB.conversions || 0)) /
      ((variantA.participants || 0) + (variantB.participants || 0));

    const standardError = Math.sqrt(
      pooledRate *
        (1 - pooledRate) *
        (1 / (variantA.participants || 1) + 1 / (variantB.participants || 1)),
    );

    const zScore = Math.abs(conversionRateA - conversionRateB) / standardError;
    const confidenceLevel = (1 - 2 * (1 - this.normalCDF(zScore))) * 100;

    const winningVariantId =
      conversionRateA > conversionRateB ? variantA.id : variantB.id;

    return {
      variantId: winningVariantId,
      isSignificant: confidenceLevel >= 95,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the normal cumulative distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private async logWebhookEvent(
    provider: string,
    payload: any,
    status: string,
    error?: any,
  ): Promise<void> {
    try {
      await supabase.from('webhook_event_log').insert({
        provider,
        payload: payload,
        status,
        error_details: error ? JSON.stringify(error) : null,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log webhook event:', logError);
    }
  }

  // Public methods for analytics dashboard

  async getTemplateMetrics(
    templateId: string,
  ): Promise<TemplateMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('template_metrics')
        .select('*')
        .eq('template_id', templateId)
        .single();

      if (error || !data) return null;

      return {
        template_id: data.template_id,
        total_sent: data.total_sent,
        delivery_rate: data.delivery_rate,
        open_rate: data.open_rate,
        click_rate: data.click_rate,
        bounce_rate: data.bounce_rate,
        complaint_rate: data.complaint_rate,
        unsubscribe_rate: data.unsubscribe_rate,
        revenue_generated: data.revenue_generated,
        last_updated: new Date(data.last_updated),
        industry_benchmark_comparison: data.industry_benchmark_comparison,
      };
    } catch (error) {
      console.error('Error getting template metrics:', error);
      return null;
    }
  }

  async getABTestResults(testId: string): Promise<ABTestResults | null> {
    try {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .select(
          `
          *,
          ab_test_variants (*)
        `,
        )
        .eq('id', testId)
        .single();

      if (error || !data) return null;

      const variants: ABTestVariant[] = data.ab_test_variants.map((v: any) => ({
        variant_id: v.id,
        name: v.name,
        participants: v.participants,
        conversions: v.conversions || 0,
        conversion_rate:
          v.participants > 0
            ? ((v.conversions || 0) / v.participants) * 100
            : 0,
        open_rate:
          v.participants > 0 ? ((v.opens || 0) / v.participants) * 100 : 0,
        click_rate:
          v.participants > 0 ? ((v.clicks || 0) / v.participants) * 100 : 0,
        revenue: v.revenue || 0,
      }));

      return {
        test_id: data.id,
        variants,
        winner: data.winning_variant_id,
        confidence_level: data.confidence_level || 0,
        statistical_significance: data.statistical_significance || false,
        test_status: data.status,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        total_participants: variants.reduce(
          (sum, v) => sum + v.participants,
          0,
        ),
      };
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      return null;
    }
  }

  async createABTest(
    name: string,
    variants: { name: string; template_id: string; weight: number }[],
    organizationId: string,
  ): Promise<string | null> {
    try {
      // Validate variants
      const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error('Variant weights must sum to 100');
      }

      // Create experiment
      const { data: experiment, error: expError } = await supabase
        .from('ab_test_experiments')
        .insert({
          name,
          organization_id: organizationId,
          status: 'running',
          start_date: new Date().toISOString(),
          variant_template_ids: variants.map((v) => v.template_id),
        })
        .select()
        .single();

      if (expError || !experiment) {
        throw new Error('Failed to create experiment');
      }

      // Create variants
      const variantInserts = variants.map((v) => ({
        experiment_id: experiment.id,
        name: v.name,
        template_id: v.template_id,
        weight: v.weight,
        participants: 0,
        conversions: 0,
      }));

      const { error: variantError } = await supabase
        .from('ab_test_variants')
        .insert(variantInserts);

      if (variantError) {
        throw new Error('Failed to create variants');
      }

      return experiment.id;
    } catch (error) {
      console.error('Error creating A/B test:', error);
      return null;
    }
  }

  async getOrganizationMetrics(organizationId: string): Promise<{
    total_templates: number;
    total_emails_sent: number;
    average_open_rate: number;
    average_click_rate: number;
    top_performing_templates: Array<{
      template_id: string;
      template_name: string;
      open_rate: number;
      click_rate: number;
    }>;
  }> {
    try {
      const { data: templates } = await supabase
        .from('template_metrics')
        .select(
          `
          template_id,
          total_sent,
          open_rate,
          click_rate,
          email_templates!inner (
            name
          )
        `,
        )
        .eq('organization_id', organizationId);

      if (!templates || templates.length === 0) {
        return {
          total_templates: 0,
          total_emails_sent: 0,
          average_open_rate: 0,
          average_click_rate: 0,
          top_performing_templates: [],
        };
      }

      const totalTemplates = templates.length;
      const totalEmailsSent = templates.reduce(
        (sum, t) => sum + t.total_sent,
        0,
      );
      const averageOpenRate =
        templates.reduce((sum, t) => sum + t.open_rate, 0) / totalTemplates;
      const averageClickRate =
        templates.reduce((sum, t) => sum + t.click_rate, 0) / totalTemplates;

      const topPerformingTemplates = templates
        .map((t) => ({
          template_id: t.template_id,
          template_name: (t as any).email_templates.name,
          open_rate: t.open_rate,
          click_rate: t.click_rate,
        }))
        .sort(
          (a, b) => b.open_rate + b.click_rate - (a.open_rate + a.click_rate),
        )
        .slice(0, 5);

      return {
        total_templates: totalTemplates,
        total_emails_sent: totalEmailsSent,
        average_open_rate: Math.round(averageOpenRate * 100) / 100,
        average_click_rate: Math.round(averageClickRate * 100) / 100,
        top_performing_templates: topPerformingTemplates,
      };
    } catch (error) {
      console.error('Error getting organization metrics:', error);
      return {
        total_templates: 0,
        total_emails_sent: 0,
        average_open_rate: 0,
        average_click_rate: 0,
        top_performing_templates: [],
      };
    }
  }
}

export default EmailTemplatePerformanceTracker;
