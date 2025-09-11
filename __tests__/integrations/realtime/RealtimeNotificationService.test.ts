import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { RealtimeNotificationService } from '@/lib/integrations/realtime/RealtimeNotificationService'
import type { 
  RealtimeEventType, 
  NotificationRecipient,
  FormResponseData,
  JourneyProgressData
} from '@/types/realtime-integration'

// Mock services
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  channel: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis()
}

const mockEmailService = {
  sendTemplate: vi.fn().mockResolvedValue(true)
}

const mockSlackService = {
  sendMessage: vi.fn().mockResolvedValue(true)
}

const mockSMSService = {
  sendMessage: vi.fn().mockResolvedValue(true)
}

describe('RealtimeNotificationService', () => {
  let notificationService: RealtimeNotificationService
  let consoleLogSpy: MockedFunction<typeof console.log>
  let consoleErrorSpy: MockedFunction<typeof console.error>

  beforeEach(() => {
    vi.clearAllMocks()
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    notificationService = new RealtimeNotificationService(
      mockSupabase as any,
      mockEmailService as any,
      mockSlackService as any,
      mockSMSService as any
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendRealtimeNotification', () => {
    const mockRecipients: NotificationRecipient[] = [
      {
        id: 'user-1',
        name: 'John Photography',
        email: 'john@example.com',
        phone: '+447123456789',
        channels: ['email', 'slack', 'in_app'],
        slackChannelId: '#photography',
        preferences: {
          enabled: true,
          channels: ['email', 'slack', 'in_app'],
          weddingDayOverride: true,
          emergencyBypass: true
        }
      },
      {
        id: 'user-2', 
        name: 'Jane Flowers',
        email: 'jane@flowers.com',
        phone: '+447987654321',
        channels: ['email', 'sms'],
        preferences: {
          enabled: true,
          channels: ['email', 'sms'],
          weddingDayOverride: false,
          emergencyBypass: true
        }
      }
    ]

    it('should send notifications across all channels for active recipients', async () => {
      const eventData = {
        client_name: 'Sarah & Mike',
        form_name: 'Wedding Details Form',
        submitted_at: '2024-01-20T10:00:00Z'
      }

      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        eventData,
        mockRecipients
      )

      // Verify email service called
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith({
        to: 'john@example.com',
        template: 'realtime-form-response',
        variables: expect.objectContaining({
          recipient_name: 'John Photography',
          notification_type: 'FORM_RESPONSE_RECEIVED',
          client_name: 'Sarah & Mike',
          form_name: 'Wedding Details Form'
        })
      })

      // Verify Slack service called
      expect(mockSlackService.sendMessage).toHaveBeenCalledWith({
        channel: '#photography',
        text: '📝 New form response from Sarah & Mike',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'section'
          })
        ]),
        attachments: undefined
      })

      // Verify in-app notification stored
      expect(mockSupabase.from).toHaveBeenCalledWith('user_notifications')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          event_type: 'FORM_RESPONSE_RECEIVED',
          title: 'New Form Response',
          is_read: false
        })
      )
    })

    it('should filter out recipients with disabled notifications', async () => {
      const disabledRecipient: NotificationRecipient = {
        id: 'user-disabled',
        name: 'Disabled User',
        email: 'disabled@example.com',
        channels: ['email'],
        preferences: {
          enabled: false, // Notifications disabled
          channels: ['email'],
          weddingDayOverride: false,
          emergencyBypass: false
        }
      }

      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        { test: 'data' },
        [disabledRecipient]
      )

      // Should not send any notifications
      expect(mockEmailService.sendTemplate).not.toHaveBeenCalled()
      expect(mockSlackService.sendMessage).not.toHaveBeenCalled()
    })

    it('should bypass disabled notifications for emergency events', async () => {
      const disabledRecipient: NotificationRecipient = {
        id: 'user-emergency',
        name: 'Emergency User',
        email: 'emergency@example.com',
        channels: ['email'],
        preferences: {
          enabled: false,
          channels: ['email'],
          weddingDayOverride: false,
          emergencyBypass: true // Emergency bypass enabled
        }
      }

      await notificationService.sendRealtimeNotification(
        'EMERGENCY_ALERT' as keyof RealtimeEventType,
        {
          title: 'Vendor No-Show',
          description: 'Photographer failed to arrive',
          severity: 'critical'
        },
        [disabledRecipient]
      )

      // Should send emergency notification despite disabled preferences
      expect(mockEmailService.sendTemplate).toHaveBeenCalled()
    })

    it('should handle empty recipient list gracefully', async () => {
      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        { test: 'data' },
        []
      )

      expect(consoleLogSpy).toHaveBeenCalledWith('No recipients specified for notification')
      expect(mockEmailService.sendTemplate).not.toHaveBeenCalled()
    })
  })

  describe('notifyWeddingDateChange', () => {
    it('should notify all affected vendors of wedding date changes', async () => {
      // Mock vendor data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: [
                {
                  vendor_id: 'vendor-1',
                  vendor_type: 'photographer',
                  suppliers: {
                    id: 'vendor-1',
                    business_name: 'Amazing Photography',
                    email: 'info@amazing.com',
                    phone: '+447111222333',
                    notification_preferences: {
                      realtime_channels: ['email', 'sms']
                    }
                  }
                },
                {
                  vendor_id: 'vendor-2',
                  vendor_type: 'florist',
                  suppliers: {
                    id: 'vendor-2',
                    business_name: 'Beautiful Blooms',
                    email: 'hello@blooms.com',
                    phone: '+447444555666',
                    notification_preferences: {
                      realtime_channels: ['email', 'slack']
                    }
                  }
                }
              ]
            })
          })
        })
      })

      // Mock logging insert
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'wedding_date_changes') {
          return { insert: vi.fn().mockResolvedValue({ data: {}, error: null }) }
        }
        return mockSupabase.from(table)
      })

      await notificationService.notifyWeddingDateChange(
        'wedding-123',
        '2024-06-15',
        '2024-06-22',
        ['vendor-1', 'vendor-2']
      )

      // Should call email service for both vendors
      expect(mockEmailService.sendTemplate).toHaveBeenCalledTimes(2)
      
      // Verify first vendor notification
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith({
        to: 'info@amazing.com',
        template: 'realtime-wedding-change',
        variables: expect.objectContaining({
          recipient_name: 'Amazing Photography',
          old_date: '2024-06-15',
          new_date: '2024-06-22'
        })
      })

      // Verify second vendor notification  
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith({
        to: 'hello@blooms.com',
        template: 'realtime-wedding-change',
        variables: expect.objectContaining({
          recipient_name: 'Beautiful Blooms',
          old_date: '2024-06-15',
          new_date: '2024-06-22'
        })
      })
    })

    it('should handle no affected vendors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              data: []
            })
          })
        })
      })

      await notificationService.notifyWeddingDateChange(
        'wedding-456',
        '2024-07-01',
        '2024-07-08',
        ['vendor-nonexistent']
      )

      expect(mockEmailService.sendTemplate).not.toHaveBeenCalled()
    })
  })

  describe('notifyFormResponse', () => {
    const mockFormResponse: FormResponseData = {
      responseId: 'response-123',
      formId: 'form-456',
      formName: 'Wedding Questionnaire',
      clientId: 'client-789',
      clientName: 'Emma & Tom',
      supplierId: 'supplier-123',
      questionCount: 15,
      submittedAt: '2024-01-20T14:30:00Z',
      responses: [
        {
          questionId: 'q1',
          question: 'What is your wedding date?',
          answer: '2024-08-15',
          questionType: 'date'
        }
      ]
    }

    it('should notify supplier of new form responses', async () => {
      // Mock supplier data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                business_name: 'Dream Photography',
                email: 'contact@dream.com',
                phone: '+447777888999',
                notification_preferences: {
                  realtime_channels: ['email', 'in_app']
                }
              }
            })
          })
        })
      })

      await notificationService.notifyFormResponse(
        'supplier-123',
        mockFormResponse
      )

      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith({
        to: 'contact@dream.com',
        template: 'realtime-form-response',
        variables: expect.objectContaining({
          recipient_name: 'Dream Photography',
          supplier_name: 'Dream Photography',
          client_name: 'Emma & Tom',
          form_name: 'Wedding Questionnaire',
          response_count: 15
        })
      })
    })

    it('should handle missing supplier gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null })
          })
        })
      })

      await notificationService.notifyFormResponse(
        'nonexistent-supplier',
        mockFormResponse
      )

      expect(mockEmailService.sendTemplate).not.toHaveBeenCalled()
    })
  })

  describe('notifyJourneyProgress', () => {
    const mockJourneyProgress: JourneyProgressData = {
      journeyId: 'journey-123',
      stepId: 'step-456',
      clientId: 'client-789',
      clientName: 'Anna & Peter',
      supplierId: 'supplier-456',
      milestoneName: 'Contract Signed',
      completionPercentage: 75,
      completedAt: '2024-01-20T16:00:00Z',
      nextSteps: ['Schedule engagement shoot', 'Send shot list']
    }

    it('should notify supplier of journey milestone completion', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                business_name: 'Perfect Moments',
                email: 'info@perfect.com',
                phone: '+447123987654',
                notification_preferences: {
                  realtime_channels: ['email', 'slack']
                }
              }
            })
          })
        })
      })

      await notificationService.notifyJourneyProgress(
        'supplier-456',
        mockJourneyProgress
      )

      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith({
        to: 'info@perfect.com',
        template: 'realtime-journey-progress',
        variables: expect.objectContaining({
          recipient_name: 'Perfect Moments',
          client_name: 'Anna & Peter',
          milestone_name: 'Contract Signed',
          completion_percentage: 75
        })
      })
    })
  })

  describe('SMS notifications', () => {
    it('should only send SMS for high priority events', async () => {
      const smsRecipient: NotificationRecipient = {
        id: 'sms-user',
        name: 'SMS User',
        email: 'sms@example.com',
        phone: '+447000111222',
        channels: ['sms'],
        preferences: {
          enabled: true,
          channels: ['sms'],
          weddingDayOverride: true,
          emergencyBypass: true
        }
      }

      // Test normal priority event - should not send SMS
      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        { test: 'data' },
        [smsRecipient]
      )

      expect(mockSMSService.sendMessage).not.toHaveBeenCalled()

      // Clear mocks
      vi.clearAllMocks()

      // Test high priority event - should send SMS
      await notificationService.sendRealtimeNotification(
        'WEDDING_DATE_CHANGE' as keyof RealtimeEventType,
        {
          old_date: '2024-06-15',
          new_date: '2024-06-22'
        },
        [smsRecipient]
      )

      expect(mockSMSService.sendMessage).toHaveBeenCalledWith({
        to: '+447000111222',
        message: 'URGENT: Wedding date changed from 2024-06-15 to 2024-06-22. Please confirm your availability immediately. - WedSync'
      })
    })

    it('should send emergency SMS notifications', async () => {
      const emergencyRecipient: NotificationRecipient = {
        id: 'emergency-user',
        name: 'Emergency Contact',
        email: 'emergency@example.com',
        phone: '+447999888777',
        channels: ['sms', 'email'],
        preferences: {
          enabled: true,
          channels: ['sms', 'email'],
          weddingDayOverride: true,
          emergencyBypass: true
        }
      }

      await notificationService.sendRealtimeNotification(
        'EMERGENCY_ALERT' as keyof RealtimeEventType,
        {
          title: 'Venue Flooded',
          description: 'Alternative venue needed immediately',
          severity: 'critical'
        },
        [emergencyRecipient]
      )

      expect(mockSMSService.sendMessage).toHaveBeenCalledWith({
        to: '+447999888777',
        message: 'WEDDING EMERGENCY: Venue Flooded. Alternative venue needed immediately. Contact coordinator immediately. - WedSync'
      })
    })
  })

  describe('Slack message formatting', () => {
    it('should format form response Slack messages correctly', async () => {
      const slackRecipient: NotificationRecipient = {
        id: 'slack-user',
        name: 'Slack User',
        email: 'slack@example.com',
        channels: ['slack'],
        slackChannelId: '#notifications',
        preferences: {
          enabled: true,
          channels: ['slack'],
          weddingDayOverride: false,
          emergencyBypass: false
        }
      }

      const eventData = {
        client_name: 'David & Lisa',
        form_name: 'Pre-Wedding Consultation',
        submitted_at: '2024-01-20T11:30:00Z',
        response_id: 'resp-789'
      }

      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        eventData,
        [slackRecipient]
      )

      expect(mockSlackService.sendMessage).toHaveBeenCalledWith({
        channel: '#notifications',
        text: '📝 New form response from David & Lisa',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'section',
            text: expect.objectContaining({
              type: 'mrkdwn',
              text: expect.stringContaining('*Client:* David & Lisa')
            })
          }),
          expect.objectContaining({
            type: 'actions',
            elements: expect.arrayContaining([
              expect.objectContaining({
                type: 'button',
                text: { type: 'plain_text', text: 'View Response' }
              })
            ])
          })
        ]),
        attachments: undefined
      })
    })

    it('should format emergency alert Slack messages with high visibility', async () => {
      const slackRecipient: NotificationRecipient = {
        id: 'emergency-slack',
        name: 'Emergency Slack',
        email: 'emergency@example.com',
        channels: ['slack'],
        slackChannelId: '#emergencies',
        preferences: {
          enabled: true,
          channels: ['slack'],
          weddingDayOverride: true,
          emergencyBypass: true
        }
      }

      await notificationService.sendRealtimeNotification(
        'EMERGENCY_ALERT' as keyof RealtimeEventType,
        {
          title: 'Band Cancelled',
          description: 'Band cancelled 2 hours before ceremony',
          wedding_date: '2024-06-15',
          severity: 'critical'
        },
        [slackRecipient]
      )

      expect(mockSlackService.sendMessage).toHaveBeenCalledWith({
        channel: '#emergencies',
        text: '🚨 EMERGENCY: Band Cancelled',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'section',
            text: expect.objectContaining({
              text: expect.stringContaining('🚨 WEDDING DAY EMERGENCY')
            })
          })
        ]),
        attachments: undefined
      })
    })
  })

  describe('error handling', () => {
    it('should continue processing other channels when one fails', async () => {
      const recipient: NotificationRecipient = {
        id: 'multi-channel',
        name: 'Multi Channel User',
        email: 'multi@example.com',
        channels: ['email', 'slack'],
        slackChannelId: '#test',
        preferences: {
          enabled: true,
          channels: ['email', 'slack'],
          weddingDayOverride: false,
          emergencyBypass: false
        }
      }

      // Make email service fail
      mockEmailService.sendTemplate.mockRejectedValueOnce(new Error('Email service down'))
      
      // Slack should still work
      mockSlackService.sendMessage.mockResolvedValueOnce(true)

      await notificationService.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
        { test: 'data' },
        [recipient]
      )

      // Should attempt both channels
      expect(mockEmailService.sendTemplate).toHaveBeenCalled()
      expect(mockSlackService.sendMessage).toHaveBeenCalled()
    })

    it('should log notification errors for analysis', async () => {
      const recipient: NotificationRecipient = {
        id: 'error-user',
        name: 'Error User',
        email: 'error@example.com',
        channels: ['email'],
        preferences: {
          enabled: true,
          channels: ['email'],
          weddingDayOverride: false,
          emergencyBypass: false
        }
      }

      // Mock email service failure
      mockEmailService.sendTemplate.mockRejectedValueOnce(new Error('SMTP server error'))

      // Mock error logging
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_errors') {
          return { insert: vi.fn().mockResolvedValue({ data: {}, error: null }) }
        }
        return mockSupabase.from(table)
      })

      // This should not throw
      await expect(
        notificationService.sendRealtimeNotification(
          'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
          { test: 'data' },
          [recipient]
        )
      ).resolves.toBeUndefined()
    })
  })
})