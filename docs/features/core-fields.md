Core Fields System Documentation
Overview
The Core Fields system is WedSync's revolutionary feature that eliminates repetitive data entry. Couples enter their wedding information once in WedMe, and it automatically populates across all supplier forms. This is what makes WedSync different from generic form builders.
Core Concept
Think of Core Fields as "universal wedding data" that every supplier needs. Instead of couples typing "June 15, 2025" into 14 different vendor forms, they enter it once and it flows everywhere.
Field Categories
1. Couple Information Fields
Purpose: Basic contact and personal details about the couple
Fields:

couple_names - Both partners' names (e.g., "Emma & James")
partner1_first_name - First partner's first name
partner1_last_name - First partner's last name
partner1_email - First partner's email address
partner1_phone - First partner's phone number
partner2_first_name - Second partner's first name (optional)
partner2_last_name - Second partner's last name (optional)
partner2_email - Second partner's email (optional)
partner2_phone - Second partner's phone (optional)
primary_contact - Which partner is main contact
pronouns - Preferred pronouns for each partner
mailing_address - Full address for deliveries
communication_preference - Email, SMS, WhatsApp, or Phone

2. Wedding Event Fields
Purpose: Core details about the wedding day itself
Fields:

wedding_date - The big day (date picker)
ceremony_time - Start time of ceremony
ceremony_venue_name - Name of ceremony location
ceremony_venue_address - Full address of ceremony
ceremony_venue_contact - Venue coordinator details
reception_venue_name - Reception location (if different)
reception_venue_address - Reception address
reception_time - Reception start time
wedding_end_time - Expected end of celebration
wedding_style - Formal, casual, rustic, modern, etc.
wedding_theme - Color scheme and theme details
indoor_outdoor - Indoor, outdoor, or both
season - Automatically calculated from date

3. Guest Information Fields
Purpose: Guest count and breakdown for planning
Fields:

total_guest_count - Total number expected
adult_guests - Number of adults
child_guests - Number of children
infant_guests - Number of infants (under 2)
confirmed_guests - Final confirmed count
table_count - Number of tables needed
guests_with_dietary_requirements - Count with special needs
wheelchair_accessible_needs - Accessibility requirements
out_of_town_guests - Guests needing accommodation

4. Key People Fields
Purpose: Important people involved in the wedding
Fields:

wedding_party_size - Total wedding party count
bridesmaids_count - Number of bridesmaids
groomsmen_count - Number of groomsmen
maid_of_honor_name - Maid/Matron of honor
maid_of_honor_contact - Their contact details
best_man_name - Best man's name
best_man_contact - Best man's contact
wedding_planner_name - If they have one
wedding_planner_contact - Planner's details
day_of_coordinator - Coordinator details
officiant_name - Who's performing ceremony
parents_names - Both sets of parents

5. Vendor Team Fields
Purpose: Track all connected suppliers
Fields:

photographer_name - Photography company
videographer_name - Videography company
caterer_name - Catering company
florist_name - Florist/floral designer
dj_band_name - Entertainment provider
venue_name - Primary venue
hair_stylist_name - Hair professional
makeup_artist_name - Makeup professional
cake_baker_name - Cake/dessert provider
other_vendors - JSON array of additional vendors

Field States System
Status Indicators
Each field has a completion status that shows across the platform:
✅ Completed - Field has been filled with valid data
🟡 Partial - Field partially complete or needs review
⚪ Pending - Field not yet filled
❌ Not Applicable - Field not relevant for this wedding
🔒 Locked - Field locked by supplier (can't be edited)
Validation States

Valid - Data meets all requirements
Invalid - Data fails validation rules
Outdated - Data hasn't been confirmed recently
Conflicting - Different sources show different data

Auto-Population Flow
How It Works

Couple enters data once in WedMe dashboard
System validates and stores in core fields table
When supplier creates form, they mark fields as "core fields"
When couple accesses form, core fields auto-fill
Updates sync across all connected systems

Implementation for Claude Code
markdown## For Sub-Agent: Core Fields Manager

### Task: Implement Core Field Auto-Population
1. Create database table: `core_fields`
   - couple_id (foreign key)
   - field_name (from list above)
   - field_value (JSON for flexibility)
   - last_updated
   - updated_by
   - validation_status

2. Create API endpoints:
   - GET /api/core-fields/{couple_id}
   - PUT /api/core-fields/{couple_id}/{field_name}
   - POST /api/core-fields/validate
   - GET /api/core-fields/completion-status/{couple_id}

3. Create React components:
   - CoreFieldIndicator (shows ✅🟡⚪❌ status)
   - CoreFieldInput (smart input with validation)
   - CoreFieldsSummary (dashboard widget)
   - CoreFieldsProgress (completion percentage)

4. Implement auto-population:
   - When form loads, fetch core fields
   - Match form fields to core field names
   - Pre-fill matching fields
   - Lock fields if supplier configured as read-only
   - Show indicator that field is auto-populated
Supplier Form Integration
Marking Fields as Core Fields
When suppliers build forms, they can:

Link to core field - Field auto-populates
Copy from core field - Initial value from core, but editable
Independent field - Not connected to core fields
Override core field - Allow couple to update core field

Visual Indicators in Form Builder
[Wedding Date] 🔄 ← Shows this is a core field
[Special Request] ← Regular field, no indicator
Privacy & Permissions
Data Visibility Rules

Couples control what suppliers can see
Suppliers can request access to specific fields
Some fields always visible (wedding date, guest count)
Some fields restricted (financial info, personal addresses)

Permission Levels

Public - All connected suppliers can see
Protected - Only suppliers with permission
Private - Only couple can see/edit
Restricted - Specific suppliers only

Smart Features
Intelligent Field Suggestions
System suggests values based on:

Venue database - Knows venue addresses, capacities
Date intelligence - Calculates season, suggests times
Guest math - Auto-calculates related numbers
Vendor directory - Auto-completes vendor names

Conflict Resolution
When data conflicts arise:

Show both values to couple
Indicate source of each value
Let couple choose correct one
Update all systems with resolution

Progressive Disclosure
Fields appear as planning progresses:

12 months out: Basic fields only
6 months out: Vendor fields appear
3 months out: Guest counts finalize
1 month out: Final details fields

Mobile Optimization
Quick Edit Mode
On mobile, couples can:

Tap any field to quick edit
Swipe between field categories
Voice input for text fields
Photo capture for venue details

Analytics & Insights
Completion Tracking
Track and display:

Overall completion percentage
Category completion (e.g., "Venue Details 100%")
Missing critical fields warnings
Last updated timestamps

Supplier Analytics
Suppliers can see:

Field completion rates for their couples
Most commonly empty fields
Average time to complete fields
Fields causing confusion (multiple edits)

Implementation Priority
Phase 1: Foundation (Week 1)

Database schema for core_fields table
Basic CRUD operations API
Simple status indicators
Manual field linking in forms

Phase 2: Auto-Population (Week 2)

Auto-fill mechanism
Validation system
Conflict detection
Update synchronization

Phase 3: Intelligence (Week 3)

Smart suggestions
Venue database integration
Progressive disclosure
Analytics dashboard

Phase 4: Polish (Week 4)

Mobile optimization
Voice input
Bulk editing
Advanced permissions

Success Metrics
For Couples

Time saved: 2+ hours not re-entering data
Accuracy: 95% reduction in data errors
Satisfaction: "Never type venue address again"

For Suppliers

Completion rate: 85% of forms fully completed
Data quality: 90% reduction in missing info
Time saved: 30 minutes per wedding on data entry

Common Issues & Solutions
Issue: Field Mismatch
Problem: Supplier calls it "Event Date", system calls it "Wedding Date"
Solution: Intelligent field mapping with synonyms
Issue: Partial Data
Problem: Couple knows venue but not exact address yet
Solution: Allow partial completion with 🟡 status
Issue: Privacy Concerns
Problem: Couple doesn't want all vendors seeing phone numbers
Solution: Granular permission controls per field
Issue: Data Conflicts
Problem: Venue says 150 capacity, couple entered 180 guests
Solution: Conflict warnings with resolution flow
Integration with Other Features
Forms System

Forms automatically detect and use core fields
Form builder shows which fields are "core"
Submission updates core fields if permitted

Customer Journey

Journeys can trigger based on field completion
Empty fields can trigger reminder emails
Completed fields unlock journey stages

Dashboard

Core fields widget shows completion status
Quick edit available from dashboard
Missing fields highlighted as tasks

Communications

Email templates can use core field variables
SMS can reference core field data
Meeting requests include relevant fields