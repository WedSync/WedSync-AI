import { NextRequest, NextResponse } from 'next/server';
import { emailServiceConnector } from '@/lib/services/email-connector';
import { smsServiceConnector } from '@/lib/services/sms-connector';

interface RouteParams {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { template_type, sample_data = {}, test_recipient } = body;

    if (!template_type) {
      return NextResponse.json(
        { success: false, error: 'template_type is required' },
        { status: 400 },
      );
    }

    let testResult;

    if (template_type === 'email') {
      // Test email template
      testResult = await emailServiceConnector.testTemplate(id, sample_data);

      // If test recipient provided, actually send a test email
      if (test_recipient?.email) {
        try {
          const deliveryResult = await emailServiceConnector.sendEmail({
            template_id: id,
            recipient: {
              email: test_recipient.email,
              name: test_recipient.name || 'Test User',
            },
            variables: {
              ...sample_data,
              test_mode: true,
              test_timestamp: new Date().toISOString(),
            },
            priority: 'low',
          });

          testResult.test_delivery = {
            message_id: deliveryResult.message_id,
            status: deliveryResult.status,
            sent_to: test_recipient.email,
          };
        } catch (deliveryError) {
          testResult.test_delivery = {
            error:
              deliveryError instanceof Error
                ? deliveryError.message
                : 'Delivery failed',
          };
        }
      }
    } else if (template_type === 'sms') {
      // Test SMS template by generating the message
      const template = await smsServiceConnector.getTemplate(id);

      if (!template) {
        return NextResponse.json(
          { success: false, error: 'SMS template not found' },
          { status: 404 },
        );
      }

      // Generate test message
      let testMessage = template.message_template;
      Object.entries(sample_data).forEach(([key, value]) => {
        testMessage = testMessage.replace(
          new RegExp(`{${key}}`, 'g'),
          String(value),
        );
      });

      // Calculate segments
      const hasUnicode = /[^\u0000-\u007F]/.test(testMessage);
      const maxLength = hasUnicode ? 67 : 153;
      const segments = Math.ceil(testMessage.length / maxLength);

      testResult = {
        message: testMessage,
        message_length: testMessage.length,
        segments_required: segments,
        variables_used: template.template_variables.filter((v) =>
          sample_data.hasOwnProperty(v),
        ),
        missing_variables: template.template_variables.filter(
          (v) => !sample_data.hasOwnProperty(v),
        ),
        estimated_cost: segments * 0.0075, // Rough estimate
      };

      // If test recipient provided, actually send a test SMS
      if (test_recipient?.phone) {
        try {
          const deliveryResult = await smsServiceConnector.sendSMS({
            template_id: id,
            recipient: {
              phone: test_recipient.phone,
              name: test_recipient.name || 'Test User',
            },
            variables: {
              ...sample_data,
              test_mode: true,
              test_timestamp: new Date().toISOString(),
            },
            priority: 'low',
            compliance_data: {
              consent_given: true,
              consent_timestamp: new Date().toISOString(),
              opt_in_method: 'single_opt_in',
            },
          });

          testResult.test_delivery = {
            message_id: deliveryResult.message_id,
            status: deliveryResult.status,
            sent_to: test_recipient.phone,
            cost: deliveryResult.cost_estimate,
          };
        } catch (deliveryError) {
          testResult.test_delivery = {
            error:
              deliveryError instanceof Error
                ? deliveryError.message
                : 'Delivery failed',
          };
        }
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template_type. Must be "email" or "sms"',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        template_id: id,
        template_type,
        test_result: testResult,
        sample_data_used: sample_data,
      },
    });
  } catch (error) {
    console.error('Template test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Template test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
