# TEAM B - ROUND 1: WS-282 - Interactive Dashboard Tour
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build backend API infrastructure for interactive tour system with user progress tracking
**FEATURE ID:** WS-282 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**
1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/onboarding/tour/
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**Core API Endpoints:**
1. **POST /api/onboarding/tour/start** - Initialize tour for new user
2. **PUT /api/onboarding/tour/progress** - Update tour step completion
3. **GET /api/onboarding/tour/status** - Get current tour progress
4. **POST /api/onboarding/tour/customize** - Personalize tour based on wedding type

**Database Schema:**
```sql
CREATE TABLE user_tour_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  tour_type VARCHAR(50) NOT NULL,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  customizations JSONB DEFAULT '{}',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false
);
```

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/onboarding/tour/
- Services: $WS_ROOT/wedsync/src/lib/services/tour/
- Database: $WS_ROOT/wedsync/supabase/migrations/

---

**EXECUTE IMMEDIATELY - Build the tour backend that tracks user learning progress!**