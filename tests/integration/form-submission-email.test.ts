/**
 * Form Submission → Email Notification Integration Test
 * Tests the complete workflow from form submission to email delivery
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createSupabaseClient } from '@/lib/supabase';
import { EmailService } from '@/lib/email/service';
import { Resend } from 'resend';
import fetch from 'node-fetch';

// Mock Resend for testing
jest.mock('resend');

// Test configuration
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_VENDOR_EMAIL = 'vendor-test@example.com';
const TEST_VENDOR_PASSWORD = 'VendorTest123!';
const TEST_CLIENT_EMAIL = 'client-test@example.com';

describe('Form Submission → Email Notification Integration', () => {
  let authToken: string;
  let vendorId: string;
  let formId: string;
  let supabase: any;
  let emailService: EmailService;
  let mockResend: jest.Mocked<Resend>;

  beforeAll(async () => {
    // Initialize services
    supabase = createSupabaseClient();
    emailService = new EmailService();
    
    // Setup Resend mock
    mockResend = new Resend('test-api-key') as jest.Mocked<Resend>;
    mockResend.emails = {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    } as any;

    // Create test vendor
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_VENDOR_EMAIL,
      password: TEST_VENDOR_PASSWORD,
    });

    if (authError) throw authError;

    vendorId = authData.user?.id || '';
    authToken = authData.session?.access_token || '';

    // Create a test form
    const formResponse = await fetch(`${TEST_API_URL}/api/forms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Wedding Photography Inquiry Form',
        description: 'Contact form for photography services',
        fields: [
          { type: 'text', name: 'name', label: 'Full Name', required: true },
          { type: 'email', name: 'email', label: 'Email Address', required: true },
          { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
          { type: 'date', name: 'eventDate', label: 'Event Date', required: true },
          { type: 'select', name: 'package', label: 'Package', required: true, 
            options: ['Basic', 'Premium', 'Deluxe'] },
          { type: 'textarea', name: 'message', label: 'Additional Details', required: false },
        ],
        settings: {
          notifications: {
            enabled: true,
            recipientEmail: TEST_VENDOR_EMAIL,
            sendConfirmation: true,
          },
        },
      }),
    });

    const formData = await formResponse.json();
    formId = formData.id;
  });

  afterAll(async () => {
    // Cleanup
    if (formId) {
      await supabase.from('form_submissions').delete().eq('form_id', formId);
      await supabase.from('forms').delete().eq('id', formId);
    }
    if (vendorId) {
      await supabase.auth.admin.deleteUser(vendorId);
    }
  });

  describe('Form Submission Process', () => {
    it('should accept valid form submissions', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'John Doe',
          email: TEST_CLIENT_EMAIL,
          phone: '+1234567890',
          eventDate: '2025-06-15',
          package: 'Premium',
          message: 'Looking forward to working with you!',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('submitted_at');
      expect(result).toHaveProperty('status', 'submitted');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        formId,
        responses: {
          name: 'John Doe',
          // Missing required email field
          phone: '+1234567890',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('required');
      expect(error.fields).toContain('email');
    });

    it('should validate field formats', async () => {
      const invalidData = {
        formId,
        responses: {
          name: 'John Doe',
          email: 'invalid-email-format',
          phone: '123', // Too short
          eventDate: 'not-a-date',
          package: 'InvalidOption',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.validationErrors).toBeTruthy();
    });

    it('should store submissions in database', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'Database Test User',
          email: 'db-test@example.com',
          phone: '+1234567890',
          eventDate: '2025-07-20',
          package: 'Deluxe',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('id', result.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord.form_id).toBe(formId);
      expect(dbRecord.data.name).toBe('Database Test User');
      expect(dbRecord.data.email).toBe('db-test@example.com');
      expect(dbRecord.status).toBe('submitted');
    });
  });

  describe('Email Notification System', () => {
    beforeEach(() => {
      // Reset mock before each test
      jest.clearAllMocks();
    });

    it('should send email notification to vendor on form submission', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'Email Test User',
          email: TEST_CLIENT_EMAIL,
          phone: '+1234567890',
          eventDate: '2025-08-10',
          package: 'Premium',
          message: 'Please contact me to discuss details.',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      expect(response.status).toBe(200);

      // Wait for async email processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify email was sent to vendor
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: TEST_VENDOR_EMAIL,
          subject: expect.stringContaining('New Form Submission'),
          html: expect.stringContaining('Email Test User'),
        })
      );
    });

    it('should send confirmation email to client when enabled', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'Confirmation Test',
          email: TEST_CLIENT_EMAIL,
          phone: '+1234567890',
          eventDate: '2025-09-15',
          package: 'Basic',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      expect(response.status).toBe(200);

      // Wait for async email processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify confirmation email was sent to client
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: TEST_CLIENT_EMAIL,
          subject: expect.stringContaining('Thank you for your submission'),
          html: expect.stringContaining('Confirmation Test'),
        })
      );
    });

    it('should include all form data in vendor notification', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'Complete Data Test',
          email: 'complete@example.com',
          phone: '+9876543210',
          eventDate: '2025-10-20',
          package: 'Deluxe',
          message: 'All fields included test',
        },
      };

      await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const emailCall = mockResend.emails.send.mock.calls.find(
        call => call[0].to === TEST_VENDOR_EMAIL
      );

      expect(emailCall).toBeTruthy();
      const emailContent = emailCall[0].html;

      // Verify all fields are in the email
      Object.entries(submissionData.responses).forEach(([key, value]) => {
        expect(emailContent).toContain(value.toString());
      });
    });

    it('should handle email delivery failures gracefully', async () => {
      // Configure mock to fail
      mockResend.emails.send.mockRejectedValueOnce(new Error('Email delivery failed'));

      const submissionData = {
        formId,
        responses: {
          name: 'Failure Test',
          email: 'failure@example.com',
          phone: '+1234567890',
          eventDate: '2025-11-01',
          package: 'Basic',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      // Submission should succeed even if email fails
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('id');
      
      // Check that failure was logged
      const { data: submission } = await supabase
        .from('form_submissions')
        .select('metadata')
        .eq('id', result.id)
        .single();

      expect(submission.metadata.emailStatus).toBe('failed');
      expect(submission.metadata.emailError).toContain('Email delivery failed');
    });

    it('should retry failed email deliveries', async () => {
      // Configure mock to fail then succeed
      mockResend.emails.send
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ id: 'retry-success-id' });

      const submissionData = {
        formId,
        responses: {
          name: 'Retry Test',
          email: 'retry@example.com',
          phone: '+1234567890',
          eventDate: '2025-12-01',
          package: 'Premium',
        },
      };

      await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify retry was attempted
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Email Templates and Customization', () => {
    it('should use custom email templates when configured', async () => {
      // Update form with custom template
      await fetch(`${TEST_API_URL}/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            notifications: {
              enabled: true,
              recipientEmail: TEST_VENDOR_EMAIL,
              sendConfirmation: true,
              customTemplate: {
                subject: 'New Inquiry: {{name}}',
                header: 'You have a new photography inquiry!',
                footer: 'Please respond within 24 hours.',
              },
            },
          },
        }),
      });

      const submissionData = {
        formId,
        responses: {
          name: 'Template Test User',
          email: 'template@example.com',
          phone: '+1234567890',
          eventDate: '2025-06-01',
          package: 'Deluxe',
        },
      };

      await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'New Inquiry: Template Test User',
          html: expect.stringContaining('You have a new photography inquiry!'),
        })
      );
    });

    it('should support multiple notification recipients', async () => {
      // Update form with multiple recipients
      await fetch(`${TEST_API_URL}/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            notifications: {
              enabled: true,
              recipientEmail: `${TEST_VENDOR_EMAIL},assistant@example.com,manager@example.com`,
              sendConfirmation: true,
            },
          },
        }),
      });

      const submissionData = {
        formId,
        responses: {
          name: 'Multiple Recipients Test',
          email: 'multi@example.com',
          phone: '+1234567890',
          eventDate: '2025-07-01',
          package: 'Premium',
        },
      };

      await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify emails sent to all recipients
      const recipients = [TEST_VENDOR_EMAIL, 'assistant@example.com', 'manager@example.com'];
      recipients.forEach(recipient => {
        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            to: expect.stringContaining(recipient),
          })
        );
      });
    });

    it('should attach submission as PDF when configured', async () => {
      // Update form to include PDF attachment
      await fetch(`${TEST_API_URL}/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            notifications: {
              enabled: true,
              recipientEmail: TEST_VENDOR_EMAIL,
              sendConfirmation: true,
              attachPDF: true,
            },
          },
        }),
      });

      const submissionData = {
        formId,
        responses: {
          name: 'PDF Attachment Test',
          email: 'pdf@example.com',
          phone: '+1234567890',
          eventDate: '2025-08-01',
          package: 'Deluxe',
        },
      };

      await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: expect.stringContaining('.pdf'),
              content: expect.any(String),
            })
          ]),
        })
      );
    });
  });

  describe('Email Queue and Processing', () => {
    it('should queue emails for batch processing', async () => {
      const submissions = [];

      // Submit multiple forms quickly
      for (let i = 0; i < 10; i++) {
        submissions.push(
          fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formId,
              responses: {
                name: `Batch User ${i}`,
                email: `batch${i}@example.com`,
                phone: '+1234567890',
                eventDate: '2025-09-01',
                package: 'Basic',
              },
            }),
          })
        );
      }

      const results = await Promise.all(submissions);
      results.forEach(r => expect(r.status).toBe(200));

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify all emails were sent but potentially batched
      expect(mockResend.emails.send.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it('should respect rate limits for email sending', async () => {
      const startTime = Date.now();
      const submissions = [];

      // Submit many forms to trigger rate limiting
      for (let i = 0; i < 50; i++) {
        submissions.push(
          fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formId,
              responses: {
                name: `Rate Limit User ${i}`,
                email: `rate${i}@example.com`,
                phone: '+1234567890',
                eventDate: '2025-10-01',
                package: 'Premium',
              },
            }),
          })
        );
      }

      await Promise.all(submissions);
      
      // Wait for all emails to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take longer than instant due to rate limiting
      expect(duration).toBeGreaterThan(1000);
      
      // Verify emails were sent with delays
      const callTimes = mockResend.emails.send.mock.calls.map(
        (call, index) => mockResend.emails.send.mock.results[index].value
      );

      // Check that calls were spread out over time
      const timeDiffs = [];
      for (let i = 1; i < callTimes.length; i++) {
        if (callTimes[i] && callTimes[i - 1]) {
          timeDiffs.push(callTimes[i] - callTimes[i - 1]);
        }
      }

      // Some time differences should be > 0 (rate limited)
      const hasDelays = timeDiffs.some(diff => diff > 10);
      expect(hasDelays).toBe(true);
    });

    it('should track email metrics and analytics', async () => {
      const submissionData = {
        formId,
        responses: {
          name: 'Analytics Test',
          email: 'analytics@example.com',
          phone: '+1234567890',
          eventDate: '2025-11-01',
          package: 'Deluxe',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      // Wait for email processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check email metrics were recorded
      const { data: metrics } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('submission_id', result.id)
        .single();

      expect(metrics).toBeTruthy();
      expect(metrics.sent_at).toBeTruthy();
      expect(metrics.recipient).toBe('analytics@example.com');
      expect(metrics.type).toBe('form_submission');
      expect(metrics.status).toBe('sent');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Simulate network failure
      mockResend.emails.send.mockRejectedValueOnce(new Error('Network timeout'));

      const submissionData = {
        formId,
        responses: {
          name: 'Network Failure Test',
          email: 'network@example.com',
          phone: '+1234567890',
          eventDate: '2025-12-01',
          package: 'Basic',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      // Form submission should succeed
      expect(response.status).toBe(200);

      const result = await response.json();
      
      // Check that email was queued for retry
      const { data: queue } = await supabase
        .from('email_queue')
        .select('*')
        .eq('submission_id', result.id)
        .single();

      expect(queue).toBeTruthy();
      expect(queue.status).toBe('pending_retry');
      expect(queue.retry_count).toBe(1);
    });

    it('should implement exponential backoff for retries', async () => {
      // Configure multiple failures
      mockResend.emails.send
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({ id: 'success-after-retries' });

      const submissionData = {
        formId,
        responses: {
          name: 'Backoff Test',
          email: 'backoff@example.com',
          phone: '+1234567890',
          eventDate: '2026-01-01',
          package: 'Premium',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      // Monitor retry attempts
      const retryTimes = [];
      let previousAttempt = Date.now();

      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: queue } = await supabase
          .from('email_queue')
          .select('last_attempt_at')
          .eq('submission_id', result.id)
          .single();

        if (queue.last_attempt_at) {
          const attemptTime = new Date(queue.last_attempt_at).getTime();
          retryTimes.push(attemptTime - previousAttempt);
          previousAttempt = attemptTime;
        }
      }

      // Verify exponential backoff (each retry takes longer)
      for (let i = 1; i < retryTimes.length; i++) {
        expect(retryTimes[i]).toBeGreaterThan(retryTimes[i - 1]);
      }
    });

    it('should dead-letter failed emails after max retries', async () => {
      // Configure persistent failure
      mockResend.emails.send.mockRejectedValue(new Error('Permanent failure'));

      const submissionData = {
        formId,
        responses: {
          name: 'Dead Letter Test',
          email: 'deadletter@example.com',
          phone: '+1234567890',
          eventDate: '2026-02-01',
          package: 'Basic',
        },
      };

      const response = await fetch(`${TEST_API_URL}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      // Wait for max retries (simulated)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check dead letter queue
      const { data: deadLetter } = await supabase
        .from('email_dead_letter')
        .select('*')
        .eq('submission_id', result.id)
        .single();

      expect(deadLetter).toBeTruthy();
      expect(deadLetter.status).toBe('failed');
      expect(deadLetter.retry_count).toBeGreaterThanOrEqual(3);
      expect(deadLetter.error_message).toContain('Permanent failure');
    });
  });
});