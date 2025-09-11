// Wedding Test Data Factory
// File: wedding-test-data.ts
// Purpose: Generate realistic wedding professional test data for OAuth testing

export class WeddingEventFactory {
  static createPhotographySession(weddingDate: string, venue: string) {
    return {
      id: `photo_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: `${venue} Wedding - Photography Session`,
      start: {
        dateTime: weddingDate + 'T10:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      end: {
        dateTime: weddingDate + 'T18:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      location: {
        displayName: venue,
        address: {
          street: '123 Wedding Venue Street',
          city: 'London',
          postalCode: 'SW1A 1AA',
          country: 'UK'
        }
      },
      categories: ['Wedding', 'Photography', 'Client Work'],
      sensitivity: 'private',
      isAllDay: false,
      importance: 'high',
      body: {
        contentType: 'html',
        content: `<div>
          <h3>Photography Session Details</h3>
          <p><strong>Venue:</strong> ${venue}</p>
          <p><strong>Duration:</strong> 8 hours</p>
          <p><strong>Package:</strong> Full Wedding Photography</p>
          <p><strong>Equipment:</strong> Canon R5, Sony A7IV, Lighting Kit</p>
        </div>`
      },
      attendees: [
        {
          emailAddress: {
            address: 'bride@example.com',
            name: 'Wedding Couple'
          },
          type: 'required'
        }
      ]
    };
  }

  static createVenueCoordinationEvent(weddingDate: string, tasks: string[]) {
    return {
      id: `venue_coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: 'Wedding Coordination - Setup & Management',
      start: {
        dateTime: weddingDate + 'T06:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      end: {
        dateTime: weddingDate + 'T22:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      location: {
        displayName: 'Wedding Venue - All Areas',
        address: {
          street: '456 Venue Street',
          city: 'London',
          postalCode: 'SW1A 2BB',
          country: 'UK'
        }
      },
      body: {
        contentType: 'text',
        content: `Wedding coordination tasks: ${tasks.join(', ')}`
      },
      categories: ['Wedding', 'Venue', 'Coordination'],
      showAs: 'busy',
      importance: 'high',
      attendees: [
        {
          emailAddress: {
            address: 'couple@wedding.com',
            name: 'Wedding Couple'
          },
          type: 'required'
        },
        {
          emailAddress: {
            address: 'vendors@wedding.com',
            name: 'Wedding Vendors'
          },
          type: 'optional'
        }
      ]
    };
  }

  static createWeddingEvent(overrides = {}) {
    const baseEvent = {
      id: `wedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: 'Johnson Wedding Celebration',
      start: {
        dateTime: '2024-09-15T14:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      end: {
        dateTime: '2024-09-15T22:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      location: {
        displayName: 'Riverside Gardens',
        address: {
          street: '123 Wedding Lane',
          city: 'London',
          postalCode: 'SW1A 1AA',
          country: 'UK'
        }
      },
      attendees: [
        {
          emailAddress: {
            address: 'emma@example.com',
            name: 'Emma Johnson'
          },
          type: 'required'
        },
        {
          emailAddress: {
            address: 'james@example.com',
            name: 'James Johnson'
          },
          type: 'required'
        }
      ],
      body: {
        contentType: 'html',
        content: `
          <h3>Johnson Wedding Details</h3>
          <p><strong>Couple:</strong> Emma & James Johnson</p>
          <p><strong>Guest Count:</strong> 120</p>
          <p><strong>Theme:</strong> Rustic Garden</p>
          <p><strong>Special Requirements:</strong> Vegetarian options, wheelchair accessible</p>
        `
      },
      categories: ['Wedding', 'Ceremony', 'Reception'],
      sensitivity: 'private',
      showAs: 'busy',
      importance: 'high',
      isAllDay: false,
      recurrence: null,
      reminder: {
        minutesBeforeStart: 60
      },
      weddingMetadata: {
        coupleNames: ['Emma Johnson', 'James Johnson'],
        guestCount: 120,
        weddingStyle: 'rustic_garden',
        budget: 15000,
        vendors: [
          { type: 'photographer', name: 'Moments Photography', contact: 'sarah@momentsphotography.com' },
          { type: 'caterer', name: 'Garden Fresh Catering', contact: 'info@gardenfresh.com' },
          { type: 'florist', name: 'Bloom & Blossom', contact: 'hello@bloomblossom.com' },
          { type: 'dj', name: 'Perfect Beats DJ', contact: 'dj@perfectbeats.com' }
        ],
        timeline: [
          { time: '14:00', activity: 'Guest Arrival' },
          { time: '14:30', activity: 'Ceremony' },
          { time: '15:00', activity: 'Cocktail Hour' },
          { time: '16:30', activity: 'Wedding Breakfast' },
          { time: '19:00', activity: 'Speeches' },
          { time: '20:00', activity: 'First Dance' },
          { time: '22:00', activity: 'Evening Reception End' }
        ]
      }
    };

    return { ...baseEvent, ...overrides };
  }

  static createConflictScenario() {
    const primaryWedding = this.createWeddingEvent({
      id: 'primary_wedding_123',
      subject: 'Smith Wedding - Primary Booking',
      start: { dateTime: '2024-09-15T12:00:00.0000000', timeZone: 'GMT Standard Time' },
      end: { dateTime: '2024-09-15T20:00:00.0000000', timeZone: 'GMT Standard Time' },
      importance: 'high',
      categories: ['Wedding', 'Confirmed', 'Photography']
    });

    const conflictingWedding = this.createWeddingEvent({
      id: 'conflicting_wedding_456',
      subject: 'Brown Wedding - Conflicting Inquiry',
      start: { dateTime: '2024-09-15T16:00:00.0000000', timeZone: 'GMT Standard Time' },
      end: { dateTime: '2024-09-16T00:00:00.0000000', timeZone: 'GMT Standard Time' },
      importance: 'normal',
      categories: ['Wedding', 'Tentative', 'Photography']
    });

    return { 
      primaryWedding, 
      conflictingWedding,
      conflictType: 'time_overlap',
      conflictSeverity: 'high',
      resolutionOptions: ['reschedule_inquiry', 'decline_inquiry', 'find_second_photographer']
    };
  }

  static createPeakSeasonSchedule() {
    const peakMonths = [5, 6, 7, 8, 9, 10]; // May to October
    const events = [];

    peakMonths.forEach(month => {
      for (let day = 1; day <= 30; day += 7) { // Every Saturday
        const saturday = new Date(2024, month - 1, day);
        if (saturday.getDay() === 6) { // Ensure it's Saturday
          events.push(
            this.createWeddingEvent({
              id: `peak_wedding_${month}_${day}`,
              subject: `Peak Season Wedding ${month}-${day} - Full Photography`,
              start: {
                dateTime: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T14:00:00.0000000`,
                timeZone: 'GMT Standard Time'
              },
              end: {
                dateTime: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T22:00:00.0000000`,
                timeZone: 'GMT Standard Time'
              },
              categories: ['Wedding', 'Peak Season', 'Confirmed', 'Photography'],
              importance: 'high'
            })
          );
        }
      }
    });

    return events;
  }

  static createEngagementSession() {
    return {
      id: `engagement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: 'Couple Engagement Session',
      start: {
        dateTime: '2024-08-15T16:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      end: {
        dateTime: '2024-08-15T18:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      location: {
        displayName: 'Hyde Park - Engagement Photography',
        address: {
          street: 'Hyde Park',
          city: 'London',
          postalCode: 'W2 2UH',
          country: 'UK'
        }
      },
      categories: ['Engagement', 'Photography', 'Outdoor Session'],
      body: {
        content: 'Pre-wedding engagement photography session. Natural lighting, casual outfits, 2-hour duration.',
        contentType: 'text'
      },
      importance: 'normal',
      showAs: 'busy'
    };
  }

  static createClientConsultation() {
    return {
      id: `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: 'Wedding Photography Consultation',
      start: {
        dateTime: '2024-07-10T10:00:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      end: {
        dateTime: '2024-07-10T11:30:00.0000000',
        timeZone: 'GMT Standard Time'
      },
      location: {
        displayName: 'Photography Studio',
        address: {
          street: '789 Photography Street',
          city: 'London',
          postalCode: 'SW1A 3CC',
          country: 'UK'
        }
      },
      categories: ['Consultation', 'New Client', 'Meeting'],
      body: {
        content: 'Initial consultation to discuss wedding photography package, timeline, and requirements.',
        contentType: 'text'
      },
      importance: 'normal',
      attendees: [
        {
          emailAddress: {
            address: 'newcouple@email.com',
            name: 'Potential Wedding Couple'
          },
          type: 'required'
        }
      ]
    };
  }
}

export class OAuthTestDataFactory {
  static createMockTokens(overrides = {}) {
    const baseTokens = {
      access_token: `mock_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refresh_token: `mock_refresh_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://graph.microsoft.com/calendars.readwrite https://graph.microsoft.com/user.read',
      issued_at: Date.now(),
      expires_at: Date.now() + (3600 * 1000),
      id_token: `mock_id_token_${Date.now()}`
    };

    return { ...baseTokens, ...overrides };
  }

  static createMockUserProfile(overrides = {}) {
    const baseProfile = {
      id: `mock_user_id_${Date.now()}`,
      displayName: 'Sarah Wedding Photographer',
      givenName: 'Sarah',
      surname: 'Photography',
      userPrincipalName: 'sarah@weddingphotography.com',
      mail: 'sarah@weddingphotography.com',
      jobTitle: 'Professional Wedding Photographer',
      businessPhones: ['+44 7700 900123'],
      officeLocation: 'London, UK',
      mobilePhone: '+44 7700 900123',
      preferredLanguage: 'en-GB',
      userType: 'Member'
    };

    return { ...baseProfile, ...overrides };
  }

  static createMockCalendars() {
    return {
      '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars',
      value: [
        {
          id: `calendar_wedding_bookings_${Date.now()}`,
          name: 'Wedding Bookings',
          color: 'lightGreen',
          hexColor: '#90EE90',
          canEdit: true,
          canShare: true,
          canViewPrivateItems: true,
          changeKey: `wedding_calendar_change_key_${Date.now()}`,
          owner: {
            name: 'Sarah Photography',
            address: 'sarah@weddingphotography.com'
          }
        },
        {
          id: `calendar_engagement_sessions_${Date.now()}`,
          name: 'Engagement Sessions',
          color: 'lightBlue',
          hexColor: '#ADD8E6',
          canEdit: true,
          canShare: false,
          canViewPrivateItems: true,
          changeKey: `engagement_calendar_change_key_${Date.now()}`,
          owner: {
            name: 'Sarah Photography',
            address: 'sarah@weddingphotography.com'
          }
        },
        {
          id: `calendar_personal_${Date.now()}`,
          name: 'Personal',
          color: 'auto',
          hexColor: null,
          canEdit: true,
          canShare: false,
          canViewPrivateItems: true,
          changeKey: `personal_calendar_change_key_${Date.now()}`,
          owner: {
            name: 'Sarah Photography',
            address: 'sarah@weddingphotography.com'
          }
        }
      ]
    };
  }

  static createMockOAuthError(errorType: 'invalid_grant' | 'access_denied' | 'server_error' = 'invalid_grant') {
    const errors = {
      invalid_grant: {
        error: 'invalid_grant',
        error_description: 'The provided authorization grant is invalid, expired, or revoked',
        error_codes: [70011],
        timestamp: new Date().toISOString(),
        trace_id: `trace_${Date.now()}`,
        correlation_id: `correlation_${Date.now()}`
      },
      access_denied: {
        error: 'access_denied',
        error_description: 'The user denied the request',
        state: 'test_state_parameter'
      },
      server_error: {
        error: 'server_error',
        error_description: 'The authorization server encountered an unexpected condition',
        error_codes: [50001],
        timestamp: new Date().toISOString()
      }
    };

    return errors[errorType];
  }

  static createWebhookNotification() {
    return {
      subscriptionId: `subscription_${Date.now()}`,
      subscriptionExpirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      resource: 'me/events/AAMkADAwAAAwAGAAA=',
      resourceData: {
        '@odata.type': '#Microsoft.Graph.Event',
        '@odata.id': 'Users/sarah@weddingphotography.com/Events/AAMkADAwAAAwAGAAA=',
        '@odata.etag': 'W/"DwAAABYAAABmWc/t3+3zS4qzE0j4wCiKAAADa8lk"',
        id: 'AAMkADAwAAAwAGAAA='
      },
      changeType: 'created',
      clientState: 'wedding_webhook_secret',
      tenantId: 'tenant_12345'
    };
  }
}

// Wedding Professional Role-Specific Test Data
export class WeddingProfessionalTestData {
  static createPhotographerTestScenarios() {
    return {
      multipleWeddingsPerDay: [
        WeddingEventFactory.createWeddingEvent({
          subject: 'Morning Wedding - Garden Ceremony',
          start: { dateTime: '2024-09-15T10:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T14:00:00.0000000', timeZone: 'GMT Standard Time' }
        }),
        WeddingEventFactory.createWeddingEvent({
          subject: 'Evening Wedding - Hotel Ballroom',
          start: { dateTime: '2024-09-15T18:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T23:00:00.0000000', timeZone: 'GMT Standard Time' }
        })
      ],
      engagementSessions: [
        WeddingEventFactory.createEngagementSession(),
        WeddingEventFactory.createEngagementSession()
      ],
      clientConsultations: [
        WeddingEventFactory.createClientConsultation()
      ]
    };
  }

  static createVenueCoordinatorTestScenarios() {
    return {
      simultaneousWeddings: [
        WeddingEventFactory.createWeddingEvent({
          subject: 'Johnson Wedding - Main Hall',
          location: { displayName: 'Main Hall - Riverside Gardens' },
          start: { dateTime: '2024-09-15T14:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T22:00:00.0000000', timeZone: 'GMT Standard Time' },
          categories: ['Wedding', 'Main Hall', 'Confirmed']
        }),
        WeddingEventFactory.createWeddingEvent({
          subject: 'Smith Wedding - Garden Pavilion',
          location: { displayName: 'Garden Pavilion - Riverside Gardens' },
          start: { dateTime: '2024-09-15T18:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-16T00:00:00.0000000', timeZone: 'GMT Standard Time' },
          categories: ['Wedding', 'Garden Pavilion', 'Confirmed']
        })
      ],
      vendorCoordination: [
        {
          subject: 'Florist Setup - Johnson Wedding',
          start: { dateTime: '2024-09-15T08:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T11:00:00.0000000', timeZone: 'GMT Standard Time' },
          categories: ['Vendor Setup', 'Florist']
        },
        {
          subject: 'Catering Prep - Johnson Wedding',
          start: { dateTime: '2024-09-15T10:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T13:00:00.0000000', timeZone: 'GMT Standard Time' },
          categories: ['Vendor Setup', 'Catering']
        }
      ]
    };
  }

  static createWeddingPlannerTestScenarios() {
    return {
      multiClientCoordination: [
        WeddingEventFactory.createWeddingEvent({
          subject: 'Johnson Wedding - Timeline Review',
          categories: ['Client Meeting', 'Timeline Planning']
        }),
        WeddingEventFactory.createWeddingEvent({
          subject: 'Smith Wedding - Vendor Coordination',
          categories: ['Vendor Meeting', 'Coordination']
        })
      ],
      emergencyHandling: [
        WeddingEventFactory.createWeddingEvent({
          subject: 'URGENT: Brown Wedding - Weather Contingency',
          importance: 'high',
          categories: ['Emergency', 'Weather', 'Contingency Plan'],
          body: {
            content: 'Emergency meeting to discuss indoor ceremony options due to weather forecast',
            contentType: 'text'
          }
        })
      ]
    };
  }
}

// Conflict Resolution Test Scenarios
export class ConflictResolutionTestData {
  static createTimeConflictScenarios() {
    return {
      partialOverlap: WeddingEventFactory.createConflictScenario(),
      completeOverlap: {
        primaryWedding: WeddingEventFactory.createWeddingEvent({
          start: { dateTime: '2024-09-15T14:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T22:00:00.0000000', timeZone: 'GMT Standard Time' }
        }),
        conflictingWedding: WeddingEventFactory.createWeddingEvent({
          start: { dateTime: '2024-09-15T14:00:00.0000000', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T22:00:00.0000000', timeZone: 'GMT Standard Time' }
        })
      }
    };
  }

  static createResourceConflictScenarios() {
    return {
      venueDoubleBooking: [
        WeddingEventFactory.createWeddingEvent({
          subject: 'Wedding A - Main Hall',
          location: { displayName: 'Main Hall' }
        }),
        WeddingEventFactory.createWeddingEvent({
          subject: 'Wedding B - Main Hall (CONFLICT)',
          location: { displayName: 'Main Hall' }
        })
      ],
      photographerDoubleBooking: [
        WeddingEventFactory.createPhotographySession('2024-09-15', 'Venue A'),
        WeddingEventFactory.createPhotographySession('2024-09-15', 'Venue B')
      ]
    };
  }
}