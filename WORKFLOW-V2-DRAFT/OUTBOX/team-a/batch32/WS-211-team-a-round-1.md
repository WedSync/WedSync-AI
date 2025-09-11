# TEAM A - ROUND 1: WS-211 - Client Dashboard Templates - Frontend Components & UI

**Date:** 2025-08-28  
**Feature ID:** WS-211 (Track all work with this ID)  
**Priority:** P1 (High value for supplier efficiency)  
**Mission:** Build reusable dashboard template components with drag-and-drop functionality  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer managing 30+ active clients with different packages  
**I want to:** Create reusable dashboard templates for each service tier that automatically apply to new clients  
**So that:** I save 2 hours per client on dashboard setup and ensure consistent experiences, saving 60+ hours monthly  

**Real Wedding Problem This Solves:**  
A photographer offers three packages: Essential ($2k), Premium ($4k), and Luxury ($6k+). Each package includes different deliverables and timelines. Currently, they manually configure each client's dashboard, often forgetting to add certain sections or using inconsistent layouts. With templates, luxury clients automatically get a dashboard with album design tools, premium clients get standard galleries, and essential clients get basic delivery options.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Create templates with 8+ section types
- Drag-and-drop section reordering
- Auto-assignment based on package/venue
- Templates clone with modifications
- Override specific sections per client
- Layout options (single/sidebar/grid)

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Library: @hello-pangea/dnd for drag-and-drop
- State Management: Zustand for template configuration
- Testing: Playwright MCP for drag-drop validation

**Integration Points:**
- Template Management: Backend APIs for template CRUD
- Section Library: Reusable dashboard sections
- Client Assignment: Auto-assignment rule engine
- Preview System: Live template preview functionality

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__filesystem__read_text_file({path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"});

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router dynamic components templates"});
await mcp__Ref__ref_search_documentation({query: "React 19 drag and drop hello-pangea dnd patterns"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 layout grid responsive design"});
await mcp__Ref__ref_search_documentation({query: "Zustand state management React patterns"});

// 3. REVIEW existing dashboard patterns:
await Grep({
  pattern: "dashboard|template|drag.*drop|section",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src",
  output_mode: "files_with_matches"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard "Build dashboard template system with drag-drop"
2. **react-ui-specialist** --think-hard "Create reusable template components with Next.js 15"
3. **ui-ux-designer** --think-ultra-hard "Design template editor interface with drag-drop"
4. **security-compliance-officer** --think-ultra-hard "Ensure template data isolation"
5. **test-automation-architect** --tdd-approach "Create drag-drop testing with Playwright"
6. **playwright-visual-testing-specialist** --accessibility-first "Test template interactions"
7. **code-quality-guardian** --check-patterns "Ensure component reusability"

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Review existing dashboard structure
- Analyze current client management patterns
- Check existing component library
- Understand template requirements from spec

### **PLAN PHASE**
- Design template component architecture
- Plan drag-and-drop interaction patterns
- Create section library component structure
- Design template preview system

### **CODE PHASE**
- Implement TemplateEditor with drag-drop
- Create SectionLibrary browser component
- Build TemplateSelector with preview
- Add template configuration panels

### **COMMIT PHASE**
- Test drag-drop functionality extensively
- Validate template creation and editing
- Ensure responsive design works
- Create comprehensive component tests

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] TemplateEditor component with drag-and-drop section ordering
- [ ] SectionLibrary component for browsing available sections
- [ ] TemplateSelector component with template preview
- [ ] Template configuration panels (layout, branding, visibility)
- [ ] Responsive template preview system
- [ ] Basic template CRUD interface components

### Code Files to Create:
```typescript
// /wedsync/src/components/dashboard/templates/TemplateEditor.tsx
export function TemplateEditor({ template, onSave }: TemplateEditorProps) {
  // Drag-and-drop section reordering with @hello-pangea/dnd
  // Section configuration panels
  // Layout switcher (single/sidebar/grid)
  // Live preview mode
}

// /wedsync/src/components/dashboard/templates/TemplateSelector.tsx
export function TemplateSelector({ onSelect, showPreview }: TemplateSelectorProps) {
  // Grid view of available templates
  // Template preview on hover
  // Category filtering
  // Template statistics display
}

// /wedsync/src/components/dashboard/templates/SectionLibrary.tsx
export function SectionLibrary({ onAddSection }: SectionLibraryProps) {
  // Categorized section browser
  // Section preview cards
  // Custom section creator
  // Drag-to-add functionality
}

// /wedsync/src/lib/stores/templateConfigStore.ts
export const useTemplateConfigStore = create<TemplateConfigState>((set, get) => ({
  // Template state management
  // Section configuration
  // Preview state
  // Validation logic
}));
```

### Component Requirements:
- **Drag-and-Drop**: Use @hello-pangea/dnd for section reordering
- **Responsive**: Mobile-first design with touch support
- **Accessible**: Keyboard navigation and screen reader support
- **Performant**: Lazy loading for template previews
- **Consistent**: Follow SAAS UI Style Guide patterns

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Template API endpoints (GET, POST, PUT, DELETE /api/dashboard/templates)
- FROM Team B: Section configuration API (/api/dashboard/sections)
- FROM Team C: Template assignment integration with client management

### What other teams NEED from you:
- TO Team B: Template data structure and API requirements
- TO Team C: Template component interfaces for integration
- TO Team D: Mobile-optimized template components
- TO Team E: Component testing utilities and mock data

---

## 🔒 SECURITY REQUIREMENTS

### Template Security:
- [ ] Template data isolated per supplier (no cross-contamination)
- [ ] Template configuration validated client-side and server-side
- [ ] Drag-drop actions don't expose sensitive section data
- [ ] Preview mode doesn't execute untrusted content

### Component Security:
- [ ] Template names and descriptions sanitized for XSS
- [ ] Section configurations validated before storage
- [ ] No template data leakage in browser console
- [ ] Proper error boundaries for template rendering failures

---

## 🎭 PLAYWRIGHT MCP TESTING

```javascript
// Template creation and drag-drop testing
test('Template editor drag-and-drop functionality', async ({ page }) => {
  await page.goto('/dashboard/templates/new');
  
  // Test section library
  await expect(page.locator('[data-testid="section-library"]')).toBeVisible();
  
  // Test drag-and-drop section reordering
  await page.dragAndDrop(
    '[data-testid="section-welcome"]',
    '[data-testid="template-canvas"]'
  );
  
  // Verify section was added
  await expect(page.locator('[data-testid="template-canvas"] .section-welcome')).toBeVisible();
  
  // Test section reordering
  await page.dragAndDrop(
    '[data-testid="section-welcome"]',
    '[data-testid="section-progress"]'
  );
  
  // Test template save
  await page.fill('[data-testid="template-name"]', 'Premium Wedding Dashboard');
  await page.click('[data-testid="save-template"]');
  
  // Verify success
  await expect(page.locator('.toast-success')).toBeVisible();
});

// Template selector testing
test('Template selector with preview', async ({ page }) => {
  await page.goto('/dashboard/templates');
  
  // Test template grid display
  await expect(page.locator('[data-testid="template-grid"]')).toBeVisible();
  
  // Test template preview on hover
  await page.hover('[data-testid="template-card-1"]');
  await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
  
  // Test template selection
  await page.click('[data-testid="select-template-1"]');
  await expect(page.locator('[data-testid="template-selected"]')).toBeVisible();
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All template components created and functional
- [ ] Drag-and-drop working smoothly on desktop and mobile
- [ ] Template preview updates in real-time
- [ ] Section library browses and adds sections correctly
- [ ] Template configuration panels save correctly
- [ ] Responsive design works on all screen sizes

### User Experience:
- [ ] Template creation workflow intuitive and fast
- [ ] Drag-drop provides visual feedback during interaction
- [ ] Template preview accurately represents final result
- [ ] Error handling graceful and informative
- [ ] Loading states provide good user feedback

### Integration Ready:
- [ ] Components ready for Team B's API integration
- [ ] Template data structure defined and validated
- [ ] Component interfaces documented for other teams
- [ ] State management working with Zustand store

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/dashboard/templates/`
- Store: `/wedsync/src/lib/stores/templateConfigStore.ts`
- Types: `/wedsync/src/types/dashboard-templates.ts`
- Tests: `/wedsync/tests/components/dashboard/templates/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch32/WS-211-team-a-round-1-complete.md`

**Evidence Package Required:**
- Screenshot proof of working drag-drop functionality
- Template editor and selector component demos
- Responsive design validation screenshots
- Playwright test results showing all interactions working
- Component library documentation

---

## 📝 CRITICAL WARNINGS

- Do NOT implement template assignment logic (Team C handles this)
- Do NOT create backend APIs (Team B handles this)
- Do NOT skip accessibility features for drag-drop
- ENSURE all drag-drop works on touch devices
- REMEMBER: Focus on UI components only in Round 1

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] All template editor components created
- [ ] Drag-and-drop functionality implemented and tested
- [ ] Section library component functional
- [ ] Template selector with preview working
- [ ] Responsive design validated
- [ ] Accessibility features implemented
- [ ] Playwright tests written and passing
- [ ] Component documentation complete
- [ ] Evidence package created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY