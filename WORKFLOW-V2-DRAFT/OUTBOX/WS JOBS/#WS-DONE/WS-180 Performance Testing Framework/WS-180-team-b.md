# TEAM B - ROUND 1: WS-180 - Performance Testing Framework
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build performance testing infrastructure with k6 integration, test orchestration engine, and results processing
**FEATURE ID:** WS-180 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about performance test reliability and accurate bottleneck identification

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/testing/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/testing/performance-monitor.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/testing/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("performance.*test");
await mcp__serena__search_for_pattern("k6.*load");
await mcp__serena__get_symbols_overview("src/lib/testing/");
```

### B. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("k6 load testing Node.js integration");
await mcp__Ref__ref_search_documentation("Performance testing automation CI/CD");
await mcp__Ref__ref_search_documentation("PostgreSQL performance monitoring queries");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Performance testing infrastructure requires orchestrating complex workflows: 1) k6 test script generation with realistic user scenarios 2) Test execution engine with resource monitoring 3) Real-time results processing and threshold validation 4) Performance regression detection comparing against baselines 5) CI/CD integration blocking poor-performing deployments. Must handle concurrent test execution without interference.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### PERFORMANCE TESTING SECURITY:
- [ ] **Engineer authentication required** - Verify engineer/admin role for test APIs
- [ ] **Test environment isolation** - Prevent production system impact
- [ ] **Rate limiting on test triggers** - Prevent test execution abuse
- [ ] **Secure test data handling** - Use synthetic data, never production data
- [ ] **Resource limit enforcement** - Prevent excessive resource consumption
- [ ] **Test result sanitization** - Remove sensitive URLs and configurations
- [ ] **Audit logging** - Log all performance test executions and results

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

### SPECIFIC DELIVERABLES FOR WS-180:

#### 1. PerformanceMonitor.ts - Core testing infrastructure
```typescript
export class PerformanceMonitor {
  async recordTestResults(results: PerformanceTestResults): Promise<void> {
    // Store test results in performance_test_runs table
    // Calculate performance metrics (P95, error rates, throughput)
    // Compare against baseline and detect regressions
  }
  
  async validatePerformanceThresholds(results: PerformanceTestResults): Promise<boolean> {
    // Validate against predefined thresholds from technical spec
    // maxAvgResponseTime: 1500ms, maxP95ResponseTime: 3000ms
    // maxErrorRate: 0.01 (1%), minThroughput: 50 RPS
  }
  
  private async detectPerformanceRegression(
    currentResults: PerformanceTestResults,
    baseline: PerformanceTestResults
  ): Promise<RegressionAnalysis> {
    // Compare current test against historical baseline
    // Flag significant performance degradation
  }
}
```

#### 2. /api/performance/tests/route.ts - Performance test management API
```typescript
// GET /api/performance/tests - List test configurations and results
// POST /api/performance/tests/execute - Trigger performance test execution
// PUT /api/performance/tests/{id}/config - Update test configuration
// DELETE /api/performance/tests/{id} - Remove test configuration

interface PerformanceTestExecutionRequest {
  testType: 'load' | 'stress' | 'spike' | 'endurance';
  configuration: TestConfiguration;
  environment: 'staging' | 'production';
}

interface PerformanceTestResponse {
  testId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  results?: PerformanceTestResults;
  estimatedCompletion?: string;
}
```

#### 3. k6-test-orchestrator.ts - k6 integration and execution engine
```typescript
export class K6TestOrchestrator {
  async generateK6Script(config: TestConfiguration): Promise<string> {
    // Generate k6 test script based on configuration
    // Include realistic wedding platform user scenarios:
    // - Supplier login and dashboard access
    // - Client form submission workflows
    // - Photo gallery loading and interaction
    // - Real-time updates and notifications
  }
  
  async executeK6Test(
    scriptPath: string,
    config: TestConfiguration
  ): Promise<K6TestResults> {
    // Execute k6 test with proper resource limits
    // Monitor test execution progress
    // Capture real-time metrics and results
  }
  
  private async parseK6Results(rawResults: string): Promise<PerformanceMetrics> {
    // Parse k6 JSON output into structured metrics
    // Extract response times, error rates, throughput data
  }
}
```

#### 4. performance-baseline-manager.ts - Baseline and regression tracking
```typescript
export class PerformanceBaselineManager {
  async establishBaseline(
    testType: string,
    environment: string,
    results: PerformanceTestResults
  ): Promise<PerformanceBaseline> {
    // Create performance baseline for regression detection
    // Calculate acceptable variance thresholds
  }
  
  async compareAgainstBaseline(
    results: PerformanceTestResults,
    baseline: PerformanceBaseline
  ): Promise<ComparisonResult> {
    // Compare current results against established baseline
    // Flag regressions exceeding acceptable variance
  }
  
  async updateBaseline(
    baselineId: string,
    newResults: PerformanceTestResults
  ): Promise<void> {
    // Update baseline with improved performance results
    // Maintain historical baseline data
  }
}
```

## 📋 DATABASE SCHEMA IMPLEMENTATION

### MUST CREATE MIGRATION:
```sql
-- From WS-180 technical specification
CREATE TABLE IF NOT EXISTS performance_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT CHECK (test_type IN ('load', 'stress', 'spike', 'endurance')),
  environment TEXT CHECK (environment IN ('staging', 'production')),
  concurrent_users INT,
  duration_seconds INT,
  avg_response_time_ms DECIMAL(8,2),
  p95_response_time_ms DECIMAL(8,2),
  error_rate DECIMAL(5,4),
  throughput_rps DECIMAL(8,2),
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance baselines for regression detection
CREATE TABLE IF NOT EXISTS performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL,
  environment TEXT NOT NULL,
  baseline_avg_response_time_ms DECIMAL(8,2),
  baseline_p95_response_time_ms DECIMAL(8,2),
  baseline_error_rate DECIMAL(5,4),
  baseline_throughput_rps DECIMAL(8,2),
  established_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_type, environment)
);

CREATE INDEX idx_performance_test_runs_created ON performance_test_runs(created_at);
CREATE INDEX idx_performance_test_runs_type ON performance_test_runs(test_type);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/testing/performance-monitor.ts` - Core testing infrastructure
- [ ] `/src/lib/testing/k6-test-orchestrator.ts` - k6 integration engine
- [ ] `/src/lib/testing/performance-baseline-manager.ts` - Baseline tracking
- [ ] `/src/app/api/performance/tests/route.ts` - Performance test API
- [ ] `/src/app/api/performance/tests/execute/route.ts` - Test execution endpoint
- [ ] `/supabase/migrations/WS-180-performance-testing.sql` - Database schema
- [ ] `/__tests__/lib/testing/` - Comprehensive test suite

### MUST IMPLEMENT:
- [ ] k6 test script generation with realistic wedding platform scenarios
- [ ] Performance test execution with resource monitoring
- [ ] Real-time results processing and threshold validation
- [ ] Performance regression detection against baselines
- [ ] CI/CD integration endpoints for deployment gates
- [ ] Test result storage and historical analysis
- [ ] Error handling for failed test executions

## 💾 WHERE TO SAVE YOUR WORK
- Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/testing/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/performance/`
- Scripts: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/scripts/performance/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/testing/`

## 🏁 COMPLETION CHECKLIST
- [ ] k6 integration working with realistic wedding platform test scenarios
- [ ] Performance test execution engine functional with progress tracking
- [ ] Results processing and threshold validation implemented
- [ ] Baseline management system for regression detection
- [ ] Database schema created and tested
- [ ] API endpoints secured and functional
- [ ] CI/CD integration points established

**WEDDING CONTEXT REMINDER:** Your performance testing ensures WedSync remains responsive when couples are finalizing guest lists before RSVP deadlines and vendors are coordinating schedules during peak wedding season. Reliable performance testing prevents platform slowdowns during the most critical moments of wedding planning.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**