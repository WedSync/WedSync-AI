# TEAM A - ROUND 1: WS-273 - Design Customization Tools
## 2025-01-14 - Development Round 1

**YOUR MISSION:** Build the visual design customization interface with real-time preview, color picker, font selector, and responsive layout options for couples customizing their wedding websites
**FEATURE ID:** WS-273 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating an intuitive drag-and-drop design experience that makes couples feel like professional designers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedme/website/
ls -la $WS_ROOT/wedsync/src/components/ui/
cat $WS_ROOT/wedsync/src/components/wedme/website/DesignCustomizer.tsx | head -20
cat $WS_ROOT/wedsync/src/components/ui/color-picker.tsx | head -20
cat $WS_ROOT/wedsync/src/components/ui/font-selector.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test design-customizer
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

// Query existing UI patterns for consistency
await mcp__serena__search_for_pattern("color.*picker|font.*selector|design.*customizer");
await mcp__serena__find_symbol("ColorPicker", "", true);
await mcp__serena__find_symbol("FormBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
await mcp__serena__get_symbols_overview("src/components/wedme");
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
// Load documentation SPECIFIC to design customization features
# Use Ref MCP to search for relevant documentation
mcp__Ref__ref_search_documentation("React color picker components color palette customization UI design")
mcp__Ref__ref_search_documentation("Google Fonts API integration React font selector dropdown")
mcp__Ref__ref_search_documentation("CSS-in-JS real-time style generation React live preview")
mcp__Ref__ref_search_documentation("React Hook Form Zod validation design forms state management")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions on design customization
mcp__sequential-thinking__sequential_thinking({
  thought: "This design customization feature requires real-time CSS generation, live preview updates, responsive design handling, and performance optimization. I need to analyze the architecture for: 1) Color picker component with wedding palette presets 2) Font selector with Google Fonts integration 3) Live preview iframe with style injection 4) Responsive viewport switching 5) Form state management with validation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down design customizer into components, track UI dependencies
2. **react-ui-specialist** - Use Serena for React 19 component patterns and wedding-specific UI
3. **security-compliance-officer** - Ensure CSS injection safety and input validation
4. **code-quality-guardian** - Maintain Untitled UI + Magic UI standards
5. **test-automation-architect** - Comprehensive component testing with React Testing Library
6. **documentation-chronicler** - Evidence-based documentation with component examples

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI COMPONENT SECURITY CHECKLIST:
- [ ] **Input sanitization** - Zod schemas for all color/font inputs
- [ ] **CSS injection prevention** - Sanitize custom CSS input with DOMPurify
- [ ] **XSS prevention** - Escape all user-generated content in preview
- [ ] **Content Security Policy** - Inline styles with nonce for CSS generation
- [ ] **Color validation** - Strict hex color regex patterns
- [ ] **Font validation** - Whitelist Google Fonts only
- [ ] **File upload security** - No direct file uploads, external URLs only
- [ ] **Rate limiting** - Debounce design changes to prevent API spam

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: Design customizer must connect to WedMe dashboard navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] **WedMe navigation link** - Add to `/src/app/wedme/layout.tsx` in website section
- [ ] **Mobile navigation support** - Responsive navigation drawer  
- [ ] **Navigation states** - Active/current state for customize page
- [ ] **Breadcrumbs** - Website > Customize > Design path
- [ ] **Accessibility labels** - Screen reader navigation support
- [ ] **Touch optimization** - 48px minimum touch targets on mobile

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance
- Component performance <200ms

### CORE UI COMPONENTS TO BUILD:

#### 1. DesignCustomizer (Main Component)
```typescript
// Location: /src/components/wedme/website/DesignCustomizer.tsx
interface DesignCustomizerProps {
  coupleId: string;
  websiteId: string;
  onDesignChange?: (design: WebsiteDesign) => void;
}

// Key Features:
// - Tabbed interface (Presets, Colors, Typography, Layout)
// - Real-time form updates with React Hook Form
// - Live preview iframe with CSS injection
// - Responsive viewport switching (mobile/tablet/desktop)
// - Preset application with smooth transitions
// - Undo/redo functionality with design history
// - Save/publish design workflow
```

#### 2. ColorPicker (Reusable Component)
```typescript
// Location: /src/components/ui/color-picker.tsx
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetPalettes?: ColorPalette[];
  showEyeDropper?: boolean;
  weddingTheme?: 'classic' | 'modern' | 'rustic' | 'elegant';
}

// Features:
// - Color wheel picker with hex input
// - Wedding-themed color palette presets
// - Eyedropper tool for color sampling
// - Color contrast validation
// - Recent colors memory
// - Accessibility compliant color combinations
```

#### 3. FontSelector (Typography Component)
```typescript
// Location: /src/components/ui/font-selector.tsx
interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (fontFamily: string) => void;
  category: 'heading' | 'body';
  googleFonts: GoogleFont[];
  preview?: boolean;
}

// Features:
// - Google Fonts integration with search
// - Font preview with sample wedding text
// - Category-specific font recommendations
// - Font weight and style variations
// - Performance-optimized font loading
// - Wedding-appropriate font filtering
```

#### 4. LivePreview (Preview Component)
```typescript
// Location: /src/components/wedme/website/LivePreview.tsx
interface LivePreviewProps {
  design: WebsiteDesign;
  websiteContent: WebsiteContent;
  viewportSize: 'mobile' | 'tablet' | 'desktop';
  generatedCSS: string;
}

// Features:
// - Iframe-based isolated preview
// - Real-time CSS injection
// - Responsive viewport simulation
// - Loading states and error handling
// - Sample wedding content for preview
// - Performance monitoring
```

#### 5. DesignPresets (Preset Gallery)
```typescript
// Location: /src/components/wedme/website/DesignPresets.tsx
interface DesignPresetsProps {
  presets: DesignPreset[];
  onPresetApply: (presetId: string) => void;
  selectedPresetId?: string;
}

// Features:
// - Wedding-themed preset categories
// - Visual preview thumbnails
// - Preset application with confirmation
// - Custom preset creation (future)
// - Responsive preset grid
// - Premium preset indicators
```

### RESPONSIVE DESIGN REQUIREMENTS:

#### Mobile-First Approach (375px+):
- Touch-friendly color picker interface
- Collapsible design sections
- Bottom navigation for preview modes
- Swipe gestures for preset browsing
- Optimized font selector for mobile

#### Tablet Optimization (768px+):
- Side-by-side customizer and preview
- Enhanced touch targets for precise control
- Improved color picker with larger interface
- Better typography preview with more sample text

#### Desktop Experience (1024px+):
- Full-width design workspace
- Advanced color tools (gradients, shadows)
- Keyboard shortcuts for power users
- Multi-monitor preview support
- Professional design export features

### ACCESSIBILITY REQUIREMENTS:

#### WCAG 2.1 AA Compliance:
- [ ] **Color contrast** - 4.5:1 minimum for all text
- [ ] **Keyboard navigation** - Full keyboard support for all controls
- [ ] **Screen reader support** - Proper ARIA labels and descriptions
- [ ] **Focus indicators** - Clear focus states for all interactive elements
- [ ] **Alternative text** - Descriptive labels for preset images
- [ ] **Color independence** - Design works without color perception
- [ ] **Motion preferences** - Respect prefers-reduced-motion settings

### PERFORMANCE REQUIREMENTS:

#### Performance Targets:
- [ ] **Component render time** - <200ms for design changes
- [ ] **Font loading** - <500ms for Google Fonts with fallbacks
- [ ] **CSS generation** - <100ms for live preview updates
- [ ] **Bundle size impact** - <50KB additional for design features
- [ ] **Memory usage** - <20MB for color picker and font assets
- [ ] **Mobile performance** - 60fps animations on iPhone SE

## 📋 TECHNICAL SPECIFICATION
**Source:** `/OUTBOX/feature-designer/WS-273-design-customization-tools-technical.md`

**Wedding Context:** "Emma and James are having a rustic barn wedding with sage green and gold colors. Emma wants their wedding website to match their invitations and overall theme. Currently, they're stuck with generic templates that don't reflect their carefully chosen wedding aesthetic. With this feature, Emma can select sage green as their primary color, choose a rustic font, and see the changes instantly without needing technical skills."

**Key Components Needed:**
- Design Customizer with tabbed interface
- Color Picker with wedding palette presets  
- Font Selector with Google Fonts integration
- Live Preview with responsive viewport switching
- Design Presets gallery with wedding themes
- CSS Generation engine for real-time updates

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY DELIVERABLES:
- [ ] **DesignCustomizer.tsx** - Main customization interface component
- [ ] **ColorPicker.tsx** - Reusable color selection component
- [ ] **FontSelector.tsx** - Typography selection component
- [ ] **LivePreview.tsx** - Real-time design preview component
- [ ] **DesignPresets.tsx** - Preset gallery and application
- [ ] **design-customizer.test.tsx** - Comprehensive component tests
- [ ] **Wedding-themed CSS presets** - 5+ design preset templates

### INTEGRATION DELIVERABLES:
- [ ] **Navigation integration** - Add to WedMe dashboard navigation
- [ ] **Mobile responsiveness** - Test on 375px, 768px, 1920px viewports
- [ ] **Form state management** - React Hook Form + Zod validation setup
- [ ] **Error boundaries** - Graceful error handling for design failures
- [ ] **Performance optimization** - Debounced updates and memoization

### TESTING DELIVERABLES:
- [ ] **Unit tests** - 90%+ coverage for all components
- [ ] **Integration tests** - Component interaction testing
- [ ] **Accessibility tests** - ARIA compliance verification
- [ ] **Visual regression tests** - Screenshot comparisons
- [ ] **Performance tests** - Bundle size and runtime performance

## 💾 WHERE TO SAVE YOUR WORK
- **Components**: `$WS_ROOT/wedsync/src/components/wedme/website/`
- **UI Components**: `$WS_ROOT/wedsync/src/components/ui/`
- **Tests**: `$WS_ROOT/wedsync/src/__tests__/components/wedme/website/`
- **Stories**: `$WS_ROOT/wedsync/src/stories/wedme/` (if using Storybook)

## 🏁 COMPLETION CHECKLIST

### CODE IMPLEMENTATION:
- [ ] DesignCustomizer component created and functional
- [ ] ColorPicker component with wedding palettes implemented
- [ ] FontSelector component with Google Fonts integration
- [ ] LivePreview component with responsive viewport switching
- [ ] DesignPresets component with wedding theme gallery
- [ ] All components pass TypeScript compilation
- [ ] Navigation integration completed in WedMe dashboard

### TESTING & VALIDATION:
- [ ] Unit tests written and passing (90%+ coverage)
- [ ] Accessibility tests passing (WCAG 2.1 AA)
- [ ] Visual regression tests created with screenshots
- [ ] Performance benchmarks documented
- [ ] Mobile responsiveness tested on all breakpoints

### INTEGRATION & POLISH:
- [ ] Form validation working with Zod schemas
- [ ] Error handling implemented with user-friendly messages
- [ ] Loading states and progress indicators added
- [ ] CSS generation working with live preview updates
- [ ] Wedding-themed presets created and tested

### EVIDENCE PACKAGE:
- [ ] File existence proof (ls output)
- [ ] TypeScript compilation success
- [ ] Test results (all passing)
- [ ] Performance metrics documented
- [ ] Screenshot gallery of all responsive breakpoints

---

**EXECUTE IMMEDIATELY - Build the most intuitive wedding website design customizer that makes couples feel like professional designers! Every color choice and font selection should feel magical for their special day! 💍✨**