# TEAM A - ROUND 1: WS-272 - RSVP System Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI for RSVP management including couple dashboard, public RSVP forms, analytics visualizations, and supplier notification interfaces
**FEATURE ID:** WS-272 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile-first RSVP forms, real-time analytics, guest lookup UX, and wedding-specific user experience

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/rsvp/
cat $WS_ROOT/wedsync/src/components/rsvp/RSVPDashboard.tsx | head -20
cat $WS_ROOT/wedsync/src/components/rsvp/PublicRSVPForm.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test rsvp-components
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing guest management and form patterns
await mcp__serena__search_for_pattern("guest.*component|form.*builder|dashboard.*component");
await mcp__serena__find_symbol("GuestManager", "", true);
await mcp__serena__get_symbols_overview("src/components/guests");
await mcp__serena__get_symbols_overview("src/components/forms");
```

### B. WEDDING UI PATTERNS (MANDATORY FOR FRONTEND)
```typescript
// CRITICAL: Load existing wedding UI patterns and form components
await mcp__serena__search_for_pattern("wedding.*component|couple.*dashboard|mobile.*responsive");
await mcp__serena__find_symbol("WeddingDashboard", "", true);
await mcp__serena__search_for_pattern("card.*component|metric.*component|analytics.*component");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for React 19, form handling, and real-time components
await mcp__Ref__ref_search_documentation("React 19 form components hooks validation");
await mcp__Ref__ref_search_documentation("Next.js 15 public pages mobile optimization");
await mcp__Ref__ref_search_documentation("TypeScript form validation React Hook Form");
await mcp__Ref__ref_search_documentation("responsive design mobile first forms");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX RSVP UI SYSTEM

### Use Sequential Thinking MCP for Complex RSVP Frontend Analysis
```typescript
// Use for complex RSVP UI system architecture decisions
mcp__sequential-thinking__sequentialthinking({
  thought: "This RSVP system requires sophisticated frontend architecture: 1) Couple dashboard with real-time analytics and guest response management, 2) Mobile-optimized public RSVP forms for wedding guests with intelligent guest lookup, 3) Supplier notification interface for headcount updates, 4) Real-time updates using Supabase realtime for response tracking, 5) Advanced analytics with charts for response rates and dietary requirements. The main challenges are: Mobile-first responsive design for guests RSVPing on phones, real-time UI updates for couple dashboard, guest name matching interface, complex form validation for meal/dietary preferences, and wedding-specific UX patterns. I need to ensure seamless mobile experience, real-time data visualization, intuitive guest lookup flow, and comprehensive couple management interface.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down RSVP UI components, track real-time feature dependencies
2. **react-ui-specialist** - Use Serena for React 19 form patterns and responsive components  
3. **ui-ux-designer** - Mobile-first RSVP form design and wedding dashboard UX
4. **nextjs-fullstack-developer** - Public page optimization and mobile performance
5. **test-automation-architect** - Component testing with mobile viewport validation
6. **documentation-chronicler** - Evidence-based UI documentation with mobile screenshots

## 🔒 SECURITY REQUIREMENTS FOR RSVP UI (NON-NEGOTIABLE!)

### RSVP FRONTEND SECURITY CHECKLIST:
- [ ] **Form Validation** - Client-side validation with server-side verification
- [ ] **Input Sanitization** - Sanitize all guest name and message inputs
- [ ] **Rate Limiting UI** - Display proper rate limit messages and cooldowns
- [ ] **Guest Lookup Security** - Secure token handling for guest pre-population
- [ ] **CSRF Protection** - Proper CSRF tokens on all public RSVP forms
- [ ] **XSS Prevention** - Escape all user-generated content display
- [ ] **Mobile Security** - Secure mobile form handling and validation
- [ ] **Public Form Security** - No sensitive data exposure on public pages
- [ ] **Session Validation** - Proper authentication checks for couple dashboard
- [ ] **Real-time Security** - Secure WebSocket connections for live updates

### Wedding-Specific Security:
- [ ] **Guest Privacy** - Protect guest information from unauthorized access
- [ ] **Response Privacy** - Secure individual RSVP response data
- [ ] **Supplier Data Protection** - Secure headcount sharing with vendors
- [ ] **Wedding Day Protection** - No disruption to RSVP system on wedding days

## 🧭 WEDDING COORDINATION REQUIREMENTS (MANDATORY FOR WEDDING FEATURES)

**❌ FORBIDDEN: Creating generic event management UI without wedding context**
**✅ MANDATORY: RSVP UI must seamlessly integrate with wedding coordination workflow**

### WEDDING COORDINATION CHECKLIST
- [ ] RSVP dashboard integrated with couple's wedding planning timeline
- [ ] Guest meal preferences connected to catering coordination
- [ ] Dietary requirements immediately available for vendor planning
- [ ] Response tracking linked to wedding day logistics
- [ ] Real-time headcount updates for venue capacity planning
- [ ] RSVP deadline integration with wedding timeline
- [ ] Guest communication integrated with wedding website

### Required Wedding RSVP Features:
```tsx
// Wedding-specific RSVP components to build
- RSVPWeddingDashboard: Couple's comprehensive RSVP management
- PublicWeddingRSVPForm: Mobile-optimized guest response form
- WeddingGuestLookup: Intelligent guest matching interface
- RSVPAnalyticsDashboard: Wedding-specific response analytics
- SupplierHeadcountNotification: Vendor notification interface
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- Mobile-first responsive design for wedding guest RSVP experience
- Real-time dashboard components for couple RSVP management
- Wedding-themed UI components and user experience design
- Advanced form handling with guest lookup and validation
- Analytics visualization for wedding planning insights
- Supplier notification interface design

### RSVP-Specific Frontend Requirements:
- **Mobile RSVP Forms**: Thumb-friendly design for wedding guests on phones
- **Real-time Updates**: Live dashboard updates as responses arrive
- **Guest Lookup UI**: Intelligent name matching with helpful suggestions
- **Wedding Analytics**: Charts and metrics for wedding planning decisions
- **Responsive Design**: Perfect experience across all device sizes
- **Wedding Themes**: UI that feels appropriate for wedding celebrations

## 📋 TECHNICAL SPECIFICATION ANALYSIS

### Core RSVP UI Components to Build:

1. **RSVPDashboard (Couple View)**:
   - Real-time response metrics cards
   - Guest response management table
   - RSVP configuration settings
   - Analytics charts and visualizations

2. **PublicRSVPForm (Guest View)**:
   - Mobile-optimized multi-step form
   - Guest lookup and pre-population
   - Meal preference selection
   - Dietary requirements collection

3. **RSVPAnalytics (Couple View)**:
   - Response timeline charts
   - Meal preference breakdowns
   - Dietary requirements summary
   - Projected final headcount display

4. **SupplierRSVPInterface (Supplier View)**:
   - Current headcount display
   - Dietary requirements overview
   - Notification acknowledgment
   - Final count confirmation

5. **RSVPConfiguration (Couple Settings)**:
   - RSVP deadline management
   - Form customization options
   - Reminder schedule settings
   - Collection preferences

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY RSVP COMPONENTS (MUST COMPLETE):
- [ ] **RSVPDashboard.tsx** - Comprehensive couple RSVP management interface
- [ ] **PublicRSVPForm.tsx** - Mobile-optimized guest RSVP form
- [ ] **RSVPAnalyticsDashboard.tsx** - Real-time response analytics and charts
- [ ] **GuestLookupInterface.tsx** - Intelligent guest matching component

### SUPPORTING UI COMPONENTS:
- [ ] **RSVPMetricsCards.tsx** - Response rate and attendance metrics
- [ ] **RSVPResponseTable.tsx** - Guest response management table
- [ ] **RSVPConfigurationPanel.tsx** - RSVP settings and preferences
- [ ] **MobilRSVPStepper.tsx** - Multi-step mobile form navigation

### FORM & INTERACTION COMPONENTS:
- [ ] **RSVPFormValidation.tsx** - Comprehensive form validation
- [ ] **GuestNameMatcher.tsx** - Smart guest lookup and suggestions
- [ ] **MealPreferenceSelector.tsx** - Wedding meal choice interface
- [ ] **DietaryRequirementsInput.tsx** - Dietary restrictions collection

### ANALYTICS & VISUALIZATION:
- [ ] **RSVPTimelineChart.tsx** - Response timeline visualization
- [ ] **MealPreferenceChart.tsx** - Catering preference breakdown
- [ ] **ResponseRateIndicator.tsx** - Real-time response progress
- [ ] **HeadcountProjection.tsx** - Final attendance prediction

### MOBILE OPTIMIZATION:
- [ ] Mobile-first responsive design for all components
- [ ] Touch-friendly interface elements (48x48px minimum)
- [ ] Optimized loading states for mobile connections
- [ ] Progressive enhancement for offline functionality

## 🧪 TESTING REQUIREMENTS FOR RSVP UI

### Component Tests (Required):
```typescript
// RSVPDashboard.test.tsx
describe('RSVPDashboard', () => {
  it('should display real-time response metrics', async () => {
    const mockRSVPData = {
      total_invited: 100,
      total_responded: 75,
      attending_count: 65,
      response_rate: 75.0
    };

    render(<RSVPDashboard rsvpData={mockRSVPData} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('65 attending')).toBeInTheDocument();
    expect(screen.getByText('75 of 100 responded')).toBeInTheDocument();
  });

  it('should update metrics in real-time', async () => {
    const { rerender } = render(<RSVPDashboard rsvpData={initialData} />);
    
    const updatedData = { ...initialData, total_responded: 76 };
    rerender(<RSVPDashboard rsvpData={updatedData} />);
    
    expect(screen.getByText('76 of 100 responded')).toBeInTheDocument();
  });
});

// PublicRSVPForm.test.tsx
describe('PublicRSVPForm', () => {
  it('should handle guest lookup flow', async () => {
    render(<PublicRSVPForm websiteId="test-website" />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name as it appears on the invitation');
    await userEvent.type(nameInput, 'John Smith');
    
    const continueButton = screen.getByText('Continue');
    await userEvent.click(continueButton);
    
    expect(screen.getByText('Hi John Smith!')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<PublicRSVPForm websiteId="test-website" />);
    
    const submitButton = screen.getByText('Submit RSVP');
    await userEvent.click(submitButton);
    
    expect(screen.getByText('Please select your attendance status')).toBeInTheDocument();
  });

  it('should handle meal preferences correctly', async () => {
    render(<PublicRSVPForm websiteId="test-website" guestData={mockGuest} />);
    
    await userEvent.click(screen.getByLabelText('Joyfully Accept'));
    
    const mealSelect = screen.getByLabelText('Meal Preference');
    await userEvent.selectOptions(mealSelect, 'vegetarian');
    
    expect(screen.getByDisplayValue('vegetarian')).toBeInTheDocument();
  });
});
```

### Mobile Responsive Tests:
```typescript
// Mobile viewport testing
describe('Mobile RSVP Experience', () => {
  beforeEach(() => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });
  });

  it('should display mobile-optimized RSVP form', () => {
    render(<PublicRSVPForm websiteId="test" />);
    
    const formContainer = screen.getByTestId('rsvp-form');
    expect(formContainer).toHaveClass('mobile-responsive');
    
    // Check touch target sizes
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
    });
  });

  it('should handle mobile keyboard interactions', async () => {
    render(<PublicRSVPForm websiteId="test" />);
    
    const nameInput = screen.getByLabelText('Your Name');
    await userEvent.type(nameInput, 'Test Guest');
    
    // Simulate mobile keyboard submit
    fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });
    
    expect(screen.getByDisplayValue('Test Guest')).toBeInTheDocument();
  });
});
```

### Real-time Updates Testing:
```typescript
// Real-time functionality testing
describe('RSVP Real-time Updates', () => {
  it('should update dashboard when new RSVP received', async () => {
    const mockSupabase = createMockSupabaseClient();
    
    render(<RSVPDashboard supabase={mockSupabase} />);
    
    // Simulate real-time update
    act(() => {
      mockSupabase.channel().trigger('INSERT', {
        new: { attending_status: 'yes', guest_count: 2 }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('New response received')).toBeInTheDocument();
    });
  });

  it('should show loading states during updates', async () => {
    render(<RSVPDashboard />);
    
    const refreshButton = screen.getByText('Refresh');
    await userEvent.click(refreshButton);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });
});
```

## 💾 WHERE TO SAVE YOUR WORK

### RSVP Component Structure:
```
$WS_ROOT/wedsync/src/components/rsvp/
├── dashboard/
│   ├── RSVPDashboard.tsx                # Main couple RSVP management
│   ├── RSVPMetricsCards.tsx            # Response metrics display
│   ├── RSVPResponseTable.tsx           # Guest response management
│   └── RSVPConfigurationPanel.tsx      # RSVP settings interface
├── public/
│   ├── PublicRSVPForm.tsx              # Guest-facing RSVP form
│   ├── GuestLookupInterface.tsx        # Guest matching UI
│   ├── MobilRSVPStepper.tsx           # Mobile form navigation
│   └── RSVPConfirmation.tsx            # Response confirmation
├── analytics/
│   ├── RSVPAnalyticsDashboard.tsx      # Analytics overview
│   ├── RSVPTimelineChart.tsx           # Response timeline
│   ├── MealPreferenceChart.tsx         # Catering breakdown
│   └── HeadcountProjection.tsx         # Attendance projection
├── forms/
│   ├── RSVPFormValidation.tsx          # Form validation logic
│   ├── MealPreferenceSelector.tsx      # Meal choice interface
│   ├── DietaryRequirementsInput.tsx    # Dietary restrictions
│   └── GuestNameMatcher.tsx            # Name matching component
└── supplier/
    ├── SupplierRSVPInterface.tsx       # Supplier headcount view
    ├── HeadcountNotification.tsx       # Count change alerts
    └── DietaryRequirements.tsx         # Vendor dietary info
```

### RSVP Hooks:
```
$WS_ROOT/wedsync/src/hooks/rsvp/
├── useRSVPDashboard.ts                 # RSVP dashboard state
├── usePublicRSVPForm.ts                # Guest form handling
├── useGuestLookup.ts                   # Guest matching logic
├── useRSVPAnalytics.ts                 # Analytics calculations
├── useRealtimeRSVP.ts                  # Real-time updates
└── useSupplierNotifications.ts         # Supplier update hooks
```

### RSVP Styles:
```
$WS_ROOT/wedsync/src/styles/rsvp/
├── rsvp-dashboard.module.css           # Dashboard styling
├── public-form.module.css              # Guest form styling
├── mobile-responsive.module.css        # Mobile optimizations
└── wedding-theme.module.css            # Wedding-specific styling
```

## 🏁 COMPLETION CHECKLIST

### MANDATORY RSVP UI REQUIREMENTS:
- [ ] RSVP dashboard shows real-time response metrics and guest management
- [ ] Public RSVP form works perfectly on mobile devices (iOS Safari, Android Chrome)
- [ ] Guest lookup intelligently matches existing guests with fuzzy name matching
- [ ] Mobile-first responsive design with touch-friendly controls (48x48px minimum)
- [ ] Real-time updates using Supabase realtime for live response tracking
- [ ] Form validation provides clear, helpful error messages for all scenarios
- [ ] RSVP analytics display response timeline, meal preferences, dietary requirements
- [ ] Supplier interface shows current headcount and dietary requirement summaries
- [ ] Wedding-themed UI design appropriate for celebration context
- [ ] TypeScript compilation successful with no 'any' types

### WEDDING CONTEXT VALIDATION:
- [ ] RSVP dashboard specifically designed for wedding couple workflow
- [ ] Guest RSVP form optimized for wedding celebration context
- [ ] Meal preference selection designed for wedding catering coordination
- [ ] Dietary requirements collection formatted for vendor planning
- [ ] Analytics focused on wedding planning insights and decision-making
- [ ] Supplier notifications designed for wedding vendor coordination

### MOBILE & RESPONSIVE EXPERIENCE:
- [ ] RSVP form loads in under 2 seconds on mobile 3G connections
- [ ] Touch targets meet accessibility standards (minimum 44x44px)
- [ ] Forms work seamlessly in portrait and landscape orientations
- [ ] Guest lookup and form completion possible with thumbs only
- [ ] Loading states provide clear feedback on mobile connections
- [ ] Error messages are clearly visible on small screens

### EVIDENCE PACKAGE:
- [ ] Component testing results showing 95%+ test coverage
- [ ] Mobile responsive testing screenshots (iPhone SE, Android)
- [ ] Real-time functionality demonstration with live updates
- [ ] Guest lookup accuracy testing with various name variations
- [ ] Form validation testing covering all edge cases
- [ ] Performance metrics showing sub-2s load times on mobile
- [ ] Wedding-specific UX validation with couple workflow integration

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all RSVP UI requirements!**

**SUCCESS CRITERIA:** You will have created a complete mobile-first RSVP system UI that allows wedding couples to manage guest responses in real-time, enables guests to easily RSVP on their phones with intelligent guest lookup, provides comprehensive analytics for wedding planning, and seamlessly coordinates with suppliers for headcount and dietary requirement management - all with a wedding-appropriate user experience that reduces coordination effort for couples and vendors.