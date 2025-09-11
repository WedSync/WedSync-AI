import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface ABTestContext {
  testId: string;
  clientId: string;
  messageType: 'email' | 'sms' | 'whatsapp' | 'phone';
  campaignId?: string;
  weddingPhase?: 'planning' | 'confirmed' | 'final_details' | 'post_wedding';
}

export interface MessageVariant {
  id: string;
  subject?: string;
  content: string;
  timing?: string;
  channel: string;
  metadata?: any;
}

export class ABTestingService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  /**
   * Get the appropriate variant for a client in an A/B test
   */
  async getVariantForClient(
    context: ABTestContext,
  ): Promise<MessageVariant | null> {
    try {
      // Check if there's an active test for this message type
      const { data: activeTests } = await this.supabase
        .from('ab_tests')
        .select(
          `
          id,
          name,
          status,
          variants:ab_test_variants(*)
        `,
        )
        .eq('status', 'running')
        .contains('metrics', [context.messageType]);

      if (!activeTests || activeTests.length === 0) {
        return null; // No active tests
      }

      // For now, use the first matching test (in production, you might have more sophisticated logic)
      const test = activeTests[0];

      // Get variant assignment using the database function
      const { data: variantId, error } = await this.supabase.rpc(
        'get_variant_assignment',
        {
          p_test_id: test.id,
          p_client_id: context.clientId,
        },
      );

      if (error || !variantId) {
        console.error('Error getting variant assignment:', error);
        return null;
      }

      // Find the variant details
      const variant = test.variants.find((v: any) => v.id === variantId);
      if (!variant) {
        return null;
      }

      // Record exposure event
      await this.recordEvent({
        testId: test.id,
        variantId: variant.id,
        clientId: context.clientId,
        eventType: 'exposure',
        eventData: {
          messageType: context.messageType,
          campaignId: context.campaignId,
          weddingPhase: context.weddingPhase,
        },
      });

      return {
        id: variant.id,
        subject: variant.content.subject,
        content: variant.content.message || variant.content.content,
        timing: variant.content.timing,
        channel: variant.content.channel || context.messageType,
        metadata: {
          testId: test.id,
          variantId: variant.id,
          isControl: variant.is_control,
          testName: test.name,
        },
      };
    } catch (error) {
      console.error('Error in getVariantForClient:', error);
      return null;
    }
  }

  /**
   * Record an event for A/B test tracking
   */
  async recordEvent({
    testId,
    variantId,
    clientId,
    eventType,
    eventData = {},
    messageId = null,
  }: {
    testId: string;
    variantId: string;
    clientId: string;
    eventType: 'exposure' | 'open' | 'response' | 'engagement' | 'conversion';
    eventData?: any;
    messageId?: string | null;
  }): Promise<void> {
    try {
      await this.supabase.rpc('record_ab_test_event', {
        p_test_id: testId,
        p_variant_id: variantId,
        p_client_id: clientId,
        p_event_type: eventType,
        p_event_data: eventData,
        p_message_id: messageId,
      });
    } catch (error) {
      console.error('Error recording A/B test event:', error);
      // Don't throw - we don't want A/B testing issues to break message sending
    }
  }

  /**
   * Check if a message should be A/B tested based on campaign settings
   */
  async shouldTestMessage(
    organizationId: string,
    messageType: string,
    campaignId?: string,
  ): Promise<{ shouldTest: boolean; testId?: string }> {
    try {
      const { data: activeTests } = await this.supabase
        .from('ab_tests')
        .select('id, target_audience')
        .eq('status', 'running')
        .eq('organization_id', organizationId)
        .contains('metrics', [messageType]);

      if (!activeTests || activeTests.length === 0) {
        return { shouldTest: false };
      }

      // For simplicity, return the first matching test
      // In a more sophisticated setup, you might have targeting rules
      const test = activeTests[0];

      // Check target audience criteria if specified
      if (test.target_audience) {
        // Implement audience targeting logic here
        // For now, we'll test all messages
      }

      return {
        shouldTest: true,
        testId: test.id,
      };
    } catch (error) {
      console.error('Error checking if message should be tested:', error);
      return { shouldTest: false };
    }
  }

  /**
   * Apply A/B test variant to a message before sending
   */
  async applyVariantToMessage(
    message: any,
    context: ABTestContext,
  ): Promise<any> {
    const variant = await this.getVariantForClient(context);

    if (!variant) {
      return message; // No A/B test or variant, return original
    }

    // Apply variant modifications
    const modifiedMessage = {
      ...message,
      subject: variant.subject || message.subject,
      content: variant.content || message.content,
      metadata: {
        ...message.metadata,
        abTest: variant.metadata,
      },
    };

    return modifiedMessage;
  }

  /**
   * Handle message delivery events for A/B test tracking
   */
  async trackMessageDelivery({
    messageId,
    clientId,
    eventType,
    eventData = {},
  }: {
    messageId: string;
    clientId: string;
    eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied';
    eventData?: any;
  }): Promise<void> {
    try {
      // Get the message to see if it's part of an A/B test
      const { data: message } = await this.supabase
        .from('messages') // Assuming you have a messages table
        .select('metadata')
        .eq('id', messageId)
        .single();

      if (!message?.metadata?.abTest) {
        return; // Not an A/B test message
      }

      const { testId, variantId } = message.metadata.abTest;

      // Map delivery events to A/B test events
      const eventMapping: { [key: string]: string } = {
        sent: 'exposure',
        delivered: 'exposure',
        opened: 'open',
        clicked: 'engagement',
        replied: 'response',
      };

      const abTestEventType = eventMapping[eventType];
      if (abTestEventType) {
        await this.recordEvent({
          testId,
          variantId,
          clientId,
          eventType: abTestEventType as any,
          eventData: {
            originalEventType: eventType,
            messageId,
            ...eventData,
          },
          messageId,
        });
      }
    } catch (error) {
      console.error('Error tracking message delivery for A/B test:', error);
    }
  }

  /**
   * Get A/B test performance summary for a specific test
   */
  async getTestPerformanceSummary(testId: string) {
    try {
      const { data: performance } = await this.supabase
        .from('ab_test_performance')
        .select('*')
        .eq('test_id', testId);

      return performance;
    } catch (error) {
      console.error('Error getting test performance summary:', error);
      return null;
    }
  }

  /**
   * Wedding-specific helper to determine message phase
   */
  static getWeddingPhase(weddingDate: Date): string {
    const now = new Date();
    const daysUntilWedding = Math.floor(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding > 180) {
      return 'planning';
    } else if (daysUntilWedding > 30) {
      return 'confirmed';
    } else if (daysUntilWedding >= 0) {
      return 'final_details';
    } else {
      return 'post_wedding';
    }
  }

  /**
   * Get recommended message templates based on A/B test results
   */
  async getRecommendedTemplates(
    organizationId: string,
    messageType: string,
    weddingPhase?: string,
  ) {
    try {
      const { data: completedTests } = await this.supabase
        .from('ab_tests')
        .select(
          `
          id,
          name,
          winner_variant_id,
          statistical_significance,
          variants:ab_test_variants(*)
        `,
        )
        .eq('status', 'completed')
        .eq('organization_id', organizationId)
        .contains('metrics', [messageType])
        .gt('statistical_significance', 0.95)
        .order('statistical_significance', { ascending: false });

      if (!completedTests || completedTests.length === 0) {
        return [];
      }

      const recommendations = completedTests.map((test) => {
        const winnerVariant = test.variants.find(
          (v: any) => v.id === test.winner_variant_id,
        );

        return {
          testName: test.name,
          confidence: (test.statistical_significance * 100).toFixed(1),
          template: {
            subject: winnerVariant?.content.subject,
            content: winnerVariant?.content.message,
            channel: winnerVariant?.content.channel,
          },
          performance: {
            conversionRate: winnerVariant?.conversion_rate,
            totalExposures: winnerVariant?.total_exposures,
          },
        };
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting recommended templates:', error);
      return [];
    }
  }
}

export default ABTestingService;
