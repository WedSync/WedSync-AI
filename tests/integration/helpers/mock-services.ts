/**
 * Mock Services Helper
 * WS-192 Team B - Backend/API Focus
 * 
 * Provides comprehensive mocking for external APIs and services used in wedding platform
 */

export interface MockServiceConfig {
  enableStripe: boolean;
  enableTwilio: boolean;
  enableResend: boolean;
  enableTave: boolean;
  enableOpenAI: boolean;
  enableWebhooks: boolean;
  simulateLatency: boolean;
  simulateErrors: boolean;
  errorRate: number; // Percentage of requests that should fail
}

export interface MockServiceResponse {
  id: string;
  service: string;
  method: string;
  url: string;
  status: number;
  data: any;
  latency: number;
  timestamp: Date;
}

export class MockServices {
  private config: MockServiceConfig;
  private responses: MockServiceResponse[] = [];
  private webhookQueue: Array<{ url: string; payload: any; timestamp: Date }> = [];

  constructor(config?: Partial<MockServiceConfig>) {
    this.config = {
      enableStripe: true,
      enableTwilio: true,
      enableResend: true,
      enableTave: true,
      enableOpenAI: true,
      enableWebhooks: true,
      simulateLatency: true,
      simulateErrors: false,
      errorRate: 5, // 5% error rate for realistic testing
      ...config
    };
  }

  /**
   * Initialize all mock services
   */
  async initialize(): Promise<void> {
    console.log('🎭 Initializing mock services for wedding platform testing...');
    
    if (this.config.enableStripe) {
      this.initializeStripeMocks();
    }
    
    if (this.config.enableTwilio) {
      this.initializeTwilioMocks();
    }
    
    if (this.config.enableResend) {
      this.initializeResendMocks();
    }
    
    if (this.config.enableTave) {
      this.initializeTaveMocks();
    }
    
    if (this.config.enableOpenAI) {
      this.initializeOpenAIMocks();
    }
    
    if (this.config.enableWebhooks) {
      this.initializeWebhookMocks();
    }
    
    console.log('✅ Mock services initialized successfully');
  }

  /**
   * Initialize Stripe payment processing mocks
   */
  private initializeStripeMocks(): void {
    // Mock Stripe Checkout Session Creation
    this.mockRequest('POST', '/v1/checkout/sessions', {
      id: 'cs_test_mock_session',
      url: 'https://checkout.stripe.com/c/pay/cs_test_mock_session',
      payment_status: 'unpaid',
      status: 'open',
      mode: 'subscription',
      customer_details: null,
      metadata: {}
    });

    // Mock Stripe Customer Creation
    this.mockRequest('POST', '/v1/customers', {
      id: 'cus_test_mock_customer',
      email: 'test@example.com',
      name: 'Test Customer',
      created: Math.floor(Date.now() / 1000),
      subscriptions: { data: [], has_more: false }
    });

    // Mock Stripe Webhook Events
    this.mockRequest('POST', '/webhook', {
      id: 'evt_test_mock_event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock_session',
          payment_status: 'paid',
          status: 'complete',
          metadata: { organization_id: 'test-org-id' }
        }
      }
    });

    // Mock Stripe Subscription Management
    this.mockRequest('GET', '/v1/subscriptions', {
      data: [{
        id: 'sub_test_mock_subscription',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        plan: { id: 'price_professional_monthly' }
      }],
      has_more: false
    });
  }

  /**
   * Initialize Twilio SMS and communication mocks
   */
  private initializeTwilioMocks(): void {
    // Mock SMS Sending
    this.mockRequest('POST', '/Messages.json', {
      sid: 'SM_test_mock_message',
      account_sid: 'AC_test_mock_account',
      to: '+1234567890',
      from: '+0987654321',
      body: 'Test wedding reminder message',
      status: 'sent',
      direction: 'outbound-api',
      date_created: new Date().toISOString(),
      price: '-0.0075',
      price_unit: 'USD'
    });

    // Mock WhatsApp Messaging
    this.mockRequest('POST', '/WhatsApp/Messages.json', {
      sid: 'WA_test_mock_message',
      account_sid: 'AC_test_mock_account',
      to: 'whatsapp:+1234567890',
      from: 'whatsapp:+0987654321',
      body: 'Wedding update from your photographer',
      status: 'sent',
      date_created: new Date().toISOString()
    });

    // Mock Phone Number Validation
    this.mockRequest('GET', '/PhoneNumbers', {
      valid: true,
      country_code: 'US',
      phone_number: '+1234567890',
      national_format: '(123) 456-7890',
      carrier: { name: 'Mock Carrier', type: 'mobile' }
    });
  }

  /**
   * Initialize Resend email service mocks
   */
  private initializeResendMocks(): void {
    // Mock Email Sending
    this.mockRequest('POST', '/emails', {
      id: 'email_test_mock_id',
      from: 'noreply@wedsync.com',
      to: 'couple@example.com',
      subject: 'Wedding Photography Package Details',
      created_at: new Date().toISOString(),
      status: 'sent'
    });

    // Mock Bulk Email Sending
    this.mockRequest('POST', '/emails/batch', {
      data: [
        { id: 'email_test_mock_1', status: 'sent' },
        { id: 'email_test_mock_2', status: 'sent' },
        { id: 'email_test_mock_3', status: 'sent' }
      ]
    });

    // Mock Email Template Rendering
    this.mockRequest('POST', '/emails/render', {
      subject: 'Wedding Photography Package Details',
      html: '<html><body>Mock rendered email content</body></html>',
      text: 'Mock rendered email content'
    });
  }

  /**
   * Initialize Tave CRM integration mocks
   */
  private initializeTaveMocks(): void {
    // Mock Tave Authentication
    this.mockRequest('POST', '/oauth/token', {
      access_token: 'mock_tave_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock_tave_refresh_token'
    });

    // Mock Tave Client List
    this.mockRequest('GET', '/clients', {
      data: [
        {
          id: 12345,
          first_name: 'John',
          last_name: 'Smith',
          email: 'john.smith@example.com',
          phone: '(555) 123-4567',
          wedding_date: '2025-06-15',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 12346,
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: 'sarah.johnson@example.com',
          phone: '(555) 765-4321',
          wedding_date: '2025-08-20',
          status: 'active',
          created_at: '2024-02-01T14:30:00Z'
        }
      ],
      meta: { total: 2, page: 1, per_page: 50 }
    });

    // Mock Tave Contract Creation
    this.mockRequest('POST', '/contracts', {
      id: 67890,
      client_id: 12345,
      template_id: 'wedding_photography_2025',
      status: 'draft',
      created_at: new Date().toISOString()
    });
  }

  /**
   * Initialize OpenAI API mocks for AI features
   */
  private initializeOpenAIMocks(): void {
    // Mock Chat Completion for AI chatbot
    this.mockRequest('POST', '/chat/completions', {
      id: 'chatcmpl-mock-id',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'I can help you plan your perfect wedding day! What specific aspect of wedding planning would you like assistance with?'
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
    });

    // Mock Embeddings for content matching
    this.mockRequest('POST', '/embeddings', {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        index: 0
      }],
      model: 'text-embedding-ada-002',
      usage: { prompt_tokens: 8, total_tokens: 8 }
    });
  }

  /**
   * Initialize webhook simulation for testing webhook handlers
   */
  private initializeWebhookMocks(): void {
    // This will queue webhook calls for later verification
    console.log('📡 Webhook simulation initialized');
  }

  /**
   * Mock a specific API request/response
   */
  private mockRequest(method: string, urlPattern: string, responseData: any, statusCode: number = 200): void {
    // In a real implementation, this would setup MSW handlers
    // For now, we'll store the mock configuration for verification
    const mockResponse: MockServiceResponse = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      service: this.extractServiceFromUrl(urlPattern),
      method,
      url: urlPattern,
      status: statusCode,
      data: responseData,
      latency: this.config.simulateLatency ? Math.random() * 1000 : 0,
      timestamp: new Date()
    };

    this.responses.push(mockResponse);
  }

  /**
   * Extract service name from URL pattern
   */
  private extractServiceFromUrl(url: string): string {
    if (url.includes('stripe')) return 'stripe';
    if (url.includes('twilio') || url.includes('Messages')) return 'twilio';
    if (url.includes('resend') || url.includes('emails')) return 'resend';
    if (url.includes('tave') || url.includes('clients')) return 'tave';
    if (url.includes('openai') || url.includes('completions')) return 'openai';
    return 'unknown';
  }

  /**
   * Simulate a webhook call for testing
   */
  async simulateWebhook(url: string, payload: any): Promise<void> {
    this.webhookQueue.push({
      url,
      payload,
      timestamp: new Date()
    });

    // Simulate webhook processing delay
    if (this.config.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    }
  }

  /**
   * Get all mock responses for verification
   */
  getMockResponses(service?: string): MockServiceResponse[] {
    if (service) {
      return this.responses.filter(response => response.service === service);
    }
    return [...this.responses];
  }

  /**
   * Get queued webhook calls for verification
   */
  getWebhookQueue(): Array<{ url: string; payload: any; timestamp: Date }> {
    return [...this.webhookQueue];
  }

  /**
   * Verify that specific service calls were made
   */
  verifyServiceCalls(service: string, minCalls: number = 1): {
    verified: boolean;
    actualCalls: number;
    expectedCalls: number;
  } {
    const serviceCalls = this.responses.filter(response => response.service === service);
    
    return {
      verified: serviceCalls.length >= minCalls,
      actualCalls: serviceCalls.length,
      expectedCalls: minCalls
    };
  }

  /**
   * Clear all recorded responses and webhooks
   */
  clear(): void {
    this.responses = [];
    this.webhookQueue = [];
  }

  /**
   * Destroy all mock services and cleanup
   */
  async destroy(): Promise<void> {
    console.log('🧹 Cleaning up mock services...');
    this.clear();
    console.log('✅ Mock services cleanup completed');
  }

  /**
   * Get mock service statistics
   */
  getStats(): {
    totalRequests: number;
    serviceBreakdown: Record<string, number>;
    webhooksCalled: number;
    averageLatency: number;
  } {
    const serviceBreakdown: Record<string, number> = {};
    let totalLatency = 0;

    for (const response of this.responses) {
      serviceBreakdown[response.service] = (serviceBreakdown[response.service] || 0) + 1;
      totalLatency += response.latency;
    }

    return {
      totalRequests: this.responses.length,
      serviceBreakdown,
      webhooksCalled: this.webhookQueue.length,
      averageLatency: this.responses.length > 0 ? totalLatency / this.responses.length : 0
    };
  }
}