# TEAM A - ROUND 1: WS-342 - Advanced Form Builder Engine Frontend
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the comprehensive drag-and-drop form builder interface with real-time preview, advanced field components, and intuitive user experience that rivals enterprise form builders
**FEATURE ID:** WS-342 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about making form building feel effortless and powerful for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/form-builder/
cat $WS_ROOT/wedsync/src/components/form-builder/FormBuilderCanvas.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test form-builder
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

// Query existing form and drag-drop patterns
await mcp__serena__search_for_pattern("Form.*Builder|Drag.*Drop|Canvas|FormField");
await mcp__serena__find_symbol("Form", "", true);
await mcp__serena__get_symbols_overview("src/components/forms/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/.claude/UNIFIED-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **@dnd-kit**: Drag-and-drop functionality (MANDATORY - see docs/dnd-kit-guide.md)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load form builder and drag-drop documentation
mcp__Ref__ref_search_documentation("React drag drop dnd-kit sortable form builder interface");
mcp__Ref__ref_search_documentation("Form validation React Hook Form Zod schema builder");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This Advanced Form Builder needs to compete with enterprise tools like Typeform and JotForm while being specifically tailored for wedding suppliers. The drag-drop canvas must support 15+ field types, conditional logic, multi-step workflows, and real-time preview - all while maintaining wedding industry context and terminology.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down form builder UI components and dependencies
2. **react-ui-specialist** - Use Serena for consistent React patterns with @dnd-kit
3. **ui-ux-designer** - Ensure intuitive form building experience
4. **code-quality-guardian** - Maintain Untitled UI standards and TypeScript strict mode
5. **test-automation-architect** - Comprehensive UI testing for drag-drop interactions
6. **documentation-chronicler** - Document form builder workflows and components

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **Form data sanitization** - All form inputs sanitized before storage
- [ ] **XSS prevention** - Escape all user-generated content in form previews
- [ ] **CSRF protection** - All form submission endpoints protected
- [ ] **Input validation** - Client-side validation mirrors server-side rules
- [ ] **File upload security** - Validate file types and sizes before upload
- [ ] **Session validation** - Check authentication for form building operations
- [ ] **Field access control** - Respect tier limits on advanced field types
- [ ] **Audit trail UI** - Log all form building actions

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All form builder pages must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Main navigation link: "Forms" under main menu
- [ ] Mobile navigation hamburger support with collapsible menu  
- [ ] Active navigation state for /dashboard/forms/* routes
- [ ] Breadcrumbs: Home > Dashboard > Forms > Builder > [Form Name]
- [ ] Accessibility: aria-label="Form Builder" for nav items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript strict mode
- Responsive design (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components exclusively
- @dnd-kit for all drag-and-drop functionality
- Real-time form preview with live updates
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms render time

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Context
**User:** Sarah, a photographer who needs sophisticated intake forms for different wedding packages
**Pain:** Generic form builders don't understand wedding terminology or workflows
**Solution:** Drag-and-drop builder with wedding-specific field templates and intelligent defaults
**Success:** "I built a 3-step client intake form in 10 minutes with wedding date validation and package logic!"

### Core UI Components to Build

#### 1. Form Builder Canvas (Main Component)
```typescript
interface FormBuilderCanvasProps {
  formId?: string;
  onFormSaved?: (form: FormData) => void;
  initialData?: FormConfiguration;
}

// Features Required:
// - Drag-and-drop zone for field placement
// - Visual grid system with snap-to-grid
// - Real-time form preview alongside builder
// - Field ordering with visual feedback
// - Undo/redo functionality
// - Auto-save every 30 seconds
// - Mobile-responsive canvas
```

#### 2. Field Palette Component
```typescript
interface FieldPaletteProps {
  availableFields: FieldType[];
  tierLimitations?: TierLimitations;
  onFieldDrag?: (fieldType: FieldType) => void;
}

// Features Required:
// - Categorized field groups (Basic, Advanced, Wedding-Specific)
// - Search and filter field types
// - Visual field previews
// - Tier-based field availability indicators
// - Drag handles for field creation
// - Wedding-specific fields (wedding date, guest count, etc.)
```

#### 3. Field Configuration Panel
```typescript
interface FieldConfigPanelProps {
  selectedField: FormFieldConfig | null;
  onFieldUpdate: (config: FormFieldConfig) => void;
  onFieldDelete: () => void;
}

// Features Required:
// - Dynamic configuration based on field type
// - Validation rule builder interface
// - Conditional logic visual editor
// - Option management for select/radio fields
// - File upload configuration
// - Required field toggles
// - Help text and placeholder management
```

#### 4. Form Preview Component
```typescript
interface FormPreviewProps {
  formConfig: FormConfiguration;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  showValidation?: boolean;
}

// Features Required:
// - Real-time updates from canvas changes
// - Responsive preview switching
// - Interactive form testing
// - Validation error display
// - Wedding data population for testing
// - Step-by-step navigation for multi-step forms
```

#### 5. Conditional Logic Builder
```typescript
interface ConditionalLogicBuilderProps {
  fieldId: string;
  availableFields: FormFieldConfig[];
  currentLogic: ConditionalLogic[];
  onLogicUpdate: (logic: ConditionalLogic[]) => void;
}

// Features Required:
// - Visual rule builder with if/then/else logic
// - Field dependency mapping
// - Action configuration (show/hide/require fields)
// - Logic validation and circular dependency detection
// - Wedding workflow templates (e.g., venue type → catering options)
```

### Wedding Industry UI Considerations

#### Wedding-Specific Field Templates
- **Wedding Date Picker** - Validates against booking calendar
- **Guest Count Slider** - Impacts venue and catering calculations  
- **Package Selection** - Conditional logic for photography packages
- **Venue Information** - Google Places integration for venue details
- **Dietary Requirements** - Multi-select with custom options
- **Photo Shot List** - Template-based checklist builder

#### Wedding Supplier Language
- Use "Wedding Details" not "Event Information"
- "Client Preferences" not "Customer Requirements"  
- "Package Selection" not "Service Options"
- "Reception Timeline" not "Event Schedule"
- Progress messages: "Setting up Sarah & Mike's intake form..."

#### Trust & Professional Appeal
- Clean, professional interface that matches high-end wedding brands
- Subtle animations that feel premium, not gimmicky
- Clear typography hierarchy for easy scanning
- Wedding imagery in empty states and tutorials
- Success states that celebrate form completion

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Form Builder Interface (PRIORITY 1)
- [ ] FormBuilderCanvas with drag-drop zones and grid system
- [ ] FieldPalette with categorized field types and search
- [ ] FieldConfigPanel with dynamic configuration options
- [ ] FormPreview with responsive switching and real-time updates
- [ ] Form toolbar with save, preview, and publish actions

### Advanced Field Components (PRIORITY 2) 
- [ ] Wedding-specific field types (date, venue, guest count)
- [ ] File upload field with image preview and validation
- [ ] Signature field with touch/mouse drawing support
- [ ] Multi-step form navigation and progress indicators
- [ ] Section breaks and form organization tools

### Interaction Features (PRIORITY 3)
- [ ] Drag-and-drop field reordering with visual feedback
- [ ] Copy/paste fields with configuration preservation
- [ ] Undo/redo system for form building actions
- [ ] Keyboard shortcuts for power users
- [ ] Auto-save with conflict resolution

## 💾 WHERE TO SAVE YOUR WORK

**Component Files:**
- `$WS_ROOT/wedsync/src/components/form-builder/FormBuilderCanvas.tsx`
- `$WS_ROOT/wedsync/src/components/form-builder/FieldPalette.tsx` 
- `$WS_ROOT/wedsync/src/components/form-builder/FieldConfigPanel.tsx`
- `$WS_ROOT/wedsync/src/components/form-builder/FormPreview.tsx`
- `$WS_ROOT/wedsync/src/components/form-builder/ConditionalLogicBuilder.tsx`

**Field Components:**
- `$WS_ROOT/wedsync/src/components/form-fields/WeddingDateField.tsx`
- `$WS_ROOT/wedsync/src/components/form-fields/VenueField.tsx`
- `$WS_ROOT/wedsync/src/components/form-fields/GuestCountField.tsx`
- `$WS_ROOT/wedsync/src/components/form-fields/SignatureField.tsx`

**Page Files:**
- `$WS_ROOT/wedsync/src/app/dashboard/forms/builder/page.tsx`
- `$WS_ROOT/wedsync/src/app/dashboard/forms/[id]/edit/page.tsx`

**Type Definitions:**
- `$WS_ROOT/wedsync/src/types/form-builder.ts`

**Styles:**
- Use Tailwind classes exclusively
- Follow Untitled UI spacing and color patterns

## 🧪 TESTING REQUIREMENTS

### Unit Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/src/components/form-builder/__tests__/FormBuilderCanvas.test.tsx
$WS_ROOT/wedsync/src/components/form-builder/__tests__/FieldPalette.test.tsx
$WS_ROOT/wedsync/src/components/form-builder/__tests__/FieldConfigPanel.test.tsx
$WS_ROOT/wedsync/src/components/form-builder/__tests__/FormPreview.test.tsx
```

### Testing Scenarios
- [ ] Render canvas with empty form (empty state)
- [ ] Drag field from palette to canvas
- [ ] Configure field properties and validation
- [ ] Real-time preview updates when canvas changes
- [ ] Multi-step form navigation
- [ ] Mobile responsiveness on iPhone SE (375px)
- [ ] Keyboard accessibility for drag-drop operations

### E2E Testing Scenarios  
- [ ] Complete form building workflow from start to publish
- [ ] Complex conditional logic setup and testing
- [ ] Multi-step form with branching logic
- [ ] File upload field configuration and testing
- [ ] Form preview in all responsive breakpoints

## 🏁 COMPLETION CHECKLIST

### Technical Implementation
- [ ] All components created and compile without errors
- [ ] TypeScript strict mode compliance (no 'any' types)
- [ ] @dnd-kit integration working with touch and mouse
- [ ] Untitled UI components used exclusively
- [ ] Responsive design tested on 3 breakpoints
- [ ] Real-time preview synchronization working

### Security & Integration
- [ ] Navigation integration complete with breadcrumbs
- [ ] All form inputs sanitized and validated
- [ ] File upload security implemented
- [ ] CSRF protection on all form actions
- [ ] Tier-based feature access controls
- [ ] Session management for form building

### Wedding Context
- [ ] Language uses wedding industry terms
- [ ] Wedding-specific field templates available
- [ ] Form building flows match photographer workflows
- [ ] Success messages reference client scenarios
- [ ] Default templates for common wedding forms

### Testing & Evidence
- [ ] Unit tests passing with >90% coverage
- [ ] E2E tests covering critical user journeys
- [ ] Drag-drop functionality tested on touch devices
- [ ] Form preview accuracy validated
- [ ] Performance benchmarks met (<200ms interactions)

---

**EXECUTE IMMEDIATELY - Build the Advanced Form Builder Engine that makes creating sophisticated wedding forms feel effortless!**