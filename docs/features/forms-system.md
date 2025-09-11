# Forms System Specification
# Forms System - Complete Implementation Guide

## Overview
The forms system is the heart of WedSync, allowing wedding suppliers to create, manage, and collect information from couples. This system must handle everything from simple contact forms to complex multi-page questionnaires with conditional logic.

## Core Components

### 1. Form Builder Interface
**Location**: `/app/(supplier)/forms/builder`

#### Canvas Area
- Drag and drop form fields from left sidebar to center canvas
- Visual grid system with 1-4 columns per row
- Each field can span 1-4 columns
- Sections can be created to group related fields
- Real-time preview on the right side
- Mobile preview toggle button

#### Field Palette (Left Sidebar)
**Basic Fields**:
- Single Line Text (name, email, phone)
- Multi-line Text Area (notes, special requests)
- Number Input (guest count, budget)
- Date Picker (wedding date, deadline dates)
- Time Picker (ceremony time, reception time)
- Dropdown Select (single choice)
- Multi-select Checkboxes
- Radio Buttons (single choice, visible options)
- File Upload (PDFs, images, documents)

**Wedding-Specific Fields**:
- Couple Names Field (auto-splits into Partner 1 & Partner 2)
- Venue Selector (integrates with Google Places)
- Guest List Organizer (table format)
- Timeline Builder (visual timeline)
- Photo Group Organizer (for photographers)
- Song Request List (for DJs/bands)
- Dietary Requirements Matrix (for caterers)
- Flower Selection Grid (for florists)

#### Field Settings Panel (Right Sidebar)
Each field when selected shows:
- Field Label (what the couple sees)
- Field ID (internal reference)
- Required/Optional toggle
- Help text option
- Placeholder text
- Validation rules (min/max length, format)
- Conditional logic ("Show this field if...")
- Core field mapping (links to WedMe data)

### 2. Core Fields Integration
**Critical Feature**: Forms can pull data from couple's WedMe dashboard

#### Auto-Population Fields
These fields automatically fill from WedMe if couple is connected:
- Wedding Date
- Venue Name & Address
- Guest Count
- Couple Names
- Contact Information
- Ceremony/Reception Times
- Other Connected Suppliers

#### Mapping Interface
- When adding a field, option to "Link to Core Field"
- Dropdown shows available core fields
- Visual indicator (🔄) shows field will auto-populate
- Option to make field "read-only" or "editable"

### 3. Form Templates

#### Pre-built Templates by Vendor Type
**Photography Templates**:
- Wedding Day Questionnaire
- Engagement Session Planner
- Family Photo List
- Timeline Coordinator
- Shot List Builder

**DJ/Band Templates**:
- Music Preferences
- Do Not Play List
- Special Dances Planner
- Equipment Requirements

**Catering Templates**:
- Menu Selection
- Dietary Requirements
- Bar Service Options
- Tasting Appointment

**Venue Templates**:
- Site Visit Booking
- Layout Preferences
- Vendor Requirements
- Setup Schedule

#### Template Management
- Save any form as template
- Edit templates without affecting live forms
- Share templates to marketplace (Professional+ tier)
- Import templates from marketplace

### 4. Form Submission Flow

#### Client Experience
1. Couple receives form link via email/SMS
2. Opens to branded page with supplier logo
3. Sees progress bar at top
4. Core fields are pre-filled (if connected)
5. Can save progress and return later
6. Gets confirmation on submission
7. Receives PDF copy via email

#### Data Handling
- All submissions stored in database
- Instant notification to supplier
- Updates to core fields sync back to WedMe
- PDFs generated automatically
- Integration with Customer Journey automation

### 5. Form Analytics

#### Tracking Metrics
- View count
- Start rate
- Completion rate
- Average time to complete
- Field drop-off points
- Device type (mobile/desktop)

#### Visual Dashboard
- Graph showing submissions over time
- Funnel visualization of completion
- Heat map of field interactions
- A/B test results (if enabled)

## AI-Powered Features

### 1. Form Generation from Description
**Input**: "I need a form for couples to provide their timeline and family photo requirements"
**Output**: Complete form with relevant fields, sections, and logic

### 2. Import from Existing Forms
**Supported Formats**:
- PDF upload → AI extracts fields
- Image upload → OCR + field detection
- Word document → Parse and convert
- URL scraping → Extract form structure

### 3. Smart Field Suggestions
- AI suggests next logical field based on context
- Recommends field types based on labels
- Suggests validation rules

## Conditional Logic System

### Logic Builder Interface
- Visual "if-then" rules creator
- Drag conditions and actions
- Multiple conditions with AND/OR operators
- Actions: Show/Hide fields, Skip to section, Calculate values

### Common Wedding Logic Examples
- If ceremony type is "outdoor" → Show weather backup plan field
- If guest count > 150 → Show additional coordinator field
- If venue is "church" → Show specific ceremony restrictions
- If dietary requirements selected → Show detailed options

## Multi-Page Forms

### Page Management
- Add/remove/reorder pages
- Progress indicator customization
- Save progress between pages
- Conditional page display
- Review page before submission

## Form Sharing & Embedding

### Sharing Options
- Unique URL per form
- QR code generation
- Email invitation system
- Embed code for websites
- Social media sharing buttons

### Access Control
- Password protection option
- Expiry dates
- Maximum submission limits
- Geographic restrictions
- Connected couples only option

## Response Management

### Response Dashboard
- Table view of all submissions
- Filter by date, status, completion
- Export to CSV/Excel
- Bulk actions (mark read, archive, delete)
- Quick preview without opening

### Individual Response View
- See all submitted data
- Download attached files
- Add internal notes
- Send follow-up message
- Create task from response
- Print formatted version

## Mobile Optimization

### Mobile Form Builder
- Simplified interface for tablets
- Field property editing
- Preview on device
- Basic drag-drop support

### Mobile Form Completion
- Touch-optimized fields
- Auto-save every field
- Offline mode with sync
- Camera integration for uploads
- Signature capture support

## Integration Points

### Customer Journey Builder
- Forms can trigger journey stages
- Form completion moves couple through workflow
- Conditional journeys based on form responses

### Email System
- Automated confirmation emails
- Reminder sequences for incomplete forms
- Form links in email templates

### Calendar System
- Meeting request forms
- Available date selection
- Automatic calendar blocking

## Performance Requirements

### Speed Targets
- Form loads in < 2 seconds
- Field interactions < 100ms response
- Auto-save every 30 seconds
- Submission processing < 3 seconds

### Capacity Targets
- Support forms with 200+ fields
- Handle 1000+ concurrent submissions
- Store 10,000+ responses per supplier

## Security & Privacy

### Data Protection
- All form data encrypted at rest
- SSL/TLS for data transmission
- GDPR compliance tools
- Data retention settings
- Right to deletion support

### Spam Prevention
- CAPTCHA integration option
- Honeypot fields
- Rate limiting
- IP blocking
- Email verification

## Testing Checklist for Claude Code

1. Create a basic contact form with 5 fields
2. Add conditional logic to show/hide fields
3. Link form to core fields and verify auto-population
4. Test form on mobile device
5. Submit form and verify data storage
6. Check email notifications work
7. Export responses to CSV
8. Create multi-page form with progress bar
9. Test save and resume functionality
10. Verify analytics tracking is accurate

## Common Issues to Prevent

1. Don't allow form deletion if has responses (archive instead)
2. Validate email fields properly (use standard regex)
3. Prevent duplicate submissions (use session tokens)
4. Handle file upload size limits gracefully
5. Show clear error messages for validation failures
6. Auto-save form builder work to prevent loss
7. Test timezone handling for date/time fields
8. Ensure accessibility standards are met

## Priority Implementation Order

1. **Phase 1**: Basic form builder with core field types
2. **Phase 2**: Core fields integration and auto-population
3. **Phase 3**: Conditional logic and multi-page support
4. **Phase 4**: AI form generation and import features
5. **Phase 5**: Analytics and A/B testing
6. **Phase 6**: Marketplace integration