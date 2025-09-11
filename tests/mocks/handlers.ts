import { http, HttpResponse } from 'msw'

// Wedding platform API endpoint handlers for comprehensive testing coverage
export const handlers = [
  // Authentication endpoints
  http.post('/api/auth/signin', async ({ request }) => {
    const body = await request.json()
    const { email, password } = body as { email: string; password: string }
    
    if (email === 'test@wedsync.com' && password === 'testpassword') {
      return HttpResponse.json({
        user: {
          id: 'test-user-id',
          email: 'test@wedsync.com',
          name: 'Test User',
          role: 'photographer',
        },
        token: 'test-jwt-token',
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/signup', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      user: {
        id: 'new-user-id',
        email: body.email,
        name: body.name,
        role: body.role,
      },
      message: 'Account created successfully',
    }, { status: 201 })
  }),

  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@wedsync.com',
        name: 'Test User',
        role: 'photographer',
      },
    })
  }),

  // Wedding clients endpoints
  http.get('/api/clients', ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'
    
    return HttpResponse.json({
      data: [
        {
          id: 'client-1',
          name: 'John & Jane Smith',
          email: 'couple1@example.com',
          wedding_date: '2024-06-15',
          venue: 'Beautiful Wedding Venue',
          guest_count: 150,
          budget: 50000,
          status: 'active',
        },
        {
          id: 'client-2',
          name: 'Mike & Sarah Johnson',
          email: 'couple2@example.com',
          wedding_date: '2024-08-22',
          venue: 'Elegant Garden Venue',
          guest_count: 200,
          budget: 75000,
          status: 'active',
        },
      ],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 2,
        totalPages: 1,
      },
    })
  }),

  http.get('/api/clients/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'John & Jane Smith',
      email: 'couple@example.com',
      phone: '+1234567890',
      wedding_date: '2024-06-15',
      venue: 'Beautiful Wedding Venue',
      guest_count: 150,
      budget: 50000,
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    })
  }),

  http.post('/api/clients', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'new-client-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.put('/api/clients/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: params.id,
      ...body,
      updated_at: new Date().toISOString(),
    })
  }),

  http.delete('/api/clients/:id', ({ params }) => {
    return HttpResponse.json({
      message: `Client ${params.id} deleted successfully`,
    })
  }),

  // Wedding vendors endpoints
  http.get('/api/vendors', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'vendor-1',
          name: 'Amazing Photography',
          email: 'photographer@example.com',
          service_type: 'photographer',
          location: 'New York, NY',
          rating: 4.8,
          verified: true,
        },
        {
          id: 'vendor-2',
          name: 'Elegant Catering',
          email: 'catering@example.com',
          service_type: 'catering',
          location: 'Los Angeles, CA',
          rating: 4.9,
          verified: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    })
  }),

  http.get('/api/vendors/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Amazing Photography',
      email: 'photographer@example.com',
      phone: '+1234567890',
      service_type: 'photographer',
      location: 'New York, NY',
      rating: 4.8,
      verified: true,
      portfolio: ['image1.jpg', 'image2.jpg'],
      pricing: {
        base_price: 2500,
        hourly_rate: 300,
        packages: [],
      },
    })
  }),

  // Wedding guests endpoints
  http.get('/api/clients/:clientId/guests', ({ params, request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    
    let guests = [
      {
        id: 'guest-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        rsvp_status: 'confirmed',
        dietary_restrictions: 'vegetarian',
        plus_one: true,
        table_number: 5,
      },
      {
        id: 'guest-2',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        rsvp_status: 'pending',
        dietary_restrictions: '',
        plus_one: false,
        table_number: null,
      },
    ]

    if (search) {
      guests = guests.filter(guest => 
        guest.name.toLowerCase().includes(search.toLowerCase()) ||
        guest.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    return HttpResponse.json({
      data: guests,
      total: guests.length,
    })
  }),

  http.post('/api/clients/:clientId/guests', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'new-guest-id',
      ...body,
      client_id: params.clientId,
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Wedding tasks endpoints
  http.get('/api/tasks', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'task-1',
          title: 'Book wedding venue',
          description: 'Find and book the perfect wedding venue',
          due_date: '2024-03-15',
          priority: 'high',
          status: 'completed',
          category: 'venue',
        },
        {
          id: 'task-2',
          title: 'Choose wedding photographer',
          description: 'Research and hire wedding photographer',
          due_date: '2024-04-01',
          priority: 'high',
          status: 'in_progress',
          category: 'photography',
        },
      ],
    })
  }),

  // Payment endpoints
  http.get('/api/payments', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'payment-1',
          amount: 5000,
          currency: 'USD',
          status: 'paid',
          vendor_id: 'vendor-1',
          description: 'Photography deposit',
          due_date: '2024-04-15',
          paid_at: '2024-04-10T12:00:00Z',
        },
        {
          id: 'payment-2',
          amount: 2500,
          currency: 'USD',
          status: 'pending',
          vendor_id: 'vendor-2',
          description: 'Catering deposit',
          due_date: '2024-05-01',
          paid_at: null,
        },
      ],
    })
  }),

  http.post('/api/payments/create-intent', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      clientSecret: 'pi_test_client_secret',
      paymentIntentId: 'pi_test_12345',
      amount: body.amount,
      currency: body.currency,
    })
  }),

  // Journey/workflow endpoints
  http.get('/api/journeys', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'journey-1',
          name: 'Wedding Planning Workflow',
          description: 'Complete wedding planning journey',
          status: 'active',
          steps: [
            { id: 'step-1', name: 'Venue Booking', status: 'completed' },
            { id: 'step-2', name: 'Vendor Selection', status: 'in_progress' },
            { id: 'step-3', name: 'Guest Management', status: 'pending' },
          ],
        },
      ],
    })
  }),

  http.post('/api/journeys/:id/execute', ({ params }) => {
    return HttpResponse.json({
      executionId: 'exec-12345',
      journeyId: params.id,
      status: 'running',
      startedAt: new Date().toISOString(),
    })
  }),

  // Document/file upload endpoints
  http.post('/api/documents/upload', async ({ request }) => {
    return HttpResponse.json({
      id: 'doc-12345',
      filename: 'wedding-contract.pdf',
      url: 'https://storage.example.com/wedding-contract.pdf',
      uploadedAt: new Date().toISOString(),
    })
  }),

  // Analytics endpoints
  http.get('/api/analytics/dashboard', () => {
    return HttpResponse.json({
      totalClients: 42,
      activeWeddings: 15,
      upcomingWeddings: 8,
      monthlyRevenue: 125000,
      completionRate: 87.5,
      trends: {
        clientsGrowth: 12.5,
        revenueGrowth: 8.3,
        completionGrowth: 3.2,
      },
    })
  }),

  // Notification endpoints
  http.get('/api/notifications', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'notif-1',
          title: 'New client inquiry',
          message: 'Sarah & Mike Johnson submitted a contact form',
          type: 'info',
          read: false,
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 'notif-2',
          title: 'Payment received',
          message: 'Photography deposit payment of $2,500 received',
          type: 'success',
          read: true,
          created_at: '2024-01-14T14:22:00Z',
        },
      ],
    })
  }),

  // SMS/Communication endpoints
  http.post('/api/sms/send', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'sms-12345',
      to: body.to,
      message: body.message,
      status: 'sent',
      sentAt: new Date().toISOString(),
    })
  }),

  // Error simulation endpoints for testing error handling
  http.get('/api/test/error', () => {
    return HttpResponse.json(
      { error: 'Test error for error boundary testing' },
      { status: 500 }
    )
  }),

  http.get('/api/test/timeout', () => {
    // Simulate timeout for timeout handling tests
    return new Promise(() => {}) // Never resolves
  }),

  // Catch-all for unhandled requests
  http.get('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} ${request.url}`)
    return HttpResponse.json(
      { error: `Unhandled request: ${request.method} ${request.url}` },
      { status: 404 }
    )
  }),
]