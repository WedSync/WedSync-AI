# TEAM B - ROUND 1: WS-007 - Analytics Data Pipeline - Backend Infrastructure

**Date:** 2025-01-23  
**Feature ID:** WS-007 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build backend analytics data pipeline with real-time ETL, data aggregation, and automated reporting infrastructure  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business owner with 100+ clients
**I want to:** Automatically collect, process, and analyze all client interactions, revenue trends, and business metrics
**So that:** I can make data-driven decisions about pricing, marketing, and resource allocation without manual spreadsheet work

**Real Wedding Problem This Solves:**
Wedding businesses currently track revenue, client satisfaction, and booking trends manually across multiple systems. This pipeline automatically aggregates all data from forms, emails, payments, and client interactions to provide real-time business insights without any manual data entry.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:** WS-007
- Real-time ETL data pipeline architecture
- Automated data aggregation and transformation
- Time-series analytics database optimization
- Event-driven data processing system
- Advanced analytics API endpoints
- Data quality validation and monitoring

**Technology Stack (VERIFIED):**
- Backend: Supabase PostgreSQL 15, Edge Functions, Realtime
- ETL: PostgreSQL triggers, functions, materialized views
- Analytics: Time-series data structures, aggregation tables
- API: Next.js 15 API routes with validation
- Testing: Vitest, Database testing utilities

**Integration Points:**
- [WS-006 Journey Engine]: Journey completion analytics
- [WS-008 Notification Engine]: Communication analytics
- [Database]: analytics_events, analytics_aggregates, analytics_reports

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions triggers", 5000);
await mcp__context7__resolve-library-id("postgresql");
await mcp__context7__get-library-docs("/postgres/postgres", "materialized-views analytics", 4000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes validation", 3000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW existing patterns:
await mcp__serena__find_symbol("Analytics", "", true);
await mcp__serena__search_for_pattern("analytics|pipeline|etl|aggregation");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard "Build analytics ETL pipeline with real-time processing"
2. **postgresql-database-expert** --think-ultra-hard "Design analytics tables and aggregation functions"
3. **supabase-specialist** --think-ultra-hard "Implement realtime analytics triggers"
4. **api-architect** --think-hard "Design analytics API endpoints with caching"
5. **security-compliance-officer** --think-ultra-hard "Secure analytics data access"
6. **test-automation-architect** --database-focused "Test ETL pipeline reliability"

---

## 📋 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Analytics data model and database tables
- [ ] Real-time ETL pipeline with PostgreSQL triggers
- [ ] Data aggregation functions and materialized views
- [ ] Analytics API endpoints with caching
- [ ] Event tracking system for all user actions
- [ ] Data quality validation and monitoring
- [ ] Database tests for ETL reliability
- [ ] Performance optimization for large datasets

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Analytics dashboard requirements
- FROM Team C: User activity tracking events

### What other teams NEED from you:
- TO Team A: Analytics API endpoints for dashboard
- TO Team D: Aggregated data for business intelligence

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] ETL pipeline processes events in real-time (<1 second)
- [ ] Data aggregation functions handle 10k+ events/hour
- [ ] Analytics API endpoints return results in <500ms
- [ ] Data quality validation catches 100% of schema errors
- [ ] Database tests verify ETL accuracy
- [ ] Zero data loss during pipeline processing

### Performance & Reliability:
- [ ] Pipeline handles 1M+ events without failure
- [ ] Materialized views refresh automatically
- [ ] API endpoints cached for optimal performance
- [ ] Database indexes optimized for analytics queries
- [ ] Error handling and recovery systems functional

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/lib/analytics/`
- API: `/wedsync/src/app/api/analytics/`
- Database: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/__tests__/lib/analytics/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-007-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY