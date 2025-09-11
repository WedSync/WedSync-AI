# TEAM A - ROUND 1: WS-312 - Client Dashboard Builder Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the frontend dashboard builder interface that allows wedding suppliers to create custom client portals with drag-drop functionality
**FEATURE ID:** WS-312 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about intuitive drag-drop UX and real-time preview generation for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/dashboard-builder/
cat $WS_ROOT/wedsync/src/components/dashboard-builder/DashboardBuilder.tsx | head -20
cat $WS_ROOT/wedsync/src/app/(dashboard)/dashboard-templates/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test dashboard-builder
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

// Query specific areas relevant to dashboard builder
await mcp__serena__search_for_pattern("dashboard.*builder|drag.*drop|client.*portal");
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("src/components");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
// General SaaS UI (for dashboard builder interface):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY
- **@dnd-kit**: Drag-drop functionality (REQUIRED for this feature)

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to dashboard builder and drag-drop
mcp__Ref__ref_search_documentation("React drag drop dashboard builder @dnd-kit implementation");
mcp__Ref__ref_search_documentation("Next.js 15 client portal dashboard component patterns");
mcp__Ref__ref_search_documentation("Tailwind CSS dashboard layout responsive design");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This dashboard builder needs drag-drop sections (timeline, photos, forms, vendors, documents, payments, guest list, planning tools). I need to consider: 1) Section types and data requirements, 2) Drag-drop zones and validation, 3) Real-time preview generation, 4) Branding customization interface, 5) Mobile responsiveness for client portal output.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down dashboard builder into components
2. **react-ui-specialist** - Focus on @dnd-kit integration and responsive design
3. **security-compliance-officer** - Ensure secure template storage and client access
4. **code-quality-guardian** - Maintain component architecture standards
5. **test-automation-architect** - Test drag-drop interactions and preview generation
6. **documentation-chronicler** - Document component API and usage patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COMPONENT SECURITY CHECKLIST:
- [ ] **Input validation** - Sanitize all dashboard template data
- [ ] **XSS prevention** - Escape HTML in template previews
- [ ] **Template access control** - Only supplier can edit their templates
- [ ] **Client portal security** - Read-only access for couples
- [ ] **File upload validation** - Secure logo/branding uploads
- [ ] **Template sharing** - Validate template sharing permissions

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**✅ MANDATORY: Dashboard builder must integrate with main navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add "Dashboard Templates" link to supplier main navigation
- [ ] Mobile navigation support for dashboard builder
- [ ] Breadcrumbs: Dashboard > Client Portals > Dashboard Builder
- [ ] Active state highlighting when in builder mode
- [ ] Return to dashboard button in builder interface

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**SPECIFIC RESPONSIBILITIES:**
- React components with TypeScript (strict mode)
- Drag-drop interface using @dnd-kit library
- Responsive UI (375px mobile, 768px tablet, 1920px desktop)
- Real-time preview generation
- Branding customization interface
- Client portal template rendering
- Component performance optimization (<200ms interactions)
- Accessibility compliance (WCAG 2.1 AA)

## 📋 TECHNICAL SPECIFICATION REQUIREMENTS

### USER STORY CONTEXT
**As a:** Wedding photographer who wants to provide each couple with a personalized client portal
**I want to:** Build custom dashboard layouts for couples showing their wedding timeline, photo galleries, forms, and vendor connections
**So that:** I can eliminate sending wedding information through scattered emails and give couples a professional branded experience that reduces my customer support by 60%

### FRONTEND COMPONENTS TO BUILD

#### 1. DashboardBuilder.tsx (Main Component)
```typescript
interface DashboardBuilderProps {
  templateId?: string;
  onSave: (template: DashboardTemplate) => void;
}

interface DashboardTemplate {
  id: string;
  name: string;
  sections: DashboardSection[];
  branding: BrandingConfig;
  isDefault: boolean;
}

interface DashboardSection {
  id: string;
  type: 'timeline' | 'photos' | 'forms' | 'vendors' | 'documents' | 'payments' | 'guests' | 'planning';
  title: string;
  config: Record<string, any>;
  order: number;
}
```

#### 2. SectionLibrary.tsx (Available Sections)
- Timeline section with wedding milestones
- Photo gallery with vendor uploads  
- Forms collection with completion status
- Vendor directory with contact info
- Document library with categories
- Payment tracker with due dates
- Guest list with RSVP status
- Planning tools and checklists

#### 3. BrandingCustomizer.tsx (Styling Options)
- Logo upload and positioning
- Color scheme customization
- Font selection (web-safe fonts)
- Header/footer customization
- Mobile layout preferences

#### 4. TemplatePreview.tsx (Real-time Preview)
- Live preview of client portal
- Mobile/desktop view toggle
- Sample data for demonstration
- Interactive preview with working navigation

### DRAG-DROP IMPLEMENTATION (@dnd-kit)
```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Implementation required for section reordering
```

### RESPONSIVE DESIGN REQUIREMENTS
- Mobile-first design approach
- Touch-friendly drag handles (48px minimum)
- Collapsible sections on mobile
- Optimized preview for all screen sizes
- Accessibility focus management during drag operations

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] DashboardBuilder main component with drag-drop zones
- [ ] SectionLibrary component with 8+ available sections
- [ ] Basic BrandingCustomizer with color/logo options
- [ ] TemplatePreview component with mobile/desktop toggle
- [ ] Integration with existing dashboard navigation
- [ ] TypeScript interfaces and proper type safety
- [ ] Unit tests for drag-drop functionality
- [ ] Accessibility compliance implementation

## 💾 WHERE TO SAVE YOUR WORK
- Main Component: `$WS_ROOT/wedsync/src/components/dashboard-builder/DashboardBuilder.tsx`
- Section Library: `$WS_ROOT/wedsync/src/components/dashboard-builder/SectionLibrary.tsx`
- Branding: `$WS_ROOT/wedsync/src/components/dashboard-builder/BrandingCustomizer.tsx`
- Preview: `$WS_ROOT/wedsync/src/components/dashboard-builder/TemplatePreview.tsx`
- Types: `$WS_ROOT/wedsync/src/components/dashboard-builder/types.ts`
- Page Integration: `$WS_ROOT/wedsync/src/app/(dashboard)/dashboard-templates/page.tsx`
- Tests: `$WS_ROOT/wedsync/src/__tests__/components/dashboard-builder/`

## 🏁 COMPLETION CHECKLIST
- [ ] All components created and verified to exist
- [ ] TypeScript compilation successful (no errors)
- [ ] Drag-drop functionality working with @dnd-kit
- [ ] Real-time preview updates when sections change
- [ ] Branding customization affecting preview display
- [ ] Mobile-responsive design implemented
- [ ] Navigation integration complete and tested
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Accessibility testing completed
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

## 🚨 WEDDING INDUSTRY CONTEXT
Remember: This dashboard builder helps wedding suppliers create professional client portals that replace scattered email communication. Think about real wedding scenarios - couples juggling multiple vendors, losing important details, needing one place to see their wedding progress. The interface should be intuitive for photographers, planners, and other wedding professionals who may not be technical.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for bulletproof wedding platform development!**