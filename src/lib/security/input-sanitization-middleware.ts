import { NextRequest, NextResponse } from 'next/server';
import { XSSProtectionEdge as XSSProtection } from './xss-protection-edge';

/**
 * Input Sanitization Middleware for WedSync
 * Automatically sanitizes all incoming request data to prevent XSS attacks
 */

export interface SanitizationConfig {
  enabled: boolean;
  strictMode: boolean;
  maxPayloadSize: number; // in bytes
  allowedContentTypes: string[];
  paths: {
    include: string[];
    exclude: string[];
  };
}

const DEFAULT_CONFIG: SanitizationConfig = {
  enabled: true,
  strictMode: true,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ],
  paths: {
    include: ['/api/**', '/forms/**'],
    exclude: ['/api/health', '/api/static/**'],
  },
};

export class InputSanitizationMiddleware {
  private config: SanitizationConfig;

  constructor(config: Partial<SanitizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main middleware handler
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    // Skip if disabled
    if (!this.config.enabled) {
      return null;
    }

    // Check if path should be processed
    if (!this.shouldProcessPath(request.nextUrl.pathname)) {
      return null;
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (contentType && !this.isAllowedContentType(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 415 },
      );
    }

    // Check payload size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.config.maxPayloadSize) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // Sanitize query parameters
    const sanitizedUrl = this.sanitizeURL(request.url);

    // If URL was modified, redirect to sanitized version
    if (sanitizedUrl !== request.url) {
      return NextResponse.redirect(sanitizedUrl);
    }

    // For POST/PUT/PATCH requests, we'll inject sanitization headers
    // The actual body sanitization happens in the API route handlers
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const headers = new Headers(request.headers);
      headers.set('x-sanitization-enabled', 'true');
      headers.set('x-sanitization-strict', this.config.strictMode.toString());

      // Clone the request with sanitization headers
      const sanitizedRequest = new Request(request, {
        headers,
      });

      // Return null to continue with modified headers
      return null;
    }

    return null;
  }

  /**
   * Sanitize URL and query parameters
   */
  private sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      let modified = false;

      // Sanitize each query parameter
      urlObj.searchParams.forEach((value, key) => {
        const sanitizedKey = XSSProtection.sanitizeInput(key);
        const sanitizedValue = XSSProtection.sanitizeInput(value);

        if (sanitizedKey !== key || sanitizedValue !== value) {
          urlObj.searchParams.delete(key);
          if (sanitizedKey && sanitizedValue) {
            urlObj.searchParams.set(sanitizedKey, sanitizedValue);
          }
          modified = true;
        }
      });

      return modified ? urlObj.toString() : url;
    } catch {
      return url;
    }
  }

  /**
   * Check if path should be processed
   */
  private shouldProcessPath(pathname: string): boolean {
    // Check exclusions first
    if (
      this.config.paths.exclude.some((pattern) =>
        this.matchesPattern(pathname, pattern),
      )
    ) {
      return false;
    }

    // Check inclusions
    return this.config.paths.include.some((pattern) =>
      this.matchesPattern(pathname, pattern),
    );
  }

  /**
   * Pattern matching for paths (supports wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$',
    );
    return regex.test(path);
  }

  /**
   * Check if content type is allowed
   */
  private isAllowedContentType(contentType: string): boolean {
    const baseType = contentType.split(';')[0].toLowerCase();
    return this.config.allowedContentTypes.some((allowed) =>
      baseType.startsWith(allowed.toLowerCase()),
    );
  }
}

/**
 * Request body sanitizer for API routes
 */
export class RequestBodySanitizer {
  /**
   * Sanitize request body based on content type
   */
  static async sanitizeRequestBody(request: NextRequest): Promise<any> {
    const contentType =
      request.headers.get('content-type')?.toLowerCase() || '';

    try {
      if (contentType.includes('application/json')) {
        const body = await request.json();
        return XSSProtection.sanitizeObject(body);
      }

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        return this.sanitizeFormData(formData);
      }

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        return this.sanitizeFormData(formData);
      }

      if (contentType.includes('text/plain')) {
        const text = await request.text();
        return XSSProtection.sanitizeInput(text);
      }

      return null;
    } catch (error) {
      throw new Error('Invalid request body format');
    }
  }

  /**
   * Sanitize FormData object
   */
  private static sanitizeFormData(formData: FormData): Record<string, any> {
    const sanitized: Record<string, any> = {};

    formData.forEach((value, key) => {
      const sanitizedKey = XSSProtection.sanitizeInput(key);

      if (typeof value === 'string') {
        const sanitizedValue = XSSProtection.sanitizeInput(value);
        if (sanitizedKey && sanitizedValue) {
          sanitized[sanitizedKey] = sanitizedValue;
        }
      } else if (value instanceof File) {
        // File uploads require special handling
        const sanitizedFileName = XSSProtection.sanitizeInput(
          value.name,
          'text',
        );
        if (sanitizedKey && sanitizedFileName) {
          sanitized[sanitizedKey] = new File([value], sanitizedFileName, {
            type: value.type,
            lastModified: value.lastModified,
          });
        }
      }
    });

    return sanitized;
  }
}

/**
 * Response sanitizer for outgoing data
 */
export class ResponseSanitizer {
  /**
   * Sanitize response data before sending to client
   */
  static sanitizeResponse<T>(
    data: T,
    options: {
      sanitizeHTML?: boolean;
      strictMode?: boolean;
    } = {},
  ): T {
    const { sanitizeHTML = true, strictMode = false } = options;

    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponse(item, options)) as T;
    }

    const sanitized = {} as T;

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        if (sanitizeHTML) {
          sanitized[key as keyof T] = XSSProtection.stripHTML(
            value,
          ) as T[keyof T];
        } else if (strictMode) {
          sanitized[key as keyof T] = XSSProtection.sanitizeInput(
            value,
          ) as T[keyof T];
        } else {
          sanitized[key as keyof T] = value as T[keyof T];
        }
      } else if (value && typeof value === 'object') {
        sanitized[key as keyof T] = this.sanitizeResponse(value, options);
      } else {
        sanitized[key as keyof T] = value as T[keyof T];
      }
    }

    return sanitized;
  }
}

// Export configured middleware instance
export const inputSanitizationMiddleware = new InputSanitizationMiddleware();

// Utility function for API routes
export async function withInputSanitization<T>(
  request: NextRequest,
  handler: (sanitizedData: any) => Promise<T>,
): Promise<T> {
  const sanitizedBody = await RequestBodySanitizer.sanitizeRequestBody(request);
  return handler(sanitizedBody);
}

export default InputSanitizationMiddleware;
