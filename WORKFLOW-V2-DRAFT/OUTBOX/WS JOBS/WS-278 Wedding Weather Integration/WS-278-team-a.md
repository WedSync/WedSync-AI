# TEAM A - ROUND 1: WS-278 - Wedding Weather Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI for wedding weather monitoring and contingency planning
**FEATURE ID:** WS-278 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about outdoor wedding concerns and weather-based decision making

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

// Query weather and event planning patterns
await mcp__serena__search_for_pattern("weather forecast alerts timeline event");
await mcp__serena__find_symbol("WeatherService AlertSystem Timeline", "", true);
await mcp__serena__get_symbols_overview("src/components/events/");
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

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to weather integration
# Use Ref MCP to search for:
# - "React weather widget components"
# - "Chart.js weather data visualization"
# - "API integration patterns weather data"
# - "Responsive weather dashboard design"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR WEATHER SYSTEM DESIGN

### Use Sequential Thinking MCP for Weather Integration
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding weather integration needs: Real-time weather monitoring for wedding venue locations, 7-day and hourly forecasts for planning, severe weather alerts and notifications, contingency plan activation based on weather conditions, vendor notification system for weather changes, guest communication for weather-related updates.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI complexity analysis: Weather dashboard with current conditions and forecasts, alert system with different urgency levels, contingency plan interface with automatic suggestions, vendor notification controls, guest communication tools, historical weather data for venue insights.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding weather scenarios: Outdoor ceremony rain contingency, tent setup wind alerts, photography lighting concerns, guest comfort temperature warnings, vendor logistics weather impacts, timeline adjustments based on weather forecasts.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Weather API integration with real-time updates, visual weather cards with actionable insights, automated alert system with customizable thresholds, contingency plan templates, communication automation, mobile-optimized weather monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track weather UI development and alert system workflows
2. **react-ui-specialist** - Build weather visualization components with Untitled UI
3. **security-compliance-officer** - Ensure weather API key security and data protection
4. **code-quality-guardian** - Maintain consistent weather UI patterns and performance
5. **test-automation-architect** - Weather simulation testing and alert scenarios
6. **documentation-chronicler** - Weather system documentation with contingency guides

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link in wedding planning section
- [ ] Mobile navigation support for weather dashboard
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs for weather management
- [ ] Quick access weather widget in main dashboard

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**Core UI Components to Build:**

1. **WeatherDashboard** - Main weather overview with current conditions
2. **ForecastDisplay** - 7-day and hourly forecast visualization
3. **WeatherAlerts** - Alert system with severity indicators
4. **ContingencyPlanner** - Weather-based backup plan interface
5. **VendorWeatherNotifications** - Weather communication controls
6. **WeatherTimeline** - Wedding day hour-by-hour weather timeline

### Key Features:
- Real-time weather updates with visual indicators
- Interactive forecast charts and graphs
- Alert system with customizable thresholds
- Contingency plan templates and activation
- Automated vendor/guest notification controls
- Mobile-responsive weather monitoring

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Core weather dashboard components built with Untitled UI
- [ ] Weather visualization charts and forecast displays
- [ ] Alert system UI with severity levels and actions
- [ ] Contingency planning interface with templates
- [ ] Vendor notification controls integrated
- [ ] Responsive design tested at all breakpoints
- [ ] Navigation integration complete
- [ ] Real-time weather data integration ready
- [ ] Unit tests for all weather UI components
- [ ] Evidence package with weather dashboard screenshots

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/weather/
- Types: $WS_ROOT/wedsync/src/types/weather.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/weather/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All UI tests passing with Playwright
- [ ] Weather visualization components working
- [ ] Alert system UI responsive and accessible
- [ ] Navigation integration complete
- [ ] Mobile weather interface optimized
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt for wedding weather integration!**