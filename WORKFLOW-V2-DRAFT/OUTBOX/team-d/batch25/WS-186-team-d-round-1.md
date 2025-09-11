# TEAM D — BATCH 25 — ROUND 1 — WS-186 — AI Image Analysis & Wedding Style Classification

**Date:** 2025-01-26  
**Feature ID:** WS-186 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Develop AI-powered image analysis system for automatic wedding photo categorization, venue detection, and style classification  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer whose images are processed by Team B's pipeline
**I want to:** Automatic AI categorization of my wedding photos into ceremony, reception, portraits, and detail shots with venue and style tagging
**So that:** I can skip the 2-hour manual tagging process and have my portfolio automatically organized with professional metadata that helps couples find my work

**Real Wedding Problem This Solves:**
Wedding photographers take 500+ photos per wedding across 8+ hours. Manual categorization is tedious: "Is this ceremony or pre-ceremony? Is this a portrait or candid moment?" AI classification automatically detects ceremony (altar, officiant, rings), reception (dancing, cake cutting), portraits (posed vs candid), and extracts venue information from backgrounds, reducing organization time from hours to minutes.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Computer vision model for wedding photo scene classification
- Venue detection from image backgrounds and architectural features
- Style analysis (rustic, modern, traditional, outdoor, indoor)
- Couple identification and portrait categorization (individual, couple, group)
- EXIF metadata extraction and enhancement with AI insights
- Integration with Team B's image processing pipeline

**Technology Stack (VERIFIED):**
- AI/ML: OpenAI Vision API, Custom vision models
- Image Processing: TensorFlow.js, OpenCV integration
- API: Supabase Edge Functions for AI processing
- Classification: Multi-label classification models
- Integration: REST API for Team B pipeline integration

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD RELEVANT DOCS:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "openai node vision-api image-analysis latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tfjs image-classification latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions ai-integration latest documentation"});

// 3. SERENA MCP - Review AI patterns:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("AIService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/ai");
```


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core AI Analysis System):
- [ ] WeddingImageClassifier with scene detection (ceremony/reception/portraits)
- [ ] VenueDetectionService using computer vision for location identification
- [ ] StyleAnalysisEngine for wedding aesthetic classification
- [ ] MetadataEnrichmentAPI to enhance basic EXIF with AI insights
- [ ] ClassificationPipeline integration with Team B's processing system
- [ ] ModelTraining setup with wedding image datasets
- [ ] AccuracyValidation system with confidence scoring

### AI Model Architecture:
- [ ] Multi-label classification model for wedding scenes
- [ ] Venue recognition trained on wedding location datasets  
- [ ] Style classifier (rustic, modern, traditional, outdoor, etc.)
- [ ] People detection and grouping analysis
- [ ] Confidence scoring and fallback mechanisms

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Image processing pipeline integration specs - Required for AI service integration
- FROM Team A: UI requirements for confidence display - Dependency for user feedback

### What other teams NEED from you:
- TO Team B: AI classification API endpoints - CRITICAL for their processing pipeline
- TO Team A: Confidence scores and suggestions for UI display

---

## 🔒 SECURITY & PRIVACY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY AI PROCESSING SECURITY

```typescript
// ✅ SECURE AI PROCESSING PATTERN:
import { withAIValidation } from '@/lib/validation/ai-middleware';

export const analyzeWeddingImage = withAIValidation(async (imageBuffer: Buffer) => {
  // Step 1: Validate image before AI processing
  const validation = await validateImageForAI(imageBuffer);
  if (!validation.safe) {
    throw new Error('Image failed AI processing validation');
  }
  
  // Step 2: Strip sensitive EXIF before AI analysis
  const sanitizedImage = await stripPersonalEXIF(imageBuffer);
  
  // Step 3: Process with AI services
  const aiAnalysis = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [{
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${sanitizedImage.toString('base64')}` }
      }, {
        type: "text",
        text: "Classify this wedding photo into ceremony, reception, portraits, or details. Identify venue type and style."
      }]
    }]
  });
  
  return aiAnalysis;
});
```

### AI SECURITY CHECKLIST:
- [ ] **Data Privacy**: Never store or log personal image data beyond processing
- [ ] **EXIF Sanitization**: Remove GPS/personal metadata before AI analysis
- [ ] **Rate Limiting**: Prevent AI API abuse with proper throttling
- [ ] **Model Validation**: Ensure AI responses are safe and appropriate
- [ ] **Fallback Systems**: Handle AI service failures gracefully
- [ ] **Cost Control**: Monitor and limit AI processing costs

---

## 🎭 AI MODEL TESTING (MANDATORY)

```javascript
// AI CLASSIFICATION TESTING

// 1. WEDDING SCENE CLASSIFICATION ACCURACY
const testImages = [
  '/test/wedding/ceremony-altar.jpg',
  '/test/wedding/reception-dance.jpg', 
  '/test/wedding/portrait-couple.jpg'
];

for (const image of testImages) {
  const classification = await classifyWeddingImage(image);
  // Verify >85% confidence for correct category
}

// 2. VENUE DETECTION VALIDATION
const venueTest = await detectVenue('/test/wedding/outdoor-garden.jpg');
// Should identify: outdoor, garden, natural lighting

// 3. STYLE ANALYSIS ACCURACY
const styleTest = await analyzeWeddingStyle('/test/wedding/rustic-barn.jpg');
// Should detect: rustic, barn, outdoor, natural
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### AI Performance Targets:
- [ ] Wedding scene classification achieves 85%+ accuracy on test dataset
- [ ] Venue detection correctly identifies location type in 80%+ of images
- [ ] Style analysis provides meaningful tags for 90%+ of wedding photos
- [ ] Processing time under 15 seconds per image for complete AI analysis
- [ ] Confidence scoring helps users validate and correct classifications

### Integration & Reliability:
- [ ] API endpoints integrate seamlessly with Team B's pipeline
- [ ] Fallback mechanisms handle AI service failures gracefully
- [ ] Cost monitoring prevents runaway AI processing expenses
- [ ] Error handling provides useful feedback without exposing AI internals
- [ ] Performance scales to handle 1000+ images per hour

---

## 💾 WHERE TO SAVE YOUR WORK

### AI Code Files:
- Classifier: `/wedsync/src/lib/ai/wedding-image-classifier.ts`
- Venue: `/wedsync/src/lib/ai/venue-detection-service.ts`
- Style: `/wedsync/src/lib/ai/style-analysis-engine.ts`
- API: `/wedsync/src/app/api/ai/image-analysis/route.ts`
- Models: `/wedsync/src/lib/ai/models/wedding-classification.ts`
- Tests: `/wedsync/src/__tests__/ai/wedding-classification.test.ts`

---

## 📊 AI MODEL PERFORMANCE TRACKING

### Required Metrics Implementation:
- [ ] Classification accuracy tracking with confusion matrices
- [ ] Processing time monitoring per image and batch
- [ ] AI service cost tracking and budget alerts  
- [ ] User feedback collection for model improvement
- [ ] Confidence score distribution analysis

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Wedding image classifier with >85% accuracy complete
- [ ] Venue detection system working with confidence scoring
- [ ] Style analysis providing meaningful wedding aesthetic tags
- [ ] Integration API ready for Team B's processing pipeline
- [ ] Security validation and privacy protection implemented
- [ ] Performance monitoring and cost controls in place
- [ ] Evidence package includes accuracy metrics and sample results

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY