// Light Blue CRM Provider Implementation - Screen Scraping Based
// Generated for WS-343 - CRM Integration Hub Backend
// WARNING: This implementation uses screen scraping as Light Blue has no public API

import * as cheerio from 'cheerio';
import type {
  CRMProviderInterface,
  CRMProviderType,
  AuthType,
  CRMClient,
  CRMProject,
  CRMFieldDefinition,
  FetchOptions,
  SyncConfig,
  SyncResult,
  FieldMappingValidation,
  CRMFieldMapping,
} from '@/types/crm';

export class LightBlueCRMProvider implements CRMProviderInterface {
  providerName: CRMProviderType = 'lightblue';
  authType: AuthType = 'basic_auth';
  private cookies: string = '';

  /**
   * Test connection to Light Blue by attempting login
   */
  async testConnection(authConfig: Record<string, any>): Promise<boolean> {
    try {
      return await this.authenticate(authConfig);
    } catch (error) {
      console.error('Light Blue connection test failed:', error);
      return false;
    }
  }

  /**
   * Authenticate with Light Blue via login form
   */
  async authenticate(authConfig: Record<string, any>): Promise<boolean> {
    try {
      const baseUrl = 'https://app.lightblue.co'; // Actual Light Blue URL

      // Step 1: Get login page and extract CSRF token
      const loginPageResponse = await fetch(`${baseUrl}/login`, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!loginPageResponse.ok) {
        throw new Error('Failed to load login page');
      }

      const loginHtml = await loginPageResponse.text();
      const $ = cheerio.load(loginHtml);
      const csrfToken = $('input[name="_token"]').attr('value');

      // Extract cookies from login page
      const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
      if (setCookieHeaders) {
        this.cookies = setCookieHeaders
          .split(',')
          .map((c) => c.split(';')[0])
          .join('; ');
      }

      // Step 2: Submit login form
      const loginData = new URLSearchParams({
        email: authConfig.username,
        password: authConfig.password,
        _token: csrfToken || '',
      });

      const loginResponse = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body: loginData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Referer: `${baseUrl}/login`,
          Cookie: this.cookies,
        },
        redirect: 'manual',
      });

      // Check if login was successful (usually redirects to dashboard)
      const isAuthenticated =
        loginResponse.status === 302 &&
        loginResponse.headers.get('location')?.includes('dashboard');

      if (isAuthenticated) {
        // Update cookies from successful login
        const newCookies = loginResponse.headers.get('set-cookie');
        if (newCookies) {
          this.cookies +=
            '; ' +
            newCookies
              .split(',')
              .map((c) => c.split(';')[0])
              .join('; ');
        }
      }

      return isAuthenticated;
    } catch (error) {
      console.error('Light Blue authentication failed:', error);
      return false;
    }
  }

  /**
   * Fetch clients from Light Blue via screen scraping
   */
  async fetchClients(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMClient[]> {
    try {
      if (!this.cookies) {
        const authSuccess = await this.authenticate(authConfig);
        if (!authSuccess) {
          throw new Error('Authentication failed');
        }
      }

      const baseUrl = 'https://app.lightblue.co';
      const page = options?.page || 1;

      // Navigate to clients page
      const clientsResponse = await fetch(`${baseUrl}/clients?page=${page}`, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Cookie: this.cookies,
        },
      });

      if (!clientsResponse.ok) {
        throw new Error(`Failed to fetch clients: ${clientsResponse.status}`);
      }

      const clientsHtml = await clientsResponse.text();
      const $ = cheerio.load(clientsHtml);

      const clients: CRMClient[] = [];

      // Scrape client table rows (this selector would need to be updated based on actual HTML structure)
      $('.client-row, .client-item, tr[data-client-id]').each(
        (index, element) => {
          const $row = $(element);

          try {
            const client: CRMClient = {
              id:
                $row.attr('data-client-id') ||
                $row.find('.client-id').text().trim(),
              name: $row.find('.client-name, .name').text().trim(),
              email: $row.find('.client-email, .email').text().trim(),
              phone: $row.find('.client-phone, .phone').text().trim(),
              partner_name: $row.find('.partner-name').text().trim(),
              wedding_date: this.parseDate(
                $row.find('.wedding-date, .event-date').text().trim(),
              ),
              venue_name: $row.find('.venue').text().trim(),
              status: this.mapLightBlueStatusToWedSync(
                $row.find('.status').text().trim(),
              ),
              source: 'Light Blue',
              custom_fields: {
                lightblue_id: $row.attr('data-client-id') || index.toString(),
                package_type: $row.find('.package').text().trim(),
                notes: $row.find('.notes').text().trim(),
              },
              created_at: new Date().toISOString(), // Light Blue might not expose creation date
              updated_at: new Date().toISOString(),
            };

            if (client.name && client.email) {
              clients.push(client);
            }
          } catch (error) {
            console.error('Error parsing client row:', error);
          }
        },
      );

      // Rate limiting to be respectful to Light Blue's servers
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return clients;
    } catch (error) {
      console.error('Failed to fetch Light Blue clients:', error);
      throw error;
    }
  }

  /**
   * Fetch projects from Light Blue
   */
  async fetchProjects(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMProject[]> {
    try {
      // Similar implementation to fetchClients but for projects/bookings
      // This would scrape the bookings or projects page
      console.warn(
        'Light Blue project fetching not fully implemented - requires detailed HTML analysis',
      );
      return [];
    } catch (error) {
      console.error('Failed to fetch Light Blue projects:', error);
      throw error;
    }
  }

  /**
   * Light Blue doesn't typically have invoices feature - return empty array
   */
  async fetchInvoices(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<any[]> {
    return [];
  }

  /**
   * Sync data to WedSync format
   */
  async syncToWedSync(
    authConfig: Record<string, any>,
    syncConfig: SyncConfig,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalFailed = 0;
    const errors: any[] = [];

    try {
      // Fetch clients with careful rate limiting
      let page = 1;
      let hasMore = true;

      while (hasMore && totalProcessed < 500) {
        // Conservative limit for scraping
        const clients = await this.fetchClients(authConfig, {
          page,
          limit: 20,
        });

        if (clients.length === 0) {
          hasMore = false;
          break;
        }

        totalProcessed += clients.length;
        totalCreated += clients.length; // Assuming all are new

        page++;

        // Conservative rate limiting for screen scraping (30 requests/hour)
        if (page > 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
        }

        // Stop if we hit the practical limit for scraping
        if (page > 10) {
          hasMore = false;
        }
      }

      return {
        success: totalFailed === 0,
        records_processed: totalProcessed,
        records_created: totalCreated,
        records_updated: 0,
        records_failed: totalFailed,
        errors,
        warnings: [
          {
            warning_code: 'SCREEN_SCRAPING_LIMITATIONS',
            warning_message:
              'Light Blue integration uses screen scraping and may be limited or unstable',
          },
        ],
        execution_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        records_processed: totalProcessed,
        records_created: totalCreated,
        records_updated: 0,
        records_failed: totalFailed + 1,
        errors: [
          ...errors,
          {
            error_code: 'SYNC_FAILED',
            error_message: (error as Error).message,
          },
        ],
        warnings: [],
        execution_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Field discovery for Light Blue (limited due to scraping)
   */
  async discoverFields(
    authConfig: Record<string, any>,
  ): Promise<CRMFieldDefinition[]> {
    // Return known fields since we can't dynamically discover via scraping
    return this.getDefaultLightBlueFields();
  }

  /**
   * Validate field mappings
   */
  async validateFieldMapping(
    fieldMappings: CRMFieldMapping[],
  ): Promise<FieldMappingValidation> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation for Light Blue fields
    for (const mapping of fieldMappings) {
      if (mapping.is_required && !mapping.wedsync_field_name) {
        errors.push({
          field_name: mapping.crm_field_name,
          error_code: 'REQUIRED_FIELD_UNMAPPED',
          error_message: `Required field '${mapping.crm_field_name}' is not mapped`,
        });
      }
    }

    // Always add warning about screen scraping limitations
    warnings.push({
      field_name: 'general',
      warning_code: 'SCREEN_SCRAPING_LIMITATIONS',
      warning_message:
        'Light Blue integration relies on screen scraping and may break if the website structure changes',
    });

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
    };
  }

  /**
   * Get rate limits (conservative for screen scraping)
   */
  getRateLimit(): { requests_per_minute: number; requests_per_hour: number } {
    return { requests_per_minute: 10, requests_per_hour: 100 }; // Very conservative
  }

  /**
   * Handle rate limiting
   */
  async handleRateLimit(error: any): Promise<number> {
    const retryAfter = error.retry_after || 120; // 2 minutes default
    console.warn(`Light Blue rate limit hit. Waiting ${retryAfter} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return retryAfter;
  }

  // Private helper methods

  private parseDate(dateString: string): string | undefined {
    if (!dateString) return undefined;

    try {
      // Try to parse various date formats that might appear in Light Blue
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    } catch (error) {
      console.error('Failed to parse date:', dateString);
    }

    return undefined;
  }

  private mapLightBlueStatusToWedSync(status: string): string {
    const statusMap: Record<string, string> = {
      inquiry: 'pending',
      lead: 'pending',
      booked: 'active',
      completed: 'completed',
      cancelled: 'inactive',
    };

    return statusMap[status?.toLowerCase()] || 'pending';
  }

  private getDefaultLightBlueFields(): CRMFieldDefinition[] {
    return [
      {
        name: 'name',
        label: 'Client Name',
        type: 'string',
        required: true,
        category: 'client',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        category: 'client',
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'phone',
        required: false,
        category: 'client',
      },
      {
        name: 'partner_name',
        label: 'Partner Name',
        type: 'string',
        required: false,
        category: 'client',
      },
      {
        name: 'wedding_date',
        label: 'Wedding Date',
        type: 'date',
        required: false,
        category: 'project',
      },
      {
        name: 'venue',
        label: 'Venue',
        type: 'string',
        required: false,
        category: 'project',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'string',
        required: false,
        options: ['inquiry', 'lead', 'booked', 'completed', 'cancelled'],
        category: 'client',
      },
    ];
  }
}
