# TEAM A - ROUND 1: WS-216 - Auto-Population System
## 2025-01-29 - Development Round 1

**YOUR MISSION:** Build comprehensive React components for the auto-population system that allows couples to automatically fill vendor forms with their wedding details, saving 3-4 hours per vendor and preventing coordination errors
**FEATURE ID:** WS-216 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about form field identification, confidence scoring UI, and seamless population experience

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/forms/
ls -la $WS_ROOT/wedsync/src/hooks/
cat $WS_ROOT/wedsync/src/components/forms/AutoPopulationProvider.tsx | head -20
cat $WS_ROOT/wedsync/src/components/forms/PopulatedFormField.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test auto-population
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

// Query form-related components to understand existing patterns
await mcp__serena__search_for_pattern("FormField|Input|useForm");
await mcp__serena__find_symbol("FormField", "", true);
await mcp__serena__get_symbols_overview("src/components/forms");
await mcp__serena__get_symbols_overview("src/hooks");
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
// Load documentation SPECIFIC to auto-population patterns
# Use Ref MCP to search for form handling, context providers, and hooks patterns
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions around auto-population UI
mcp__sequential-thinking__sequential_thinking({
  thought: "This auto-population system requires careful UX design. I need to consider: 1) How to clearly indicate which fields are populated vs manual, 2) Confidence scoring visualization, 3) User verification workflow, 4) Error states when population fails, 5) Performance with large forms. The key challenge is making auto-population feel magical while maintaining user control.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down auto-population component development
2. **react-ui-specialist** - Focus on form component patterns and accessibility  
3. **security-compliance-officer** - Ensure no sensitive data exposure in UI
4. **code-quality-guardian** - Maintain React best practices
5. **test-automation-architect** - Comprehensive component testing
6. **documentation-chronicler** - Document auto-population UX patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **Input Sanitization** - All populated values sanitized before display
- [ ] **XSS Prevention** - No dangerouslySetInnerHTML with user data
- [ ] **Data Masking** - Sensitive fields (SSN, passwords) never auto-populated
- [ ] **Session Management** - Clear population data on component unmount
- [ ] **Audit Trail** - Log all population events for security monitoring
- [ ] **User Consent** - Clear indication when data is being auto-populated
- [ ] **Data Expiration** - Respect population session expiration times

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone components without integration**
**✅ MANDATORY: Auto-population components must integrate with existing form systems**

### INTEGRATION CHECKLIST
- [ ] Works with existing form components in wedsync/src/components/forms/
- [ ] Integrates with form validation systems
- [ ] Supports existing form styling patterns
- [ ] Compatible with mobile form layouts
- [ ] Accessible form field enhancements

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms
- Auto-population visual indicators
- Confidence scoring UI
- User verification workflows

## 📋 WS-216 TECHNICAL SPECIFICATION - FRONTEND COMPONENTS

### REAL WEDDING SCENARIO
**Context:** Sarah and Mike are planning their wedding. They completed a detailed photographer intake form (25+ fields: names, date, venue, timeline, guest count, special requests). Now their caterer sends them an "Event Details Form" asking for the same basic information. With your auto-population system, when they open the caterer's form, all their core wedding details are automatically filled in - they just need to add catering-specific details like dietary restrictions. This saves them 20-30 minutes and ensures all vendors have identical base information.

### YOUR DELIVERABLES - ROUND 1

#### 1. AutoPopulationProvider Component
```typescript
// src/components/forms/AutoPopulationProvider.tsx
// Context provider that manages auto-population state
// Must handle:
// - Population session management
// - Field value lookup and caching
// - Confidence scoring display
// - User verification tracking
// - Session expiration handling
```

#### 2. PopulatedFormField Component
```typescript
// src/components/forms/PopulatedFormField.tsx
// Enhanced form field that shows population status
// Must include:
// - Visual indicators for populated vs manual fields
// - Confidence score badges (High/Medium/Low)
// - Click-to-accept populated values
// - Override capabilities for user corrections
// - Accessibility labels for screen readers
```

#### 3. PopulationStatusBanner Component
```typescript
// src/components/forms/PopulationStatusBanner.tsx
// Top-level banner showing population summary
// Must display:
// - Total fields populated
// - Confidence breakdown (High/Medium/Low counts)
// - Expandable details view
// - Clear all population option
// - Session expiration countdown
```

#### 4. useAutoPopulation Hook
```typescript
// src/hooks/useAutoPopulation.ts
// Custom hook for population logic
// Must provide:
// - populateForm() function
// - Field value retrieval
// - Population status checking
// - Confidence score access
// - Error handling
```

## 🎨 UI/UX REQUIREMENTS

### Visual Design Requirements
1. **Population Indicators**
   - Subtle blue border for populated fields
   - Confidence badges: Green (High), Yellow (Medium), Orange (Low)
   - Sparkle icon (✨) to indicate auto-population
   - Smooth animations when fields populate

2. **Interactive Elements**
   - Hover states for population info
   - Click-to-expand population details
   - One-click accept/reject for suggested values
   - Clear visual hierarchy for form sections

3. **Responsive Design**
   - Mobile-first approach for form fields
   - Touch-friendly confidence indicators
   - Collapsible population banner on small screens
   - Optimized for wedding planning on-the-go

### Accessibility Requirements
- ARIA labels for population status
- Screen reader announcements for auto-filled fields
- Keyboard navigation for all population controls
- High contrast mode support for confidence colors
- Focus management during population process

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### Component Architecture
```typescript
// Component hierarchy:
// AutoPopulationProvider
//   └── PopulationStatusBanner
//   └── Form (existing)
//       ├── PopulatedFormField (replaces regular inputs)
//       ├── PopulatedFormField
//       └── ...other form fields

// State Management:
// - React Context for global population state
// - useReducer for complex population logic
// - Local state for UI interactions (expand/collapse, etc.)
```

### Performance Considerations
- Memo-ize expensive confidence calculations
- Debounce population API calls
- Lazy load population details
- Virtual scrolling for large form lists
- Optimize re-renders during population

### Error Handling
- Graceful degradation when population fails
- User-friendly error messages
- Retry mechanisms for failed populations
- Fallback to manual entry
- Error boundary for population components

## 💾 WHERE TO SAVE YOUR WORK
- Components: `$WS_ROOT/wedsync/src/components/forms/`
- Hooks: `$WS_ROOT/wedsync/src/hooks/`
- Types: `$WS_ROOT/wedsync/src/types/auto-population.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/components/forms/`
- Styles: Use Tailwind classes (no separate CSS files)

## 🧪 TESTING REQUIREMENTS

### Unit Tests Required
- AutoPopulationProvider context behavior
- PopulatedFormField rendering with different confidence levels
- useAutoPopulation hook functionality
- Population status calculations
- Error state handling

### Component Tests Required
- Form field population flow
- User interaction with populated fields
- Population banner expand/collapse
- Confidence score display
- Accessibility compliance

### Mock Data Required
- Sample population sessions
- Various confidence score scenarios
- Error conditions
- Different field types (text, date, number)
- Form templates with mixed populated/manual fields

## 🏁 COMPLETION CHECKLIST

### Core Implementation
- [ ] AutoPopulationProvider created with full context API
- [ ] PopulatedFormField component with confidence indicators
- [ ] PopulationStatusBanner with expandable details
- [ ] useAutoPopulation hook with all required functions
- [ ] TypeScript interfaces for all population data

### UI/UX Polish
- [ ] Confidence score badges with proper colors
- [ ] Smooth population animations
- [ ] Responsive design across all screen sizes
- [ ] Accessibility labels and ARIA attributes
- [ ] Error states with user-friendly messages

### Integration & Testing
- [ ] Components integrate with existing form system
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Component tests for user interactions
- [ ] TypeScript compilation successful
- [ ] No console errors or warnings

### Documentation
- [ ] Component usage examples
- [ ] Props documentation with TypeScript
- [ ] Integration guide for other developers
- [ ] Accessibility implementation notes
- [ ] Performance optimization notes

## 🎯 SUCCESS CRITERIA

1. **Functionality**: Forms can display auto-populated fields with clear visual indicators
2. **Performance**: Component renders <200ms with 50+ form fields
3. **Accessibility**: Passes WCAG 2.1 AA compliance checks
4. **User Experience**: Intuitive confidence scoring and verification workflow
5. **Integration**: Works seamlessly with existing form components
6. **Error Handling**: Graceful fallback to manual entry when population fails
7. **Mobile Experience**: Touch-friendly population controls and responsive design

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all frontend requirements for the WS-216 Auto-Population System!**

**Remember: This system saves couples 3-4 hours per vendor by eliminating repetitive form filling. Think hard about the user experience - make auto-population feel magical while maintaining full user control.**