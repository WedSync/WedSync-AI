# 01-api-routes-structure.md

## Overview

Organize API routes using Next.js 15 App Router conventions with clear separation between supplier and couple endpoints.

## Directory Structure

```
app/
├── api/
│   ├── auth/          # Authentication endpoints
│   ├── suppliers/     # WedSync supplier endpoints
│   ├── couples/       # WedMe couple endpoints
│   ├── forms/         # Shared form endpoints
│   ├── webhooks/      # External service webhooks
│   └── public/        # Public API (directory)
```

## Route Naming Conventions

- **REST principles**: GET, POST, PUT, DELETE
- **Resource-based**: `/api/suppliers/[id]/clients`
- **Action-based exceptions**: `/api/forms/generate-ai`
- **Version in headers**: `X-API-Version: 1.0`

## Route Handler Pattern

```
// app/api/suppliers/[id]/route.ts
export async function GET(req: Request, 
  { params }: { params: { id: string } }) {
  // 1. Auth check
  const session = await getServerSession()
  if (!session) return unauthorized()
  
  // 2. Validation
  const { id } = params
  if (!isValidUUID(id)) return badRequest()
  
  // 3. Business logic
  const supplier = await getSupplier(id)
  
  // 4. Response
  return NextResponse.json(supplier)
}
```

## Response Standards

- Always return consistent JSON structure
- Include pagination metadata for lists
- Use proper HTTP status codes
- Include request ID for debugging

## Critical Routes

- `/api/forms/[id]/responses` - Form submissions
- `/api/suppliers/onboarding` - Supplier setup
- `/api/couples/core-fields` - Core field updates