# TEAM B - ROUND 1: WS-278 - Wedding Weather Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build robust backend API infrastructure for real-time weather monitoring and contingency management
**FEATURE ID:** WS-278 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about weather data reliability and real-time alert systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/weather/
cat $WS_ROOT/wedsync/src/app/api/weather/forecast/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test weather-api
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

// Query existing API patterns and weather integrations
await mcp__serena__search_for_pattern("api route handler weather external service");
await mcp__serena__find_symbol("weatherService apiHandler middleware", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. SECURITY & API PATTERNS (MANDATORY FOR ALL API WORK)
```typescript
// CRITICAL: Load security validation patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("withSecureValidation withValidation");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to weather API integration
# Use Ref MCP to search for:
# - "Weather API integration patterns"
# - "Supabase database weather data storage"
# - "Next.js API routes weather services"
# - "OpenWeatherMap API Node.js"
# - "Weather alert notification systems"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR WEATHER API ARCHITECTURE

### Use Sequential Thinking MCP for Backend Weather System
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Weather API system needs: Integration with external weather APIs (OpenWeatherMap/AccuWeather), real-time weather data fetching for venues, weather alert processing and notifications, contingency plan triggers based on weather conditions, historical weather data storage, API rate limiting and caching strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API security requirements: Weather API keys must be secured, input validation for location data, rate limiting to prevent abuse, authentication for weather settings, protection against API key exposure, secure storage of weather preferences and thresholds.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Weather data architecture: Real-time weather updates via webhooks or polling, database storage for weather history and alerts, caching strategy for frequently requested locations, background jobs for alert processing, integration with notification systems (email/SMS/push).",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation approach: Create weather service abstraction layer, implement secure API routes with validation, build alert processing system, create weather data models and database schema, implement caching and rate limiting, add comprehensive error handling.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track weather API development and alert processing workflows
2. **backend-api-specialist** - Build secure weather API endpoints with validation
3. **security-compliance-officer** - Secure weather API keys and implement proper validation
4. **database-architect** - Design weather data models and alert storage
5. **test-automation-architect** - Weather API testing and alert simulation
6. **documentation-chronicler** - Weather API documentation and integration guides

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **API key protection** - Never expose weather API keys
- [ ] **Location validation** - Validate coordinates and venue addresses
- [ ] **Alert threshold validation** - Validate weather alert parameters
- [ ] **Error messages sanitized** - Never leak API errors or keys

### REQUIRED SECURITY PATTERN:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const weatherRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: secureStringSchema.max(200),
  alertThresholds: z.object({
    precipitation: z.number().min(0).max(100),
    windSpeed: z.number().min(0).max(200),
    temperature: z.object({
      min: z.number().min(-50).max(50),
      max: z.number().min(-50).max(50)
    })
  }).optional()
});

export const POST = withSecureValidation(
  weatherRequestSchema,
  async (request, validatedData) => {
    // Implementation with secure weather API calls
  }
);
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**Core API Endpoints to Build:**

1. **GET /api/weather/forecast** - Retrieve weather forecast for venue location
2. **POST /api/weather/alerts/setup** - Configure weather alert thresholds
3. **GET /api/weather/alerts** - Retrieve active weather alerts
4. **POST /api/weather/contingency/trigger** - Trigger contingency plans based on weather
5. **GET /api/weather/history** - Historical weather data for venue
6. **POST /api/weather/notifications/send** - Send weather-based notifications

### Key Backend Features:
- Secure integration with weather APIs (OpenWeatherMap, AccuWeather)
- Real-time weather data processing and caching
- Automated alert system with customizable thresholds
- Weather-based contingency plan triggers
- Background job processing for weather updates
- Integration with notification systems (email, SMS, push)

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Weather forecast API endpoints with security validation
- [ ] Weather alert system with threshold configuration
- [ ] Database models for weather data and alerts
- [ ] Weather API service layer with caching
- [ ] Background job system for weather monitoring
- [ ] Integration with external weather APIs
- [ ] Notification system integration for alerts
- [ ] Rate limiting and API key security implemented
- [ ] Comprehensive error handling and logging
- [ ] Unit and integration tests for all endpoints

## 📊 DATABASE SCHEMA REQUIREMENTS

### Weather Tables to Create:
```sql
-- Weather forecasts cache
CREATE TABLE weather_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  venue_latitude DECIMAL(10, 8) NOT NULL,
  venue_longitude DECIMAL(11, 8) NOT NULL,
  forecast_data JSONB NOT NULL,
  forecast_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Weather alerts configuration
CREATE TABLE weather_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  alert_type VARCHAR(50) NOT NULL, -- rain, wind, temperature, etc.
  threshold_value DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Weather notifications log
CREATE TABLE weather_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  alert_type VARCHAR(50) NOT NULL,
  notification_type VARCHAR(20) NOT NULL, -- email, sms, push
  sent_at TIMESTAMP DEFAULT NOW(),
  recipient_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent'
);
```

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/weather/
- Services: $WS_ROOT/wedsync/src/lib/services/weather/
- Types: $WS_ROOT/wedsync/src/types/weather.ts
- Database: $WS_ROOT/wedsync/supabase/migrations/
- Tests: $WS_ROOT/wedsync/__tests__/api/weather/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## ⚠️ CRITICAL WARNINGS
- Never expose weather API keys in client-side code
- Implement proper rate limiting for external API calls
- Cache weather data to avoid API quota limits
- Validate all location coordinates before API calls
- Handle weather API failures gracefully with fallbacks

## 🏁 COMPLETION CHECKLIST
- [ ] Weather API endpoints created and secured
- [ ] Database schema for weather data implemented
- [ ] External weather API integration working
- [ ] Alert system with threshold configuration
- [ ] Notification integration for weather alerts
- [ ] Rate limiting and caching implemented
- [ ] Comprehensive error handling added
- [ ] Unit and integration tests passing
- [ ] API security validation complete
- [ ] Evidence package with API testing results

---

**EXECUTE IMMEDIATELY - Build the weather backend infrastructure that keeps weddings safe!**