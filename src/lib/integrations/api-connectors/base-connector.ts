// src/lib/integrations/api-connectors/base-connector.ts
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export interface APIConnectorConfig {
  baseURL: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
  };
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export abstract class BaseAPIConnector {
  protected config: APIConnectorConfig;
  protected rateLimitTracker: Map<string, number> = new Map();

  constructor(config: APIConnectorConfig) {
    this.config = config;
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>,
  ): Promise<APIResponse<T>> {
    try {
      // Check rate limits
      const rateLimitKey = `${this.config.baseURL}_${method}_${endpoint}`;
      if (await this.isRateLimited(rateLimitKey)) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'API rate limit exceeded',
          },
        };
      }

      // Make HTTP request with retry logic
      const response = await this.executeWithRetry(async () => {
        const url = `${this.config.baseURL}${endpoint}`;
        const requestOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        };

        if (data && method !== 'GET') {
          requestOptions.body = JSON.stringify(data);
        }

        return fetch(url, requestOptions);
      });

      // Track rate limiting
      await this.trackRateLimit(rateLimitKey, response);

      // Parse response
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.message || 'API request failed',
            details: responseData,
          },
        };
      }

      return {
        success: true,
        data: responseData,
        rateLimit: this.parseRateLimitHeaders(response),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.config.retryConfig.maxRetries) {
        throw error;
      }

      const delay =
        this.config.retryConfig.backoffStrategy === 'exponential'
          ? this.config.retryConfig.initialDelay * Math.pow(2, attempt - 1)
          : this.config.retryConfig.initialDelay * attempt;

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  private async isRateLimited(key: string): Promise<boolean> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const requests = this.rateLimitTracker.get(`${key}_${currentMinute}`) || 0;
    return requests >= this.config.rateLimits.requestsPerMinute;
  }

  private async trackRateLimit(key: string, response: Response): Promise<void> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const minuteKey = `${key}_${currentMinute}`;
    const currentCount = this.rateLimitTracker.get(minuteKey) || 0;
    this.rateLimitTracker.set(minuteKey, currentCount + 1);

    // Clean up old entries
    for (const [trackerKey] of this.rateLimitTracker) {
      const keyMinute = parseInt(trackerKey.split('_').pop() || '0');
      if (keyMinute < currentMinute - 60) {
        // Keep last hour
        this.rateLimitTracker.delete(trackerKey);
      }
    }
  }

  private parseRateLimitHeaders(
    response: Response,
  ): { remaining: number; resetTime: Date } | undefined {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining && reset) {
      return {
        remaining: parseInt(remaining, 10),
        resetTime: new Date(parseInt(reset, 10) * 1000),
      };
    }
  }
}

// Wedding industry specific connector interfaces
export interface WeddingVendorData {
  id: string;
  name: string;
  type:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'videographer'
    | 'planner';
  contact: {
    email: string;
    phone?: string;
    address?: string;
  };
  services: string[];
  pricing?: {
    basePrice: number;
    currency: string;
    packages: any[];
  };
  availability?: {
    availableDates: string[];
    blackoutDates: string[];
  };
  metadata?: Record<string, any>;
}

export interface WeddingBookingData {
  id: string;
  vendor_id: string;
  couple_names: string[];
  wedding_date: string;
  venue?: string;
  service_type: string;
  booking_status:
    | 'inquiry'
    | 'booked'
    | 'confirmed'
    | 'completed'
    | 'cancelled';
  amount?: number;
  currency?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WeddingFormData {
  id: string;
  form_name: string;
  vendor_id: string;
  couple_id: string;
  responses: Record<string, any>;
  submitted_at: string;
  form_type:
    | 'inquiry'
    | 'consultation'
    | 'contract'
    | 'questionnaire'
    | 'feedback';
}

// Specific connector implementations
export class ZapierConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super({
      baseURL: 'https://hooks.zapier.com/hooks/catch',
      apiKey,
      rateLimits: {
        requestsPerMinute: 300,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.config.apiKey || '',
    };
  }

  async triggerZap(
    zapId: string,
    data: Record<string, any>,
  ): Promise<APIResponse<any>> {
    return this.makeRequest(`/${zapId}`, 'POST', data);
  }

  async triggerWeddingBooking(
    zapId: string,
    bookingData: WeddingBookingData,
  ): Promise<APIResponse<any>> {
    const zapData = {
      event_type: 'wedding_booking',
      vendor_name: bookingData.vendor_id,
      couple_names: bookingData.couple_names.join(' & '),
      wedding_date: bookingData.wedding_date,
      venue: bookingData.venue,
      service_type: bookingData.service_type,
      booking_status: bookingData.booking_status,
      amount: bookingData.amount,
      currency: bookingData.currency,
      timestamp: new Date().toISOString(),
    };

    return this.triggerZap(zapId, zapData);
  }

  async triggerFormSubmission(
    zapId: string,
    formData: WeddingFormData,
  ): Promise<APIResponse<any>> {
    const zapData = {
      event_type: 'form_submission',
      form_name: formData.form_name,
      form_type: formData.form_type,
      vendor_id: formData.vendor_id,
      couple_id: formData.couple_id,
      responses: formData.responses,
      submitted_at: formData.submitted_at,
      timestamp: new Date().toISOString(),
    };

    return this.triggerZap(zapId, zapData);
  }
}

export class StripeConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super({
      baseURL: 'https://api.stripe.com/v1',
      apiKey,
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 500,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  async createWeddingPaymentIntent(
    amount: number,
    currency: string,
    weddingData: Partial<WeddingBookingData>,
  ): Promise<APIResponse<any>> {
    const metadata = {
      vendor_id: weddingData.vendor_id || '',
      wedding_date: weddingData.wedding_date || '',
      couple_names: weddingData.couple_names?.join(' & ') || '',
      service_type: weddingData.service_type || '',
      venue: weddingData.venue || '',
    };

    return this.makeRequest('/payment_intents', 'POST', {
      amount,
      currency,
      metadata,
    });
  }

  async retrieveCustomer(customerId: string): Promise<APIResponse<any>> {
    return this.makeRequest(`/customers/${customerId}`);
  }

  async createCustomerForVendor(
    vendorData: WeddingVendorData,
  ): Promise<APIResponse<any>> {
    return this.makeRequest('/customers', 'POST', {
      email: vendorData.contact.email,
      name: vendorData.name,
      phone: vendorData.contact.phone,
      metadata: {
        vendor_id: vendorData.id,
        vendor_type: vendorData.type,
      },
    });
  }
}

export class CalendlyConnector extends BaseAPIConnector {
  constructor(accessToken: string) {
    super({
      baseURL: 'https://api.calendly.com',
      apiKey: accessToken,
      rateLimits: {
        requestsPerMinute: 50,
        requestsPerHour: 300,
        requestsPerDay: 2000,
      },
      timeout: 15000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  async getUser(): Promise<APIResponse<any>> {
    return this.makeRequest('/users/me');
  }

  async listEventTypes(): Promise<APIResponse<any>> {
    const userResponse = await this.getUser();
    if (!userResponse.success) return userResponse;

    const userUri = userResponse.data.resource.uri;
    return this.makeRequest(`/event_types?user=${userUri}`);
  }

  async getWeddingConsultations(
    startTime: string,
    endTime: string,
  ): Promise<APIResponse<any>> {
    return this.makeRequest(
      `/scheduled_events?min_start_time=${startTime}&max_start_time=${endTime}`,
    );
  }

  async createWebhookSubscription(
    url: string,
    events: string[],
    organization: string,
  ): Promise<APIResponse<any>> {
    return this.makeRequest('/webhook_subscriptions', 'POST', {
      url,
      events,
      organization,
      scope: 'organization',
    });
  }
}

export class MailchimpConnector extends BaseAPIConnector {
  constructor(apiKey: string, server: string) {
    super({
      baseURL: `https://${server}.api.mailchimp.com/3.0`,
      apiKey,
      rateLimits: {
        requestsPerMinute: 120,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `apikey ${this.config.apiKey}`,
    };
  }

  async createWeddingCoupleList(
    listName: string,
    weddingDate: string,
  ): Promise<APIResponse<any>> {
    return this.makeRequest('/lists', 'POST', {
      name: listName,
      contact: {
        company: 'WedSync',
        address1: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
      },
      permission_reminder: `You're receiving this because you're planning your wedding on ${weddingDate}`,
      campaign_defaults: {
        from_name: 'Wedding Team',
        from_email: 'weddings@wedsync.com',
        subject: 'Your Wedding Updates',
        language: 'EN_US',
      },
      email_type_option: true,
    });
  }

  async addCoupleToList(
    listId: string,
    coupleEmails: string[],
    weddingData: Partial<WeddingBookingData>,
  ): Promise<APIResponse<any>> {
    const members = coupleEmails.map((email) => ({
      email_address: email,
      status: 'subscribed' as const,
      merge_fields: {
        FNAME: weddingData.couple_names?.[0]?.split(' ')[0] || '',
        LNAME: weddingData.couple_names?.[0]?.split(' ')[1] || '',
        WDATE: weddingData.wedding_date || '',
        VENUE: weddingData.venue || '',
      },
    }));

    return this.makeRequest(`/lists/${listId}/members`, 'POST', {
      members,
      update_existing: true,
    });
  }

  async createWeddingCampaign(
    listId: string,
    subject: string,
    content: string,
  ): Promise<APIResponse<any>> {
    return this.makeRequest('/campaigns', 'POST', {
      type: 'regular',
      recipients: {
        list_id: listId,
      },
      settings: {
        subject_line: subject,
        from_name: 'Wedding Team',
        reply_to: 'weddings@wedsync.com',
      },
    });
  }
}

// Connector factory for dynamic instantiation
export class ConnectorFactory {
  private static connectors: Map<string, any> = new Map();

  static async getConnector(
    type: 'zapier' | 'stripe' | 'calendly' | 'mailchimp',
    credentials?: Record<string, string>,
  ): Promise<BaseAPIConnector> {
    const key = `${type}_${JSON.stringify(credentials)}`;

    if (this.connectors.has(key)) {
      return this.connectors.get(key);
    }

    let connector: BaseAPIConnector;

    switch (type) {
      case 'zapier':
        if (!credentials?.apiKey) throw new Error('Zapier API key required');
        connector = new ZapierConnector(credentials.apiKey);
        break;
      case 'stripe':
        if (!credentials?.apiKey) throw new Error('Stripe API key required');
        connector = new StripeConnector(credentials.apiKey);
        break;
      case 'calendly':
        if (!credentials?.accessToken)
          throw new Error('Calendly access token required');
        connector = new CalendlyConnector(credentials.accessToken);
        break;
      case 'mailchimp':
        if (!credentials?.apiKey || !credentials?.server) {
          throw new Error('Mailchimp API key and server required');
        }
        connector = new MailchimpConnector(
          credentials.apiKey,
          credentials.server,
        );
        break;
      default:
        throw new Error(`Unsupported connector type: ${type}`);
    }

    this.connectors.set(key, connector);
    return connector;
  }

  static async getVendorConnectors(
    vendorId: string,
  ): Promise<Record<string, BaseAPIConnector>> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: integrations } = await supabase
      .from('vendor_integrations')
      .select('integration_type, credentials, active')
      .eq('vendor_id', vendorId)
      .eq('active', true);

    const connectors: Record<string, BaseAPIConnector> = {};

    for (const integration of integrations || []) {
      try {
        const connector = await this.getConnector(
          integration.integration_type,
          integration.credentials,
        );
        connectors[integration.integration_type] = connector;
      } catch (error) {
        console.error(
          `Failed to create ${integration.integration_type} connector:`,
          error,
        );
      }
    }

    return connectors;
  }
}
