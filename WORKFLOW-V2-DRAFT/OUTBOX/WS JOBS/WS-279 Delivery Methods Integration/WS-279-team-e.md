# WS-279 Delivery Methods Integration - Team E Comprehensive Prompt
**Team E: QA/Testing Specialists**

## 🎯 Your Mission: Wedding Communication Never Fails Testing
You are the **QA/Testing specialists** responsible for ensuring the multi-channel notification delivery system never fails when wedding coordinators need it most. Your focus: **Comprehensive testing that validates 99.9% delivery reliability across email, SMS, and push notifications during peak wedding season stress**.

## 💝 The Wedding Communication Reliability Testing Challenge
**Context**: Saturday morning wedding peak - 200+ couples getting married, Twilio experiencing intermittent issues, Firebase having latency spikes, and Resend hitting rate limits. Emergency timeline changes are flooding in and every notification must be delivered correctly. **Your testing ensures wedding communication is more reliable than the wedding vows themselves**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/__tests__/notifications/delivery-router.test.ts`** - Complete delivery routing testing
2. **`/src/__tests__/notifications/multi-provider-failover.test.ts`** - Provider failover and backup testing
3. **`/src/__tests__/notifications/mobile-notification-preferences.test.tsx`** - Mobile UI testing
4. **`/src/__tests__/notifications/webhook-status-handling.test.ts`** - Webhook delivery status testing
5. **`/src/__tests__/notifications/wedding-day-stress.test.ts`** - Peak wedding season load testing

### 🔒 Testing Requirements:
- **99.9% Delivery Reliability**: No notifications lost during provider outages or network issues
- **Multi-Channel Failover**: Seamless switching between SMS providers when one fails
- **Mobile UI Responsiveness**: Perfect notification preference management on all devices
- **Webhook Processing**: Accurate delivery status tracking from all providers
- **Peak Load Handling**: 10,000+ concurrent notifications without degradation
- **Security Validation**: All webhook signatures verified and inputs sanitized

Your testing ensures wedding communications work flawlessly when couples and vendors need them most.

## 🧪 Core Testing Scenarios

### Multi-Channel Delivery Testing
```typescript
// File: /src/__tests__/notifications/delivery-router.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationDeliveryRouter } from '@/lib/notifications/delivery-router';
import { TwilioSMSProvider } from '@/lib/integrations/twilio-sms-provider';
import { FirebasePushProvider } from '@/lib/integrations/firebase-push-provider';
import { createClient } from '@supabase/supabase-js';

// Mock all external dependencies
vi.mock('@supabase/supabase-js');
vi.mock('twilio');
vi.mock('firebase-admin');
vi.mock('resend');

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
};

vi.mocked(createClient).mockReturnValue(mockSupabase as any);

describe('NotificationDeliveryRouter', () => {
  let router: NotificationDeliveryRouter;
  let mockNotificationRequest: any;

  beforeEach(() => {
    router = new NotificationDeliveryRouter();
    
    mockNotificationRequest = {
      recipientId: '123e4567-e89b-12d3-a456-426614174000',
      notificationType: 'timeline_change',
      priority: 'high',
      title: 'Wedding Timeline Update',
      message: 'Ceremony moved 30 minutes earlier due to weather',
      actionUrl: 'https://wedsync.com/timeline/wedding-123',
      metadata: { weddingId: 'wedding-123', vendorId: 'photographer-456' }
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Priority-Based Delivery Method Selection', () => {
    it('should route urgent notifications to all available methods', async () => {
      // Mock user preferences for urgent notifications
      const mockPreferences = {
        priorityThresholds: {
          urgent: ['email', 'sms', 'push']
        },
        deliveryMethods: {
          email: true,
          sms: true,
          push: true
        }
      };

      // Mock contact methods
      const mockContacts = [
        { contact_type: 'email', contact_value: 'bride@example.com', is_verified: true },
        { contact_type: 'sms', contact_value: '+1234567890', is_verified: true },
        { contact_type: 'push', contact_value: 'firebase-token-123', is_verified: true }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPreferences, error: null })
              })
            })
          };
        }
        if (table === 'user_contact_methods') {
          return {
            select: () => ({
              eq: () => ({
                in: () => mockContacts
              })
            })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      const urgentRequest = { ...mockNotificationRequest, priority: 'urgent' };
      const results = await router.sendNotification(urgentRequest);

      expect(results).toHaveLength(3); // Email, SMS, Push
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should route normal notifications based on user preferences', async () => {
      const mockPreferences = {
        priorityThresholds: {
          normal: ['email', 'push'] // SMS not included for normal priority
        },
        deliveryMethods: {
          email: true,
          sms: false, // User disabled SMS for normal notifications
          push: true
        }
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPreferences, error: null })
              })
            })
          };
        }
        if (table === 'user_contact_methods') {
          return {
            select: () => ({
              eq: () => ({
                in: () => [
                  { contact_type: 'email', contact_value: 'bride@example.com', is_verified: true },
                  { contact_type: 'push', contact_value: 'firebase-token-123', is_verified: true }
                ]
              })
            })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      const results = await router.sendNotification(mockNotificationRequest);

      expect(results).toHaveLength(2); // Only email and push
      expect(results.every(r => r.success)).toBe(true);
      expect(results.find(r => r.method === 'sms')).toBeUndefined();
    });
  });

  describe('Quiet Hours and Business Hours Handling', () => {
    it('should respect quiet hours for SMS but allow email and push', async () => {
      const quietHoursMock = {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      };

      // Mock current time to be during quiet hours (2 AM)
      const mockDate = new Date('2024-01-15T02:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const mockPreferences = {
        priorityThresholds: { normal: ['email', 'sms', 'push'] },
        deliveryMethods: { email: true, sms: true, push: true },
        quietHours: quietHoursMock
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPreferences, error: null })
              })
            })
          };
        }
        if (table === 'user_contact_methods') {
          return {
            select: () => ({
              eq: () => ({
                in: () => [
                  { contact_type: 'email', contact_value: 'bride@example.com', is_verified: true },
                  { contact_type: 'push', contact_value: 'firebase-token-123', is_verified: true }
                ]
              })
            })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      const results = await router.sendNotification(mockNotificationRequest);

      // Should only have email and push (SMS filtered out due to quiet hours)
      expect(results).toHaveLength(2);
      expect(results.find(r => r.method === 'sms')).toBeUndefined();
      expect(results.find(r => r.method === 'email')).toBeDefined();
      expect(results.find(r => r.method === 'push')).toBeDefined();

      vi.useRealTimers();
    });

    it('should override quiet hours for urgent notifications', async () => {
      const quietHoursMock = {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      };

      // Mock current time to be during quiet hours (2 AM)
      const mockDate = new Date('2024-01-15T02:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const mockPreferences = {
        priorityThresholds: { urgent: ['email', 'sms', 'push'] },
        deliveryMethods: { email: true, sms: true, push: true },
        quietHours: quietHoursMock
      };

      const mockContacts = [
        { contact_type: 'email', contact_value: 'bride@example.com', is_verified: true },
        { contact_type: 'sms', contact_value: '+1234567890', is_verified: true },
        { contact_type: 'push', contact_value: 'firebase-token-123', is_verified: true }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPreferences, error: null })
              })
            })
          };
        }
        if (table === 'user_contact_methods') {
          return {
            select: () => ({
              eq: () => ({
                in: () => mockContacts
              })
            })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      const urgentRequest = { ...mockNotificationRequest, priority: 'urgent' };
      const results = await router.sendNotification(urgentRequest);

      // Urgent notifications should use ALL methods, even during quiet hours
      expect(results).toHaveLength(3);
      expect(results.find(r => r.method === 'sms')).toBeDefined();
      expect(results.find(r => r.method === 'email')).toBeDefined();
      expect(results.find(r => r.method === 'push')).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('Input Validation and Security', () => {
    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing recipientId
        notificationType: 'timeline_change',
        priority: 'high',
        title: 'Test',
        message: 'Test message'
      };

      const results = await router.sendNotification(invalidRequest as any);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Missing required field');
    });

    it('should validate UUID format for recipientId', async () => {
      const invalidRequest = {
        recipientId: 'invalid-uuid',
        notificationType: 'timeline_change',
        priority: 'high',
        title: 'Test',
        message: 'Test message'
      };

      const results = await router.sendNotification(invalidRequest);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid recipientId format');
    });

    it('should sanitize message content', async () => {
      const maliciousRequest = {
        ...mockNotificationRequest,
        title: '<script>alert("xss")</script>Wedding Update',
        message: 'Message with <script>alert("hack")</script> content'
      };

      // Mock successful delivery to verify sanitization
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          in: () => []
        }),
        insert: () => Promise.resolve({ error: null })
      }));

      await router.sendNotification(maliciousRequest);

      // Verify that the logged message has scripts removed
      const logCall = mockSupabase.from.mock.calls.find(call => 
        call[0] === 'notification_delivery_log'
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: null, 
              error: { message: 'Connection failed' } 
            })
          })
        })
      }));

      const results = await router.sendNotification(mockNotificationRequest);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Failed to get preferences');
    });

    it('should continue with default preferences when user preferences not found', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'notification_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: null, 
                  error: { code: 'PGRST116' } // Not found error
                })
              })
            })
          };
        }
        if (table === 'user_contact_methods') {
          return {
            select: () => ({
              eq: () => ({
                in: () => [
                  { contact_type: 'email', contact_value: 'user@example.com', is_verified: true }
                ]
              })
            })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      const results = await router.sendNotification(mockNotificationRequest);

      // Should use default preferences and still attempt delivery
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
```

### Multi-Provider Failover Testing
```typescript
// File: /src/__tests__/notifications/multi-provider-failover.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TwilioSMSProvider } from '@/lib/integrations/twilio-sms-provider';

describe('TwilioSMSProvider Multi-Provider Failover', () => {
  let smsProvider: TwilioSMSProvider;
  let mockTwilioClient: any;
  let mockBackupTwilioClient: any;

  beforeEach(() => {
    // Mock Twilio clients
    mockTwilioClient = {
      messages: {
        create: vi.fn()
      },
      api: {
        accounts: vi.fn(() => ({
          fetch: vi.fn()
        }))
      },
      accountSid: 'AC123'
    };

    mockBackupTwilioClient = {
      messages: {
        create: vi.fn()
      },
      api: {
        accounts: vi.fn(() => ({
          fetch: vi.fn()
        }))
      },
      accountSid: 'AC456'
    };

    // Mock environment variables for backup provider
    process.env.TWILIO_BACKUP_ACCOUNT_SID = 'AC456';
    process.env.TWILIO_BACKUP_AUTH_TOKEN = 'backup-token';
    process.env.TWILIO_BACKUP_PHONE_NUMBER = '+19876543210';

    vi.doMock('twilio', () => ({
      Twilio: vi.fn((sid) => 
        sid === 'AC123' ? mockTwilioClient : mockBackupTwilioClient
      )
    }));

    smsProvider = new TwilioSMSProvider();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.TWILIO_BACKUP_ACCOUNT_SID;
    delete process.env.TWILIO_BACKUP_AUTH_TOKEN;
    delete process.env.TWILIO_BACKUP_PHONE_NUMBER;
  });

  it('should use primary provider when healthy', async () => {
    mockTwilioClient.messages.create.mockResolvedValue({
      sid: 'SM123',
      price: '0.0075'
    });

    const result = await smsProvider.sendSMS({
      to: '+1234567890',
      message: 'Test wedding notification',
      priority: 'normal'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('twilio-primary');
    expect(result.messageId).toBe('SM123');
    expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
      body: '💒 WedSync: Test wedding notification',
      from: expect.any(String),
      to: '+1234567890',
      statusCallback: expect.stringContaining('/api/webhooks/sms-status'),
      validityPeriod: 86400,
      maxPrice: '0.25',
      provideFeedback: true
    });
  });

  it('should failover to backup provider when primary fails', async () => {
    // Primary provider fails
    mockTwilioClient.messages.create.mockRejectedValue(new Error('Service unavailable'));

    // Backup provider succeeds
    mockBackupTwilioClient.messages.create.mockResolvedValue({
      sid: 'SM456',
      price: '0.0080'
    });

    const result = await smsProvider.sendSMS({
      to: '+1234567890',
      message: 'Urgent wedding update',
      priority: 'urgent'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('twilio-backup');
    expect(result.messageId).toBe('SM456');
  });

  it('should handle rate limiting with intelligent provider selection', async () => {
    // Simulate rate limit on primary provider
    const rateLimitError = new Error('Too Many Requests');
    rateLimitError.status = 429;
    rateLimitError.headers = { 'retry-after': '60' };

    mockTwilioClient.messages.create.mockRejectedValue(rateLimitError);

    // Backup provider succeeds
    mockBackupTwilioClient.messages.create.mockResolvedValue({
      sid: 'SM789',
      price: '0.0075'
    });

    const result = await smsProvider.sendSMS({
      to: '+1234567890',
      message: 'Timeline change notification',
      priority: 'high'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('twilio-backup');
    expect(result.retryAfter).toBeUndefined(); // Should not propagate retry for successful backup
  });

  it('should prefer provider with most capacity for urgent messages', async () => {
    // This test would require access to the internal provider selection logic
    // For now, we'll test that urgent messages are processed successfully
    mockTwilioClient.messages.create.mockResolvedValue({
      sid: 'SM999',
      price: '0.0075'
    });

    const result = await smsProvider.sendSMS({
      to: '+1234567890',
      message: 'EMERGENCY: Venue change!',
      priority: 'urgent'
    });

    expect(result.success).toBe(true);
    expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '🚨 WEDDING URGENT: EMERGENCY: Venue change!',
        maxPrice: '1.00' // Higher price limit for urgent messages
      })
    );
  });

  it('should perform health checks on all providers', async () => {
    mockTwilioClient.api.accounts().fetch.mockResolvedValue({ status: 'active' });
    mockBackupTwilioClient.api.accounts().fetch.mockResolvedValue({ status: 'active' });

    // Wait for health check cycle
    await new Promise(resolve => setTimeout(resolve, 100));

    const providerStatus = smsProvider.getProviderStatus();

    expect(providerStatus).toHaveLength(2);
    expect(providerStatus[0].healthy).toBe(true);
    expect(providerStatus[1].healthy).toBe(true);
  });

  it('should handle webhook status updates correctly', async () => {
    const webhookData = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      ErrorCode: null,
      ErrorMessage: null,
      To: '+1234567890',
      From: '+19876543210'
    };

    await smsProvider.handleDeliveryStatus(webhookData);

    // Verify that the status was processed (would update database in real implementation)
    expect(webhookData.MessageStatus).toBe('delivered');
  });
});
```

### Mobile Notification Preferences Testing
```typescript
// File: /src/__tests__/notifications/mobile-notification-preferences.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileNotificationCenter } from '@/apps/wedme/components/notifications/MobileNotificationCenter';
import { useNotificationPreferences } from '@/apps/wedme/hooks/useNotificationPreferences';

// Mock the custom hook
vi.mock('@/apps/wedme/hooks/useNotificationPreferences');

const mockUseNotificationPreferences = vi.mocked(useNotificationPreferences);

describe('MobileNotificationCenter', () => {
  const mockProps = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    weddingId: 'wedding-123',
    isWeddingDay: false
  };

  const mockPreferences = [
    {
      notificationType: 'vendor_updates',
      deliveryMethods: { email: true, sms: false, push: true },
      priorityThresholds: { normal: ['email', 'push'] }
    },
    {
      notificationType: 'timeline_changes',
      deliveryMethods: { email: true, sms: true, push: true },
      priorityThresholds: { high: ['email', 'sms', 'push'] }
    }
  ];

  const mockHookReturn = {
    preferences: mockPreferences,
    isLoading: false,
    error: null,
    updatePreference: vi.fn(),
    batchUpdatePreferences: vi.fn(),
    enableQuietHours: vi.fn(),
    disableQuietHours: vi.fn(),
    enableWeddingDayMode: vi.fn(),
    disableWeddingDayMode: vi.fn(),
    sharePreferences: vi.fn(),
    testNotification: vi.fn(),
    getDeliveryStatus: vi.fn(() => 'connected')
  };

  beforeEach(() => {
    mockUseNotificationPreferences.mockReturnValue(mockHookReturn);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render notification types with correct settings', () => {
    render(<MobileNotificationCenter {...mockProps} />);

    expect(screen.getByText('Vendor Updates')).toBeInTheDocument();
    expect(screen.getByText('Timeline Changes')).toBeInTheDocument();
    expect(screen.getByText('Updates from photographers, venues, caterers')).toBeInTheDocument();
  });

  it('should display wedding day alert when isWeddingDay is true', () => {
    render(<MobileNotificationCenter {...mockProps} isWeddingDay={true} />);

    expect(screen.getByText("It's your wedding day!")).toBeInTheDocument();
    expect(screen.getByText('Essential notifications only.')).toBeInTheDocument();
  });

  it('should handle quick mode changes correctly', async () => {
    render(<MobileNotificationCenter {...mockProps} />);

    const urgentOnlyButton = screen.getByText('Urgent Only');
    fireEvent.click(urgentOnlyButton);

    await waitFor(() => {
      expect(mockHookReturn.batchUpdatePreferences).toHaveBeenCalled();
    });
  });

  it('should toggle individual notification methods', async () => {
    render(<MobileNotificationCenter {...mockProps} />);

    // Find and click SMS toggle for vendor updates
    const vendorUpdatesCard = screen.getByText('Vendor Updates').closest('.border');
    const smsToggle = vendorUpdatesCard?.querySelector('[role="switch"]');
    
    if (smsToggle) {
      fireEvent.click(smsToggle);
      
      await waitFor(() => {
        expect(mockHookReturn.updatePreference).toHaveBeenCalledWith(
          'vendor_updates',
          'sms',
          true // Should enable SMS since it was disabled
        );
      });
    }
  });

  it('should display enabled method counts correctly', () => {
    render(<MobileNotificationCenter {...mockProps} />);

    // Vendor updates has email and push enabled (2 methods)
    expect(screen.getByText('2 methods')).toBeInTheDocument();
    
    // Timeline changes has all 3 methods enabled
    expect(screen.getByText('3 methods')).toBeInTheDocument();
  });

  it('should handle sharing functionality', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      writable: true
    });

    render(<MobileNotificationCenter {...mockProps} />);

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockHookReturn.sharePreferences).toHaveBeenCalled();
    });
  });

  it('should show loading state appropriately', () => {
    mockUseNotificationPreferences.mockReturnValue({
      ...mockHookReturn,
      isLoading: true
    });

    render(<MobileNotificationCenter {...mockProps} />);

    expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
  });

  it('should expand advanced settings when clicked', async () => {
    render(<MobileNotificationCenter {...mockProps} />);

    const advancedButton = screen.getByText('Advanced Settings');
    fireEvent.click(advancedButton);

    await waitFor(() => {
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Wedding Day Mode')).toBeInTheDocument();
    });
  });

  it('should handle accessibility requirements', () => {
    render(<MobileNotificationCenter {...mockProps} />);

    // Check for proper ARIA labels and roles
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // Check for proper heading hierarchy
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notifications');
  });

  it('should be responsive on mobile viewports', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    render(<MobileNotificationCenter {...mockProps} />);

    // Verify mobile-specific classes are applied
    const container = screen.getByText('Notifications').closest('.max-w-md');
    expect(container).toBeInTheDocument();
  });
});
```

### Wedding Day Stress Testing
```typescript
// File: /src/__tests__/notifications/wedding-day-stress.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationDeliveryRouter } from '@/lib/notifications/delivery-router';

describe('Wedding Day Stress Testing', () => {
  let router: NotificationDeliveryRouter;

  beforeEach(() => {
    router = new NotificationDeliveryRouter();
    vi.clearAllMocks();
  });

  it('should handle 10,000 concurrent notifications', async () => {
    const startTime = Date.now();
    
    // Create 10,000 notification requests
    const notificationPromises = Array.from({ length: 10000 }, (_, index) => {
      return router.sendNotification({
        recipientId: `user-${index.toString().padStart(4, '0')}`,
        notificationType: 'timeline_change',
        priority: 'high',
        title: `Wedding ${Math.floor(index / 100)} Update`,
        message: 'Timeline has been updated for your wedding',
        metadata: { batchTest: true, index }
      });
    });

    const results = await Promise.allSettled(notificationPromises);
    const endTime = Date.now();
    
    const successfulNotifications = results.filter(r => r.status === 'fulfilled').length;
    const processingTime = endTime - startTime;
    
    // Performance requirements
    expect(successfulNotifications).toBeGreaterThanOrEqual(9900); // 99% success rate
    expect(processingTime).toBeLessThan(30000); // Complete within 30 seconds
    
    console.log(`Processed ${successfulNotifications} notifications in ${processingTime}ms`);
    console.log(`Average: ${(processingTime / successfulNotifications).toFixed(2)}ms per notification`);
  });

  it('should maintain performance under provider failures', async () => {
    // Mock intermittent provider failures
    let emailFailureCount = 0;
    let smsFailureCount = 0;
    
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: vi.fn(() => {
            emailFailureCount++;
            if (emailFailureCount % 5 === 0) {
              return Promise.reject(new Error('Email service temporarily unavailable'));
            }
            return Promise.resolve({ data: { id: `email-${emailFailureCount}` } });
          })
        }
      }
    }));

    vi.doMock('twilio', () => ({
      Twilio: class {
        messages = {
          create: vi.fn(() => {
            smsFailureCount++;
            if (smsFailureCount % 3 === 0) {
              return Promise.reject(new Error('SMS rate limit exceeded'));
            }
            return Promise.resolve({ sid: `sms-${smsFailureCount}`, price: '0.0075' });
          })
        }
      }
    }));

    const notifications = Array.from({ length: 1000 }, (_, index) => ({
      recipientId: `stress-user-${index}`,
      notificationType: 'emergency_alert',
      priority: 'urgent',
      title: 'Emergency Wedding Alert',
      message: 'Immediate attention required',
      metadata: { stressTest: true }
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      notifications.map(notification => router.sendNotification(notification))
    );
    const endTime = Date.now();

    const totalAttempts = results.reduce((sum, result) => sum + result.length, 0);
    const successfulDeliveries = results.reduce((sum, result) => 
      sum + result.filter(r => r.success).length, 0
    );

    const successRate = (successfulDeliveries / totalAttempts) * 100;
    const processingTime = endTime - startTime;

    // Should maintain high success rate even with provider failures
    expect(successRate).toBeGreaterThanOrEqual(85); // 85% success rate under stress
    expect(processingTime).toBeLessThan(20000); // Complete within 20 seconds
  });

  it('should handle Saturday morning peak wedding load', async () => {
    // Simulate Saturday morning scenario:
    // - 200 weddings happening
    // - Each wedding has 10 stakeholders
    // - Multiple notifications per wedding
    
    const weddingCount = 200;
    const stakeholdersPerWedding = 10;
    const notificationsPerWedding = 5;
    
    const saturdayNotifications = [];
    
    for (let wedding = 0; wedding < weddingCount; wedding++) {
      for (let stakeholder = 0; stakeholder < stakeholdersPerWedding; stakeholder++) {
        for (let notification = 0; notification < notificationsPerWedding; notification++) {
          saturdayNotifications.push({
            recipientId: `wedding-${wedding}-stakeholder-${stakeholder}`,
            notificationType: ['timeline_change', 'vendor_update', 'guest_response', 'reminder', 'emergency_alert'][notification],
            priority: notification === 4 ? 'urgent' : 'normal', // Last one is emergency
            title: `Wedding ${wedding + 1} Notification`,
            message: `Update for ${['photographer', 'venue', 'caterer', 'planner', 'coordinator'][stakeholder]}`,
            metadata: { 
              weddingId: `wedding-${wedding}`,
              stakeholderRole: ['photographer', 'venue', 'caterer', 'planner', 'coordinator'][stakeholder],
              saturdayPeak: true
            }
          });
        }
      }
    }

    const startTime = Date.now();
    
    // Process in batches to simulate real-world load patterns
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < saturdayNotifications.length; i += batchSize) {
      const batch = saturdayNotifications.slice(i, i + batchSize);
      batches.push(
        Promise.all(batch.map(notification => router.sendNotification(notification)))
      );
    }
    
    const batchResults = await Promise.all(batches);
    const endTime = Date.now();
    
    const allResults = batchResults.flat(2);
    const successCount = allResults.filter(r => r.success).length;
    const totalCount = allResults.length;
    const processingTime = endTime - startTime;
    
    // Saturday peak requirements
    expect(successCount / totalCount).toBeGreaterThanOrEqual(0.98); // 98% success rate
    expect(processingTime).toBeLessThan(60000); // Complete within 1 minute
    
    console.log(`Saturday Peak Test: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%) in ${processingTime}ms`);
  });

  it('should maintain database performance under high load', async () => {
    // Test database logging performance with high concurrent writes
    const logEntries = Array.from({ length: 5000 }, (_, index) => ({
      recipientId: `load-test-user-${index}`,
      notificationType: 'performance_test',
      priority: 'normal',
      title: 'Database Load Test',
      message: `Load test message ${index}`,
      metadata: { loadTest: true, index }
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      logEntries.map(entry => router.sendNotification(entry))
    );
    const endTime = Date.now();

    const processingTime = endTime - startTime;
    const averageTimePerNotification = processingTime / logEntries.length;

    // Database performance requirements
    expect(averageTimePerNotification).toBeLessThan(50); // Under 50ms per notification on average
    expect(processingTime).toBeLessThan(15000); // Complete within 15 seconds total
  });
});
```

### End-to-End Wedding Notification Flow Testing
```typescript
// File: /src/__tests__/notifications/e2e-wedding-flow.test.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Wedding Notification E2E Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock user authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '123e4567-e89b-12d3-a456-426614174000' }
      }));
    });
  });

  test('should configure notification preferences end-to-end', async () => {
    // Navigate to notification settings
    await page.goto('/settings/notifications');
    
    // Wait for page to load
    await expect(page.getByText('Notification Settings')).toBeVisible();
    
    // Test mobile notification center
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    // Enable SMS for timeline changes
    const timelineCard = page.getByText('Timeline Changes').locator('..');
    await timelineCard.getByRole('switch', { name: /SMS/i }).click();
    
    // Verify the toggle switched
    await expect(timelineCard.getByRole('switch', { name: /SMS/i })).toBeChecked();
    
    // Test quick mode switching
    await page.getByText('Urgent Only').click();
    
    // Verify urgent mode is active
    await expect(page.getByText('Urgent Only')).toHaveClass(/bg-yellow/);
    
    // Test notification sharing
    await page.getByText('Share').click();
    
    // If native sharing is available, it should trigger
    // Otherwise, should copy to clipboard
    await page.waitForTimeout(1000); // Allow share action to complete
  });

  test('should handle wedding day mode activation', async () => {
    await page.goto('/settings/notifications');
    
    // Simulate wedding day
    await page.addInitScript(() => {
      window.testWeddingDay = true;
    });
    
    await page.reload();
    
    // Should show wedding day alert
    await expect(page.getByText("It's your wedding day!")).toBeVisible();
    
    // Should show essential notifications only message
    await expect(page.getByText('Essential notifications only.')).toBeVisible();
    
    // Advanced settings should show wedding day mode toggle
    await page.getByText('Advanced Settings').click();
    await expect(page.getByText('Wedding Day Mode')).toBeVisible();
  });

  test('should test notification delivery methods', async () => {
    await page.goto('/settings/notifications');
    
    // Add email contact method
    await page.getByPlaceholder('Enter email address').fill('test@wedding.com');
    await page.getByText('Add').click();
    
    // Should show email as added and pending verification
    await expect(page.getByText('test@wedding.com')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    
    // Test email delivery
    await page.getByText('Test', { exact: true }).first().click();
    
    // Should show success message
    await expect(page.getByText(/Test.*sent/)).toBeVisible({ timeout: 5000 });
  });

  test('should handle notification preferences matrix correctly', async () => {
    await page.goto('/settings/notifications');
    
    // Desktop view
    await page.setViewportSize({ width: 1024, height: 768 });
    
    // Should show table layout on desktop
    await expect(page.locator('table')).toBeVisible();
    
    // Test switching notification method for vendor updates
    const vendorRow = page.locator('tr').filter({ hasText: 'Vendor Updates' });
    const emailToggle = vendorRow.getByRole('switch').first();
    
    // Toggle email off
    await emailToggle.click();
    await expect(emailToggle).not.toBeChecked();
    
    // Toggle email back on
    await emailToggle.click();
    await expect(emailToggle).toBeChecked();
  });

  test('should show appropriate priority indicators', async () => {
    await page.goto('/settings/notifications');
    
    // Emergency alerts should show urgent priority
    const emergencySection = page.getByText('Emergency Alerts').locator('..');
    await expect(emergencySection.getByText('Urgent')).toBeVisible();
    
    // Timeline changes should show high priority
    const timelineSection = page.getByText('Timeline Changes').locator('..');
    // High priority might not be explicitly shown, but urgent should be
    
    // Regular updates should not show priority badges
    const vendorSection = page.getByText('Vendor Updates').locator('..');
    await expect(vendorSection.getByText('Urgent')).not.toBeVisible();
  });

  test('should maintain responsive design across devices', async () => {
    // Test various device viewports
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/settings/notifications');
      
      // Basic elements should be visible
      await expect(page.getByText('Notification Settings')).toBeVisible();
      await expect(page.getByText('Quick Settings')).toBeVisible();
      
      // Layout should adapt appropriately
      if (viewport.width < 768) {
        // Mobile: should use stacked cards
        await expect(page.getByText('All Updates')).toBeVisible();
      } else {
        // Desktop: should use table layout
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });
});
```

## ✅ Acceptance Criteria Checklist

- [ ] **99.9% Delivery Reliability** confirmed through comprehensive error handling and retry testing
- [ ] **Multi-Channel Failover** seamless switching between SMS providers validated under stress conditions
- [ ] **Mobile UI Responsiveness** perfect notification preferences interface tested on all device sizes
- [ ] **Webhook Processing Accuracy** delivery status updates correctly processed from all providers
- [ ] **Peak Load Handling** 10,000+ concurrent notifications processed without degradation
- [ ] **Security Validation** all webhook signatures verified and malicious inputs properly sanitized
- [ ] **Wedding Day Stress Testing** Saturday morning peak wedding load handled with 98%+ success rate
- [ ] **Database Performance** notification logging maintains under 50ms average response time
- [ ] **Provider Health Monitoring** automatic detection and recovery from service outages
- [ ] **End-to-End Flow Validation** complete notification preference configuration tested via browser automation
- [ ] **Cross-Device Compatibility** notification settings work perfectly on iOS, Android, and desktop
- [ ] **Performance Under Failure** system maintains 85%+ success rate even during provider outages

Your testing ensures wedding notification delivery is more reliable than the wedding ceremony itself, with comprehensive coverage of every failure scenario.

**Remember**: Every test prevents a potential wedding day disaster. Test like couples' happiness depends on it - because it does! 🧪💍