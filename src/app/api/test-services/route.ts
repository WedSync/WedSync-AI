import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email-service';
import { SMSService } from '@/lib/services/sms-service';

export async function POST(request: NextRequest) {
  try {
    const { service, testData } = await request.json();

    if (service === 'email') {
      const emailService = new EmailService();

      const messageId = await emailService.sendEmail({
        to: testData.to || 'test@example.com',
        subject: testData.subject || 'Test Email from WedSync Journey Builder',
        html_content:
          testData.content ||
          `
          <h2>Test Email</h2>
          <p>This is a test email from the WedSync Journey Builder.</p>
          <p>If you're seeing this, the email service is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
      });

      return NextResponse.json({
        success: true,
        service: 'email',
        messageId,
        message: 'Email service test completed',
        details: {
          to: testData.to || 'test@example.com',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (service === 'sms') {
      const smsService = new SMSService();

      const messageSid = await smsService.sendSMS({
        to: testData.to || '+1234567890',
        message:
          testData.message ||
          `Test SMS from WedSync Journey Builder - ${new Date().toLocaleTimeString()}`,
      });

      return NextResponse.json({
        success: true,
        service: 'sms',
        messageSid,
        message: 'SMS service test completed',
        details: {
          to: testData.to || '+1234567890',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (service === 'both') {
      const emailService = new EmailService();
      const smsService = new SMSService();

      const results = await Promise.allSettled([
        emailService.sendEmail({
          to: testData.emailTo || 'test@example.com',
          subject: 'Journey Builder Test - Email Working',
          html_content: '<h2>Email service is connected!</h2>',
        }),
        smsService.sendSMS({
          to: testData.smsTo || '+1234567890',
          message: 'Journey Builder Test - SMS Working',
        }),
      ]);

      return NextResponse.json({
        success: true,
        service: 'both',
        results: {
          email:
            results[0].status === 'fulfilled'
              ? { success: true, messageId: results[0].value }
              : { success: false, error: (results[0] as any).reason?.message },
          sms:
            results[1].status === 'fulfilled'
              ? { success: true, messageSid: results[1].value }
              : { success: false, error: (results[1] as any).reason?.message },
        },
        message: 'Service tests completed',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid service. Use "email", "sms", or "both"',
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('Service test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Service test failed',
        details: error,
      },
      { status: 500 },
    );
  }
}
