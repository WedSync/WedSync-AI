/**
 * Security Scan API Endpoint
 * Authenticated endpoint for triggering security scans and retrieving results
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { securityScanner } from '@/lib/monitoring/security-scanner';
import {
  validateEventSecurity,
  sanitizeObject,
} from '@/lib/monitoring/data-sanitizer';

// Request validation schema
const SecurityScanRequestSchema = z.object({
  scanType: z.enum(['dependencies', 'code', 'container', 'iac', 'full']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  monitor: z.boolean().optional().default(false),
  includeDetails: z.boolean().optional().default(false),
});

type SecurityScanRequest = z.infer<typeof SecurityScanRequestSchema>;

/**
 * Authentication middleware
 */
async function authenticateRequest(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  user?: { id: string; role: string; organizationId?: string };
  error?: string;
}> {
  const authHeader = request.headers.get('Authorization');
  const apiKey = request.headers.get('X-API-Key');

  // Check for API key authentication (for internal services)
  if (apiKey) {
    const validApiKey = process.env.MONITORING_API_KEY;
    if (!validApiKey) {
      return {
        isAuthenticated: false,
        error: 'API key authentication not configured',
      };
    }

    if (apiKey === validApiKey) {
      return {
        isAuthenticated: true,
        user: {
          id: 'service_account',
          role: 'admin',
          organizationId: 'system',
        },
      };
    } else {
      return {
        isAuthenticated: false,
        error: 'Invalid API key',
      };
    }
  }

  // Check for Bearer token authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      // In a real implementation, you would validate the JWT token here
      // For now, we'll do a simple check
      if (token.length < 10) {
        return {
          isAuthenticated: false,
          error: 'Invalid token format',
        };
      }

      // Mock user validation - replace with actual JWT validation
      return {
        isAuthenticated: true,
        user: {
          id: 'authenticated_user',
          role: 'admin', // Only admins can trigger security scans
          organizationId: 'default',
        },
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        error: 'Token validation failed',
      };
    }
  }

  return {
    isAuthenticated: false,
    error: 'No authentication provided',
  };
}

/**
 * Authorization check
 */
function authorizeSecurityScan(user: {
  id: string;
  role: string;
  organizationId?: string;
}): boolean {
  // Only admin users can trigger security scans
  return user.role === 'admin';
}

/**
 * Rate limiting check
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining?: number;
  resetTime?: number;
}> {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  const rateLimitKey = `security_scan_${userId}`;

  // Allow 5 scans per hour per user
  const maxScans = 5;
  const windowMs = 60 * 60 * 1000; // 1 hour

  // Mock implementation - replace with proper rate limiting
  return {
    allowed: true,
    remaining: maxScans - 1,
    resetTime: Date.now() + windowMs,
  };
}

/**
 * POST /api/monitoring/security/scan
 * Trigger a security scan
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const auth = await authenticateRequest(request);

    if (!auth.isAuthenticated) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: auth.error,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    // Authorization check
    if (!authorizeSecurityScan(auth.user!)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details: 'Admin role required for security scans',
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    // Rate limiting check
    const rateLimit = await checkRateLimit(auth.user!.id);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'Too many scan requests',
          resetTime: rateLimit.resetTime,
          timestamp: new Date().toISOString(),
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = SecurityScanRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const scanRequest: SecurityScanRequest = validationResult.data;

    // Execute security scan based on type
    let scanResult;

    if (scanRequest.scanType === 'full') {
      // Full scan - run multiple scan types
      scanResult = await securityScanner.generateSecurityReport();
    } else {
      // Individual scan type
      scanResult = await securityScanner.runSecurityScan({
        type: scanRequest.scanType as any,
        severity: scanRequest.severity,
        json: true,
        monitor: scanRequest.monitor,
      });
    }

    // Sanitize scan results to remove sensitive paths/information
    const sanitizedResult = sanitizeObject(scanResult);

    // Prepare response based on detail level
    const response = {
      status: 'success',
      scanId: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      scanType: scanRequest.scanType,
      user: {
        id: auth.user!.id,
        organizationId: auth.user!.organizationId,
      },
      results: scanRequest.includeDetails
        ? sanitizedResult
        : {
            summary: sanitizedResult.summary || {
              total: sanitizedResult.vulnerabilities?.length || 0,
              status: sanitizedResult.status || 'unknown',
            },
          },
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Log security scan for audit purposes
    console.log('Security scan executed:', {
      scanId: response.scanId,
      scanType: scanRequest.scanType,
      userId: auth.user!.id,
      organizationId: auth.user!.organizationId,
      vulnerabilitiesFound: response.results.summary?.total || 0,
      processingTime: response.processingTime,
    });

    // Set security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Security scan API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/monitoring/security/scan
 * Get security scan history and status
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const auth = await authenticateRequest(request);

    if (!auth.isAuthenticated) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: auth.error,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const scanType = searchParams.get('scanType');

    // Mock scan history - replace with actual database queries
    const scanHistory = [
      {
        scanId: 'scan_123_abc',
        scanType: 'dependencies',
        status: 'completed',
        vulnerabilities: 5,
        severity: 'medium',
        executedBy: auth.user!.id,
        executedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        processingTime: 15000,
      },
      {
        scanId: 'scan_456_def',
        scanType: 'code',
        status: 'completed',
        vulnerabilities: 2,
        severity: 'high',
        executedBy: auth.user!.id,
        executedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        processingTime: 32000,
      },
    ];

    // Filter by scan type if provided
    const filteredHistory = scanType
      ? scanHistory.filter((scan) => scan.scanType === scanType)
      : scanHistory;

    const response = {
      status: 'success',
      scans: filteredHistory.slice(0, limit),
      total: filteredHistory.length,
      user: {
        id: auth.user!.id,
        organizationId: auth.user!.organizationId,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Security scan history API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
