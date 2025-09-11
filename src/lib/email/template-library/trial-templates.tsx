import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Column,
  Row,
} from '@react-email/components';

// Common styles for all trial emails
const baseStyles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    textAlign: 'center' as const,
  },
  content: {
    padding: '32px 24px',
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    padding: '24px',
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#6b7280',
  },
};

// Template Data Interface
export interface TrialTemplateData {
  user: {
    firstName: string;
    fullName: string;
    email: string;
    organizationName?: string;
  };
  trial: {
    daysRemaining: number;
    daysUsed: number;
    totalDays: number;
    endDate: string;
    planType: string;
  };
  usage: {
    featuresUsed: string[];
    mostUsedFeature?: string;
    totalTimeSpent: number;
    conversionLikelihood: number;
  };
  personalization: {
    recommendedAction: string;
    discountOffer?: string;
    nextSteps: string[];
  };
  metadata: {
    campaignId: string;
    abTestVariant?: 'A' | 'B';
    unsubscribeUrl: string;
    supportUrl: string;
    dashboardUrl: string;
  };
}

// 1. Welcome Email Template
export const TrialWelcomeEmail: React.FC<{ data: TrialTemplateData }> = ({
  data,
}) => (
  <Html>
    <Head />
    <Preview>
      Welcome to your WedSync trial! Let's get you started with wedding
      management.
    </Preview>
    <Body style={{ backgroundColor: '#f3f4f6' }}>
      <Container style={baseStyles.container}>
        {/* Header */}
        <Section style={baseStyles.header}>
          <Img
            src="https://wedsync.com/logo.png"
            width="120"
            height="40"
            alt="WedSync"
          />
        </Section>

        {/* Content */}
        <Section style={baseStyles.content}>
          <Heading
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '24px',
            }}
          >
            Welcome to WedSync, {data.user.firstName}! 🎉
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '20px',
            }}
          >
            Your {data.trial.totalDays}-day {data.trial.planType} trial has
            started! You now have access to all professional features to
            streamline your wedding business.
          </Text>

          <Section
            style={{
              backgroundColor: '#f0f9ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <Text
              style={{
                fontSize: '14px',
                color: '#075985',
                margin: '0',
                fontWeight: '600',
              }}
            >
              Trial Progress: Day 1 of {data.trial.totalDays}
            </Text>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#bae6fd',
                borderRadius: '4px',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  width: `${(data.trial.daysUsed / data.trial.totalDays) * 100}%`,
                  height: '100%',
                  backgroundColor: '#0369a1',
                  borderRadius: '4px',
                }}
              ></div>
            </div>
          </Section>

          <Heading
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '16px',
            }}
          >
            Get started in 3 easy steps:
          </Heading>

          <Section style={{ marginBottom: '24px' }}>
            <Row>
              <Column style={{ width: '48px', verticalAlign: 'top' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#6366f1',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  1
                </div>
              </Column>
              <Column>
                <Text
                  style={{
                    fontSize: '16px',
                    color: '#111827',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Import Your Clients
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0 0 0',
                  }}
                >
                  Add your current wedding clients to see how WedSync organizes
                  everything
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ marginBottom: '24px' }}>
            <Row>
              <Column style={{ width: '48px', verticalAlign: 'top' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#6366f1',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  2
                </div>
              </Column>
              <Column>
                <Text
                  style={{
                    fontSize: '16px',
                    color: '#111827',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Create Your First Journey
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0 0 0',
                  }}
                >
                  Set up automated workflows to guide couples through their
                  wedding planning
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ marginBottom: '32px' }}>
            <Row>
              <Column style={{ width: '48px', verticalAlign: 'top' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#6366f1',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  3
                </div>
              </Column>
              <Column>
                <Text
                  style={{
                    fontSize: '16px',
                    color: '#111827',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Explore Features
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0 0 0',
                  }}
                >
                  Try our guest management, seating charts, timeline builder,
                  and more
                </Text>
              </Column>
            </Row>
          </Section>

          <Button href={data.metadata.dashboardUrl} style={baseStyles.button}>
            Start Your Setup
          </Button>
        </Section>

        {/* Footer */}
        <Section style={baseStyles.footer}>
          <Text style={{ margin: '0 0 8px 0' }}>
            Need help?{' '}
            <Link href={data.metadata.supportUrl}>
              Contact our support team
            </Link>
          </Text>
          <Text style={{ margin: '0' }}>
            <Link href={data.metadata.unsubscribeUrl}>Unsubscribe</Link> from
            trial emails
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// 2. Mid-Trial Engagement Email
export const TrialMidpointEmail: React.FC<{ data: TrialTemplateData }> = ({
  data,
}) => (
  <Html>
    <Head />
    <Preview>
      You're halfway through your trial! Here's what you've accomplished so far.
    </Preview>
    <Body style={{ backgroundColor: '#f3f4f6' }}>
      <Container style={baseStyles.container}>
        {/* Header */}
        <Section style={baseStyles.header}>
          <Img
            src="https://wedsync.com/logo.png"
            width="120"
            height="40"
            alt="WedSync"
          />
        </Section>

        {/* Content */}
        <Section style={baseStyles.content}>
          <Heading
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '24px',
            }}
          >
            Great progress, {data.user.firstName}! 📈
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            You're halfway through your {data.trial.planType} trial. Let's look
            at what you've accomplished:
          </Text>

          {/* Progress Section */}
          <Section
            style={{
              backgroundColor: '#f0fdf4',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <Row>
              <Column style={{ width: '50%' }}>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#15803d',
                    margin: '0',
                    fontWeight: '600',
                  }}
                >
                  Days Used: {data.trial.daysUsed} of {data.trial.totalDays}
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#15803d',
                    margin: '4px 0 0 0',
                  }}
                >
                  Features Explored: {data.usage.featuresUsed.length}
                </Text>
              </Column>
              <Column style={{ width: '50%' }}>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#15803d',
                    margin: '0',
                    fontWeight: '600',
                  }}
                >
                  Time Spent: {Math.floor(data.usage.totalTimeSpent / 60)} hours
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#15803d',
                    margin: '4px 0 0 0',
                  }}
                >
                  Favorite Feature: {data.usage.mostUsedFeature || 'Dashboard'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Features Used */}
          {data.usage.featuresUsed.length > 0 && (
            <Section style={{ marginBottom: '24px' }}>
              <Heading
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '16px',
                }}
              >
                Features you've tried:
              </Heading>
              {data.usage.featuresUsed.slice(0, 5).map((feature, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0',
                    paddingLeft: '16px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#22c55e',
                    }}
                  >
                    ✓
                  </span>
                  {feature}
                </Text>
              ))}
            </Section>
          )}

          {/* Recommendations */}
          <Section
            style={{
              backgroundColor: '#fef3c7',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <Heading
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#92400e',
                margin: '0 0 12px 0',
              }}
            >
              💡 Suggested next steps:
            </Heading>
            {data.personalization.nextSteps.map((step, index) => (
              <Text
                key={index}
                style={{ fontSize: '14px', color: '#92400e', margin: '4px 0' }}
              >
                • {step}
              </Text>
            ))}
          </Section>

          <Button href={data.metadata.dashboardUrl} style={baseStyles.button}>
            Continue Exploring
          </Button>
        </Section>

        {/* Footer */}
        <Section style={baseStyles.footer}>
          <Text style={{ margin: '0 0 8px 0' }}>
            Questions?{' '}
            <Link href={data.metadata.supportUrl}>We're here to help</Link>
          </Text>
          <Text style={{ margin: '0' }}>
            <Link href={data.metadata.unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// 3. Trial Ending Soon Email (with variants for A/B testing)
export const TrialEndingSoonEmailA: React.FC<{ data: TrialTemplateData }> = ({
  data,
}) => (
  <Html>
    <Head />
    <Preview>
      Your trial ends in {data.trial.daysRemaining} days. Don't lose access to
      your wedding management tools!
    </Preview>
    <Body style={{ backgroundColor: '#f3f4f6' }}>
      <Container style={baseStyles.container}>
        {/* Header */}
        <Section style={baseStyles.header}>
          <Img
            src="https://wedsync.com/logo.png"
            width="120"
            height="40"
            alt="WedSync"
          />
        </Section>

        {/* Content */}
        <Section style={baseStyles.content}>
          {/* Urgency Banner */}
          <Section
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: '16px',
                color: '#dc2626',
                fontWeight: '600',
                margin: '0',
              }}
            >
              ⏰ Your trial ends in {data.trial.daysRemaining} days
            </Text>
          </Section>

          <Heading
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '24px',
            }}
          >
            Don't lose your progress, {data.user.firstName}
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            You've made great progress with WedSync during your trial. In just{' '}
            {data.trial.daysUsed} days, you've explored{' '}
            {data.usage.featuresUsed.length} features and spent{' '}
            {Math.floor(data.usage.totalTimeSpent / 60)} hours streamlining your
            wedding business.
          </Text>

          {/* Value Proposition */}
          <Section style={{ marginBottom: '24px' }}>
            <Heading
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px',
              }}
            >
              What you'll keep with a subscription:
            </Heading>
            <Text
              style={{ fontSize: '14px', color: '#374151', margin: '8px 0' }}
            >
              ✨ All your client data and workflows you've set up
            </Text>
            <Text
              style={{ fontSize: '14px', color: '#374151', margin: '8px 0' }}
            >
              🎯 Advanced automation features that save hours per wedding
            </Text>
            <Text
              style={{ fontSize: '14px', color: '#374151', margin: '8px 0' }}
            >
              📊 Detailed analytics and reporting for your business
            </Text>
            <Text
              style={{ fontSize: '14px', color: '#374151', margin: '8px 0' }}
            >
              🔒 Enterprise-grade security and daily backups
            </Text>
          </Section>

          {/* Discount Offer */}
          {data.personalization.discountOffer && (
            <Section
              style={{
                backgroundColor: '#f0f9ff',
                border: '2px solid #0ea5e9',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: '18px',
                  color: '#0369a1',
                  fontWeight: '600',
                  margin: '0 0 8px 0',
                }}
              >
                🎉 Special Trial Offer
              </Text>
              <Text style={{ fontSize: '16px', color: '#0369a1', margin: '0' }}>
                Get {data.personalization.discountOffer} off your first 3 months
              </Text>
            </Section>
          )}

          <Button
            href={`${data.metadata.dashboardUrl}/upgrade`}
            style={baseStyles.button}
          >
            Continue with WedSync
          </Button>

          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '16px',
            }}
          >
            Need more time to decide?{' '}
            <Link href={`${data.metadata.supportUrl}/extend-trial`}>
              Request an extension
            </Link>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={baseStyles.footer}>
          <Text style={{ margin: '0 0 8px 0' }}>
            Questions about pricing?{' '}
            <Link href={data.metadata.supportUrl}>Talk to our team</Link>
          </Text>
          <Text style={{ margin: '0' }}>
            <Link href={data.metadata.unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Variant B: More casual tone
export const TrialEndingSoonEmailB: React.FC<{ data: TrialTemplateData }> = ({
  data,
}) => (
  <Html>
    <Head />
    <Preview>
      Hey {data.user.firstName}! Only {data.trial.daysRemaining} days left in
      your trial 💔
    </Preview>
    <Body style={{ backgroundColor: '#f3f4f6' }}>
      <Container style={baseStyles.container}>
        {/* Header */}
        <Section style={baseStyles.header}>
          <Img
            src="https://wedsync.com/logo.png"
            width="120"
            height="40"
            alt="WedSync"
          />
        </Section>

        {/* Content */}
        <Section style={baseStyles.content}>
          <Heading
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '24px',
            }}
          >
            Hey {data.user.firstName}! 👋
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            We noticed you've been loving WedSync (you've spent{' '}
            {Math.floor(data.usage.totalTimeSpent / 60)} hours with us already!
            😍). But your trial is ending in just {data.trial.daysRemaining}{' '}
            days...
          </Text>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            We'd hate to see all the progress you've made disappear. You've
            already set up so much:
          </Text>

          {/* Casual Progress List */}
          <Section style={{ marginBottom: '24px' }}>
            {data.usage.featuresUsed.slice(0, 3).map((feature, index) => (
              <Text
                key={index}
                style={{
                  fontSize: '16px',
                  color: '#374151',
                  margin: '8px 0',
                  paddingLeft: '20px',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: '0' }}>🎉</span>
                {feature}
              </Text>
            ))}
          </Section>

          {/* Casual CTA */}
          <Section
            style={{
              backgroundColor: '#fef3c7',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: '18px',
                color: '#92400e',
                fontWeight: '600',
                margin: '0 0 8px 0',
              }}
            >
              Ready to keep the magic going? ✨
            </Text>
            {data.personalization.discountOffer && (
              <Text style={{ fontSize: '16px', color: '#92400e', margin: '0' }}>
                Plus, we've got {data.personalization.discountOffer} off waiting
                for you!
              </Text>
            )}
          </Section>

          <Button
            href={`${data.metadata.dashboardUrl}/upgrade`}
            style={{
              ...baseStyles.button,
              backgroundColor: '#f59e0b',
            }}
          >
            Let's Do This! 🚀
          </Button>

          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '16px',
            }}
          >
            Need a bit more time?{' '}
            <Link href={`${data.metadata.supportUrl}/extend-trial`}>
              Let's chat about an extension
            </Link>{' '}
            💬
          </Text>
        </Section>

        {/* Footer */}
        <Section style={baseStyles.footer}>
          <Text style={{ margin: '0 0 8px 0' }}>
            Want to talk it through?{' '}
            <Link href={data.metadata.supportUrl}>We're here for you</Link>
          </Text>
          <Text style={{ margin: '0' }}>
            <Link href={data.metadata.unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// 4. Extension Offer Email
export const TrialExtensionEmail: React.FC<{ data: TrialTemplateData }> = ({
  data,
}) => (
  <Html>
    <Head />
    <Preview>Good news! We're extending your trial by 15 more days.</Preview>
    <Body style={{ backgroundColor: '#f3f4f6' }}>
      <Container style={baseStyles.container}>
        {/* Header */}
        <Section style={baseStyles.header}>
          <Img
            src="https://wedsync.com/logo.png"
            width="120"
            height="40"
            alt="WedSync"
          />
        </Section>

        {/* Content */}
        <Section style={baseStyles.content}>
          {/* Success Banner */}
          <Section
            style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #22c55e',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: '20px',
                color: '#15803d',
                fontWeight: '600',
                margin: '0',
              }}
            >
              🎉 Great news, {data.user.firstName}!
            </Text>
            <Text
              style={{
                fontSize: '16px',
                color: '#15803d',
                margin: '8px 0 0 0',
              }}
            >
              We've extended your trial by 15 days
            </Text>
          </Section>

          <Heading
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '24px',
            }}
          >
            More time to perfect your setup
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            We saw how actively you've been using WedSync during your trial.
            You've clearly invested time in setting up your workflows, and we
            want to make sure you have enough time to see the full value.
          </Text>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              marginBottom: '24px',
            }}
          >
            Your extended trial now runs until{' '}
            <strong>{data.trial.endDate}</strong>, giving you more time to:
          </Text>

          <Section style={{ marginBottom: '24px' }}>
            <Text
              style={{ fontSize: '16px', color: '#374151', margin: '8px 0' }}
            >
              📈 Complete your client onboarding process
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#374151', margin: '8px 0' }}
            >
              🔄 Test the full automation workflows
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#374151', margin: '8px 0' }}
            >
              👥 Train your team on the platform
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#374151', margin: '8px 0' }}
            >
              📊 See detailed analytics from actual usage
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: '#f0f9ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <Text
              style={{
                fontSize: '16px',
                color: '#0369a1',
                fontWeight: '600',
                margin: '0 0 8px 0',
              }}
            >
              💡 Make the most of your extension:
            </Text>
            <Text style={{ fontSize: '14px', color: '#075985', margin: '0' }}>
              Schedule a 1-on-1 setup session with our team to optimize your
              workflows and ensure you're getting maximum value from every
              feature.
            </Text>
          </Section>

          <Button
            href={`${data.metadata.supportUrl}/schedule-consultation`}
            style={baseStyles.button}
          >
            Schedule My Setup Session
          </Button>

          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '16px',
            }}
          >
            Continue using all features at{' '}
            <Link href={data.metadata.dashboardUrl}>your dashboard</Link>
          </Text>
        </Section>

        {/* Footer */}
        <Section style={baseStyles.footer}>
          <Text style={{ margin: '0 0 8px 0' }}>
            Questions about your extension?{' '}
            <Link href={data.metadata.supportUrl}>Contact support</Link>
          </Text>
          <Text style={{ margin: '0' }}>
            <Link href={data.metadata.unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Export all templates with their template configurations
export const TRIAL_EMAIL_TEMPLATES = {
  trial_welcome: {
    variants: {
      A: TrialWelcomeEmail,
      B: TrialWelcomeEmail, // Same for now, could create variant
    },
    subject: (data: TrialTemplateData) =>
      `Welcome to WedSync, ${data.user.firstName}! Your trial starts now 🎉`,
    previewText: 'Get started with professional wedding management tools',
  },
  trial_midpoint: {
    variants: {
      A: TrialMidpointEmail,
      B: TrialMidpointEmail,
    },
    subject: (data: TrialTemplateData) =>
      `${data.user.firstName}, you're halfway through your trial! 📈`,
    previewText: "See what you've accomplished and what's next",
  },
  trial_ending_soon: {
    variants: {
      A: TrialEndingSoonEmailA,
      B: TrialEndingSoonEmailB,
    },
    subject: {
      A: (data: TrialTemplateData) =>
        `${data.trial.daysRemaining} days left - Don't lose your progress`,
      B: (data: TrialTemplateData) =>
        `Hey ${data.user.firstName}! Only ${data.trial.daysRemaining} days left 💔`,
    },
    previewText: {
      A: 'Continue your wedding management journey with WedSync',
      B: "We'd hate to see you go!",
    },
  },
  trial_extension: {
    variants: {
      A: TrialExtensionEmail,
      B: TrialExtensionEmail,
    },
    subject: (data: TrialTemplateData) =>
      `Good news! We've extended your trial, ${data.user.firstName}`,
    previewText: '15 more days to perfect your wedding management setup',
  },
};

// Helper function to render template
export function renderTrialEmail(
  templateId: keyof typeof TRIAL_EMAIL_TEMPLATES,
  variant: 'A' | 'B',
  data: TrialTemplateData,
): string {
  const template = TRIAL_EMAIL_TEMPLATES[templateId];
  const TemplateComponent = template.variants[variant];

  // In production, this would use @react-email/render
  return `<html><!-- Rendered ${templateId} variant ${variant} --></html>`;
}

// Export template data type for use in other modules
export type { TrialTemplateData };
