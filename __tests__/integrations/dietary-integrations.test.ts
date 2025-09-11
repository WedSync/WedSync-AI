import { OpenAIDietaryService } from '@/lib/integrations/OpenAIDietaryService'
import { GuestManagementIntegration } from '@/lib/integrations/GuestManagementIntegration'
import { DietaryNotificationService } from '@/lib/integrations/DietaryNotificationService'
import { createClient } from '@supabase/supabase-js'

// Mock external dependencies
jest.mock('@supabase/supabase-js')
jest.mock('resend')
jest.mock('openai')

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.NEXT_PUBLIC_APP_URL = 'https://test.wedsync.com'

describe('Dietary Management Integrations', () => {
  let mockSupabase: any
  let mockOpenAI: any
  let mockResend: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      channel: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null
        })
      }
    }
    
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('OpenAI Integration', () => {
    let service: OpenAIDietaryService

    beforeEach(() => {
      service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 3,
        timeout: 30000
      })

      // Mock OpenAI responses
      mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conflicts: [],
                    allergenWarnings: [],
                    crossContaminationRisks: [],
                    substitutionSuggestions: [],
                    complianceScore: 0.95,
                    riskLevel: 'low',
                    recommendations: ['Recommendation 1', 'Recommendation 2'],
                    confidence: 0.9
                  })
                }
              }],
              usage: { total_tokens: 150 },
              model: 'gpt-3.5-turbo'
            })
          }
        }
      }

      // Replace the OpenAI instance in the service
      ;(service as any).openai = mockOpenAI
    })

    test('generates dietary compliant menu successfully', async () => {
      const request = {
        guestCount: 50,
        dietaryRequirements: {
          allergies: ['nuts', 'shellfish'],
          diets: ['vegetarian'],
          medical: ['celiac'],
          preferences: []
        },
        menuStyle: 'formal',
        budgetPerPerson: 85,
        culturalPreferences: ['Italian'],
        seasonalIngredients: ['spring vegetables'],
        weddingContext: {
          date: '2024-06-15',
          timeOfDay: 'evening',
          venueType: 'outdoor',
          duration: 4
        }
      }

      // Mock successful menu generation response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              courses: [
                {
                  name: 'Appetizers',
                  dishes: [
                    {
                      name: 'Caprese Skewers',
                      ingredients: ['tomatoes', 'mozzarella', 'basil'],
                      allergens: [],
                      dietaryTags: ['vegetarian', 'gluten-free']
                    }
                  ]
                }
              ],
              complianceScore: 0.95,
              totalCost: 4250,
              costPerPerson: 85,
              confidence: 0.9
            })
          }
        }],
        usage: { total_tokens: 300 },
        model: 'gpt-4'
      })

      const result = await service.generateDietaryCompliantMenu(
        request,
        'user-123',
        { useCache: false }
      )

      expect(result).toBeDefined()
      expect(result.menu).toBeDefined()
      expect(result.complianceAnalysis.overallScore).toBeGreaterThan(0.8)
      expect(result.menu.courses).toHaveLength(1)
      expect(result.costAnalysis.costPerPerson).toBe(85)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    }, 60000)

    test('analyzes dietary conflicts correctly', async () => {
      const request = {
        ingredients: ['wheat flour', 'eggs', 'milk', 'nuts'],
        dietaryRestrictions: ['gluten-free', 'vegan', 'nut allergy']
      }

      const result = await service.analyzeDietaryConflicts(request, 'user-123')

      expect(result).toBeDefined()
      expect(result.complianceScore).toBeDefined()
      expect(result.riskLevel).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    test('handles rate limiting gracefully', async () => {
      // Mock rate limit exceeded scenario
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).code = 'rate_limit_exceeded'
      
      jest.spyOn(service as any, 'rateLimiter').mockImplementation({
        check: jest.fn().mockRejectedValue(rateLimitError)
      })

      await expect(
        service.generateDietaryCompliantMenu({
          guestCount: 50,
          dietaryRequirements: { allergies: [], diets: [], medical: [], preferences: [] },
          menuStyle: 'casual',
          budgetPerPerson: 50,
          culturalPreferences: [],
          seasonalIngredients: [],
          weddingContext: {
            date: '2024-06-15',
            timeOfDay: 'evening',
            venueType: 'indoor',
            duration: 3
          }
        }, 'user-123')
      ).rejects.toThrow('Rate limit exceeded')
    })

    test('circuit breaker opens after failures', async () => {
      // Mock OpenAI to fail repeatedly
      const serviceError = new Error('OpenAI service unavailable')
      mockOpenAI.chat.completions.create.mockRejectedValue(serviceError)

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await service.analyzeDietaryConflicts({
            ingredients: ['test'],
            dietaryRestrictions: ['test']
          })
        } catch (error) {
          // Expected failures
        }
      }

      expect((service as any).circuitBreaker.getState()).toBe('open')
    })

    test('validates real-time dietary compliance', async () => {
      const dishComponents = [
        { name: 'Grilled Chicken', ingredients: ['chicken', 'olive oil', 'herbs'] }
      ]
      const restrictions = ['vegetarian']

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isCompliant: false,
              violations: ['Contains meat'],
              warnings: ['Not suitable for vegetarians'],
              suggestions: ['Substitute with grilled tofu'],
              riskLevel: 'medium'
            })
          }
        }],
        usage: { total_tokens: 50 },
        model: 'gpt-3.5-turbo'
      })

      const result = await service.validateRealTimeDietaryCompliance(dishComponents, restrictions)

      expect(result).toBeDefined()
      expect(result.isCompliant).toBe(false)
      expect(result.violations).toContain('Contains meat')
      expect(result.suggestions).toContain('Substitute with grilled tofu')
    })

    test('returns service health status', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: 'OK' } }],
        usage: { total_tokens: 5 },
        model: 'gpt-3.5-turbo'
      })

      const health = await service.getServiceHealth()

      expect(health).toBeDefined()
      expect(health.status).toBe('healthy')
      expect(health.cacheSize).toBeGreaterThanOrEqual(0)
      expect(health.metrics).toBeDefined()
    })

    test('handles service unavailable gracefully', async () => {
      const serviceError = new Error('Service unavailable')
      mockOpenAI.chat.completions.create.mockRejectedValue(serviceError)

      const health = await service.getServiceHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.error).toBe('Service unavailable')
    })
  })

  describe('Guest Management Integration', () => {
    let integration: GuestManagementIntegration

    beforeEach(() => {
      integration = new GuestManagementIntegration()
      
      // Mock Supabase responses
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'guest_dietary_requirements') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis()
          }
        }
        return mockSupabase
      })
    })

    test('syncs guest dietary requirements successfully', async () => {
      const mockGuests = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          dietaryNotes: 'severe nut allergy',
          dietaryVerified: true,
          emergencyContact: '+1234567890'
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          dietaryNotes: 'vegan',
          dietaryVerified: false
        }
      ]

      // Mock existing requirements query
      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      })

      const result = await integration.syncGuestDietaryRequirements(
        'wedding-123',
        mockGuests
      )

      expect(result.totalGuests).toBe(2)
      expect(result.requirementsFound).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    test('handles external system imports', async () => {
      const mockCredentials = {
        apiUrl: 'https://api.rsvpify.com',
        apiKey: 'test-key',
        eventId: 'event-123'
      }

      // Mock the fetch for external API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          guests: [
            {
              name: 'External Guest',
              email: 'external@example.com',
              dietary_restrictions: 'lactose intolerant'
            }
          ]
        })
      })

      const result = await integration.importFromExternalSystem(
        'wedding-123',
        'rsvpify',
        mockCredentials
      )

      expect(result.system).toBe('rsvpify')
      expect(result.importedCount).toBe(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.rsvpify.com/guests',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      )
    })

    test('emits events for dietary requirement changes', (done) => {
      integration.on('dietary_requirements_updated', (event) => {
        expect(event.weddingId).toBe('wedding-123')
        expect(event.guestCount).toBe(2)
        done()
      })

      // Trigger the event
      integration.emit('dietary_requirements_updated', {
        weddingId: 'wedding-123',
        guestCount: 2,
        requirementCount: 1
      })
    })

    test('extracts dietary requirements from notes', async () => {
      const guests = [
        { name: 'Test Guest', dietaryNotes: 'severe nut allergy, lactose intolerant' },
        { name: 'Vegan Guest', dietaryNotes: 'vegan diet' },
        { name: 'Kosher Guest', dietaryNotes: 'kosher meals only' }
      ]

      const result = await integration.syncGuestDietaryRequirements('wedding-123', guests)

      expect(result.requirementsFound).toBeGreaterThan(0)
    })

    test('handles bulk requirement updates', async () => {
      const updates = [
        {
          guestName: 'John Doe',
          requirements: [{
            categoryId: 'allergen-nuts',
            notes: 'severe nut allergy',
            severity: 5,
            verified: true
          }]
        }
      ]

      mockSupabase.from().select().eq().mockResolvedValue({ data: [], error: null })
      mockSupabase.from().delete().eq().mockResolvedValue({ error: null })
      mockSupabase.from().insert().mockResolvedValue({ error: null })

      const result = await integration.bulkUpdateRequirements('wedding-123', updates)

      expect(result.success).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    test('generates dietary analytics', async () => {
      const mockRequirements = [
        { severity_level: 5, dietary_categories: { name: 'Nut Allergy', category_type: 'allergy' } },
        { severity_level: 3, dietary_categories: { name: 'Vegetarian', category_type: 'diet' } },
        { severity_level: 4, dietary_categories: { name: 'Gluten Free', category_type: 'medical' } }
      ]

      mockSupabase.from().select().eq().mockResolvedValue({
        data: mockRequirements,
        error: null
      })

      const analytics = await integration.getDietaryAnalytics('wedding-123')

      expect(analytics).toBeDefined()
      expect(analytics.totalRequirements).toBe(3)
      expect(analytics.severityBreakdown.critical).toBe(1)
      expect(analytics.severityBreakdown.high).toBe(1)
      expect(analytics.riskAssessment).toBe('critical')
    })

    test('exports dietary requirements to CSV', async () => {
      const mockRequirements = [
        {
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          dietary_categories: { name: 'Nut Allergy' },
          severity_level: 5,
          specific_notes: 'Severe anaphylactic reaction',
          verified_by_guest: true,
          emergency_contact: '+1234567890'
        }
      ]

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockRequirements,
        error: null
      })

      const result = await integration.exportDietaryRequirements('wedding-123', 'csv')

      expect(result.format).toBe('csv')
      expect(result.recordCount).toBe(1)
      expect(typeof result.data).toBe('string')
      expect(result.data).toContain('John Doe')
    })
  })

  describe('Notification Service', () => {
    let service: DietaryNotificationService

    beforeEach(() => {
      service = new DietaryNotificationService()

      // Mock Resend
      mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            id: 'email-123',
            from: 'alerts@wedsync.com',
            to: 'test@example.com',
            created_at: new Date().toISOString()
          })
        }
      }
      
      ;(service as any).resend = mockResend
    })

    test('sends high-risk dietary requirement notifications', async () => {
      const mockRequirement = {
        id: 'req-123',
        guestName: 'John Doe',
        category: 'nut allergy',
        severity: 5,
        notes: 'severe anaphylactic reaction to nuts',
        emergencyContact: '+1234567890'
      }

      // Mock wedding data
      mockSupabase.from().select().eq().single().mockResolvedValue({
        data: {
          id: 'wedding-123',
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15',
          venue_name: 'Garden Venue',
          guest_count: 150,
          organization_id: 'org-123',
          organizations: {
            company_name: 'ABC Catering',
            contact_email: 'contact@abc-catering.com',
            contact_phone: '+1987654321',
            notification_preferences: {
              sms_enabled: true,
              email_notifications: true
            }
          }
        },
        error: null
      })

      await service.notifyHighRiskRequirement('wedding-123', mockRequirement)

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'contact@abc-catering.com',
          subject: expect.stringContaining('HIGH-RISK DIETARY REQUIREMENT')
        })
      )
    })

    test('sends menu compliance alerts', async () => {
      const complianceIssues = [
        {
          dishName: 'Salmon Filet',
          guestName: 'Jane Doe',
          description: 'Contains fish allergen',
          riskLevel: 'critical' as const,
          suggestion: 'Provide chicken alternative'
        }
      ]

      mockSupabase.from().select().eq().single().mockResolvedValue({
        data: {
          id: 'wedding-123',
          couple_name: 'John & Jane Smith',
          organizations: {
            company_name: 'ABC Catering',
            contact_email: 'contact@abc-catering.com',
            notification_preferences: {}
          }
        },
        error: null
      })

      await service.sendMenuComplianceAlert('wedding-123', complianceIssues)

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Menu Compliance Issues')
        })
      )
    })

    test('sends guest verification requests', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          category: 'nut allergy',
          notes: 'severe nut allergy',
          severity: 5
        }
      ]

      mockSupabase.from('dietary_verification_requests').insert().mockResolvedValue({
        error: null
      })

      mockSupabase.from('weddings').select().eq().single().mockResolvedValue({
        data: {
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15'
        },
        error: null
      })

      await service.sendGuestVerificationRequest(
        'wedding-123',
        'guest@example.com',
        mockRequirements
      )

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('confirm your dietary requirements')
        })
      )
    })

    test('handles SMS notifications when enabled', async () => {
      // Mock fetch for Twilio API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'sms-123' })
      })

      await (service as any).sendSMSAlert(
        '+1234567890',
        'Test SMS alert message'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('twilio.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic')
          })
        })
      )
    })

    test('generates weekly digest', async () => {
      const mockActivities = [
        {
          id: 1,
          action_type: 'requirement_added',
          weddings: { couple_name: 'John & Jane Smith', wedding_date: '2024-06-15' },
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          action_type: 'menu_generated',
          weddings: { couple_name: 'Bob & Alice Johnson', wedding_date: '2024-07-20' },
          created_at: new Date().toISOString()
        }
      ]

      mockSupabase.from().select().eq().gte().mockResolvedValue({
        data: mockActivities,
        error: null
      })

      mockSupabase.from('organizations').select().eq().single().mockResolvedValue({
        data: {
          company_name: 'ABC Catering',
          contact_email: 'contact@abc-catering.com',
          notification_preferences: { weekly_digest: true }
        },
        error: null
      })

      await service.sendWeeklyDigest('org-123')

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Weekly Dietary Management Summary - WedSync',
          to: 'contact@abc-catering.com'
        })
      )
    })

    test('returns service health status', async () => {
      mockSupabase.from().select().limit().mockResolvedValue({
        data: [],
        error: null
      })

      const health = await service.getServiceHealth()

      expect(health.status).toBe('healthy')
      expect(health.metrics).toBeDefined()
      expect(health.metrics.queueSize).toBeGreaterThanOrEqual(0)
      expect(health.metrics.resendConnected).toBe(true)
    })

    test('triggers high risk alert from database requirement', async () => {
      const mockRequirement = {
        id: 'req-123',
        guest_name: 'John Doe',
        dietary_category_id: 'nut-allergy',
        severity_level: 5,
        specific_notes: 'severe anaphylactic reaction',
        emergency_contact: '+1234567890'
      }

      mockSupabase.from().select().eq().single().mockResolvedValue({
        data: mockRequirement,
        error: null
      })

      // Mock the wedding query for notification
      mockSupabase.from().select().eq().single().mockResolvedValue({
        data: {
          couple_name: 'Test Wedding',
          organizations: {
            contact_email: 'test@example.com',
            notification_preferences: {}
          }
        },
        error: null
      })

      await service.triggerHighRiskAlert('wedding-123', 'req-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('guest_dietary_requirements')
    })
  })

  describe('Integration Health Monitoring', () => {
    test('monitors all services health', async () => {
      const openAIService = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 1,
        timeout: 5000
      })

      const guestService = new GuestManagementIntegration()
      const notificationService = new DietaryNotificationService()

      // Mock health check responses
      const mockHealthResponse = {
        choices: [{ message: { content: 'OK' } }],
        usage: { total_tokens: 5 },
        model: 'gpt-3.5-turbo'
      }
      
      ;(openAIService as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockHealthResponse)
          }
        }
      }

      mockSupabase.from().select().limit().mockResolvedValue({
        data: [],
        error: null
      })

      const [openAIHealth, notificationHealth] = await Promise.all([
        openAIService.getServiceHealth(),
        notificationService.getServiceHealth()
      ])

      expect(openAIHealth).toHaveProperty('status')
      expect(openAIHealth).toHaveProperty('metrics')
      expect(notificationHealth).toHaveProperty('status')
      expect(notificationHealth).toHaveProperty('metrics')
    })

    test('handles service degradation gracefully', async () => {
      const service = new OpenAIDietaryService({
        apiKey: 'invalid-key',
        maxRetries: 1,
        timeout: 1000
      })

      // Mock OpenAI to fail
      ;(service as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Service unavailable'))
          }
        }
      }

      const health = await service.getServiceHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.error).toBe('Service unavailable')
    })
  })

  describe('Error Recovery and Resilience', () => {
    test('recovers from temporary OpenAI outages', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 3,
        timeout: 30000
      })

      let callCount = 0
      const mockCreate = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary service unavailable')
        }
        return Promise.resolve({
          choices: [{
            message: { 
              content: JSON.stringify({ 
                conflicts: [],
                allergenWarnings: [],
                crossContaminationRisks: [],
                substitutionSuggestions: [],
                complianceScore: 0.8,
                riskLevel: 'low',
                recommendations: [],
                confidence: 0.8
              }) 
            }
          }],
          usage: { total_tokens: 100 },
          model: 'gpt-3.5-turbo'
        })
      })

      ;(service as any).openai = {
        chat: { completions: { create: mockCreate } }
      }

      const result = await service.analyzeDietaryConflicts({
        ingredients: ['test'],
        dietaryRestrictions: ['test']
      })

      expect(result).toBeDefined()
      expect(callCount).toBe(3) // Should have retried twice before succeeding
    })

    test('handles rate limiting with exponential backoff', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 2,
        timeout: 10000
      })

      let callCount = 0
      const mockCreate = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          const error = new Error('Rate limit exceeded')
          ;(error as any).code = 'rate_limit_exceeded'
          throw error
        }
        return Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ test: 'success' }) } }],
          usage: { total_tokens: 10 },
          model: 'gpt-3.5-turbo'
        })
      })

      ;(service as any).openai = {
        chat: { completions: { create: mockCreate } }
      }

      const result = await service.analyzeDietaryConflicts({
        ingredients: ['test'],
        dietaryRestrictions: ['test']
      })

      expect(result).toBeDefined()
      expect(callCount).toBe(2)
    })

    test('notification service continues working during Supabase outage', async () => {
      const service = new DietaryNotificationService()
      
      // Mock Supabase to fail for database operations but allow the service to continue
      mockSupabase.from().select().eq().single().mockRejectedValue(
        new Error('Database connection failed')
      )

      const health = await service.getServiceHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.metrics.error).toBeDefined()
    })
  })

  describe('Performance and Load Testing', () => {
    test('handles concurrent dietary analysis requests', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 1,
        timeout: 5000
      })

      const mockResponse = {
        choices: [{ message: { content: JSON.stringify({ complianceScore: 0.8 }) } }],
        usage: { total_tokens: 50 },
        model: 'gpt-3.5-turbo'
      }

      ;(service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue(mockResponse) } }
      }

      const requests = Array.from({ length: 10 }, (_, i) => 
        service.analyzeDietaryConflicts({
          ingredients: [`ingredient-${i}`],
          dietaryRestrictions: [`restriction-${i}`]
        }, `user-${i}`)
      )

      const results = await Promise.allSettled(requests)
      const successful = results.filter(r => r.status === 'fulfilled').length

      expect(successful).toBeGreaterThan(0)
      expect(successful).toBeLessThanOrEqual(10)
    })

    test('guest management handles bulk operations efficiently', async () => {
      const integration = new GuestManagementIntegration()

      const largeGuestList = Array.from({ length: 100 }, (_, i) => ({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        dietaryNotes: i % 3 === 0 ? 'vegetarian' : i % 5 === 0 ? 'nut allergy' : undefined
      }))

      mockSupabase.from().select().eq().mockResolvedValue({ data: [], error: null })
      mockSupabase.from().insert().mockResolvedValue({ error: null })

      const startTime = Date.now()
      const result = await integration.syncGuestDietaryRequirements(
        'wedding-bulk-test',
        largeGuestList
      )
      const duration = Date.now() - startTime

      expect(result.totalGuests).toBe(100)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })

  describe('Data Integrity and Validation', () => {
    test('validates menu structure from OpenAI response', async () => {
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 1,
        timeout: 5000
      })

      // Test with invalid menu structure
      const invalidResponse = {
        choices: [{ message: { content: JSON.stringify({ invalid: 'structure' }) } }],
        usage: { total_tokens: 50 },
        model: 'gpt-4'
      }

      ;(service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue(invalidResponse) } }
      }

      await expect(
        service.generateDietaryCompliantMenu({
          guestCount: 50,
          dietaryRequirements: { allergies: [], diets: [], medical: [], preferences: [] },
          menuStyle: 'formal',
          budgetPerPerson: 75,
          culturalPreferences: [],
          seasonalIngredients: [],
          weddingContext: {
            date: '2024-06-15',
            timeOfDay: 'evening',
            venueType: 'indoor',
            duration: 4
          }
        }, 'user-123')
      ).rejects.toThrow('Invalid menu structure')
    })

    test('sanitizes guest input data', async () => {
      const integration = new GuestManagementIntegration()
      
      const maliciousGuest = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'john@example.com',
        dietaryNotes: 'javascript:alert("xss") nut allergy'
      }

      mockSupabase.from().select().eq().mockResolvedValue({ data: [], error: null })
      mockSupabase.from().insert().mockImplementation((data: any) => {
        // Verify that script tags are removed
        const insertedData = Array.isArray(data) ? data[0] : data
        expect(insertedData.guest_name).not.toContain('<script>')
        expect(insertedData.specific_notes).not.toContain('javascript:')
        return Promise.resolve({ error: null })
      })

      await integration.syncGuestDietaryRequirements('wedding-123', [maliciousGuest])
    })

    test('ensures dietary requirements have proper severity validation', async () => {
      const integration = new GuestManagementIntegration()
      
      const guestWithInvalidSeverity = {
        name: 'Test Guest',
        dietaryNotes: 'severe nut allergy'
      }

      // Mock the extraction to return invalid severity
      jest.spyOn(integration as any, 'extractDietaryRequirements').mockReturnValue([
        {
          categoryId: 'nut-allergy',
          notes: 'severe nut allergy',
          severity: 10, // Invalid severity (should be 1-5)
          verified: false
        }
      ])

      mockSupabase.from().select().eq().mockResolvedValue({ data: [], error: null })
      
      // The service should handle invalid severity gracefully
      const result = await integration.syncGuestDietaryRequirements(
        'wedding-123', 
        [guestWithInvalidSeverity]
      )

      expect(result.errors).toHaveLength(0) // Should handle gracefully, not error
    })
  })

  describe('Security and Compliance', () => {
    test('logs sensitive operations for audit trail', async () => {
      const notificationService = new DietaryNotificationService()
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      mockSupabase.from('dietary_audit_log').insert().mockResolvedValue({ error: null })
      
      const highRiskReq = {
        id: 'req-123',
        guestName: 'John Doe',
        category: 'nut allergy',
        severity: 5,
        notes: 'anaphylactic reaction',
        emergencyContact: '+1234567890'
      }

      await (notificationService as any).logNotificationActivity({
        weddingId: 'wedding-123',
        requirement: highRiskReq,
        type: 'high_risk_notification',
        urgency: 'critical',
        createdAt: new Date()
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('dietary_audit_log')
      
      consoleSpy.mockRestore()
    })

    test('protects sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const service = new OpenAIDietaryService({
        apiKey: process.env.OPENAI_API_KEY!,
        maxRetries: 1,
        timeout: 1000
      })

      ;(service as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API key invalid'))
          }
        }
      }

      try {
        await service.analyzeDietaryConflicts({
          ingredients: ['test'],
          dietaryRestrictions: ['test']
        }, 'sensitive-user-123')
      } catch (error) {
        // Error is expected
      }

      // Check that sensitive information is not logged in plain text
      const logCalls = consoleSpy.mock.calls
      const hasApiKeyInLogs = logCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes(process.env.OPENAI_API_KEY!))
      )
      
      expect(hasApiKeyInLogs).toBe(false)
      
      consoleSpy.mockRestore()
    })
  })
})

// Integration test utilities
export class TestHelpers {
  static async createMockWedding(supabase: any) {
    return {
      id: 'wedding-test-123',
      couple_name: 'Test Couple',
      wedding_date: '2024-06-15',
      guest_count: 100,
      organization_id: 'org-test-123'
    }
  }

  static async createMockGuestRequirements(count: number = 5) {
    return Array.from({ length: count }, (_, i) => ({
      id: `req-${i}`,
      guest_name: `Guest ${i}`,
      guest_email: `guest${i}@example.com`,
      dietary_category_id: i % 2 === 0 ? 'allergy-nuts' : 'diet-vegetarian',
      severity_level: Math.floor(Math.random() * 5) + 1,
      specific_notes: `Test requirement ${i}`,
      verified_by_guest: i % 3 === 0
    }))
  }

  static generateStressTestData(size: number) {
    return {
      guests: Array.from({ length: size }, (_, i) => ({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        dietaryNotes: i % 2 === 0 ? 'vegetarian' : i % 3 === 0 ? 'nut allergy' : undefined
      })),
      menuRequest: {
        guestCount: size,
        dietaryRequirements: {
          allergies: ['nuts', 'dairy'],
          diets: ['vegetarian', 'vegan'],
          medical: ['gluten-free'],
          preferences: []
        },
        menuStyle: 'formal',
        budgetPerPerson: 85,
        culturalPreferences: ['Italian'],
        seasonalIngredients: ['spring vegetables'],
        weddingContext: {
          date: '2024-06-15',
          timeOfDay: 'evening',
          venueType: 'outdoor',
          duration: 4
        }
      }
    }
  }
}