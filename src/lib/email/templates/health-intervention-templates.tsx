/**
 * WS-168: Health Intervention Email Templates
 * React Email templates for different risk levels
 */

import React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

// Common styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const logo = {
  margin: '0 auto',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
};

const buttonPrimary = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const buttonSecondary = {
  backgroundColor: '#ffffff',
  borderRadius: '5px',
  color: '#5469d4',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  border: '2px solid #5469d4',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};

// Critical Health Intervention Template
export interface CriticalHealthEmailProps {
  supplierName: string;
  businessName: string;
  healthScore: number;
  lastActiveDate: string;
  topRecommendations: Array<{
    title: string;
    description: string;
  }>;
  scheduleCallUrl: string;
  dashboardUrl: string;
}

export const CriticalHealthInterventionEmail: React.FC<
  CriticalHealthEmailProps
> = ({
  supplierName,
  businessName,
  healthScore,
  lastActiveDate,
  topRecommendations,
  scheduleCallUrl,
  dashboardUrl,
}) => {
  const previewText = `Urgent: ${businessName}, your WedSync account needs immediate attention`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
              width="150"
              height="50"
              alt="WedSync"
              style={logo}
            />
          </Section>

          <Section style={{ paddingTop: '20px' }}>
            <Row>
              <Column>
                <div
                  style={{
                    backgroundColor: '#dc3545',
                    color: '#ffffff',
                    padding: '15px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <Text
                    style={{
                      ...paragraph,
                      color: '#ffffff',
                      margin: 0,
                      fontWeight: 'bold',
                    }}
                  >
                    🚨 Critical Account Health Alert
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>

          <Heading style={heading}>Hi {supplierName},</Heading>

          <Text style={paragraph}>
            We've noticed that your engagement with WedSync has significantly
            decreased, and we're concerned about your success on our platform.
          </Text>

          <Section
            style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ ...paragraph, margin: 0 }}>
              <strong>Your Current Health Score: {healthScore}%</strong>
            </Text>
            <Text
              style={{ ...paragraph, margin: '5px 0 0 0', fontSize: '14px' }}
            >
              Last active: {lastActiveDate}
            </Text>
          </Section>

          <Text style={paragraph}>
            <strong>We're here to help you succeed!</strong> Our Success Team
            has identified several opportunities to help you get more value from
            WedSync:
          </Text>

          <Section style={{ marginTop: '20px', marginBottom: '30px' }}>
            {topRecommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  borderLeft: '4px solid #5469d4',
                  paddingLeft: '15px',
                  marginBottom: '15px',
                }}
              >
                <Text
                  style={{
                    ...paragraph,
                    fontWeight: 'bold',
                    marginBottom: '5px',
                  }}
                >
                  {rec.title}
                </Text>
                <Text
                  style={{ ...paragraph, marginTop: '5px', fontSize: '14px' }}
                >
                  {rec.description}
                </Text>
              </div>
            ))}
          </Section>

          <Section>
            <Row>
              <Column align="center">
                <Button href={scheduleCallUrl} style={buttonPrimary}>
                  Schedule a Success Call
                </Button>
              </Column>
            </Row>
            <Row style={{ marginTop: '10px' }}>
              <Column align="center">
                <Button href={dashboardUrl} style={buttonSecondary}>
                  Visit Your Dashboard
                </Button>
              </Column>
            </Row>
          </Section>

          <Text style={paragraph}>
            Don't let your wedding business momentum slow down. We have helped
            thousands of suppliers like you streamline their operations and grow
            their business.
          </Text>

          <hr style={hr} />

          <Text style={footer}>
            You're receiving this email because your account health score
            indicates you may need assistance. We're committed to your success
            on WedSync.
          </Text>

          <Text style={footer}>WedSync - Empowering Wedding Professionals</Text>
        </Container>
      </Body>
    </Html>
  );
};

// High Risk Intervention Template
export interface HighRiskEmailProps {
  supplierName: string;
  businessName: string;
  healthScore: number;
  unusedFeatures: string[];
  recommendations: Array<{
    title: string;
    action: string;
  }>;
  resourcesUrl: string;
  dashboardUrl: string;
}

export const HighRiskInterventionEmail: React.FC<HighRiskEmailProps> = ({
  supplierName,
  businessName,
  healthScore,
  unusedFeatures,
  recommendations,
  resourcesUrl,
  dashboardUrl,
}) => {
  const previewText = `${supplierName}, let's boost your WedSync experience together`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
              width="150"
              height="50"
              alt="WedSync"
              style={logo}
            />
          </Section>

          <Section style={{ paddingTop: '20px' }}>
            <Row>
              <Column>
                <div
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#000000',
                    padding: '15px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <Text
                    style={{
                      ...paragraph,
                      color: '#000000',
                      margin: 0,
                      fontWeight: 'bold',
                    }}
                  >
                    ⚠️ Your Account Needs Attention
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>

          <Heading style={heading}>Hi {supplierName},</Heading>

          <Text style={paragraph}>
            We've noticed your WedSync usage has decreased recently. Let's work
            together to help you get back on track and maximize your platform
            benefits.
          </Text>

          <Text style={paragraph}>
            <strong>Current Health Score: {healthScore}%</strong>
          </Text>

          {unusedFeatures.length > 0 && (
            <>
              <Text style={paragraph}>
                <strong>You're missing out on these powerful features:</strong>
              </Text>
              <ul>
                {unusedFeatures.slice(0, 3).map((feature, index) => (
                  <li key={index} style={{ ...paragraph, marginBottom: '8px' }}>
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Section
            style={{
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ ...paragraph, fontWeight: 'bold', marginTop: 0 }}>
              Quick Actions to Improve:
            </Text>
            {recommendations.map((rec, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <Text style={{ ...paragraph, margin: 0 }}>
                  ✓ {rec.title}:{' '}
                  <Link href={dashboardUrl} style={{ color: '#5469d4' }}>
                    {rec.action}
                  </Link>
                </Text>
              </div>
            ))}
          </Section>

          <Section>
            <Row>
              <Column align="center">
                <Button href={resourcesUrl} style={buttonPrimary}>
                  View Helpful Resources
                </Button>
              </Column>
            </Row>
          </Section>

          <hr style={hr} />

          <Text style={footer}>
            Need help? Reply to this email or visit our help center for
            immediate assistance.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Medium Risk Intervention Template
export interface MediumRiskEmailProps {
  supplierName: string;
  healthScore: number;
  featuresDiscover: string[];
  tipsUrl: string;
}

export const MediumRiskInterventionEmail: React.FC<MediumRiskEmailProps> = ({
  supplierName,
  healthScore,
  featuresDiscover,
  tipsUrl,
}) => {
  const previewText = `${supplierName}, discover WedSync features you might be missing`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
              width="150"
              height="50"
              alt="WedSync"
              style={logo}
            />
          </Section>

          <Heading style={heading}>Hi {supplierName},</Heading>

          <Text style={paragraph}>
            Did you know that suppliers who use more WedSync features report 40%
            higher client satisfaction?
          </Text>

          <Text style={paragraph}>
            Your current engagement score is {healthScore}%, which means there's
            room to unlock more value from your subscription.
          </Text>

          <Section
            style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ ...paragraph, fontWeight: 'bold', marginTop: 0 }}>
              💡 Features to Explore This Week:
            </Text>
            {featuresDiscover.map((feature, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <Text style={{ ...paragraph, margin: 0 }}>• {feature}</Text>
              </div>
            ))}
          </Section>

          <Section>
            <Row>
              <Column align="center">
                <Button href={tipsUrl} style={buttonPrimary}>
                  Get Pro Tips
                </Button>
              </Column>
            </Row>
          </Section>

          <hr style={hr} />

          <Text style={footer}>
            This is a friendly reminder to help you get the most from WedSync.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Admin Alert Email Template
export interface AdminAlertEmailProps {
  adminName: string;
  alertType: 'critical' | 'high';
  supplierName: string;
  businessName: string;
  healthScore: number;
  riskIndicators: Array<{
    type: string;
    description: string;
    value: number;
  }>;
  actionItems: string[];
  dashboardUrl: string;
  supplierProfileUrl: string;
}

export const AdminHealthAlertEmail: React.FC<AdminAlertEmailProps> = ({
  adminName,
  alertType,
  supplierName,
  businessName,
  healthScore,
  riskIndicators,
  actionItems,
  dashboardUrl,
  supplierProfileUrl,
}) => {
  const previewText = `${alertType === 'critical' ? '🚨 CRITICAL' : '⚠️ HIGH'} Health Alert: ${businessName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <div
              style={{
                backgroundColor:
                  alertType === 'critical' ? '#dc3545' : '#ffc107',
                color: alertType === 'critical' ? '#ffffff' : '#000000',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <Heading
                style={{
                  ...heading,
                  color: alertType === 'critical' ? '#ffffff' : '#000000',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {alertType === 'critical' ? '🚨 CRITICAL' : '⚠️ HIGH'} Health
                Score Alert
              </Heading>
            </div>
          </Section>

          <Text style={paragraph}>Hi {adminName},</Text>

          <Text style={paragraph}>
            Immediate attention required for the following supplier account:
          </Text>

          <Section
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ ...paragraph, margin: 0 }}>
              <strong>Business:</strong> {businessName}
            </Text>
            <Text style={{ ...paragraph, margin: '5px 0' }}>
              <strong>Contact:</strong> {supplierName}
            </Text>
            <Text style={{ ...paragraph, margin: '5px 0' }}>
              <strong>Health Score:</strong>{' '}
              <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                {healthScore}%
              </span>
            </Text>
          </Section>

          <Text style={{ ...paragraph, fontWeight: 'bold' }}>
            Risk Indicators:
          </Text>
          {riskIndicators.map((risk, index) => (
            <div
              key={index}
              style={{
                borderLeft: '4px solid #dc3545',
                paddingLeft: '15px',
                marginBottom: '10px',
              }}
            >
              <Text style={{ ...paragraph, margin: 0, fontWeight: 'bold' }}>
                {risk.type}
              </Text>
              <Text style={{ ...paragraph, margin: '5px 0', fontSize: '14px' }}>
                {risk.description} (Current: {risk.value})
              </Text>
            </div>
          ))}

          <Text style={{ ...paragraph, fontWeight: 'bold', marginTop: '20px' }}>
            Recommended Actions:
          </Text>
          <ol>
            {actionItems.map((item, index) => (
              <li key={index} style={{ ...paragraph, marginBottom: '8px' }}>
                {item}
              </li>
            ))}
          </ol>

          <Section style={{ marginTop: '30px' }}>
            <Row>
              <Column align="center">
                <Button href={supplierProfileUrl} style={buttonPrimary}>
                  View Supplier Profile
                </Button>
              </Column>
            </Row>
            <Row style={{ marginTop: '10px' }}>
              <Column align="center">
                <Button href={dashboardUrl} style={buttonSecondary}>
                  Customer Success Dashboard
                </Button>
              </Column>
            </Row>
          </Section>

          <hr style={hr} />

          <Text style={footer}>
            This is an automated alert from the WedSync Customer Success System.
            Please take action within 24 hours for critical alerts.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
