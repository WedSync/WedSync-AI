# 02-middleware-setup.md

## Overview

Implement middleware for authentication, rate limiting, logging, and request validation across all API routes.

## Middleware Stack

### 1. Authentication Middleware

```
// middleware.ts
export async function middleware(request: NextRequest) {
  // Skip auth for public routes
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    return [NextResponse.next](http://NextResponse.next)()
  }
  
  // Check session for protected routes
  const session = await getSessionFromCookie(request)
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Add user context to headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', [session.user.id](http://session.user.id))
  requestHeaders.set('x-user-type', session.user.user_type)
}
```

### 2. Rate Limiting

- **Implementation**: Use Upstash Redis for distributed rate limiting
- **Limits**:
    - Free tier: 100 requests/hour
    - Paid tiers: 1000 requests/hour
    - AI endpoints: 10 requests/minute
- **Headers**: Return X-RateLimit-* headers

### 3. Request Validation

- Parse and validate JSON body
- Sanitize inputs to prevent XSS
- Check Content-Type headers
- Validate UUID parameters

### 4. Logging Middleware

- Log all requests with timestamp
- Track response times
- Record errors with stack traces
- Send to monitoring service (Sentry)

## Error Handling

- Catch all unhandled errors
- Return consistent error format
- Don't leak sensitive information
- Log full error internally