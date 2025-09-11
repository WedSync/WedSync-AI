import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface MicrosoftGraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {
      street: string;
      city: string;
      state: string;
      countryOrRegion: string;
      postalCode: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response:
        | 'none'
        | 'organizer'
        | 'tentativelyAccepted'
        | 'accepted'
        | 'declined';
      time: string;
    };
  }>;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  categories?: string[];
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
}

export interface WeddingEventMapping {
  weddingId: string;
  eventType:
    | 'consultation'
    | 'engagement'
    | 'ceremony'
    | 'reception'
    | 'delivery'
    | 'followup';
  clientNames: string[];
  vendorType: string;
  eventDate: string;
  priority: 'high' | 'medium' | 'low';
  isWeddingDay: boolean;
}

interface GraphApiError {
  error: {
    code: string;
    message: string;
    innerError?: {
      'request-id': string;
      date: string;
    };
  };
}

export class MicrosoftGraphClient {
  private config: MicrosoftGraphConfig;
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private authUrl = 'https://login.microsoftonline.com';
  private supabase;
  private encryptionKey: string;

  constructor(config: MicrosoftGraphConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
  }

  /**
   * OAuth2 Authorization Flow
   */
  public generateAuthorizationUrl(state: string, userId: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: `${state}:${userId}`,
      response_mode: 'query',
      prompt: 'consent',
    });

    return `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  public async exchangeCodeForTokens(
    code: string,
    userId: string,
  ): Promise<TokenResponse> {
    try {
      const tokenEndpoint = `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        scope: this.config.scopes.join(' '),
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Token exchange failed: ${error.error_description || error.error}`,
        );
      }

      const tokens: TokenResponse = await response.json();
      tokens.expires_at = new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString();

      // Store encrypted tokens
      await this.storeTokens(userId, tokens);

      return tokens;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }

  public async refreshToken(userId: string): Promise<TokenResponse> {
    try {
      const storedTokens = await this.getStoredTokens(userId);
      if (!storedTokens || !storedTokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      const tokenEndpoint = `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: storedTokens.refresh_token,
        grant_type: 'refresh_token',
        scope: this.config.scopes.join(' '),
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Token refresh failed: ${error.error_description || error.error}`,
        );
      }

      const tokens: TokenResponse = await response.json();
      tokens.expires_at = new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString();

      // Store new encrypted tokens
      await this.storeTokens(userId, tokens);

      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Secure Token Storage with Encryption
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async storeTokens(
    userId: string,
    tokens: TokenResponse,
  ): Promise<void> {
    try {
      const encryptedData = this.encrypt(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type,
          scope: tokens.scope,
        }),
      );

      await this.supabase.from('integration_tokens').upsert({
        user_id: userId,
        integration_type: 'microsoft-outlook',
        encrypted_tokens: encryptedData,
        expires_at: tokens.expires_at,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  private async getStoredTokens(userId: string): Promise<TokenResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('integration_tokens')
        .select('encrypted_tokens, expires_at')
        .eq('user_id', userId)
        .eq('integration_type', 'microsoft-outlook')
        .single();

      if (error || !data) {
        return null;
      }

      const decryptedData = JSON.parse(this.decrypt(data.encrypted_tokens));

      // Check if token is expired
      if (new Date() > new Date(data.expires_at)) {
        return await this.refreshToken(userId);
      }

      return decryptedData;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Calendar Operations
   */
  public async getCalendars(userId: string): Promise<any[]> {
    try {
      const tokens = await this.ensureValidToken(userId);

      const response = await this.makeGraphApiRequest(
        '/me/calendars',
        'GET',
        tokens.access_token,
      );

      return response.value || [];
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw error;
    }
  }

  public async getEvents(
    userId: string,
    calendarId: string = 'primary',
    options: {
      startTime?: string;
      endTime?: string;
      top?: number;
      filter?: string;
    } = {},
  ): Promise<CalendarEvent[]> {
    try {
      const tokens = await this.ensureValidToken(userId);

      let endpoint =
        calendarId === 'primary'
          ? '/me/events'
          : `/me/calendars/${calendarId}/events`;

      const params = new URLSearchParams();
      if (options.startTime && options.endTime) {
        params.append(
          '$filter',
          `start/dateTime ge '${options.startTime}' and end/dateTime le '${options.endTime}'`,
        );
      }
      if (options.top) {
        params.append('$top', options.top.toString());
      }
      if (options.filter) {
        params.append('$filter', options.filter);
      }
      params.append('$orderby', 'start/dateTime');

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await this.makeGraphApiRequest(
        endpoint,
        'GET',
        tokens.access_token,
      );

      return response.value || [];
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  public async createEvent(
    userId: string,
    eventData: Partial<CalendarEvent>,
    calendarId: string = 'primary',
  ): Promise<CalendarEvent> {
    try {
      const tokens = await this.ensureValidToken(userId);

      // Add wedding-specific categorization
      const enhancedEventData = this.enhanceEventWithWeddingContext(eventData);

      const endpoint =
        calendarId === 'primary'
          ? '/me/events'
          : `/me/calendars/${calendarId}/events`;

      const response = await this.makeGraphApiRequest(
        endpoint,
        'POST',
        tokens.access_token,
        enhancedEventData,
      );

      return response;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  public async updateEvent(
    userId: string,
    eventId: string,
    eventData: Partial<CalendarEvent>,
    calendarId: string = 'primary',
  ): Promise<CalendarEvent> {
    try {
      const tokens = await this.ensureValidToken(userId);

      const enhancedEventData = this.enhanceEventWithWeddingContext(eventData);

      const endpoint =
        calendarId === 'primary'
          ? `/me/events/${eventId}`
          : `/me/calendars/${calendarId}/events/${eventId}`;

      const response = await this.makeGraphApiRequest(
        endpoint,
        'PATCH',
        tokens.access_token,
        enhancedEventData,
      );

      return response;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  public async deleteEvent(
    userId: string,
    eventId: string,
    calendarId: string = 'primary',
  ): Promise<void> {
    try {
      const tokens = await this.ensureValidToken(userId);

      const endpoint =
        calendarId === 'primary'
          ? `/me/events/${eventId}`
          : `/me/calendars/${calendarId}/events/${eventId}`;

      await this.makeGraphApiRequest(endpoint, 'DELETE', tokens.access_token);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Wedding-Specific Event Enhancement
   */
  private enhanceEventWithWeddingContext(
    eventData: Partial<CalendarEvent>,
  ): Partial<CalendarEvent> {
    const enhanced = { ...eventData };

    // Add wedding-specific categories
    if (!enhanced.categories) {
      enhanced.categories = [];
    }

    // Detect wedding-related keywords and categorize
    const subject = enhanced.subject?.toLowerCase() || '';
    const body = enhanced.body?.content?.toLowerCase() || '';

    if (this.isWeddingRelated(subject + ' ' + body)) {
      enhanced.categories.push('Wedding Business');

      // Set high importance for wedding events
      if (this.isWeddingDay(subject + ' ' + body)) {
        enhanced.showAs = 'busy';
        enhanced.sensitivity = 'private';
        enhanced.isReminderOn = true;
        enhanced.reminderMinutesBeforeStart = 60; // 1 hour reminder
      }
    }

    return enhanced;
  }

  private isWeddingRelated(text: string): boolean {
    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'engagement',
      'bridal',
      'honeymoon',
      'anniversary',
      'venue',
      'catering',
      'florist',
      'photographer',
      'videographer',
      'dj',
      'band',
      'cake',
      'dress',
      'tuxedo',
      'bouquet',
      'centerpiece',
      'invitation',
    ];

    return weddingKeywords.some((keyword) => text.includes(keyword));
  }

  private isWeddingDay(text: string): boolean {
    const weddingDayKeywords = [
      'wedding day',
      'ceremony',
      'reception',
      'wedding ceremony',
      'wedding reception',
      'getting ready',
      'first look',
      'processional',
    ];

    return weddingDayKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * API Request Helper with Rate Limit Handling
   */
  private async makeGraphApiRequest(
    endpoint: string,
    method: string,
    accessToken: string,
    body?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(
            response.headers.get('Retry-After') || '60',
          );

          if (attempts < maxAttempts - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000),
            );
            attempts++;
            continue;
          }
        }

        if (!response.ok) {
          const errorData: GraphApiError = await response
            .json()
            .catch(() => ({}));
          throw new Error(
            `Microsoft Graph API error: ${response.status} - ${
              errorData.error?.message || response.statusText
            }`,
          );
        }

        // For DELETE requests, there might not be a response body
        if (method === 'DELETE' && response.status === 204) {
          return null;
        }

        return await response.json();
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }
  }

  private async ensureValidToken(userId: string): Promise<TokenResponse> {
    let tokens = await this.getStoredTokens(userId);

    if (!tokens) {
      throw new Error(
        'No authentication tokens found. Please reconnect your Microsoft account.',
      );
    }

    // Check if token expires soon (within 5 minutes)
    const expiresAt = new Date(tokens.expires_at || 0);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      tokens = await this.refreshToken(userId);
    }

    return tokens;
  }

  /**
   * Health Check and Connection Status
   */
  public async checkConnection(userId: string): Promise<{
    connected: boolean;
    error?: string;
    userInfo?: any;
  }> {
    try {
      const tokens = await this.getStoredTokens(userId);

      if (!tokens) {
        return {
          connected: false,
          error: 'No authentication tokens found',
        };
      }

      // Test connection by fetching user profile
      const response = await this.makeGraphApiRequest(
        '/me',
        'GET',
        tokens.access_token,
      );

      return {
        connected: true,
        userInfo: {
          displayName: response.displayName,
          mail: response.mail || response.userPrincipalName,
          id: response.id,
        },
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
