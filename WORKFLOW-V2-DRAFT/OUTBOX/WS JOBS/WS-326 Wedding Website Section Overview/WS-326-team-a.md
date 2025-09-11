# TEAM A - ROUND 1: WS-326 - Wedding Website Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the frontend/UI components for couples to create and customize wedding websites with theme selection, content editing, and mobile-responsive design
**FEATURE ID:** WS-326 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating intuitive website builder interface that couples can use without technical knowledge

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedding-website/
ls -la $WS_ROOT/wedsync/src/app/(dashboard)/couples/[id]/website/
cat $WS_ROOT/wedsync/src/components/wedding-website/WebsiteBuilder.tsx | head -20
cat $WS_ROOT/wedsync/src/components/wedding-website/ThemeSelector.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --testPathPattern="wedding-website"
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

// Query website-building related patterns
await mcp__serena__search_for_pattern("website.*builder|theme.*selector|content.*editor");
await mcp__serena__find_symbol("FormBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
await mcp__serena__find_symbol("ClientDashboard", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the SAAS UI Style Guide for this feature
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
// Load documentation specific to React components and form building
await mcp__Ref__ref_search_documentation("React 19 form components drag drop interface builders");
await mcp__Ref__ref_search_documentation("Next.js 15 dynamic page routing website builders");
await mcp__Ref__ref_search_documentation("Tailwind CSS responsive design website themes");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for UI Architecture
```typescript
// Plan the website builder interface architecture
mcp__sequential-thinking__sequential_thinking({
  thought: "This wedding website builder needs: 1) Theme selection gallery with live previews, 2) Drag-and-drop content editor for story/details, 3) RSVP form integration, 4) Photo gallery management, 5) Mobile-responsive preview. The interface should be intuitive for non-technical couples.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "For the theme system, I need: Pre-built theme templates (Classic, Modern, Rustic, Beach, Garden), Real-time preview as couples customize, Easy color/font customization, Mobile responsiveness built-in. Each theme should have consistent component structure.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down UI components, track dependencies
2. **nextjs-fullstack-developer** - Use Serena for component patterns consistency  
3. **security-compliance-officer** - Ensure form security and data validation
4. **code-quality-guardian** - Maintain React/TypeScript standards
5. **test-automation-architect** - Component testing with React Testing Library
6. **documentation-chronicler** - Evidence-based UI documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FORM SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY form input** - Use secureStringSchema for content
- [ ] **XSS prevention** - Sanitize all website content display
- [ ] **File upload security** - Validate image uploads for themes/photos
- [ ] **Content length limits** - Prevent DoS through large content
- [ ] **HTML/JS injection prevention** - Strip dangerous content from user input

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone website builder without navigation integration**
**✅ MANDATORY: Integrate into couple dashboard navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add "Wedding Website" tab to couple dashboard navigation
- [ ] Mobile navigation support for website builder
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs: Dashboard > Couples > [Name] > Website
- [ ] Accessibility labels for all navigation

```typescript
// MUST update couple detail navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/couples/[id]/layout.tsx
{
  label: "Wedding Website",
  href: `/couples/${id}/website`,
  icon: Globe,
  current: pathname.includes('/website')
}
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**PRIMARY RESPONSIBILITIES:**
- React components with TypeScript (strict typing)
- Responsive UI design (375px, 768px, 1920px breakpoints)  
- Untitled UI + Magic UI component integration
- Form validation and error handling
- Accessibility compliance (WCAG 2.1 AA)
- Component performance optimization (<200ms render)

### WEDDING WEBSITE UI REQUIREMENTS

#### 1. WEBSITE BUILDER DASHBOARD
```typescript
// Component: WebsiteBuilder.tsx
interface WebsiteBuilderProps {
  coupleId: string;
  existingWebsite?: WeddingWebsite;
}

// Required sections:
// - Theme Selection Gallery
// - Content Editor (Our Story, Wedding Details)
// - RSVP Integration Toggle
// - Photo Gallery Management
// - Preview Panel (Desktop/Mobile)
// - Publish Settings (Custom Domain)
```

#### 2. THEME SELECTION INTERFACE
```typescript
// Component: ThemeSelector.tsx
interface Theme {
  id: string;
  name: string; // Classic, Modern, Rustic, Beach, Garden
  preview: string;
  colors: ColorPalette;
  fonts: FontPalette;
  layout: 'single-page' | 'multi-page';
}

// Visual theme gallery with:
// - Live preview thumbnails
// - Hover animations
// - Color customization sidebar
// - Font selection dropdown
```

#### 3. CONTENT EDITOR COMPONENTS
```typescript
// Component: ContentEditor.tsx
interface ContentSection {
  type: 'story' | 'details' | 'rsvp' | 'photos' | 'registry';
  title: string;
  content: string | object;
  order: number;
  visible: boolean;
}

// Rich text editor with:
// - WYSIWYG editing
// - Image insertion
// - Text formatting
// - Character limits
// - Auto-save functionality
```

#### 4. MOBILE PREVIEW PANEL
```typescript
// Component: MobilePreview.tsx
// Real-time preview showing:
// - Mobile responsive layout
// - Touch interaction zones
// - Loading performance indicator
// - Accessibility contrast checker
```

## 📋 TECHNICAL SPECIFICATION IMPLEMENTATION

Based on the specification for wedding website builder:

### REQUIRED UI COMPONENTS TO BUILD:

1. **WebsiteBuilder** (Main Component)
   - Theme selection interface
   - Content management panels
   - Live preview functionality
   - Publish/settings controls

2. **ThemeSelector** (Theme Gallery)
   - Visual theme previews
   - Customization panels
   - Color/font pickers
   - Layout options

3. **ContentEditor** (WYSIWYG Editor)
   - Rich text editing
   - Section management
   - Image/media insertion
   - Auto-save functionality

4. **PreviewPanel** (Live Preview)
   - Desktop/mobile views
   - Real-time updates
   - Responsive testing
   - Performance metrics

5. **PublishSettings** (Domain/Publishing)
   - Custom domain setup
   - SEO configuration
   - Privacy controls
   - Analytics integration

### REAL WEDDING USER STORIES:

**Emma & James (Photography Couple):**
*"We want a beautiful website that showcases our love story and venue photos, with easy RSVP for 150 guests, and a registry link to our gifts."*

**Sarah & Mike (Destination Wedding):**
*"Our wedding is in Italy, so we need a website with travel details, accommodation recommendations, and a way for guests to upload their photos."*

**Lisa & David (Garden Party Wedding):**
*"We're having a casual garden party wedding and want a simple, elegant website that matches our rustic theme with wildflower colors."*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] WebsiteBuilder main component with theme selection
- [ ] ThemeSelector with 5 pre-built themes (Classic, Modern, Rustic, Beach, Garden)
- [ ] ContentEditor for Our Story and Wedding Details sections
- [ ] Mobile-responsive preview panel
- [ ] Navigation integration into couple dashboard
- [ ] Unit tests for all components (>90% coverage)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Evidence package with file listings and screenshots

## 💾 WHERE TO SAVE YOUR WORK
- Components: `$WS_ROOT/wedsync/src/components/wedding-website/`
- Pages: `$WS_ROOT/wedsync/src/app/(dashboard)/couples/[id]/website/`
- Types: `$WS_ROOT/wedsync/src/types/wedding-website.ts`
- Styles: `$WS_ROOT/wedsync/src/styles/wedding-website.css`
- Tests: `$WS_ROOT/wedsync/src/__tests__/components/wedding-website/`

## 🏁 COMPLETION CHECKLIST
- [ ] All required components created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit tests for components)
- [ ] Security requirements implemented (XSS prevention, input validation)
- [ ] Navigation integration complete and tested
- [ ] Mobile responsiveness verified on 375px viewport
- [ ] Accessibility compliance validated
- [ ] Evidence package prepared with file listings
- [ ] Screenshots of working website builder interface
- [ ] Performance metrics (<200ms component render time)

## 🚨 WEDDING CONTEXT REQUIREMENTS

### Wedding Industry Understanding:
- **Couples are not developers** - Interface must be extremely intuitive
- **Wedding websites are emotional** - Beautiful themes and easy photo integration
- **Guest communication is critical** - RSVP integration must work flawlessly
- **Mobile is essential** - 70% of guests will view on mobile devices
- **Time pressure** - Couples need to launch websites quickly (2-6 months before wedding)

### Success Criteria:
- Non-technical couple can create website in under 30 minutes
- All themes look professional and wedding-appropriate
- Mobile experience is identical to desktop functionality
- Content editing feels as easy as social media posting
- Preview updates instantly as couples make changes

---

**EXECUTE IMMEDIATELY - Focus on intuitive UI that couples will love using!**