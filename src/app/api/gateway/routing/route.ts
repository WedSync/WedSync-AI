/**
 * API Gateway Routing Endpoint - Dynamic API routing and load balancing
 * WS-250 - Main gateway endpoint with wedding industry optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiRoutingEngine } from '@/lib/services/api-gateway/APIRoutingEngine';
import { loadBalancingService } from '@/lib/services/api-gateway/LoadBalancingService';
import { rateLimitingEngine } from '@/lib/services/api-gateway/RateLimitingEngine';
import { apiSecurityEnforcer } from '@/lib/services/api-gateway/APISecurityEnforcer';
import { trafficAnalyticsCollector } from '@/lib/services/api-gateway/TrafficAnalyticsCollector';
import { weddingAPIProtection } from '@/lib/services/api-gateway/WeddingAPIProtection';
import { vendorAPIThrottling } from '@/lib/services/api-gateway/VendorAPIThrottling';
import { seasonalLoadBalancer } from '@/lib/services/api-gateway/SeasonalLoadBalancer';
import {
  GatewayRequest,
  GatewayResponse,
  VendorContext,
  WeddingContext,
} from '@/types/api-gateway';

/**
 * GET /api/gateway/routing - Get routing statistics and health
 */
export async function GET(request: NextRequest) {
  try {
    const stats = {
      routing: apiRoutingEngine.getRoutingStats(),
      loadBalancing: loadBalancingService.getLoadBalancingStats(),
      rateLimiting: rateLimitingEngine.getRateLimitingStats(),
      security: apiSecurityEnforcer.getSecurityStats(),
      traffic: trafficAnalyticsCollector.getRealtimeStats(),
      weddingProtection: weddingAPIProtection.getProtectionStatus(),
      seasonal: {
        optimizationActive: seasonalLoadBalancer.isSeasonalOptimizationActive(),
        currentMultiplier: seasonalLoadBalancer.getCurrentSeasonMultiplier(),
      },
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    console.error('[API Gateway Routing] GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get routing statistics' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gateway/routing - Route a request through the API gateway
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse the incoming request
    const body = await request.json();
    const gatewayRequest = await parseGatewayRequest(request, body);

    // Step 1: Security enforcement
    const securityResult =
      await apiSecurityEnforcer.enforceSecurityPolicies(gatewayRequest);
    if (!securityResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Security check failed',
          reason: securityResult.reason,
          threatLevel: securityResult.threatLevel,
        },
        { status: 403 },
      );
    }

    // Step 2: Rate limiting
    const rateLimitResult =
      await rateLimitingEngine.checkRateLimit(gatewayRequest);
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          reason: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );

      // Add rate limiting headers
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        rateLimitResult.resetTime.toString(),
      );

      return response;
    }

    // Step 3: Wedding-specific protection
    const weddingProtection =
      await weddingAPIProtection.shouldProtectRequest(gatewayRequest);

    // Step 4: Vendor throttling
    const vendorThrottling =
      await vendorAPIThrottling.checkVendorThrottling(gatewayRequest);
    if (!vendorThrottling.allowed) {
      return NextResponse.json(
        { success: false, error: 'Vendor tier limit exceeded' },
        { status: 429 },
      );
    }

    // Step 5: Route the request
    const routingResult = await apiRoutingEngine.routeRequest(gatewayRequest);

    // Step 6: Load balancing (if multiple servers available)
    const availableServers = [routingResult.server]; // In production, this would be multiple servers
    const selectedServer = await loadBalancingService.selectServer(
      gatewayRequest,
      availableServers,
      routingResult.routingDecision.strategy,
    );

    // Step 7: Execute the request (simplified for demo)
    const gatewayResponse = await executeProxiedRequest(
      gatewayRequest,
      selectedServer,
      routingResult.route,
    );

    // Step 8: Record analytics
    trafficAnalyticsCollector.recordTraffic(gatewayRequest, gatewayResponse);

    const response = NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        routedTo: selectedServer.url,
        responseTime: gatewayResponse.responseTime,
        statusCode: gatewayResponse.statusCode,
        weddingProtection: weddingProtection.shouldProtect
          ? {
              priority: weddingProtection.priority,
              reasons: weddingProtection.reason,
            }
          : null,
      },
    });

    // Add gateway headers
    response.headers.set('X-Gateway-Route', routingResult.route.id);
    response.headers.set('X-Gateway-Server', selectedServer.id);
    response.headers.set(
      'X-Gateway-Response-Time',
      gatewayResponse.responseTime.toString(),
    );
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString(),
    );

    if (weddingProtection.shouldProtect) {
      response.headers.set('X-Wedding-Protection', 'active');
      response.headers.set('X-Wedding-Priority', weddingProtection.priority);
    }

    return response;
  } catch (error) {
    console.error('[API Gateway Routing] POST failed:', error);

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Gateway routing failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      { status: 500 },
    );

    return errorResponse;
  }
}

/**
 * PUT /api/gateway/routing - Update routing configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'register_route':
        apiRoutingEngine.registerRoute(data.route);
        break;

      case 'register_server':
        apiRoutingEngine.registerBackendServer(data.server);
        loadBalancingService.registerServer(data.server);
        break;

      case 'update_server_health':
        apiRoutingEngine.updateServerHealth(data.serverId, data.health);
        loadBalancingService.updateServerMetrics(data.serverId, data.health);
        break;

      case 'enable_emergency_mode':
        weddingAPIProtection.enableEmergencyMode(data.reason);
        break;

      case 'disable_emergency_mode':
        weddingAPIProtection.disableEmergencyMode(data.reason);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `Action '${action}' completed successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API Gateway Routing] PUT failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update routing configuration' },
      { status: 500 },
    );
  }
}

// ========================================
// Helper Functions
// ========================================

async function parseGatewayRequest(
  request: NextRequest,
  body: any,
): Promise<GatewayRequest> {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};

  // Convert Headers to plain object
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Extract vendor context from headers or JWT
  const vendorContext = await extractVendorContext(headers);

  // Extract wedding context from request
  const weddingContext = extractWeddingContext(body, headers);

  const gatewayRequest: GatewayRequest = {
    id: generateRequestId(),
    timestamp: new Date(),
    method: body.method || 'GET',
    path: body.path || url.pathname,
    headers,
    query: Object.fromEntries(url.searchParams.entries()),
    body: body.body,
    ip: getClientIP(request),
    userAgent: headers['user-agent'] || '',
    vendorContext,
    weddingContext,
  };

  return gatewayRequest;
}

async function extractVendorContext(
  headers: Record<string, string>,
): Promise<VendorContext | undefined> {
  const authHeader = headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return undefined;
  }

  try {
    // In production, this would properly decode and validate JWT
    // For now, we'll extract vendor info from a custom header or mock data
    const vendorId = headers['x-vendor-id'] || 'demo-vendor';
    const tier = (headers['x-vendor-tier'] as any) || 'professional';

    return {
      vendorId,
      tier,
      subscriptionStatus: 'active',
      lastPayment: new Date(),
    };
  } catch (error) {
    console.warn('[API Gateway] Failed to extract vendor context:', error);
    return undefined;
  }
}

function extractWeddingContext(
  body: any,
  headers: Record<string, string>,
): WeddingContext | undefined {
  const isWeddingCritical =
    body.weddingCritical ||
    headers['x-wedding-critical'] === 'true' ||
    body.path?.includes('/wedding') ||
    body.path?.includes('/critical');

  if (!isWeddingCritical && !headers['x-wedding-context']) {
    return undefined;
  }

  return {
    isWeddingCritical: isWeddingCritical || false,
    saturdayProtection: new Date().getDay() === 6,
    vendorTier: (headers['x-vendor-tier'] as any) || 'professional',
    seasonalPriority: [5, 6, 7, 8, 9].includes(new Date().getMonth() + 1),
    emergencyOverride: headers['x-emergency-override'] === 'true',
  };
}

async function executeProxiedRequest(
  request: GatewayRequest,
  server: any,
  route: any,
): Promise<GatewayResponse> {
  const startTime = Date.now();

  try {
    // In production, this would make actual HTTP requests to backend servers
    // For demo purposes, we'll simulate a response
    const simulatedLatency = Math.random() * 200 + 50; // 50-250ms
    await new Promise((resolve) => setTimeout(resolve, simulatedLatency));

    const responseTime = Date.now() - startTime;
    const statusCode = Math.random() > 0.05 ? 200 : 500; // 95% success rate

    return {
      statusCode,
      headers: {
        'content-type': 'application/json',
        'x-served-by': server.id,
      },
      body: {
        success: statusCode === 200,
        data:
          statusCode === 200
            ? { message: 'Request processed successfully' }
            : null,
        error: statusCode !== 200 ? 'Simulated server error' : undefined,
      },
      responseTime,
      serverId: server.id,
      cacheHit: Math.random() > 0.7, // 30% cache hit rate
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: { success: false, error: 'Proxy request failed' },
      responseTime: Date.now() - startTime,
      serverId: server.id,
      cacheHit: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(request: NextRequest): string {
  // Try various headers to get the real client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteIP = request.headers.get('x-remote-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteIP || '127.0.0.1';
}
