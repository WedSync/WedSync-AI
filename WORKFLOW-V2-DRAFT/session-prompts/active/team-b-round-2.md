# TEAM B - ROUND 2: WS-010 - Timeline Optimization - ML Integration & Conflict Detection

**Date:** 2025-01-21  
**Feature ID:** WS-010 (Track all work with this ID)
**Priority:** P0 CRITICAL from roadmap  
**Mission:** Enhance timeline optimization with machine learning for predictive conflict detection and intelligent scheduling recommendations  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planner
**I want to:** The system to learn from past weddings and predict potential issues before they occur, suggesting optimal vendor schedules based on historical data
**So that:** I can prevent problems that have happened before and continuously improve wedding day execution

**Real Wedding Problem This Solves:**
Experienced planners know that certain vendor combinations cause delays (e.g., certain photographers take longer than scheduled, specific venues have hidden setup challenges). This ML system captures that institutional knowledge and applies it automatically, preventing repeated mistakes and optimizing based on real performance data.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Machine learning model for timeline prediction
- Historical data analysis and pattern recognition
- Intelligent buffer time recommendations
- Vendor performance scoring
- Predictive conflict detection
- Real-time model updates
- Anomaly detection in schedules
- Continuous learning from outcomes

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- ML: TensorFlow.js or custom algorithms
- Algorithm: Enhanced optimization from Round 1
- Testing: Playwright MCP, Vitest
- Data: Time series analysis

**Integration Points:**
- [Team B Round 1]: Core optimization engine for enhancement
- [Team A Round 2]: Real-time updates for ML predictions
- [Team E Round 1]: Notifications for ML-detected risks
- [Database]: ml_models, vendor_performance, timeline_history

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("tensorflow");
await mcp__context7__get-library-docs("/tensorflow/tfjs", "machine-learning training inference", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "edge-functions api-routes streaming", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database triggers real-time", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Team B Round 1 implementation:
await mcp__serena__find_symbol("TimelineOptimization", "", true);
await mcp__serena__find_symbol("ConflictDetection", "", true);
await mcp__serena__search_for_pattern("optimization|algorithm|timeline");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (TensorFlow.js changes frequently!)
- Serena shows existing optimization patterns to enhance
- Agents work with current knowledge and build on Round 1 work

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Enhance timeline optimization with ML predictions"
2. **ai-ml-engineer** --think-hard --use-loaded-docs "Implement timeline prediction models"
3. **data-analytics-engineer** --think-ultra-hard --follow-existing-patterns "Build vendor performance analytics"
4. **performance-optimization-expert** --think-ultra-hard --optimize-ml-inference
5. **test-automation-architect** --tdd-approach --test-ml-accuracy
6. **playwright-visual-testing-specialist** --accessibility-first --test-prediction-ui
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build on Team B Round 1 optimization engine."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Review Team B Round 1 optimization engine thoroughly
- Understand existing timeline data structures
- Research ML approaches for scheduling problems
- Check vendor performance data availability
- Continue until you FULLY understand the ML requirements

### **PLAN PHASE (THINK HARD!)**
- Design ML model architecture
- Plan training data collection strategy
- Design prediction accuracy metrics
- Plan integration with existing optimization
- Don't rush - ML requires careful architecture

### **CODE PHASE (PARALLEL AGENTS!)**
- Write ML model tests with accuracy targets FIRST
- Implement prediction models
- Enhance optimization engine with ML
- Build vendor performance tracking
- Focus on model accuracy and performance

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Validate ML model accuracy on test data
- Test integration with Round 1 engine
- Verify with Playwright
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (ML Enhancement):
- [ ] ML model for timeline conflict prediction (>85% accuracy)
- [ ] Vendor performance scoring system
- [ ] Historical data analysis and pattern detection
- [ ] Enhanced optimization engine with ML insights
- [ ] Real-time model inference API
- [ ] Predictive buffer time recommendations
- [ ] Model training and evaluation pipeline
- [ ] Integration tests with Round 1 engine

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B Round 1: Core optimization engine (CRITICAL)
- FROM Team A Round 2: WebSocket for real-time ML updates
- FROM Team E Round 1: Notification system for ML alerts

### What other teams NEED from you:
- TO Team B Round 3: Enhanced engine for task automation
- TO Team A Round 3: ML insights for analytics dashboard
- TO All Teams: Improved timeline accuracy

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] ML model data privacy protection
- [ ] Vendor performance data anonymization
- [ ] Secure model inference endpoints
- [ ] Training data access controls
- [ ] Model tampering prevention

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ML MODEL TESTING APPROACH:**

```javascript
// MACHINE LEARNING ACCURACY TESTING

// 1. TEST ML MODEL PREDICTIONS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/ml-test"});

// Load test dataset
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.__testMLData = {
      historicalWeddings: [
        {
          vendors: [{id: 'photo-pro', actualSetup: 45, plannedSetup: 30, onTime: false}],
          conflicts: ['setup-delay', 'equipment-issue'],
          outcome: 'delayed'
        },
        {
          vendors: [{id: 'photo-pro', actualSetup: 35, plannedSetup: 30, onTime: true}],
          conflicts: [],
          outcome: 'success'
        }
        // ... more test data
      ]
    };
  }`
});

// Test prediction accuracy
await mcp__playwright__browser_click({
  element: "Train model button", ref: "button[data-testid='train-ml-model']"
});

await mcp__playwright__browser_wait_for({text: "Training complete", time: 30});

const modelAccuracy = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/ml/test-accuracy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(window.__testMLData)
    }).then(r => r.json());
  }`
});

// 2. TEST REAL-TIME PREDICTIONS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/new"});

// Create timeline scenario
await mcp__playwright__browser_type({
  element: "Vendor input", ref: "input[data-testid='vendor-name']",
  text: "photo-pro"
});

await mcp__playwright__browser_click({
  element: "Get ML prediction", ref: "button[data-testid='ml-predict']"
});

// Verify prediction appears
await mcp__playwright__browser_wait_for({text: "High risk of delay", time: 5});

// 3. TEST VENDOR PERFORMANCE SCORING
const performanceScore = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/vendors/photo-pro/performance-score')
      .then(r => r.json())
      .then(data => ({
        score: data.score,
        reliability: data.reliability,
        averageDelay: data.averageDelay
      }));
  }`
});

// 4. TEST ML MODEL PERFORMANCE
const mlPerformanceTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const startTime = performance.now();
    
    // Test prediction speed with large timeline
    const largeTimeline = {
      vendors: Array.from({length: 100}, (_, i) => ({
        id: 'vendor-' + i,
        category: ['photo', 'catering', 'flowers'][i % 3],
        historicalPerformance: Math.random()
      }))
    };
    
    return fetch('/api/ml/predict-conflicts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(largeTimeline)
    }).then(r => r.json()).then(predictions => ({
      predictionTime: performance.now() - startTime,
      predictionsCount: predictions.length,
      highRiskCount: predictions.filter(p => p.risk > 0.7).length
    }));
  }`
});

// 5. TEST MODEL RETRAINING
await mcp__playwright__browser_click({
  element: "Retrain model", ref: "button[data-testid='retrain-model']"
});

await mcp__playwright__browser_wait_for({text: "Retraining complete", time: 60});

const retrainingResult = await mcp__playwright__browser_evaluate({
  function: `() => window.__retrainingResult || {}`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] ML model accuracy >85% on test data
- [ ] Predictions complete in <2 seconds
- [ ] Vendor scoring reflects historical data
- [ ] Model retraining improves accuracy
- [ ] Integration with Round 1 engine works
- [ ] Real-time predictions via WebSocket

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### ML Implementation:
- [ ] Model achieves >85% accuracy on conflict prediction
- [ ] Vendor performance scoring operational
- [ ] Tests written FIRST and passing (>85% coverage)
- [ ] Playwright tests validating ML accuracy
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] ML predictions in <2 seconds
- [ ] Enhanced optimization better than Round 1
- [ ] Model retraining pipeline functional
- [ ] Security requirements met
- [ ] Memory usage stable during inference

### Evidence Package Required:
- [ ] ML accuracy report with test results
- [ ] Performance benchmark comparison
- [ ] Vendor scoring validation
- [ ] Real-time prediction proof
- [ ] Model training logs

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- ML Models: `/wedsync/src/lib/ml/timeline/`
- Enhanced Algorithm: `/wedsync/src/lib/timeline/optimization/ml/`
- API: `/wedsync/src/app/api/ml/`
- Tests: `/wedsync/__tests__/lib/ml/`
- Types: `/wedsync/src/types/ml.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-010-round-2-complete.md`
- **Include:** Feature ID (WS-010) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-010-round-2-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip ML accuracy validation
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: This enhances P0 CRITICAL timeline optimization
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] ML model accuracy validated
- [ ] Tests written and passing
- [ ] Integration with Round 1 verified
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY