# TEAM A - ROUND 1: WS-184 - Style Matching Engine
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create intuitive style discovery wizard and matching results interface with advanced visual components and AI-powered aesthetic analysis
**FEATURE ID:** WS-184 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about visual design aesthetics, user experience flow, and accurate style preference capture for wedding planning

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/directory/style/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/directory/style/StyleDiscoveryWizard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/directory/style/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("style.*matching");
await mcp__serena__search_for_pattern("wizard.*component");
await mcp__serena__get_symbols_overview("src/components/directory/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("React wizard component patterns");
await mcp__Ref__ref_search_documentation("Color picker libraries React");
await mcp__Ref__ref_search_documentation("Image gallery components React");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Style matching wizard requires sophisticated visual interface design: 1) Multi-step wizard with intuitive navigation and progress tracking 2) Visual style selector with inspiration image galleries for different aesthetic categories 3) Advanced color palette picker with seasonal affinity detection and harmony validation 4) Aesthetic preference sliders for formality, vintage, nature, luxury dimensions 5) Real-time style preview showing selected aesthetic elements 6) AI-powered style analysis with confidence scoring and refinement suggestions. Must capture nuanced wedding aesthetic preferences accurately while maintaining user-friendly experience.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

### 1. **react-ui-specialist**: Advanced style discovery wizard interface
**Mission**: Create sophisticated React components for visual style preference capture and analysis
```typescript
await Task({
  subagent_type: "react-ui-specialist",
  prompt: `Create advanced style discovery wizard for WS-184 system. Must include:
  
  1. Multi-Step Wizard Interface:
  - Progressive step navigation with visual progress indicators
  - Style category selection with inspiring visual examples
  - Color palette picker with advanced harmony analysis
  - Aesthetic preference sliders with real-time visual feedback
  
  2. Visual Style Selection Components:
  - Inspiration image galleries organized by wedding aesthetic categories
  - Interactive style tag selector with visual representation
  - Seasonal affinity detection based on color and style choices
  - Real-time style preview showing combined aesthetic elements
  
  3. Advanced Color Tools:
  - Professional color palette picker with wedding color schemes
  - Harmony validation for selected color combinations
  - Color accessibility checking for various lighting conditions
  - Seasonal color recommendation engine with trend awareness
  
  Focus on creating intuitive visual interface that captures nuanced wedding aesthetic preferences accurately.`,
  description: "Style discovery wizard UI"
});
```

### 2. **ui-ux-designer**: Wedding aesthetic user experience optimization
**Mission**: Design optimal user experience for style preference capture and matching workflows
```typescript
await Task({
  subagent_type: "ui-ux-designer",
  prompt: `Design optimal UX for WS-184 style matching system. Must include:
  
  1. Style Discovery User Flow:
  - Intuitive onboarding explaining style matching benefits
  - Logical progression from broad aesthetic to specific preferences
  - Visual feedback showing how choices affect matching results
  - Simplified decision-making with guided aesthetic exploration
  
  2. Aesthetic Preference Interface:
  - Clear visual representations of different wedding styles
  - Interactive examples helping couples identify their preferences
  - Comparison tools showing style variations and impacts
  - Confidence indicators helping couples validate their choices
  
  3. Match Results Presentation:
  - Visual compatibility scoring with clear explanation
  - Portfolio preview showing style alignment with preferences
  - Filter options for refining results based on specific criteria
  - Save functionality for comparing different style profiles
  
  Focus on reducing decision paralysis while ensuring accurate aesthetic preference capture.`,
  description: "Style matching UX design"
});
```

### 3. **performance-optimization-expert**: Visual component performance optimization
**Mission**: Optimize performance for image-heavy style discovery interface and matching results
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Optimize performance for WS-184 style matching interface. Must include:
  
  1. Image Loading Optimization:
  - Progressive image loading for inspiration galleries
  - WebP format conversion with fallbacks for older browsers
  - Intelligent image compression maintaining visual quality
  - Lazy loading for large style inspiration collections
  
  2. Interactive Component Performance:
  - Debounced updates for real-time style preview generation
  - Memoization of expensive aesthetic analysis calculations
  - Virtual scrolling for large supplier match result lists
  - Optimized re-rendering for color palette updates
  
  3. Style Analysis Performance:
  - Client-side caching for previously analyzed style combinations
  - Background preloading of commonly selected style elements
  - Efficient state management for complex wizard interactions
  - Memory optimization for image-heavy aesthetic interfaces
  
  Ensure smooth interaction even with hundreds of inspiration images and complex style calculations.`,
  description: "Style interface performance"
});
```

### 4. **security-compliance-officer**: Style preference data security
**Mission**: Implement security measures for couple style preferences and aesthetic data
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security for WS-184 style preference system. Must include:
  
  1. Style Profile Data Protection:
  - Encryption of couple aesthetic preferences and style profiles
  - Secure storage of uploaded inspiration images and style data
  - Access control ensuring couples own their style profiles
  - Data retention policies for style preference information
  
  2. Privacy Protection:
  - Anonymous style matching without exposing couple identities
  - Opt-in consent for sharing style preferences with suppliers
  - Secure transmission of style analysis data to AI systems
  - GDPR compliance for aesthetic preference data collection
  
  3. Image Security:
  - Secure handling of uploaded inspiration images
  - Content validation for appropriate wedding-related imagery
  - Copyright protection for supplier portfolio images
  - Secure deletion of temporary style analysis images
  
  Ensure style preference data maintains privacy while enabling accurate matching.`,
  description: "Style data security"
});
```

### 5. **ai-ml-engineer**: Style analysis AI integration
**Mission**: Integrate AI-powered style analysis with frontend components
```typescript
await Task({
  subagent_type: "ai-ml-engineer",
  prompt: `Integrate AI style analysis for WS-184 matching system. Must include:
  
  1. Style Vector Generation:
  - Client-side integration with AI style analysis API
  - Real-time confidence scoring for style profile accuracy
  - Visual feedback showing AI-detected aesthetic elements
  - Iterative refinement based on couple feedback and preferences
  
  2. Aesthetic Similarity Visualization:
  - Visual representation of style compatibility scores
  - Interactive exploration of style matching factors
  - Explanation of why specific suppliers match aesthetic preferences
  - Confidence indicators for AI-generated style recommendations
  
  3. Machine Learning Integration:
  - Progressive learning from couple style preference feedback
  - Adaptation to emerging wedding aesthetic trends
  - Personalization based on regional and seasonal style preferences
  - A/B testing framework for style matching algorithm improvements
  
  Focus on making AI style analysis transparent and trustworthy for couples making aesthetic decisions.`,
  description: "AI style analysis integration"
});
```

### 6. **documentation-chronicler**: Style matching system documentation
**Mission**: Create comprehensive documentation for style discovery and matching system usage
```typescript
await Task({
  subagent_type: "documentation-chronicler",
  prompt: `Create comprehensive documentation for WS-184 style matching system. Must include:
  
  1. Couple User Guide:
  - Style discovery wizard walkthrough with visual examples
  - How to interpret style compatibility scores and supplier matches
  - Tips for accurately capturing aesthetic preferences
  - Understanding different wedding style categories and trends
  
  2. Aesthetic Style Reference:
  - Comprehensive guide to wedding style categories and characteristics
  - Color palette guidelines for different aesthetic preferences
  - Seasonal style considerations and trend awareness
  - Regional style variation documentation for global wedding markets
  
  3. Technical Implementation Guide:
  - Style component architecture and customization options
  - AI integration patterns for style analysis and matching
  - Performance optimization guidelines for visual components
  - Troubleshooting guide for style discovery and matching issues
  
  Enable couples and development teams to effectively understand and utilize style matching capabilities.`,
  description: "Style system documentation"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### STYLE MATCHING SECURITY:
- [ ] **Style profile encryption** - Encrypt couple aesthetic preferences and style data
- [ ] **Image security** - Secure handling of inspiration images and portfolio content
- [ ] **Privacy protection** - Anonymous matching without exposing couple identities
- [ ] **Data ownership** - Ensure couples own and control their style profiles
- [ ] **Consent management** - Opt-in consent for sharing style preferences
- [ ] **Secure transmission** - Encrypted transmission of style analysis data
- [ ] **Content validation** - Validate uploaded images for appropriate content

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Directory navigation link for "Style Discovery"
- [ ] Style matching breadcrumbs: Directory → Style Discovery → Results
- [ ] Mobile style discovery navigation support
- [ ] Quick access to style matching from main directory search

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

### SPECIFIC DELIVERABLES FOR WS-184:

#### 1. StyleDiscoveryWizard.tsx - Main style preference capture interface
```typescript
interface StyleDiscoveryWizardProps {
  onStyleProfileComplete: (profile: StyleProfile) => void;
  supplierCategory?: string;
  initialStep?: number;
  existingProfile?: Partial<StyleProfile>;
}

// Key features:
// - Multi-step wizard with visual progress tracking
// - Style category selection with inspiration image galleries
// - Advanced color palette picker with harmony validation
// - Aesthetic preference sliders with real-time visual feedback
// - AI-powered style analysis integration with confidence scoring
```

#### 2. StyleCategorySelector.tsx - Visual aesthetic category selection
```typescript
interface StyleCategorySelectorProps {
  selectedCategories: StyleCategory[];
  onCategoriesChange: (categories: StyleCategory[]) => void;
  inspirationMode: 'grid' | 'carousel' | 'comparison';
}

// Key features:
// - Visual style category grid with representative wedding images
// - Hover effects showing style category characteristics
// - Multi-select capability with visual selection indicators
// - Category description overlays explaining aesthetic elements
```

#### 3. ColorPalettePicker.tsx - Advanced wedding color selection
```typescript
interface ColorPalettePickerProps {
  selectedPalette: ColorPalette;
  onPaletteChange: (palette: ColorPalette) => void;
  seasonalRecommendations: boolean;
  harmonyValidation: boolean;
}

// Key features:
// - Professional color picker with wedding-specific palettes
// - Harmony analysis showing color relationship quality
// - Seasonal color recommendations based on wedding date
// - Accessibility checking for color contrast and visibility
```

#### 4. StyleMatchResults.tsx - Supplier matching results display
```typescript
interface StyleMatchResultsProps {
  matches: StyleMatch[];
  coupleStyleProfile: StyleProfile;
  onSupplierSelect: (supplier: Supplier) => void;
  sortBy: 'compatibility' | 'rating' | 'price' | 'location';
}

// Key features:
// - Compatibility score visualization with explanation
// - Portfolio preview showing style alignment examples
// - Filter options for refining results by specific criteria
// - Comparison mode for evaluating multiple suppliers
```

#### 5. AestheticPreferenceSliders.tsx - Dimensional preference capture
```typescript
interface AestheticPreferenceSlidersProps {
  preferences: AestheticPreferences;
  onPreferencesChange: (prefs: AestheticPreferences) => void;
  visualFeedback: boolean;
  realTimePreview: boolean;
}

// Key features:
// - Multi-dimensional sliders for formality, vintage, nature, luxury
// - Real-time visual feedback showing aesthetic impact
// - Preset combinations for common wedding style preferences
// - Interactive examples demonstrating slider effect on style matching
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-184 technical specification:
- **Visual Style Discovery**: Multi-step wizard capturing aesthetic preferences
- **AI-Powered Analysis**: Style vector generation and compatibility scoring
- **Advanced Color Tools**: Professional color palette picker with harmony analysis
- **Match Results**: Visual compatibility display with portfolio previews

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/components/directory/style/StyleDiscoveryWizard.tsx` - Main wizard interface
- [ ] `/src/components/directory/style/StyleCategorySelector.tsx` - Aesthetic category selection
- [ ] `/src/components/directory/style/ColorPalettePicker.tsx` - Advanced color selection
- [ ] `/src/components/directory/style/StyleMatchResults.tsx` - Matching results display
- [ ] `/src/components/directory/style/AestheticPreferenceSliders.tsx` - Preference capture
- [ ] `/src/components/directory/style/index.ts` - Component exports

### MUST IMPLEMENT:
- [ ] Multi-step style discovery wizard with visual progress tracking
- [ ] Visual style category selection with inspiration image galleries
- [ ] Advanced color palette picker with harmony validation and seasonal recommendations
- [ ] Aesthetic preference sliders with real-time visual feedback
- [ ] Style matching results interface with compatibility scoring visualization
- [ ] Responsive design for mobile style discovery and matching
- [ ] AI integration for real-time style analysis and confidence scoring

## 💾 WHERE TO SAVE YOUR WORK
- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/directory/style/`
- Hooks: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/hooks/useStyleMatching.ts`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/style-matching.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/components/directory/style/`

## 🏁 COMPLETION CHECKLIST
- [ ] Style discovery wizard created with multi-step interface and visual progress
- [ ] Visual style category selection implemented with inspiration galleries
- [ ] Advanced color palette picker functional with harmony validation
- [ ] Aesthetic preference sliders operational with real-time feedback
- [ ] Style matching results display completed with compatibility scoring
- [ ] Mobile-responsive design validated for all style discovery components
- [ ] AI integration functional for real-time style analysis and matching

**WEDDING CONTEXT REMINDER:** Your style matching interface helps couples planning a bohemian outdoor wedding quickly identify that their preferred sage green, terracotta, and cream palette with natural, relaxed aesthetic matches perfectly with 12 specific photographers who specialize in that exact style, rather than spending weeks manually browsing through 200+ generic portfolio listings to find aesthetic compatibility.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**