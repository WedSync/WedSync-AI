/**
 * Cloud Providers API - Main Route
 * POST /api/cloud/providers - Add cloud provider
 * GET /api/cloud/providers - List all cloud providers
 * WS-257 Team B Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MultiCloudOrchestrationService } from '@/lib/services/cloud-orchestration-service';
import {
  createCloudProviderSchema,
  cloudProviderFilterSchema,
  paginationSchema,
  validateCloudProviderCredentials,
  sanitizeCloudProviderCredentials,
} from '@/lib/validations/cloud-infrastructure';
import type {
  CloudProvider,
  CloudProviderType,
} from '@/types/cloud-infrastructure';
import { z } from 'zod';

// Rate limiting configuration
const RATE_LIMITS = {
  GET: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  POST: { requests: 10, windowMs: 60000 }, // 10 requests per minute (more restrictive for creation)
};

// Request rate limiting store (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(method: string, clientId: string): boolean {
  const limit = RATE_LIMITS[method as keyof typeof RATE_LIMITS];
  if (!limit) return true;

  const now = Date.now();
  const key = `${method}:${clientId}`;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + limit.windowMs });
    return true;
  }

  if (current.count >= limit.requests) {
    return false;
  }

  current.count++;
  return true;
}

function getClientId(request: NextRequest): string {
  // In production, use proper client identification
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

async function getUserFromAuth(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('Authentication required');
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role, permissions')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      email: user.email!,
      organizationId: userData.organization_id,
      role: userData.role,
      permissions: userData.permissions || [],
    };
  } catch (error) {
    throw new Error('Authentication failed');
  }
}

/**
 * POST /api/cloud/providers
 * Add a new cloud provider
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    if (!checkRateLimit('POST', clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const user = await getUserFromAuth(request);

    // Check permissions
    if (!['owner', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCloudProviderSchema.parse(body);

    // Validate credentials for the specific provider type
    if (
      !validateCloudProviderCredentials(
        validatedData.providerType,
        validatedData.credentials,
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid credentials for the specified provider type' },
        { status: 400 },
      );
    }

    // Create orchestration service
    const orchestrationService = new MultiCloudOrchestrationService({
      organizationId: user.organizationId,
      userId: user.userId,
    });

    // Create provider configuration
    const providerConfig: CloudProvider = {
      id: `${validatedData.providerType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: user.organizationId,
      name: validatedData.name,
      providerType: validatedData.providerType,
      region: validatedData.region,
      credentials: validatedData.credentials,
      configuration: validatedData.configuration || {},
      isActive: true,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };

    // Add provider through orchestration service
    const provider =
      await orchestrationService.addCloudProvider(providerConfig);

    // Audit log
    const auditData = {
      action: 'CREATE_CLOUD_PROVIDER',
      resourceType: 'cloud_provider',
      resourceId: providerConfig.id,
      newValues: {
        ...providerConfig,
        credentials: sanitizeCloudProviderCredentials(
          providerConfig.credentials,
        ),
      },
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientId(request),
      },
    };

    console.log('Cloud provider created:', auditData);

    // Return sanitized response
    const response = {
      id: providerConfig.id,
      organizationId: providerConfig.organizationId,
      name: providerConfig.name,
      providerType: providerConfig.providerType,
      region: providerConfig.region,
      configuration: providerConfig.configuration,
      isActive: providerConfig.isActive,
      syncStatus: providerConfig.syncStatus,
      createdAt: providerConfig.createdAt,
      updatedAt: providerConfig.updatedAt,
      createdBy: providerConfig.createdBy,
      // Never return credentials in response
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating cloud provider:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (
        error.message.includes('permission') ||
        error.message.includes('Insufficient')
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (
        error.message.includes('credential') ||
        error.message.includes('Invalid')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cloud/providers
 * List all cloud providers with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    if (!checkRateLimit('GET', clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const user = await getUserFromAuth(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    // Validate pagination parameters
    const paginationParams = paginationSchema.parse({
      page: rawParams.page ? parseInt(rawParams.page) : 1,
      limit: rawParams.limit ? parseInt(rawParams.limit) : 20,
      sortBy: rawParams.sortBy || 'created_at',
      sortOrder: rawParams.sortOrder || 'desc',
    });

    // Validate filter parameters
    const filterParams = cloudProviderFilterSchema.parse({
      providerType: rawParams.providerType as CloudProviderType,
      region: rawParams.region,
      isActive:
        rawParams.isActive === 'true'
          ? true
          : rawParams.isActive === 'false'
            ? false
            : undefined,
      syncStatus: rawParams.syncStatus as any,
    });

    // Create orchestration service
    const orchestrationService = new MultiCloudOrchestrationService({
      organizationId: user.organizationId,
      userId: user.userId,
    });

    // Get providers with filters
    const allProviders =
      await orchestrationService.listCloudProviders(filterParams);

    // Apply sorting
    const sortMultiplier = paginationParams.sortOrder === 'asc' ? 1 : -1;
    const sortedProviders = allProviders.sort((a, b) => {
      const aVal = (a as any)[paginationParams.sortBy];
      const bVal = (b as any)[paginationParams.sortBy];

      if (aVal < bVal) return -1 * sortMultiplier;
      if (aVal > bVal) return 1 * sortMultiplier;
      return 0;
    });

    // Apply pagination
    const startIndex = (paginationParams.page - 1) * paginationParams.limit;
    const endIndex = startIndex + paginationParams.limit;
    const paginatedProviders = sortedProviders.slice(startIndex, endIndex);

    // Sanitize response (remove credentials)
    const sanitizedProviders = paginatedProviders.map((provider) => ({
      id: provider.id,
      organizationId: provider.organizationId,
      name: provider.name,
      providerType: provider.providerType,
      region: provider.region,
      configuration: provider.configuration,
      isActive: provider.isActive,
      lastSyncAt: provider.lastSyncAt,
      syncStatus: provider.syncStatus,
      errorMessage: provider.errorMessage,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      createdBy: provider.createdBy,
      // Never include credentials in list response
    }));

    // Prepare pagination metadata
    const totalProviders = sortedProviders.length;
    const totalPages = Math.ceil(totalProviders / paginationParams.limit);

    const response = {
      data: sanitizedProviders,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total: totalProviders,
        totalPages,
        hasNext: paginationParams.page < totalPages,
        hasPrevious: paginationParams.page > 1,
      },
      filters: filterParams,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing cloud providers:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
