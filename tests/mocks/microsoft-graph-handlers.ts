// Microsoft Graph API Mock Service Worker Handlers
// File: microsoft-graph-handlers.ts
// Purpose: Comprehensive MSW mock handlers for Microsoft Graph API testing

import { rest } from 'msw';
import { WeddingEventFactory } from '../factories/wedding-test-data';

// Mock Microsoft Graph API responses for comprehensive testing
export const microsoftGraphHandlers = [
  // OAuth Token Exchange Endpoints
  rest.post('https://login.microsoftonline.com/:tenantId/oauth2/v2.0/token', async (req, res, ctx) => {
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const grantType = params.get('grant_type');
    const code = params.get('code');
    const refreshToken = params.get('refresh_token');
    
    // Handle authorization code exchange
    if (grantType === 'authorization_code') {
      if (code === 'mock_auth_code_12345') {
        return res(
          ctx.json({
            access_token: 'mock_access_token_12345',
            refresh_token: 'mock_refresh_token_12345',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://graph.microsoft.com/calendars.readwrite https://graph.microsoft.com/user.read',
            id_token: 'mock_id_token_12345'
          })
        );
      }
      
      if (code === 'expired_code' || code === 'invalid_code') {
        return res(
          ctx.status(400),
          ctx.json({
            error: 'invalid_grant',
            error_description: 'The provided authorization grant is invalid, expired, or revoked'
          })
        );
      }
    }
    
    // Handle refresh token exchange
    if (grantType === 'refresh_token') {
      if (refreshToken === 'mock_refresh_token_12345' || refreshToken?.startsWith('mock_refresh_token')) {
        return res(
          ctx.json({
            access_token: 'new_access_token_67890',
            refresh_token: 'new_refresh_token_67890',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://graph.microsoft.com/calendars.readwrite https://graph.microsoft.com/user.read'
          })
        );
      }
      
      return res(
        ctx.status(400),
        ctx.json({
          error: 'invalid_grant',
          error_description: 'Refresh token expired or invalid'
        })
      );
    }
    
    // Default error for unsupported grant types
    return res(
      ctx.status(400),
      ctx.json({
        error: 'unsupported_grant_type',
        error_description: 'The authorization grant type is not supported'
      })
    );
  }),

  // User Profile Endpoint
  rest.get('https://graph.microsoft.com/v1.0/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return res(
        ctx.status(401),
        ctx.json({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token is missing or invalid'
          }
        })
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (token.includes('expired') || token === 'expired_token') {
      return res(
        ctx.status(401),
        ctx.json({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token has expired'
          }
        })
      );
    }
    
    return res(
      ctx.json({
        id: 'mock_user_12345',
        displayName: 'Sarah Wedding Photographer',
        givenName: 'Sarah',
        surname: 'Photography',
        userPrincipalName: 'sarah@weddingphotos.com',
        mail: 'sarah@weddingphotos.com',
        jobTitle: 'Professional Wedding Photographer',
        businessPhones: ['+44 7700 900123'],
        officeLocation: 'London, UK',
        mobilePhone: '+44 7700 900123'
      })
    );
  }),

  // User Calendars Endpoint
  rest.get('https://graph.microsoft.com/v1.0/me/calendars', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader?.includes('Bearer')) {
      return res(
        ctx.status(401),
        ctx.json({
          error: { code: 'Unauthorized', message: 'Invalid token' }
        })
      );
    }
    
    return res(
      ctx.json({
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars',
        value: [
          {
            id: 'calendar_wedding_bookings_123',
            name: 'Wedding Bookings',
            color: 'lightGreen',
            hexColor: '#90EE90',
            canEdit: true,
            canShare: true,
            canViewPrivateItems: true,
            changeKey: 'wedding_calendar_change_key',
            owner: {
              name: 'Sarah Wedding Photographer',
              address: 'sarah@weddingphotos.com'
            }
          },
          {
            id: 'calendar_engagement_sessions_456',
            name: 'Engagement Sessions',
            color: 'lightBlue',
            hexColor: '#ADD8E6',
            canEdit: true,
            canShare: false,
            canViewPrivateItems: true,
            changeKey: 'engagement_calendar_change_key',
            owner: {
              name: 'Sarah Wedding Photographer',
              address: 'sarah@weddingphotos.com'
            }
          },
          {
            id: 'calendar_personal_789',
            name: 'Personal',
            color: 'auto',
            hexColor: null,
            canEdit: true,
            canShare: false,
            canViewPrivateItems: true,
            changeKey: 'personal_calendar_change_key',
            owner: {
              name: 'Sarah Wedding Photographer',
              address: 'sarah@weddingphotos.com'
            }
          }
        ]
      })
    );
  }),

  // Calendar Events Endpoint - GET
  rest.get('https://graph.microsoft.com/v1.0/me/events', (req, res, ctx) => {
    const url = new URL(req.url);
    const filter = url.searchParams.get('$filter');
    const top = url.searchParams.get('$top') || '50';
    const skip = url.searchParams.get('$skip') || '0';
    
    // Handle date filtering
    let events = mockWeddingEvents;
    
    if (filter?.includes('start/dateTime')) {
      const dateMatch = filter.match(/start\/dateTime ge '([^']+)'/);
      if (dateMatch) {
        const filterDate = new Date(dateMatch[1]);
        events = events.filter(event => new Date(event.start.dateTime) >= filterDate);
      }
    }
    
    // Handle pagination
    const startIndex = parseInt(skip);
    const endIndex = startIndex + parseInt(top);
    const paginatedEvents = events.slice(startIndex, endIndex);
    
    return res(
      ctx.json({
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/events',
        '@odata.nextLink': endIndex < events.length ? 
          `https://graph.microsoft.com/v1.0/me/events?$skip=${endIndex}&$top=${top}` : 
          null,
        value: paginatedEvents
      })
    );
  }),

  // Calendar Events Endpoint - POST (Create)
  rest.post('https://graph.microsoft.com/v1.0/me/events', async (req, res, ctx) => {
    const eventData = await req.json();
    
    // Validate required fields
    if (!eventData.subject || !eventData.start || !eventData.end) {
      return res(
        ctx.status(400),
        ctx.json({
          error: {
            code: 'InvalidRequest',
            message: 'Missing required fields: subject, start, end'
          }
        })
      );
    }
    
    // Generate new event with mock data
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
      changeKey: `change_key_${Date.now()}`,
      '@odata.etag': `W/"${Date.now()}"`,
      ...eventData,
      webLink: `https://outlook.office365.com/calendar/item/${eventData.id}`,
      onlineMeetingUrl: eventData.isOnlineMeeting ? 
        'https://teams.microsoft.com/l/meetup-join/mock-meeting-url' : null
    };
    
    return res(
      ctx.status(201),
      ctx.json(newEvent)
    );
  }),

  // Calendar Events Endpoint - PATCH (Update)
  rest.patch('https://graph.microsoft.com/v1.0/me/events/:eventId', async (req, res, ctx) => {
    const { eventId } = req.params;
    const updateData = await req.json();
    
    // Find existing event (mock lookup)
    const existingEvent = mockWeddingEvents.find(e => e.id === eventId);
    
    if (!existingEvent) {
      return res(
        ctx.status(404),
        ctx.json({
          error: {
            code: 'ItemNotFound',
            message: 'The specified event was not found'
          }
        })
      );
    }
    
    // Create updated event
    const updatedEvent = {
      ...existingEvent,
      ...updateData,
      lastModifiedDateTime: new Date().toISOString(),
      changeKey: `updated_change_key_${Date.now()}`,
      '@odata.etag': `W/"${Date.now()}"`
    };
    
    return res(ctx.json(updatedEvent));
  }),

  // Calendar Events Endpoint - DELETE
  rest.delete('https://graph.microsoft.com/v1.0/me/events/:eventId', (req, res, ctx) => {
    const { eventId } = req.params;
    
    // Check if event exists
    const eventExists = mockWeddingEvents.some(e => e.id === eventId);
    
    if (!eventExists) {
      return res(
        ctx.status(404),
        ctx.json({
          error: {
            code: 'ItemNotFound',
            message: 'The specified event was not found'
          }
        })
      );
    }
    
    return res(ctx.status(204)); // No content response for successful deletion
  }),

  // Calendar Free/Busy Information
  rest.post('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', async (req, res, ctx) => {
    const requestData = await req.json();
    const { schedules, startTime, endTime } = requestData;
    
    return res(
      ctx.json({
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#Collection(microsoft.graph.freeBusyStatus)',
        value: schedules.map((email: string) => ({
          scheduleId: email,
          availabilityView: '22200002220000', // Busy during wedding hours, free otherwise
          freeBusyViewType: 'freeBusy',
          workingHours: {
            daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            startTime: '08:00:00.0000000',
            endTime: '20:00:00.0000000',
            timeZone: {
              '@odata.type': '#microsoft.graph.customTimeZone',
              bias: 0,
              name: 'GMT Standard Time',
              standardOffset: {
                time: '02:00:00.0000000',
                dayOccurrence: 5,
                dayOfWeek: 'sunday',
                month: 10,
                year: 0
              },
              daylightOffset: {
                daylightBias: -60,
                time: '01:00:00.0000000',
                dayOccurrence: 5,
                dayOfWeek: 'sunday',
                month: 3,
                year: 0
              }
            }
          }
        }))
      })
    );
  }),

  // Batch Requests Endpoint
  rest.post('https://graph.microsoft.com/v1.0/$batch', async (req, res, ctx) => {
    const batchRequest = await req.json();
    const { requests } = batchRequest;
    
    const responses = requests.map((request: any) => {
      if (request.method === 'GET' && request.url.includes('/events/')) {
        // Mock successful event retrieval
        return {
          id: request.id,
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            id: `event_${request.id}`,
            subject: `Wedding Event ${request.id}`,
            start: {
              dateTime: '2024-09-15T14:00:00.0000000',
              timeZone: 'GMT Standard Time'
            },
            end: {
              dateTime: '2024-09-15T18:00:00.0000000',
              timeZone: 'GMT Standard Time'
            }
          }
        };
      }
      
      if (request.method === 'POST' && request.url.includes('/events')) {
        // Mock event creation
        return {
          id: request.id,
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            id: `new_event_${request.id}`,
            ...request.body,
            createdDateTime: new Date().toISOString()
          }
        };
      }
      
      // Default response for unsupported batch operations
      return {
        id: request.id,
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          error: {
            code: 'BadRequest',
            message: 'Unsupported batch operation'
          }
        }
      };
    });
    
    return res(
      ctx.json({
        responses
      })
    );
  }),

  // Webhook Subscriptions - Create
  rest.post('https://graph.microsoft.com/v1.0/subscriptions', async (req, res, ctx) => {
    const subscriptionData = await req.json();
    
    return res(
      ctx.status(201),
      ctx.json({
        id: `subscription_${Date.now()}`,
        resource: subscriptionData.resource,
        changeType: subscriptionData.changeType,
        clientState: subscriptionData.clientState,
        notificationUrl: subscriptionData.notificationUrl,
        expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // 3 days from now
        creatorId: 'mock_creator_id'
      })
    );
  }),

  // Webhook Subscriptions - Renew
  rest.patch('https://graph.microsoft.com/v1.0/subscriptions/:subscriptionId', async (req, res, ctx) => {
    const { subscriptionId } = req.params;
    const updateData = await req.json();
    
    return res(
      ctx.json({
        id: subscriptionId,
        expirationDateTime: updateData.expirationDateTime || new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
        lastModifiedDateTime: new Date().toISOString()
      })
    );
  }),

  // Rate Limiting Response (429 Too Many Requests)
  rest.get('https://graph.microsoft.com/v1.0/rate-limit-test', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.set('Retry-After', '60'),
      ctx.json({
        error: {
          code: 'TooManyRequests',
          message: 'Request rate limit exceeded. Retry after 60 seconds.',
          innerError: {
            'request-id': 'mock-request-id',
            date: new Date().toISOString()
          }
        }
      })
    );
  }),

  // Network Error Simulation
  rest.get('https://graph.microsoft.com/v1.0/network-error-test', (req, res) => {
    return res.networkError('Connection failed');
  }),

  // Server Error Simulation
  rest.get('https://graph.microsoft.com/v1.0/server-error-test', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: {
          code: 'InternalServerError',
          message: 'An internal server error occurred'
        }
      })
    );
  })
];

// Mock wedding events data for testing
const mockWeddingEvents = [
  {
    id: 'wedding_event_001',
    subject: 'Johnson Wedding - Ceremony & Reception',
    body: {
      contentType: 'html',
      content: '<div>Wedding details for Emma & James Johnson</div>'
    },
    start: {
      dateTime: '2024-09-15T14:00:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    end: {
      dateTime: '2024-09-15T22:00:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    location: {
      displayName: 'Riverside Gardens Venue',
      address: {
        street: '123 Wedding Lane',
        city: 'London',
        postalCode: 'SW1A 1AA',
        state: '',
        countryOrRegion: 'United Kingdom'
      },
      coordinates: {
        latitude: 51.5074,
        longitude: -0.1278
      }
    },
    attendees: [
      {
        emailAddress: {
          address: 'emma.johnson@email.com',
          name: 'Emma Johnson'
        },
        status: {
          response: 'accepted',
          time: '2024-08-01T10:00:00.0000000Z'
        },
        type: 'required'
      },
      {
        emailAddress: {
          address: 'james.johnson@email.com',
          name: 'James Johnson'
        },
        status: {
          response: 'accepted',
          time: '2024-08-01T10:00:00.0000000Z'
        },
        type: 'required'
      }
    ],
    categories: ['Wedding', 'Photography', 'Client Work'],
    importance: 'high',
    sensitivity: 'private',
    showAs: 'busy',
    isAllDay: false,
    isCancelled: false,
    isOrganizer: true,
    responseRequested: false,
    seriesMasterId: null,
    transactionId: null,
    type: 'singleInstance',
    webLink: 'https://outlook.office365.com/calendar/item/wedding_event_001',
    onlineMeetingUrl: null,
    onlineMeeting: null,
    createdDateTime: '2024-08-01T09:00:00.0000000Z',
    lastModifiedDateTime: '2024-08-15T14:30:00.0000000Z',
    changeKey: 'wedding_change_key_001',
    '@odata.etag': 'W/"wedding_change_key_001"'
  },
  {
    id: 'engagement_session_002',
    subject: 'Smith Couple - Engagement Photo Session',
    body: {
      contentType: 'text',
      content: 'Pre-wedding engagement photography session in Hyde Park'
    },
    start: {
      dateTime: '2024-09-10T16:00:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    end: {
      dateTime: '2024-09-10T18:00:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    location: {
      displayName: 'Hyde Park - Speaker\'s Corner',
      address: {
        street: 'Hyde Park',
        city: 'London',
        postalCode: 'W2 2UH',
        state: '',
        countryOrRegion: 'United Kingdom'
      }
    },
    attendees: [
      {
        emailAddress: {
          address: 'couple@smithwedding.com',
          name: 'Smith Couple'
        },
        status: {
          response: 'accepted',
          time: '2024-08-20T12:00:00.0000000Z'
        },
        type: 'required'
      }
    ],
    categories: ['Engagement', 'Photography', 'Outdoor'],
    importance: 'normal',
    sensitivity: 'normal',
    showAs: 'busy',
    isAllDay: false,
    type: 'singleInstance',
    createdDateTime: '2024-08-20T11:00:00.0000000Z',
    lastModifiedDateTime: '2024-08-20T11:00:00.0000000Z',
    changeKey: 'engagement_change_key_002'
  },
  {
    id: 'consultation_003',
    subject: 'Brown Wedding - Initial Consultation',
    body: {
      contentType: 'text',
      content: 'First meeting with couple to discuss wedding photography requirements'
    },
    start: {
      dateTime: '2024-09-08T10:00:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    end: {
      dateTime: '2024-09-08T11:30:00.0000000',
      timeZone: 'GMT Standard Time'
    },
    location: {
      displayName: 'Photographer Studio',
      address: {
        street: '456 Photography Street',
        city: 'London',
        postalCode: 'SW1A 2BB',
        state: '',
        countryOrRegion: 'United Kingdom'
      }
    },
    attendees: [
      {
        emailAddress: {
          address: 'couple@brownwedding.com',
          name: 'Brown Couple'
        },
        status: {
          response: 'tentative',
          time: null
        },
        type: 'required'
      }
    ],
    categories: ['Consultation', 'New Client', 'Wedding Planning'],
    importance: 'normal',
    sensitivity: 'normal',
    showAs: 'busy',
    isAllDay: false,
    type: 'singleInstance',
    createdDateTime: '2024-08-25T09:00:00.0000000Z',
    lastModifiedDateTime: '2024-08-25T09:00:00.0000000Z',
    changeKey: 'consultation_change_key_003'
  }
];

// Export additional mock data for testing
export const mockWeddingEventsData = mockWeddingEvents;