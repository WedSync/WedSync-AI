# TEAM A - BATCH 13: WS-151 - Guest List Builder

## ASSIGNMENT DATE: 2025-01-20

### TEAM A RESPONSIBILITIES
**Focus Areas**: Interactive UI Components, Drag-and-Drop, Real-time Updates

#### TASKS ASSIGNED TO TEAM A:
1. **Guest List Builder Component** (`/src/components/guests/GuestListBuilder.tsx`)
   - Drag-and-drop functionality between categories (family/friends/work/other)
   - Real-time guest count summaries (adults/children/infants/total)
   - Bulk selection and operations
   - Visual household grouping

2. **Guest Importer Interface** (`/src/components/guests/GuestImporter.tsx`)
   - CSV/Excel drag-and-drop upload
   - Smart field mapping interface
   - Data preview and validation
   - Duplicate detection UI

3. **Quick Add Guest Form** (`/src/components/guests/QuickAddGuest.tsx`)
   - Natural language input parsing
   - Auto-complete for existing households
   - Real-time validation feedback
   - Category assignment UI

#### TECHNICAL REQUIREMENTS:
- Use `@hello-pangea/dnd` for drag-and-drop functionality
- Implement React Hook Form for form management
- File upload with drag-and-drop using `react-dropzone`
- Real-time guest counts calculation
- Responsive design for mobile guest list management

#### INTEGRATION POINTS:
- Connect to guest management APIs (`/api/guests/*`)
- Household service integration
- CSV parsing service (`papaparse` library)
- Real-time updates via optimistic UI patterns

#### ESTIMATED EFFORT: 16 hours
**Due Date**: End of sprint (2025-02-03)

---

### DEPENDENCIES:
- Team B provides guest management APIs
- Team D creates database schema for guests/households
- Coordinate with WS-152 (dietary requirements) for data structure

### SUCCESS CRITERIA:
- [ ] Drag-and-drop works smoothly between categories
- [ ] CSV import handles 500+ guests without performance issues
- [ ] Quick add parses natural language correctly
- [ ] Guest counts update in real-time
- [ ] Mobile interface is fully functional

### NOTES:
This is a **foundational feature** for wedding planning - focus on intuitive UX and performance. Guest lists can grow to 300-500 people, so optimize for scale.