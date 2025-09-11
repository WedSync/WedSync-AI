# TEAM A - ROUND 1: WS-321 - Guest Management Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive React UI components for wedding guest management with TypeScript and advanced RSVP tracking
**FEATURE ID:** WS-321 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about managing 150+ wedding guests with complex RSVP tracking, dietary requirements, and seating arrangements

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/(wedme)/guest-management/
cat $WS_ROOT/wedsync/src/app/(wedme)/guest-management/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **GUEST FORM VALIDATION TEST:**
```bash
npm test guest-management
# MUST show: "All guest validation tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing guest management and RSVP patterns
await mcp__serena__search_for_pattern("guest|rsvp|invitation|seating");
await mcp__serena__find_symbol("GuestManager", "", true);
await mcp__serena__get_symbols_overview("src/components/guest-management");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY)
```typescript
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **React Hook Form 7.62.0**: Form management
- **Zod 4.0.17**: Validation schemas
- **@dnd-kit**: Drag-and-drop for seating arrangements

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
ref_search_documentation("React Hook Form Zod validation guest management RSVP");
ref_search_documentation("drag drop seating chart dnd-kit table assignments");
ref_search_documentation("CSV import export guest lists wedding planning");
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript (strict mode)
- Responsive guest management interface (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components only
- Advanced guest list with filtering, sorting, and search
- RSVP tracking with real-time status updates
- Interactive seating chart with drag-and-drop functionality
- Dietary requirements and allergies management
- Guest communication tools and messaging

## 📋 TECHNICAL SPECIFICATION

**Based on:** WS-321-guest-management-section-overview-technical.md

**Core Requirements:**
- Guest list management with import/export capabilities
- RSVP collection and tracking system
- Dietary requirements and allergies tracking
- Plus-one management and invitation system
- Guest grouping and categorization features
- Interactive seating chart creation
- Guest communication and messaging tools

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY GUEST COMPONENTS:
- [ ] **GuestListManager.tsx** - Main guest management interface
- [ ] **GuestInvitationForm.tsx** - Add/edit guest invitation details
- [ ] **RSVPTrackingDashboard.tsx** - Real-time RSVP status overview
- [ ] **GuestImportExport.tsx** - CSV import/export functionality
- [ ] **GuestSearchAndFilter.tsx** - Advanced guest filtering and search
- [ ] **DietaryRequirementsForm.tsx** - Dietary needs and allergies tracking
- [ ] **PlusOneManager.tsx** - Plus-one invitation and management

### SEATING MANAGEMENT:
- [ ] **InteractiveSeatingChart.tsx** - Drag-and-drop seating arrangement
- [ ] **TableManagement.tsx** - Wedding table creation and configuration
- [ ] **SeatingRulesEngine.tsx** - Automated seating suggestions
- [ ] **SeatingConflictResolver.tsx** - Handle seating conflicts and preferences

### COMMUNICATION COMPONENTS:
- [ ] **GuestCommunicationHub.tsx** - Centralized guest messaging
- [ ] **InvitationDesigner.tsx** - Custom invitation creation
- [ ] **RSVPReminderSystem.tsx** - Automated RSVP reminder management
- [ ] **GuestNotificationCenter.tsx** - Guest update notifications

### ADVANCED FEATURES:
- [ ] **GuestAnalyticsDashboard.tsx** - Guest statistics and insights
- [ ] **WeddingPartyManager.tsx** - Special roles and responsibilities
- [ ] **GuestAccessibilityPlanner.tsx** - Accessibility needs planning
- [ ] **GuestPhotoManager.tsx** - Guest photos and identification

## 💾 WHERE TO SAVE YOUR WORK
- **WedMe Pages:** $WS_ROOT/wedsync/src/app/(wedme)/guest-management/
- **Guest Components:** $WS_ROOT/wedsync/src/components/guest-management/
- **Validation:** $WS_ROOT/wedsync/src/lib/validation/guest-management.ts
- **Types:** $WS_ROOT/wedsync/src/types/guest-management.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/components/guest-management/

## 🎨 GUEST MANAGEMENT DESIGN REQUIREMENTS

**Interface Layout Structure:**
- Header: Guest count summary and RSVP status overview
- Main: Tabbed interface (Guest List, Seating Chart, Communications)
- Sidebar: Quick filters, guest groups, and recent activity
- Footer: Import/export actions and help links

**Guest List View:**
1. Search and filter bar with advanced options
2. Guest cards with photo, RSVP status, dietary needs
3. Bulk action toolbar for invitations and messages
4. Pagination for large guest lists (150+ guests)

**Seating Chart View:**
1. Drag-and-drop interface for table assignments
2. Visual table layouts with guest capacity
3. Conflict detection and resolution tools
4. Real-time seating statistics and optimization

**Responsive Behavior:**
- Mobile: Single-column guest cards with swipe actions
- Tablet: Two-column layout with collapsible sidebar
- Desktop: Full dashboard with live seating preview

## 🌟 WEDDING-SPECIFIC UX FEATURES

### Emotional Design Elements:
- **RSVP Celebration** - Animation when guests confirm attendance
- **Seating Success** - Celebrate when seating chart is complete
- **Guest Milestone** - Progress indicators for invitation milestones
- **Family Connection** - Visual family grouping and relationships

### Wedding Context Integration:
- Show days until RSVP deadline throughout interface
- Highlight dietary requirements that affect catering
- Display seating arrangement impact on venue layout
- Provide guest count updates for vendor coordination

## 🎯 GUEST MANAGEMENT FORM COMPONENTS

### 1. GUEST INVITATION FORM
```typescript
// Comprehensive guest invitation form
export const GuestInvitationForm: React.FC<{
  guest?: Guest;
  onSave: (guest: Guest) => void;
  onCancel: () => void;
}> = ({ guest, onSave, onCancel }) => {
  // 1. Personal information fields (name, email, phone, address)
  // 2. RSVP preferences and invitation method selection
  // 3. Dietary requirements and allergies tracking
  // 4. Plus-one allowance and relationship details
  // 5. Guest group assignment and relationship mapping
  // 6. Special notes and accessibility requirements
  // 7. Real-time validation with instant feedback
  // 8. Photo upload for guest identification
}
```

### 2. RSVP TRACKING DASHBOARD
```typescript
// Real-time RSVP status tracking
export const RSVPTrackingDashboard: React.FC<{
  guests: Guest[];
  weddingDate: Date;
}> = ({ guests, weddingDate }) => {
  // 1. Visual RSVP status overview with progress rings
  // 2. Confirmed/Pending/Declined guest counts
  // 3. Dietary requirements summary for catering
  // 4. Plus-one tracking and confirmation status
  // 5. RSVP deadline countdown and reminder system
  // 6. Guest response timeline and activity feed
  // 7. Export functionality for vendor sharing
}
```

### 3. INTERACTIVE SEATING CHART
```typescript
// Drag-and-drop seating arrangement
export const InteractiveSeatingChart: React.FC<{
  guests: Guest[];
  tables: Table[];
  venue: VenueLayout;
}> = ({ guests, tables, venue }) => {
  // 1. Visual venue layout with draggable tables
  // 2. Guest cards that can be dropped onto table seats
  // 3. Real-time capacity validation and conflict detection
  // 4. Family and friend grouping suggestions
  // 5. Accessibility seating requirement handling
  // 6. Table assignment optimization recommendations
  // 7. Export seating chart for venue coordination
}
```

## 🔧 VALIDATION AND FORM LOGIC

### Guest Validation Schema
```typescript
// Zod validation for guest management
export const GuestInvitationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Valid email address required").optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Valid phone number required").optional(),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'no_response']),
  dietaryRequirements: z.array(z.string()).default([]),
  plusOneAllowed: z.boolean().default(false),
  plusOneName: z.string().optional(),
  guestGroup: z.string().min(1, "Guest group is required"),
  tableAssignment: z.number().optional(),
  accessibilityNeeds: z.string().optional(),
  specialNotes: z.string().optional(),
});

export type GuestInvitation = z.infer<typeof GuestInvitationSchema>;
```

### RSVP Status Management
```typescript
// RSVP status tracking and updates
export const useRSVPTracking = (coupleId: string) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rsvpStats, setRsvpStats] = useState<RSVPStatistics>();
  
  const updateRSVPStatus = useCallback(async (guestId: string, status: RSVPStatus) => {
    // 1. Update guest RSVP status in database
    // 2. Recalculate RSVP statistics and counts
    // 3. Update catering numbers and dietary requirements
    // 4. Notify venue of capacity changes
    // 5. Send confirmation to guest and couple
  }, [coupleId]);
  
  return { guests, rsvpStats, updateRSVPStatus };
};
```

## 🎨 GUEST MANAGEMENT UI PATTERNS

### Guest List Card Component
```typescript
// Reusable guest card component
export const GuestCard: React.FC<{
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guestId: string) => void;
  onRSVPUpdate: (guestId: string, status: RSVPStatus) => void;
}> = ({ guest, onEdit, onDelete, onRSVPUpdate }) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        {/* Guest avatar or photo */}
        <Avatar className="h-12 w-12">
          <AvatarImage src={guest.photoUrl} alt={guest.fullName} />
          <AvatarFallback>{guest.initials}</AvatarFallback>
        </Avatar>
        
        {/* Guest information */}
        <div className="flex-1">
          <h3 className="font-semibold">{guest.fullName}</h3>
          <p className="text-sm text-gray-600">{guest.email}</p>
          {guest.plusOneAllowed && (
            <p className="text-xs text-blue-600">Plus-one invited</p>
          )}
        </div>
        
        {/* RSVP status badge */}
        <RSVPStatusBadge status={guest.rsvpStatus} />
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(guest)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(guest.id)}>
            Remove
          </Button>
        </div>
      </div>
      
      {/* Dietary requirements display */}
      {guest.dietaryRequirements.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex flex-wrap gap-1">
            {guest.dietaryRequirements.map((requirement) => (
              <Badge key={requirement} variant="secondary" className="text-xs">
                {requirement}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
```

### Seating Table Component
```typescript
// Interactive table component for seating chart
export const SeatingTable: React.FC<{
  table: Table;
  guests: Guest[];
  onGuestDrop: (guestId: string, tableId: string, seatNumber: number) => void;
}> = ({ table, guests, onGuestDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-full border-2 ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      style={{
        width: table.size === 'round' ? '120px' : '160px',
        height: table.size === 'round' ? '120px' : '80px',
      }}
    >
      {/* Table number */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <span className="font-bold text-lg">Table {table.number}</span>
        <span className="block text-sm text-gray-600">
          {table.assignedGuests.length}/{table.capacity}
        </span>
      </div>
      
      {/* Seat positions around table */}
      {Array.from({ length: table.capacity }, (_, index) => {
        const angle = (index / table.capacity) * 2 * Math.PI - Math.PI / 2;
        const radius = table.size === 'round' ? 45 : 35;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        const assignedGuest = table.assignedGuests.find(g => g.seatNumber === index + 1);
        
        return (
          <div
            key={index}
            className="absolute w-8 h-8 bg-white border rounded-full flex items-center justify-center text-xs transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
          >
            {assignedGuest ? assignedGuest.guest.initials : index + 1}
          </div>
        );
      })}
    </div>
  );
};
```

## 🏁 COMPLETION CHECKLIST
- [ ] All 15 guest management components created and functional
- [ ] Comprehensive Zod validation schemas implemented
- [ ] Real-time RSVP tracking with live updates
- [ ] Interactive seating chart with drag-and-drop functionality
- [ ] Guest import/export system with CSV support
- [ ] Advanced filtering and search capabilities
- [ ] Dietary requirements and allergies management
- [ ] Plus-one invitation and tracking system
- [ ] Responsive design tested on all breakpoints
- [ ] Accessibility compliance verified (screen readers, keyboard navigation)
- [ ] TypeScript compilation successful with no errors
- [ ] Guest communication tools and invitation management
- [ ] Evidence package prepared with guest management demos

---

**EXECUTE IMMEDIATELY - Build the comprehensive guest management system that handles 150+ wedding guests with precision and care!**