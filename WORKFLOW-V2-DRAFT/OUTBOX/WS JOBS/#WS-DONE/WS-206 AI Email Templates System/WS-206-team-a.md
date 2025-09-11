# TEAM A - ROUND 1: WS-206 - AI Email Templates System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete frontend AI email template generation system with variant selector and personalization preview
**FEATURE ID:** WS-206 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding vendor email personalization and AI-generated content workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/EmailTemplateGenerator.tsx
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/TemplateVariantSelector.tsx
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/EmailPersonalizationPanel.tsx
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/EmailTemplateGenerator.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test -- --testPathPattern=ai
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to AI email generation
await mcp__serena__search_for_pattern("EmailComposer");
await mcp__serena__find_symbol("MessageComposer", "", true);
await mcp__serena__get_symbols_overview("src/components/communications");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide based on feature type
// General SaaS UI (Most features):
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
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
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("OpenAI API chat completions");
await mcp__Ref__ref_search_documentation("Next.js API routes POST");
await mcp__Ref__ref_search_documentation("React useState useEffect");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequentialthinking({
  thought: "This AI email template feature requires integration with OpenAI API, real-time preview, variant selection, and personalization. I need to consider: 1) UI flow for template generation, 2) State management for variants, 3) Preview system, 4) API integration patterns, 5) Error handling for AI failures",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down AI email UI workflow into components
2. **react-ui-specialist** - Build React components with Untitled UI patterns  
3. **security-compliance-officer** - Ensure AI content validation and security
4. **code-quality-guardian** - Maintain React best practices and performance
5. **test-automation-architect** - Create comprehensive component tests
6. **documentation-chronicler** - Document AI email generation workflow

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboards, pages, and components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to Communications section
- [ ] Mobile navigation support verified  
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated for AI email templates
- [ ] Accessibility labels for navigation items

## 🎯 TEAM A SPECIALIZATION:

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance
- Component performance <200ms

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario:**
A photographer receives an inquiry at 9pm about a beach wedding. Instead of spending 20 minutes crafting a perfect response, they select "inquiry stage, outdoor venue, friendly tone" and the AI generates 5 personalized email variants mentioning their beach wedding experience, asking about the couple's vision, and including relevant portfolio links. They pick the best variant, tweak one sentence, and send. Total time: 2 minutes.

**Core Components to Build:**
1. **EmailTemplateGenerator** - Main AI generation interface with stage/tone selectors
2. **TemplateVariantSelector** - Card-based variant selection with preview
3. **EmailPersonalizationPanel** - Merge tag management and client data preview

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY COMPONENTS (MUST BUILD):

#### 1. EmailTemplateGenerator Component
**Location:** `src/components/ai/EmailTemplateGenerator.tsx`

**Features:**
- Stage selector (inquiry, booking, planning, final, post)
- Tone selector (formal, friendly, casual)
- Element checkboxes (pricing, timeline, next-steps, portfolio)
- Client context input (couple name, venue, wedding date)
- Generate button with loading state and progress indicator
- Error handling for API failures
- Success state with variant count display

**UI Requirements:**
- Uses Untitled UI form components
- Responsive design for mobile/desktop
- Loading animations with Magic UI
- Accessible form labels and ARIA attributes
- Performance: Generate request completes in <10 seconds

#### 2. TemplateVariantSelector Component
**Location:** `src/components/ai/TemplateVariantSelector.tsx`

**Features:**
- Grid layout showing 5 generated variants
- Card design with subject line preview
- Body preview (first 100 characters)
- AI confidence score display with star rating
- "Use This" button for selection
- "Edit" button for customization
- A/B test checkbox for multiple variants
- Bulk A/B test trigger button

**UI Requirements:**
- Card hover effects with Magic UI animations
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Selected state highlighting
- Loading skeletons during generation
- Performance: Renders 5 variants in <200ms

#### 3. EmailPersonalizationPanel Component
**Location:** `src/components/ai/EmailPersonalizationPanel.tsx`

**Features:**
- Merge tag list display ({{couple_names}}, {{wedding_date}}, etc.)
- Real client data preview
- Manual override options for merge tags
- Auto-personalization toggle
- Preview of personalized content
- Save personalization rules

**UI Requirements:**
- Sidebar layout for split-screen preview
- Tag picker with autocomplete
- Live preview updates
- Collapsible sections for organization
- Mobile-friendly responsive design

### INTEGRATION REQUIREMENTS:
- [ ] Integrate with existing MessageComposer component
- [ ] Connect to Communications navigation section
- [ ] Use existing client data store for personalization
- [ ] Follow established loading state patterns
- [ ] Implement consistent error handling

### STATE MANAGEMENT:
```typescript
// Create stores for:
interface EmailTemplateState {
  generatedVariants: EmailTemplate[];
  selectedVariant: EmailTemplate | null;
  generationProgress: number;
  isGenerating: boolean;
  error: string | null;
  personalizationRules: PersonalizationRule[];
}
```

### TESTING REQUIREMENTS:
- [ ] Unit tests for all components (>90% coverage)
- [ ] Integration tests for variant selection flow
- [ ] Accessibility tests with screen reader simulation
- [ ] Performance tests for large variant sets
- [ ] E2E tests for complete generation workflow

## 💾 WHERE TO SAVE YOUR WORK
- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/components/ai/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/ai-email.ts`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] 3 main components created and functional
- [ ] TypeScript compilation successful with no errors
- [ ] All component tests passing (>90% coverage)
- [ ] Responsive design works on mobile and desktop
- [ ] Navigation integration complete
- [ ] Accessibility requirements met
- [ ] Error handling implemented for API failures
- [ ] Performance benchmarks met (<200ms renders)
- [ ] Evidence package with file proofs prepared
- [ ] Senior dev review prompt created

## 🎨 DESIGN PATTERNS TO FOLLOW:

### Component Architecture:
```typescript
// Use composition pattern
<EmailTemplateGenerator
  onTemplatesGenerated={handleGenerated}
  clientContext={selectedClient}
/>

<TemplateVariantSelector
  variants={generatedTemplates}
  onSelect={handleVariantSelect}
  onEdit={handleVariantEdit}
  onABTest={handleABTest}
/>

<EmailPersonalizationPanel
  template={selectedTemplate}
  clientData={clientData}
  onPersonalize={handlePersonalization}
/>
```

### State Management:
```typescript
// Use Zustand for complex state
const useEmailTemplateStore = create<EmailTemplateState>((set) => ({
  // State and actions
}));
```

### Error Boundaries:
```typescript
// Wrap AI components in error boundaries
<ErrorBoundary fallback={<AIGenerationError />}>
  <EmailTemplateGenerator />
</ErrorBoundary>
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete AI email template frontend system!**