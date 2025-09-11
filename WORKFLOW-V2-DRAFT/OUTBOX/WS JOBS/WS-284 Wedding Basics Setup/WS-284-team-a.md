# TEAM A - ROUND 1: WS-284 - Wedding Basics Setup
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build intuitive wedding setup wizard with intelligent defaults and step-by-step configuration UI
**FEATURE ID:** WS-284 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about first-time wedding planning experience and smart configuration flows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedding-basics/
cat $WS_ROOT/wedsync/src/components/wedding-basics/WeddingSetupWizard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedding-basics
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

// Query wedding setup and wizard patterns
await mcp__serena__search_for_pattern("wedding setup wizard configuration onboarding");
await mcp__serena__find_symbol("WeddingWizard SetupForm Timeline", "", true);
await mcp__serena__get_symbols_overview("src/components/onboarding/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Load Untitled UI and Magic UI documentation
# Use Ref MCP to search for:
# - "Untitled UI wizard stepper multi-step forms"
# - "Magic UI progressive-disclosure animations"

// Then load supporting documentation
# Use Ref MCP to search for:
# - "React Hook Form conditional validation"
# - "Next.js app-router wizard navigation"
# - "Tailwind CSS progressive-enhancement responsive"
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
// Load documentation SPECIFIC to wedding setup wizard
# Use Ref MCP to search for:
# - "React multi-step forms wizard patterns"
# - "Wedding planning software UI patterns"
# - "Progressive disclosure UX best practices"
# - "Smart defaults configuration systems"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand wizard and form patterns
await mcp__serena__find_referencing_symbols("wizard stepper form");
await mcp__serena__search_for_pattern("step validation progress");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Complex UI Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding basics setup wizard needs: 6-step configuration flow (couple details, wedding date/venue, guest count estimates, budget overview, key vendors, communication preferences), smart defaults based on wedding style/season, progress tracking with validation at each step, ability to skip/return to steps.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI complexity analysis: Multi-step wizard requires state management across steps, validation rules per step, dynamic field requirements based on venue type (outdoor = weather fields, indoor = capacity fields), progress indicators, save/resume functionality, mobile-optimized step transitions.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Smart defaults intelligence: Wedding date affects vendor recommendations and timeline templates, venue type determines setup requirements, guest count influences catering/seating features, budget range affects suggested vendor tiers and timeline recommendations.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding planning UX considerations: First-time couples are overwhelmed by choices, need guided experience with explanations, visual progress indicators reduce abandonment, smart suggestions based on previous selections increase completion rates, ability to change decisions later reduces pressure.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: WeddingSetupWizard (main orchestrator), StepNavigator (progress/navigation), individual step components (CoupleDetails, VenueInfo, GuestDetails, BudgetEstimate, VendorPreferences, CommunicationSetup), ValidationSummary (final review), each with form validation and mobile responsiveness.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies
   - Mission: Break down wizard steps, track validation requirements, identify UX dependencies

2. **nextjs-fullstack-developer** --think-ultra-hard --semantic-analysis --wizard-specialist
   - Mission: Use Serena to find form and wizard patterns, ensure progressive enhancement

3. **security-compliance-officer** --think-ultra-hard --data-protection --form-security
   - Mission: Ensure wedding data privacy, secure form validation, GDPR compliance

4. **code-quality-guardian** --continuous --pattern-checking
   - Mission: Ensure wizard components follow existing patterns from Serena analysis

5. **test-automation-architect** --tdd-first --wizard-flows --mobile-testing
   - Mission: Create comprehensive wizard flow tests, mobile step navigation testing

6. **documentation-chronicler** --detailed-evidence --wizard-guide
   - Mission: Document wizard configuration guide with screenshots and flow diagrams

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all related wizard and onboarding patterns
await mcp__serena__find_symbol("Wizard Onboarding Setup", "", true);
await mcp__serena__search_for_pattern("multi-step form stepper");
await mcp__serena__find_referencing_symbols("validation progress navigation");
```
- [ ] Identified existing wizard patterns to follow
- [ ] Found all form validation integration points
- [ ] Understood mobile navigation requirements
- [ ] Located similar multi-step implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed wizard architecture:
- [ ] Step flow architecture based on existing patterns
- [ ] Validation strategy per step (written FIRST)
- [ ] Mobile-first responsive design approach
- [ ] State management for wizard progress and data

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use multi-step patterns discovered by Serena
- [ ] Implement progress indicators with Untitled UI
- [ ] Create mobile-optimized step transitions
- [ ] Include comprehensive form validation

## 🧭 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### WIZARD NAVIGATION INTEGRATION CHECKLIST

1. **Onboarding Flow Integration:**
```typescript
// MUST integrate into main onboarding flow
// File: $WS_ROOT/wedsync/src/app/onboarding/page.tsx
// Add wizard step following existing pattern:
{
  title: "Wedding Basics",
  href: "/onboarding/wedding-basics",
  icon: HeartIcon,
  description: "Set up your essential wedding information"
}
```

2. **Dashboard Quick Setup:**
```typescript
// MUST add quick setup access to dashboard
// File: $WS_ROOT/wedsync/src/app/(dashboard)/page.tsx
// Add setup card for incomplete profiles:
{
  title: "Complete Wedding Setup",
  href: "/dashboard/wedding-setup",
  status: "incomplete",
  progress: 60
}
```

3. **Settings Re-configuration:**
```typescript
// MUST allow setup changes from settings
// File: $WS_ROOT/wedsync/src/app/(dashboard)/settings/page.tsx
// Add wedding basics section:
{
  title: "Wedding Information",
  href: "/settings/wedding-basics",
  description: "Update your core wedding details"
}
```

**NAVIGATION INTEGRATION EVIDENCE REQUIRED:**
- [ ] Screenshots showing wizard integrated into onboarding
- [ ] Dashboard setup card for incomplete configurations
- [ ] Settings access for reconfiguration
- [ ] Mobile navigation through wizard steps tested

## 📋 TECHNICAL SPECIFICATION

### Core Wedding Setup Components:

1. **WeddingSetupWizard** (`/components/wedding-basics/WeddingSetupWizard.tsx`)
   - Multi-step wizard orchestrator
   - Progress tracking and step validation
   - Save/resume functionality
   - Mobile-optimized transitions

2. **Step Components:**
   - `CoupleDetailsStep` - Names, contact info, relationship details
   - `WeddingDetailsStep` - Date, venue, ceremony/reception info
   - `GuestDetailsStep` - Guest count estimates, demographics
   - `BudgetEstimateStep` - Budget ranges with smart recommendations
   - `VendorPreferencesStep` - Key vendor type priorities
   - `CommunicationStep` - Notification preferences, contact methods

3. **Smart Defaults Engine:**
   - Seasonal venue recommendations
   - Timeline templates based on wedding size
   - Vendor suggestions by budget range
   - Communication preference optimization

## 🎯 SPECIFIC DELIVERABLES

### UI Components with Evidence:
- [ ] Complete wizard flow (6 steps) with navigation
- [ ] Progress indicator with step validation states
- [ ] Mobile-responsive step transitions
- [ ] Smart defaults implementation for all fields
- [ ] Form validation with helpful error messages
- [ ] Save/resume functionality for partial completion

### Integration Requirements:
- [ ] Onboarding flow integration
- [ ] Dashboard setup card
- [ ] Settings reconfiguration access
- [ ] Wedding profile data synchronization

### Testing Evidence:
- [ ] Full wizard completion flow test
- [ ] Mobile step navigation testing
- [ ] Form validation testing for each step
- [ ] Smart defaults accuracy verification
- [ ] Save/resume functionality testing

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team B: Wedding profile database schema and API endpoints
- Team B: Smart defaults recommendation engine backend
- Team C: Integration with existing user authentication system

**What others need from you:**
- Team B: Validated wedding data structure requirements
- Team D: Mobile-optimized wizard component for WedMe platform
- Team E: Complete user flow documentation and test specifications

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FORM SECURITY CHECKLIST:
- [ ] **Input validation on ALL form fields** - Use secureStringSchema
- [ ] **Wedding date validation** - Prevent past dates, reasonable future limits
- [ ] **Guest count validation** - Prevent unrealistic numbers
- [ ] **Budget range validation** - Ensure positive numbers only
- [ ] **Venue information sanitization** - Clean all text inputs
- [ ] **Session security** - Secure multi-step form state
- [ ] **CSRF protection** - Token validation on form submissions
- [ ] **Data encryption** - Sensitive wedding details at rest

### REQUIRED SECURITY IMPORTS:
```typescript
import { secureStringSchema, emailSchema, phoneSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { validateWeddingDate, validateGuestCount } from '$WS_ROOT/wedsync/src/lib/wedding/validation';
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary wedding wizard testing requirements:

```javascript
// 1. COMPLETE WIZARD FLOW TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/onboarding/wedding-basics"});

// Test each step progression
for (const step of ['couple-details', 'wedding-details', 'guest-details', 'budget', 'vendors', 'communication']) {
  // Fill step with test data
  await mcp__playwright__browser_fill_form({
    selector: `[data-testid="${step}-form"]`,
    data: testWeddingData[step]
  });
  
  // Validate step completion
  await mcp__playwright__browser_click({element: `[data-testid="${step}-continue"]`});
  await mcp__playwright__browser_wait_for({text: "Step completed"});
  
  // Take progression screenshot
  await mcp__playwright__browser_take_screenshot({filename: `wizard-${step}-completed.png`});
}

// 2. SMART DEFAULTS TESTING
await mcp__playwright__browser_select({element: "#venue-type", value: "outdoor"});
await mcp__playwright__browser_wait_for({text: "Weather considerations"});
const defaultsApplied = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelector('[data-testid="weather-fields"]').style.display !== 'none'`
});

// 3. MOBILE WIZARD NAVIGATION
await mcp__playwright__browser_resize({width: 375, height: 800});
for (const step of wizardSteps) {
  await mcp__playwright__browser_take_screenshot({filename: `mobile-wizard-${step}.png`});
  // Test swipe/touch interactions
}

// 4. SAVE/RESUME FUNCTIONALITY
await mcp__playwright__browser_navigate({url: "/wizard?step=3"});
const savedProgress = await mcp__playwright__browser_evaluate({
  function: `() => JSON.parse(localStorage.getItem('weddingSetupProgress') || '{}')`
});

// 5. VALIDATION ERROR HANDLING
await mcp__playwright__browser_fill_form({
  selector: "#wedding-date",
  data: { date: "1990-01-01" } // Past date - should error
});
await mcp__playwright__browser_wait_for({text: "Wedding date must be in the future"});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Complete 6-step wizard with seamless navigation
- [ ] Smart defaults engine with 95% accuracy for venue type suggestions
- [ ] Mobile-first responsive design tested on 3+ screen sizes
- [ ] Form validation with contextual error messages
- [ ] Save/resume functionality with localStorage backup

### User Experience Evidence:
```typescript
// Required UX metrics with measurements
const weddingSetupMetrics = {
  wizardCompletion: "85%",     // Target: >80%
  stepProgression: "1.2s",     // Time between steps
  mobileUsability: "4.5/5",   // Touch interaction rating
  validationClarity: "95%",   // Error message understanding
  smartDefaultsUsage: "78%"   // Users keeping suggested values
}
```

### Integration Evidence:
- [ ] Onboarding flow navigation working
- [ ] Dashboard setup cards displaying correctly
- [ ] Settings reconfiguration accessible
- [ ] Wedding profile data syncing with backend

### Performance Evidence:
- [ ] Wizard loads in <1.5s on mobile 3G
- [ ] Step transitions under 300ms
- [ ] Form validation feedback under 100ms
- [ ] Smart defaults calculation under 500ms

## 💾 WHERE TO SAVE

### Component Structure:
```
$WS_ROOT/wedsync/src/components/wedding-basics/
├── WeddingSetupWizard.tsx          # Main wizard orchestrator
├── components/
│   ├── CoupleDetailsStep.tsx       # Step 1: Couple information
│   ├── WeddingDetailsStep.tsx      # Step 2: Date, venue, ceremony
│   ├── GuestDetailsStep.tsx        # Step 3: Guest estimates
│   ├── BudgetEstimateStep.tsx      # Step 4: Budget planning
│   ├── VendorPreferencesStep.tsx   # Step 5: Vendor priorities
│   └── CommunicationStep.tsx       # Step 6: Notifications
├── utils/
│   ├── smartDefaults.ts            # Smart recommendation engine
│   ├── wizardValidation.ts         # Step-by-step validation
│   └── weddingDataTypes.ts         # TypeScript interfaces
└── hooks/
    ├── useWizardProgress.ts        # Wizard state management
    ├── useSmartDefaults.ts         # Defaults calculation hook
    └── useWeddingSetup.ts          # Setup data persistence
```

### Page Integration:
```
$WS_ROOT/wedsync/src/app/onboarding/wedding-basics/page.tsx
$WS_ROOT/wedsync/src/app/(dashboard)/wedding-setup/page.tsx
$WS_ROOT/wedsync/src/app/(dashboard)/settings/wedding-basics/page.tsx
```

## ⚠️ CRITICAL WARNINGS

### Wedding Industry Considerations:
- **Seasonal Venue Availability**: Outdoor venues need weather backup plans
- **Guest Count Accuracy**: Critical for catering and seating arrangements
- **Budget Reality Check**: Prevent unrealistic expectations vs market rates
- **Timeline Dependencies**: Venue type affects setup time requirements

### UX Anti-Patterns to Avoid:
- **Information Overload**: Keep each step focused on 3-5 fields maximum
- **Validation Surprise**: Never invalidate previous steps silently
- **Mobile Abandonment**: Ensure touch targets >44px, readable text >16px
- **Progress Anxiety**: Show clear completion percentages and time estimates

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Code Security Verification:
```bash
# Verify form validation on all inputs
grep -r "secureStringSchema\|emailSchema\|phoneSchema" $WS_ROOT/wedsync/src/components/wedding-basics/
# Should show validation on ALL text inputs

# Check for proper wedding date validation
grep -r "validateWeddingDate" $WS_ROOT/wedsync/src/components/wedding-basics/
# Should be present in WeddingDetailsStep

# Verify no direct state manipulation without validation
grep -r "setState\|setValue" $WS_ROOT/wedsync/src/components/wedding-basics/ | grep -v "validated"
# Should return minimal results (all state changes should be validated)
```

### Final Wedding Setup Checklist:
- [ ] ALL 6 wizard steps implemented and tested
- [ ] Smart defaults working for venue type, season, guest count
- [ ] Mobile wizard navigation smooth and responsive
- [ ] Save/resume functionality preserves all user input
- [ ] Form validation provides helpful, wedding-specific guidance
- [ ] Integration with onboarding, dashboard, and settings complete
- [ ] TypeScript compiles with NO errors
- [ ] Comprehensive tests cover all user flows
- [ ] Documentation includes setup guide with screenshots

### Wedding Data Security:
- [ ] Personal information encrypted in transit and storage
- [ ] Wedding date validation prevents invalid selections
- [ ] Guest information properly sanitized
- [ ] Budget data validated and secured
- [ ] Vendor preferences protected from tampering
- [ ] Communication settings respect privacy preferences

**✅ Ready for Team B API integration and Team E comprehensive testing**