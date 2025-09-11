/**
 * WedSync P0 Security: Encryption Middleware
 *
 * SECURITY LEVEL: P0 - CRITICAL
 * PURPOSE: Automatic encryption/decryption for sensitive data in API routes
 *
 * @description Middleware for transparent field-level encryption/decryption
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
// SENIOR CODE REVIEWER FIX: Corrected import path to match actual file structure
import {
  weddingEncryptionEngine,
  P0_ENCRYPTED_FIELDS,
  isP0EncryptedField,
} from '@/lib/security/encryption';
import { createServerClient } from '@supabase/ssr';

// Routes that require encryption
const ENCRYPTED_ROUTES = {
  CLIENTS: /^\/api\/clients/,
  GUESTS: /^\/api\/guests/,
  VENDORS: /^\/api\/vendors/,
  CONTRACTS: /^\/api\/contracts/,
  BUDGET: /^\/api\/budget/,
  DOCUMENTS: /^\/api\/documents/,
  WEDDING: /^\/api\/wedding/,
  RSVP: /^\/api\/rsvp/,
  INVOICES: /^\/api\/invoices/,
} as const;

// Fields to encrypt by route pattern
const ROUTE_ENCRYPTION_MAP: Record<string, keyof typeof P0_ENCRYPTED_FIELDS> = {
  '/api/clients': 'CELEBRITY_DATA',
  '/api/guests': 'GUEST_VIP_DATA',
  '/api/vendors': 'VENDOR_SENSITIVE',
  '/api/contracts': 'FINANCIAL_DATA',
  '/api/budget': 'FINANCIAL_DATA',
  '/api/wedding/venue': 'VENUE_SECURITY',
  '/api/invoices': 'FINANCIAL_DATA',
  '/api/rsvp': 'GUEST_VIP_DATA',
};

export interface EncryptionContext {
  tenantId: string;
  userId: string;
  operation: 'encrypt' | 'decrypt';
  fields: string[];
}

/**
 * Determine if route requires encryption
 */
function requiresEncryption(pathname: string): boolean {
  return Object.values(ENCRYPTED_ROUTES).some((pattern) =>
    pattern.test(pathname),
  );
}

/**
 * Get encryption fields for route
 */
function getEncryptionFieldsForRoute(pathname: string): readonly string[] {
  for (const [route, dataType] of Object.entries(ROUTE_ENCRYPTION_MAP)) {
    if (pathname.startsWith(route)) {
      return P0_ENCRYPTED_FIELDS[dataType] as readonly string[];
    }
  }
  return [];
}

/**
 * Extract tenant ID from request
 */
async function getTenantId(request: NextRequest): Promise<string | null> {
  // SENIOR CODE REVIEWER FIX: Use createServerClient for middleware context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {
          // No-op in middleware
        },
        remove() {
          // No-op in middleware
        },
      },
    },
  );

  // Try to get from auth session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id) {
    // Get organization/tenant from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.organization_id) {
      return profile.organization_id;
    }
  }

  // Try to get from request headers
  const tenantHeader = request.headers.get('x-tenant-id');
  if (tenantHeader) {
    return tenantHeader;
  }

  // Try to get from URL params (for wedding-specific routes)
  const url = new URL(request.url);
  const weddingId = url.searchParams.get('wedding_id');
  if (weddingId) {
    return weddingId;
  }

  // Extract from path params (e.g., /api/clients/[id])
  const pathSegments = url.pathname.split('/');
  if (pathSegments.includes('clients') || pathSegments.includes('weddings')) {
    const idIndex =
      pathSegments.indexOf('clients') + 1 ||
      pathSegments.indexOf('weddings') + 1;
    if (pathSegments[idIndex] && pathSegments[idIndex].match(/^[0-9a-f-]+$/)) {
      return pathSegments[idIndex];
    }
  }

  return null;
}

/**
 * Recursively encrypt object fields
 */
async function encryptObjectFields(
  obj: any,
  fields: string[],
  tenantId: string,
  path: string = '',
): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in result) {
    const currentPath = path ? `${path}.${key}` : key;

    if (
      fields.includes(key) &&
      result[key] !== null &&
      result[key] !== undefined
    ) {
      try {
        const encrypted = await weddingEncryptionEngine.encryptField(
          tenantId,
          currentPath,
          result[key],
        );
        result[key] = encrypted;
      } catch (error) {
        console.error(`Failed to encrypt field ${currentPath}:`, error);
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = await encryptObjectFields(
        result[key],
        fields,
        tenantId,
        currentPath,
      );
    }
  }

  return result;
}

/**
 * Recursively decrypt object fields
 */
async function decryptObjectFields(
  obj: any,
  fields: string[],
  path: string = '',
): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;

  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in result) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check if this is an encrypted field structure
    if (result[key]?.encrypted && result[key]?.metadata) {
      try {
        result[key] = await weddingEncryptionEngine.decryptField(result[key]);
      } catch (error) {
        console.error(`Failed to decrypt field ${currentPath}:`, error);
        result[key] = null; // Return null on decryption failure
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = await decryptObjectFields(result[key], fields, currentPath);
    }
  }

  return result;
}

/**
 * P0 Security Encryption Middleware
 */
export async function encryptionMiddleware(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // Check if route requires encryption
  if (!requiresEncryption(request.nextUrl.pathname)) {
    return response;
  }

  const tenantId = await getTenantId(request);
  if (!tenantId) {
    console.warn(
      'No tenant ID found for encrypted route:',
      request.nextUrl.pathname,
    );
    return response;
  }

  const fields = getEncryptionFieldsForRoute(request.nextUrl.pathname);
  if (fields.length === 0) {
    return response;
  }

  try {
    // Handle request body encryption (for POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.json();
      const encryptedBody = await encryptObjectFields(
        body,
        [...fields],
        tenantId,
      );

      // Create new request with encrypted body
      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(encryptedBody),
      });

      // Add encryption context header
      modifiedRequest.headers.set('x-encryption-applied', 'true');
      modifiedRequest.headers.set('x-tenant-id', tenantId);

      return NextResponse.next({ request: modifiedRequest });
    }

    // Handle response decryption (for GET requests)
    if (request.method === 'GET') {
      // Clone response to modify it
      const responseBody = await response.json();
      const decryptedBody = await decryptObjectFields(responseBody, [
        ...fields,
      ]);

      return new NextResponse(JSON.stringify(decryptedBody), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return response;
  } catch (error) {
    console.error('Encryption middleware error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Encryption processing failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      }),
      { status: 500 },
    );
  }
}

/**
 * Standalone function to encrypt data
 */
export async function encryptData(
  data: any,
  tenantId: string,
  dataType: keyof typeof P0_ENCRYPTED_FIELDS,
): Promise<any> {
  const fields = P0_ENCRYPTED_FIELDS[dataType] as readonly string[];
  return encryptObjectFields(data, [...fields], tenantId);
}

/**
 * Standalone function to decrypt data
 */
export async function decryptData(
  data: any,
  dataType: keyof typeof P0_ENCRYPTED_FIELDS,
): Promise<any> {
  const fields = P0_ENCRYPTED_FIELDS[dataType] as readonly string[];
  return decryptObjectFields(data, [...fields]);
}

/**
 * Middleware configuration for Next.js
 */
export const config = {
  matcher: [
    '/api/clients/:path*',
    '/api/guests/:path*',
    '/api/vendors/:path*',
    '/api/contracts/:path*',
    '/api/budget/:path*',
    '/api/documents/:path*',
    '/api/wedding/:path*',
    '/api/rsvp/:path*',
    '/api/invoices/:path*',
  ],
};
