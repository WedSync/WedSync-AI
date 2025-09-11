# WS-294: API Architecture - Main Overview - Technical Specification

## Feature Overview

**Feature ID**: WS-294  
**Feature Name**: API Architecture - Main Overview  
**Feature Type**: Core Infrastructure  
**Priority**: P0 (Critical Foundation)  
**Complexity**: High  
**Effort**: 2 weeks  

## Problem Statement

The WedSync/WedMe platform requires a robust API architecture that provides:
- RESTful endpoints for supplier and couple platforms with clear separation
- Type-safe request/response handling preventing runtime errors
- Comprehensive middleware stack for authentication, rate limiting, and logging
- Scalable error handling supporting debugging and user experience
- Performance targets: <200ms response times (P50), >99.9% uptime
- Multi-tenant security ensuring supplier data isolation

**Current Pain Points:**
- No standardized API route structure across platform features
- Missing authentication middleware for protected endpoints
- Inconsistent error handling across different API routes
- No rate limiting strategy for preventing abuse
- Lack of request/response validation standards
- Missing monitoring and logging infrastructure

## Solution Architecture

### Core Components

#### 1. Next.js 15 App Router API Structure
- **Directory organization**: Separated supplier (`/api/suppliers`) and couple (`/api/couples`) endpoints
- **Route handlers**: Consistent pattern with auth, validation, business logic, and response
- **Type safety**: Zod schemas for request/response validation
- **Resource-based naming**: RESTful conventions with action-based exceptions for AI features

#### 2. Middleware Stack
- **Authentication middleware**: Session validation and user context injection
- **Rate limiting**: Upstash Redis-based distributed limiting with tier-specific quotas
- **Request validation**: JSON parsing, XSS prevention, and input sanitization  
- **Logging middleware**: Request/response tracking with performance metrics

#### 3. Error Handling System
- **Standardized errors**: Consistent error format with codes, messages, and request IDs
- **Status code mapping**: HTTP status codes aligned with business errors
- **Client-friendly responses**: User-facing messages without sensitive information
- **Debugging support**: Internal logging with stack traces and context

#### 4. Response Standards
- **Consistent JSON structure**: Uniform response format across all endpoints
- **Pagination metadata**: Standardized pagination for list endpoints
- **Performance headers**: Response time and cache headers
- **Request tracking**: Unique request IDs for debugging and support

#### 5. Webhook Infrastructure
- **External service webhooks**: Stripe, Twilio, SendGrid integration endpoints
- **Signature verification**: Webhook payload verification for security
- **Retry handling**: Exponential backoff for failed webhook processing
- **Event routing**: Route webhooks to appropriate handlers

## User Stories

### Epic: API Infrastructure Foundation
**As a** Platform Developer  
**I want** A comprehensive API architecture  
**So that** All platform features have consistent, secure, and performant endpoints

**Acceptance Criteria:**
- API response times <200ms (P50)
- 99.9% uptime for all endpoints
- Consistent error format across all routes
- Rate limiting prevents abuse
- Authentication required for protected endpoints

### Story: Supplier API Endpoints
**As a** Wedding Supplier (Sarah, photographer)  
**I want** Reliable API endpoints for managing my business  
**So that** I can create forms, manage clients, and track analytics without errors

**Acceptance Criteria:**
- `/api/suppliers/[id]` returns my profile and business info
- `/api/suppliers/[id]/clients` lists my clients with pagination
- `/api/suppliers/[id]/forms` manages my form templates
- Authentication prevents access to other suppliers' data
- Rate limiting allows 1000 requests/hour on paid tiers

### Story: Couple API Endpoints
**As a** Couple (James & Emma)  
**I want** Fast and secure API endpoints for wedding planning  
**So that** I can update Core Fields and see real-time changes across suppliers

**Acceptance Criteria:**
- `/api/couples/[id]/core-fields` updates wedding details instantly
- `/api/couples/[id]/suppliers` shows connected suppliers
- `/api/couples/[id]/timeline` manages wedding timeline
- Core Field updates propagate in <100ms to connected suppliers
- Authentication ensures only we can access our data

### Story: Form Submission API
**As a** Wedding Supplier (Lisa, venue owner)  
**I want** Reliable form submission endpoints  
**So that** My couples can submit information without losing data

**Acceptance Criteria:**
- `/api/forms/[id]/submit` handles form submissions reliably
- Validation prevents invalid data submission
- Error messages guide couples to fix issues
- Auto-save functionality prevents data loss
- Submissions trigger real-time notifications

### Story: AI Integration Endpoints
**As a** Wedding Supplier (Mike, florist)  
**I want** AI-powered API endpoints with proper rate limiting  
**So that** I can generate forms and content without service abuse

**Acceptance Criteria:**
- `/api/ai/generate-form` creates forms from PDFs
- `/api/ai/extract-content` pulls information from documents
- Rate limiting: 10 AI requests/minute to manage costs
- Error handling for AI service failures
- Progress tracking for long-running AI operations

## Database Design

### API Monitoring Tables

```sql
-- API request tracking and performance monitoring

CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_type VARCHAR(20),
    supplier_id UUID,
    couple_id UUID,
    request_size INTEGER,
    response_size INTEGER,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    error_code VARCHAR(50),
    client_ip INET,
    user_agent TEXT,
    api_version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes for performance analysis
    INDEX idx_api_requests_path_time (path, created_at DESC),
    INDEX idx_api_requests_user_time (user_id, created_at DESC),
    INDEX idx_api_requests_performance (response_time_ms DESC, created_at DESC),
    INDEX idx_api_requests_errors (error_code, created_at DESC) WHERE error_code IS NOT NULL
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    endpoint_pattern VARCHAR(200) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    window_duration_minutes INTEGER DEFAULT 60,
    limit_type VARCHAR(20) DEFAULT 'hourly' CHECK (limit_type IN ('minute', 'hourly', 'daily')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint to prevent duplicate rate limit entries
    UNIQUE(user_id, endpoint_pattern, window_start),
    
    -- Index for rate limit checking
    INDEX idx_rate_limits_user_endpoint (user_id, endpoint_pattern, window_start DESC)
);

CREATE TABLE IF NOT EXISTS api_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    error_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    user_id UUID REFERENCES auth.users(id),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body JSONB,
    response_body JSONB,
    user_context JSONB,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for error analysis
    INDEX idx_api_errors_code_time (error_code, created_at DESC),
    INDEX idx_api_errors_endpoint_time (endpoint, created_at DESC),
    INDEX idx_api_errors_unresolved (created_at DESC) WHERE resolved_at IS NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'stripe', 'twilio', 'sendgrid'
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    verified BOOLEAN DEFAULT false,
    processed BOOLEAN DEFAULT false,
    processing_attempts INTEGER DEFAULT 0,
    last_processing_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Index for webhook processing
    INDEX idx_webhooks_source_type_time (source, event_type, created_at DESC),
    INDEX idx_webhooks_unprocessed (created_at DESC) WHERE NOT processed,
    INDEX idx_webhooks_failed (processing_attempts DESC, created_at DESC) WHERE processing_attempts > 3
);

-- Row Level Security Policies

-- API requests - Users can see their own requests, admins see all
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own API requests" ON api_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin access all API requests" ON api_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Rate limits - Users can see their own limits
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rate limits" ON api_rate_limits
    FOR ALL USING (user_id = auth.uid());

-- API errors - Admin access only for security
ALTER TABLE api_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to API errors" ON api_errors
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );

-- Webhook events - Service role and admin access
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access to webhooks" ON webhook_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin access to webhooks" ON webhook_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role = 'admin')
    );
```

## API Endpoints

### Core API Structure

```typescript
// Base API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string; // For validation errors
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

### Supplier Platform APIs

```typescript
// /api/suppliers/[id] - GET, PUT
interface SupplierProfileResponse extends ApiResponse {
  data: {
    id: string;
    business_name: string;
    vendor_type: string;
    email: string;
    phone?: string;
    location: {
      city: string;
      country: string;
    };
    subscription_tier: string;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
  };
}

// /api/suppliers/[id]/clients - GET
interface SupplierClientsResponse extends PaginatedResponse<ClientSummary> {
  data: Array<{
    id: string;
    couple_names: string;
    wedding_date: string;
    status: 'active' | 'completed' | 'cancelled';
    forms_completed: number;
    forms_total: number;
    last_activity: string;
    core_fields_completion: number; // percentage
  }>;
}

// /api/suppliers/[id]/forms - GET, POST
interface SupplierFormsResponse extends PaginatedResponse<FormSummary> {
  data: Array<{
    id: string;
    title: string;
    description?: string;
    field_count: number;
    response_count: number;
    created_at: string;
    updated_at: string;
    is_template: boolean;
    ai_generated: boolean;
  }>;
}

// /api/suppliers/[id]/analytics - GET
interface SupplierAnalyticsResponse extends ApiResponse {
  data: {
    clients: {
      total: number;
      active: number;
      new_this_month: number;
    };
    forms: {
      total_sent: number;
      completion_rate: number;
      avg_completion_time_hours: number;
    };
    core_fields: {
      auto_population_rate: number;
      time_saved_hours: number;
    };
    engagement: {
      email_open_rate: number;
      sms_response_rate: number;
      last_30_days: Array<{
        date: string;
        interactions: number;
      }>;
    };
  };
}
```

### Couple Platform APIs

```typescript
// /api/couples/[id] - GET, PUT
interface CoupleProfileResponse extends ApiResponse {
  data: {
    id: string;
    partner1_name: string;
    partner2_name: string;
    wedding_date: string;
    venue_name?: string;
    guest_count?: number;
    budget?: number;
    connected_suppliers: number;
    core_fields_completion: number;
    created_at: string;
    updated_at: string;
  };
}

// /api/couples/[id]/core-fields - GET, PUT
interface CoreFieldsResponse extends ApiResponse {
  data: {
    fields: Record<string, {
      value: any;
      status: 'completed' | 'partial' | 'pending' | 'not_applicable';
      updated_at: string;
      auto_populated: boolean;
      shared_with: string[]; // supplier IDs
    }>;
    completion_percentage: number;
    last_updated: string;
  };
}

// /api/couples/[id]/suppliers - GET
interface CouplesSuppliersResponse extends PaginatedResponse<ConnectedSupplier> {
  data: Array<{
    id: string;
    business_name: string;
    vendor_type: string;
    connection_status: 'invited' | 'connected' | 'completed';
    forms_pending: number;
    last_interaction: string;
    profile_picture?: string;
  }>;
}

// /api/couples/[id]/timeline - GET, POST, PUT
interface CoupleTimelineResponse extends ApiResponse {
  data: {
    events: Array<{
      id: string;
      title: string;
      description?: string;
      date: string;
      time?: string;
      location?: string;
      supplier_id?: string;
      type: 'meeting' | 'deadline' | 'milestone' | 'personal';
      status: 'upcoming' | 'completed' | 'cancelled';
    }>;
    milestones: Array<{
      id: string;
      title: string;
      target_date: string;
      completion_percentage: number;
      dependent_tasks: number;
    }>;
  };
}
```

### Form Management APIs

```typescript
// /api/forms/[id] - GET, PUT, DELETE
interface FormDetailsResponse extends ApiResponse {
  data: {
    id: string;
    title: string;
    description?: string;
    supplier_id: string;
    schema: {
      fields: Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        core_field_id?: string;
        validation?: any;
        options?: string[];
      }>;
      sections?: Array<{
        title: string;
        fields: string[];
      }>;
    };
    settings: {
      allow_partial_save: boolean;
      send_email_notifications: boolean;
      auto_populate_core_fields: boolean;
    };
    stats: {
      sent_count: number;
      response_count: number;
      completion_rate: number;
      avg_completion_time_minutes: number;
    };
  };
}

// /api/forms/[id]/submit - POST
interface FormSubmissionRequest {
  responses: Record<string, any>;
  partial_save: boolean;
  couple_id: string;
}

interface FormSubmissionResponse extends ApiResponse {
  data: {
    submission_id: string;
    completion_percentage: number;
    core_fields_updated: string[];
    validation_errors?: Array<{
      field_id: string;
      message: string;
    }>;
  };
}

// /api/forms/generate-ai - POST
interface AIFormGenerationRequest {
  supplier_id: string;
  source_type: 'pdf' | 'description' | 'template';
  source_content: string | File;
  form_title?: string;
  vendor_type: string;
}

interface AIFormGenerationResponse extends ApiResponse {
  data: {
    job_id: string;
    estimated_completion_minutes: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    form_preview?: {
      title: string;
      field_count: number;
      core_fields_mapped: number;
    };
  };
}
```

### Webhook APIs

```typescript
// /api/webhooks/stripe - POST
interface StripeWebhookRequest {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
}

// /api/webhooks/twilio - POST
interface TwilioWebhookRequest {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
}

// /api/webhooks/sendgrid - POST
interface SendGridWebhookRequest {
  email: string;
  event: 'delivered' | 'opened' | 'clicked' | 'bounce' | 'dropped';
  timestamp: number;
  'sg_event_id': string;
  'sg_message_id': string;
}
```

## Frontend Components

### API Client Hook

```typescript
// hooks/useApiClient.ts
'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export function useApiClient(options: ApiClientOptions = {}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async <T = any>(
    endpoint: string,
    requestOptions: RequestOptions = {}
  ): Promise<T> => {
    const {
      method = 'GET',
      body,
      headers = {},
      skipAuth = false
    } = requestOptions;

    setLoading(true);
    setError(null);

    try {
      const url = `${options.baseUrl || '/api'}${endpoint}`;
      
      // Add authentication header
      if (!skipAuth && session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      // Add content type for POST/PUT requests
      if (body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Add request ID for tracking
      headers['X-Request-ID'] = crypto.randomUUID();

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(options.timeout || 30000)
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const data = await response.json();

      // Handle API errors
      if (!response.ok) {
        const apiError = data.error || {};
        throw new Error(apiError.message || `HTTP ${response.status}`);
      }

      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session, options]);

  // Convenience methods
  const get = useCallback(<T = any>(endpoint: string) => 
    makeRequest<T>(endpoint, { method: 'GET' }), [makeRequest]);

  const post = useCallback(<T = any>(endpoint: string, body: any) =>
    makeRequest<T>(endpoint, { method: 'POST', body }), [makeRequest]);

  const put = useCallback(<T = any>(endpoint: string, body: any) =>
    makeRequest<T>(endpoint, { method: 'PUT', body }), [makeRequest]);

  const del = useCallback(<T = any>(endpoint: string) =>
    makeRequest<T>(endpoint, { method: 'DELETE' }), [makeRequest]);

  return {
    makeRequest,
    get,
    post,
    put,
    delete: del,
    loading,
    error,
    clearError: () => setError(null)
  };
}
```

### API Error Handler Component

```typescript
// components/api/ApiErrorHandler.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ApiErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onClear?: () => void;
  showToast?: boolean;
  showAlert?: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  'AUTH_REQUIRED': 'Please sign in to continue',
  'INSUFFICIENT_PERMISSIONS': 'You don\'t have permission to perform this action',
  'RESOURCE_NOT_FOUND': 'The requested information could not be found',
  'VALIDATION_ERROR': 'Please check your input and try again',
  'RATE_LIMITED': 'Too many requests. Please wait a moment and try again',
  'PAYMENT_REQUIRED': 'This feature requires a subscription upgrade',
  'EXTERNAL_SERVICE_ERROR': 'A service is temporarily unavailable. Please try again',
  'NETWORK_ERROR': 'Connection problem. Please check your internet and try again',
  'TIMEOUT_ERROR': 'The request took too long. Please try again'
};

export function ApiErrorHandler({
  error,
  onRetry,
  onClear,
  showToast = true,
  showAlert = true
}: ApiErrorHandlerProps) {
  
  useEffect(() => {
    if (error && showToast) {
      const friendlyMessage = ERROR_MESSAGES[error] || error;
      toast.error(friendlyMessage, {
        action: onRetry ? {
          label: 'Retry',
          onClick: onRetry
        } : undefined
      });
    }
  }, [error, showToast, onRetry]);

  if (!error || !showAlert) {
    return null;
  }

  const friendlyMessage = ERROR_MESSAGES[error] || error;
  const isRetryable = [
    'EXTERNAL_SERVICE_ERROR',
    'NETWORK_ERROR', 
    'TIMEOUT_ERROR',
    'RATE_LIMITED'
  ].includes(error);

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription className="flex items-center justify-between">
        <span>{friendlyMessage}</span>
        <div className="flex gap-2 ml-4">
          {isRetryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Retry
            </Button>
          )}
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-destructive hover:bg-destructive/10"
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

### API Rate Limit Display

```typescript
// components/api/RateLimitDisplay.tsx
'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RateLimitInfo {
  requests_used: number;
  requests_limit: number;
  window_reset_minutes: number;
  ai_requests_used: number;
  ai_requests_limit: number;
  subscription_tier: string;
}

export function RateLimitDisplay() {
  const [rateLimits, setRateLimits] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRateLimits = async () => {
      try {
        const response = await fetch('/api/user/rate-limits');
        if (response.ok) {
          const data = await response.json();
          setRateLimits(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch rate limits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRateLimits();
    const interval = setInterval(fetchRateLimits, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded w-full animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!rateLimits) return null;

  const apiUsagePercentage = (rateLimits.requests_used / rateLimits.requests_limit) * 100;
  const aiUsagePercentage = (rateLimits.ai_requests_used / rateLimits.ai_requests_limit) * 100;

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          API Usage
          <Badge variant="secondary">{rateLimits.subscription_tier}</Badge>
        </CardTitle>
        <CardDescription>
          Resets in {rateLimits.window_reset_minutes} minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Regular API Usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>API Requests</span>
            <span>{rateLimits.requests_used} / {rateLimits.requests_limit}</span>
          </div>
          <Progress 
            value={apiUsagePercentage} 
            className="h-2"
          />
          <div 
            className={`h-2 rounded-full ${getUsageColor(apiUsagePercentage)}`}
            style={{ width: `${apiUsagePercentage}%` }}
          />
        </div>

        {/* AI API Usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>AI Requests</span>
            <span>{rateLimits.ai_requests_used} / {rateLimits.ai_requests_limit}</span>
          </div>
          <Progress 
            value={aiUsagePercentage} 
            className="h-2"
          />
          <div 
            className={`h-2 rounded-full ${getUsageColor(aiUsagePercentage)}`}
            style={{ width: `${aiUsagePercentage}%` }}
          />
        </div>

        {/* Warning for high usage */}
        {(apiUsagePercentage >= 80 || aiUsagePercentage >= 80) && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
            High usage detected. Consider upgrading your plan for higher limits.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Integration Requirements

### MCP Server Usage

This feature requires comprehensive MCP server integration for robust API implementation:

#### Context7 MCP Server
```typescript
// Get latest Next.js App Router patterns
const nextjsDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/vercel/next.js',
  topic: 'app router api routes'
});

// Get Zod validation patterns
const zodDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '/colinhacks/zod',
  topic: 'schema validation'
});

// Get rate limiting patterns
const upstashDocs = await mcp_context7.get_library_docs({
  context7CompatibleLibraryID: '@upstash/ratelimit',
  topic: 'redis rate limiting'
});
```

#### PostgreSQL MCP Server
```typescript
// Monitor API performance through database queries
const performanceStats = await mcp_postgres.query(`
  SELECT 
    path,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count
  FROM api_requests 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY path
  ORDER BY avg_response_time DESC;
`);

// Check rate limit enforcement
const rateLimitViolations = await mcp_postgres.query(`
  SELECT user_id, endpoint_pattern, COUNT(*) as violations
  FROM api_rate_limits
  WHERE request_count > (
    CASE endpoint_pattern 
      WHEN '/api/ai/%' THEN 10
      ELSE 1000
    END
  )
  AND created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY user_id, endpoint_pattern;
`);
```

#### Supabase MCP Server
```typescript
// Health check for Supabase API integration
const apiHealth = await mcp_supabase.get_logs({
  service: 'api'
});

// Monitor database performance for API endpoints
const dbPerformance = await mcp_supabase.execute_sql(`
  SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_changes,
    seq_scan,
    seq_tup_read / GREATEST(seq_scan, 1) as avg_seq_read
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY total_changes DESC;
`);
```

## Technical Specifications

### API Performance Requirements

```typescript
interface ApiPerformanceTargets {
  response_times: {
    p50: 200; // 200ms
    p95: 500; // 500ms
    p99: 1000; // 1 second
  };
  throughput: {
    requests_per_second: 1000;
    concurrent_connections: 10000;
  };
  error_rates: {
    total_error_rate: 0.5; // 0.5%
    timeout_rate: 0.1; // 0.1%
    server_error_rate: 0.1; // 0.1%
  };
  availability: 99.9; // 99.9% uptime
}
```

### Rate Limiting Configuration

```typescript
interface RateLimitConfiguration {
  tiers: {
    free: {
      requests_per_hour: 100;
      ai_requests_per_minute: 0;
      concurrent_requests: 5;
    };
    starter: {
      requests_per_hour: 1000;
      ai_requests_per_minute: 5;
      concurrent_requests: 10;
    };
    professional: {
      requests_per_hour: 5000;
      ai_requests_per_minute: 10;
      concurrent_requests: 25;
    };
    scale: {
      requests_per_hour: 15000;
      ai_requests_per_minute: 20;
      concurrent_requests: 50;
    };
    enterprise: {
      requests_per_hour: 50000;
      ai_requests_per_minute: 100;
      concurrent_requests: 100;
    };
  };
  special_endpoints: {
    '/api/ai/*': 'ai_requests_per_minute';
    '/api/forms/*/submit': 'no_limit'; // Critical for user experience
    '/api/webhooks/*': 'no_limit'; // External services
  };
}
```

### Error Code Standards

```typescript
interface ApiErrorCodes {
  // Authentication & Authorization
  AUTH_REQUIRED: { status: 401; message: 'Authentication required' };
  INSUFFICIENT_PERMISSIONS: { status: 403; message: 'Insufficient permissions' };
  TOKEN_EXPIRED: { status: 401; message: 'Token expired' };
  
  // Validation
  VALIDATION_ERROR: { status: 400; message: 'Validation failed' };
  MISSING_REQUIRED_FIELD: { status: 400; message: 'Required field missing' };
  INVALID_FORMAT: { status: 400; message: 'Invalid data format' };
  
  // Resources
  RESOURCE_NOT_FOUND: { status: 404; message: 'Resource not found' };
  RESOURCE_CONFLICT: { status: 409; message: 'Resource conflict' };
  RESOURCE_GONE: { status: 410; message: 'Resource no longer available' };
  
  // Rate Limiting
  RATE_LIMITED: { status: 429; message: 'Rate limit exceeded' };
  QUOTA_EXCEEDED: { status: 429; message: 'Quota exceeded' };
  
  // Business Logic
  PAYMENT_REQUIRED: { status: 402; message: 'Payment required' };
  SUBSCRIPTION_EXPIRED: { status: 402; message: 'Subscription expired' };
  FEATURE_DISABLED: { status: 403; message: 'Feature disabled' };
  
  // External Services
  EXTERNAL_SERVICE_ERROR: { status: 502; message: 'External service unavailable' };
  WEBHOOK_VERIFICATION_FAILED: { status: 400; message: 'Webhook verification failed' };
  
  // Server Errors
  INTERNAL_ERROR: { status: 500; message: 'Internal server error' };
  DATABASE_ERROR: { status: 503; message: 'Database unavailable' };
  TIMEOUT_ERROR: { status: 504; message: 'Request timeout' };
}
```

## Testing Requirements

### Unit Tests
```typescript
// API route handler tests
describe('API Route Handlers', () => {
  test('should authenticate requests properly', async () => {
    const request = new NextRequest('/api/suppliers/123', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid_token' }
    });

    const response = await GET(request, { params: { id: '123' } });
    expect(response.status).toBe(200);
  });

  test('should reject unauthorized requests', async () => {
    const request = new NextRequest('/api/suppliers/123', {
      method: 'GET'
    });

    const response = await GET(request, { params: { id: '123' } });
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  test('should validate request parameters', async () => {
    const request = new NextRequest('/api/suppliers/invalid-uuid', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid_token' }
    });

    const response = await GET(request, { params: { id: 'invalid-uuid' } });
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should handle rate limiting', async () => {
    // Simulate rate limit exceeded
    mockRateLimit.mockResolvedValueOnce({ success: false });

    const request = new NextRequest('/api/suppliers/123', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid_token' }
    });

    const response = await GET(request, { params: { id: '123' } });
    expect(response.status).toBe(429);
    
    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});
```

### Integration Tests
```typescript
// Full API integration tests
describe('API Integration', () => {
  test('should handle complete supplier workflow', async () => {
    // Create supplier
    const createResponse = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        business_name: 'Test Photography',
        vendor_type: 'photographer'
      })
    });

    expect(createResponse.status).toBe(201);
    const supplier = await createResponse.json();

    // Get supplier
    const getResponse = await fetch(`/api/suppliers/${supplier.data.id}`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });

    expect(getResponse.status).toBe(200);
    const retrieved = await getResponse.json();
    expect(retrieved.data.business_name).toBe('Test Photography');
  });

  test('should enforce data isolation between suppliers', async () => {
    const supplier1Token = await createTestSupplier('Supplier 1');
    const supplier2Token = await createTestSupplier('Supplier 2');

    // Supplier 1 creates a form
    const formResponse = await fetch('/api/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supplier1Token}`
      },
      body: JSON.stringify({
        title: 'Private Form',
        schema: { fields: [] }
      })
    });

    const form = await formResponse.json();

    // Supplier 2 tries to access Supplier 1's form
    const accessAttempt = await fetch(`/api/forms/${form.data.id}`, {
      headers: { Authorization: `Bearer ${supplier2Token}` }
    });

    expect(accessAttempt.status).toBe(404); // Should not find resource due to RLS
  });
});
```

### Performance Tests
```typescript
// API performance benchmarks
describe('API Performance', () => {
  test('should handle high concurrent load', async () => {
    const concurrentRequests = 100;
    const startTime = Date.now();

    const requests = Array(concurrentRequests).fill(null).map(() =>
      fetch('/api/suppliers/health', {
        headers: { Authorization: `Bearer ${testToken}` }
      })
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // All requests should succeed
    const successCount = responses.filter(r => r.status === 200).length;
    expect(successCount).toBe(concurrentRequests);

    // Average response time should be reasonable
    const avgResponseTime = (endTime - startTime) / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(500); // 500ms average
  });

  test('should meet response time targets', async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const startTime = Date.now();
      const response = await fetch('/api/suppliers/123/clients', {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      responseTimes.push(endTime - startTime);
    }

    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];

    expect(p50).toBeLessThan(200); // P50 < 200ms
    expect(p95).toBeLessThan(500); // P95 < 500ms
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Complete API route structure for supplier and couple platforms
- [ ] Authentication middleware protecting all non-public endpoints
- [ ] Rate limiting with tier-specific quotas and AI endpoint special handling
- [ ] Comprehensive error handling with user-friendly messages
- [ ] Request/response validation using Zod schemas
- [ ] Webhook endpoints for Stripe, Twilio, and SendGrid integration
- [ ] API monitoring with performance metrics tracking
- [ ] Consistent JSON response format across all endpoints

### Performance Requirements
- [ ] API response times: P50 < 200ms, P95 < 500ms, P99 < 1s
- [ ] Support for 1000+ requests/second throughput
- [ ] Handle 10,000+ concurrent connections
- [ ] Error rate < 0.5% across all endpoints
- [ ] 99.9% API availability uptime
- [ ] Rate limiting enforcement without false positives

### Security Requirements
- [ ] All protected endpoints require valid authentication
- [ ] Row Level Security enforces data isolation between suppliers
- [ ] Rate limiting prevents abuse and manages AI costs
- [ ] Webhook signature verification for external services
- [ ] Request logging excludes sensitive information
- [ ] API errors don't leak internal system information

### Integration Requirements
- [ ] Core Fields updates propagate in real-time via API
- [ ] Form submissions trigger appropriate notifications
- [ ] AI-generated content integrates with form builder
- [ ] Webhook processing handles payment and communication events
- [ ] Analytics APIs provide actionable business insights
- [ ] Client dashboard receives real-time updates via API

## Implementation Notes

### Phase 1: Core API Infrastructure (Week 1)
- Next.js App Router structure and route handlers
- Authentication middleware implementation
- Basic error handling and response standards
- Core supplier and couple endpoints

### Phase 2: Advanced Features (Week 2)
- Rate limiting with Redis backend
- Webhook endpoints and signature verification
- AI integration endpoints with progress tracking
- Performance monitoring and analytics APIs
- Comprehensive testing suite

### Critical Dependencies
- Next.js 15 App Router architecture
- Supabase authentication and database
- Upstash Redis for rate limiting
- Webhook integrations (Stripe, Twilio, SendGrid)
- Real-time WebSocket infrastructure

## Business Impact

### Direct Value
- **Development Velocity**: Standardized API patterns accelerate feature development
- **User Experience**: <200ms response times improve platform responsiveness
- **Cost Control**: AI endpoint rate limiting manages OpenAI expenses
- **Reliability**: 99.9% uptime ensures business continuity

### Viral Growth Enablement
- **Real-time Core Fields**: Instant updates across supplier-couple connections
- **Fast Onboarding**: Quick API responses support seamless invitation flows
- **Scalable Architecture**: Handles viral growth spikes without degradation
- **Mobile Performance**: Fast APIs enable smooth mobile experience

### Risk Mitigation
- **Data Breaches**: Authentication and RLS prevent unauthorized access
- **Service Abuse**: Rate limiting protects against DoS attacks
- **Integration Failures**: Webhook reliability ensures payment processing
- **Performance Issues**: Monitoring enables proactive issue resolution

## Effort Estimation

**Total Effort**: 2 weeks (80 hours)

### Team Breakdown:
- **Backend Developer**: 1.5 weeks - API routes, middleware, error handling
- **Frontend Developer**: 0.5 weeks - API client hooks and error components
- **DevOps Engineer**: 0.5 weeks - Rate limiting infrastructure, monitoring
- **QA Engineer**: 0.5 weeks - API testing automation

### Critical Path:
1. Core API route structure and authentication
2. Error handling and validation middleware  
3. Rate limiting implementation
4. Webhook endpoint setup
5. Performance monitoring integration

**Success Metrics:**
- All API endpoints meet response time targets
- Zero authentication bypass vulnerabilities
- Rate limiting prevents service abuse
- 100% webhook signature verification

---

*This specification establishes a robust, scalable API architecture that powers the entire WedSync/WedMe platform with security, performance, and reliability as core foundations for viral growth.*