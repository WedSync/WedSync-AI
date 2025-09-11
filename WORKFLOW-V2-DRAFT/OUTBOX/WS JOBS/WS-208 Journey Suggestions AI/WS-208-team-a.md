# TEAM A - ROUND 1: WS-208 - AI Journey Suggestions System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete frontend AI journey generation interface with vendor-specific controls, journey visualization, and intelligent optimization suggestions
**FEATURE ID:** WS-208 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding vendor journey workflows, AI-powered journey creation, and visual journey design interfaces

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/JourneySuggestionsPanel.tsx
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/GeneratedJourneyPreview.tsx
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/VendorSpecificControls.tsx
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/JourneySuggestionsPanel.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test -- --testPathPattern=ai/journey
# MUST show: "All AI journey tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to journey management
await mcp__serena__search_for_pattern("journey");
await mcp__serena__find_symbol("JourneyCanvas", "", true);
await mcp__serena__get_symbols_overview("src/components/journey");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
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
await mcp__Ref__ref_search_documentation("React drag and drop journey builder");
await mcp__Ref__ref_search_documentation("AI generated content interfaces");
await mcp__Ref__ref_search_documentation("Journey visualization components");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "The AI journey suggestions system needs: 1) Vendor-specific controls for service type and timeline input, 2) AI-powered journey generation with visual preview, 3) Interactive journey editor with drag-and-drop, 4) Performance prediction display, 5) Optimization suggestions based on industry data. I need to consider wedding vendor workflows, journey visualization patterns, and AI result presentation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down AI journey generation workflow
2. **react-ui-specialist** - Build journey components with Untitled UI
3. **security-compliance-officer** - Ensure safe AI content handling
4. **code-quality-guardian** - Maintain React best practices
5. **test-automation-architect** - Create comprehensive UI tests
6. **documentation-chronicler** - Document AI journey workflow

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **Input validation** - Validate all journey generation parameters
- [ ] **XSS prevention** - Sanitize all AI-generated content display
- [ ] **Content Security Policy** - Prevent script injection in journey nodes
- [ ] **Authentication check** - Verify user permissions for journey creation
- [ ] **Rate limiting UI** - Prevent excessive AI generation requests
- [ ] **Error message sanitization** - Don't expose AI service details
- [ ] **Safe content rendering** - Escape all AI-generated journey content
- [ ] **Journey data validation** - Validate journey structure before saving

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**✅ MANDATORY: All AI journey components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to Journey/AI section
- [ ] Mobile navigation support verified  
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated for AI journey workflow
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
A luxury wedding photographer needs to create different customer journeys for engagement sessions (12+ month timeline), elopements (2-3 months), and destination weddings. The AI system generates optimal touchpoint sequences, timing recommendations, and vendor-specific content while providing performance predictions and optimization suggestions.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY COMPONENTS (MUST BUILD):

#### 1. JourneySuggestionsPanel Component
**Location:** `src/components/ai/JourneySuggestionsPanel.tsx`

**Main Interface Features:**
- Vendor type selection with visual icons
- Service level controls (basic, premium, luxury)
- Timeline input with month slider
- Client preference settings
- AI generation trigger button
- Loading states with progress indicators
- Error handling with retry options
- Generated journey results display

**Implementation Pattern:**
```typescript
export function JourneySuggestionsPanel({
  onJourneyGenerated,
  onJourneySaved
}: JourneySuggestionsPanelProps) {
  const [generationRequest, setGenerationRequest] = useState<JourneySuggestionRequest>({
    vendorType: 'photographer',
    serviceLevel: 'premium',
    weddingTimeline: 12,
    clientPreferences: {
      communicationStyle: 'friendly',
      frequency: 'regular'
    }
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJourney, setGeneratedJourney] = useState<GeneratedJourney | null>(null);
  
  const handleGenerateJourney = async () => {
    setIsGenerating(true);
    try {
      const journey = await journeyAI.generateJourney(generationRequest);
      setGeneratedJourney(journey);
      onJourneyGenerated(journey);
    } catch (error) {
      handleGenerationError(error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="ai-journey-suggestions-panel">
      <VendorSpecificControls 
        request={generationRequest}
        onChange={setGenerationRequest}
      />
      <GenerationControls 
        isGenerating={isGenerating}
        onGenerate={handleGenerateJourney}
      />
      {generatedJourney && (
        <GeneratedJourneyPreview 
          journey={generatedJourney}
          onSave={onJourneySaved}
        />
      )}
    </div>
  );
}
```

#### 2. VendorSpecificControls Component
**Location:** `src/components/ai/VendorSpecificControls.tsx`

**Vendor Selection Features:**
- Visual vendor type cards with icons
- Service level radio buttons with descriptions
- Timeline slider with month markers
- Client preference toggles
- Real-time validation feedback
- Vendor-specific help text and examples

**Wedding Vendor Types:**
```typescript
const VENDOR_TYPES = {
  photographer: {
    icon: 'Camera',
    label: 'Wedding Photography',
    description: 'Capture moments and memories',
    commonTimelines: [3, 6, 12, 18],
    serviceDescriptions: {
      basic: 'Essential coverage and edited photos',
      premium: 'Full day coverage with engagement session',
      luxury: 'Multiple photographers and premium albums'
    }
  },
  caterer: {
    icon: 'ChefHat',
    label: 'Wedding Catering',
    description: 'Create memorable dining experiences',
    commonTimelines: [6, 12, 18],
    serviceDescriptions: {
      basic: 'Buffet service with standard menu',
      premium: 'Plated service with menu customization',
      luxury: 'Multi-course tasting with specialty options'
    }
  },
  dj: {
    icon: 'Music',
    label: 'Wedding DJ & Entertainment',
    description: 'Provide music and entertainment',
    commonTimelines: [3, 6, 12],
    serviceDescriptions: {
      basic: 'Music and basic lighting',
      premium: 'MC services with enhanced audio',
      luxury: 'Full entertainment with custom lighting'
    }
  },
  venue: {
    icon: 'Building2',
    label: 'Wedding Venue',
    description: 'Provide the perfect setting',
    commonTimelines: [12, 18, 24],
    serviceDescriptions: {
      basic: 'Venue space with basic amenities',
      premium: 'Venue with coordination services',
      luxury: 'Full-service venue with premium features'
    }
  },
  planner: {
    icon: 'ClipboardList',
    label: 'Wedding Planning',
    description: 'Coordinate the perfect day',
    commonTimelines: [6, 12, 18, 24],
    serviceDescriptions: {
      basic: 'Day-of coordination',
      premium: 'Partial planning with vendor management',
      luxury: 'Full-service planning with design'
    }
  }
};
```

#### 3. GeneratedJourneyPreview Component
**Location:** `src/components/ai/GeneratedJourneyPreview.tsx`

**Preview Features:**
- Visual journey timeline with nodes
- Interactive node details on hover
- Drag-and-drop node reordering
- Node editing capabilities
- Performance metrics display
- Confidence score visualization
- Save and export options
- Customization recommendations

**Journey Node Display:**
```typescript
export function GeneratedJourneyPreview({
  journey,
  onNodeEdit,
  onSave
}: GeneratedJourneyPreviewProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<JourneyNode | null>(null);
  
  return (
    <div className="generated-journey-preview">
      <JourneyMetrics 
        confidence={journey.metadata.confidence}
        performance={journey.metadata.estimatedPerformance}
      />
      
      <JourneyTimeline 
        nodes={journey.nodes}
        selectedNode={selectedNode}
        onNodeSelect={setSelectedNode}
        onNodeEdit={setEditingNode}
      />
      
      <OptimizationSuggestions 
        journey={journey}
        onApplySuggestion={handleApplySuggestion}
      />
      
      <PreviewActions 
        onSave={() => onSave(journey)}
        onCustomize={() => openCustomizationModal()}
      />
    </div>
  );
}
```

#### 4. PerformancePredictionDisplay Component
**Location:** `src/components/ai/PerformancePredictionDisplay.tsx`

**Prediction Features:**
- Completion rate estimates
- Engagement score predictions
- Time to completion forecasts
- Client satisfaction metrics
- Industry benchmark comparisons
- Confidence intervals

#### 5. OptimizationSuggestions Component
**Location:** `src/components/ai/OptimizationSuggestions.tsx`

**Optimization Features:**
- AI-powered improvement recommendations
- Timing optimization suggestions
- Content enhancement ideas
- Industry best practice tips
- A/B testing recommendations
- Performance improvement predictions

### UI REQUIREMENTS:
- [ ] Responsive design for mobile and desktop
- [ ] Loading states with skeleton screens
- [ ] Error states with clear messaging and retry options
- [ ] Success states with journey preview
- [ ] Accessibility support (ARIA labels, keyboard navigation)
- [ ] Touch-friendly on mobile
- [ ] Performance optimized (<200ms interactions)

### STATE MANAGEMENT:
```typescript
// AI Journey Generation Store
interface JourneyGenerationState {
  currentRequest: JourneySuggestionRequest;
  isGenerating: boolean;
  generatedJourney: GeneratedJourney | null;
  selectedNodes: string[];
  editingNode: JourneyNode | null;
  optimizationSuggestions: OptimizationSuggestion[];
  error: string | null;
  
  // Actions
  updateRequest: (updates: Partial<JourneySuggestionRequest>) => void;
  generateJourney: () => Promise<void>;
  selectNode: (nodeId: string) => void;
  editNode: (node: JourneyNode) => void;
  applyOptimization: (suggestionId: string) => void;
  saveJourney: (journey: GeneratedJourney) => Promise<void>;
}
```

### INTEGRATION REQUIREMENTS:
- [ ] Connect to existing journey management system
- [ ] Integrate with journey canvas for editing
- [ ] Use established loading patterns
- [ ] Follow existing error handling
- [ ] Connect to user feedback system

### TESTING REQUIREMENTS:
- [ ] Unit tests for all components (>90% coverage)
- [ ] Integration tests for AI generation flow
- [ ] Accessibility tests
- [ ] Mobile responsiveness tests
- [ ] Performance tests for journey visualization

## 💾 WHERE TO SAVE YOUR WORK
- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ai/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/components/ai/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/journey-ai.ts`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] AI journey suggestions panel created and functional
- [ ] Vendor-specific controls with all wedding vendor types
- [ ] Generated journey preview with interactive features
- [ ] Performance prediction display working
- [ ] Optimization suggestions component functional
- [ ] TypeScript compilation successful
- [ ] All component tests passing (>90% coverage)
- [ ] Responsive design verified
- [ ] Navigation integration complete
- [ ] Accessibility requirements met
- [ ] Error handling comprehensive
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 🎨 DESIGN PATTERNS TO FOLLOW:

### Vendor Type Selection:
```typescript
// Visual vendor selection cards
<VendorTypeGrid>
  {Object.entries(VENDOR_TYPES).map(([type, config]) => (
    <VendorTypeCard
      key={type}
      type={type}
      config={config}
      isSelected={selectedVendor === type}
      onClick={() => setSelectedVendor(type)}
    />
  ))}
</VendorTypeGrid>
```

### Journey Timeline Visualization:
```typescript
// Interactive journey timeline
<JourneyTimeline>
  {journey.nodes.map((node, index) => (
    <JourneyNode
      key={node.id}
      node={node}
      position={index}
      isSelected={selectedNode === node.id}
      onClick={() => selectNode(node.id)}
      onEdit={() => editNode(node)}
    />
  ))}
</JourneyTimeline>
```

### Performance Metrics Display:
```typescript
// Performance prediction cards
<MetricsGrid>
  <MetricCard 
    label="Completion Rate"
    value={performance.completionRate}
    confidence={confidence}
    benchmark={industryBenchmark.completionRate}
  />
  <MetricCard 
    label="Engagement Score"
    value={performance.engagementScore}
    confidence={confidence}
    benchmark={industryBenchmark.engagementScore}
  />
</MetricsGrid>
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt for building the complete AI journey suggestions frontend with vendor-specific controls and journey visualization!**