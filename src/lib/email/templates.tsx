import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
  Link,
} from '@react-email/components';

interface EmailTemplateProps {
  organizationName?: string;
  recipientName?: string;
  senderName?: string;
  subject?: string;
  previewText?: string;
}

interface MessageNotificationProps extends EmailTemplateProps {
  messageContent: string;
  conversationUrl: string;
  senderType: 'client' | 'vendor';
}

interface FormSubmissionProps extends EmailTemplateProps {
  formName: string;
  submissionUrl: string;
  clientName: string;
  weddingDate?: string;
}

interface BookingUpdateProps extends EmailTemplateProps {
  updateType: 'created' | 'updated' | 'cancelled';
  bookingDetails: string;
  bookingUrl: string;
  clientName: string;
}

interface PaymentNotificationProps extends EmailTemplateProps {
  paymentType: 'received' | 'failed' | 'reminder';
  amount: string;
  currency: string;
  clientName: string;
  invoiceUrl?: string;
  dueDate?: string;
}

// Base email wrapper component
function EmailWrapper({
  children,
  previewText,
  organizationName = 'WedSync',
}: {
  children: React.ReactNode;
  previewText?: string;
  organizationName?: string;
}) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://wedsync.com/logo.png"
              width="120"
              height="40"
              alt={organizationName}
              style={logo}
            />
          </Section>
          {children}
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              This email was sent by {organizationName} via WedSync. If you no
              longer wish to receive these emails, you can{' '}
              <Link href="#" style={link}>
                update your preferences
              </Link>
              .
            </Text>
            <Text style={footerText}>
              © 2024 WedSync. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Message notification email template
export function MessageNotificationEmail({
  recipientName,
  senderName,
  messageContent,
  conversationUrl,
  senderType,
  organizationName,
}: MessageNotificationProps) {
  const previewText = `New message from ${senderName}: ${messageContent.substring(0, 100)}...`;

  return (
    <EmailWrapper previewText={previewText} organizationName={organizationName}>
      <Section style={content}>
        <Text style={heading}>New message from {senderName}</Text>

        <Text style={text}>Hi {recipientName},</Text>

        <Text style={text}>
          You have received a new message from{' '}
          {senderType === 'vendor' ? 'your vendor' : 'your client'} {senderName}
          :
        </Text>

        <Section style={messageBox}>
          <Text style={messageText}>"{messageContent}"</Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={conversationUrl}>
            Reply to Message
          </Button>
        </Section>

        <Text style={text}>
          You can also reply directly to this conversation in your WedSync
          dashboard.
        </Text>
      </Section>
    </EmailWrapper>
  );
}

// Form submission notification email template
export function FormSubmissionEmail({
  recipientName,
  formName,
  submissionUrl,
  clientName,
  weddingDate,
  organizationName,
}: FormSubmissionProps) {
  const previewText = `New form submission: ${formName} from ${clientName}`;

  return (
    <EmailWrapper previewText={previewText} organizationName={organizationName}>
      <Section style={content}>
        <Text style={heading}>New Form Submission</Text>

        <Text style={text}>Hi {recipientName},</Text>

        <Text style={text}>
          {clientName} has submitted the form "{formName}".
        </Text>

        {weddingDate && (
          <Text style={text}>
            Wedding Date: {new Date(weddingDate).toLocaleDateString()}
          </Text>
        )}

        <Section style={buttonContainer}>
          <Button style={button} href={submissionUrl}>
            View Submission
          </Button>
        </Section>

        <Text style={text}>
          Log in to your WedSync dashboard to review the complete submission.
        </Text>
      </Section>
    </EmailWrapper>
  );
}

// Booking update notification email template
export function BookingUpdateEmail({
  recipientName,
  updateType,
  bookingDetails,
  bookingUrl,
  clientName,
  organizationName,
}: BookingUpdateProps) {
  const actionMap = {
    created: 'created',
    updated: 'updated',
    cancelled: 'cancelled',
  };

  const previewText = `Booking ${actionMap[updateType]} for ${clientName}`;

  return (
    <EmailWrapper previewText={previewText} organizationName={organizationName}>
      <Section style={content}>
        <Text style={heading}>
          Booking{' '}
          {actionMap[updateType].charAt(0).toUpperCase() +
            actionMap[updateType].slice(1)}
        </Text>

        <Text style={text}>Hi {recipientName},</Text>

        <Text style={text}>
          A booking has been {actionMap[updateType]} for {clientName}.
        </Text>

        <Section style={messageBox}>
          <Text style={messageText}>{bookingDetails}</Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={bookingUrl}>
            View Booking Details
          </Button>
        </Section>
      </Section>
    </EmailWrapper>
  );
}

// Payment notification email template
export function PaymentNotificationEmail({
  recipientName,
  paymentType,
  amount,
  currency,
  clientName,
  invoiceUrl,
  dueDate,
  organizationName,
}: PaymentNotificationProps) {
  const typeMap = {
    received: 'Payment Received',
    failed: 'Payment Failed',
    reminder: 'Payment Reminder',
  };

  const previewText = `${typeMap[paymentType]}: ${currency}${amount} for ${clientName}`;

  return (
    <EmailWrapper previewText={previewText} organizationName={organizationName}>
      <Section style={content}>
        <Text style={heading}>{typeMap[paymentType]}</Text>

        <Text style={text}>Hi {recipientName},</Text>

        {paymentType === 'received' && (
          <Text style={text}>
            Great news! You have received a payment of {currency}
            {amount} from {clientName}.
          </Text>
        )}

        {paymentType === 'failed' && (
          <Text style={text}>
            A payment of {currency}
            {amount} from {clientName} has failed. Please contact your client to
            resolve the payment issue.
          </Text>
        )}

        {paymentType === 'reminder' && (
          <Text style={text}>
            This is a reminder that a payment of {currency}
            {amount} from {clientName} is{' '}
            {dueDate
              ? `due on ${new Date(dueDate).toLocaleDateString()}`
              : 'overdue'}
            .
          </Text>
        )}

        {invoiceUrl && (
          <Section style={buttonContainer}>
            <Button style={button} href={invoiceUrl}>
              View Invoice
            </Button>
          </Section>
        )}
      </Section>
    </EmailWrapper>
  );
}

// Welcome email template
export function WelcomeEmail({
  recipientName,
  organizationName,
}: EmailTemplateProps) {
  const previewText = `Welcome to ${organizationName}!`;

  return (
    <EmailWrapper previewText={previewText} organizationName={organizationName}>
      <Section style={content}>
        <Text style={heading}>Welcome to {organizationName}!</Text>

        <Text style={text}>Hi {recipientName},</Text>

        <Text style={text}>
          Welcome to WedSync! We're excited to help you streamline your wedding
          business and provide an amazing experience for your clients.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href="https://app.wedsync.com/dashboard">
            Get Started
          </Button>
        </Section>

        <Text style={text}>
          If you have any questions, feel free to reach out to our support team.
          We're here to help you succeed!
        </Text>
      </Section>
    </EmailWrapper>
  );
}

// CSS Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '5px',
  margin: '40px auto',
  padding: '20px',
  width: '465px',
};

const header = {
  paddingBottom: '20px',
  borderBottom: '1px solid #eaeaea',
  marginBottom: '20px',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0',
};

const heading = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const messageBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '5px',
  padding: '16px',
  margin: '20px 0',
};

const messageText = {
  color: '#495057',
  fontSize: '16px',
  fontStyle: 'italic',
  lineHeight: '24px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '200px',
  padding: '12px 0',
};

const footer = {
  marginTop: '40px',
};

const hr = {
  border: 'none',
  borderTop: '1px solid #eaeaea',
  margin: '26px 0',
};

const footerText = {
  color: '#666666',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
