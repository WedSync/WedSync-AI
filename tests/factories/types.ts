/**
 * Test Data Factory Types
 * WS-192 Team B - Backend/API Focus
 * 
 * Type definitions for wedding industry test data factories
 */

// Core vendor types in wedding industry
export type VendorType = 
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'dj'
  | 'videographer'
  | 'planner'
  | 'officiant';

// Supplier test data structure
export interface SupplierTestData {
  id?: string;
  organization_id: string;
  email: string;
  full_name: string;
  business_name: string;
  vendor_type: VendorType;
  phone?: string;
  website?: string;
  services: string[];
  pricing_structure: {
    base_price: number;
    additional_services: Array<{
      name: string;
      price: number;
    }>;
  };
  availability: {
    weekends_only: boolean;
    blackout_dates: string[];
    booking_lead_time: number; // days
  };
  portfolio: {
    images: string[];
    testimonials: Array<{
      client_name: string;
      rating: number;
      comment: string;
    }>;
  };
  location: {
    city: string;
    state: string;
    travel_radius: number; // miles
  };
  created_at?: string;
  updated_at?: string;
}

// Couple test data structure
export interface CoupleTestData {
  id?: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  partner_first_name: string;
  partner_last_name: string;
  partner_email?: string;
  partner_phone?: string;
  wedding_date: string;
  venue: string;
  venue_address?: string;
  guest_count: number;
  budget: number;
  wedding_style: 'traditional' | 'modern' | 'rustic' | 'luxury' | 'bohemian' | 'minimalist';
  special_requirements?: string[];
  dietary_restrictions?: string[];
  photography_preferences?: {
    style: 'candid' | 'posed' | 'artistic' | 'photojournalistic';
    must_have_shots: string[];
    group_photos_required: boolean;
  };
  contact_preferences: {
    preferred_method: 'email' | 'phone' | 'text';
    best_time_to_contact: string;
  };
  referral_source?: string;
  created_at?: string;
  updated_at?: string;
}

// Form test data structure
export interface FormTestData {
  id?: string;
  organization_id: string;
  name: string;
  description: string;
  vendor_type: VendorType;
  configuration: {
    fields: FormFieldData[];
    styling: {
      theme: string;
      colors: {
        primary: string;
        secondary: string;
      };
    };
    notifications: {
      email_on_submit: boolean;
      sms_on_submit: boolean;
      auto_response: boolean;
    };
  };
  status: 'draft' | 'active' | 'paused' | 'archived';
  submission_count?: number;
  conversion_rate?: number;
  created_at?: string;
  updated_at?: string;
}

// Form field data structure
export interface FormFieldData {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  name: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditional_logic?: {
    show_if: {
      field: string;
      value: any;
    };
  };
}

// Wedding test data structure (complete scenario)
export interface WeddingTestData {
  id?: string;
  couple: CoupleTestData;
  photographers: SupplierTestData[];
  venues: SupplierTestData[];
  other_vendors: SupplierTestData[];
  timeline: WeddingTimelineData;
  budget_breakdown: WeddingBudgetData;
  guest_list?: GuestTestData[];
  created_at?: string;
  updated_at?: string;
}

// Wedding timeline data
export interface WeddingTimelineData {
  id?: string;
  wedding_date: string;
  events: Array<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    location: string;
    vendors_involved: string[]; // vendor IDs
    notes?: string;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    due_date: string;
    responsible_vendor?: string;
    completed: boolean;
    notes?: string;
  }>;
}

// Wedding budget data
export interface WeddingBudgetData {
  total_budget: number;
  allocated: {
    photography: number;
    venue: number;
    catering: number;
    floristry: number;
    music: number;
    other: number;
  };
  actual_spent: {
    photography: number;
    venue: number;
    catering: number;
    floristry: number;
    music: number;
    other: number;
  };
  payment_schedule: Array<{
    vendor_id: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue';
  }>;
}

// Guest test data
export interface GuestTestData {
  id?: string;
  couple_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  plus_one: boolean;
  rsvp_status: 'pending' | 'attending' | 'declined' | 'maybe';
  dietary_restrictions?: string[];
  accommodation_needed: boolean;
  table_assignment?: string;
  role: 'guest' | 'wedding_party' | 'family' | 'vendor';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Wedding scenario types for testing different complexity levels
export interface WeddingScenario {
  type: 'simple' | 'complex' | 'luxury' | 'destination' | 'intimate';
  guest_count_range: [number, number];
  budget_range: [number, number];
  vendor_count: number;
  duration_days: number; // for destination weddings
  special_requirements: string[];
}

// Form submission test data
export interface FormSubmissionTestData {
  id?: string;
  form_id: string;
  data: Record<string, any>;
  status: 'submitted' | 'reviewed' | 'contacted' | 'converted' | 'rejected';
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_campaign?: string;
  processing_notes?: string;
  follow_up_scheduled?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Journey test data for customer workflow automation
export interface JourneyTestData {
  id?: string;
  organization_id: string;
  name: string;
  description: string;
  trigger_conditions: {
    type: 'form_submission' | 'date_based' | 'manual';
    form_id?: string;
    days_before_wedding?: number;
  };
  steps: Array<{
    id: string;
    name: string;
    type: 'email' | 'sms' | 'task' | 'webhook' | 'wait';
    delay_hours: number;
    content?: {
      subject?: string;
      body: string;
      template_id?: string;
    };
    conditions?: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
  }>;
  status: 'draft' | 'active' | 'paused' | 'completed';
  enrollment_count?: number;
  completion_rate?: number;
  created_at?: string;
  updated_at?: string;
}

// Integration test data for CRM connections
export interface IntegrationTestData {
  id?: string;
  organization_id: string;
  service_name: 'tave' | 'honeybook' | 'lightblue' | 'pixieset';
  connection_status: 'connected' | 'disconnected' | 'error';
  credentials: {
    encrypted: boolean;
    last_verified: string;
  };
  sync_settings: {
    auto_sync: boolean;
    sync_frequency: 'realtime' | 'hourly' | 'daily';
    sync_direction: 'import' | 'export' | 'bidirectional';
  };
  last_sync?: {
    timestamp: string;
    status: 'success' | 'partial' | 'failed';
    records_processed: number;
    errors?: string[];
  };
  created_at?: string;
  updated_at?: string;
}

// Payment test data for Stripe integration
export interface PaymentTestData {
  id?: string;
  organization_id: string;
  customer_id: string;
  amount: number;
  currency: 'usd' | 'gbp' | 'eur';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  payment_method: 'card' | 'bank_transfer' | 'check';
  description: string;
  metadata: {
    client_id?: string;
    wedding_date?: string;
    service_type?: VendorType;
  };
  stripe_payment_intent_id?: string;
  failure_reason?: string;
  created_at?: string;
  updated_at?: string;
}

// Notification test data for email/SMS
export interface NotificationTestData {
  id?: string;
  organization_id: string;
  recipient_id: string;
  type: 'email' | 'sms' | 'push';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  content: string;
  template_id?: string;
  scheduled_for?: string;
  sent_at?: string;
  delivery_metadata?: {
    provider: 'resend' | 'twilio';
    provider_id: string;
    error_code?: string;
    error_message?: string;
  };
  created_at?: string;
  updated_at?: string;
}