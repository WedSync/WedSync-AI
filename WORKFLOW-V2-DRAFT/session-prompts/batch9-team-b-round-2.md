# TEAM B - ROUND 2: WS-013 - Lead Scoring & Qualification - Backend Intelligence

**Date:** 2025-01-23  
**Feature ID:** WS-013 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build intelligent lead scoring algorithm with qualification workflows and automated nurturing systems  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue owner receiving 200+ inquiries per month
**I want to:** Automatically score leads by likelihood to book, budget fit, and urgency so I can prioritize follow-ups
**So that:** I can focus my limited time on the most promising leads while nurturing others automatically

**Real Wedding Problem This Solves:**
Venue owners currently respond to all inquiries equally, spending hours on leads who will never book while high-value prospects get delayed responses. This scoring system analyzes inquiry patterns, budget indicators, and timing to prioritize leads that are most likely to convert.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:** WS-013
- Machine learning lead scoring algorithm
- Real-time qualification workflows
- Automated lead nurturing sequences
- Scoring model training and optimization
- Integration with CRM and analytics systems
- Lead routing and assignment automation

**Technology Stack (VERIFIED):**
- Backend: Python/Node.js ML algorithms, PostgreSQL
- Scoring: Custom algorithm with configurable weights
- Automation: Queue-based nurturing workflows
- API: Real-time scoring endpoints with caching
- Analytics: Lead conversion tracking and model improvement

**Integration Points:**
- [WS-008 Notification Engine]: Automated lead nurturing
- [WS-007 Analytics Pipeline]: Lead conversion analytics
- [Database]: lead_scores, qualification_rules, nurturing_sequences

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load latest docs:
await mcp__context7__resolve-library-id("scikit-learn");
await mcp__context7__get-library-docs("/scikit-learn/scikit-learn", "classification scoring", 4000);
await mcp__context7__get-library-docs("/supabase/supabase", "functions triggers", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes algorithms", 3000);

// 2. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("lead|score|qualification|ml");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build lead scoring system with ML algorithms"
2. **ai-ml-engineer** --think-ultra-hard "Develop lead scoring algorithm and model"
3. **postgresql-database-expert** --think-hard "Design lead scoring data model"
4. **api-architect** --think-hard "Create lead scoring API with real-time updates"

---

## 📋 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Intelligence Features):
- [ ] Lead scoring algorithm with configurable weights
- [ ] Real-time qualification workflow engine
- [ ] Automated nurturing sequence system
- [ ] Model training and optimization pipeline
- [ ] Lead routing and assignment automation
- [ ] Scoring API with caching and performance
- [ ] Analytics integration for model improvement

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

- [ ] Scoring algorithm processes leads in <2 seconds
- [ ] Qualification workflows trigger automatically
- [ ] Nurturing sequences integrate with notifications
- [ ] Model accuracy improves over time with training
- [ ] Lead routing assigns to appropriate team members

---

## 💾 WHERE TO SAVE YOUR WORK

- Backend: `/wedsync/src/lib/lead-scoring/`
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-013-round-2-complete.md`

END OF ROUND PROMPT - EXECUTE IMMEDIATELY