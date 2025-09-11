import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/email-service';
import { PlatformIntegrations } from './platform-integrations';
import { auditLogger } from '@/lib/middleware/audit';
import { z } from 'zod';

export interface ReviewCampaign {
  id: string;
  supplier_id: string;
  name: string;
  template_message: string;
  auto_send_enabled: boolean;
  send_delay_days: number;
  follow_up_enabled: boolean;
  follow_up_delay_days: number;
  max_follow_ups: number;
  target_platforms: string[];
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ReviewRequest {
  id: string;
  campaign_id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  wedding_date: string;
  request_token: string;
  scheduled_send_at: string;
  sent_at?: string;
  opened_at?: string;
  completed_at?: string;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'expired';
  follow_up_count: number;
  next_follow_up_at?: string;
}

const CreateRequestSchema = z.object({
  campaign_id: z.string().uuid(),
  client_id: z.string().uuid(),
  client_email: z.string().email(),
  client_name: z.string().min(1),
  wedding_date: z.string().datetime(),
  send_immediately: z.boolean().default(false),
});

export class ReviewEngine {
  private supabase = createClient();
  private emailService = new EmailService();
  private platformIntegrations = new PlatformIntegrations();

  /**
   * Create a new review request for a campaign
   */
  async createReviewRequest(
    data: z.infer<typeof CreateRequestSchema>,
  ): Promise<ReviewRequest> {
    const validated = CreateRequestSchema.parse(data);

    // Get campaign details
    const { data: campaign, error: campaignError } = await this.supabase
      .from('review_campaigns')
      .select('*')
      .eq('id', validated.campaign_id)
      .eq('status', 'active')
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or inactive');
    }

    // Check for existing request
    const { data: existing } = await this.supabase
      .from('review_requests')
      .select('id')
      .eq('campaign_id', validated.campaign_id)
      .eq('client_id', validated.client_id)
      .single();

    if (existing) {
      throw new Error(
        'Review request already exists for this client and campaign',
      );
    }

    // Generate secure token
    const requestToken = crypto.randomUUID();

    // Calculate send time
    const weddingDate = new Date(validated.wedding_date);
    const sendDate = validated.send_immediately
      ? new Date()
      : new Date(
          weddingDate.getTime() +
            campaign.send_delay_days * 24 * 60 * 60 * 1000,
        );

    // Calculate follow-up date if enabled
    const nextFollowUp = campaign.follow_up_enabled
      ? new Date(
          sendDate.getTime() +
            campaign.follow_up_delay_days * 24 * 60 * 60 * 1000,
        )
      : null;

    // Create request record
    const requestData = {
      id: crypto.randomUUID(),
      campaign_id: validated.campaign_id,
      client_id: validated.client_id,
      client_email: validated.client_email,
      client_name: validated.client_name,
      wedding_date: validated.wedding_date,
      request_token: requestToken,
      scheduled_send_at: sendDate.toISOString(),
      status: validated.send_immediately ? 'sent' : 'pending',
      sent_at: validated.send_immediately ? new Date().toISOString() : null,
      follow_up_count: 0,
      next_follow_up_at: nextFollowUp?.toISOString() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Log audit event
    await auditLogger.logRequestEvent(
      'created',
      requestData.id,
      validated.campaign_id,
      undefined,
      campaign.supplier_id,
      {
        client_email: validated.client_email,
        wedding_date: validated.wedding_date,
        send_immediately: validated.send_immediately,
      },
    );

    const { data: request, error: requestError } = await this.supabase
      .from('review_requests')
      .insert(requestData)
      .select()
      .single();

    if (requestError) {
      throw new Error(
        `Failed to create review request: ${requestError.message}`,
      );
    }

    // Send immediately if requested
    if (validated.send_immediately) {
      await this.sendReviewRequest(request.id);
    }

    return request;
  }

  /**
   * Send a review request via email
   */
  async sendReviewRequest(requestId: string): Promise<void> {
    const { data: request, error } = await this.supabase
      .from('review_requests')
      .select(
        `
        *,
        campaigns:review_campaigns(*),
        clients:clients(*)
      `,
      )
      .eq('id', requestId)
      .single();

    if (error || !request) {
      throw new Error('Review request not found');
    }

    if (request.status !== 'pending' && request.status !== 'sent') {
      throw new Error(`Cannot send request with status: ${request.status}`);
    }

    try {
      // Generate review URL
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reviews/${request.request_token}`;

      // Process template with client data
      const processedMessage = this.processTemplate(
        request.campaigns.template_message,
        {
          client_name: request.client_name,
          supplier_name: request.campaigns.name,
          wedding_date: new Date(request.wedding_date).toLocaleDateString(),
          review_url: reviewUrl,
        },
      );

      // Send email
      await this.emailService.sendReviewRequest({
        to: request.client_email,
        clientName: request.client_name,
        supplierName: request.campaigns.name,
        message: processedMessage,
        reviewUrl,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${request.request_token}`,
      });

      // Update request status
      await this.supabase
        .from('review_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Log audit event
      await auditLogger.logRequestEvent(
        'sent',
        requestId,
        request.campaign_id,
        undefined,
        request.campaigns.supplier_id,
        {
          client_email: request.client_email,
          review_url: reviewUrl,
        },
      );
    } catch (error) {
      console.error('Failed to send review request:', error);

      // Update request with error
      await this.supabase
        .from('review_requests')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      throw error;
    }
  }

  /**
   * Process pending review requests (called by cron job)
   */
  async processPendingRequests(): Promise<{ sent: number; failed: number }> {
    const now = new Date().toISOString();

    // Get requests that are due to be sent
    const { data: requests, error } = await this.supabase
      .from('review_requests')
      .select('id')
      .eq('status', 'pending')
      .lte('scheduled_send_at', now)
      .limit(100); // Process in batches

    if (error) {
      console.error('Failed to fetch pending requests:', error);
      return { sent: 0, failed: 0 };
    }

    if (!requests?.length) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Process requests in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((request) => this.sendReviewRequest(request.id)),
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          console.error('Request failed:', result.reason);
        }
      });
    }

    return { sent, failed };
  }

  /**
   * Process follow-up requests
   */
  async processFollowUps(): Promise<{ sent: number; failed: number }> {
    const now = new Date().toISOString();

    // Get requests that need follow-ups
    const { data: requests, error } = await this.supabase
      .from('review_requests')
      .select(
        `
        *,
        campaigns:review_campaigns(*)
      `,
      )
      .eq('status', 'sent')
      .lte('next_follow_up_at', now)
      .lt('follow_up_count', 'campaigns.max_follow_ups')
      .limit(50);

    if (error || !requests?.length) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const request of requests) {
      try {
        // Check if enough time has passed since last follow-up
        const lastFollowUp = request.last_follow_up_at
          ? new Date(request.last_follow_up_at)
          : new Date(request.sent_at);

        const daysSinceLastContact =
          (Date.now() - lastFollowUp.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastContact < request.campaigns.follow_up_delay_days) {
          continue;
        }

        // Send follow-up email
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reviews/${request.request_token}`;

        await this.emailService.sendFollowUpRequest({
          to: request.client_email,
          clientName: request.client_name,
          supplierName: request.campaigns.name,
          reviewUrl,
          followUpNumber: request.follow_up_count + 1,
        });

        // Update request
        const nextFollowUpDate =
          request.follow_up_count + 1 < request.campaigns.max_follow_ups
            ? new Date(
                Date.now() +
                  request.campaigns.follow_up_delay_days * 24 * 60 * 60 * 1000,
              )
            : null;

        await this.supabase
          .from('review_requests')
          .update({
            follow_up_count: request.follow_up_count + 1,
            last_follow_up_at: new Date().toISOString(),
            next_follow_up_at: nextFollowUpDate?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        sent++;
      } catch (error) {
        console.error(`Follow-up failed for request ${request.id}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Track review request opening
   */
  async trackRequestOpen(token: string): Promise<void> {
    const { data: request, error } = await this.supabase
      .from('review_requests')
      .select('id, status, opened_at')
      .eq('request_token', token)
      .single();

    if (error || !request) {
      throw new Error('Review request not found');
    }

    if (!request.opened_at) {
      await this.supabase
        .from('review_requests')
        .update({
          opened_at: new Date().toISOString(),
          status: request.status === 'sent' ? 'opened' : request.status,
          updated_at: new Date().toISOString(),
        })
        .eq('request_token', token);

      // Log audit event
      await auditLogger.logRequestEvent(
        'opened',
        request.id,
        request.campaign_id,
      );
    }
  }

  /**
   * Mark review request as completed
   */
  async markRequestCompleted(token: string, reviewData: any): Promise<void> {
    const { data: request, error } = await this.supabase
      .from('review_requests')
      .select('id, campaign_id, client_id')
      .eq('request_token', token)
      .single();

    if (error || !request) {
      throw new Error('Review request not found');
    }

    // Create review record
    const reviewRecord = {
      id: crypto.randomUUID(),
      request_id: request.id,
      campaign_id: request.campaign_id,
      client_id: request.client_id,
      platform: reviewData.platform || 'internal',
      rating: reviewData.rating,
      content: reviewData.content,
      reviewer_name: reviewData.reviewer_name,
      verified: true,
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.supabase.from('reviews').insert(reviewRecord);

    // Update request status
    await this.supabase
      .from('review_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('request_token', token);

    // Log audit events
    await auditLogger.logRequestEvent(
      'completed',
      request.id,
      request.campaign_id,
      request.client_id,
    );

    await auditLogger.logReviewEvent(
      'submitted',
      reviewRecord.id,
      request.id,
      reviewData.platform || 'internal',
      request.client_id,
      request.campaign_id,
      {
        rating: reviewData.rating,
        has_content: !!reviewData.content,
        reviewer_name: reviewData.reviewer_name,
      },
    );

    // Update campaign metrics
    await this.updateCampaignMetrics(request.campaign_id);
  }

  /**
   * Update campaign performance metrics
   */
  async updateCampaignMetrics(campaignId: string): Promise<void> {
    const { data: metrics } = await this.supabase.rpc(
      'calculate_campaign_metrics',
      {
        p_campaign_id: campaignId,
      },
    );

    if (metrics) {
      await this.supabase
        .from('review_campaigns')
        .update({
          total_requests_sent: metrics.total_requests,
          total_reviews_collected: metrics.reviews_collected,
          average_rating: metrics.average_rating,
          response_rate: metrics.completion_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
    }
  }

  /**
   * Expire old review requests
   */
  async expireOldRequests(): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 30); // 30 days

    const { data, error } = await this.supabase
      .from('review_requests')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .in('status', ['sent', 'opened'])
      .lt('sent_at', expiryDate.toISOString())
      .select('id');

    if (error) {
      console.error('Failed to expire old requests:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Process template with variables
   */
  private processTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    const { data: campaign } = await this.supabase
      .from('review_campaigns')
      .select(
        `
        *,
        requests:review_requests(count),
        reviews:reviews(count, rating)
      `,
      )
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const { data: requestStats } = await this.supabase
      .from('review_requests')
      .select('status')
      .eq('campaign_id', campaignId);

    const stats =
      requestStats?.reduce(
        (acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const totalRequests = requestStats?.length || 0;
    const sentRequests =
      (stats.sent || 0) + (stats.opened || 0) + (stats.completed || 0);
    const completedRequests = stats.completed || 0;

    return {
      campaign,
      stats: {
        total_requests: totalRequests,
        sent_requests: sentRequests,
        opened_requests: stats.opened || 0,
        completed_requests: completedRequests,
        expired_requests: stats.expired || 0,
        open_rate:
          sentRequests > 0 ? ((stats.opened || 0) / sentRequests) * 100 : 0,
        completion_rate:
          sentRequests > 0 ? (completedRequests / sentRequests) * 100 : 0,
      },
    };
  }
}
