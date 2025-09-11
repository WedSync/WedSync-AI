# TEAM A - ROUND 1: WS-221 - Branding Customization
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive branding customization interface allowing wedding suppliers to customize their client portals with logos, colors, and brand elements
**FEATURE ID:** WS-221 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about supplier brand identity and client portal personalization

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/branding/
cat $WS_ROOT/wedsync/src/components/branding/BrandingCustomizer.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test branding
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## =Ú STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query branding-related patterns
await mcp__serena__search_for_pattern("branding customization theme color");
await mcp__serena__find_symbol("BrandCustomizer Theme", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**=¨ CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**L DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "React color-picker components"
# - "CSS custom-properties theming"
# - "Next.js dynamic-styling"
# - "File upload image-processing"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing customization patterns
await mcp__serena__find_referencing_symbols("theme customizer settings");
await mcp__serena__search_for_pattern("color picker logo upload");
```

## >à STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Branding Customization UI Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Branding customization for wedding suppliers needs: logo upload and preview, color palette editor, font selection, custom CSS overrides, brand preview mode, client portal theming. Each supplier needs their unique brand identity reflected in their client portals.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: BrandingCustomizer (main interface), LogoUploader (file handling), ColorPalette (theme editor), BrandPreview (real-time preview), FontSelector (typography control). Each needs file upload capabilities, color validation, and live preview functionality.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management: Brand settings need persistent storage, real-time preview requires reactive updates, file uploads need progress tracking, color changes should update entire theme instantly. Consider Zustand for brand state, React Query for server sync.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding supplier UX: Photographers need logo/color matching, planners want elegant theming, venues need brand consistency. Interface must be intuitive, changes must preview instantly, export options needed for print materials integration.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## =€ STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track branding component development progress
2. **react-ui-specialist** - Build Untitled UI branding components
3. **security-compliance-officer** - Validate file upload security
4. **code-quality-guardian** - Ensure pattern consistency
5. **test-automation-architect** - Create comprehensive branding tests
6. **documentation-chronicler** - Document branding customization usage

## =Ë STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
- [ ] Identified existing file upload patterns to follow
- [ ] Found color theming implementation points
- [ ] Understood brand settings storage architecture
- [ ] Located similar customization implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Architecture decisions for brand theme system
- [ ] Test cases for file upload and color validation
- [ ] Security measures for logo file handling
- [ ] Performance considerations for real-time preview

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use patterns discovered by Serena
- [ ] Maintain consistency with existing settings components
- [ ] Include code examples in comments
- [ ] Test continuously during development

## = DEPENDENCIES
- **Team B**: Branding API endpoints and theme storage logic
- **Team C**: Real-time brand preview synchronization
- **Team D**: Mobile optimization for branding interface

## = SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### File Upload Security:
- [ ] Logo files validated for type and size (JPEG/PNG <2MB)
- [ ] Image processing to prevent malicious files
- [ ] Secure file storage with proper permissions
- [ ] Rate limiting for file upload operations
- [ ] Virus scanning for uploaded brand assets

### Brand Data Security:
- [ ] Brand settings encrypted in storage
- [ ] Validation for color values and CSS inputs
- [ ] XSS prevention in custom CSS handling
- [ ] User permissions for brand modifications

## >í NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

**=¨ CRITICAL: Branding customizer MUST integrate into parent navigation**

### Settings Navigation Integration:
```typescript
// MUST update settings navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/settings/layout.tsx
{
  title: "Branding & Theme",
  href: "/settings/branding",
  icon: Palette
}
```

### Mobile Navigation Support:
- [ ] Branding settings accessible in mobile menu
- [ ] Responsive design for color picker interfaces
- [ ] Touch-optimized brand customization controls

## <¨ UI IMPLEMENTATION RULES (WITH SERENA VALIDATION)

- [ ] MUST use existing components from Untitled UI library
- [ ] MUST follow color system - NO hardcoded colors except for brand preview
- [ ] MUST test at 375px, 768px, 1920px breakpoints
- [ ] MUST maintain 4.5:1 contrast ratios in default themes
- [ ] MUST support custom brand color accessibility validation

## <¯ SPECIFIC DELIVERABLES

### Core Branding Components:
- [ ] **BrandingCustomizer.tsx** - Main branding interface with logo and color controls
- [ ] **LogoUploader.tsx** - Secure file upload component with preview
- [ ] **ColorPalette.tsx** - Brand color scheme editor with validation
- [ ] **BrandPreview.tsx** - Real-time preview of branded client portal
- [ ] **FontSelector.tsx** - Typography customization interface
- [ ] **CSSEditor.tsx** - Advanced custom styling options
- [ ] **useBrandTheme.ts** - Custom hook for brand state management

### Wedding Brand Features:
- [ ] Logo positioning and sizing controls
- [ ] Wedding-appropriate color palette suggestions
- [ ] Brand consistency validation across components
- [ ] Export functionality for print material coordination
- [ ] Client portal preview with supplier branding

## <­ PLAYWRIGHT TESTING

```javascript
// Branding Customization Testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/branding"});
const brandingStructure = await mcp__playwright__browser_snapshot();

// Test logo upload functionality
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/test/logo.png"]
});

// Test color picker interactions
await mcp__playwright__browser_click({
  element: "color picker",
  ref: "[data-testid='color-picker']"
});

// Test brand preview functionality
await mcp__playwright__browser_click({
  element: "preview button",
  ref: "[data-testid='brand-preview']"
});

// Validate responsive branding interface
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({filename: `branding-${width}px.png`});
}
```

##  ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All branding components functional with file upload
- [ ] Tests written FIRST and passing (>90% coverage)
- [ ] Zero TypeScript errors in branding components
- [ ] Zero console errors during brand customization
- [ ] Mobile responsiveness validated across breakpoints

### Brand Integration Evidence:
- [ ] Branding settings accessible from main navigation
- [ ] Real-time preview shows brand changes instantly
- [ ] Logo upload and processing works securely
- [ ] Color themes apply across client portal components

## =¾ WHERE TO SAVE

- **Components**: `$WS_ROOT/wedsync/src/components/branding/`
- **Hooks**: `$WS_ROOT/wedsync/src/hooks/useBrandTheme.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/branding.ts`
- **Tests**: `$WS_ROOT/wedsync/src/components/branding/__tests__/`
- **Utilities**: `$WS_ROOT/wedsync/src/lib/branding/`

##   CRITICAL WARNINGS

- File upload security must be thoroughly validated
- Custom CSS inputs must be sanitized to prevent XSS
- Brand previews should not affect other users' interfaces
- Image processing must handle various file formats safely
- Color accessibility should be validated for client portals

## <Á COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Branding Security Verification:
- [ ] All uploaded files validated and sanitized
- [ ] Custom CSS inputs properly escaped
- [ ] File storage permissions correctly configured
- [ ] Brand settings encrypted in database
- [ ] XSS prevention in brand preview functionality

### Final Branding Integration Checklist:
- [ ] Navigation integration complete and tested
- [ ] File upload functionality secure and performant
- [ ] Brand preview shows real-time changes
- [ ] Color accessibility validation working
- [ ] TypeScript compiles with NO errors
- [ ] All tests passing including file upload tests

---

**Real Wedding Scenario:** A luxury wedding photographer needs to customize their client portal with their signature rose gold brand colors, elegant typography, and studio logo. The branding system allows them to upload their logo, select custom colors that match their brand guidelines, preview how their clients will see the portal, and ensure their brand identity is consistent across all client interactions.

**EXECUTE IMMEDIATELY - Build comprehensive branding customization system for supplier brand identity with full navigation integration!**