# TEAM A - ROUND 1: WS-252 - Music Database Integration
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build comprehensive music search UI with AI-powered wedding appropriateness analysis and multi-provider integration
**FEATURE ID:** WS-252 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding DJ workflow optimization and vague song request resolution

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/music/
cat $WS_ROOT/wedsync/src/components/music/MusicDatabase.tsx | head -20
ls -la $WS_ROOT/wedsync/src/app/(dashboard)/music/
cat $WS_ROOT/wedsync/src/app/(dashboard)/music/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test music
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧭 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: Music Database must integrate into DJ dashboard navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add Music Database to main dashboard navigation in layout.tsx
- [ ] Create "Music Tools" section with music note icon (Lucide: Music)
- [ ] Add mobile navigation support for music features  
- [ ] Implement breadcrumb navigation: "Dashboard > Music > Database"
- [ ] Add active state highlighting for music tool sections
- [ ] Include accessibility labels: "AI-powered music tools for wedding DJs"

### NAVIGATION CODE PATTERN:
```typescript
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
{
  title: "Music Database",
  href: "/music/database", 
  icon: Music,
  description: "AI-powered music search and wedding appropriateness analysis"
}
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query music-related patterns
await mcp__serena__search_for_pattern("search music audio player component");
await mcp__serena__find_symbol("SearchInput Button Modal", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/ui/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for music features
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)  
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY (Music, Play, Pause, Volume2, Heart, etc.)

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to music features
# Use Ref MCP to search for:
# - "React audio player components patterns"
# - "Spotify Web API TypeScript SDK"
# - "Next.js search interface components"
# - "Tailwind responsive music UI layouts"
# - "Untitled UI component library documentation"
# - "Magic UI animation components"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX MUSIC UI PLANNING

### Frontend-Specific Sequential Thinking for Music Database

```typescript
// Complex music search UI architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Music Database UI needs: multi-provider search interface (Spotify/Apple Music), real-time appropriateness scoring, song request resolution for vague queries, playlist builder with drag-drop, audio preview playback, and wedding categorization (ceremony/cocktail/dinner/dancing).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management complexity: Search results from multiple providers need deduplication, appropriateness scores require AI analysis state, song request resolution needs confidence levels, playlist building needs drag-drop state, audio playback needs global player state. Consider using React Query for API state, Zustand for UI state.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: MusicDatabase (main container), SongSearch (multi-provider search), AppropriatenessChecker (AI scoring), SongRequestResolver (vague query handler), PlaylistBuilder (drag-drop), AudioPreview (playback controls). Each needs TypeScript interfaces and error boundaries.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding DJ UX considerations: DJs work under time pressure, need quick access to appropriate songs, must handle vague client requests ('something romantic by Taylor Swift'), require confidence indicators for song choices, need visual wedding suitability indicators, mobile optimization for venue usage.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build search interface first, integrate AI appropriateness display, add song request resolution with confidence UI, create playlist builder with wedding timeline segments, add audio preview with proper licensing, ensure mobile-responsive design with touch optimization.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive music UI requirements:

1. **task-tracker-coordinator** --music-ui-focus --wedding-context --dependency-tracking
   - Mission: Break down music UI components, track integration dependencies
   
2. **react-ui-specialist** --untitled-ui-components --magic-ui-animations --music-interface
   - Mission: Use Serena to find UI patterns, build with Untitled UI components only
   
3. **security-compliance-officer** --ui-security --input-validation --wedding-data-protection  
   - Mission: Ensure music search forms have proper validation
   
4. **code-quality-guardian** --component-consistency --pattern-enforcement --typescript-strict
   - Mission: Maintain consistency with existing UI components
   
5. **test-automation-architect** --component-testing --accessibility-testing --mobile-testing
   - Mission: Write comprehensive tests for music UI components
   
6. **documentation-chronicler** --ui-documentation --component-examples --wedding-context
   - Mission: Document music UI components with wedding use cases

## 🎯 TECHNICAL SPECIFICATION

**Core Requirements from WS-252:**
- Multi-provider music search (Spotify, Apple Music, YouTube)
- AI-powered wedding appropriateness analysis with confidence scoring
- Vague song request resolution ("that romantic song by Bruno Mars") 
- Wedding category tagging (ceremony, cocktail, dinner, dancing)
- Playlist generation with energy flow optimization
- Audio preview integration with proper licensing
- Do-not-play intelligence with alternative suggestions

## 🎨 UI IMPLEMENTATION REQUIREMENTS

### Core Components to Build:

**1. MusicDatabase.tsx (Main Container)**
```typescript
interface MusicDatabaseProps {
  weddingId?: string;
  onTrackSelect?: (track: Track) => void;
  initialSearchMode?: 'ceremony' | 'cocktail' | 'dinner' | 'dancing';
}

// Features:
// - Multi-provider search tabs (Spotify, Apple Music, YouTube)
// - Real-time appropriateness checking with visual indicators
// - Wedding context-aware search suggestions
// - Batch operations for playlist building
```

**2. SongSearch.tsx (Search Interface)**
- Advanced search filters (genre, era, energy level, explicit content)
- Real-time search suggestions
- Provider-specific search options
- Search history and saved queries

**3. AppropriatenessChecker.tsx (AI Analysis Display)**
- Color-coded appropriateness scoring (green/yellow/red)
- Detailed reasoning display for flagged content
- Alternative song suggestions for inappropriate tracks
- Manual override capabilities with notes

**4. SongRequestResolver.tsx (Vague Query Handler)**
- Natural language query interface
- AI interpretation results with confidence levels
- Multiple match suggestions with reasoning
- Clarification question prompts

**5. PlaylistBuilder.tsx (Drag-Drop Playlist)**
- Timeline-based organization (ceremony, cocktail, dinner, dancing)
- Drag-and-drop track reordering
- Energy flow visualization
- Export options (Spotify, Apple Music playlists)

**6. AudioPreview.tsx (Playback Controls)**
- 30-second preview playback
- Volume controls and progress bar
- Playlist preview mode
- Licensing compliance indicators

### UI/UX Design Requirements:

**Visual Design:**
- Clean, professional interface suitable for DJ workflow
- Wedding-themed color coding for appropriateness levels
- Clear visual hierarchy with search → results → playlist flow
- Responsive design optimized for tablet and mobile use

**Interaction Design:**
- Fast keyboard navigation for professional DJ use
- Touch-friendly controls for mobile venue management
- Drag-and-drop playlist building
- Quick access to recently searched or frequently used songs

**Accessibility:**
- Screen reader support for all music information
- High contrast mode for low-light venue conditions  
- Keyboard-only navigation support
- Clear focus indicators and aria-labels

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Core music search interface with multi-provider integration
- [ ] Wedding appropriateness display with AI confidence scoring
- [ ] Song request resolution interface for vague queries
- [ ] Basic playlist builder with drag-drop functionality
- [ ] Navigation integration complete (dashboard menu, mobile nav)
- [ ] Responsive design tested at 375px, 768px, 1920px breakpoints
- [ ] Unit tests for all components (>80% coverage)
- [ ] Accessibility compliance verification

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Form Security Checklist:
- [ ] **Search input validation** - Use secureStringSchema for all search queries
- [ ] **XSS prevention** - Sanitize all music metadata display (song titles, artists)
- [ ] **CSRF protection** - Automatic with Next.js forms
- [ ] **Rate limiting** - Client-side debouncing for search requests
- [ ] **Content filtering** - Validate explicit content flags
- [ ] **Error handling** - Never expose API keys or internal errors

### REQUIRED SECURITY IMPORTS:
```typescript
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
```

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```typescript
// 1. MUSIC SEARCH INTERFACE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/music/database"});

// Test multi-provider search
await mcp__playwright__browser_type({
  element: 'search input',
  ref: '[data-testid="music-search"]', 
  text: 'Perfect by Ed Sheeran'
});

await mcp__playwright__browser_click({
  element: 'search button',
  ref: '[data-testid="search-button"]'
});

// Wait for results and appropriateness analysis
await mcp__playwright__browser_wait_for({text: 'Wedding Suitability'});
await mcp__playwright__browser_wait_for({text: 'Appropriate for ceremony'});

// 2. SONG REQUEST RESOLUTION TESTING
await mcp__playwright__browser_type({
  element: 'request input',
  ref: '[data-testid="song-request"]',
  text: 'that romantic song by Bruno Mars'
});

await mcp__playwright__browser_click({
  element: 'resolve button',
  ref: '[data-testid="resolve-request"]'
});

await mcp__playwright__browser_wait_for({text: 'Possible matches'});

// 3. PLAYLIST BUILDER TESTING
await mcp__playwright__browser_drag({
  startElement: 'first search result',
  startRef: '[data-testid="track-0"]',
  endElement: 'ceremony playlist',
  endRef: '[data-testid="ceremony-tracks"]'
});

// 4. MOBILE RESPONSIVENESS TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({
    filename: `music-database-${width}px.png`,
    fullPage: true
  });
}

// 5. ACCESSIBILITY TESTING
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Verify screen reader support for music metadata
```

## 💾 WHERE TO SAVE YOUR WORK

- **Main Page**: `$WS_ROOT/wedsync/src/app/(dashboard)/music/page.tsx`
- **Components**: `$WS_ROOT/wedsync/src/components/music/`
  - `MusicDatabase.tsx`
  - `SongSearch.tsx`
  - `AppropriatenessChecker.tsx`
  - `SongRequestResolver.tsx`
  - `PlaylistBuilder.tsx`
  - `AudioPreview.tsx`
- **Types**: `$WS_ROOT/wedsync/src/types/music.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/components/music/`
- **Styles**: Use Tailwind classes only (no custom CSS files)

## 🏁 COMPLETION CHECKLIST

### Technical Implementation:
- [ ] All components created and functional
- [ ] Navigation integration complete (dashboard + mobile)
- [ ] TypeScript compilation successful (zero errors)
- [ ] Unit tests passing (>80% coverage)
- [ ] Accessibility compliance verified
- [ ] Mobile responsiveness tested

### UI/UX Quality:
- [ ] Untitled UI components used exclusively
- [ ] Magic UI animations implemented appropriately
- [ ] Wedding-appropriate color coding and theming
- [ ] Professional DJ workflow optimization
- [ ] Touch-friendly mobile interface

### Integration Points:
- [ ] Ready for Team B API integration
- [ ] Prepared for Team C multi-provider connections
- [ ] Designed for Team D mobile optimization
- [ ] Structured for Team E comprehensive testing

### Evidence Package:
- [ ] Screenshots of all major components
- [ ] Demo video of key user flows
- [ ] Accessibility audit results
- [ ] Performance metrics (component render times)
- [ ] Mobile device testing results

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**