'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Clock,
  Calendar,
  Users,
  Mail,
  Eye,
  Save,
  Palette,
  Bell,
  Plus,
  Trash2,
  Edit3,
  Globe,
  Copy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Types based on our database schema
interface BookingPage {
  id?: string;
  supplier_id: string;
  title: string;
  slug: string;
  description: string;
  welcome_message: string;
  is_active: boolean;
  requires_approval: boolean;
  advance_booking_days: number;
  min_notice_hours: number;
  buffer_time_minutes: number;
  brand_color: string;
  logo_url?: string;
  custom_css?: string;
  notification_emails: string[];
  send_sms_reminders: boolean;
  reminder_hours_before: number[];
}

interface MeetingType {
  id?: string;
  name: string;
  description: string;
  duration_minutes: number;
  color: string;
  is_paid: boolean;
  price?: number;
  currency: string;
  meeting_location: string;
  video_call_platform?: string;
  preparation_time_minutes: number;
  is_active: boolean;
  max_bookings_per_day?: number;
  requires_questionnaire: boolean;
  questionnaire_questions: Array<{
    id: string;
    question: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
  }>;
  sort_order: number;
}

interface AvailabilitySchedule {
  id?: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
  timezone: string;
}

interface BookingPageBuilderProps {
  supplierId: string;
  organizationId: string;
  existingPage?: BookingPage;
  onSave: (page: BookingPage) => Promise<void>;
  onPreview: (slug: string) => void;
}

const defaultMeetingTypes: Omit<MeetingType, 'id'>[] = [
  {
    name: 'Initial Consultation',
    description: 'Get to know each other and discuss your wedding vision',
    duration_minutes: 30,
    color: '#7F56D9',
    is_paid: false,
    currency: 'GBP',
    meeting_location: 'Video Call',
    video_call_platform: 'Zoom',
    preparation_time_minutes: 5,
    is_active: true,
    requires_questionnaire: true,
    questionnaire_questions: [
      {
        id: '1',
        question: 'What is your wedding date?',
        type: 'text',
        required: true,
      },
      {
        id: '2',
        question: 'How many guests are you expecting?',
        type: 'select',
        required: true,
        options: ['1-50', '51-100', '101-150', '151-200', '200+'],
      },
      {
        id: '3',
        question: 'Tell us about your wedding vision',
        type: 'textarea',
        required: false,
      },
    ],
    sort_order: 0,
  },
];

const defaultAvailability: AvailabilitySchedule[] = [
  {
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    timezone: 'Europe/London',
  },
  {
    day_of_week: 2,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    timezone: 'Europe/London',
  },
  {
    day_of_week: 3,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    timezone: 'Europe/London',
  },
  {
    day_of_week: 4,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    timezone: 'Europe/London',
  },
  {
    day_of_week: 5,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    timezone: 'Europe/London',
  },
];

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function BookingPageBuilder({
  supplierId,
  organizationId,
  existingPage,
  onSave,
  onPreview,
}: BookingPageBuilderProps) {
  // State management
  const [bookingPage, setBookingPage] = useState<BookingPage>({
    supplier_id: supplierId,
    title: '',
    slug: '',
    description: '',
    welcome_message:
      "Welcome! I'm excited to learn about your special day and how I can help make it perfect.",
    is_active: true,
    requires_approval: false,
    advance_booking_days: 30,
    min_notice_hours: 24,
    buffer_time_minutes: 15,
    brand_color: '#7F56D9',
    notification_emails: [],
    send_sms_reminders: true,
    reminder_hours_before: [24, 2],
    ...existingPage,
  });

  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>(
    defaultMeetingTypes as MeetingType[],
  );
  const [availability, setAvailability] =
    useState<AvailabilitySchedule[]>(defaultAvailability);
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from title
  useEffect(() => {
    if (bookingPage.title && !existingPage) {
      const slug = bookingPage.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setBookingPage((prev) => ({ ...prev, slug }));
    }
  }, [bookingPage.title, existingPage]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!bookingPage.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!bookingPage.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(bookingPage.slug)) {
      newErrors.slug =
        'URL slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!bookingPage.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (meetingTypes.filter((mt) => mt.is_active).length === 0) {
      newErrors.meetingTypes = 'At least one active meeting type is required';
    }

    if (availability.filter((a) => a.is_available).length === 0) {
      newErrors.availability = 'At least one available time slot is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [bookingPage, meetingTypes, availability]);

  // Handlers
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(bookingPage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (bookingPage.slug) {
      onPreview(bookingPage.slug);
    }
  };

  const copyBookingUrl = () => {
    const url = `${window.location.origin}/book/${bookingPage.slug}`;
    navigator.clipboard.writeText(url);
  };

  const addMeetingType = () => {
    const newType: MeetingType = {
      id: `new-${Date.now()}`,
      name: 'New Meeting Type',
      description: '',
      duration_minutes: 30,
      color: '#7F56D9',
      is_paid: false,
      currency: 'GBP',
      meeting_location: 'Video Call',
      preparation_time_minutes: 5,
      is_active: true,
      requires_questionnaire: false,
      questionnaire_questions: [],
      sort_order: meetingTypes.length,
    };
    setMeetingTypes([...meetingTypes, newType]);
  };

  const updateMeetingType = (index: number, updates: Partial<MeetingType>) => {
    setMeetingTypes((types) =>
      types.map((type, i) => (i === index ? { ...type, ...updates } : type)),
    );
  };

  const removeMeetingType = (index: number) => {
    setMeetingTypes((types) => types.filter((_, i) => i !== index));
  };

  const updateAvailability = (
    dayIndex: number,
    updates: Partial<AvailabilitySchedule>,
  ) => {
    setAvailability((schedule) =>
      schedule.map((slot, i) =>
        i === dayIndex ? { ...slot, ...updates } : slot,
      ),
    );
  };

  const addEmailNotification = () => {
    const email = prompt('Enter email address:');
    if (email && email.includes('@')) {
      setBookingPage((prev) => ({
        ...prev,
        notification_emails: [...prev.notification_emails, email],
      }));
    }
  };

  const removeEmailNotification = (index: number) => {
    setBookingPage((prev) => ({
      ...prev,
      notification_emails: prev.notification_emails.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {existingPage ? 'Edit Booking Page' : 'Create Booking Page'}
          </h1>
          <p className="text-gray-600 mt-1">
            Set up your booking page to let clients schedule meetings with you
          </p>
        </div>

        <div className="flex gap-3">
          {bookingPage.slug && (
            <>
              <Button
                variant="secondary"
                leftIcon={<Eye className="h-4 w-4" />}
                onClick={handlePreview}
              >
                Preview
              </Button>
              <Button
                variant="tertiary"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={copyBookingUrl}
              >
                Copy URL
              </Button>
            </>
          )}
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            loading={isSaving}
            onClick={handleSave}
          >
            Save Page
          </Button>
        </div>
      </div>

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <Card className="bg-error-50 border-error-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-error-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-error-900">
                Please fix the following errors:
              </h3>
              <ul className="mt-1 text-sm text-error-700 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="meetings" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Meetings</span>
              </TabsTrigger>
              <TabsTrigger
                value="availability"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Brand</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Settings */}
            <TabsContent value="basic" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Information
                </h3>

                <div className="grid gap-4">
                  <Input
                    label="Page Title"
                    value={bookingPage.title}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Wedding Planning Sessions"
                    error={errors.title}
                    required
                  />

                  <Input
                    label="URL Slug"
                    value={bookingPage.slug}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        slug: e.target.value,
                      }))
                    }
                    placeholder="wedding-planning-sessions"
                    error={errors.slug}
                    helperText="This will be part of your booking URL"
                    leftIcon={<Globe className="h-4 w-4" />}
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg shadow-sm transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300',
                        errors.description
                          ? 'border-error-300 bg-error-50'
                          : 'border-gray-300',
                      )}
                      rows={3}
                      value={bookingPage.description}
                      onChange={(e) =>
                        setBookingPage((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Book a consultation to discuss your special day..."
                    />
                    {errors.description && (
                      <p className="text-sm text-error-600 mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Welcome Message
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
                      rows={2}
                      value={bookingPage.welcome_message}
                      onChange={(e) =>
                        setBookingPage((prev) => ({
                          ...prev,
                          welcome_message: e.target.value,
                        }))
                      }
                      placeholder="Welcome message for clients..."
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Booking Settings</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Advanced Booking (days)"
                    type="number"
                    value={bookingPage.advance_booking_days}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        advance_booking_days: parseInt(e.target.value) || 30,
                      }))
                    }
                    helperText="How far ahead clients can book"
                  />

                  <Input
                    label="Minimum Notice (hours)"
                    type="number"
                    value={bookingPage.min_notice_hours}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        min_notice_hours: parseInt(e.target.value) || 24,
                      }))
                    }
                    helperText="Minimum notice required"
                  />

                  <Input
                    label="Buffer Time (minutes)"
                    type="number"
                    value={bookingPage.buffer_time_minutes}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        buffer_time_minutes: parseInt(e.target.value) || 15,
                      }))
                    }
                    helperText="Time between meetings"
                  />
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Require Approval</h4>
                      <p className="text-sm text-gray-600">
                        Manually approve each booking
                      </p>
                    </div>
                    <Switch
                      checked={bookingPage.requires_approval}
                      onCheckedChange={(checked) =>
                        setBookingPage((prev) => ({
                          ...prev,
                          requires_approval: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Active</h4>
                      <p className="text-sm text-gray-600">
                        Accept new bookings
                      </p>
                    </div>
                    <Switch
                      checked={bookingPage.is_active}
                      onCheckedChange={(checked) =>
                        setBookingPage((prev) => ({
                          ...prev,
                          is_active: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Meeting Types */}
            <TabsContent value="meetings" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Meeting Types
                </h3>
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={addMeetingType}
                >
                  Add Meeting Type
                </Button>
              </div>

              {errors.meetingTypes && (
                <p className="text-sm text-error-600">{errors.meetingTypes}</p>
              )}

              <div className="space-y-4">
                {meetingTypes.map((meetingType, index) => (
                  <Card key={meetingType.id || index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: meetingType.color }}
                        />
                        <h4 className="font-medium">
                          {meetingType.name || 'New Meeting Type'}
                        </h4>
                        {!meetingType.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={meetingType.is_active}
                          onCheckedChange={(checked) =>
                            updateMeetingType(index, { is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMeetingType(index)}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        ></Button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Name"
                        value={meetingType.name}
                        onChange={(e) =>
                          updateMeetingType(index, { name: e.target.value })
                        }
                        placeholder="Initial Consultation"
                      />

                      <Input
                        label="Duration (minutes)"
                        type="number"
                        value={meetingType.duration_minutes}
                        onChange={(e) =>
                          updateMeetingType(index, {
                            duration_minutes: parseInt(e.target.value) || 30,
                          })
                        }
                      />

                      <Input
                        label="Location"
                        value={meetingType.meeting_location}
                        onChange={(e) =>
                          updateMeetingType(index, {
                            meeting_location: e.target.value,
                          })
                        }
                        placeholder="Video Call, Office, Client Location"
                      />

                      <Input
                        label="Color"
                        type="color"
                        value={meetingType.color}
                        onChange={(e) =>
                          updateMeetingType(index, { color: e.target.value })
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
                        rows={2}
                        value={meetingType.description}
                        onChange={(e) =>
                          updateMeetingType(index, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe what happens in this meeting..."
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Availability */}
            <TabsContent value="availability" className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Availability
              </h3>

              {errors.availability && (
                <p className="text-sm text-error-600">{errors.availability}</p>
              )}

              <Card className="p-6">
                <div className="space-y-4">
                  {availability.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={(checked) =>
                          updateAvailability(index, { is_available: checked })
                        }
                      />

                      <div className="min-w-24">
                        <span className="font-medium">
                          {dayNames[slot.day_of_week]}
                        </span>
                      </div>

                      {slot.is_available ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              updateAvailability(index, {
                                start_time: e.target.value,
                              })
                            }
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              updateAvailability(index, {
                                end_time: e.target.value,
                              })
                            }
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">
                          Unavailable
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Branding */}
            <TabsContent value="branding" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Brand Customization
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bookingPage.brand_color}
                        onChange={(e) =>
                          setBookingPage((prev) => ({
                            ...prev,
                            brand_color: e.target.value,
                          }))
                        }
                        className="w-12 h-10 rounded border border-gray-300"
                      />
                      <Input
                        value={bookingPage.brand_color}
                        onChange={(e) =>
                          setBookingPage((prev) => ({
                            ...prev,
                            brand_color: e.target.value,
                          }))
                        }
                        placeholder="#7F56D9"
                        className="max-w-32"
                      />
                    </div>
                  </div>

                  <Input
                    label="Logo URL"
                    value={bookingPage.logo_url || ''}
                    onChange={(e) =>
                      setBookingPage((prev) => ({
                        ...prev,
                        logo_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                    helperText="Optional logo for your booking page"
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Reminders</h4>
                      <p className="text-sm text-gray-600">
                        Send SMS reminders to clients
                      </p>
                    </div>
                    <Switch
                      checked={bookingPage.send_sms_reminders}
                      onCheckedChange={(checked) =>
                        setBookingPage((prev) => ({
                          ...prev,
                          send_sms_reminders: checked,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Reminder Schedule</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      When to send reminders before the meeting (hours)
                    </p>
                    <div className="flex gap-2">
                      {bookingPage.reminder_hours_before.map((hours, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {hours}h before
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">
                        Additional Email Notifications
                      </h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={addEmailNotification}
                      >
                        Add Email
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {bookingPage.notification_emails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-mono">{email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmailNotification(index)}
                            leftIcon={<Trash2 className="h-4 w-4" />}
                          ></Button>
                        </div>
                      ))}

                      {bookingPage.notification_emails.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          No additional email notifications set up
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </h3>

            {/* Mock booking page preview */}
            <div
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
              style={{ minHeight: '400px' }}
            >
              {/* Header */}
              <div
                className="p-4 text-white"
                style={{ backgroundColor: bookingPage.brand_color }}
              >
                {bookingPage.logo_url && (
                  <img
                    src={bookingPage.logo_url}
                    alt="Logo"
                    className="h-8 mb-2"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <h2 className="text-xl font-bold">
                  {bookingPage.title || 'Your Booking Page'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {bookingPage.description ||
                    'Page description will appear here'}
                </p>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {bookingPage.welcome_message}
                </p>

                <h3 className="font-medium mb-3">Available Services</h3>
                <div className="space-y-2">
                  {meetingTypes
                    .filter((mt) => mt.is_active)
                    .map((type, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 border rounded"
                      >
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: type.color }}
                        />
                        <div>
                          <div className="text-sm font-medium">{type.name}</div>
                          <div className="text-xs text-gray-500">
                            {type.duration_minutes} minutes
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {availability.filter((a) => a.is_available).length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Available Times</h3>
                    <div className="text-xs text-gray-600 space-y-1">
                      {availability
                        .filter((a) => a.is_available)
                        .map((slot, index) => (
                          <div key={index}>
                            {dayNames[slot.day_of_week]}: {slot.start_time} -{' '}
                            {slot.end_time}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bookingPage.slug && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Booking URL:</p>
                <code className="text-xs font-mono break-all">
                  {window.location.origin}/book/{bookingPage.slug}
                </code>
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-2"
                  leftIcon={<ExternalLink className="h-3 w-3" />}
                  onClick={handlePreview}
                >
                  Open
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
