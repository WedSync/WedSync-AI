# TEAM A - ROUND 1: WS-238 - Knowledge Base System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create comprehensive frontend interface for self-service knowledge base system that reduces wedding supplier support tickets by 40% through intelligent search and contextual help
**FEATURE ID:** WS-238 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding supplier workflow integration and context-aware help patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/knowledge-base/
ls -la $WS_ROOT/wedsync/src/app/(dashboard)/knowledge-base/
cat $WS_ROOT/wedsync/src/components/knowledge-base/KnowledgeBaseInterface.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test knowledge-base
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

// Query specific areas relevant to knowledge base feature
await mcp__serena__search_for_pattern("search.*component|help.*widget|article.*display");
await mcp__serena__find_symbol("SearchInput", "", true);
await mcp__serena__get_symbols_overview("src/components/ui/search/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for general SaaS features
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
// Load documentation for knowledge base UI patterns and search interfaces
# Use Ref MCP to search for relevant documentation about search interfaces and help systems
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex knowledge base interface architecture decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This knowledge base system needs to serve wedding suppliers with varying tech expertise. I need to consider: intelligent search with autocomplete, categorized articles, contextual help widget, article rating system, and mobile-optimized interface. The challenge is making it intuitive for photographers, florists, and venue coordinators who may not be tech-savvy.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down knowledge base UI components and dependencies
2. **react-ui-specialist** - Create accessible, performant search and article interfaces  
3. **security-compliance-officer** - Ensure secure content access and user data protection
4. **code-quality-guardian** - Maintain code standards for search performance
5. **test-automation-architect** - Comprehensive testing for search functionality
6. **documentation-chronicler** - Evidence-based documentation with UI screenshots

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FRONTEND SECURITY CHECKLIST:
- [ ] **Input sanitization** - All search queries and user input sanitized
- [ ] **XSS prevention** - HTML content properly escaped in article display
- [ ] **Authentication state management** - Secure session handling for user-specific help
- [ ] **Content access control** - Respect article visibility permissions
- [ ] **Search query validation** - Prevent injection attacks in search
- [ ] **Rate limiting feedback** - Handle search rate limits gracefully
- [ ] **Secure article links** - Validate and sanitize external links in articles
- [ ] **Privacy compliance** - Handle user search history according to privacy policies

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboards, pages, and components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to main dashboard sidebar
- [ ] Mobile navigation support with knowledge base icon  
- [ ] Navigation states (active/current) for knowledge base sections
- [ ] Breadcrumbs for article navigation and search results
- [ ] Accessibility labels for knowledge base navigation items

## 🎯 TEAM A SPECIALIZATION:

**FRONTEND/UI FOCUS:**
- React components with TypeScript for knowledge base interface
- Responsive UI (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components only for search and article display
- Form validation and error handling for search and feedback
- Accessibility compliance for screen readers and keyboard navigation
- Component performance <200ms for search and article loading

## 📋 WS-238 KNOWLEDGE BASE SYSTEM - TECHNICAL SPECIFICATION

### Core Frontend Requirements:

**1. Intelligent Search Interface:**
- Real-time search with <0.5s response time
- Autocomplete with wedding industry terminology
- Search filters: category, supplier type, difficulty level
- Search history and saved searches functionality
- Voice search support for mobile users

**2. Article Display System:**
- Rich text articles with embedded images and videos
- Step-by-step tutorial layouts with progress tracking
- Interactive elements (expandable sections, code snippets)
- Article rating and feedback system
- Related articles and suggested next steps
- Print-friendly article layouts

**3. Context-Aware Help Widget:**
- Floating help button with contextual suggestions
- Page-specific help content that appears automatically
- Smart detection of user confusion (time spent, mouse patterns)
- Quick access to relevant articles based on current page
- Help widget customization based on supplier type

**4. Mobile-Optimized Experience:**
- Touch-friendly search interface
- Swipeable article navigation
- Offline article caching for key content
- Voice-to-text search functionality
- Mobile-specific help patterns

### Wedding Industry Context:
- **Photography Studios**: Quick access to client workflow setup, photo delivery guides
- **Venue Coordinators**: Event timeline management, vendor coordination articles  
- **Florists**: Seasonal arrangement guides, delivery scheduling help
- **Caterers**: Menu planning assistance, dietary requirement management
- **Wedding Planners**: Master timeline creation, multi-vendor coordination

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Frontend Components to Build:
- [ ] `KnowledgeBaseInterface.tsx` - Main knowledge base dashboard
- [ ] `IntelligentSearchBar.tsx` - Search interface with autocomplete
- [ ] `ArticleDisplay.tsx` - Rich article rendering component  
- [ ] `ContextualHelpWidget.tsx` - Floating help widget
- [ ] `ArticleRating.tsx` - Rating and feedback system
- [ ] `KnowledgeBaseNavigation.tsx` - Category and filter navigation
- [ ] `SearchResults.tsx` - Search results display with pagination
- [ ] `TutorialProgress.tsx` - Step-by-step tutorial progress tracker

### UI/UX Requirements:
- [ ] Responsive design working on all device sizes
- [ ] Fast search performance with loading states
- [ ] Intuitive article categorization and filtering
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Error handling for failed searches and loading
- [ ] Clean, professional design matching wedding industry expectations

### Integration Points:
- [ ] Connect to existing dashboard navigation
- [ ] Integrate with user authentication system
- [ ] Link to supplier profile for personalized help
- [ ] Connect to notification system for help alerts

## 💾 WHERE TO SAVE YOUR WORK
- Code: $WS_ROOT/wedsync/src/components/knowledge-base/
- Pages: $WS_ROOT/wedsync/src/app/(dashboard)/knowledge-base/
- Types: $WS_ROOT/wedsync/src/types/knowledge-base.ts
- Tests: $WS_ROOT/wedsync/tests/components/knowledge-base/

## 🏁 COMPLETION CHECKLIST
- [ ] All knowledge base frontend components created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All component tests passing (>90% coverage)
- [ ] Security requirements implemented (input sanitization, XSS prevention)
- [ ] Navigation integration complete with proper routing
- [ ] Responsive design validated on mobile, tablet, desktop
- [ ] Accessibility compliance verified with screen readers
- [ ] Performance benchmarks met (<200ms component rendering)
- [ ] Wedding industry context properly implemented
- [ ] Evidence package prepared with screenshots and test results
- [ ] Senior dev review prompt created

## 🌟 WEDDING SUPPLIER SUCCESS SCENARIOS

**Scenario 1**: Wedding photographer Sarah is setting up client questionnaires for the first time. She searches "client questionnaire setup" and immediately finds a step-by-step tutorial with screenshots, completing setup in 5 minutes instead of waiting hours for support.

**Scenario 2**: Venue coordinator Mike encounters an error during event timeline creation. The contextual help widget detects his confusion and suggests relevant troubleshooting articles, resolving the issue without leaving his workflow.

**Scenario 3**: Florist Lisa needs to understand seasonal pricing adjustments on mobile while at a client meeting. She uses voice search to find pricing guides optimized for mobile viewing, accessing the information instantly.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for wedding industry knowledge base frontend development!**