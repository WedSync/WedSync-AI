# TEAM A - ROUND 1: WS-320 - Core Fields Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive React UI components for core wedding fields management with TypeScript
**FEATURE ID:** WS-320 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about couple's wedding information entry experience and data synchronization across vendors

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/(wedme)/wedding-details/
cat $WS_ROOT/wedsync/src/app/(wedme)/wedding-details/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **FORM VALIDATION TEST:**
```bash
npm test wedding-details
# MUST show: "All validation tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing form patterns and wedding field components
await mcp__serena__search_for_pattern("form|wedding.*field|core.*data");
await mcp__serena__find_symbol("WeddingForm", "", true);
await mcp__serena__get_symbols_overview("src/components/forms");
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

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
ref_search_documentation("React Hook Form Zod validation wedding forms");
ref_search_documentation("WedMe platform couple wedding information management");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This core wedding fields system needs to collect essential wedding information once and sync to all vendors. Need to analyze: optimal form structure for wedding details, validation for dates/venues/guest counts, real-time sync indicators, vendor notification system when data changes...",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS

1. **task-tracker-coordinator** - Break down form components and validation requirements
2. **react-ui-specialist** - Build accessible, performant wedding form components  
3. **security-compliance-officer** - Ensure wedding data privacy and validation
4. **code-quality-guardian** - Maintain form validation and component standards
5. **test-automation-architect** - Comprehensive form testing and validation
6. **documentation-chronicler** - Document wedding field requirements and usage

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### WEDDING DATA SECURITY CHECKLIST:
- [ ] **Input validation** - Zod schemas for all wedding field inputs
- [ ] **Date validation** - Prevent invalid wedding dates and timeline conflicts
- [ ] **Guest count limits** - Validate realistic guest numbers
- [ ] **Venue validation** - Verify venue information and capacity
- [ ] **Data sanitization** - Clean all text inputs and prevent XSS
- [ ] **Change tracking** - Log all wedding information modifications
- [ ] **Vendor notifications** - Secure notification when core data changes

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript (strict mode)
- Responsive wedding forms (375px mobile, 768px tablet, 1920px desktop)  
- Untitled UI + Magic UI components only
- Real-time form validation with instant feedback
- Accessibility compliance for couples with disabilities
- Auto-save functionality for wedding information
- Visual sync indicators when data propagates to vendors

## 📋 TECHNICAL SPECIFICATION

**Based on:** WS-320-core-fields-section-overview-technical.md

**Core Requirements:**
- Central wedding information form with core fields
- Wedding date picker with timeline validation
- Venue information management with capacity validation
- Guest count tracking with dietary requirements
- Contact information for couple and emergency contacts
- Real-time synchronization status with vendor systems
- Form auto-save and recovery capabilities

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY FORM COMPONENTS:
- [ ] **CoreWeddingFieldsForm.tsx** - Main wedding information form
- [ ] **WeddingDatePicker.tsx** - Advanced date picker with timeline validation
- [ ] **VenueInformationForm.tsx** - Venue details with capacity and location
- [ ] **GuestCountManager.tsx** - Guest number tracking with dietary requirements
- [ ] **ContactInformationForm.tsx** - Couple and emergency contact details
- [ ] **WeddingTimelineForm.tsx** - Key timeline milestones and schedule
- [ ] **SyncStatusIndicator.tsx** - Real-time vendor synchronization status

### VALIDATION COMPONENTS:
- [ ] **WeddingFieldValidation.ts** - Comprehensive Zod validation schemas
- [ ] **DateValidationService.ts** - Wedding date and timeline validation logic
- [ ] **GuestCountValidator.ts** - Realistic guest count and capacity validation
- [ ] **VenueValidator.ts** - Venue information and capacity validation

### ADVANCED FEATURES:
- [ ] **AutoSaveManager.tsx** - Automatic form saving and recovery
- [ ] **ChangeTracker.tsx** - Track and display wedding information changes
- [ ] **VendorSyncDisplay.tsx** - Show which vendors received updates
- [ ] **FormProgressIndicator.tsx** - Visual progress through wedding setup

## 💾 WHERE TO SAVE YOUR WORK
- **WedMe Pages:** $WS_ROOT/wedsync/src/app/(wedme)/wedding-details/
- **Form Components:** $WS_ROOT/wedsync/src/components/wedding-forms/
- **Validation:** $WS_ROOT/wedsync/src/lib/validation/wedding-fields.ts
- **Types:** $WS_ROOT/wedsync/src/types/wedding-fields.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/components/wedding-forms/

## 🎨 WEDDING FORM DESIGN REQUIREMENTS

**Form Layout Structure:**
- Header: Wedding progress indicator and save status
- Main: Multi-step form with wedding information sections
- Sidebar: Vendor sync status and recent changes
- Footer: Auto-save indicator and help links

**Form Sections:**
1. Basic Wedding Info (date, venue, style)
2. Guest Information (count, dietary needs, special requirements)
3. Contact Details (couple, emergency contacts, key vendors)
4. Timeline Milestones (engagement, ceremony, reception)

**Responsive Behavior:**
- Mobile: Single-column form with step navigation
- Tablet: Two-column layout with collapsible sections
- Desktop: Full form with live preview and sync indicators

## 🌟 WEDDING-SPECIFIC UX FEATURES

### Emotional Design Elements:
- **Wedding Date Celebration** - Special animation when valid date selected
- **Progress Heart Fill** - Wedding setup progress shown as heart filling
- **Milestone Celebration** - Celebrate when major fields completed
- **Sync Success Animation** - Celebrate when data syncs to all vendors

### Wedding Context Integration:
- Show days until wedding throughout form
- Highlight critical fields that affect all vendors
- Display venue capacity vs. guest count in real-time
- Provide wedding timeline validation and conflict detection

## 🏁 COMPLETION CHECKLIST
- [ ] All 7 primary form components created and functional
- [ ] Comprehensive Zod validation schemas implemented
- [ ] Real-time form validation working with instant feedback
- [ ] Auto-save functionality operational every 30 seconds
- [ ] Vendor sync status indicators showing real-time updates
- [ ] Responsive design tested on all breakpoints
- [ ] Accessibility compliance verified (screen readers, keyboard navigation)
- [ ] TypeScript compilation successful with no errors
- [ ] Wedding date and timeline validation preventing conflicts
- [ ] Guest count validation with venue capacity checks
- [ ] Evidence package prepared with form screenshots and validation demos

---

**EXECUTE IMMEDIATELY - Build the central wedding information hub that eliminates repetitive data entry for couples!**