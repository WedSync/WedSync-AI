// WS-161: Supplier Schedule Email Templates
import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Img,
} from '@react-email/components';

const baseStyles = {
  container: {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '580px',
  },
  section: {
    padding: '24px',
    border: 'solid 1px #dedede',
    borderRadius: '5px',
    textAlign: 'center' as const,
  },
  text: {
    margin: '16px 0',
    fontSize: '14px',
    lineHeight: '24px',
    color: '#5a5a5a',
  },
  heading: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '20px 0',
  },
  button: {
    backgroundColor: '#007ee6',
    borderRadius: '3px',
    fontWeight: '600',
    color: '#fff',
    fontSize: '15px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '11px 23px',
    margin: '16px auto',
  },
  urgentBanner: {
    backgroundColor: '#ff4444',
    color: 'white',
    padding: '12px',
    textAlign: 'center' as const,
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    padding: '16px',
    margin: '16px 0',
    textAlign: 'left' as const,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    margin: '16px 0',
    textAlign: 'left' as const,
  },
  detailItem: {
    padding: '8px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  checklistItem: {
    padding: '4px 0',
    fontSize: '13px',
    textAlign: 'left' as const,
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    margin: '24px 0',
  },
  primaryButton: {
    ...baseStyles.button,
    backgroundColor: '#007ee6',
  },
  secondaryButton: {
    ...baseStyles.button,
    backgroundColor: '#6c757d',
  },
  emergencyButton: {
    ...baseStyles.button,
    backgroundColor: '#dc3545',
  },
};

interface SupplierScheduleUpdateEmailProps {
  supplierName: string;
  companyName: string;
  coupleNames: string;
  weddingDate: string;
  eventTitle: string;
  changeType: string;
  originalStartTime: string;
  newStartTime: string;
  originalEndTime: string;
  newEndTime: string;
  originalLocation: string;
  newLocation: string;
  reason: string;
  urgentFlag: boolean;
  contactPerson: string;
  contactPhone: string;
  specialInstructions: string;
  setupTime: string;
  breakdownTime: string;
  venueAddress: string;
  confirmationUrl: string;
  feedbackUrl: string;
}

export const SupplierScheduleUpdateEmail: React.FC<
  SupplierScheduleUpdateEmailProps
> = ({
  supplierName,
  companyName,
  coupleNames,
  weddingDate,
  eventTitle,
  changeType,
  originalStartTime,
  newStartTime,
  originalEndTime,
  newEndTime,
  originalLocation,
  newLocation,
  reason,
  urgentFlag,
  contactPerson,
  contactPhone,
  specialInstructions,
  setupTime,
  breakdownTime,
  venueAddress,
  confirmationUrl,
  feedbackUrl,
}) => (
  <Html>
    <Head />
    <Body
      style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
    >
      <Container style={baseStyles.container}>
        {urgentFlag && (
          <Section style={baseStyles.urgentBanner}>
            🚨 URGENT SCHEDULE CHANGE - IMMEDIATE ATTENTION REQUIRED
          </Section>
        )}

        <Section style={baseStyles.section}>
          <Heading style={baseStyles.heading}>
            📅 Schedule Update - {coupleNames} Wedding
          </Heading>

          <Text style={baseStyles.text}>
            Hello {supplierName} ({companyName}),
          </Text>

          <Text style={baseStyles.text}>
            We need to inform you of an important schedule change for the{' '}
            {coupleNames} wedding on {weddingDate}.
          </Text>

          <div style={baseStyles.infoBox}>
            <Text
              style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Event: {eventTitle}
            </Text>
            <Text style={{ margin: '0 0 8px 0' }}>
              <strong>Change Type:</strong>{' '}
              {changeType.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={{ margin: '0' }}>
              <strong>Reason:</strong> {reason}
            </Text>
          </div>

          <div style={baseStyles.detailsGrid}>
            <div style={baseStyles.detailItem}>
              <Text
                style={{
                  margin: '0 0 4px 0',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                ORIGINAL TIME
              </Text>
              <Text style={{ margin: '0', fontSize: '13px' }}>
                {originalStartTime}
              </Text>
              <Text style={{ margin: '0', fontSize: '13px' }}>
                to {originalEndTime}
              </Text>
            </div>
            <div style={baseStyles.detailItem}>
              <Text
                style={{
                  margin: '0 0 4px 0',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  color: '#007ee6',
                }}
              >
                NEW TIME
              </Text>
              <Text
                style={{
                  margin: '0',
                  fontSize: '13px',
                  color: '#007ee6',
                  fontWeight: 'bold',
                }}
              >
                {newStartTime}
              </Text>
              <Text
                style={{
                  margin: '0',
                  fontSize: '13px',
                  color: '#007ee6',
                  fontWeight: 'bold',
                }}
              >
                to {newEndTime}
              </Text>
            </div>
          </div>

          {originalLocation !== newLocation && (
            <div style={baseStyles.detailsGrid}>
              <div style={baseStyles.detailItem}>
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  ORIGINAL LOCATION
                </Text>
                <Text style={{ margin: '0', fontSize: '13px' }}>
                  {originalLocation}
                </Text>
              </div>
              <div style={baseStyles.detailItem}>
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: '#007ee6',
                  }}
                >
                  NEW LOCATION
                </Text>
                <Text
                  style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#007ee6',
                    fontWeight: 'bold',
                  }}
                >
                  {newLocation}
                </Text>
              </div>
            </div>
          )}

          {setupTime && (
            <div style={baseStyles.infoBox}>
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Additional Details:
              </Text>
              {setupTime && (
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                  Setup Time: {setupTime}
                </Text>
              )}
              {breakdownTime && (
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                  Breakdown Time: {breakdownTime}
                </Text>
              )}
              {venueAddress && (
                <Text style={{ margin: '0', fontSize: '13px' }}>
                  Venue: {venueAddress}
                </Text>
              )}
            </div>
          )}

          {specialInstructions && (
            <div style={baseStyles.infoBox}>
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Special Instructions:
              </Text>
              <Text style={{ margin: '0', fontSize: '13px' }}>
                {specialInstructions}
              </Text>
            </div>
          )}

          <div style={baseStyles.actionButtons}>
            <Button href={confirmationUrl} style={baseStyles.primaryButton}>
              ✅ Confirm Availability
            </Button>
            <Button href={feedbackUrl} style={baseStyles.secondaryButton}>
              💬 Send Feedback
            </Button>
          </div>

          <Hr style={{ margin: '32px 0' }} />

          <Text style={{ ...baseStyles.text, fontSize: '12px' }}>
            <strong>Emergency Contact:</strong> {contactPerson} - {contactPhone}
          </Text>

          <Text style={{ ...baseStyles.text, fontSize: '11px', color: '#999' }}>
            Please respond within 2 hours to confirm your availability for this
            change. If you have any conflicts or concerns, please contact us
            immediately.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

interface SupplierScheduleCancellationEmailProps {
  supplierName: string;
  companyName: string;
  coupleNames: string;
  weddingDate: string;
  eventTitle: string;
  originalStartTime: string;
  originalEndTime: string;
  location: string;
  cancellationReason: string;
  contactPerson: string;
  contactPhone: string;
  compensationAmount: string;
  compensationMethod: string;
  supportUrl: string;
  rebookingUrl: string;
}

export const SupplierScheduleCancellationEmail: React.FC<
  SupplierScheduleCancellationEmailProps
> = ({
  supplierName,
  companyName,
  coupleNames,
  weddingDate,
  eventTitle,
  originalStartTime,
  originalEndTime,
  location,
  cancellationReason,
  contactPerson,
  contactPhone,
  compensationAmount,
  compensationMethod,
  supportUrl,
  rebookingUrl,
}) => (
  <Html>
    <Head />
    <Body
      style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
    >
      <Container style={baseStyles.container}>
        <Section style={baseStyles.section}>
          <Heading style={baseStyles.heading}>
            ❌ Booking Cancelled - {coupleNames} Wedding
          </Heading>

          <Text style={baseStyles.text}>
            Dear {supplierName} ({companyName}),
          </Text>

          <Text style={baseStyles.text}>
            We regret to inform you that we need to cancel your booking for the{' '}
            {coupleNames} wedding.
          </Text>

          <div style={baseStyles.infoBox}>
            <Text
              style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Cancelled Event Details:
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Event:</strong> {eventTitle}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Date:</strong> {weddingDate}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Time:</strong> {originalStartTime} - {originalEndTime}
            </Text>
            <Text style={{ margin: '0' }}>
              <strong>Location:</strong> {location}
            </Text>
          </div>

          <div
            style={{
              ...baseStyles.infoBox,
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
            }}
          >
            <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
              Reason for Cancellation:
            </Text>
            <Text style={{ margin: '0' }}>{cancellationReason}</Text>
          </div>

          {compensationAmount && (
            <div
              style={{
                ...baseStyles.infoBox,
                backgroundColor: '#d1ecf1',
                border: '1px solid #bee5eb',
              }}
            >
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Compensation Details:
              </Text>
              <Text style={{ margin: '0 0 4px 0' }}>
                <strong>Amount:</strong> {compensationAmount}
              </Text>
              <Text style={{ margin: '0' }}>
                <strong>Payment Method:</strong> {compensationMethod}
              </Text>
            </div>
          )}

          <div style={baseStyles.actionButtons}>
            <Button href={supportUrl} style={baseStyles.primaryButton}>
              🎧 Contact Support
            </Button>
            <Button href={rebookingUrl} style={baseStyles.secondaryButton}>
              📅 Find New Bookings
            </Button>
          </div>

          <Hr style={{ margin: '32px 0' }} />

          <Text style={baseStyles.text}>
            We sincerely apologize for any inconvenience this may cause. Our
            team is committed to helping you find alternative bookings and
            ensuring this doesn't impact your business.
          </Text>

          <Text style={{ ...baseStyles.text, fontSize: '12px' }}>
            <strong>Support Contact:</strong> {contactPerson} - {contactPhone}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

interface SupplierScheduleReminderEmailProps {
  supplierName: string;
  companyName: string;
  coupleNames: string;
  weddingDate: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  location: string;
  venueAddress: string;
  setupTime: string;
  breakdownTime: string;
  reminderType: string;
  hoursUntil: number;
  specialInstructions: string;
  contactPerson: string;
  contactPhone: string;
  emergencyContact: string;
  checklistItems: string[];
  weatherUrl: string;
  directionsUrl: string;
  confirmationUrl: string;
}

export const SupplierScheduleReminderEmail: React.FC<
  SupplierScheduleReminderEmailProps
> = ({
  supplierName,
  companyName,
  coupleNames,
  weddingDate,
  eventTitle,
  startTime,
  endTime,
  location,
  venueAddress,
  setupTime,
  breakdownTime,
  reminderType,
  hoursUntil,
  specialInstructions,
  contactPerson,
  contactPhone,
  emergencyContact,
  checklistItems,
  weatherUrl,
  directionsUrl,
  confirmationUrl,
}) => (
  <Html>
    <Head />
    <Body
      style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
    >
      <Container style={baseStyles.container}>
        <Section style={baseStyles.section}>
          <Heading style={baseStyles.heading}>
            ⏰ Event Reminder - {coupleNames} Wedding
          </Heading>

          <Text style={baseStyles.text}>
            Hello {supplierName} ({companyName}),
          </Text>

          <Text style={baseStyles.text}>
            This is your {reminderType} reminder for the {coupleNames} wedding.
            Your event starts in <strong>{hoursUntil} hours</strong>.
          </Text>

          <div style={baseStyles.infoBox}>
            <Text
              style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Event Details:
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Event:</strong> {eventTitle}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Date:</strong> {weddingDate}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Time:</strong> {startTime} - {endTime}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Location:</strong> {location}
            </Text>
            {venueAddress && (
              <Text style={{ margin: '0' }}>
                <strong>Address:</strong> {venueAddress}
              </Text>
            )}
          </div>

          {(setupTime || breakdownTime) && (
            <div style={baseStyles.detailsGrid}>
              {setupTime && (
                <div style={baseStyles.detailItem}>
                  <Text
                    style={{
                      margin: '0 0 4px 0',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    SETUP TIME
                  </Text>
                  <Text style={{ margin: '0', fontSize: '13px' }}>
                    {setupTime}
                  </Text>
                </div>
              )}
              {breakdownTime && (
                <div style={baseStyles.detailItem}>
                  <Text
                    style={{
                      margin: '0 0 4px 0',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    BREAKDOWN TIME
                  </Text>
                  <Text style={{ margin: '0', fontSize: '13px' }}>
                    {breakdownTime}
                  </Text>
                </div>
              )}
            </div>
          )}

          {specialInstructions && (
            <div
              style={{
                ...baseStyles.infoBox,
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
              }}
            >
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Special Instructions:
              </Text>
              <Text style={{ margin: '0' }}>{specialInstructions}</Text>
            </div>
          )}

          <div style={baseStyles.infoBox}>
            <Text style={{ margin: '0 0 12px 0', fontWeight: 'bold' }}>
              Preparation Checklist:
            </Text>
            {checklistItems.map((item, index) => (
              <div key={index} style={baseStyles.checklistItem}>
                <Text style={{ margin: '0', fontSize: '13px' }}>☐ {item}</Text>
              </div>
            ))}
          </div>

          <div style={baseStyles.actionButtons}>
            <Button href={confirmationUrl} style={baseStyles.primaryButton}>
              ✅ Confirm Arrival
            </Button>
            {directionsUrl && (
              <Button href={directionsUrl} style={baseStyles.secondaryButton}>
                🗺️ Get Directions
              </Button>
            )}
            {weatherUrl && (
              <Button href={weatherUrl} style={baseStyles.secondaryButton}>
                🌤️ Check Weather
              </Button>
            )}
          </div>

          <Hr style={{ margin: '32px 0' }} />

          <Text style={{ ...baseStyles.text, fontSize: '12px' }}>
            <strong>Event Contact:</strong> {contactPerson} - {contactPhone}
            <br />
            <strong>Emergency Contact:</strong> {emergencyContact}
          </Text>

          <Text style={{ ...baseStyles.text, fontSize: '11px', color: '#999' }}>
            Safe travels and thank you for being part of this special day!
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

interface SupplierScheduleInviteEmailProps {
  supplierName: string;
  companyName: string;
  coupleNames: string;
  weddingDate: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  location: string;
  venueAddress: string;
  description: string;
  setupTime: string;
  breakdownTime: string;
  specialInstructions: string;
  contactPerson: string;
  contactPhone: string;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  appleCalendarUrl: string;
  downloadIcsUrl: string;
  responseUrl: string;
}

export const SupplierScheduleInviteEmail: React.FC<
  SupplierScheduleInviteEmailProps
> = ({
  supplierName,
  companyName,
  coupleNames,
  weddingDate,
  eventTitle,
  startTime,
  endTime,
  location,
  venueAddress,
  description,
  setupTime,
  breakdownTime,
  specialInstructions,
  contactPerson,
  contactPhone,
  googleCalendarUrl,
  outlookCalendarUrl,
  appleCalendarUrl,
  downloadIcsUrl,
  responseUrl,
}) => (
  <Html>
    <Head />
    <Body
      style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
    >
      <Container style={baseStyles.container}>
        <Section style={baseStyles.section}>
          <Heading style={baseStyles.heading}>
            📅 Calendar Invite - {coupleNames} Wedding
          </Heading>

          <Text style={baseStyles.text}>
            Hello {supplierName} ({companyName}),
          </Text>

          <Text style={baseStyles.text}>
            Please add this event to your calendar for the {coupleNames} wedding
            on {weddingDate}.
          </Text>

          <div style={baseStyles.infoBox}>
            <Text
              style={{
                margin: '0 0 8px 0',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {eventTitle}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Date:</strong> {weddingDate}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Time:</strong> {startTime} - {endTime}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Location:</strong> {location}
            </Text>
            {venueAddress && (
              <Text style={{ margin: '0' }}>
                <strong>Address:</strong> {venueAddress}
              </Text>
            )}
          </div>

          {description && (
            <div style={baseStyles.infoBox}>
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Description:
              </Text>
              <Text style={{ margin: '0' }}>{description}</Text>
            </div>
          )}

          <div style={baseStyles.detailsGrid}>
            {setupTime && (
              <div style={baseStyles.detailItem}>
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  SETUP
                </Text>
                <Text style={{ margin: '0', fontSize: '13px' }}>
                  {setupTime}
                </Text>
              </div>
            )}
            {breakdownTime && (
              <div style={baseStyles.detailItem}>
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  BREAKDOWN
                </Text>
                <Text style={{ margin: '0', fontSize: '13px' }}>
                  {breakdownTime}
                </Text>
              </div>
            )}
          </div>

          {specialInstructions && (
            <div style={{ ...baseStyles.infoBox, backgroundColor: '#f8f9fa' }}>
              <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                Instructions:
              </Text>
              <Text style={{ margin: '0' }}>{specialInstructions}</Text>
            </div>
          )}

          <Text
            style={{
              ...baseStyles.text,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Add to your calendar:
          </Text>

          <div style={baseStyles.actionButtons}>
            <Button href={googleCalendarUrl} style={baseStyles.primaryButton}>
              📅 Google Calendar
            </Button>
            <Button
              href={outlookCalendarUrl}
              style={baseStyles.secondaryButton}
            >
              📅 Outlook
            </Button>
          </div>

          <div style={baseStyles.actionButtons}>
            <Button href={appleCalendarUrl} style={baseStyles.secondaryButton}>
              📅 Apple Calendar
            </Button>
            <Button href={downloadIcsUrl} style={baseStyles.secondaryButton}>
              💾 Download .ics
            </Button>
          </div>

          <Button href={responseUrl} style={baseStyles.primaryButton}>
            ✅ Confirm Attendance
          </Button>

          <Hr style={{ margin: '32px 0' }} />

          <Text style={{ ...baseStyles.text, fontSize: '12px' }}>
            <strong>Contact:</strong> {contactPerson} - {contactPhone}
          </Text>

          <Text style={{ ...baseStyles.text, fontSize: '11px', color: '#999' }}>
            Please confirm your attendance and add this event to your calendar
            to avoid scheduling conflicts.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

interface SupplierConflictAlertEmailProps {
  supplierName: string;
  companyName: string;
  coupleNames: string;
  weddingDate: string;
  eventTitle: string;
  requestedStartTime: string;
  requestedEndTime: string;
  conflictingEvent: string;
  conflictTime: string;
  alternativeOptions: Array<{
    startTime: string;
    endTime: string;
    reason: string;
  }>;
  contactPerson: string;
  contactPhone: string;
  responseUrl: string;
  calendarUrl: string;
}

export const SupplierConflictAlertEmail: React.FC<
  SupplierConflictAlertEmailProps
> = ({
  supplierName,
  companyName,
  coupleNames,
  weddingDate,
  eventTitle,
  requestedStartTime,
  requestedEndTime,
  conflictingEvent,
  conflictTime,
  alternativeOptions,
  contactPerson,
  contactPhone,
  responseUrl,
  calendarUrl,
}) => (
  <Html>
    <Head />
    <Body
      style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
    >
      <Container style={baseStyles.container}>
        <Section
          style={{
            ...baseStyles.urgentBanner,
            backgroundColor: '#ffc107',
            color: '#212529',
          }}
        >
          ⚠️ SCHEDULE CONFLICT DETECTED - ACTION REQUIRED
        </Section>

        <Section style={baseStyles.section}>
          <Heading style={baseStyles.heading}>
            ⚠️ Schedule Conflict - {coupleNames} Wedding
          </Heading>

          <Text style={baseStyles.text}>
            Hello {supplierName} ({companyName}),
          </Text>

          <Text style={baseStyles.text}>
            We've detected a potential scheduling conflict with your calendar
            for the {coupleNames} wedding.
          </Text>

          <div
            style={{
              ...baseStyles.infoBox,
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
            }}
          >
            <Text style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
              Conflict Details:
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Requested Event:</strong> {eventTitle}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Requested Time:</strong> {requestedStartTime} -{' '}
              {requestedEndTime}
            </Text>
            <Text style={{ margin: '0 0 4px 0' }}>
              <strong>Conflicting Event:</strong> {conflictingEvent}
            </Text>
            <Text style={{ margin: '0' }}>
              <strong>Conflict Time:</strong> {conflictTime}
            </Text>
          </div>

          {alternativeOptions.length > 0 && (
            <div style={baseStyles.infoBox}>
              <Text style={{ margin: '0 0 12px 0', fontWeight: 'bold' }}>
                Alternative Time Options:
              </Text>
              {alternativeOptions.map((option, index) => (
                <div
                  key={index}
                  style={{ ...baseStyles.detailItem, marginBottom: '8px' }}
                >
                  <Text
                    style={{
                      margin: '0 0 4px 0',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}
                  >
                    Option {index + 1}: {option.startTime} - {option.endTime}
                  </Text>
                  <Text
                    style={{ margin: '0', fontSize: '12px', color: '#666' }}
                  >
                    {option.reason}
                  </Text>
                </div>
              ))}
            </div>
          )}

          <div style={baseStyles.actionButtons}>
            <Button href={responseUrl} style={baseStyles.emergencyButton}>
              🚨 Resolve Conflict
            </Button>
            <Button href={calendarUrl} style={baseStyles.secondaryButton}>
              📅 View Calendar
            </Button>
          </div>

          <Hr style={{ margin: '32px 0' }} />

          <Text style={baseStyles.text}>
            Please review your calendar and respond as soon as possible. We need
            to resolve this conflict to ensure smooth coordination for the
            wedding day.
          </Text>

          <Text style={{ ...baseStyles.text, fontSize: '12px' }}>
            <strong>Urgent Contact:</strong> {contactPerson} - {contactPhone}
          </Text>

          <Text
            style={{
              ...baseStyles.text,
              fontSize: '11px',
              color: '#dc3545',
              fontWeight: 'bold',
            }}
          >
            RESPONSE REQUIRED WITHIN 24 HOURS
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
