# TEAM A - ROUND 1: WS-301 - Database Implementation - Couples Tables
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive React UI components for couples database management with TypeScript
**FEATURE ID:** WS-301 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding context and couples' user experience patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/couples/
cat $WS_ROOT/wedsync/src/components/couples/CoupleProfileManager.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test couples
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

// Query specific areas relevant to couples database UI
await mcp__serena__search_for_pattern("couples profile form management");
await mcp__serena__find_symbol("CoupleProfile", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Use Ref MCP to search for:
ref_search_documentation("React Hook Form couples profile validation patterns")
ref_search_documentation("Untitled UI form components advanced validation")
ref_search_documentation("Next.js app router couples data management")
ref_search_documentation("Zod schema wedding data validation")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Frontend-Specific Sequential Thinking Patterns

#### Pattern 1: Complex Couples UI Architecture Analysis
```typescript
// Before building couples database UI components
mcp__sequential-thinking__sequential_thinking({
  thought: "Couples database UI needs: partner profile management, core wedding fields auto-population forms, guest list management interface, supplier connection controls, task delegation system, timeline management, budget tracking (private), and wedding website integration. Each component has different interaction patterns and wedding-specific state management needs.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management analysis: Couple profile needs real-time partner synchronization, core wedding fields require auto-population across supplier forms, guest management needs drag-drop functionality, task delegation requires helper assignment flows. Consider using React Query for server state, local state for UI interactions.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: CoupleProfileManager (both partners), CoreWeddingFieldsForm (auto-populates everywhere), GuestListManager (RSVP tracking), SupplierConnectionHub (permissions), TaskDelegationInterface (wedding party), TimelineBuilder (ceremony/reception), BudgetTracker (private data), WeddingWebsiteSettings.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding UX considerations: Engaged couples will use this on mobile while planning, during stressful wedding preparation periods. Need emotional design - congratulatory messaging, progress celebration, helper appreciation features, graceful error handling, and mobile-first responsive design with touch optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build reusable form components with Untitled UI, create wedding-themed validation messages, implement progressive disclosure for complex forms, use Magic UI for celebration animations, ensure accessibility for older family members, optimize for 3G networks at venues.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down UI components, track dependencies with Team B
2. **react-ui-specialist** - Use Serena for component pattern consistency  
3. **security-compliance-officer** - Ensure client-side validation and XSS prevention
4. **code-quality-guardian** - Maintain Untitled UI/Magic UI standards
5. **test-automation-architect** - Component testing with Playwright visual validation
6. **documentation-chronicler** - UI component documentation with screenshots

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### CLIENT-SIDE SECURITY CHECKLIST:
- [ ] **Input sanitization** - All user inputs sanitized before display
- [ ] **XSS prevention** - HTML encode all dynamic content
- [ ] **Client-side validation** - Zod schemas for immediate feedback
- [ ] **Sensitive data handling** - Budget info never cached locally
- [ ] **File upload validation** - Image types and sizes restricted
- [ ] **Form state protection** - Clear sensitive data on unmount
- [ ] **Error boundary protection** - Graceful failure without data exposure

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All couples dashboard components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to couples dashboard
- [ ] Mobile navigation support verified  
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated for couples section
- [ ] Accessibility labels for navigation items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with comprehensive TypeScript interfaces
- Responsive UI (375px, 768px, 1920px) with mobile-first approach
- Untitled UI + Magic UI components exclusively
- Form validation and error handling with wedding context
- Accessibility compliance for all age groups
- Component performance <200ms load time
- Wedding-themed animations and micro-interactions

## 📋 TECHNICAL SPECIFICATION

**Core Components to Build:**

1. **CoupleProfileManager**
   - Partner 1 and Partner 2 information forms
   - Couple display preferences
   - Photo upload for profile/cover images
   - Contact method preferences
   - Wedding hashtag management

2. **CoreWeddingFieldsForm**
   - Wedding date picker with flexibility options
   - Ceremony/reception venue selection
   - Guest count estimator with breakdown
   - Wedding style and color scheme selector
   - Auto-completion across supplier forms

3. **GuestListManager**
   - Add/edit guest information
   - RSVP status tracking dashboard
   - Dietary requirements collection
   - Photo group organization
   - Household grouping interface
   - Helper designation controls

4. **SupplierConnectionHub**
   - Connected supplier list view
   - Permission settings per supplier
   - Service type categorization
   - Connection status indicators
   - Communication preferences

5. **TaskDelegationInterface**
   - Create and assign wedding tasks
   - Helper role management
   - Task category organization
   - Timeline integration
   - Progress tracking visualization

6. **BudgetTracker** (Private UI)
   - Budget category management
   - Expense tracking forms
   - Payment calendar visualization
   - Priority setting interface
   - Private data security indicators

7. **WeddingWebsiteSettings**
   - Public information controls
   - Privacy settings management
   - Content synchronization options
   - Guest access management

## 🎨 UI IMPLEMENTATION RULES (WITH SERENA VALIDATION)

**MANDATORY PATTERNS:**
```typescript
// Use existing component patterns found by Serena
import { Button, Card, Form, Input } from '@/components/ui';
import { WeddingTheme } from '@/components/wedding/theme';
import { MagicMotion } from '@/components/ui/magic';

// Follow established form patterns
const CoupleProfileForm = () => {
  const { register, handleSubmit } = useForm<CoupleFormData>({
    resolver: zodResolver(coupleSchema)
  });

  // Wedding-specific validation messages
  const validationMessages = {
    partner1_email: "We'll use this to keep you updated on your special day!",
    wedding_date: "This helps all your vendors coordinate perfectly!"
  };

  // Progressive disclosure for complex forms
  return (
    <Card className="wedding-form-card">
      <WeddingTheme.ProgressIndicator current={1} total={4} />
      {/* Component implementation */}
    </Card>
  );
};
```

- [ ] MUST use existing components from $WS_ROOT/wedsync/src/components/ui/ 
- [ ] MUST follow wedding color system - warm, celebratory tones
- [ ] MUST test at all three breakpoints with Playwright
- [ ] MUST maintain 4.5:1 contrast ratios for accessibility
- [ ] MUST support dark mode using existing patterns
- [ ] MUST include celebration micro-interactions with Magic UI

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

**PRIMARY DELIVERABLES:**
- [ ] CoupleProfileManager component with partner forms
- [ ] CoreWeddingFieldsForm with auto-population triggers  
- [ ] GuestListManager with RSVP dashboard
- [ ] SupplierConnectionHub with permission controls
- [ ] Navigation integration complete
- [ ] Component unit tests with >85% coverage
- [ ] Responsive design validated on all breakpoints
- [ ] Accessibility compliance verified

**TYPESCRIPT INTERFACES:**
```typescript
interface CoupleProfile {
  id: string;
  partner1_first_name: string;
  partner1_last_name?: string;
  partner1_email: string;
  partner2_first_name?: string;
  partner2_last_name?: string;
  couple_display_name?: string;
  preferred_contact_method?: ContactMethod;
  preferred_contact_person?: ContactPerson;
  wedding_hashtag?: string;
  profile_photo_url?: string;
  cover_photo_url?: string;
}

interface CoreWeddingFields {
  wedding_date?: Date;
  ceremony_venue_name?: string;
  reception_venue_name?: string;
  guest_count_estimated?: number;
  wedding_style?: string[];
  color_scheme?: string[];
  budget_total?: number;
  completion_percentage: number;
}

interface Guest {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  guest_side: 'partner1' | 'partner2' | 'both';
  guest_type: GuestType;
  rsvp_status: RSVPStatus;
  dietary_requirements?: string[];
  is_helper: boolean;
  helper_role?: string;
}
```

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/couples/
- Forms: $WS_ROOT/wedsync/src/components/couples/forms/
- Types: $WS_ROOT/wedsync/src/types/couples.ts
- Tests: $WS_ROOT/wedsync/tests/components/couples/
- Styles: Use Tailwind classes following existing patterns

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

**Revolutionary accessibility-first testing:**

```javascript
// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/couples/profile"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. MULTI-FORM COMPLEX USER FLOW
await mcp__playwright__browser_fill_form({
  fields: [
    {name: "Partner 1 Name", type: "textbox", ref: "[data-testid=partner1-name]", value: "Emma"},
    {name: "Partner 1 Email", type: "textbox", ref: "[data-testid=partner1-email]", value: "emma@example.com"},
    {name: "Wedding Date", type: "textbox", ref: "[data-testid=wedding-date]", value: "2025-06-15"}
  ]
});

// 3. RESPONSIVE BREAKPOINT TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `couples-${width}px.png`});
}

// 4. FORM VALIDATION TESTING
await mcp__playwright__browser_type({
  element: "email field", 
  ref: "[data-testid=partner1-email]", 
  text: "invalid-email"
});
await mcp__playwright__browser_click({element: "submit button", ref: "[data-testid=submit-btn]"});
await mcp__playwright__browser_wait_for({text: "Please enter a valid email"});

// 5. GUEST LIST INTERACTION TESTING
await mcp__playwright__browser_drag({
  startElement: "guest item", startRef: "[data-testid=guest-1]",
  endElement: "helper section", endRef: "[data-testid=helpers]"
});
```

## ✅ COMPLETION CHECKLIST

### Technical Implementation:
- [ ] All 7 core components built and working
- [ ] TypeScript interfaces defined and exported
- [ ] Forms integrated with React Hook Form + Zod
- [ ] Responsive design tested on all breakpoints
- [ ] Navigation integration complete and tested
- [ ] Wedding-themed styling with Untitled UI + Magic UI
- [ ] Performance optimized (<200ms component load)

### Code Quality Evidence:
- [ ] Serena pattern compliance verified
- [ ] Unit tests written with >85% coverage
- [ ] Playwright visual tests for all components
- [ ] Accessibility compliance verified (WCAG 2.1 AA)
- [ ] No TypeScript errors or warnings
- [ ] No console errors in browser

### Integration Evidence:
- [ ] Forms trigger auto-population events for suppliers
- [ ] Real-time updates working for partner synchronization
- [ ] Guest list changes update related components
- [ ] Task delegation integrates with helper assignments
- [ ] Budget tracker maintains privacy boundaries

### Wedding UX Evidence:
- [ ] Celebration animations on form completion
- [ ] Progress indicators for multi-step processes
- [ ] Encouraging messaging throughout user journey
- [ ] Mobile-optimized for venue/travel usage
- [ ] Graceful error handling with helpful messages

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Update WS-301 status to completed with Team A completion details.

## 📝 SENIOR DEV REVIEW PROMPT CREATION

Create comprehensive review prompt at:
`$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-301-couples-tables-team-a-round1-complete.md`

Include:
- Component architecture decisions
- UI pattern choices with Serena validation
- Wedding UX considerations and implementations
- Integration points with other teams
- Performance and accessibility results

## ⚠️ CRITICAL WARNINGS

- **DO NOT** use any component library other than Untitled UI + Magic UI
- **DO NOT** create forms without proper validation and wedding context
- **DO NOT** implement budget features that leak private information
- **DO NOT** skip navigation integration - components must be discoverable
- **DO NOT** forget mobile-first responsive design for venue usage

## 🏁 SUCCESS METRICS

**Performance Targets:**
- Component mount time: <200ms
- Form validation response: <50ms
- Page navigation: <300ms
- Bundle size increase: <100kb

**User Experience Targets:**
- Task completion rate: >90% for couple profile creation
- Error rate: <5% on form submissions
- Mobile usability score: >95/100
- Accessibility score: 100/100 (WCAG 2.1 AA)

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for wedding-focused couples database UI development!**