# TEAM D - ROUND 1: WS-238 - Knowledge Base System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create mobile-optimized PWA knowledge base experience for WedMe platform with offline access, voice search, and couple-specific wedding guidance
**FEATURE ID:** WS-238 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile-first wedding guidance, offline article access, and couple-friendly help systems during wedding planning

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/(wedme)/knowledge-base/
ls -la $WS_ROOT/wedsync/src/components/wedme/knowledge-base/
cat $WS_ROOT/wedsync/src/components/wedme/knowledge-base/MobileKnowledgeBase.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedme/knowledge-base
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

// Query existing WedMe mobile patterns and PWA components
await mcp__serena__search_for_pattern("wedme.*component|mobile.*optimization|pwa.*feature");
await mcp__serena__find_symbol("MobileLayout", "", true);
await mcp__serena__get_symbols_overview("src/app/(wedme)/");
```

### B. MOBILE PWA & WEDME PATTERNS (MANDATORY FOR PLATFORM WORK)
```typescript
// CRITICAL: Load mobile PWA and WedMe platform patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/components/wedme/layout/MobileLayout.tsx");
await mcp__serena__read_file("$WS_ROOT/wedsync/public/manifest.json");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for PWA patterns, offline functionality, and mobile optimization
# Use Ref MCP to search for PWA implementation, service workers, and mobile UX patterns
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for mobile PWA and couple experience architecture
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe knowledge base needs: 1) Mobile-first interface for couples on-the-go, 2) Offline article access during venue visits, 3) Voice search for hands-free use, 4) Wedding timeline-specific help, 5) Couple-friendly language vs supplier terminology. The challenge is creating an intuitive experience for stressed couples planning their wedding while ensuring essential content is available offline.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down mobile components and offline features
2. **ui-ux-designer** - Couple-centric mobile experience design
3. **security-compliance-officer** - Secure offline data and couple privacy
4. **code-quality-guardian** - Mobile performance and PWA standards
5. **test-automation-architect** - Mobile testing and offline functionality
6. **documentation-chronicler** - WedMe platform integration documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE PWA SECURITY CHECKLIST:
- [ ] **Offline data encryption** - Secure cached articles and user data
- [ ] **Service worker security** - Validate and secure service worker operations
- [ ] **Voice input privacy** - Secure voice search data handling
- [ ] **Couple data protection** - Protect personal wedding information
- [ ] **Cache security** - Secure offline content storage
- [ ] **Background sync security** - Secure background data synchronization
- [ ] **Location privacy** - Handle location-based help securely
- [ ] **Cross-platform security** - Consistent security across devices

## 🧭 MOBILE PWA ARCHITECTURE REQUIREMENTS (MANDATORY)

### WedMe Platform Integration:

**1. Mobile-First Knowledge Base Interface:**
```typescript
interface MobileKnowledgeBase {
  searchWithVoice(): Promise<SearchResult[]>;
  getOfflineArticles(): Promise<OfflineArticle[]>;
  syncOfflineContent(): Promise<SyncStatus>;
  getContextualHelp(currentPage: string): Promise<HelpContent[]>;
  getWeddingTimelineHelp(stage: WeddingStage): Promise<GuideContent[]>;
}
```

**2. Couple-Specific Content Filtering:**
```typescript
interface CoupleContentService {
  filterCoupleRelevantContent(articles: Article[]): Promise<Article[]>;
  translateSupplierTerms(content: string): Promise<string>;
  getWeddingStageGuidance(stage: WeddingStage): Promise<GuidanceContent>;
  personalizeBudgetHelp(budgetRange: BudgetRange): Promise<BudgetGuide[]>;
}
```

**3. Offline PWA Functionality:**
```typescript
interface OfflinePWAService {
  cacheEssentialArticles(): Promise<void>;
  enableBackgroundSync(): Promise<void>;
  handleOfflineSearch(query: string): Promise<OfflineSearchResult[]>;
  queueOfflineFeedback(feedback: ArticleFeedback): Promise<void>;
}
```

## 🎯 TEAM D SPECIALIZATION:

**PLATFORM/WEDME FOCUS:**
- Mobile-first design principles optimized for wedding planning couples
- PWA functionality with offline access to essential wedding guidance
- WedMe platform features integrated with knowledge base
- Offline capability for venue visits and vendor meetings
- Cross-platform compatibility ensuring consistent experience
- Mobile performance optimization with fast loading and smooth interactions

## 📋 SPECIFIC DELIVERABLES FOR ROUND 1

### Mobile PWA Components to Build:
- [ ] `MobileKnowledgeBase.tsx` - Main mobile knowledge base interface
- [ ] `VoiceSearchComponent.tsx` - Voice-activated search for hands-free use
- [ ] `OfflineArticleViewer.tsx` - Offline article reading interface
- [ ] `WeddingTimelineHelp.tsx` - Context-aware help based on wedding timeline
- [ ] `CoupleGuidanceWidget.tsx` - Couple-specific guidance and tips
- [ ] `MobileSearchResults.tsx` - Mobile-optimized search results display
- [ ] `OfflineContentManager.tsx` - Manage cached content and sync status
- [ ] `MobileFeedbackSystem.tsx` - Touch-friendly feedback and rating system

### PWA and Offline Features:
- [ ] **Service Worker Implementation:**
  - Cache essential wedding articles for offline access
  - Background sync for article updates when online
  - Offline search functionality with cached content
  - Push notifications for new relevant content

- [ ] **Voice Search Integration:**
  - Voice-to-text search activation
  - Wedding terminology recognition
  - Hands-free article navigation
  - Accessibility compliance for voice interactions

- [ ] **Mobile Performance Optimization:**
  - Lazy loading for article content and images
  - Progressive image loading with placeholders
  - Touch gesture support for navigation
  - Fast article switching with preloading

### WedMe Platform Features:
- [ ] **Wedding Stage-Specific Help:**
  - Engagement stage: Venue research, budget planning
  - Planning stage: Vendor coordination, timeline creation
  - Pre-wedding stage: Final details, day-of logistics
  - Post-wedding stage: Thank you notes, vendor reviews

- [ ] **Couple-Friendly Content Translation:**
  - Convert supplier terminology to couple-friendly language
  - Simplify technical wedding processes
  - Provide visual guides with illustrations
  - Include real couple success stories

- [ ] **Contextual Mobile Help:**
  - Location-aware venue guidance
  - Budget-specific advice and tips
  - Season-appropriate wedding help
  - Regional wedding custom information

### Offline and Sync Functionality:
- [ ] Cache management for essential articles
- [ ] Offline search with pre-indexed content
- [ ] Background sync when connectivity returns
- [ ] Offline feedback queuing and sync
- [ ] Progressive content updates
- [ ] Selective content caching based on wedding timeline

## 💾 WHERE TO SAVE YOUR WORK
- WedMe Components: $WS_ROOT/wedsync/src/components/wedme/knowledge-base/
- WedMe Pages: $WS_ROOT/wedsync/src/app/(wedme)/knowledge-base/
- PWA Services: $WS_ROOT/wedsync/src/lib/pwa/knowledge-base/
- Service Worker: $WS_ROOT/wedsync/public/sw/
- Types: $WS_ROOT/wedsync/src/types/wedme.ts
- Tests: $WS_ROOT/wedsync/tests/wedme/knowledge-base/

## 🏁 COMPLETION CHECKLIST
- [ ] All WedMe knowledge base components created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All mobile component tests passing (>90% coverage)
- [ ] Security requirements implemented (offline data encryption, privacy)
- [ ] PWA functionality operational (offline access, service worker)
- [ ] Voice search implemented and tested
- [ ] Mobile performance optimized (<3s load time)
- [ ] Wedding timeline integration complete
- [ ] Couple-friendly content translation working
- [ ] Cross-platform compatibility verified
- [ ] Evidence package prepared with mobile test results
- [ ] Senior dev review prompt created

## 🌟 COUPLE WEDDING PLANNING SUCCESS SCENARIOS

**Scenario 1**: Couple Sarah and Mike are touring venues without wifi. They access offline cached articles about "venue questions to ask" and "contract red flags" directly from their WedMe app, making informed decisions during their visits.

**Scenario 2**: Bride Emma is driving to a florist meeting and uses voice search to ask "How much should I budget for wedding flowers?" The mobile knowledge base provides audio-friendly guidance while she's hands-free.

**Scenario 3**: Couple planning their destination wedding in rural area with poor connectivity. They've pre-cached essential articles about "destination wedding logistics" and "vendor coordination" for offline access during their planning retreat.

---

**EXECUTE IMMEDIATELY - This is a comprehensive mobile PWA prompt with all couple-centric and offline requirements for WedMe knowledge base!**