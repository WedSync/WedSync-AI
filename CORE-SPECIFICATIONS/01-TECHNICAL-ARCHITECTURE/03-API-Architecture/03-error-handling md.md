# 03-error-handling.md

## Overview

Comprehensive error handling strategy ensuring graceful failures and helpful debugging information.

## Error Types & Responses

### Standard Error Format

```
interface ApiError {
  error: {
    code: string           // 'FORM_NOT_FOUND'
    message: string        // User-friendly message
    details?: any          // Additional context
    requestId: string      // For support reference
    timestamp: string
  }
}
```

### Common Error Codes

- **AUTH_REQUIRED**: No valid session
- **INSUFFICIENT_PERMISSIONS**: Wrong user type/tier
- **RESOURCE_NOT_FOUND**: Entity doesn't exist
- **VALIDATION_ERROR**: Invalid input data
- **RATE_LIMITED**: Too many requests
- **PAYMENT_REQUIRED**: Feature needs upgrade
- **EXTERNAL_SERVICE_ERROR**: Third-party API failure

## Error Handler Implementation

```
// lib/api-errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
  }
}

// Global error handler
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    )
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    { status: 500 }
  )
}
```

## Client-Side Error Handling

- Show user-friendly toast messages
- Retry logic for network failures
- Fallback UI for critical errors
- Error boundary components