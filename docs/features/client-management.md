Overview
The client management system is the central hub where suppliers organize and interact with all their wedding clients. Think of it as your digital client book that tracks every couple, their wedding details, and all interactions in one place.
Core Components
1. Client Database Structure
Database Tables Required
clients table:
- id (unique identifier)
- supplier_id (links to your account)
- couple_names (both partners' names)
- partner1_email
- partner1_phone
- partner2_email
- partner2_phone
- wedding_date
- venue_name
- venue_address
- guest_count
- ceremony_time
- reception_time
- package_name (your service package)
- service_notes
- wedme_connected (true/false)
- created_at (when added)
- updated_at (last modified)
- imported_from (csv/manual/api)
- photo_url (couple's photo)
Related Tables
client_tags:
- Links clients to searchable tags
- Examples: "2025", "summer", "vip", "venue-name"

client_notes:
- Private notes only you can see
- Timestamped entries
- Never visible to clients

client_activities:
- Tracks all interactions
- Email opens, form completions, etc.
2. Client Import System
Import Methods to Build
CSV/Excel Import
Sub-agent tasks:
1. Create drag-drop upload zone
2. Parse CSV headers automatically
3. Map fields using AI (OpenAI API)
4. Show preview of first 10 rows
5. Detect duplicates by email/name/date
6. Handle bulk import (up to 1000 rows)
Manual Entry Form
Fields needed:
- Couple names (required)
- Email addresses
- Phone numbers
- Wedding date
- Venue (with autocomplete)
- Guest count
- Service package
- Notes
CRM Integrations (Phase 2)
Priority integrations:
1. HoneyBook (OAuth connection)
2. Dubsado (API key)
3. Studio Ninja (wedding specific)
4. 17hats (small business)
3. Client List Views
List View Components
Each row shows:
- Couple photo (if uploaded)
- Names (clickable to profile)
- Wedding date
- Venue
- Status indicator:
  - 🟢 Connected to WedMe
  - 🟡 Partially connected
  - ⚪ Not connected
- Last activity timestamp
- Quick action buttons:
  - View profile
  - Edit details
  - Send message
  - More options menu
Grid View (Visual)
Card layout showing:
- Couple photo prominently
- Names and date
- Venue
- Status badges
- Tags
Filtering System
Filter by:
- Year (2024, 2025, 2026)
- Season (Spring, Summer, Fall, Winter)
- Status (Active, Upcoming, Past)
- Connection (Connected, Not connected)
- Tags (any custom tags)
- Date range
4. Individual Client Profile
Profile Sections
Header:
- Couple photo upload area
- Names (editable)
- Contact details
- WedMe connection status

Wedding Details:
- Date with countdown
- Venue information
- Guest count
- Timeline details
- Service package

Activity Timeline:
- Form submissions
- Email interactions
- Meeting bookings
- Journey progress
- Notes added

Private Notes:
- Only visible to supplier
- Timestamped entries
- Pin important notes
- Search within notes
Quick Actions
Buttons for:
- Send WedMe invitation
- Add to customer journey
- Schedule meeting
- Export client data
- Archive client
5. Bulk Operations
Bulk Actions Menu
Select multiple clients then:
- Send bulk email
- Add to journey
- Apply tags
- Export selected
- Archive/unarchive
- Send WedMe invites
Smart Segmentation
Auto-segments:
- Upcoming weddings (next 30 days)
- Missing information
- Not connected to WedMe
- High engagement
- At risk (no activity 30+ days)
6. Client Activity Tracking
Activity Types to Track
Email activities:
- Sent, opened, clicked
- Response received

Form activities:
- Started, completed
- Fields filled

Journey activities:
- Stage progression
- Module completion

Dashboard activities:
- Login frequency
- Sections viewed
Activity Dashboard
Shows:
- Recent activities (live feed)
- Engagement scores per client
- Response time averages
- Completion rates
Implementation Steps for Claude Code
Phase 1: Database Setup
1. Create all database tables in Supabase
2. Set up Row Level Security policies
3. Create indexes for search performance
4. Add foreign key relationships
Phase 2: Import System
1. Build CSV upload component
2. Add field mapping interface
3. Implement duplicate detection
4. Create import preview
5. Add error handling
Phase 3: List Views
1. Create table component with sorting
2. Add grid view option
3. Implement filtering sidebar
4. Add pagination/infinite scroll
5. Build search functionality
Phase 4: Client Profiles
1. Design profile layout
2. Add edit functionality
3. Create notes system
4. Build activity timeline
5. Add photo upload
Phase 5: Bulk Operations
1. Add checkbox selection
2. Create bulk action toolbar
3. Implement each bulk action
4. Add confirmation dialogs
5. Show progress indicators
React Component Structure
Main Components Needed
ClientDashboard/
├── ClientList.tsx (main list view)
├── ClientGrid.tsx (grid view)
├── ClientFilters.tsx (filtering sidebar)
├── ClientProfile.tsx (individual profile)
├── ClientImport.tsx (import wizard)
├── ClientNotes.tsx (notes section)
├── ClientActivity.tsx (activity feed)
└── BulkActions.tsx (bulk operations)
State Management
Use Zustand for:
- Current client list
- Selected clients
- Filter settings
- Sort preferences
- View type (list/grid)
API Endpoints Required
Client CRUD Operations
GET /api/clients - List all clients
GET /api/clients/:id - Get single client
POST /api/clients - Create client
PUT /api/clients/:id - Update client
DELETE /api/clients/:id - Delete client
Import Operations
POST /api/clients/import - Bulk import
POST /api/clients/parse-csv - Parse CSV file
GET /api/clients/check-duplicates - Check for duplicates
Activity Operations
GET /api/clients/:id/activities - Get activities
POST /api/clients/:id/notes - Add note
GET /api/clients/:id/notes - Get notes
UI/UX Requirements
Visual Design
- Clean table layout for list view
- Card-based grid for visual view
- Sticky headers when scrolling
- Loading skeletons during data fetch
- Empty states with helpful prompts
Interactions
- Click row to view profile
- Hover for quick actions
- Drag to select multiple
- Right-click context menu
- Keyboard shortcuts (Cmd+A, etc)
Mobile Responsive
- Single column on mobile
- Swipe actions for quick tasks
- Bottom sheet for filters
- Simplified profile view
- Touch-optimized buttons
Performance Considerations
Optimization Strategies
1. Virtual scrolling for large lists
2. Lazy load images
3. Debounce search input
4. Cache filter results
5. Paginate API calls (50 per page)
Data Limits
- Max 10,000 clients per supplier
- Max 500 clients per import
- Max 100 clients in bulk operation
- Search results limited to 100
Testing Requirements
Test Scenarios
1. Import 500 clients from CSV
2. Search across 1000+ clients
3. Bulk update 100 clients
4. Filter by multiple criteria
5. Handle duplicate detection
Error Handling
- Invalid CSV format
- Duplicate email addresses
- Missing required fields
- Network failures
- Rate limiting
Success Metrics
Key Performance Indicators
- Import success rate >95%
- Search response <200ms
- Profile load <1 second
- Activity tracking accuracy 99%
- Zero data loss on imports
Security Considerations
Data Protection
- All client data encrypted at rest
- Row Level Security enforced
- No cross-supplier data access
- Audit log for all changes
- GDPR compliant export/delete
Integration Points
Connects With
- Forms system (client fills forms)
- Journey builder (clients in journeys)
- Communications (email/SMS to clients)
- WedMe dashboard (client access)
- Analytics (client metrics)