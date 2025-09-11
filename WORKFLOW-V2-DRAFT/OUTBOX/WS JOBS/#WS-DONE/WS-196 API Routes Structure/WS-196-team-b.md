# TEAM B - ROUND 1: WS-196 - API Routes Structure
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive API infrastructure with standardized route patterns, secure authentication layers, request logging system, and wedding industry specific business logic for supplier and couple interactions
**FEATURE ID:** WS-196 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about RESTful API design, comprehensive validation patterns, secure authentication flows, and wedding industry context that supports photographers managing multiple weddings, venues handling booking inquiries, and couples accessing their planning data

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/suppliers/
cat $WS_ROOT/wedsync/src/lib/api/response-schemas.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api-routes
# MUST show: "All API route structure tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("api route structure authentication");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
```

## 🧠 STEP 2: SEQUENTIAL THINKING FOR API ARCHITECTURE

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "API Routes Structure needs: Next.js App Router pattern implementation with comprehensive authentication, standardized response schemas, request logging with wedding business context, rate limiting, and route validation. Key patterns: /api/suppliers/[id]/clients for supplier management, /api/couples/[id]/timeline for couple access, /api/forms/[formId]/generate for dynamic forms. All routes need consistent error handling, UUID validation, and wedding industry specific filtering.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**API INFRASTRUCTURE DEVELOPMENT:**
- Comprehensive Next.js App Router API implementation with RESTful patterns
- Secure authentication and authorization layers with session validation
- Request logging system with wedding business context and performance metrics
- Standardized response schemas with consistent error handling patterns
- Route validation with UUID parameters and business logic validation
- Rate limiting implementation with tiered access control
- Database integration with Supabase for supplier and couple data access

## 📋 TECHNICAL DELIVERABLES

- [ ] Next.js App Router API routes with comprehensive validation patterns
- [ ] Standardized response schemas and error handling system
- [ ] Request logging infrastructure with business context tracking
- [ ] Authentication middleware with role-based access control
- [ ] Rate limiting system with tiered access permissions
- [ ] Route validation helpers with wedding industry specific logic
- [ ] Database integration layer with Supabase optimization

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/
- Response Schemas: $WS_ROOT/wedsync/src/lib/api/response-schemas.ts
- Validation Helpers: $WS_ROOT/wedsync/src/lib/api/validation-helpers.ts
- Authentication: $WS_ROOT/wedsync/src/lib/api/auth-middleware.ts

## 🔧 API INFRASTRUCTURE PATTERNS

### Comprehensive Response Schema System
```typescript
// src/lib/api/response-schemas.ts
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Standardized API response creator
export function createAPIResponse<T>(
  response: Omit<APIResponse<T>, 'meta'> & { meta?: Partial<APIResponse['meta']> },
  statusCode: number = 200
): NextResponse<APIResponse<T>> {
  const fullResponse: APIResponse<T> = {
    ...response,
    meta: {
      requestId: response.meta?.requestId || uuidv4(),
      timestamp: response.meta?.timestamp || new Date().toISOString(),
      version: response.meta?.version || '1.0',
      ...response.meta
    }
  };

  return NextResponse.json(fullResponse, { status: statusCode });
}

// Wedding industry specific error codes
export const WeddingAPIErrors = {
  INVALID_WEDDING_DATE: {
    code: 'INVALID_WEDDING_DATE',
    message: 'Wedding date must be in the future and within reasonable planning timeframe',
    statusCode: 400
  },
  SUPPLIER_NOT_AVAILABLE: {
    code: 'SUPPLIER_NOT_AVAILABLE',
    message: 'Supplier is not available for the requested wedding date',
    statusCode: 409
  },
  VENUE_BOOKING_CONFLICT: {
    code: 'VENUE_BOOKING_CONFLICT',
    message: 'Venue already has a booking for the requested date and time',
    statusCode: 409
  },
  INVALID_GUEST_COUNT: {
    code: 'INVALID_GUEST_COUNT',
    message: 'Guest count exceeds venue capacity or supplier limitations',
    statusCode: 400
  },
  WEDDING_SEASON_PREMIUM: {
    code: 'WEDDING_SEASON_PREMIUM',
    message: 'Peak wedding season requires premium pricing and earlier booking',
    statusCode: 402
  }
} as const;

// Request logging with wedding business context
export interface APIRequestLog {
  requestId: string;
  method: string;
  routePattern: string;
  fullPath?: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  supplierId?: string;
  coupleId?: string;
  formId?: string;
  errorType?: 'validation' | 'auth' | 'server' | 'rate_limit' | 'business';
  errorMessage?: string;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
  queryParams?: Record<string, any>;
  businessContext?: {
    weddingDate?: string;
    venueType?: string;
    supplierType?: string;
    guestCount?: number;
    budgetRange?: string;
  };
}

export async function logAPIRequest(logData: APIRequestLog): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase
      .from('api_request_logs')
      .insert({
        request_id: logData.requestId,
        method: logData.method,
        route_pattern: logData.routePattern,
        full_path: logData.fullPath,
        status_code: logData.statusCode,
        response_time_ms: logData.responseTime,
        user_id: logData.userId,
        supplier_id: logData.supplierId,
        couple_id: logData.coupleId,
        form_id: logData.formId,
        error_type: logData.errorType,
        error_message: logData.errorMessage,
        stack_trace: logData.stackTrace,
        user_agent: logData.userAgent,
        ip_address: logData.ipAddress,
        query_params: logData.queryParams,
        request_headers: {}, // Add request headers if needed
        body_size_bytes: 0, // Calculate if needed
        response_size_bytes: 0, // Calculate if needed
      });
  } catch (error) {
    console.error('Failed to log API request:', error);
    // Don't throw - logging failures shouldn't break API responses
  }
}
```

### Authentication and Authorization Middleware
```typescript
// src/lib/api/auth-middleware.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string[];
    permissions: string[];
  };
  session: any;
}

export interface RouteAccessRequest {
  userId: string;
  resourceType: 'supplier' | 'couple' | 'form' | 'venue' | 'booking';
  resourceId: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export async function validateAuthentication(request: NextRequest): Promise<AuthContext | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return null;
    }

    // Get user permissions from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        permissions,
        supplier_id,
        couple_id,
        is_active
      `)
      .eq('id', session.user.id)
      .single();

    if (!userProfile || !userProfile.is_active) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: Array.isArray(userProfile.role) ? userProfile.role : [userProfile.role],
        permissions: userProfile.permissions || []
      },
      session
    };

  } catch (error) {
    console.error('Authentication validation failed:', error);
    return null;
  }
}

export async function validateRouteAccess(accessRequest: RouteAccessRequest): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { userId, resourceType, resourceId, action } = accessRequest;

    // Get user profile with permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        permissions,
        supplier_id,
        couple_id
      `)
      .eq('id', userId)
      .single();

    if (!userProfile) {
      return false;
    }

    // Admin access
    if (userProfile.role?.includes('admin')) {
      return true;
    }

    // Resource-specific access control
    switch (resourceType) {
      case 'supplier':
        // Suppliers can access their own data
        if (userProfile.supplier_id === resourceId) {
          return true;
        }
        // Staff can read supplier data they're associated with
        if (action === 'read' && userProfile.role?.includes('staff')) {
          return await checkStaffSupplierAccess(userProfile.id, resourceId);
        }
        break;

      case 'couple':
        // Couples can access their own data
        if (userProfile.couple_id === resourceId) {
          return true;
        }
        // Suppliers can read couple data for their clients
        if (action === 'read' && userProfile.supplier_id) {
          return await checkSupplierCoupleAccess(userProfile.supplier_id, resourceId);
        }
        break;

      case 'form':
        // Form access based on supplier/couple ownership
        return await checkFormAccess(userId, resourceId, action);

      case 'venue':
        // Venue owners and staff can manage their venues
        return await checkVenueAccess(userId, resourceId, action);

      case 'booking':
        // Booking access for involved parties
        return await checkBookingAccess(userId, resourceId, action);
    }

    return false;

  } catch (error) {
    console.error('Route access validation failed:', error);
    return false;
  }
}

// Helper functions for specific resource access
async function checkStaffSupplierAccess(staffUserId: string, supplierId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data } = await supabase
    .from('supplier_staff')
    .select('id')
    .eq('staff_user_id', staffUserId)
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .single();

  return !!data;
}

async function checkSupplierCoupleAccess(supplierId: string, coupleId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('couple_id', coupleId)
    .single();

  return !!data;
}

async function checkFormAccess(userId: string, formId: string, action: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: form } = await supabase
    .from('forms')
    .select(`
      id,
      supplier_id,
      couple_id,
      is_public
    `)
    .eq('id', formId)
    .single();

  if (!form) return false;

  // Public forms can be read by anyone
  if (form.is_public && action === 'read') {
    return true;
  }

  // Check if user owns the form through supplier or couple
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('supplier_id, couple_id')
    .eq('id', userId)
    .single();

  if (userProfile?.supplier_id === form.supplier_id) {
    return true;
  }

  if (userProfile?.couple_id === form.couple_id) {
    return true;
  }

  return false;
}

async function checkVenueAccess(userId: string, venueId: string, action: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: venue } = await supabase
    .from('venues')
    .select(`
      id,
      supplier_id
    `)
    .eq('id', venueId)
    .single();

  if (!venue) return false;

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('supplier_id')
    .eq('id', userId)
    .single();

  return userProfile?.supplier_id === venue.supplier_id;
}

async function checkBookingAccess(userId: string, bookingId: string, action: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id,
      supplier_id,
      couple_id
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) return false;

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('supplier_id, couple_id')
    .eq('id', userId)
    .single();

  // User can access booking if they're the supplier or couple involved
  return (
    userProfile?.supplier_id === booking.supplier_id ||
    userProfile?.couple_id === booking.couple_id
  );
}
```

### Rate Limiting Implementation
```typescript
// src/lib/api/rate-limiting.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds to wait if blocked
}

export interface RateLimitCheck {
  userId?: string;
  endpoint: string;
  tier: 'basic' | 'premium' | 'unlimited';
  ipAddress?: string;
}

// Rate limiting tiers for wedding platform
const RATE_LIMIT_TIERS = {
  basic: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    burstLimit: 20 // Max requests in 1 minute burst
  },
  premium: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    burstLimit: 50
  },
  unlimited: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10000,
    burstLimit: 200
  }
} as const;

// Endpoint-specific limits for wedding business logic
const ENDPOINT_LIMITS = {
  'supplier_clients': {
    basic: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
    premium: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
    unlimited: { maxRequests: 2000, windowMs: 15 * 60 * 1000 }
  },
  'form_generation': {
    basic: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 1 hour window for form generation
    premium: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
    unlimited: { maxRequests: 1000, windowMs: 60 * 60 * 1000 }
  },
  'venue_availability': {
    basic: { maxRequests: 30, windowMs: 60 * 1000 }, // 1 minute for venue checks
    premium: { maxRequests: 100, windowMs: 60 * 1000 },
    unlimited: { maxRequests: 500, windowMs: 60 * 1000 }
  },
  'couple_timeline': {
    basic: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
    premium: { maxRequests: 300, windowMs: 15 * 60 * 1000 },
    unlimited: { maxRequests: 1000, windowMs: 15 * 60 * 1000 }
  }
} as const;

export async function rateLimitCheck(params: RateLimitCheck): Promise<RateLimitResult> {
  try {
    const { userId, endpoint, tier, ipAddress } = params;
    
    // Get rate limit configuration for this endpoint and tier
    const endpointConfig = ENDPOINT_LIMITS[endpoint as keyof typeof ENDPOINT_LIMITS];
    const tierConfig = endpointConfig?.[tier] || RATE_LIMIT_TIERS[tier];

    // Create rate limit key based on user ID or IP address
    const rateLimitKey = userId ? `user:${userId}:${endpoint}` : `ip:${ipAddress}:${endpoint}`;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const now = new Date();
    const windowStart = new Date(now.getTime() - tierConfig.windowMs);

    // Get current request count in the window
    const { count } = await supabase
      .from('api_request_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .eq('route_pattern', `%${endpoint}%`)
      .ilike('route_pattern', `%${endpoint}%`);

    const currentRequests = count || 0;
    const remaining = Math.max(0, tierConfig.maxRequests - currentRequests);
    const resetTime = new Date(now.getTime() + tierConfig.windowMs);

    // Check if rate limit is exceeded
    if (currentRequests >= tierConfig.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(tierConfig.windowMs / 1000) // seconds
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime
    };

  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: 100,
      resetTime: new Date(Date.now() + 15 * 60 * 1000)
    };
  }
}

// Rate limit headers for client feedback
export function addRateLimitHeaders(
  response: Response,
  rateLimitResult: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.getTime().toString());
  
  if (!rateLimitResult.allowed && rateLimitResult.retryAfter) {
    headers.set('Retry-After', rateLimitResult.retryAfter.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

### Complete Supplier Client API Implementation
```typescript
// src/app/api/suppliers/[id]/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  createAPIResponse, 
  logAPIRequest, 
  WeddingAPIErrors 
} from '@/lib/api/response-schemas';
import { 
  validateAuthentication, 
  validateRouteAccess 
} from '@/lib/api/auth-middleware';
import { rateLimitCheck } from '@/lib/api/rate-limiting';
import { createClient } from '@supabase/supabase-js';

// Wedding industry specific validation schemas
const GetClientsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['active', 'pending', 'completed', 'cancelled']).optional(),
  wedding_date_from: z.string().datetime().optional(),
  wedding_date_to: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional(),
  supplier_type: z.enum(['photographer', 'venue', 'catering', 'florist', 'band']).optional(),
  budget_range: z.enum(['under_1000', '1000_2500', '2500_5000', '5000_plus']).optional(),
  wedding_season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
  guest_count_min: z.coerce.number().min(1).optional(),
  guest_count_max: z.coerce.number().max(1000).optional(),
  sort: z.enum(['wedding_date', 'created_at', 'couple_name', 'guest_count']).default('wedding_date'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

const CreateClientSchema = z.object({
  couple_name: z.string().min(2).max(100),
  wedding_date: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    { message: "Wedding date must be in the future" }
  ),
  venue_name: z.string().min(1).max(200).optional(),
  venue_location: z.string().min(1).max(200).optional(),
  guest_count: z.number().min(1).max(1000).optional(),
  budget_range: z.enum(['under_1000', '1000_2500', '2500_5000', '5000_plus']),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  requirements: z.string().max(2000).optional(),
  preferred_style: z.string().max(200).optional(),
  dietary_restrictions: z.string().max(500).optional(),
  special_requests: z.string().max(1000).optional(),
  package_tier: z.enum(['basic', 'standard', 'premium', 'luxury']).default('standard'),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/suppliers/[id]/clients - Enhanced supplier client management
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Step 1: Authentication validation
    const authContext = await validateAuthentication(request);
    if (!authContext) {
      await logAPIRequest({
        requestId,
        method: 'GET',
        routePattern: '/api/suppliers/[id]/clients',
        statusCode: 401,
        responseTime: Date.now() - startTime,
        errorType: 'auth',
        errorMessage: 'No valid authentication context'
      });

      return createAPIResponse({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access supplier client data'
        }
      }, 401);
    }

    // Step 2: Route parameter validation
    const supplierId = params.id;
    if (!supplierId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierId)) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'INVALID_SUPPLIER_ID',
          message: 'Supplier ID must be a valid UUID format'
        }
      }, 400);
    }

    // Step 3: Authorization check
    const hasAccess = await validateRouteAccess({
      userId: authContext.user.id,
      resourceType: 'supplier',
      resourceId: supplierId,
      action: 'read'
    });

    if (!hasAccess) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this supplier\'s client data'
        }
      }, 403);
    }

    // Step 4: Rate limiting
    const rateLimitResult = await rateLimitCheck({
      userId: authContext.user.id,
      endpoint: 'supplier_clients',
      tier: authContext.user.role.includes('premium') ? 'premium' : 'basic'
    });

    if (!rateLimitResult.allowed) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`,
          details: { retryAfter: rateLimitResult.retryAfter }
        }
      }, 429);
    }

    // Step 5: Query validation with wedding context
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = GetClientsQuerySchema.parse(queryParams);

    // Step 6: Database query with comprehensive wedding context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    let query = supabase
      .from('clients')
      .select(`
        id,
        couple_name,
        wedding_date,
        venue_name,
        venue_location,
        guest_count,
        budget_range,
        contact_email,
        contact_phone,
        status,
        requirements,
        preferred_style,
        dietary_restrictions,
        special_requests,
        package_tier,
        created_at,
        updated_at,
        forms:client_forms(
          id, 
          title, 
          status, 
          form_type, 
          created_at,
          responses_count
        ),
        bookings:client_bookings(
          id, 
          service_date, 
          status, 
          total_amount,
          deposit_paid
        ),
        communications:client_communications(
          id, 
          type, 
          subject, 
          created_at,
          is_read
        )
      `)
      .eq('supplier_id', supplierId)
      .range(
        (validatedQuery.page - 1) * validatedQuery.limit,
        validatedQuery.page * validatedQuery.limit - 1
      );

    // Apply wedding industry specific filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status);
    }
    
    if (validatedQuery.wedding_date_from) {
      query = query.gte('wedding_date', validatedQuery.wedding_date_from);
    }
    
    if (validatedQuery.wedding_date_to) {
      query = query.lte('wedding_date', validatedQuery.wedding_date_to);
    }
    
    if (validatedQuery.search) {
      query = query.or(`couple_name.ilike.%${validatedQuery.search}%,venue_name.ilike.%${validatedQuery.search}%,venue_location.ilike.%${validatedQuery.search}%`);
    }

    if (validatedQuery.budget_range) {
      query = query.eq('budget_range', validatedQuery.budget_range);
    }

    if (validatedQuery.guest_count_min) {
      query = query.gte('guest_count', validatedQuery.guest_count_min);
    }

    if (validatedQuery.guest_count_max) {
      query = query.lte('guest_count', validatedQuery.guest_count_max);
    }

    // Wedding season filtering
    if (validatedQuery.wedding_season) {
      const seasonMonths = getSeasonMonths(validatedQuery.wedding_season);
      query = query.or(seasonMonths.map(month => 
        `extract(month from wedding_date).eq.${month}`
      ).join(','));
    }

    // Apply sorting
    query = query.order(validatedQuery.sort, { ascending: validatedQuery.order === 'asc' });

    const { data: clients, error: queryError } = await query;

    if (queryError) {
      await logAPIRequest({
        requestId,
        method: 'GET',
        routePattern: '/api/suppliers/[id]/clients',
        statusCode: 500,
        responseTime: Date.now() - startTime,
        errorType: 'server',
        errorMessage: queryError.message,
        supplierId,
        userId: authContext.user.id
      });

      return createAPIResponse({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve client data',
          details: { error: queryError.message }
        }
      }, 500);
    }

    // Step 7: Get total count for pagination
    const { count: totalCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId);

    // Step 8: Transform data with wedding industry context
    const transformedClients = clients?.map(client => ({
      ...client,
      days_until_wedding: client.wedding_date 
        ? Math.ceil((new Date(client.wedding_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
      wedding_season: client.wedding_date 
        ? getWeddingSeason(new Date(client.wedding_date))
        : null,
      budget_display: getBudgetDisplay(client.budget_range),
      is_peak_season: client.wedding_date 
        ? isPeakWeddingSeason(new Date(client.wedding_date))
        : false,
      planning_status: determinePlanningStatus(client),
      urgency_level: calculateUrgencyLevel(client),
      estimated_revenue: calculateEstimatedRevenue(client),
    }));

    // Step 9: Business analytics summary
    const businessSummary = {
      total_clients: totalCount || 0,
      upcoming_weddings: transformedClients?.filter(c => 
        c.days_until_wedding && c.days_until_wedding > 0 && c.days_until_wedding <= 365
      ).length || 0,
      peak_season_weddings: transformedClients?.filter(c => c.is_peak_season).length || 0,
      high_value_clients: transformedClients?.filter(c => 
        ['2500_5000', '5000_plus'].includes(c.budget_range)
      ).length || 0,
      pending_forms: transformedClients?.reduce((sum, c) => 
        sum + (c.forms?.filter(f => f.status === 'pending').length || 0), 0
      ) || 0,
      total_estimated_revenue: transformedClients?.reduce((sum, c) => 
        sum + (c.estimated_revenue || 0), 0
      ) || 0,
    };

    // Step 10: Log successful request
    await logAPIRequest({
      requestId,
      method: 'GET',
      routePattern: '/api/suppliers/[id]/clients',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      supplierId,
      userId: authContext.user.id,
      businessContext: {
        supplierType: 'mixed', // Could be determined from supplier profile
        guestCount: transformedClients?.reduce((sum, c) => sum + (c.guest_count || 0), 0),
        budgetRange: 'mixed'
      }
    });

    return createAPIResponse({
      success: true,
      data: {
        clients: transformedClients,
        summary: businessSummary,
        filters_applied: {
          status: validatedQuery.status,
          date_range: {
            from: validatedQuery.wedding_date_from,
            to: validatedQuery.wedding_date_to
          },
          search: validatedQuery.search,
          budget_range: validatedQuery.budget_range,
          wedding_season: validatedQuery.wedding_season
        }
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / validatedQuery.limit),
          hasNextPage: validatedQuery.page < Math.ceil((totalCount || 0) / validatedQuery.limit),
          hasPreviousPage: validatedQuery.page > 1
        }
      }
    });

  } catch (error) {
    await logAPIRequest({
      requestId,
      method: 'GET',
      routePattern: '/api/suppliers/[id]/clients',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      errorType: 'server',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stackTrace: error instanceof Error ? error.stack : undefined,
      supplierId: params.id
    });

    return createAPIResponse({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while retrieving client data'
      }
    }, 500);
  }
}

// Wedding industry helper functions
function getWeddingSeason(weddingDate: Date): string {
  const month = weddingDate.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getSeasonMonths(season: string): number[] {
  const seasonMap: Record<string, number[]> = {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2]
  };
  return seasonMap[season] || [];
}

function isPeakWeddingSeason(weddingDate: Date): boolean {
  const month = weddingDate.getMonth() + 1;
  return month >= 5 && month <= 9; // May through September
}

function getBudgetDisplay(budgetRange: string): string {
  const budgetMap: Record<string, string> = {
    'under_1000': 'Under £1,000',
    '1000_2500': '£1,000 - £2,500',
    '2500_5000': '£2,500 - £5,000',
    '5000_plus': '£5,000+'
  };
  return budgetMap[budgetRange] || 'Not specified';
}

function determinePlanningStatus(client: any): string {
  const daysUntil = client.days_until_wedding;
  if (!daysUntil) return 'unknown';
  
  if (daysUntil > 365) return 'early_planning';
  if (daysUntil > 180) return 'active_planning';
  if (daysUntil > 60) return 'detailed_planning';
  if (daysUntil > 0) return 'final_preparations';
  return 'completed';
}

function calculateUrgencyLevel(client: any): 'low' | 'medium' | 'high' | 'critical' {
  const daysUntil = client.days_until_wedding;
  if (!daysUntil || daysUntil < 0) return 'low';
  
  if (daysUntil <= 14) return 'critical';
  if (daysUntil <= 60) return 'high';
  if (daysUntil <= 180) return 'medium';
  return 'low';
}

function calculateEstimatedRevenue(client: any): number {
  const budgetMap: Record<string, number> = {
    'under_1000': 750,
    '1000_2500': 1750,
    '2500_5000': 3750,
    '5000_plus': 7500
  };
  
  const baseRevenue = budgetMap[client.budget_range] || 1000;
  
  // Adjust for package tier
  const tierMultiplier = {
    basic: 0.7,
    standard: 1.0,
    premium: 1.3,
    luxury: 1.8
  }[client.package_tier] || 1.0;
  
  return Math.round(baseRevenue * tierMultiplier);
}
```

---

**EXECUTE IMMEDIATELY - Comprehensive API Routes Structure with wedding industry authentication, logging, and business context!**