# WS-025: Meeting Scheduler - Technical Specification

## User Story

**As a wedding venue coordinator**, I need a public booking page where couples can self-schedule consultations, venue tours, and planning meetings so I can reduce phone tag and fill my calendar more efficiently.

**Real Wedding Scenario**: Lisa runs a popular wedding venue and spends hours daily scheduling meetings. She creates a public booking page at "grandviewvenue.wedsync.app/book" with different meeting types: 30-min consultation calls, 90-min venue tours, and 60-min planning sessions. Couples can see her real-time availability, book directly, and receive automatic confirmations with Zoom links and calendar invites. Her booking rate increases 40% while administrative time decreases dramatically.

## Database Schema

```sql
-- Meeting types configuration
CREATE TABLE meeting_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  location_type VARCHAR(20) NOT NULL, -- 'in_person', 'phone', 'video', 'client_choice'
  location_details JSONB DEFAULT '{}', -- Address, video link template, etc.
  price_cents INTEGER DEFAULT 0, -- For paid consultations
  currency VARCHAR(3) DEFAULT 'USD',
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 15,
  advance_notice_hours INTEGER DEFAULT 24, -- Minimum advance booking
  max_advance_days INTEGER DEFAULT 90, -- Maximum advance booking
  booking_form_fields JSONB DEFAULT '[]',
  confirmation_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for calendar display
  max_bookings_per_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public booking pages
CREATE TABLE booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  page_name VARCHAR(100) NOT NULL,
  page_slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  welcome_message TEXT,
  thank_you_message TEXT,
  meeting_types JSONB DEFAULT '[]', -- Array of meeting type IDs to include
  branding_config JSONB DEFAULT '{}',
  custom_css TEXT,
  seo_settings JSONB DEFAULT '{}',
  analytics_config JSONB DEFAULT '{}',
  security_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(page_slug),
  INDEX idx_booking_pages_slug (page_slug),
  INDEX idx_booking_pages_supplier_active (supplier_id, is_active)
);

-- Meeting bookings
CREATE TABLE meeting_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE SET NULL,
  meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE CASCADE,
  booking_reference VARCHAR(20) NOT NULL,
  attendee_name VARCHAR(100) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  attendee_phone VARCHAR(20),
  guest_count INTEGER DEFAULT 1,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  location_type VARCHAR(20) NOT NULL,
  location_details JSONB DEFAULT '{}',
  meeting_notes TEXT,
  form_responses JSONB DEFAULT '{}', -- Custom form field responses
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'rescheduled', 'cancelled', 'completed'
  cancellation_reason VARCHAR(50),
  cancelled_at TIMESTAMPTZ,
  rescheduled_from UUID REFERENCES meeting_bookings(id),
  payment_status VARCHAR(20) DEFAULT 'not_required', -- 'not_required', 'pending', 'paid', 'refunded'
  payment_amount_cents INTEGER,
  payment_intent_id VARCHAR(100), -- Stripe payment intent ID
  reminder_settings JSONB DEFAULT '{}',
  calendar_event_id VARCHAR(255), -- External calendar event ID
  video_meeting_link VARCHAR(500),
  video_meeting_id VARCHAR(100),
  video_meeting_password VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_reference),
  INDEX idx_meeting_bookings_supplier_date (supplier_id, scheduled_start),
  INDEX idx_meeting_bookings_attendee_email (attendee_email),
  INDEX idx_meeting_bookings_status (status, scheduled_start)
);

-- Meeting booking form fields
CREATE TABLE booking_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL, -- 'text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'date'
  field_options JSONB DEFAULT '[]', -- For select/radio/checkbox fields
  is_required BOOLEAN DEFAULT FALSE,
  placeholder_text VARCHAR(200),
  validation_rules JSONB DEFAULT '{}',
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_form_fields_meeting_type (meeting_type_id, display_order)
);

-- Booking notifications and reminders
CREATE TABLE booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES meeting_bookings(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL, -- 'confirmation', 'reminder', 'rescheduled', 'cancelled'
  recipient_type VARCHAR(20) NOT NULL, -- 'attendee', 'supplier', 'both'
  delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'both'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'cancelled'
  message_template JSONB NOT NULL,
  delivery_attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_notifications_scheduled (scheduled_for, status),
  INDEX idx_notifications_booking (booking_id, notification_type)
);

-- Video meeting integrations
CREATE TABLE video_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'zoom', 'google_meet', 'teams', 'webex'
  provider_account_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB NOT NULL, -- Provider-specific settings
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, provider)
);

-- Booking analytics
CREATE TABLE booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  booking_started INTEGER DEFAULT 0,
  booking_completed INTEGER DEFAULT 0,
  booking_cancelled INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4), -- Calculated field
  top_meeting_types JSONB DEFAULT '[]',
  top_referrer_sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, booking_page_id, date),
  INDEX idx_analytics_supplier_date (supplier_id, date)
);

-- Booking page customization templates
CREATE TABLE booking_page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  template_category VARCHAR(50), -- 'photography', 'venue', 'catering', etc.
  is_premium BOOLEAN DEFAULT FALSE,
  template_config JSONB NOT NULL,
  preview_image_url VARCHAR(500),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_templates_category (template_category, is_premium)
);

-- Indexes for performance
CREATE INDEX idx_meeting_types_supplier_active ON meeting_types(supplier_id, is_active);
CREATE INDEX idx_meeting_bookings_supplier_status ON meeting_bookings(supplier_id, status);
CREATE INDEX idx_meeting_bookings_date_range ON meeting_bookings(scheduled_start, scheduled_end);
```

## API Endpoints

```typescript
// Meeting scheduler data types
interface MeetingType {
  id: string;
  supplierId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  locationType: 'in_person' | 'phone' | 'video' | 'client_choice';
  locationDetails: {
    address?: string;
    videoProvider?: string;
    phoneNumber?: string;
    instructions?: string;
  };
  priceCents: number;
  currency: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  advanceNoticeHours: number;
  maxAdvanceDays: number;
  bookingFormFields: BookingFormField[];
  confirmationSettings: ConfirmationSettings;
  isActive: boolean;
  color: string;
  maxBookingsPerDay?: number;
}

interface BookingFormField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';
  fieldOptions?: string[];
  isRequired: boolean;
  placeholderText?: string;
  validationRules: Record<string, any>;
  displayOrder: number;
  isActive: boolean;
}

interface ConfirmationSettings {
  sendEmailConfirmation: boolean;
  sendSmsConfirmation: boolean;
  emailTemplate?: string;
  smsTemplate?: string;
  redirectUrl?: string;
  autoCreateCalendarEvent: boolean;
  autoCreateVideoMeeting: boolean;
}

interface BookingPage {
  id: string;
  supplierId: string;
  pageName: string;
  pageSlug: string;
  isActive: boolean;
  timezone: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  meetingTypes: string[]; // Array of meeting type IDs
  brandingConfig: BrandingConfig;
  customCss?: string;
  seoSettings: SEOSettings;
  analyticsConfig: AnalyticsConfig;
  securitySettings: SecuritySettings;
}

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  companyName?: string;
  customDomain?: string;
  favicon?: string;
  fontFamily?: string;
}

interface SEOSettings {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  robots?: string;
}

interface AnalyticsConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  hotjarId?: string;
  trackingEnabled: boolean;
}

interface SecuritySettings {
  requireCaptcha: boolean;
  allowedDomains?: string[];
  rateLimitRequests: number;
  enableSpamProtection: boolean;
}

interface MeetingBooking {
  id: string;
  supplierId: string;
  clientId?: string;
  bookingPageId?: string;
  meetingTypeId: string;
  bookingReference: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  guestCount: number;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  locationType: string;
  locationDetails: Record<string, any>;
  meetingNotes?: string;
  formResponses: Record<string, any>;
  status: 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
  cancellationReason?: string;
  cancelledAt?: string;
  rescheduledFrom?: string;
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'refunded';
  paymentAmountCents?: number;
  paymentIntentId?: string;
  reminderSettings: ReminderSettings;
  calendarEventId?: string;
  videoMeetingLink?: string;
  videoMeetingId?: string;
  videoMeetingPassword?: string;
  createdAt: string;
}

interface ReminderSettings {
  emailReminders: EmailReminder[];
  smsReminders: SMSReminder[];
}

interface EmailReminder {
  timeBeforeMinutes: number;
  template: string;
  isEnabled: boolean;
}

interface SMSReminder {
  timeBeforeMinutes: number;
  template: string;
  isEnabled: boolean;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  meetingTypeId: string;
  isAvailable: boolean;
  conflicts?: string[];
}

interface BookingAnalytics {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  bookingStarted: number;
  bookingCompleted: number;
  bookingCancelled: number;
  conversionRate: number;
  topMeetingTypes: { name: string; count: number }[];
  topReferrerSources: { source: string; count: number }[];
}

// API Routes
// POST /api/meeting-scheduler/meeting-types
interface CreateMeetingTypeRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  locationType: string;
  locationDetails: any;
  priceCents?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  advanceNoticeHours?: number;
  maxAdvanceDays?: number;
  bookingFormFields?: Partial<BookingFormField>[];
  confirmationSettings?: Partial<ConfirmationSettings>;
  color?: string;
}

interface CreateMeetingTypeResponse {
  success: boolean;
  data: MeetingType;
}

// GET /api/meeting-scheduler/meeting-types
interface GetMeetingTypesResponse {
  success: boolean;
  data: MeetingType[];
}

// POST /api/meeting-scheduler/booking-pages
interface CreateBookingPageRequest {
  pageName: string;
  pageSlug: string;
  timezone: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  meetingTypes: string[];
  brandingConfig?: Partial<BrandingConfig>;
  seoSettings?: Partial<SEOSettings>;
}

interface CreateBookingPageResponse {
  success: boolean;
  data: BookingPage;
}

// GET /api/meeting-scheduler/availability/:pageSlug
interface GetPublicAvailabilityRequest {
  meetingTypeId: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

interface GetPublicAvailabilityResponse {
  success: boolean;
  data: {
    availableSlots: AvailableSlot[];
    meetingType: MeetingType;
    bookingPage: BookingPage;
  };
}

// POST /api/meeting-scheduler/bookings/public
interface CreatePublicBookingRequest {
  bookingPageSlug: string;
  meetingTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  guestCount?: number;
  scheduledStart: string;
  timezone: string;
  formResponses?: Record<string, any>;
  meetingNotes?: string;
  paymentMethodId?: string; // For paid bookings
}

interface CreatePublicBookingResponse {
  success: boolean;
  data: {
    booking: MeetingBooking;
    confirmationUrl?: string;
    paymentUrl?: string;
  };
}

// GET /api/meeting-scheduler/bookings
interface GetBookingsRequest {
  startDate?: string;
  endDate?: string;
  status?: string;
  meetingTypeId?: string;
  page?: number;
  limit?: number;
}

interface GetBookingsResponse {
  success: boolean;
  data: MeetingBooking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// PUT /api/meeting-scheduler/bookings/:bookingId/reschedule
interface RescheduleBookingRequest {
  newStartTime: string;
  newEndTime: string;
  timezone: string;
  reason?: string;
  notifyAttendee?: boolean;
}

interface RescheduleBookingResponse {
  success: boolean;
  data: MeetingBooking;
}

// POST /api/meeting-scheduler/bookings/:bookingId/cancel
interface CancelBookingRequest {
  reason: string;
  refundPayment?: boolean;
  notifyAttendee?: boolean;
}

interface CancelBookingResponse {
  success: boolean;
  data: MeetingBooking;
}

// GET /api/meeting-scheduler/analytics
interface GetBookingAnalyticsRequest {
  startDate: string;
  endDate: string;
  bookingPageId?: string;
}

interface GetBookingAnalyticsResponse {
  success: boolean;
  data: BookingAnalytics[];
}

// POST /api/meeting-scheduler/video-integration
interface CreateVideoIntegrationRequest {
  provider: 'zoom' | 'google_meet' | 'teams' | 'webex';
  authCode?: string;
  configuration: any;
}

interface CreateVideoIntegrationResponse {
  success: boolean;
  data: any;
  authUrl?: string;
}
```

## Frontend Components

```typescript
// MeetingSchedulerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MeetingSchedulerDashboardProps {
  supplierId: string;
}

export const MeetingSchedulerDashboard: React.FC<MeetingSchedulerDashboardProps> = ({
  supplierId
}) => {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [bookingPages, setBookingPages] = useState<BookingPage[]>([]);
  const [recentBookings, setRecentBookings] = useState<MeetingBooking[]>([]);
  const [analytics, setAnalytics] = useState<BookingAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [supplierId]);

  const loadData = async () => {
    try {
      const [typesRes, pagesRes, bookingsRes, analyticsRes] = await Promise.all([
        fetch('/api/meeting-scheduler/meeting-types'),
        fetch('/api/meeting-scheduler/booking-pages'),
        fetch('/api/meeting-scheduler/bookings?limit=10'),
        fetch(`/api/meeting-scheduler/analytics?${new URLSearchParams({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })}`)
      ]);

      const [types, pages, bookings, analyticsData] = await Promise.all([
        typesRes.json(),
        pagesRes.json(),
        bookingsRes.json(),
        analyticsRes.json()
      ]);

      setMeetingTypes(types.data);
      setBookingPages(pages.data);
      setRecentBookings(bookings.data);
      setAnalytics(analyticsData.data);
    } catch (error) {
      console.error('Failed to load meeting scheduler data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading meeting scheduler...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {analytics.reduce((sum, day) => sum + day.bookingCompleted, 0)}
            </p>
            <p className="text-sm text-gray-500">Bookings (30 days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {analytics.length > 0 
                ? (analytics.reduce((sum, day) => sum + day.conversionRate, 0) / analytics.length * 100).toFixed(1)
                : '0.0'
              }%
            </p>
            <p className="text-sm text-gray-500">Conversion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{meetingTypes.length}</p>
            <p className="text-sm text-gray-500">Meeting Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{bookingPages.length}</p>
            <p className="text-sm text-gray-500">Booking Pages</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          <TabsTrigger value="meeting-types">Meeting Types</TabsTrigger>
          <TabsTrigger value="booking-pages">Booking Pages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <RecentBookingsView 
            bookings={recentBookings}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="meeting-types">
          <MeetingTypesManager 
            meetingTypes={meetingTypes}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="booking-pages">
          <BookingPagesManager 
            bookingPages={bookingPages}
            meetingTypes={meetingTypes}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <BookingAnalyticsView analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// PublicBookingPage.tsx
interface PublicBookingPageProps {
  pageSlug: string;
}

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({ pageSlug }) => {
  const [bookingPage, setBookingPage] = useState<BookingPage | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [step, setStep] = useState<'select-type' | 'select-time' | 'form' | 'confirmation'>('select-type');
  const [bookingData, setBookingData] = useState<any>({});

  useEffect(() => {
    loadBookingPage();
  }, [pageSlug]);

  const loadBookingPage = async () => {
    try {
      const response = await fetch(`/api/meeting-scheduler/booking-pages/${pageSlug}/public`);
      const data = await response.json();
      
      if (data.success) {
        setBookingPage(data.data.bookingPage);
        setMeetingTypes(data.data.meetingTypes);
      }
    } catch (error) {
      console.error('Failed to load booking page:', error);
    }
  };

  const handleMeetingTypeSelect = (meetingType: MeetingType) => {
    setSelectedMeetingType(meetingType);
    setStep('select-time');
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/meeting-scheduler/bookings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingPageSlug: pageSlug,
          meetingTypeId: selectedMeetingType!.id,
          scheduledStart: selectedSlot!.startTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...formData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setBookingData(data.data);
        setStep('confirmation');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  if (!bookingPage) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ 
      '--primary-color': bookingPage.brandingConfig.primaryColor || '#3B82F6',
      '--secondary-color': bookingPage.brandingConfig.secondaryColor || '#1E40AF'
    } as React.CSSProperties}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto p-6">
          {bookingPage.brandingConfig.logoUrl && (
            <img 
              src={bookingPage.brandingConfig.logoUrl} 
              alt="Logo" 
              className="h-12 mb-4"
            />
          )}
          <h1 className="text-2xl font-bold">
            {bookingPage.brandingConfig.companyName || 'Book a Meeting'}
          </h1>
          {bookingPage.welcomeMessage && (
            <p className="text-gray-600 mt-2">{bookingPage.welcomeMessage}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {step === 'select-type' && (
          <MeetingTypeSelection 
            meetingTypes={meetingTypes}
            onSelect={handleMeetingTypeSelect}
          />
        )}

        {step === 'select-time' && selectedMeetingType && (
          <TimeSlotSelection 
            meetingType={selectedMeetingType}
            pageSlug={pageSlug}
            onSlotSelect={handleSlotSelect}
            onBack={() => setStep('select-type')}
          />
        )}

        {step === 'form' && selectedMeetingType && selectedSlot && (
          <BookingForm 
            meetingType={selectedMeetingType}
            selectedSlot={selectedSlot}
            onSubmit={handleFormSubmit}
            onBack={() => setStep('select-time')}
          />
        )}

        {step === 'confirmation' && (
          <BookingConfirmation 
            booking={bookingData.booking}
            bookingPage={bookingPage}
          />
        )}
      </div>
    </div>
  );
};

// TimeSlotSelection.tsx
interface TimeSlotSelectionProps {
  meetingType: MeetingType;
  pageSlug: string;
  onSlotSelect: (slot: AvailableSlot) => void;
  onBack: () => void;
}

export const TimeSlotSelection: React.FC<TimeSlotSelectionProps> = ({
  meetingType,
  pageSlug,
  onSlotSelect,
  onBack
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate, meetingType.id]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(`/api/meeting-scheduler/availability/${pageSlug}?${new URLSearchParams({
        meetingTypeId: meetingType.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })}`);

      const data = await response.json();
      setAvailableSlots(data.data.availableSlots || []);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSlotTime = (slot: AvailableSlot) => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={onBack}>
            ← Back to Meeting Types
          </Button>
          <h2 className="text-lg font-medium">Select Date & Time</h2>
        </div>
        
        <CalendarWidget 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          meetingType={meetingType}
        />
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="text-lg font-medium mb-4">
          Available Times for {selectedDate.toLocaleDateString()}
        </h3>
        
        {loading ? (
          <div className="text-center text-gray-500">Loading available times...</div>
        ) : availableSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {availableSlots.filter(slot => slot.isAvailable).map((slot, index) => (
              <button
                key={index}
                onClick={() => onSlotSelect(slot)}
                className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-center transition-colors"
              >
                {formatSlotTime(slot)}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No available times for this date. Please select another date.
          </div>
        )}
      </div>
    </div>
  );
};

// BookingForm.tsx
interface BookingFormProps {
  meetingType: MeetingType;
  selectedSlot: AvailableSlot;
  onSubmit: (formData: any) => void;
  onBack: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  meetingType,
  selectedSlot,
  onSubmit,
  onBack
}) => {
  const [formData, setFormData] = useState<any>({
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    guestCount: 1,
    meetingNotes: '',
    formResponses: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.attendeeName.trim()) {
      newErrors.attendeeName = 'Name is required';
    }
    
    if (!formData.attendeeEmail.trim()) {
      newErrors.attendeeEmail = 'Email is required';
    }

    // Validate custom form fields
    meetingType.bookingFormFields.forEach(field => {
      if (field.isRequired && !formData.formResponses[field.fieldName]) {
        newErrors[field.fieldName] = `${field.fieldLabel} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const updateFormResponse = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      formResponses: {
        ...formData.formResponses,
        [fieldName]: value
      }
    });
    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={onBack}>
          ← Back to Time Selection
        </Button>
        <h2 className="text-lg font-medium">Booking Details</h2>
      </div>

      {/* Booking Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">{meetingType.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{meetingType.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span>📅 {new Date(selectedSlot.startTime).toLocaleDateString()}</span>
            <span>🕐 {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <span>⏱ {meetingType.durationMinutes} minutes</span>
          </div>
          {meetingType.priceCents > 0 && (
            <p className="text-sm font-medium mt-2">
              Price: ${(meetingType.priceCents / 100).toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.attendeeName}
              onChange={(e) => updateFormData('attendeeName', e.target.value)}
              className={`w-full p-2 border rounded-md ${errors.attendeeName ? 'border-red-500' : ''}`}
              placeholder="Your full name"
            />
            {errors.attendeeName && (
              <p className="text-red-500 text-sm mt-1">{errors.attendeeName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={formData.attendeeEmail}
              onChange={(e) => updateFormData('attendeeEmail', e.target.value)}
              className={`w-full p-2 border rounded-md ${errors.attendeeEmail ? 'border-red-500' : ''}`}
              placeholder="your@email.com"
            />
            {errors.attendeeEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.attendeeEmail}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.attendeePhone}
              onChange={(e) => updateFormData('attendeePhone', e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Number of Guests</label>
            <select
              value={formData.guestCount}
              onChange={(e) => updateFormData('guestCount', parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Form Fields */}
        {meetingType.bookingFormFields.map((field) => (
          <CustomFormField
            key={field.id}
            field={field}
            value={formData.formResponses[field.fieldName] || ''}
            onChange={(value) => updateFormResponse(field.fieldName, value)}
            error={errors[field.fieldName]}
          />
        ))}

        {/* Meeting Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Additional Notes or Questions
          </label>
          <textarea
            value={formData.meetingNotes}
            onChange={(e) => updateFormData('meetingNotes', e.target.value)}
            className="w-full p-2 border rounded-md h-24"
            placeholder="Let us know anything else we should know..."
          />
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {meetingType.priceCents > 0 
            ? `Book & Pay $${(meetingType.priceCents / 100).toFixed(2)}` 
            : 'Confirm Booking'
          }
        </Button>
      </form>
    </div>
  );
};
```

## Code Examples

### Meeting Scheduler Service

```typescript
// lib/services/meeting-scheduler-service.ts
import { createClient } from '@supabase/supabase-js';
import { CalendarService } from './calendar-service';
import { VideoMeetingService } from './video-meeting-service';
import { NotificationService } from './notification-service';

export class MeetingSchedulerService {
  private supabase: any;
  private calendarService: CalendarService;
  private videoService: VideoMeetingService;
  private notificationService: NotificationService;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.calendarService = new CalendarService();
    this.videoService = new VideoMeetingService();
    this.notificationService = new NotificationService();
  }

  async createPublicBooking(request: CreatePublicBookingRequest): Promise<MeetingBooking> {
    // Get meeting type and validate
    const meetingType = await this.getMeetingType(request.meetingTypeId);
    if (!meetingType || !meetingType.isActive) {
      throw new Error('Meeting type not found or inactive');
    }

    // Check if slot is still available
    const isAvailable = await this.validateSlotAvailability(
      meetingType.supplierId,
      request.scheduledStart,
      meetingType.durationMinutes
    );

    if (!isAvailable) {
      throw new Error('Selected time slot is no longer available');
    }

    // Generate booking reference
    const bookingReference = this.generateBookingReference();

    // Calculate end time
    const startTime = new Date(request.scheduledStart);
    const endTime = new Date(startTime.getTime() + meetingType.durationMinutes * 60 * 1000);

    // Create video meeting if required
    let videoMeetingDetails: any = {};
    if (meetingType.locationType === 'video' || 
        (meetingType.locationType === 'client_choice' && request.preferredLocationType === 'video')) {
      videoMeetingDetails = await this.createVideoMeeting(meetingType.supplierId, {
        title: `${meetingType.name} - ${request.attendeeName}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeEmail: request.attendeeEmail
      });
    }

    // Create booking record
    const bookingData = {
      supplier_id: meetingType.supplierId,
      booking_page_id: request.bookingPageId,
      meeting_type_id: request.meetingTypeId,
      booking_reference: bookingReference,
      attendee_name: request.attendeeName,
      attendee_email: request.attendeeEmail,
      attendee_phone: request.attendeePhone,
      guest_count: request.guestCount || 1,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      timezone: request.timezone,
      location_type: meetingType.locationType,
      location_details: {
        ...meetingType.locationDetails,
        ...videoMeetingDetails
      },
      meeting_notes: request.meetingNotes,
      form_responses: request.formResponses || {},
      status: 'confirmed',
      payment_status: meetingType.priceCents > 0 ? 'pending' : 'not_required',
      payment_amount_cents: meetingType.priceCents,
      reminder_settings: meetingType.confirmationSettings.reminderSettings || this.getDefaultReminderSettings(),
      video_meeting_link: videoMeetingDetails.joinUrl,
      video_meeting_id: videoMeetingDetails.meetingId,
      video_meeting_password: videoMeetingDetails.password
    };

    const { data: booking, error } = await this.supabase
      .from('meeting_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create booking: ${error.message}`);

    // Create calendar event
    if (meetingType.confirmationSettings.autoCreateCalendarEvent) {
      try {
        const calendarEvent = await this.calendarService.createEvent({
          title: `${meetingType.name} - ${request.attendeeName}`,
          description: this.generateEventDescription(booking, meetingType),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: this.formatEventLocation(booking),
          attendees: [
            { email: request.attendeeEmail, name: request.attendeeName }
          ],
          supplierId: meetingType.supplierId
        });

        // Update booking with calendar event ID
        await this.supabase
          .from('meeting_bookings')
          .update({ calendar_event_id: calendarEvent.externalEventId })
          .eq('id', booking.id);

      } catch (error) {
        console.error('Failed to create calendar event:', error);
        // Don't fail the booking if calendar creation fails
      }
    }

    // Schedule notifications
    await this.scheduleBookingNotifications(booking);

    // Handle payment if required
    if (meetingType.priceCents > 0) {
      // Integration with payment processor would go here
      // For now, we'll mark as pending payment
    }

    return booking;
  }

  async getAvailableSlots(
    supplierId: string,
    meetingTypeId: string,
    startDate: Date,
    endDate: Date,
    timezone: string
  ): Promise<AvailableSlot[]> {
    const meetingType = await this.getMeetingType(meetingTypeId);
    if (!meetingType) throw new Error('Meeting type not found');

    // Get supplier's availability from calendar service
    const availability = await this.calendarService.getAvailability(
      supplierId,
      startDate,
      endDate,
      meetingType.durationMinutes
    );

    // Get existing bookings in the date range
    const { data: existingBookings } = await this.supabase
      .from('meeting_bookings')
      .select('scheduled_start, scheduled_end')
      .eq('supplier_id', supplierId)
      .eq('status', 'confirmed')
      .gte('scheduled_start', startDate.toISOString())
      .lte('scheduled_end', endDate.toISOString());

    // Filter availability based on meeting type constraints
    const availableSlots: AvailableSlot[] = [];

    for (const slot of availability) {
      if (!slot.isAvailable) continue;

      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Check advance notice requirement
      const hoursUntilSlot = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSlot < meetingType.advanceNoticeHours) continue;

      // Check maximum advance booking
      const daysUntilSlot = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilSlot > meetingType.maxAdvanceDays) continue;

      // Check for conflicts with existing bookings
      const hasConflict = existingBookings?.some((booking: any) => {
        const bookingStart = new Date(booking.scheduled_start);
        const bookingEnd = new Date(booking.scheduled_end);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      if (hasConflict) continue;

      // Check daily booking limits
      if (meetingType.maxBookingsPerDay) {
        const dayStart = new Date(slotStart);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(slotStart);
        dayEnd.setHours(23, 59, 59, 999);

        const { count } = await this.supabase
          .from('meeting_bookings')
          .select('id', { count: 'exact' })
          .eq('supplier_id', supplierId)
          .eq('meeting_type_id', meetingTypeId)
          .eq('status', 'confirmed')
          .gte('scheduled_start', dayStart.toISOString())
          .lte('scheduled_start', dayEnd.toISOString());

        if (count >= meetingType.maxBookingsPerDay) continue;
      }

      availableSlots.push({
        startTime: slot.startTime,
        endTime: new Date(slotStart.getTime() + meetingType.durationMinutes * 60 * 1000).toISOString(),
        meetingTypeId: meetingTypeId,
        isAvailable: true
      });
    }

    return availableSlots;
  }

  async rescheduleBooking(
    bookingId: string,
    newStartTime: string,
    timezone: string,
    reason?: string
  ): Promise<MeetingBooking> {
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    const meetingType = await this.getMeetingType(booking.meetingTypeId);
    if (!meetingType) throw new Error('Meeting type not found');

    // Validate new time slot
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newStart.getTime() + meetingType.durationMinutes * 60 * 1000);

    const isAvailable = await this.validateSlotAvailability(
      booking.supplierId,
      newStartTime,
      meetingType.durationMinutes,
      bookingId // Exclude current booking from conflict check
    );

    if (!isAvailable) {
      throw new Error('New time slot is not available');
    }

    // Create new booking record (for audit trail)
    const newBooking = await this.createPublicBooking({
      ...booking,
      scheduledStart: newStartTime,
      timezone
    });

    // Update original booking
    await this.supabase
      .from('meeting_bookings')
      .update({
        status: 'rescheduled',
        rescheduled_from: bookingId,
        cancellation_reason: reason || 'Rescheduled by attendee'
      })
      .eq('id', bookingId);

    // Update calendar event
    if (booking.calendarEventId) {
      try {
        await this.calendarService.updateEvent(booking.calendarEventId, {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString()
        });
      } catch (error) {
        console.error('Failed to update calendar event:', error);
      }
    }

    // Update video meeting
    if (booking.videoMeetingId) {
      try {
        await this.videoService.updateMeeting(booking.videoMeetingId, {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString()
        });
      } catch (error) {
        console.error('Failed to update video meeting:', error);
      }
    }

    // Send reschedule notifications
    await this.sendRescheduleNotification(newBooking, booking);

    return newBooking;
  }

  async cancelBooking(
    bookingId: string,
    reason: string,
    refundPayment: boolean = false
  ): Promise<MeetingBooking> {
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Update booking status
    const { data: updatedBooking } = await this.supabase
      .from('meeting_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    // Cancel calendar event
    if (booking.calendarEventId) {
      try {
        await this.calendarService.deleteEvent(booking.calendarEventId);
      } catch (error) {
        console.error('Failed to delete calendar event:', error);
      }
    }

    // Cancel video meeting
    if (booking.videoMeetingId) {
      try {
        await this.videoService.deleteMeeting(booking.videoMeetingId);
      } catch (error) {
        console.error('Failed to delete video meeting:', error);
      }
    }

    // Handle payment refund
    if (refundPayment && booking.paymentIntentId) {
      try {
        // Integration with payment processor for refunds
        await this.processRefund(booking.paymentIntentId);
        
        await this.supabase
          .from('meeting_bookings')
          .update({ payment_status: 'refunded' })
          .eq('id', bookingId);
      } catch (error) {
        console.error('Failed to process refund:', error);
      }
    }

    // Send cancellation notification
    await this.sendCancellationNotification(updatedBooking);

    // Cancel scheduled reminders
    await this.cancelScheduledNotifications(bookingId);

    return updatedBooking;
  }

  private async createVideoMeeting(supplierId: string, meetingDetails: any): Promise<any> {
    const videoIntegration = await this.getVideoIntegration(supplierId);
    if (!videoIntegration) {
      throw new Error('No video integration configured');
    }

    return this.videoService.createMeeting(videoIntegration, meetingDetails);
  }

  private async scheduleBookingNotifications(booking: MeetingBooking): Promise<void> {
    const notifications = [];

    // Confirmation notification (immediate)
    notifications.push({
      booking_id: booking.id,
      notification_type: 'confirmation',
      recipient_type: 'attendee',
      delivery_method: 'email',
      scheduled_for: new Date().toISOString(),
      message_template: this.getConfirmationTemplate(booking)
    });

    // Reminder notifications
    if (booking.reminderSettings.emailReminders) {
      for (const reminder of booking.reminderSettings.emailReminders) {
        if (reminder.isEnabled) {
          const reminderTime = new Date(booking.scheduledStart);
          reminderTime.setMinutes(reminderTime.getMinutes() - reminder.timeBeforeMinutes);

          notifications.push({
            booking_id: booking.id,
            notification_type: 'reminder',
            recipient_type: 'attendee',
            delivery_method: 'email',
            scheduled_for: reminderTime.toISOString(),
            message_template: this.getReminderTemplate(booking, reminder)
          });
        }
      }
    }

    // Save notifications
    await this.supabase
      .from('booking_notifications')
      .insert(notifications);
  }

  private generateBookingReference(): string {
    // Generate unique 8-character booking reference
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async validateSlotAvailability(
    supplierId: string,
    startTime: string,
    durationMinutes: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Check for overlapping bookings
    let query = this.supabase
      .from('meeting_bookings')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'confirmed')
      .lt('scheduled_start', end.toISOString())
      .gt('scheduled_end', start.toISOString());

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: conflicts } = await query;
    return !conflicts || conflicts.length === 0;
  }

  private getDefaultReminderSettings(): ReminderSettings {
    return {
      emailReminders: [
        {
          timeBeforeMinutes: 24 * 60, // 24 hours
          template: 'reminder_24h',
          isEnabled: true
        },
        {
          timeBeforeMinutes: 60, // 1 hour
          template: 'reminder_1h',
          isEnabled: true
        }
      ],
      smsReminders: []
    };
  }

  private generateEventDescription(booking: MeetingBooking, meetingType: MeetingType): string {
    let description = meetingType.description || '';
    
    if (booking.meetingNotes) {
      description += `\n\nAttendee Notes:\n${booking.meetingNotes}`;
    }

    if (booking.videoMeetingLink) {
      description += `\n\nJoin Meeting: ${booking.videoMeetingLink}`;
    }

    return description;
  }

  private formatEventLocation(booking: MeetingBooking): string {
    switch (booking.locationType) {
      case 'in_person':
        return booking.locationDetails.address || 'In Person';
      case 'phone':
        return `Phone: ${booking.locationDetails.phoneNumber || 'TBD'}`;
      case 'video':
        return booking.videoMeetingLink || 'Video Call';
      default:
        return 'Location TBD';
    }
  }
}
```

## Test Requirements

```typescript
// __tests__/meeting-scheduler.test.ts
import { MeetingSchedulerService } from '@/lib/services/meeting-scheduler-service';

describe('Meeting Scheduler', () => {
  let schedulerService: MeetingSchedulerService;

  beforeEach(() => {
    schedulerService = new MeetingSchedulerService();
  });

  describe('Public Booking Creation', () => {
    it('should create a booking successfully', async () => {
      const request = {
        bookingPageSlug: 'test-page',
        meetingTypeId: 'meeting-type-1',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        scheduledStart: '2024-06-15T14:00:00Z',
        timezone: 'America/New_York',
        guestCount: 2,
        formResponses: {
          wedding_date: '2024-08-15',
          budget: '$5000-$10000'
        }
      };

      const booking = await schedulerService.createPublicBooking(request);

      expect(booking.id).toBeDefined();
      expect(booking.attendeeName).toBe('John Doe');
      expect(booking.status).toBe('confirmed');
      expect(booking.bookingReference).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should handle unavailable time slots', async () => {
      const request = {
        meetingTypeId: 'meeting-type-1',
        scheduledStart: '2024-06-15T14:00:00Z',
        // ... other required fields
      };

      // Mock slot as unavailable
      jest.spyOn(schedulerService, 'validateSlotAvailability').mockResolvedValue(false);

      await expect(schedulerService.createPublicBooking(request)).rejects.toThrow(
        'Selected time slot is no longer available'
      );
    });

    it('should create video meeting for video meeting types', async () => {
      const meetingType = {
        id: 'video-meeting-type',
        locationType: 'video',
        confirmationSettings: {
          autoCreateVideoMeeting: true
        }
      };

      jest.spyOn(schedulerService, 'getMeetingType').mockResolvedValue(meetingType);
      jest.spyOn(schedulerService, 'createVideoMeeting').mockResolvedValue({
        joinUrl: 'https://zoom.us/j/123456789',
        meetingId: '123456789',
        password: 'abc123'
      });

      const request = {
        meetingTypeId: 'video-meeting-type',
        // ... other fields
      };

      const booking = await schedulerService.createPublicBooking(request);

      expect(booking.videoMeetingLink).toBe('https://zoom.us/j/123456789');
      expect(booking.videoMeetingId).toBe('123456789');
    });
  });

  describe('Availability Calculation', () => {
    it('should return available slots correctly', async () => {
      const supplierId = 'supplier-1';
      const meetingTypeId = 'meeting-type-1';
      const startDate = new Date('2024-06-15');
      const endDate = new Date('2024-06-15');

      const slots = await schedulerService.getAvailableSlots(
        supplierId,
        meetingTypeId,
        startDate,
        endDate,
        'America/New_York'
      );

      expect(slots).toBeInstanceOf(Array);
      expect(slots.every(slot => 
        slot.hasOwnProperty('startTime') && 
        slot.hasOwnProperty('endTime') && 
        slot.isAvailable === true
      )).toBe(true);
    });

    it('should respect advance notice requirements', async () => {
      const meetingType = {
        advanceNoticeHours: 24,
        durationMinutes: 60
      };

      jest.spyOn(schedulerService, 'getMeetingType').mockResolvedValue(meetingType);

      // Request slots for tomorrow (should be available)
      const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const slots = await schedulerService.getAvailableSlots(
        'supplier-1',
        'meeting-type-1',
        tomorrow,
        tomorrow,
        'America/New_York'
      );

      // Should have some available slots
      expect(slots.length).toBeGreaterThan(0);
    });

    it('should handle daily booking limits', async () => {
      const meetingType = {
        maxBookingsPerDay: 3,
        durationMinutes: 60
      };

      jest.spyOn(schedulerService, 'getMeetingType').mockResolvedValue(meetingType);

      // Mock that supplier already has 3 bookings for the day
      jest.spyOn(schedulerService.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        count: 3
      });

      const slots = await schedulerService.getAvailableSlots(
        'supplier-1',
        'meeting-type-1',
        new Date('2024-06-15'),
        new Date('2024-06-15'),
        'America/New_York'
      );

      // Should have no available slots due to daily limit
      expect(slots.length).toBe(0);
    });
  });

  describe('Booking Rescheduling', () => {
    it('should reschedule booking successfully', async () => {
      const bookingId = 'booking-1';
      const newStartTime = '2024-06-16T14:00:00Z';

      const originalBooking = {
        id: bookingId,
        supplierId: 'supplier-1',
        meetingTypeId: 'meeting-type-1',
        scheduledStart: '2024-06-15T14:00:00Z',
        status: 'confirmed'
      };

      jest.spyOn(schedulerService, 'getBooking').mockResolvedValue(originalBooking);
      jest.spyOn(schedulerService, 'validateSlotAvailability').mockResolvedValue(true);

      const rescheduledBooking = await schedulerService.rescheduleBooking(
        bookingId,
        newStartTime,
        'America/New_York',
        'Schedule conflict'
      );

      expect(rescheduledBooking.scheduledStart).toBe(newStartTime);
      expect(rescheduledBooking.status).toBe('confirmed');
    });

    it('should handle unavailable reschedule slots', async () => {
      const bookingId = 'booking-1';
      const newStartTime = '2024-06-16T14:00:00Z';

      jest.spyOn(schedulerService, 'getBooking').mockResolvedValue({
        id: bookingId,
        supplierId: 'supplier-1'
      });
      jest.spyOn(schedulerService, 'validateSlotAvailability').mockResolvedValue(false);

      await expect(
        schedulerService.rescheduleBooking(bookingId, newStartTime, 'America/New_York')
      ).rejects.toThrow('New time slot is not available');
    });
  });

  describe('Booking Cancellation', () => {
    it('should cancel booking and clean up resources', async () => {
      const bookingId = 'booking-1';
      const booking = {
        id: bookingId,
        calendarEventId: 'cal-event-1',
        videoMeetingId: 'video-meeting-1',
        paymentIntentId: 'pi_123'
      };

      jest.spyOn(schedulerService, 'getBooking').mockResolvedValue(booking);
      jest.spyOn(schedulerService.calendarService, 'deleteEvent').mockResolvedValue(undefined);
      jest.spyOn(schedulerService.videoService, 'deleteMeeting').mockResolvedValue(undefined);

      const cancelledBooking = await schedulerService.cancelBooking(
        bookingId,
        'No longer needed',
        true
      );

      expect(cancelledBooking.status).toBe('cancelled');
      expect(cancelledBooking.cancellationReason).toBe('No longer needed');
      expect(schedulerService.calendarService.deleteEvent).toHaveBeenCalledWith('cal-event-1');
      expect(schedulerService.videoService.deleteMeeting).toHaveBeenCalledWith('video-meeting-1');
    });
  });

  describe('Notification Scheduling', () => {
    it('should schedule reminder notifications', async () => {
      const booking = {
        id: 'booking-1',
        scheduledStart: '2024-06-15T14:00:00Z',
        reminderSettings: {
          emailReminders: [
            { timeBeforeMinutes: 1440, template: 'reminder_24h', isEnabled: true },
            { timeBeforeMinutes: 60, template: 'reminder_1h', isEnabled: true }
          ]
        }
      };

      await schedulerService.scheduleBookingNotifications(booking);

      // Verify notifications were created
      expect(schedulerService.supabase.from).toHaveBeenCalledWith('booking_notifications');
    });

    it('should send confirmation notification immediately', async () => {
      const booking = {
        id: 'booking-1',
        attendeeEmail: 'john@example.com',
        scheduledStart: '2024-06-15T14:00:00Z'
      };

      await schedulerService.scheduleBookingNotifications(booking);

      // Verify immediate confirmation notification was scheduled
      const notifications = jest.mocked(schedulerService.supabase.from).mock.calls
        .find(call => call[0] === 'booking_notifications');

      expect(notifications).toBeDefined();
    });
  });

  describe('Form Validation', () => {
    it('should validate required custom form fields', async () => {
      const meetingType = {
        bookingFormFields: [
          {
            fieldName: 'wedding_date',
            fieldLabel: 'Wedding Date',
            fieldType: 'date',
            isRequired: true
          },
          {
            fieldName: 'budget',
            fieldLabel: 'Budget Range',
            fieldType: 'select',
            isRequired: true
          }
        ]
      };

      const invalidRequest = {
        meetingTypeId: 'meeting-type-1',
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        formResponses: {
          wedding_date: '2024-08-15'
          // Missing required budget field
        }
      };

      jest.spyOn(schedulerService, 'getMeetingType').mockResolvedValue(meetingType);

      await expect(
        schedulerService.createPublicBooking(invalidRequest)
      ).rejects.toThrow('Budget Range is required');
    });
  });

  describe('Booking Reference Generation', () => {
    it('should generate unique booking references', () => {
      const ref1 = schedulerService.generateBookingReference();
      const ref2 = schedulerService.generateBookingReference();

      expect(ref1).toMatch(/^[A-Z0-9]{8}$/);
      expect(ref2).toMatch(/^[A-Z0-9]{8}$/);
      expect(ref1).not.toBe(ref2);
    });
  });
});
```

## Dependencies

### External Services
- **Zoom API**: Video meeting creation
- **Google Meet API**: Alternative video meetings
- **Microsoft Teams API**: Enterprise video meetings
- **Stripe API**: Payment processing for paid meetings

### Internal Dependencies
- **Calendar Service**: Availability checking and event creation
- **Notification Service**: Email and SMS reminders
- **Video Meeting Service**: Video conference integration
- **Payment Service**: Handling paid consultations

### Frontend Dependencies
- **FullCalendar**: Calendar display
- **React Hook Form**: Form management
- **Stripe Elements**: Payment forms
- **React Query**: API state management

## Effort Estimate

- **Database Schema**: 10 hours
- **Meeting Type Management**: 12 hours
- **Public Booking Page**: 20 hours
- **Availability Calculation**: 14 hours
- **Booking Creation & Management**: 16 hours
- **Video Meeting Integration**: 12 hours
- **Notification System**: 10 hours
- **Payment Integration**: 8 hours
- **Frontend Components**: 24 hours
- **Testing**: 20 hours
- **Documentation**: 6 hours

**Total Estimated Effort**: 152 hours (19 days)

## Success Metrics

- 95% booking completion rate (started to confirmed)
- Average booking time under 3 minutes
- 99.5% notification delivery rate
- Zero double bookings
- 90% user satisfaction with booking experience
- 50% reduction in manual scheduling time for suppliers