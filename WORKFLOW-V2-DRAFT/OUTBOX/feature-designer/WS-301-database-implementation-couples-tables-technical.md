# WS-301: Database Implementation - Couples Tables - Technical Specification

## Feature Overview

**Feature ID:** WS-301  
**Feature Name:** Database Implementation - Couples Tables  
**Feature Type:** Database Architecture  
**Priority:** Critical Path  
**Team:** Team B (Backend)  
**Effort Estimate:** 8 story points (16 hours)  
**Sprint:** Foundation Sprint  

### Problem Statement

Couples need a comprehensive database schema that manages their wedding data across all aspects: basic account information, core wedding fields, guest management, supplier connections, task delegation, timeline coordination, budget tracking, notifications, website configuration, and activity logging. This system must support the Core Fields auto-population feature while maintaining strict data privacy and security.

### Solution Overview

Implement a complete PostgreSQL database schema with 10 interconnected tables that handle all couple-related data, featuring Row Level Security (RLS) policies, real-time updates via Supabase, and optimized performance for wedding industry use cases.

## User Stories

### Epic: Couple Account Management

**Story 1:** As Emma, planning my wedding, I need to create a couple account that stores both my partner's and my information, so that suppliers can properly address us and understand our relationship structure.

**Story 2:** As James (Emma's partner), I need to access our shared wedding account using my own login credentials, so that I can contribute to wedding planning without sharing passwords.

**Story 3:** As Emma, I need to set our preferred contact method and person, so that suppliers know whether to reach out to me, James, or both of us for different types of communications.

### Epic: Core Wedding Fields Auto-Population

**Story 4:** As Emma, I need to enter our wedding date, venue, and guest count once in a central location, so that this information automatically appears in all supplier forms without repetitive data entry.

**Story 5:** As a photographer Sarah, I need to see Emma's core wedding details (venue, date, guest count) when creating her quote form, so that I can provide accurate pricing and timeline suggestions without asking for basic information again.

**Story 6:** As Emma, I need to update our guest count from 120 to 140 people, and have this change automatically reflect in all connected supplier forms, so that vendors can adjust their services accordingly.

### Epic: Guest Management System

**Story 7:** As Emma, I need to build our guest list with detailed information including relationships, dietary requirements, and household groupings, so that suppliers can provide personalized service and I can manage RSVPs effectively.

**Story 8:** As Emma, I need to organize guests into photo groups like "immediate family" and "college friends," so that our photographer Sarah can efficiently plan group shot logistics on our wedding day.

**Story 9:** As Emma, I need to track RSVP responses and dietary restrictions for each guest, so that our caterer can prepare appropriate meal counts and accommodate special needs.

### Epic: Supplier Connection Management

**Story 10:** As Emma, I need to connect with multiple suppliers while controlling what information each can access, so that my photographer can see guest names for photo planning but my caterer cannot access my budget information.

**Story 11:** As a venue coordinator Lisa, I need to see Emma's timeline and guest count but not her detailed budget, so that I can provide appropriate service while respecting her privacy.

**Story 12:** As Emma, I need to track the status of each supplier connection (invited, connected, contracted), so that I can follow up appropriately and manage my vendor relationships effectively.

### Epic: Task Delegation for Wedding Day

**Story 13:** As Emma, I need to assign specific tasks to wedding party members and helpers, so that my maid of honor knows to handle bustling my dress while my best man manages the rings during ceremony.

**Story 14:** As Emma's maid of honor Jessica, I need to receive clear task assignments with timing and location details, so that I can fulfill my responsibilities effectively on the wedding day.

**Story 15:** As Emma, I need to track task completion and send thank you messages to helpers, so that everyone who contributed to our special day feels appreciated.

### Epic: Wedding Timeline Management

**Story 16:** As Emma, I need to create a detailed wedding day timeline that suppliers and wedding party can access, so that everyone knows when and where they need to be throughout the day.

**Story 17:** As photographer Sarah, I need to see Emma's timeline and add photography-specific events (like first look and family photos), so that the schedule accommodates all necessary shots without conflicts.

**Story 18:** As Emma, I need to specify which timeline events are visible to guests versus suppliers, so that intimate preparation details remain private while public events are clearly communicated.

### Epic: Budget Tracking (Private)

**Story 19:** As Emma, I need to track our wedding budget by category without suppliers seeing these amounts, so that I can manage our spending while maintaining negotiating power.

**Story 20:** As Emma, I need to record deposit and final payment dates for each supplier, so that I can stay on top of our financial obligations and cash flow planning.

**Story 21:** As Emma, I need to prioritize budget categories and mark essential versus optional items, so that I can make informed decisions if we need to adjust spending.

### Epic: Wedding Website Integration

**Story 22:** As Emma, I need our wedding website to automatically populate with our core details, so that guests can access event information without manual data entry.

**Story 23:** As Emma, I need to control what information appears on our public wedding website versus keeping some details private, so that we can share appropriate information while maintaining privacy.

**Story 24:** As a guest at Emma's wedding, I need to access their wedding website to view event details, RSVP, and see registry information, so that I can prepare appropriately for their celebration.

## Technical Implementation

### Database Schema Implementation

```sql
-- Main couples table
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Partner information
  partner1_first_name TEXT NOT NULL,
  partner1_last_name TEXT,
  partner1_email TEXT UNIQUE NOT NULL,
  partner1_phone TEXT,
  partner1_pronouns TEXT,
  partner2_first_name TEXT,
  partner2_last_name TEXT,
  partner2_email TEXT,
  partner2_phone TEXT,
  partner2_pronouns TEXT,
  
  -- Display preferences
  couple_display_name TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'sms', 'whatsapp', 'phone')),
  preferred_contact_person TEXT CHECK (preferred_contact_person IN ('partner1', 'partner2', 'both')),
  
  -- Account status
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'cancelled')),
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT,
  invited_by_supplier_id UUID REFERENCES suppliers(id),
  invitation_token TEXT UNIQUE,
  invitation_accepted_at TIMESTAMPTZ,
  
  -- Profile customization
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  wedding_hashtag TEXT,
  
  -- Localization
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  currency TEXT DEFAULT 'GBP',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_email CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Core wedding fields (auto-populate across suppliers)
CREATE TABLE couple_core_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Wedding basics
  wedding_date DATE,
  wedding_date_is_flexible BOOLEAN DEFAULT false,
  wedding_date_notes TEXT,
  
  -- Ceremony details
  ceremony_venue_name TEXT,
  ceremony_venue_id UUID REFERENCES venues(id),
  ceremony_address_line1 TEXT,
  ceremony_address_line2 TEXT,
  ceremony_city TEXT,
  ceremony_postcode TEXT,
  ceremony_country TEXT DEFAULT 'United Kingdom',
  ceremony_time TIME,
  ceremony_type TEXT,
  
  -- Reception details
  reception_same_as_ceremony BOOLEAN DEFAULT true,
  reception_venue_name TEXT,
  reception_venue_id UUID REFERENCES venues(id),
  reception_address_line1 TEXT,
  reception_address_line2 TEXT,
  reception_city TEXT,
  reception_postcode TEXT,
  reception_country TEXT DEFAULT 'United Kingdom',
  reception_time TIME,
  
  -- Guest information
  guest_count_estimated INTEGER,
  guest_count_adults INTEGER,
  guest_count_children INTEGER,
  guest_count_infants INTEGER,
  
  -- Wedding style
  wedding_style TEXT[],
  color_scheme TEXT[],
  
  -- Budget (private)
  budget_total DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'GBP',
  
  -- Completion tracking
  completion_percentage INTEGER DEFAULT 0,
  last_updated_field TEXT,
  last_updated_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Flexible data
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_guest_count CHECK (
    (guest_count_adults IS NULL OR guest_count_adults >= 0) AND
    (guest_count_children IS NULL OR guest_count_children >= 0) AND
    (guest_count_infants IS NULL OR guest_count_infants >= 0)
  )
);

-- Couple-supplier connections
CREATE TABLE couple_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Connection details
  connection_status TEXT DEFAULT 'invited' CHECK (connection_status IN (
    'invited', 'connected', 'declined', 'disconnected', 'blocked'
  )),
  service_type TEXT NOT NULL,
  package_name TEXT,
  service_notes TEXT,
  
  -- Important dates
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  contract_signed_date DATE,
  final_payment_date DATE,
  
  -- Permissions
  can_view_guests BOOLEAN DEFAULT false,
  can_view_budget BOOLEAN DEFAULT false,
  can_view_other_suppliers BOOLEAN DEFAULT true,
  can_edit_timeline BOOLEAN DEFAULT false,
  
  -- Communication
  preferred_contact_method TEXT,
  primary_contact_person TEXT,
  
  -- Metrics
  last_activity TIMESTAMPTZ,
  forms_completed INTEGER DEFAULT 0,
  messages_exchanged INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT unique_couple_supplier UNIQUE(couple_id, supplier_id)
);

-- Guest management
CREATE TABLE couple_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Guest information
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Categorization
  guest_side TEXT CHECK (guest_side IN ('partner1', 'partner2', 'both', 'neutral')),
  guest_type TEXT DEFAULT 'guest' CHECK (guest_type IN (
    'guest', 'wedding_party', 'family', 'vip', 'vendor', 'child'
  )),
  relationship TEXT,
  
  -- Group management
  household_id UUID,
  household_primary BOOLEAN DEFAULT false,
  table_number INTEGER,
  
  -- RSVP tracking
  invitation_sent BOOLEAN DEFAULT false,
  invitation_sent_date DATE,
  save_the_date_sent BOOLEAN DEFAULT false,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN (
    'pending', 'yes', 'no', 'maybe', 'no_response'
  )),
  rsvp_date DATE,
  attending_ceremony BOOLEAN,
  attending_reception BOOLEAN,
  
  -- Guest details
  plus_one_allowed BOOLEAN DEFAULT false,
  plus_one_name TEXT,
  dietary_requirements TEXT[],
  dietary_notes TEXT,
  accessibility_needs TEXT,
  
  -- Accommodation
  accommodation_needed BOOLEAN DEFAULT false,
  accommodation_nights INTEGER,
  accommodation_notes TEXT,
  
  -- Photo groups
  photo_groups TEXT[],
  
  -- Task delegation
  is_helper BOOLEAN DEFAULT false,
  helper_role TEXT,
  can_receive_tasks BOOLEAN DEFAULT false,
  
  -- Children specific
  age_group TEXT CHECK (age_group IN ('infant', 'toddler', 'child', 'teen', 'adult')),
  requires_meal BOOLEAN DEFAULT true,
  requires_seat BOOLEAN DEFAULT true,
  
  -- Communication
  contact_preferences TEXT CHECK (contact_preferences IN ('email', 'sms', 'whatsapp', 'phone', 'mail')),
  mailing_address TEXT,
  thank_you_sent BOOLEAN DEFAULT false,
  thank_you_sent_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  custom_data JSONB DEFAULT '{}'::jsonb
);

-- Task delegation system
CREATE TABLE couple_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Task details
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_category TEXT CHECK (task_category IN (
    'setup', 'guest_management', 'supplier_liaison', 'personal_support',
    'emergency', 'reception', 'cleanup', 'other'
  )),
  
  -- Assignment
  assigned_to_guest_id UUID REFERENCES couple_guests(id),
  assigned_to_name TEXT,
  assigned_to_role TEXT,
  
  -- Timing
  task_timing TEXT CHECK (task_timing IN (
    'before_ceremony', 'during_ceremony', 'after_ceremony',
    'cocktail_hour', 'during_reception', 'end_of_night', 'next_day'
  )),
  specific_time TIME,
  duration_minutes INTEGER,
  
  -- Location
  task_location TEXT,
  location_details TEXT,
  
  -- Priority and status
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  )),
  
  -- Instructions
  special_instructions TEXT,
  attachments TEXT[],
  
  -- Tracking
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN (
    'email', 'sms', 'whatsapp', 'printed', 'in_app', 'verbal'
  )),
  delivered_at TIMESTAMPTZ,
  
  -- Thank you tracking
  thank_you_sent BOOLEAN DEFAULT false,
  thank_you_sent_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for performance
CREATE INDEX idx_couples_auth_user ON couples(auth_user_id);
CREATE INDEX idx_couples_emails ON couples(partner1_email, partner2_email);
CREATE INDEX idx_couples_status ON couples(account_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_core_fields_couple ON couple_core_fields(couple_id);
CREATE INDEX idx_core_fields_wedding_date ON couple_core_fields(wedding_date) WHERE wedding_date IS NOT NULL;

CREATE INDEX idx_couple_suppliers_couple ON couple_suppliers(couple_id);
CREATE INDEX idx_couple_suppliers_supplier ON couple_suppliers(supplier_id);
CREATE INDEX idx_couple_suppliers_status ON couple_suppliers(connection_status);

CREATE INDEX idx_guests_couple ON couple_guests(couple_id);
CREATE INDEX idx_guests_rsvp ON couple_guests(rsvp_status);
CREATE INDEX idx_guests_helper ON couple_guests(is_helper) WHERE is_helper = true;

CREATE INDEX idx_tasks_couple ON couple_tasks(couple_id);
CREATE INDEX idx_tasks_assigned ON couple_tasks(assigned_to_guest_id);
CREATE INDEX idx_tasks_status ON couple_tasks(status);

-- Row Level Security policies
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_core_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_tasks ENABLE ROW LEVEL SECURITY;

-- Couples can access their own data
CREATE POLICY couples_own_data ON couples FOR ALL USING (auth.uid() = auth_user_id);

CREATE POLICY core_fields_own_data ON couple_core_fields FOR ALL USING (
  couple_id IN (
    SELECT id FROM couples WHERE auth_user_id = auth.uid()
  )
);

-- Suppliers can see connected couple data
CREATE POLICY suppliers_see_connected_couples ON couples FOR SELECT USING (
  id IN (
    SELECT couple_id FROM couple_suppliers
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE auth_user_id = auth.uid()
    )
    AND connection_status = 'connected'
  )
);

-- Completion percentage trigger
CREATE OR REPLACE FUNCTION calculate_core_fields_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_fields INTEGER := 20;
  completed_fields INTEGER := 0;
BEGIN
  -- Count completed fields
  IF NEW.wedding_date IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.ceremony_venue_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.ceremony_time IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.guest_count_estimated IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  -- Add more field checks as needed
  
  NEW.completion_percentage := (completed_fields * 100) / total_fields;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_completion_trigger
  BEFORE INSERT OR UPDATE ON couple_core_fields
  FOR EACH ROW EXECUTE FUNCTION calculate_core_fields_completion();
```

### API Endpoints

```typescript
// Database client for couples operations
export class CouplesDatabase {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  // Couple management
  async createCouple(data: CreateCoupleData): Promise<Couple> {
    const { data: couple, error } = await this.supabase
      .from('couples')
      .insert({
        partner1_first_name: data.partner1_first_name,
        partner1_last_name: data.partner1_last_name,
        partner1_email: data.partner1_email,
        partner1_phone: data.partner1_phone,
        partner2_first_name: data.partner2_first_name,
        partner2_last_name: data.partner2_last_name,
        partner2_email: data.partner2_email,
        partner2_phone: data.partner2_phone,
        couple_display_name: data.couple_display_name,
        preferred_contact_method: data.preferred_contact_method,
        preferred_contact_person: data.preferred_contact_person,
        timezone: data.timezone || 'UTC',
        locale: data.locale || 'en-US',
        currency: data.currency || 'GBP'
      })
      .select()
      .single();

    if (error) throw new DatabaseError('Failed to create couple', error);
    
    // Create default core fields
    await this.createCoreFields(couple.id);
    
    return couple;
  }

  async getCoupleProfile(coupleId: string): Promise<CoupleProfile> {
    const { data, error } = await this.supabase
      .from('couples')
      .select(`
        *,
        couple_core_fields(*),
        couple_suppliers(
          *,
          suppliers(business_name, business_type)
        )
      `)
      .eq('id', coupleId)
      .single();

    if (error) throw new DatabaseError('Failed to get couple profile', error);
    return data;
  }

  async updateCoupleProfile(coupleId: string, updates: Partial<Couple>): Promise<void> {
    const { error } = await this.supabase
      .from('couples')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', coupleId);

    if (error) throw new DatabaseError('Failed to update couple profile', error);
  }

  // Core fields management
  async createCoreFields(coupleId: string): Promise<CoupleCore Fields> {
    const { data, error } = await this.supabase
      .from('couple_core_fields')
      .insert({
        couple_id: coupleId,
        budget_currency: 'GBP'
      })
      .select()
      .single();

    if (error) throw new DatabaseError('Failed to create core fields', error);
    return data;
  }

  async updateCoreFields(coupleId: string, updates: Partial<CoupleCore Fields>): Promise<void> {
    const { error } = await this.supabase
      .from('couple_core_fields')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('couple_id', coupleId);

    if (error) throw new DatabaseError('Failed to update core fields', error);
    
    // Trigger real-time update to connected suppliers
    await this.notifyConnectedSuppliersOfCoreFieldsUpdate(coupleId);
  }

  // Guest management
  async createGuest(coupleId: string, guestData: CreateGuestData): Promise<CoupleGuest> {
    const { data, error } = await this.supabase
      .from('couple_guests')
      .insert({
        couple_id: coupleId,
        ...guestData
      })
      .select()
      .single();

    if (error) throw new DatabaseError('Failed to create guest', error);
    return data;
  }

  async getGuestList(coupleId: string, filters?: GuestFilters): Promise<CoupleGuest[]> {
    let query = this.supabase
      .from('couple_guests')
      .select('*')
      .eq('couple_id', coupleId);

    if (filters?.guest_type) {
      query = query.eq('guest_type', filters.guest_type);
    }

    if (filters?.rsvp_status) {
      query = query.eq('rsvp_status', filters.rsvp_status);
    }

    if (filters?.is_helper !== undefined) {
      query = query.eq('is_helper', filters.is_helper);
    }

    const { data, error } = await query.order('last_name', { ascending: true });

    if (error) throw new DatabaseError('Failed to get guest list', error);
    return data || [];
  }

  async updateGuestRSVP(guestId: string, rsvpData: UpdateRSVPData): Promise<void> {
    const { error } = await this.supabase
      .from('couple_guests')
      .update({
        rsvp_status: rsvpData.rsvp_status,
        rsvp_date: new Date().toISOString().split('T')[0],
        attending_ceremony: rsvpData.attending_ceremony,
        attending_reception: rsvpData.attending_reception,
        dietary_requirements: rsvpData.dietary_requirements,
        dietary_notes: rsvpData.dietary_notes,
        plus_one_name: rsvpData.plus_one_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', guestId);

    if (error) throw new DatabaseError('Failed to update guest RSVP', error);
  }

  // Supplier connections
  async connectSupplier(coupleId: string, supplierId: string, connectionData: ConnectSupplierData): Promise<void> {
    const { error } = await this.supabase
      .from('couple_suppliers')
      .insert({
        couple_id: coupleId,
        supplier_id: supplierId,
        service_type: connectionData.service_type,
        package_name: connectionData.package_name,
        can_view_guests: connectionData.can_view_guests || false,
        can_view_budget: connectionData.can_view_budget || false,
        can_view_other_suppliers: connectionData.can_view_other_suppliers ?? true,
        can_edit_timeline: connectionData.can_edit_timeline || false,
        connection_status: 'connected',
        connected_at: new Date().toISOString()
      });

    if (error) throw new DatabaseError('Failed to connect supplier', error);
  }

  async getConnectedSuppliers(coupleId: string): Promise<ConnectedSupplier[]> {
    const { data, error } = await this.supabase
      .from('couple_suppliers')
      .select(`
        *,
        suppliers(
          id,
          business_name,
          business_type,
          contact_email,
          profile_photo_url
        )
      `)
      .eq('couple_id', coupleId)
      .eq('connection_status', 'connected')
      .order('connected_at', { ascending: false });

    if (error) throw new DatabaseError('Failed to get connected suppliers', error);
    return data || [];
  }

  // Task management
  async createTask(coupleId: string, taskData: CreateTaskData): Promise<CoupleTask> {
    const { data, error } = await this.supabase
      .from('couple_tasks')
      .insert({
        couple_id: coupleId,
        ...taskData,
        created_by: 'couple'
      })
      .select()
      .single();

    if (error) throw new DatabaseError('Failed to create task', error);
    return data;
  }

  async assignTask(taskId: string, assignmentData: AssignTaskData): Promise<void> {
    const { error } = await this.supabase
      .from('couple_tasks')
      .update({
        assigned_to_guest_id: assignmentData.assigned_to_guest_id,
        assigned_to_name: assignmentData.assigned_to_name,
        assigned_to_role: assignmentData.assigned_to_role,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        delivery_method: assignmentData.delivery_method || 'email'
      })
      .eq('id', taskId);

    if (error) throw new DatabaseError('Failed to assign task', error);
    
    // Send notification to assigned person
    if (assignmentData.assigned_to_guest_id) {
      await this.notifyGuestOfTaskAssignment(taskId, assignmentData.assigned_to_guest_id);
    }
  }

  // Private helper methods
  private async notifyConnectedSuppliersOfCoreFieldsUpdate(coupleId: string): Promise<void> {
    // Get connected suppliers
    const { data: connections } = await this.supabase
      .from('couple_suppliers')
      .select('supplier_id')
      .eq('couple_id', coupleId)
      .eq('connection_status', 'connected');

    if (!connections?.length) return;

    // Send real-time notifications
    for (const connection of connections) {
      await this.supabase
        .channel(`supplier_${connection.supplier_id}`)
        .send({
          type: 'core_fields_updated',
          payload: { couple_id: coupleId }
        });
    }
  }

  private async notifyGuestOfTaskAssignment(taskId: string, guestId: string): Promise<void> {
    // Implementation would send email/SMS notification
    // This is a placeholder for the actual notification logic
  }
}

// TypeScript interfaces
interface CreateCoupleData {
  partner1_first_name: string;
  partner1_last_name?: string;
  partner1_email: string;
  partner1_phone?: string;
  partner2_first_name?: string;
  partner2_last_name?: string;
  partner2_email?: string;
  partner2_phone?: string;
  couple_display_name?: string;
  preferred_contact_method?: 'email' | 'sms' | 'whatsapp' | 'phone';
  preferred_contact_person?: 'partner1' | 'partner2' | 'both';
  timezone?: string;
  locale?: string;
  currency?: string;
}

interface CoupleProfile {
  id: string;
  partner1_first_name: string;
  partner1_last_name?: string;
  partner1_email: string;
  partner2_first_name?: string;
  partner2_last_name?: string;
  couple_display_name?: string;
  couple_core_fields?: CoupleCore Fields;
  couple_suppliers?: ConnectedSupplier[];
  created_at: string;
  updated_at: string;
}

interface CreateGuestData {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  guest_side?: 'partner1' | 'partner2' | 'both' | 'neutral';
  guest_type?: 'guest' | 'wedding_party' | 'family' | 'vip' | 'vendor' | 'child';
  relationship?: string;
  plus_one_allowed?: boolean;
  dietary_requirements?: string[];
  accessibility_needs?: string;
  is_helper?: boolean;
  helper_role?: string;
}

interface UpdateRSVPData {
  rsvp_status: 'pending' | 'yes' | 'no' | 'maybe' | 'no_response';
  attending_ceremony?: boolean;
  attending_reception?: boolean;
  dietary_requirements?: string[];
  dietary_notes?: string;
  plus_one_name?: string;
}
```

### Frontend Components

```tsx
// Couple profile management component
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CouplesDatabase } from '@/lib/database/couples';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const coupleProfileSchema = z.object({
  partner1_first_name: z.string().min(1, 'First name is required'),
  partner1_last_name: z.string().optional(),
  partner1_email: z.string().email('Valid email required'),
  partner1_phone: z.string().optional(),
  partner1_pronouns: z.string().optional(),
  partner2_first_name: z.string().optional(),
  partner2_last_name: z.string().optional(),
  partner2_email: z.string().email().optional().or(z.literal('')),
  partner2_phone: z.string().optional(),
  partner2_pronouns: z.string().optional(),
  couple_display_name: z.string().optional(),
  preferred_contact_method: z.enum(['email', 'sms', 'whatsapp', 'phone']).optional(),
  preferred_contact_person: z.enum(['partner1', 'partner2', 'both']).optional(),
  wedding_hashtag: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
});

type CoupleProfileFormData = z.infer<typeof coupleProfileSchema>;

interface CoupleProfileManagerProps {
  coupleId: string;
}

export function CoupleProfileManager({ coupleId }: CoupleProfileManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const database = new CouplesDatabase();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CoupleProfileFormData>({
    resolver: zodResolver(coupleProfileSchema)
  });

  useEffect(() => {
    loadCoupleProfile();
  }, [coupleId]);

  const loadCoupleProfile = async () => {
    try {
      setLoading(true);
      const profile = await database.getCoupleProfile(coupleId);
      
      // Populate form with existing data
      Object.keys(profile).forEach((key) => {
        if (key in coupleProfileSchema.shape) {
          setValue(key as keyof CoupleProfileFormData, profile[key]);
        }
      });
    } catch (error) {
      toast({
        title: 'Error loading profile',
        description: 'Failed to load couple profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CoupleProfileFormData) => {
    try {
      setSaving(true);
      await database.updateCoupleProfile(coupleId, data);
      
      toast({
        title: 'Profile updated',
        description: 'Your couple profile has been successfully updated.'
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Loading Profile...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Couple Profile</CardTitle>
        <CardDescription>
          Manage your couple account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Partner 1 Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Partner 1 Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner1_first_name">First Name *</Label>
                <Input
                  id="partner1_first_name"
                  {...register('partner1_first_name')}
                />
                {errors.partner1_first_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.partner1_first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="partner1_last_name">Last Name</Label>
                <Input
                  id="partner1_last_name"
                  {...register('partner1_last_name')}
                />
              </div>
              <div>
                <Label htmlFor="partner1_email">Email *</Label>
                <Input
                  id="partner1_email"
                  type="email"
                  {...register('partner1_email')}
                />
                {errors.partner1_email && (
                  <p className="text-sm text-red-500 mt-1">{errors.partner1_email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="partner1_phone">Phone Number</Label>
                <Input
                  id="partner1_phone"
                  {...register('partner1_phone')}
                />
              </div>
              <div>
                <Label htmlFor="partner1_pronouns">Pronouns</Label>
                <Input
                  id="partner1_pronouns"
                  placeholder="e.g., she/her, he/him, they/them"
                  {...register('partner1_pronouns')}
                />
              </div>
            </div>
          </div>

          {/* Partner 2 Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Partner 2 Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner2_first_name">First Name</Label>
                <Input
                  id="partner2_first_name"
                  {...register('partner2_first_name')}
                />
              </div>
              <div>
                <Label htmlFor="partner2_last_name">Last Name</Label>
                <Input
                  id="partner2_last_name"
                  {...register('partner2_last_name')}
                />
              </div>
              <div>
                <Label htmlFor="partner2_email">Email</Label>
                <Input
                  id="partner2_email"
                  type="email"
                  {...register('partner2_email')}
                />
                {errors.partner2_email && (
                  <p className="text-sm text-red-500 mt-1">{errors.partner2_email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="partner2_phone">Phone Number</Label>
                <Input
                  id="partner2_phone"
                  {...register('partner2_phone')}
                />
              </div>
              <div>
                <Label htmlFor="partner2_pronouns">Pronouns</Label>
                <Input
                  id="partner2_pronouns"
                  placeholder="e.g., she/her, he/him, they/them"
                  {...register('partner2_pronouns')}
                />
              </div>
            </div>
          </div>

          {/* Couple Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Couple Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="couple_display_name">Couple Display Name</Label>
                <Input
                  id="couple_display_name"
                  placeholder="e.g., Emma & James, The Wilson Wedding"
                  {...register('couple_display_name')}
                />
              </div>
              <div>
                <Label htmlFor="wedding_hashtag">Wedding Hashtag</Label>
                <Input
                  id="wedding_hashtag"
                  placeholder="e.g., #EmmaAndJames2025"
                  {...register('wedding_hashtag')}
                />
              </div>
              <div>
                <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                <Select onValueChange={(value) => setValue('preferred_contact_method', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferred_contact_person">Preferred Contact Person</Label>
                <Select onValueChange={(value) => setValue('preferred_contact_person', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner1">Partner 1</SelectItem>
                    <SelectItem value="partner2">Partner 2</SelectItem>
                    <SelectItem value="both">Both Partners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select onValueChange={(value) => setValue('currency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">British Pound (£)</SelectItem>
                    <SelectItem value="USD">US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Guest management component
interface GuestManagerProps {
  coupleId: string;
}

export function GuestManager({ coupleId }: GuestManagerProps) {
  const [guests, setGuests] = useState<CoupleGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const database = new CouplesDatabase();
  const { toast } = useToast();

  useEffect(() => {
    loadGuests();
  }, [coupleId, filter]);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const guestFilters = filter === 'all' ? {} : { rsvp_status: filter as any };
      const guestList = await database.getGuestList(coupleId, guestFilters);
      setGuests(guestList);
    } catch (error) {
      toast({
        title: 'Error loading guests',
        description: 'Failed to load guest list. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPUpdate = async (guestId: string, rsvpData: UpdateRSVPData) => {
    try {
      await database.updateGuestRSVP(guestId, rsvpData);
      await loadGuests(); // Refresh the list
      
      toast({
        title: 'RSVP updated',
        description: 'Guest RSVP has been successfully updated.'
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update RSVP. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getRSVPStatusColor = (status: string) => {
    switch (status) {
      case 'yes': return 'text-green-600 bg-green-50';
      case 'no': return 'text-red-600 bg-red-50';
      case 'maybe': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const guestCounts = {
    total: guests.length,
    yes: guests.filter(g => g.rsvp_status === 'yes').length,
    no: guests.filter(g => g.rsvp_status === 'no').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length
  };

  if (loading) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Loading Guest List...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Guest Management</CardTitle>
        <CardDescription>
          Manage your wedding guest list and track RSVPs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* RSVP Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">Total Guests</h3>
            <p className="text-2xl font-bold text-blue-900">{guestCounts.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">Attending</h3>
            <p className="text-2xl font-bold text-green-900">{guestCounts.yes}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">Not Attending</h3>
            <p className="text-2xl font-bold text-red-900">{guestCounts.no}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800">Pending</h3>
            <p className="text-2xl font-bold text-gray-900">{guestCounts.pending}</p>
          </div>
        </div>

        {/* Filter Options */}
        <div className="mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter guests" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guests</SelectItem>
              <SelectItem value="yes">Attending</SelectItem>
              <SelectItem value="no">Not Attending</SelectItem>
              <SelectItem value="pending">Pending RSVP</SelectItem>
              <SelectItem value="maybe">Maybe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Guest List */}
        <div className="space-y-2">
          {guests.map((guest) => (
            <div key={guest.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {guest.first_name} {guest.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {guest.relationship} • {guest.guest_side} side
                        {guest.plus_one_allowed && (
                          <span className="ml-2 text-blue-500">+1 allowed</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* RSVP Status */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRSVPStatusColor(guest.rsvp_status)}`}>
                    {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                  </span>
                  
                  {/* Helper Badge */}
                  {guest.is_helper && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {guest.helper_role || 'Helper'}
                    </span>
                  )}
                  
                  {/* Contact Info */}
                  <div className="text-sm text-gray-500">
                    {guest.email && <div>{guest.email}</div>}
                    {guest.phone && <div>{guest.phone}</div>}
                  </div>
                </div>
              </div>
              
              {/* Additional Details */}
              {(guest.dietary_requirements?.length || guest.accessibility_needs) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {guest.dietary_requirements?.length && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Dietary: </span>
                      <span className="text-gray-600">{guest.dietary_requirements.join(', ')}</span>
                    </div>
                  )}
                  {guest.accessibility_needs && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Accessibility: </span>
                      <span className="text-gray-600">{guest.accessibility_needs}</span>
                    </div>
                  )}
                  {guest.dietary_notes && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Notes: </span>
                      <span className="text-gray-600">{guest.dietary_notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {guests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No guests found matching the current filter.</p>
            <Button className="mt-4">Add First Guest</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### MCP Server Usage

**Required MCP Servers:**
- **Supabase MCP**: Database operations, migrations, real-time subscriptions
- **PostgreSQL MCP**: Complex queries, performance monitoring, data validation

```typescript
// Migration application using Supabase MCP
async function applyCouplesTablesMigration() {
  // Use Supabase MCP to apply database migration
  await supabaseMcp.applyMigration({
    name: 'couples_tables_implementation',
    query: `
      -- Create all couples-related tables
      -- (SQL schema from above)
    `
  });
}

// Real-time subscription setup
async function setupCoreFieldsRealtime(coupleId: string) {
  return supabaseMcp.createRealtimeSubscription({
    channel: `couple_${coupleId}_core_fields`,
    table: 'couple_core_fields',
    filter: `couple_id=eq.${coupleId}`,
    event: '*' // All events
  });
}

// Performance monitoring
async function monitorCouplesTablePerformance() {
  const metrics = await postgresMcp.getTableMetrics('couples');
  const slowQueries = await postgresMcp.getSlowQueries({
    table: 'couples',
    threshold: 1000 // 1 second
  });
  
  return { metrics, slowQueries };
}
```

## Testing Requirements

### Unit Tests
```typescript
describe('CouplesDatabase', () => {
  let database: CouplesDatabase;
  
  beforeEach(() => {
    database = new CouplesDatabase();
  });

  describe('createCouple', () => {
    it('should create couple with valid data', async () => {
      const coupleData = {
        partner1_first_name: 'Emma',
        partner1_email: 'emma@example.com',
        partner2_first_name: 'James',
        couple_display_name: 'Emma & James'
      };
      
      const couple = await database.createCouple(coupleData);
      
      expect(couple.id).toBeDefined();
      expect(couple.partner1_first_name).toBe('Emma');
      expect(couple.couple_display_name).toBe('Emma & James');
    });
    
    it('should create default core fields', async () => {
      const coupleData = {
        partner1_first_name: 'Emma',
        partner1_email: 'emma@example.com'
      };
      
      const couple = await database.createCouple(coupleData);
      const coreFields = await database.getCoreFields(couple.id);
      
      expect(coreFields).toBeDefined();
      expect(coreFields.couple_id).toBe(couple.id);
    });
  });

  describe('updateCoreFields', () => {
    it('should trigger real-time updates to connected suppliers', async () => {
      const coupleId = 'test-couple-id';
      const updates = {
        wedding_date: '2025-06-15',
        guest_count_estimated: 150
      };
      
      await database.updateCoreFields(coupleId, updates);
      
      // Verify real-time notification was sent
      // This would need to be mocked/tested
    });
  });

  describe('guestManagement', () => {
    it('should filter guests by RSVP status', async () => {
      const coupleId = 'test-couple-id';
      const filters = { rsvp_status: 'yes' };
      
      const attendingGuests = await database.getGuestList(coupleId, filters);
      
      expect(attendingGuests.every(g => g.rsvp_status === 'yes')).toBe(true);
    });
  });
});
```

### Integration Tests
```typescript
describe('Couples Tables Integration', () => {
  it('should maintain data consistency across related tables', async () => {
    // Create couple
    const couple = await database.createCouple({
      partner1_first_name: 'Emma',
      partner1_email: 'emma@example.com'
    });
    
    // Add guest
    const guest = await database.createGuest(couple.id, {
      first_name: 'John',
      last_name: 'Doe',
      guest_side: 'partner1',
      is_helper: true
    });
    
    // Create task and assign to guest
    const task = await database.createTask(couple.id, {
      task_title: 'Setup ceremony chairs',
      task_category: 'setup',
      task_timing: 'before_ceremony'
    });
    
    await database.assignTask(task.id, {
      assigned_to_guest_id: guest.id,
      delivery_method: 'email'
    });
    
    // Verify relationships
    const taskDetails = await database.getTask(task.id);
    expect(taskDetails.assigned_to_guest_id).toBe(guest.id);
    expect(taskDetails.status).toBe('assigned');
  });
});
```

### Performance Tests
```typescript
describe('Couples Tables Performance', () => {
  it('should handle large guest lists efficiently', async () => {
    const coupleId = 'test-couple-id';
    const startTime = Date.now();
    
    // Create 500 guests
    const guestPromises = Array.from({ length: 500 }, (_, i) => 
      database.createGuest(coupleId, {
        first_name: `Guest${i}`,
        last_name: 'Test',
        email: `guest${i}@example.com`
      })
    );
    
    await Promise.all(guestPromises);
    
    // Query all guests
    const guests = await database.getGuestList(coupleId);
    const endTime = Date.now();
    
    expect(guests).toHaveLength(500);
    expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds
  });
});
```

## Acceptance Criteria

### Must Have
- [ ] All 10 couples tables created with proper schema
- [ ] Row Level Security policies implemented for data isolation
- [ ] Real-time subscriptions working for core fields updates
- [ ] Guest RSVP tracking functional with status updates
- [ ] Supplier connection permissions working correctly
- [ ] Task assignment system operational for wedding day helpers
- [ ] Core fields auto-population triggers suppliers to see updates
- [ ] Database indexes optimized for query performance
- [ ] Soft delete support implemented across all tables
- [ ] Migration scripts tested and rollback procedures verified

### Should Have
- [ ] Bulk guest import functionality
- [ ] Photo group management for photographer workflow
- [ ] Timeline conflict detection and validation
- [ ] Budget tracking with category-based organization
- [ ] Notification system for task assignments
- [ ] Wedding website data integration
- [ ] Activity logging for audit trail
- [ ] Performance monitoring dashboard
- [ ] Data export capabilities for couple data
- [ ] Advanced RSVP features (dietary restrictions, plus-ones)

### Could Have
- [ ] Guest household grouping for mailing addresses
- [ ] Automated thank you message system
- [ ] Integration with external calendar systems
- [ ] Multi-language support for international couples
- [ ] Advanced analytics on guest engagement
- [ ] Automated seating chart suggestions
- [ ] Integration with wedding planning timeline templates
- [ ] Custom field support for unique wedding requirements
- [ ] Automated reminder system for incomplete tasks
- [ ] Integration with weather APIs for outdoor wedding planning

## Dependencies

### Technical Dependencies
- PostgreSQL 15+ with UUID extension
- Supabase platform with Row Level Security
- Next.js 15 App Router for API routes
- TypeScript for type safety
- Zod for data validation
- React Hook Form for form management

### Feature Dependencies
- **WS-300**: Suppliers Tables (for supplier connections)
- **WS-299**: Core Database Implementation (for base architecture)
- **WS-297**: Authentication System (for user management)

### External Dependencies
- Email service for notifications (Resend or similar)
- SMS service for mobile notifications (Twilio)
- File storage for profile photos (Supabase Storage)
- Real-time service for live updates (Supabase Realtime)

## Risks and Mitigation

### Technical Risks
1. **Database Performance**: Large guest lists could slow queries
   - *Mitigation*: Implement pagination and efficient indexing
   
2. **Real-time Update Failures**: Network issues could cause sync problems
   - *Mitigation*: Implement retry logic and offline capability
   
3. **Data Privacy Violations**: Incorrect RLS policies could expose data
   - *Mitigation*: Comprehensive testing of all security policies

### Business Risks
1. **Guest Data Loss**: Critical wedding information could be corrupted
   - *Mitigation*: Regular backups and data validation
   
2. **Performance Issues**: System slowdown during peak wedding season
   - *Mitigation*: Load testing and auto-scaling infrastructure
   
3. **Integration Failures**: Third-party services could become unavailable
   - *Mitigation*: Graceful degradation and fallback options

---

**Estimated Effort:** 8 story points (16 hours)
**Priority:** Critical Path  
**Sprint:** Foundation Sprint  
**Team:** Team B (Backend)