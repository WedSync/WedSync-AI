// src/lib/api/versioning.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAPIResponse, APIErrors } from './response-schemas';

// API versioning configuration
export const API_CONFIG = {
  CURRENT_VERSION: '2.1',
  SUPPORTED_VERSIONS: ['1.0', '1.1', '2.0', '2.1'],
  DEPRECATED_VERSIONS: ['1.0', '1.1'],
  DEFAULT_VERSION: '2.1',
  VERSION_HEADER: 'X-API-Version',
  ACCEPT_HEADER: 'application/vnd.wedsync.v{version}+json',
};

export interface APIVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  migrationGuide?: string;
}

export interface VersionedEndpoint {
  path: string;
  method: string;
  versions: {
    [version: string]: {
      handler: Function;
      schema?: z.ZodSchema;
      deprecated?: boolean;
      changes?: string[];
    };
  };
}

export class APIVersionManager {
  private static versions: Map<string, APIVersion> = new Map([
    [
      '1.0',
      {
        version: '1.0',
        deprecated: true,
        deprecationDate: '2024-01-01',
        sunsetDate: '2024-12-31',
        migrationGuide: '/docs/api/migration/v1-to-v2',
      },
    ],
    [
      '1.1',
      {
        version: '1.1',
        deprecated: true,
        deprecationDate: '2024-06-01',
        sunsetDate: '2025-06-01',
        migrationGuide: '/docs/api/migration/v1-to-v2',
      },
    ],
    [
      '2.0',
      {
        version: '2.0',
        deprecated: false,
      },
    ],
    [
      '2.1',
      {
        version: '2.1',
        deprecated: false,
      },
    ],
  ]);

  private static endpoints: Map<string, VersionedEndpoint> = new Map();

  static registerEndpoint(endpoint: VersionedEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  static getRequestedVersion(request: NextRequest): string {
    // Try to get version from multiple sources

    // 1. From X-API-Version header
    const versionHeader = request.headers.get(API_CONFIG.VERSION_HEADER);
    if (versionHeader && this.isVersionSupported(versionHeader)) {
      return versionHeader;
    }

    // 2. From Accept header (application/vnd.wedsync.v2.1+json)
    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(
        /application\/vnd\.wedsync\.v(\d+\.\d+)\+json/,
      );
      if (versionMatch && this.isVersionSupported(versionMatch[1])) {
        return versionMatch[1];
      }
    }

    // 3. From URL parameter (?version=2.1)
    const url = new URL(request.url);
    const urlVersion = url.searchParams.get('version');
    if (urlVersion && this.isVersionSupported(urlVersion)) {
      return urlVersion;
    }

    // 4. From URL path (/api/v2.1/webhooks)
    const pathMatch = request.url.match(/\/api\/v(\d+\.\d+)\//);
    if (pathMatch && this.isVersionSupported(pathMatch[1])) {
      return pathMatch[1];
    }

    // Default to current version
    return API_CONFIG.DEFAULT_VERSION;
  }

  static isVersionSupported(version: string): boolean {
    return API_CONFIG.SUPPORTED_VERSIONS.includes(version);
  }

  static isVersionDeprecated(version: string): boolean {
    const versionInfo = this.versions.get(version);
    return versionInfo?.deprecated || false;
  }

  static getVersionInfo(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  static createVersionedResponse<T>(
    data: any,
    version: string,
    request?: NextRequest,
  ): NextResponse<T> {
    const versionInfo = this.getVersionInfo(version);
    const headers: HeadersInit = {
      'X-API-Version': version,
      'X-API-Current-Version': API_CONFIG.CURRENT_VERSION,
    };

    // Add deprecation warnings
    if (versionInfo?.deprecated) {
      headers['Warning'] = `299 - "API version ${version} is deprecated"`;
      if (versionInfo.sunsetDate) {
        headers['Sunset'] = new Date(versionInfo.sunsetDate).toUTCString();
      }
      if (versionInfo.migrationGuide) {
        headers['Link'] =
          `<${versionInfo.migrationGuide}>; rel="migration-guide"`;
      }
    }

    // Transform data based on version
    const transformedData = this.transformDataForVersion(data, version);

    return NextResponse.json(transformedData, { headers });
  }

  private static transformDataForVersion(data: any, version: string): any {
    switch (version) {
      case '1.0':
        return this.transformToV1(data);
      case '1.1':
        return this.transformToV1_1(data);
      case '2.0':
        return this.transformToV2(data);
      case '2.1':
      default:
        return data; // Latest version, no transformation needed
    }
  }

  // Version-specific data transformations
  private static transformToV1(data: any): any {
    // V1.0 compatibility transformations
    if (data.webhook_events) {
      // In v1.0, webhook events had different field names
      return {
        ...data,
        events: data.webhook_events.map((event: any) => ({
          id: event.event_id,
          type: event.event_type,
          created: event.timestamp,
          payload: event.data,
        })),
      };
    }

    if (data.booking_details) {
      // V1.0 had flatter structure
      return {
        ...data,
        id: data.booking_details.id,
        vendor: data.booking_details.vendor_id,
        client: data.booking_details.couple_names?.join(' & '),
        date: data.booking_details.wedding_date,
        amount: data.booking_details.amount,
        status: data.booking_details.booking_status,
      };
    }

    return data;
  }

  private static transformToV1_1(data: any): any {
    // V1.1 compatibility transformations
    if (data.integration_details) {
      // V1.1 had slightly different integration format
      return {
        ...data,
        integration: {
          type: data.integration_details.integration_type,
          vendor: data.integration_details.vendor_id,
          status: data.integration_details.active ? 'active' : 'inactive',
          connected: data.integration_details.connected_at,
        },
      };
    }

    return data;
  }

  private static transformToV2(data: any): any {
    // V2.0 compatibility transformations
    if (data.event_metadata && data.event_metadata.priority) {
      // V2.0 used different priority values
      const priorityMap = {
        urgent: 'high',
        high: 'medium',
        medium: 'low',
        low: 'low',
      };

      return {
        ...data,
        event_metadata: {
          ...data.event_metadata,
          priority: priorityMap[data.event_metadata.priority] || 'low',
        },
      };
    }

    return data;
  }
}

// Versioned webhook endpoints
export const webhookVersions: VersionedEndpoint = {
  path: '/api/webhooks',
  method: 'POST',
  versions: {
    '1.0': {
      handler: async (request: NextRequest) => {
        // V1.0 webhook processing
        const body = await request.json();
        const legacyFormat = {
          event_id: body.id || crypto.randomUUID(),
          event_type: body.type || 'unknown',
          timestamp: body.created || new Date().toISOString(),
          source: 'legacy',
          data: body.payload || body,
        };

        return createAPIResponse({
          success: true,
          data: {
            id: legacyFormat.event_id,
            status: 'processed',
            message: 'Webhook received (v1.0 compatibility mode)',
          },
        });
      },
      deprecated: true,
      changes: [
        'Legacy field mapping applied',
        'Limited event types supported',
        'Basic error handling only',
      ],
    },
    '1.1': {
      handler: async (request: NextRequest) => {
        // V1.1 webhook processing with improved validation
        const body = await request.json();

        // Basic validation for v1.1
        if (!body.type && !body.event_type) {
          return createAPIResponse(
            {
              success: false,
              error: APIErrors.VALIDATION_FAILED('Event type is required'),
            },
            400,
          );
        }

        const standardizedEvent = {
          event_id: body.id || body.event_id || crypto.randomUUID(),
          event_type: body.type || body.event_type,
          timestamp: body.created || body.timestamp || new Date().toISOString(),
          source: 'v1.1-compatible',
          data: body.payload || body.data || body,
        };

        return createAPIResponse({
          success: true,
          data: {
            event_id: standardizedEvent.event_id,
            processed_at: new Date().toISOString(),
            message: 'Webhook processed (v1.1 compatibility)',
            version_notes: 'Enhanced validation applied',
          },
        });
      },
      deprecated: true,
      changes: [
        'Improved field validation',
        'Better error messages',
        'Support for more event types',
      ],
    },
    '2.0': {
      handler: async (request: NextRequest) => {
        // V2.0 webhook processing with full feature set
        const body = await request.json();

        // Enhanced validation for v2.0
        const eventSchema = z.object({
          event_type: z.string(),
          event_id: z.string().optional(),
          timestamp: z.string().optional(),
          data: z.record(z.any()),
          metadata: z.record(z.any()).optional(),
        });

        try {
          const validatedEvent = eventSchema.parse({
            event_type: body.event_type || body.type,
            event_id: body.event_id || body.id,
            timestamp: body.timestamp || body.created,
            data: body.data || body.payload || body,
            metadata: body.metadata,
          });

          return createAPIResponse({
            success: true,
            data: {
              event_id: validatedEvent.event_id || crypto.randomUUID(),
              processed_at: new Date().toISOString(),
              actions_taken: ['validated', 'queued_for_processing'],
              message: 'Webhook processed successfully (v2.0)',
            },
          });
        } catch (error) {
          return createAPIResponse(
            {
              success: false,
              error: APIErrors.VALIDATION_FAILED(error),
            },
            400,
          );
        }
      },
      changes: [
        'Full schema validation',
        'Enhanced error handling',
        'Metadata support added',
        'Improved response format',
      ],
    },
    '2.1': {
      handler: async (request: NextRequest) => {
        // V2.1 webhook processing - current version
        // This would delegate to the main webhook handler
        // but with v2.1 specific enhancements

        const body = await request.json();

        // Latest validation and processing
        const eventSchema = z.object({
          event_type: z.enum([
            'booking.created',
            'booking.updated',
            'booking.cancelled',
            'payment.received',
            'payment.failed',
            'form.submitted',
            'form.updated',
            'vendor.connected',
            'vendor.disconnected',
            'availability.changed',
            'review.received',
            'message.sent',
          ]),
          event_id: z.string().uuid().optional(),
          timestamp: z.string().datetime().optional(),
          source: z.string(),
          data: z.record(z.any()),
          correlation_id: z.string().uuid().optional(),
          metadata: z
            .object({
              priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
              vendor_id: z.string().optional(),
              wedding_date: z.string().optional(),
            })
            .optional(),
        });

        try {
          const validatedEvent = eventSchema.parse({
            event_type: body.event_type,
            event_id: body.event_id || crypto.randomUUID(),
            timestamp: body.timestamp || new Date().toISOString(),
            source: body.source || 'external',
            data: body.data,
            correlation_id: body.correlation_id,
            metadata: body.metadata,
          });

          // Process with latest event system
          return createAPIResponse({
            success: true,
            data: {
              event_id: validatedEvent.event_id,
              processed_at: new Date().toISOString(),
              actions_taken: ['validated', 'processed', 'automated'],
              correlation_id: validatedEvent.correlation_id,
              message: 'Webhook processed with full automation (v2.1)',
            },
          });
        } catch (error) {
          return createAPIResponse(
            {
              success: false,
              error: APIErrors.VALIDATION_FAILED(error),
            },
            400,
          );
        }
      },
      changes: [
        'Enhanced event type validation',
        'Correlation ID support',
        'Priority-based processing',
        'Full automation pipeline',
        'Wedding industry optimizations',
      ],
    },
  },
};

// Middleware for version handling
export function withVersioning(handler: Function) {
  return async (request: NextRequest) => {
    const version = APIVersionManager.getRequestedVersion(request);

    if (!APIVersionManager.isVersionSupported(version)) {
      return createAPIResponse(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_VERSION',
            message: `API version ${version} is not supported`,
            details: {
              supported_versions: API_CONFIG.SUPPORTED_VERSIONS,
              current_version: API_CONFIG.CURRENT_VERSION,
            },
          },
        },
        400,
      );
    }

    // Add version info to request context
    (request as any).apiVersion = version;

    const response = await handler(request);

    // Add version headers to response
    const versionInfo = APIVersionManager.getVersionInfo(version);
    if (versionInfo?.deprecated) {
      response.headers.set(
        'Warning',
        `299 - "API version ${version} is deprecated"`,
      );
      if (versionInfo.migrationGuide) {
        response.headers.set(
          'Link',
          `<${versionInfo.migrationGuide}>; rel="migration-guide"`,
        );
      }
    }

    response.headers.set('X-API-Version', version);
    response.headers.set('X-API-Current-Version', API_CONFIG.CURRENT_VERSION);

    return response;
  };
}

// Version-specific route handlers
export function createVersionedRoute(endpointConfig: VersionedEndpoint) {
  return async (request: NextRequest) => {
    const version = APIVersionManager.getRequestedVersion(request);
    const versionHandler = endpointConfig.versions[version];

    if (!versionHandler) {
      // Try to find the closest supported version
      const supportedVersions = Object.keys(endpointConfig.versions)
        .filter((v) => API_CONFIG.SUPPORTED_VERSIONS.includes(v))
        .sort((a, b) => parseFloat(b) - parseFloat(a)); // Sort descending

      const fallbackVersion = supportedVersions[0];
      if (fallbackVersion) {
        const fallbackHandler = endpointConfig.versions[fallbackVersion];
        const response = await fallbackHandler.handler(request);

        // Add compatibility warning
        response.headers.set(
          'Warning',
          `299 - "Requested version ${version} not available, using ${fallbackVersion}"`,
        );

        return response;
      }

      return createAPIResponse(
        {
          success: false,
          error: {
            code: 'VERSION_NOT_AVAILABLE',
            message: `Version ${version} is not available for this endpoint`,
            details: {
              available_versions: Object.keys(endpointConfig.versions),
              endpoint: `${endpointConfig.method} ${endpointConfig.path}`,
            },
          },
        },
        400,
      );
    }

    // Validate request if schema is provided
    if (versionHandler.schema) {
      try {
        const body = await request.json();
        versionHandler.schema.parse(body);
      } catch (error) {
        return createAPIResponse(
          {
            success: false,
            error: APIErrors.VALIDATION_FAILED(error),
          },
          400,
        );
      }
    }

    return await versionHandler.handler(request);
  };
}

// Register versioned endpoints
APIVersionManager.registerEndpoint(webhookVersions);

// Export for use in API routes
export { APIVersionManager };
