# 03-couples-tables.md - WedSync/WedMe Database Schema

## Overview

This document defines the complete database schema for couple-related tables in the WedMe platform. These tables manage couple accounts, their wedding information, guest management, supplier connections, and all related data. The schema uses PostgreSQL with Supabase extensions for real-time updates and Row Level Security (RLS).

## Table Relationships Diagram

sql

- `*- Core relationships between couple tables/*
couples (main table)
 ├── couple_core_fields (1:1 - wedding details)
 ├── couple_suppliers (1:many - connected vendors)
 ├── couple_guests (1:many - guest list)
 ├── couple_tasks (1:many - day-of tasks)
 ├── couple_timeline_events (1:many - wedding timeline)
 ├── couple_budgets (1:many - budget tracking)
 └── couple_notifications (1:many - system notifications)
/*`

## 1. Main Couples Table

sql

- `*- Main couples account table*
CREATE TABLE couples ( *- Primary identification* id UUID PRIMARY KEY DEFAULT gen_random_uuid(), *- Authentication* auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, *- Basic couple information* partner1_first_name TEXT NOT NULL, partner1_last_name TEXT, partner1_email TEXT UNIQUE NOT NULL, partner1_phone TEXT, partner1_pronouns TEXT, *- he/him, she/her, they/them, custom* partner2_first_name TEXT, partner2_last_name TEXT, partner2_email TEXT, partner2_phone TEXT, partner2_pronouns TEXT, *- Display preferences* couple_display_name TEXT, *- "Emma & James", "The Wilson Wedding"* preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'sms', 'whatsapp', 'phone')), preferred_contact_person TEXT CHECK (preferred_contact_person IN ('partner1', 'partner2', 'both')), *- Account status* account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'cancelled')), email_verified BOOLEAN DEFAULT false, phone_verified BOOLEAN DEFAULT false, *- Onboarding tracking* onboarding_completed BOOLEAN DEFAULT false, onboarding_step TEXT, *- tracks current onboarding position* invited_by_supplier_id UUID REFERENCES suppliers(id), invitation_token TEXT UNIQUE, invitation_accepted_at TIMESTAMPTZ, *- Profile customization* profile_photo_url TEXT, cover_photo_url TEXT, wedding_hashtag TEXT, *- Timezone and locale* timezone TEXT DEFAULT 'UTC', locale TEXT DEFAULT 'en-US', currency TEXT DEFAULT 'GBP', *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), last_login_at TIMESTAMPTZ, login_count INTEGER DEFAULT 0, *- Soft delete* deleted_at TIMESTAMPTZ, deleted_by UUID REFERENCES auth.users(id), *- Indexes for performance* CONSTRAINT valid_email CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
*- Indexes for query performance*
CREATE INDEX idx_couples_auth_user ON couples(auth_user_id);
CREATE INDEX idx_couples_emails ON couples(partner1_email, partner2_email);
CREATE INDEX idx_couples_status ON couples(account_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_couples_invited_by ON couples(invited_by_supplier_id) WHERE invited_by_supplier_id IS NOT NULL;
CREATE INDEX idx_couples_created ON couples(created_at DESC);
*- Trigger for updated_at*
CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`

## 2. Core Fields Table

sql

- `*- Core wedding information that auto-populates across all supplier forms*
CREATE TABLE couple_core_fields ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID UNIQUE REFERENCES couples(id) ON DELETE CASCADE, *- Wedding basics* wedding_date DATE, wedding_date_is_flexible BOOLEAN DEFAULT false, wedding_date_notes TEXT, *- "Sometime in June 2025"* *- Ceremony details* ceremony_venue_name TEXT, ceremony_venue_id UUID REFERENCES venues(id), ceremony_address_line1 TEXT, ceremony_address_line2 TEXT, ceremony_city TEXT, ceremony_postcode TEXT, ceremony_country TEXT DEFAULT 'United Kingdom', ceremony_time TIME, ceremony_type TEXT, *- 'religious', 'civil', 'humanist', 'symbolic', 'other'* *- Reception details (if different)* reception_same_as_ceremony BOOLEAN DEFAULT true, reception_venue_name TEXT, reception_venue_id UUID REFERENCES venues(id), reception_address_line1 TEXT, reception_address_line2 TEXT, reception_city TEXT, reception_postcode TEXT, reception_country TEXT DEFAULT 'United Kingdom', reception_time TIME, *- Guest information* guest_count_estimated INTEGER, guest_count_adults INTEGER, guest_count_children INTEGER, guest_count_infants INTEGER, *- Wedding style/theme* wedding_style TEXT[], *- ['rustic', 'elegant', 'bohemian', 'traditional']* color_scheme TEXT[], *- ['blush', 'gold', 'sage green']* *- Budget (private, not shared with suppliers)* budget_total DECIMAL(10, 2), budget_currency TEXT DEFAULT 'GBP', *- Field completion tracking* completion_percentage INTEGER DEFAULT 0, last_updated_field TEXT, last_updated_by TEXT, *- 'couple' or 'supplier_id'* *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), *- JSON fields for flexibility* custom_fields JSONB DEFAULT '{}'::jsonb, CONSTRAINT valid_guest_count CHECK ( (guest_count_adults IS NULL OR guest_count_adults >= 0) AND (guest_count_children IS NULL OR guest_count_children >= 0) AND (guest_count_infants IS NULL OR guest_count_infants >= 0) )
);
*- Indexes*
CREATE INDEX idx_core_fields_couple ON couple_core_fields(couple_id);
CREATE INDEX idx_core_fields_wedding_date ON couple_core_fields(wedding_date) WHERE wedding_date IS NOT NULL;
CREATE INDEX idx_core_fields_venues ON couple_core_fields(ceremony_venue_id, reception_venue_id);
*- Trigger to calculate completion percentage*
CREATE OR REPLACE FUNCTION calculate_core_fields_completion()
RETURNS TRIGGER AS $$
DECLARE total_fields INTEGER := 20; *- Adjust based on required fields* completed_fields INTEGER := 0;
BEGIN *- Count completed fields* IF NEW.wedding_date IS NOT NULL THEN completed_fields := completed_fields + 1; END IF; IF NEW.ceremony_venue_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF; IF NEW.ceremony_time IS NOT NULL THEN completed_fields := completed_fields + 1; END IF; IF NEW.guest_count_estimated IS NOT NULL THEN completed_fields := completed_fields + 1; END IF; *- Add more field checks as needed* NEW.completion_percentage := (completed_fields * 100) / total_fields; NEW.updated_at := NOW(); RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calculate_completion_trigger BEFORE INSERT OR UPDATE ON couple_core_fields FOR EACH ROW EXECUTE FUNCTION calculate_core_fields_completion();`

## 3. Couple-Supplier Connections

sql

- `*- Tracks connections between couples and their wedding suppliers*
CREATE TABLE couple_suppliers ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE, *- Connection details* connection_status TEXT DEFAULT 'invited' CHECK (connection_status IN ( 'invited', *- Invitation sent* 'connected', *- Supplier accepted* 'declined', *- Supplier declined* 'disconnected', *- Previously connected but removed* 'blocked' *- Couple blocked supplier* )), *- Service details* service_type TEXT NOT NULL, *- 'photography', 'catering', 'venue', etc.* package_name TEXT, service_notes TEXT, *- Important dates* invited_at TIMESTAMPTZ DEFAULT NOW(), connected_at TIMESTAMPTZ, contract_signed_date DATE, final_payment_date DATE, *- Permissions* can_view_guests BOOLEAN DEFAULT false, can_view_budget BOOLEAN DEFAULT false, can_view_other_suppliers BOOLEAN DEFAULT true, can_edit_timeline BOOLEAN DEFAULT false, *- Communication preferences* preferred_contact_method TEXT, primary_contact_person TEXT, *- Collaboration metrics* last_activity TIMESTAMPTZ, forms_completed INTEGER DEFAULT 0, messages_exchanged INTEGER DEFAULT 0, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT, *- Private notes about this supplier* *- Ensure unique connection per couple-supplier pair* CONSTRAINT unique_couple_supplier UNIQUE(couple_id, supplier_id)
);
*- Indexes*
CREATE INDEX idx_couple_suppliers_couple ON couple_suppliers(couple_id);
CREATE INDEX idx_couple_suppliers_supplier ON couple_suppliers(supplier_id);
CREATE INDEX idx_couple_suppliers_status ON couple_suppliers(connection_status);
CREATE INDEX idx_couple_suppliers_service ON couple_suppliers(service_type);`

## 4. Guest Management Tables

sql

- `*- Guest list management*
CREATE TABLE couple_guests ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Guest information* first_name TEXT NOT NULL, last_name TEXT, email TEXT, phone TEXT, *- Categorization* guest_side TEXT CHECK (guest_side IN ('partner1', 'partner2', 'both', 'neutral')), guest_type TEXT DEFAULT 'guest' CHECK (guest_type IN ( 'guest', 'wedding_party', 'family', 'vip', 'vendor', *- Vendor attending as guest* 'child' )), relationship TEXT, *- 'Mother of Bride', 'Best Man', 'College Friend'* *- Group management* household_id UUID, *- Groups guests in same household* household_primary BOOLEAN DEFAULT false, *- Primary contact for household* table_number INTEGER, *- RSVP tracking* invitation_sent BOOLEAN DEFAULT false, invitation_sent_date DATE, save_the_date_sent BOOLEAN DEFAULT false, rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ( 'pending', 'yes', 'no', 'maybe', 'no_response' )), rsvp_date DATE, attending_ceremony BOOLEAN, attending_reception BOOLEAN, *- Guest details* plus_one_allowed BOOLEAN DEFAULT false, plus_one_name TEXT, dietary_requirements TEXT[], dietary_notes TEXT, accessibility_needs TEXT, *- Accommodation* accommodation_needed BOOLEAN DEFAULT false, accommodation_nights INTEGER, accommodation_notes TEXT, *- Photo groups (for photographer)* photo_groups TEXT[], *- ['immediate_family', 'college_friends', 'work_colleagues']* *- Task delegation* is_helper BOOLEAN DEFAULT false, helper_role TEXT, *- 'usher', 'reader', 'setup_crew'* can_receive_tasks BOOLEAN DEFAULT false, *- Children specific* age_group TEXT CHECK (age_group IN ('infant', 'toddler', 'child', 'teen', 'adult')), requires_meal BOOLEAN DEFAULT true, requires_seat BOOLEAN DEFAULT true, *- Communication* contact_preferences TEXT CHECK (contact_preferences IN ('email', 'sms', 'whatsapp', 'phone', 'mail')), mailing_address TEXT, thank_you_sent BOOLEAN DEFAULT false, thank_you_sent_date DATE, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT, *- Private notes about guest* *- Custom fields for flexibility* custom_data JSONB DEFAULT '{}'::jsonb
);
*- Indexes*
CREATE INDEX idx_guests_couple ON couple_guests(couple_id);
CREATE INDEX idx_guests_household ON couple_guests(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_guests_rsvp ON couple_guests(rsvp_status);
CREATE INDEX idx_guests_helper ON couple_guests(is_helper) WHERE is_helper = true;
CREATE INDEX idx_guests_table ON couple_guests(table_number) WHERE table_number IS NOT NULL;
*- Household management table*
CREATE TABLE guest_households ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, household_name TEXT NOT NULL, address_line1 TEXT, address_line2 TEXT, city TEXT, postcode TEXT, country TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);`

## 5. Task Delegation System

sql

- `*- Task management for wedding day helpers*
CREATE TABLE couple_tasks ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Task details* task_title TEXT NOT NULL, task_description TEXT, task_category TEXT CHECK (task_category IN ( 'setup', 'guest_management', 'supplier_liaison', 'personal_support', 'emergency', 'reception', 'cleanup', 'other' )), *- Assignment* assigned_to_guest_id UUID REFERENCES couple_guests(id), assigned_to_name TEXT, *- For non-guest helpers* assigned_to_role TEXT, *- 'best_man', 'maid_of_honor', etc.* *- Timing* task_timing TEXT CHECK (task_timing IN ( 'before_ceremony', 'during_ceremony', 'after_ceremony', 'cocktail_hour', 'during_reception', 'end_of_night', 'next_day' )), specific_time TIME, duration_minutes INTEGER, *- Location* task_location TEXT, location_details TEXT, *- Priority and status* priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')), status TEXT DEFAULT 'pending' CHECK (status IN ( 'pending', 'assigned', 'in_progress', 'completed', 'cancelled' )), *- Instructions* special_instructions TEXT, attachments TEXT[], *- URLs to instruction documents/images* *- Tracking* assigned_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, completion_notes TEXT, *- Delivery* delivery_method TEXT CHECK (delivery_method IN ( 'email', 'sms', 'whatsapp', 'printed', 'in_app', 'verbal' )), delivered_at TIMESTAMPTZ, *- Thank you tracking* thank_you_sent BOOLEAN DEFAULT false, thank_you_sent_date DATE, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), created_by TEXT *- 'couple' or supplier_id*
);
*- Indexes*
CREATE INDEX idx_tasks_couple ON couple_tasks(couple_id);
CREATE INDEX idx_tasks_assigned ON couple_tasks(assigned_to_guest_id);
CREATE INDEX idx_tasks_timing ON couple_tasks(task_timing, specific_time);
CREATE INDEX idx_tasks_status ON couple_tasks(status);
CREATE INDEX idx_tasks_priority ON couple_tasks(priority) WHERE status != 'completed';`

## 6. Timeline Management

sql

- `*- Wedding day timeline events*
CREATE TABLE couple_timeline_events ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Event details* event_name TEXT NOT NULL, event_description TEXT, event_category TEXT CHECK (event_category IN ( 'preparation', 'ceremony', 'photos', 'cocktail', 'reception', 'party', 'end_of_night', 'vendor_specific', 'other' )), *- Timing* start_time TIME NOT NULL, end_time TIME, duration_minutes INTEGER, *- Location* location TEXT, location_venue_id UUID REFERENCES venues(id), location_details TEXT, *- Participants* involves_suppliers UUID[], *- Array of supplier_ids* involves_guests UUID[], *- Array of guest_ids* involves_wedding_party BOOLEAN DEFAULT false, *- Visibility* visible_to_guests BOOLEAN DEFAULT false, visible_to_suppliers BOOLEAN DEFAULT true, visible_to_specific_suppliers UUID[], *- If not all suppliers should see* *- Dependencies* depends_on_event_id UUID REFERENCES couple_timeline_events(id), buffer_minutes INTEGER, *- Minutes needed after dependent event* *- Weather contingency* weather_dependent BOOLEAN DEFAULT false, rain_plan TEXT, *- Notes* supplier_notes TEXT, private_notes TEXT, *- Source* created_by TEXT NOT NULL, *- 'couple' or supplier_id* last_modified_by TEXT, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), *- Custom data* custom_data JSONB DEFAULT '{}'::jsonb
);
*- Indexes*
CREATE INDEX idx_timeline_couple ON couple_timeline_events(couple_id);
CREATE INDEX idx_timeline_time ON couple_timeline_events(start_time, end_time);
CREATE INDEX idx_timeline_category ON couple_timeline_events(event_category);
CREATE INDEX idx_timeline_suppliers ON couple_timeline_events USING GIN(involves_suppliers);`

## 7. Budget Tracking

sql

- `*- Budget management (couple-controlled, not shared with suppliers)*
CREATE TABLE couple_budgets ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Category details* category_name TEXT NOT NULL, category_type TEXT CHECK (category_type IN ( 'venue', 'catering', 'photography', 'videography', 'flowers', 'music', 'attire', 'beauty', 'stationery', 'favors', 'transport', 'accommodation', 'other' )), *- Budget amounts* budgeted_amount DECIMAL(10, 2), spent_amount DECIMAL(10, 2) DEFAULT 0, pending_amount DECIMAL(10, 2) DEFAULT 0, *- Committed but not paid* *- Supplier connection* supplier_id UUID REFERENCES suppliers(id), supplier_name TEXT, *- For non-connected suppliers* *- Payment tracking* deposit_amount DECIMAL(10, 2), deposit_paid BOOLEAN DEFAULT false, deposit_paid_date DATE, final_payment_amount DECIMAL(10, 2), final_payment_date DATE, final_payment_paid BOOLEAN DEFAULT false, *- Priority* priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), is_essential BOOLEAN DEFAULT true, *- Notes* notes TEXT, payment_notes TEXT, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
*- Indexes*
CREATE INDEX idx_budget_couple ON couple_budgets(couple_id);
CREATE INDEX idx_budget_category ON couple_budgets(category_type);
CREATE INDEX idx_budget_supplier ON couple_budgets(supplier_id) WHERE supplier_id IS NOT NULL;`

## 8. Notifications System

sql

- `*- Couple notifications*
CREATE TABLE couple_notifications ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Notification details* notification_type TEXT NOT NULL CHECK (notification_type IN ( 'supplier_invite', 'supplier_connected', 'form_request', 'form_completed', 'message_received', 'task_assigned', 'task_completed', 'timeline_update', 'payment_reminder', 'review_request', 'system_announcement', 'other' )), title TEXT NOT NULL, message TEXT NOT NULL, *- Source* from_supplier_id UUID REFERENCES suppliers(id), from_system BOOLEAN DEFAULT false, *- Action* action_url TEXT, *- Where to go when clicked* action_text TEXT, *- Button text* requires_action BOOLEAN DEFAULT false, *- Status* is_read BOOLEAN DEFAULT false, read_at TIMESTAMPTZ, is_archived BOOLEAN DEFAULT false, archived_at TIMESTAMPTZ, *- Priority* priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')), *- Expiry* expires_at TIMESTAMPTZ, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), metadata JSONB DEFAULT '{}'::jsonb
);
*- Indexes*
CREATE INDEX idx_notifications_couple ON couple_notifications(couple_id);
CREATE INDEX idx_notifications_unread ON couple_notifications(couple_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_priority ON couple_notifications(priority, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON couple_notifications(notification_type);`

## 9. Wedding Website Configuration

sql

- `*- Wedding website settings*
CREATE TABLE couple_website_config ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID UNIQUE REFERENCES couples(id) ON DELETE CASCADE, *- Website status* is_enabled BOOLEAN DEFAULT false, is_public BOOLEAN DEFAULT false, website_slug TEXT UNIQUE, *- for wedme.app/[slug]* custom_domain TEXT UNIQUE, *- Template and styling* template_id TEXT DEFAULT 'classic', color_primary TEXT DEFAULT '#E91E63', color_secondary TEXT DEFAULT '#FFC107', font_heading TEXT DEFAULT 'Playfair Display', font_body TEXT DEFAULT 'Open Sans', *- Content pages* show_our_story BOOLEAN DEFAULT true, our_story_content TEXT, show_event_details BOOLEAN DEFAULT true, show_travel_info BOOLEAN DEFAULT true, travel_info_content TEXT, show_registry BOOLEAN DEFAULT true, registry_links JSONB DEFAULT '[]'::jsonb, show_rsvp BOOLEAN DEFAULT true, show_gallery BOOLEAN DEFAULT false, *- Photos* hero_image_url TEXT, gallery_images TEXT[], *- SEO* meta_title TEXT, meta_description TEXT, *- Access control* password_protected BOOLEAN DEFAULT false, access_password TEXT, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), published_at TIMESTAMPTZ, last_published_by TEXT
);
*- Indexes*
CREATE INDEX idx_website_couple ON couple_website_config(couple_id);
CREATE INDEX idx_website_slug ON couple_website_config(website_slug) WHERE website_slug IS NOT NULL;
CREATE INDEX idx_website_domain ON couple_website_config(custom_domain) WHERE custom_domain IS NOT NULL;`

## 10. Activity Tracking

sql

- `*- Track couple activity for analytics*
CREATE TABLE couple_activity_log ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), couple_id UUID REFERENCES couples(id) ON DELETE CASCADE, *- Activity details* activity_type TEXT NOT NULL, activity_category TEXT CHECK (activity_category IN ( 'auth', 'profile', 'supplier', 'guest', 'task', 'timeline', 'budget', 'form', 'communication', 'other' )), description TEXT, *- Context* related_supplier_id UUID REFERENCES suppliers(id), related_guest_id UUID REFERENCES couple_guests(id), related_entity_type TEXT, related_entity_id UUID, *- Technical details* ip_address INET, user_agent TEXT, session_id TEXT, *- Metadata* created_at TIMESTAMPTZ DEFAULT NOW(), metadata JSONB DEFAULT '{}'::jsonb
);
*- Indexes*
CREATE INDEX idx_activity_couple ON couple_activity_log(couple_id);
CREATE INDEX idx_activity_created ON couple_activity_log(created_at DESC);
CREATE INDEX idx_activity_type ON couple_activity_log(activity_type);
CREATE INDEX idx_activity_supplier ON couple_activity_log(related_supplier_id) WHERE related_supplier_id IS NOT NULL;
*- Partitioning for large-scale activity logs (optional)- Partition by month for better performance*
CREATE TABLE couple_activity_log_y2024m01 PARTITION OF couple_activity_log FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');`

## Row Level Security Policies

sql

- `*- Enable RLS on all tables*
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_core_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_website_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_activity_log ENABLE ROW LEVEL SECURITY;
*- Couples can see and edit their own data*
CREATE POLICY couples_own_data ON couples FOR ALL USING (auth.uid() = auth_user_id);
CREATE POLICY core_fields_own_data ON couple_core_fields FOR ALL USING ( couple_id IN ( SELECT id FROM couples WHERE auth_user_id = auth.uid() ) );
*- Suppliers can see couple data they're connected to*
CREATE POLICY suppliers_see_connected_couples ON couples FOR SELECT USING ( id IN ( SELECT couple_id FROM couple_suppliers WHERE supplier_id IN ( SELECT id FROM suppliers WHERE auth_user_id = auth.uid() ) AND connection_status = 'connected' ) );
*- Suppliers can see core fields of connected couples*
CREATE POLICY suppliers_see_core_fields ON couple_core_fields FOR SELECT USING ( couple_id IN ( SELECT couple_id FROM couple_suppliers WHERE supplier_id IN ( SELECT id FROM suppliers WHERE auth_user_id = auth.uid() ) AND connection_status = 'connected' ) );
*- Guest list visibility based on permissions*
CREATE POLICY suppliers_see_guests ON couple_guests FOR SELECT USING ( couple_id IN ( SELECT couple_id FROM couple_suppliers WHERE supplier_id IN ( SELECT id FROM suppliers WHERE auth_user_id = auth.uid() ) AND connection_status = 'connected' AND can_view_guests = true ) );
*- Budget is private to couples only*
CREATE POLICY budget_private ON couple_budgets FOR ALL USING ( couple_id IN ( SELECT id FROM couples WHERE auth_user_id = auth.uid() ) );`

## Migration and Seeding

sql

- `*- Sample data for development/testing*
INSERT INTO couples ( partner1_first_name, partner1_last_name, partner1_email, partner2_first_name, partner2_last_name, partner2_email, couple_display_name
) VALUES ('Emma', 'Wilson', 'emma@example.com', 'James', 'Wilson', 'james@example.com', 'Emma & James'), ('Sarah', 'Chen', 'sarah@example.com', 'Michael', 'Chen', 'michael@example.com', 'Sarah & Michael'), ('Laura', 'Thompson', 'laura@example.com', 'David', 'Thompson', 'david@example.com', 'The Thompson Wedding');
*- Insert corresponding core fields*
INSERT INTO couple_core_fields ( couple_id, wedding_date, ceremony_venue_name, guest_count_estimated
)
SELECT id, CURRENT_DATE + INTERVAL '6 months', 'The Barn at Grimsby', 120
FROM couples
WHERE partner1_email = 'emma@example.com';`

## Performance Considerations

1. **Indexing Strategy**: Create indexes on frequently queried columns (couple_id, wedding_date, status fields)
2. **Partitioning**: Consider partitioning activity_log by month for better performance
3. **Archival**: Move completed weddings (>1 year old) to archive tables
4. **Caching**: Cache frequently accessed data like core_fields in Redis
5. **Batch Operations**: Use bulk inserts for guest imports
6. **Async Processing**: Queue heavy operations like notification sending

## Security Considerations

1. **PII Protection**: Encrypt sensitive fields (email, phone) at rest
2. **Audit Logging**: Track all data modifications
3. **Data Retention**: Define policies for data deletion post-wedding
4. **Access Control**: Strict RLS policies for supplier access
5. **Rate Limiting**: Prevent abuse of invitation system
6. **Input Validation**: Validate all user inputs at database level

---

#