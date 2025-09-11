# TEAM A - ROUND 1: WS-220 - Weather API Integration
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive weather dashboard and forecast display components for wedding planners to monitor weather conditions for outdoor ceremonies
**FEATURE ID:** WS-220 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about outdoor wedding planning and weather alert user experience

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/weather/
cat $WS_ROOT/wedsync/src/components/weather/WeatherDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test weather
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

// Query weather-related patterns
await mcp__serena__search_for_pattern("weather forecast api integration");
await mcp__serena__find_symbol("WeatherComponent Dashboard", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/");
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
# Use Ref MCP to search for:
# - "Next.js server-components weather-api"
# - "React hooks weather-data state-management"
# - "Tailwind CSS responsive-design dashboard-layout"
# - "TypeScript interfaces weather-api types"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing dashboard patterns
await mcp__serena__find_referencing_symbols("Dashboard Card Component");
await mcp__serena__search_for_pattern("useEffect useState weather");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Weather Dashboard UI Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Weather dashboard for wedding planning needs: real-time weather display, 15-day forecast with wedding date highlighting, severe weather alerts, mobile-responsive design for on-site coordination, integration with wedding timeline components. Each component requires different data visualization and interaction patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management analysis: Weather data needs periodic refresh (every 30 minutes), forecast data requires caching for performance, severe weather alerts need real-time notifications, wedding date context affects forecast highlighting. Consider React Query for server state, Zustand for UI state management.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: WeatherDashboard (main container), WeatherCard (current conditions), ForecastTimeline (15-day view), WeatherAlerts (notification system), MobileWeatherWidget (compact view). Each needs proper TypeScript interfaces and loading states.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding UX considerations: Outdoor wedding planners need quick weather assessment, photographers need lighting condition info, couples need temperature guidance for attire. Interface must work on mobile during venue visits, provide actionable insights, and integrate seamlessly with existing wedding planning workflow.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track weather component development progress
2. **react-ui-specialist** - Build Untitled UI weather components
3. **security-compliance-officer** - Validate weather API integration security
4. **code-quality-guardian** - Ensure pattern consistency
5. **test-automation-architect** - Create comprehensive weather component tests
6. **documentation-chronicler** - Document weather dashboard usage

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
- [ ] Identified existing dashboard patterns to follow
- [ ] Found weather API integration points
- [ ] Understood wedding timeline integration requirements
- [ ] Located similar data visualization implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Architecture decisions based on existing patterns
- [ ] Test cases written FIRST (TDD)
- [ ] Security measures for API key handling
- [ ] Performance considerations for real-time updates

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use patterns discovered by Serena
- [ ] Maintain consistency with existing dashboard components
- [ ] Include code examples in comments
- [ ] Test continuously during development

## 🔗 DEPENDENCIES
- **Team B**: Weather API endpoints and data transformation logic
- **Team C**: Real-time weather alert notification system
- **Team D**: Mobile optimization for weather dashboard

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Weather API Security:
- [ ] Weather API keys stored in environment variables only
- [ ] No API credentials exposed in client-side code
- [ ] Rate limiting for weather API calls
- [ ] Input validation for location coordinates
- [ ] Error handling that doesn't expose API details

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

**🚨 CRITICAL: Weather dashboard MUST integrate into parent navigation**

### Dashboard Navigation Integration:
```typescript
// MUST update dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
{
  title: "Weather Dashboard",
  href: "/dashboard/weather",
  icon: Cloud
}
```

### Mobile Navigation Support:
- [ ] Weather widget accessible in mobile drawer
- [ ] Responsive design for all screen sizes
- [ ] Touch-optimized weather controls

## 🎨 UI IMPLEMENTATION RULES (WITH SERENA VALIDATION)

- [ ] MUST use existing components from Untitled UI library
- [ ] MUST follow color system - NO hardcoded colors
- [ ] MUST test at 375px, 768px, 1920px breakpoints
- [ ] MUST maintain 4.5:1 contrast ratios
- [ ] MUST support dark mode weather themes

## 🎯 SPECIFIC DELIVERABLES

### Core Weather Components:
- [ ] **WeatherDashboard.tsx** - Main weather overview with wedding date context
- [ ] **WeatherForecast.tsx** - 15-day forecast with wedding highlighting
- [ ] **WeatherAlerts.tsx** - Real-time weather alert notifications
- [ ] **WeatherTimeline.tsx** - Hour-by-hour wedding day forecast
- [ ] **MobileWeatherWidget.tsx** - Compact mobile weather display
- [ ] **WeatherCard.tsx** - Reusable weather condition display
- [ ] **useWeatherData.ts** - Custom hook for weather API integration

### Wedding Context Features:
- [ ] Weather impact assessment for outdoor ceremonies
- [ ] Temperature-based attire recommendations
- [ ] Photography lighting condition indicators
- [ ] Venue preparation alerts for weather changes
- [ ] Guest comfort level notifications

## 🎭 PLAYWRIGHT TESTING

```javascript
// Weather Dashboard Testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/weather"});
const weatherStructure = await mcp__playwright__browser_snapshot();

// Test weather component interactions
await mcp__playwright__browser_click({
  element: "weather forecast toggle",
  ref: "[data-testid='forecast-toggle']"
});

// Validate responsive weather displays
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({filename: `weather-${width}px.png`});
}

// Test weather alert functionality
await mcp__playwright__browser_wait_for({text: "Weather Alert"});
const alertModal = await mcp__playwright__browser_snapshot();
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All weather components functional with real API integration
- [ ] Tests written FIRST and passing (>90% coverage)
- [ ] Zero TypeScript errors in weather components
- [ ] Zero console errors during weather updates
- [ ] Mobile responsiveness validated across breakpoints

### Wedding Integration Evidence:
- [ ] Weather dashboard accessible from main navigation
- [ ] Wedding date highlighting in forecast display
- [ ] Alert system integrates with notification preferences
- [ ] Mobile widget optimized for venue visits

## 💾 WHERE TO SAVE

- **Components**: `$WS_ROOT/wedsync/src/components/weather/`
- **Hooks**: `$WS_ROOT/wedsync/src/hooks/useWeatherData.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/weather.ts`
- **Tests**: `$WS_ROOT/wedsync/src/components/weather/__tests__/`

## ⚠️ CRITICAL WARNINGS

- Weather API rate limits must be respected
- Never expose weather API keys in client code
- Handle offline scenarios for mobile usage
- Ensure weather data caching for performance
- Test alert system thoroughly for emergency conditions

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Weather Component Verification:
- [ ] All weather components use Untitled UI patterns
- [ ] API keys secured in environment variables
- [ ] Rate limiting implemented for weather calls
- [ ] Error boundaries handle API failures gracefully
- [ ] Mobile optimization validated on real devices

### Final Weather Integration Checklist:
- [ ] Navigation integration complete and tested
- [ ] Wedding date context properly highlighted
- [ ] Alert system functional for severe weather
- [ ] Performance optimized for real-time updates
- [ ] TypeScript compiles with NO errors
- [ ] All tests passing including integration tests

---

**Real Wedding Scenario:** A couple has booked an outdoor garden wedding for next Saturday at 4pm in Napa Valley. The wedding planner uses weather integration to see a 15-day forecast showing 40% chance of rain that day with temperatures dropping to 55°F by evening. They proactively arrange tent rentals, notify the couple about potential attire changes, and alert the photographer about indoor lighting equipment.

**EXECUTE IMMEDIATELY - Build comprehensive weather dashboard for outdoor wedding coordination with full navigation integration!**