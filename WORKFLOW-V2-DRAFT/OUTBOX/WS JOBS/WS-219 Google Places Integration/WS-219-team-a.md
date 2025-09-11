# TEAM A - ROUND 1: WS-219 - Google Places Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create comprehensive Google Places frontend integration components with autocomplete search, venue details display, and location picker functionality for wedding planners
**FEATURE ID:** WS-219 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding venue discovery user experience and Google Places autocomplete performance

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/places/GooglePlacesAutocomplete.tsx
ls -la $WS_ROOT/wedsync/src/components/places/PlaceDetails.tsx
ls -la $WS_ROOT/wedsync/src/components/places/LocationPicker.tsx
ls -la $WS_ROOT/wedsync/src/hooks/useGooglePlaces.ts
cat $WS_ROOT/wedsync/src/components/places/GooglePlacesAutocomplete.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test places
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

// Query existing venue/vendor search patterns
await mcp__serena__search_for_pattern("venue.*search");
await mcp__serena__find_symbol("VenueSearch", "", true);
await mcp__serena__get_symbols_overview("src/components/venues");
await mcp__serena__find_symbol("VendorDirectory", "", true);
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
// Load Google Places API documentation
await mcp__Ref__ref_search_documentation("Google Places API React components autocomplete");
await mcp__Ref__ref_search_documentation("Google Places JavaScript SDK integration");
await mcp__Ref__ref_search_documentation("React TypeScript location picker components");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This Google Places integration requires careful analysis of: 1) Autocomplete component architecture with real-time search debouncing, 2) Venue details display with photos and ratings, 3) Location picker for wedding venue selection, 4) Integration with existing wedding planning workflows. I need to consider API rate limiting, caching strategies, and mobile responsiveness for wedding planners on-site.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down Google Places component development
2. **react-ui-specialist** - Use Serena for component consistency  
3. **security-compliance-officer** - Ensure API key security requirements
4. **code-quality-guardian** - Maintain React component standards
5. **test-automation-architect** - Comprehensive Places API testing
6. **documentation-chronicler** - Evidence-based wedding UX documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### GOOGLE PLACES API SECURITY CHECKLIST:
- [ ] **API key protection** - Never expose Google Places API key in frontend
- [ ] **Proxy API routes** - All Google Places calls go through Next.js API routes
- [ ] **Input validation** - Sanitize all venue/location search queries
- [ ] **Rate limiting** - Implement search debouncing and rate limiting
- [ ] **XSS prevention** - HTML encode all venue descriptions and reviews
- [ ] **CORS protection** - Proper origin validation for Places requests
- [ ] **Error handling** - Never leak API errors to frontend users
- [ ] **Session validation** - Verify user permissions for venue search

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone venue search without navigation integration**
**✅ MANDATORY: Google Places components must connect to wedding planning navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add "Venue Search" to wedding planning navigation
- [ ] Mobile navigation support for venue discovery on-site  
- [ ] Breadcrumbs: Dashboard > Wedding Planning > Venue Search
- [ ] Active navigation state when using Places components
- [ ] Accessibility labels for venue search navigation

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript for Google Places integration
- Responsive UI (375px, 768px, 1920px) for wedding planners on mobile/desktop
- Untitled UI + Magic UI components for autocomplete and venue cards
- Form validation and error handling for venue search
- Accessibility compliance for venue discovery workflows
- Component performance <200ms for real-time autocomplete

## 📋 TECHNICAL SPECIFICATION: WS-219 Google Places Integration

### WEDDING CONTEXT & USER STORY
**As a wedding planner helping couples find venues and vendors, I want to search for and auto-populate venue details, addresses, and contact information from Google Places, so that I can quickly add verified venue information without manual data entry, ensure accurate addresses for vendor coordination, and provide couples with rich venue details including photos, reviews, and contact info, saving 15-20 minutes per venue research.**

**Real Wedding Scenario:** A couple wants their ceremony at "Castello di Casole" in Tuscany but only knows the name. The wedding planner uses Google Places integration to search and instantly pulls in the complete address, phone number, website, photos, and exact GPS coordinates. When creating vendor lists, they search "florists near Napa Valley" and get verified flower shops with ratings and contact details.

### CORE FRONTEND COMPONENTS TO BUILD:

1. **GooglePlacesAutocomplete Component**
   - Real-time autocomplete with debouncing (300ms)
   - Wedding venue type filtering (venues, restaurants, churches, parks)
   - Keyboard navigation (arrow keys, enter, escape)
   - Loading states and error handling
   - Mobile-responsive design for on-site planning

2. **PlaceDetails Component**
   - Venue information display (name, address, phone, website)
   - Photo gallery with Google Places photos
   - Reviews and ratings display
   - Operating hours and accessibility information
   - "Add to Wedding" action button

3. **LocationPicker Component**
   - Interactive map integration for venue selection
   - Multiple venue pins for ceremony/reception comparison
   - Distance calculations between venues
   - Mobile-friendly touch interactions

4. **NearbyPlacesSearch Component**
   - Location-based vendor discovery
   - Category filtering (florists, photographers, caterers)
   - Results grid with distance sorting
   - Quick actions for contacting vendors

### TECHNICAL REQUIREMENTS:
- TypeScript interfaces for all Google Places data
- Error boundaries for API failures
- Optimistic UI updates for venue selection
- Caching of previously searched venues
- Integration with existing venue management components

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Components (MANDATORY):
- [ ] GooglePlacesAutocomplete.tsx - Real-time venue search
- [ ] PlaceDetails.tsx - Comprehensive venue information display
- [ ] LocationPicker.tsx - Interactive venue selection
- [ ] NearbyPlacesSearch.tsx - Local vendor discovery

### Hooks & Integration:
- [ ] useGooglePlaces.ts - API integration hook
- [ ] useGeolocation.ts - Location services hook
- [ ] Integration with existing VenueSearch.tsx component
- [ ] Integration with existing VendorDirectory.tsx component

### Testing & Validation:
- [ ] Unit tests for all components (>90% coverage)
- [ ] Integration tests with mock Google Places API
- [ ] Accessibility testing with screen readers
- [ ] Mobile responsiveness validation
- [ ] Performance testing for autocomplete delays

### Navigation & UX:
- [ ] Navigation integration for venue search workflows
- [ ] Breadcrumb navigation for wedding planning context
- [ ] Mobile-first design for on-site venue visits
- [ ] Loading states and error handling UX

## 💾 WHERE TO SAVE YOUR WORK
- Core Components: `$WS_ROOT/wedsync/src/components/places/`
- Hooks: `$WS_ROOT/wedsync/src/hooks/`
- Integration Updates: `$WS_ROOT/wedsync/src/components/venues/`
- Tests: `$WS_ROOT/wedsync/src/components/places/__tests__/`
- Type Definitions: `$WS_ROOT/wedsync/src/types/google-places.ts`

## 🏁 COMPLETION CHECKLIST
- [ ] All Google Places components created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit, integration, accessibility)
- [ ] Security requirements implemented (API key protection)
- [ ] Navigation integration complete with breadcrumbs
- [ ] Mobile responsiveness validated on 375px, 768px, 1920px
- [ ] Performance benchmarks met (<200ms autocomplete response)
- [ ] Wedding context preserved in all venue discovery workflows
- [ ] Evidence package prepared with file listings and test results
- [ ] Senior dev review prompt created with venue search demo

## 🎯 WEDDING INDUSTRY CONTEXT REQUIREMENTS

Every Google Places component must consider:
- **Wedding Planners** use venue search on mobile devices during site visits
- **Venue Discovery** must support ceremony AND reception venue searching
- **Vendor Coordination** requires accurate addresses for timeline planning
- **International Weddings** need global venue search capabilities
- **Real-time Updates** during venue visits and client meetings
- **Accessibility** for planners with disabilities using assistive technology

---

**EXECUTE IMMEDIATELY - Create comprehensive Google Places frontend integration for wedding venue discovery workflows!**