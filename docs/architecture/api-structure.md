# API Structure Documentation

## API Design Principles
- **RESTful + RPC Hybrid**: REST for CRUD, RPC for complex operations
- **Type-Safe**: Full TypeScript with Zod validation
- **Consistent Response Format**: Standardized success/error responses
- **Rate Limited**: Prevent abuse with tiered limits
- **Versioned**: API v1 with future compatibility

## Base Configuration

### API Routes Structure
/api/
├── auth/           # Authentication endpoints
├── suppliers/      # Supplier management
├── couples/        # Couple management
├── clients/        # Client management
├── forms/          # Forms CRUD and responses
├── journeys/       # Customer journey automation
├── core-fields/    # Core fields sync
├── communications/ # Email/SMS operations
├── analytics/      # Analytics and reporting
├── marketplace/    # Template marketplace
├── webhooks/       # External integrations
└── admin/          # Admin operations

## Authentication & Middleware

### Authentication Flow
```typescript
// app/api/middleware/auth.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function withAuth(
  request: NextRequest,
  requiredRole?: 'supplier' | 'couple' | 'admin'
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (requiredRole) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== requiredRole) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
  }

  return { user, supabase }
}

// Usage in route handler
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { user, supabase } = auth
  // Route logic here
}
Rate Limiting
typescript// app/api/middleware/rateLimit.ts
const rateLimits = {
  free: { requests: 100, window: '1h' },
  starter: { requests: 1000, window: '1h' },
  professional: { requests: 5000, window: '1h' },
  scale: { requests: 10000, window: '1h' },
}

export async function withRateLimit(
  request: NextRequest,
  userId: string
) {
  // Check user's tier and apply appropriate limit
  // Use Redis or in-memory store for tracking
}
Core API Endpoints
Suppliers API
typescript// app/api/suppliers/route.ts
// GET /api/suppliers - Get supplier profile
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { user, supabase } = auth
  
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      user_profiles (
        first_name,
        last_name,
        email
      )
    `)
    .eq('user_id', user.id)
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
  
  return NextResponse.json({ data })
}

// PUT /api/suppliers - Update supplier profile
export async function PUT(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  // Validate with Zod
  const schema = z.object({
    business_name: z.string().min(1).max(100),
    vendor_type: z.enum(['photographer', 'caterer', 'dj', 'venue', 'planner']),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string(),
    }).optional(),
  })
  
  const validated = schema.parse(body)
  
  const { data, error } = await supabase
    .from('suppliers')
    .update(validated)
    .eq('user_id', user.id)
    .select()
    .single()
  
  return NextResponse.json({ data })
}

// app/api/suppliers/onboarding/route.ts
// POST /api/suppliers/onboarding - Complete onboarding
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  // Transaction for multi-table updates
  const { data, error } = await supabase.rpc('complete_supplier_onboarding', {
    p_user_id: user.id,
    p_business_data: body.business,
    p_imported_clients: body.clients || []
  })
  
  return NextResponse.json({ data })
}
Clients API
typescript// app/api/clients/route.ts
// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'active'
  
  const offset = (page - 1) * limit
  
  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('supplier_id', supplierData.id)
    .eq('status', status)
    .range(offset, offset + limit - 1)
    .order('wedding_date', { ascending: true })
  
  if (search) {
    query = query.ilike('couple_names', `%${search}%`)
  }
  
  const { data, error, count } = await query
  
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  })
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  const schema = z.object({
    couple_names: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    wedding_date: z.string().optional(),
    venue_name: z.string().optional(),
    guest_count: z.number().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  
  const validated = schema.parse(body)
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      ...validated,
      supplier_id: supplierData.id,
      source: 'manual'
    })
    .select()
    .single()
  
  // Trigger welcome journey if configured
  await triggerDefaultJourney(data.id)
  
  return NextResponse.json({ data })
}

// app/api/clients/import/route.ts
// POST /api/clients/import - Bulk import clients
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const formData = await request.formData()
  const file = formData.get('file') as File
  const format = formData.get('format') as string // 'csv', 'excel', 'json'
  
  // Parse file based on format
  const clients = await parseImportFile(file, format)
  
  // Validate and deduplicate
  const validated = clients.map(client => clientSchema.parse(client))
  const deduplicated = await deduplicateClients(validated, supplierData.id)
  
  // Bulk insert
  const { data, error } = await supabase
    .from('clients')
    .insert(deduplicated)
    .select()
  
  return NextResponse.json({
    imported: data.length,
    skipped: clients.length - data.length,
    data
  })
}
Forms API
typescript// app/api/forms/route.ts
// GET /api/forms - List supplier's forms
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('supplier_id', supplierData.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  return NextResponse.json({ data })
}

// POST /api/forms - Create new form
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  const schema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    form_type: z.enum(['questionnaire', 'contract', 'checklist']),
    sections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      order: z.number(),
      fields: z.array(z.object({
        id: z.string(),
        type: z.enum(['text', 'email', 'phone', 'date', 'select', 'checkbox', 'radio', 'file']),
        label: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean(),
        core_field_key: z.string().optional(),
        validation: z.object({}).optional(),
        conditional_logic: z.object({}).optional(),
        options: z.array(z.string()).optional(),
      }))
    })),
    settings: z.object({
      thank_you_message: z.string().optional(),
      redirect_url: z.string().optional(),
      notification_email: z.boolean().optional(),
    }).optional()
  })
  
  const validated = schema.parse(body)
  
  const { data, error } = await supabase
    .from('forms')
    .insert({
      ...validated,
      supplier_id: supplierData.id
    })
    .select()
    .single()
  
  return NextResponse.json({ data })
}

// app/api/forms/[id]/route.ts
// GET /api/forms/[id] - Get single form
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Public endpoint for clients to view forms
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', params.id)
    .eq('is_active', true)
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Form not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json({ data })
}

// app/api/forms/[id]/responses/route.ts
// POST /api/forms/[id]/responses - Submit form response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  
  // Get form structure for validation
  const { data: form } = await supabase
    .from('forms')
    .select('sections')
    .eq('id', params.id)
    .single()
  
  // Validate response against form structure
  const validated = validateFormResponse(body, form.sections)
  
  // Check if user is authenticated (couple)
  const { data: { user } } = await supabase.auth.getUser()
  
  let coupleId = null
  if (user) {
    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`partner1_user_id.eq.${user.id},partner2_user_id.eq.${user.id}`)
      .single()
    
    coupleId = couple?.id
  }
  
  // Save response
  const { data, error } = await supabase
    .from('form_responses')
    .insert({
      form_id: params.id,
      couple_id: coupleId,
      response_data: validated,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
    .select()
    .single()
  
  // Update core fields if applicable
  await updateCoreFieldsFromResponse(validated, coupleId)
  
  // Trigger notifications
  await sendFormSubmissionNotification(params.id, data.id)
  
  return NextResponse.json({ data })
}

// app/api/forms/generate/route.ts
// POST /api/forms/generate - AI form generation
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  const schema = z.object({
    description: z.string().min(10),
    vendor_type: z.string(),
    form_type: z.string(),
  })
  
  const validated = schema.parse(body)
  
  // Call OpenAI to generate form structure
  const formStructure = await generateFormWithAI(validated)
  
  // Save as draft
  const { data, error } = await supabase
    .from('forms')
    .insert({
      ...formStructure,
      supplier_id: supplierData.id,
      is_active: false // Start as draft
    })
    .select()
    .single()
  
  return NextResponse.json({ data })
}
Customer Journey API
typescript// app/api/journeys/route.ts
// GET /api/journeys - List journeys
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { data, error } = await supabase
    .from('customer_journeys')
    .select(`
      *,
      journey_instances (count)
    `)
    .eq('supplier_id', supplierData.id)
    .order('created_at', { ascending: false })
  
  return NextResponse.json({ data })
}

// POST /api/journeys - Create journey
export async function POST(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    journey_data: z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.enum(['trigger', 'email', 'sms', 'form', 'delay', 'condition']),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.any(),
      })),
      edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        type: z.string(),
      }))
    })
  })
  
  const validated = schema.parse(body)
  
  const { data, error } = await supabase
    .from('customer_journeys')
    .insert({
      ...validated,
      supplier_id: supplierData.id
    })
    .select()
    .single()
  
  return NextResponse.json({ data })
}

// app/api/journeys/[id]/activate/route.ts
// POST /api/journeys/[id]/activate - Activate journey for client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const body = await request.json()
  const { client_id } = body
  
  // Create journey instance
  const { data, error } = await supabase
    .from('journey_instances')
    .insert({
      journey_id: params.id,
      client_id,
      status: 'active',
      current_step: 0,
      step_data: {}
    })
    .select()
    .single()
  
  // Queue first step execution
  await queueJourneyStep(data.id, 0)
  
  return NextResponse.json({ data })
}

// app/api/journeys/execute/route.ts
// POST /api/journeys/execute - Execute journey steps (cron job)
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get pending journey executions
  const { data: pending } = await supabase
    .from('journey_executions')
    .select(`
      *,
      journey_instances (
        *,
        customer_journeys (
          journey_data
        ),
        clients (
          *
        )
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)
  
  // Execute each step
  const results = await Promise.allSettled(
    pending.map(execution => executeJourneyStep(execution))
  )
  
  return NextResponse.json({
    executed: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  })
}
Core Fields API
typescript// app/api/core-fields/route.ts
// GET /api/core-fields - Get couple's core fields
export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if ('error' in auth) return auth
  
  const { searchParams } = new URL(request.url)
  const coupleId = searchParams.get('couple_id')
  
  // Verify access
  const hasAccess = await verifyCoreFieldAccess(user.id, coupleId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const { data, error } = await supabase
    .from('core_fields')
    .select('*')
    .eq('couple_id', coupleId)
    .order('field_key')
  
  // Transform to key-value object
  const fields = data.reduce((acc, field) => {
    acc[field.field_key] = {
      value: field.field_value,
      type: field.field_type,
      status: field.status
    }
    return acc
  }, {})
  
  return NextResponse.json({ data: fields })
}

// PUT /api/core-fields - Update core fields
export async function PUT(request: NextRequest) {
  const auth = await withAuth(request, 'couple')
  if ('error' in auth) return auth
  
  const body = await request.json()
  const { fields } = body
  
  // Get couple ID
  const { data: couple } = await supabase
    .from('couples')
    .select('id')
    .or(`partner1_user_id.eq.${user.id},partner2_user_id.eq.${user.id}`)
    .single()
  
  // Upsert fields
  const updates = Object.entries(fields).map(([key, data]) => ({
    couple_id: couple.id,
    field_key: key,
    field_value: data.value,
    field_type: data.type,
    status: data.status || 'complete',
    last_updated_by: user.id
  }))
  
  const { data, error } = await supabase
    .from('core_fields')
    .upsert(updates, {
      onConflict: 'couple_id,field_key'
    })
    .select()
  
  // Broadcast update to connected suppliers
  await broadcastCoreFieldUpdate(couple.id, fields)
  
  return NextResponse.json({ data })
}
Analytics API
typescript// app/api/analytics/dashboard/route.ts
// GET /api/analytics/dashboard - Supplier dashboard metrics
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '30d'
  
  const startDate = getStartDate(period)
  
  // Parallel queries for metrics
  const [
    clientMetrics,
    formMetrics,
    journeyMetrics,
    activityMetrics
  ] = await Promise.all([
    getClientMetrics(supplierData.id, startDate),
    getFormMetrics(supplierData.id, startDate),
    getJourneyMetrics(supplierData.id, startDate),
    getActivityMetrics(supplierData.id, startDate)
  ])
  
  return NextResponse.json({
    data: {
      clients: clientMetrics,
      forms: formMetrics,
      journeys: journeyMetrics,
      activity: activityMetrics,
      period
    }
  })
}

// app/api/analytics/export/route.ts
// GET /api/analytics/export - Export analytics data
export async function GET(request: NextRequest) {
  const auth = await withAuth(request, 'supplier')
  if ('error' in auth) return auth
  
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'csv'
  const type = searchParams.get('type') || 'clients'
  
  const data = await exportAnalyticsData(supplierData.id, type)
  
  if (format === 'csv') {
    const csv = convertToCSV(data)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export.csv"`
      }
    })
  } else if (format === 'json') {
    return NextResponse.json({ data })
  }
}
Webhook Endpoints
typescript// app/api/webhooks/stripe/route.ts
// POST /api/webhooks/stripe - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object)
      break
  }
  
  return NextResponse.json({ received: true })
}

// app/api/webhooks/calendar/route.ts
// POST /api/webhooks/calendar - Handle calendar webhooks
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Verify webhook source
  const token = request.headers.get('x-webhook-token')
  if (token !== process.env.CALENDAR_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { event_type, calendar_id, event_data } = body
  
  switch (event_type) {
    case 'event.created':
      await handleCalendarEventCreated(calendar_id, event_data)
      break
    case 'event.updated':
      await handleCalendarEventUpdated(calendar_id, event_data)
      break
    case 'event.cancelled':
      await handleCalendarEventCancelled(calendar_id, event_data)
      break
  }
  
  return NextResponse.json({ processed: true })
}
Error Handling
typescript// app/api/lib/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown) {
  console.error('API Error:', error)
  
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    )
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Usage in routes
export async function POST(request: NextRequest) {
  try {
    // Route logic
  } catch (error) {
    return handleAPIError(error)
  }
}
Response Format Standards
typescript// Success response
{
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}

// Error response
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context
  }
}

// Paginated response
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
API Testing Strategy
typescript// __tests__/api/forms.test.ts
import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/forms/route'

describe('/api/forms', () => {
  it('creates a new form', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        title: 'Test Form',
        sections: []
      }
    })
    
    await POST(req)
    
    expect(res._getStatusCode()).toBe(200)
    const json = JSON.parse(res._getData())
    expect(json.data).toHaveProperty('id')
  })
})