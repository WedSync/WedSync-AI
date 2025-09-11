# TEAM B - ROUND 1: WS-245 - Wedding Budget Optimizer System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the backend AI optimization engine, market pricing API, and budget calculation services
**FEATURE ID:** WS-245 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI budget algorithms, financial calculations accuracy, and scalable pricing data management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/budget/
cat $WS_ROOT/wedsync/src/app/api/budget/optimize/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test budget-api
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

// Query existing budget and financial API patterns
await mcp__serena__search_for_pattern("api/budget|financial|calculation|pricing");
await mcp__serena__find_symbol("BudgetService", "", true);
await mcp__serena__get_symbols_overview("src/app/api/budget");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ANY UI WORK)
```typescript
// Load the correct UI Style Guide for admin interfaces
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15 API Routes**: App Router architecture
- **Supabase**: PostgreSQL database for budget data
- **OpenAI GPT-4**: AI budget optimization engine
- **Zod**: Financial data validation and schema definition
- **TypeScript 5.9.2**: Strict mode for financial calculations
- **Decimal.js**: Precise financial arithmetic (no floating point errors)

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to financial APIs and budget optimization
# Use Ref MCP to search for financial calculation libraries, budget optimization algorithms, and pricing API patterns
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR BUDGET OPTIMIZATION BACKEND

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to architect an AI-powered budget optimization backend. Key considerations: 1) Financial calculation engine with precise decimal arithmetic 2) AI optimization algorithms using market pricing data 3) Budget template engine with customizable parameters 4) Real-time cost tracking with automated categorization 5) Market pricing data integration and caching 6) Budget forecast engine with predictive analytics 7) Financial audit trail and compliance logging. All financial calculations must be accurate to the penny with proper error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down budget API endpoints and financial calculations
2. **nextjs-fullstack-developer** - Ensure proper App Router financial API patterns
3. **security-compliance-officer** - Implement secure financial data handling
4. **supabase-specialist** - Design budget storage and financial data management
5. **test-automation-architect** - Create comprehensive financial calculation tests
6. **documentation-chronicler** - Document budget optimization algorithms

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FINANCIAL API SECURITY CHECKLIST:
- [ ] **Decimal precision** - Use Decimal.js for all financial calculations
- [ ] **Input validation** - Zod validation for all financial amounts
- [ ] **Authentication** - getServerSession() for all budget routes
- [ ] **Authorization** - Verify budget access permissions
- [ ] **Rate limiting** - rateLimitService for budget optimization requests
- [ ] **PCI compliance** - Handle financial data according to standards
- [ ] **Audit logging** - Log all financial operations with user context
- [ ] **Data encryption** - Encrypt budget data at rest

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Next.js 15 API endpoints with TypeScript
- Financial calculations and budget optimization algorithms
- withSecureValidation middleware required for all financial routes
- OpenAI integration for intelligent budget recommendations
- Database operations for budget and pricing data (Supabase)
- Business logic implementation with wedding industry context

## 📋 TECHNICAL SPECIFICATION FROM WS-245

**Core Backend Requirements:**
- AI-powered budget optimization engine using OpenAI and market data
- Real-time budget calculation service with precise decimal arithmetic
- Market pricing data integration and caching system
- Budget template generation with customizable parameters
- Expense categorization and tracking automation
- Financial forecast engine with predictive analytics
- Budget audit trail and compliance logging
- Vendor pricing comparison and recommendation engine

**Database Schema (from spec):**
- budget_templates - Predefined budget structures by wedding type
- budget_categories - Wedding expense categories with market pricing
- budget_allocations - User budget distributions and modifications
- budget_optimizations - AI recommendations and applied optimizations
- market_pricing_data - Real-time vendor pricing and market trends
- budget_analytics - Financial planning metrics and insights

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY API ENDPOINTS:

1. **Budget Optimization (`/api/budget/optimize/route.ts`)**
   ```typescript
   // POST - Generate AI budget optimization recommendations
   // GET - Retrieve existing optimization suggestions
   // PUT - Apply selected optimizations
   ```

2. **Market Pricing (`/api/budget/market-pricing/route.ts`)**
   ```typescript
   // GET - Retrieve current market pricing for wedding services
   // POST - Update market pricing data
   ```

3. **Budget Calculation Service (`/lib/services/budget-calculation-service.ts`)**
   ```typescript
   class BudgetCalculationService {
     async optimizeBudget(
       currentBudget: BudgetAllocation,
       constraints: OptimizationConstraints,
       goals: OptimizationGoal[]
     ): Promise<OptimizedBudget>
     
     async calculateMarketBasedRecommendations(
       location: string,
       weddingSize: number,
       style: WeddingStyle
     ): Promise<BudgetRecommendation[]>
   }
   ```

4. **AI Optimization Engine (`/lib/services/ai-budget-optimizer.ts`)**
   ```typescript
   class AIBudgetOptimizer {
     async generateOptimizations(
       budget: BudgetAllocation,
       marketData: MarketPricingData,
       preferences: UserPreferences
     ): Promise<OptimizationRecommendation[]>
     
     async analyzeCostSavingOpportunities(
       expenses: Expense[],
       marketTrends: PricingTrend[]
     ): Promise<CostSavingOpportunity[]>
   }
   ```

### DATABASE OPERATIONS:

1. **Migration File**: `supabase/migrations/[timestamp]_budget_optimizer_system.sql`
   - Create all budget optimization tables from WS-245 specification
   - Set up RLS policies for financial data privacy
   - Create indexes for budget calculation performance

2. **Database Service**: `/lib/database/budget-database-service.ts`
   - CRUD operations for budgets and optimizations
   - Market pricing data management
   - Financial analytics data collection

### AI BUDGET OPTIMIZATION:

1. **Market Data Integration**:
   ```typescript
   class MarketDataService {
     async fetchMarketPricing(
       serviceCategory: WeddingServiceCategory,
       location: string,
       dateRange: DateRange
     ): Promise<MarketPricingData>
     
     async analyzePricingTrends(
       historical: PricingHistory[],
       seasonal: SeasonalTrend[]
     ): Promise<PricingForecast>
   }
   ```

2. **Budget Optimization Algorithms**:
   ```typescript
   // AI-powered budget reallocation
   // Market-based vendor recommendations
   // Cost-benefit analysis for wedding choices
   // Seasonal pricing optimization
   ```

3. **Financial Calculation Engine**:
   ```typescript
   class FinancialCalculationEngine {
     calculateBudgetAllocation(params: BudgetParameters): BudgetAllocation
     calculateCostSavings(current: Budget, optimized: Budget): SavingsAnalysis
     calculateMarketPosition(budget: Budget, market: MarketData): PositionAnalysis
     validateFinancialAccuracy(calculation: Calculation): ValidationResult
   }
   ```

### REAL-TIME FEATURES:

1. **Live Budget Updates**:
   ```typescript
   // Real-time budget recalculation as user makes changes
   // Live market pricing updates
   // Instant optimization feedback
   // Real-time savings calculations
   ```

2. **Rate Limiting for Financial Operations**:
   ```typescript
   // Per-user budget optimization limits
   const userLimit = await rateLimitService.checkRateLimit(
     `budget:user:${userId}`,
     { windowMs: 60000, max: 10 }
   );
   
   // Per-organization market pricing requests
   const orgLimit = await rateLimitService.checkRateLimit(
     `pricing:org:${organizationId}`,
     { windowMs: 60000, max: 100 }
   );
   ```

## 💾 WHERE TO SAVE YOUR WORK

**API Routes:**
- `$WS_ROOT/wedsync/src/app/api/budget/` - All budget API endpoints
- `$WS_ROOT/wedsync/src/lib/services/budget-calculation-service.ts` - Budget calculations
- `$WS_ROOT/wedsync/src/lib/services/ai-budget-optimizer.ts` - AI optimization

**Database:**
- `$WS_ROOT/wedsync/supabase/migrations/` - Budget schema migrations
- `$WS_ROOT/wedsync/src/types/budget.ts` - TypeScript interfaces

**Tests:**
- `$WS_ROOT/wedsync/tests/api/budget/` - API endpoint tests
- `$WS_ROOT/wedsync/tests/services/budget-calculation.test.ts` - Calculation tests

**Reports:**
- `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-245-team-b-round-1-complete.md`

## 🏁 COMPLETION CHECKLIST

### EVIDENCE REQUIREMENTS:
- [ ] All API route files created and verified to exist
- [ ] Database migration applied successfully
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All API tests passing (npm test budget-api)
- [ ] AI optimization engine tested with real scenarios
- [ ] Financial calculation accuracy verified

### FUNCTIONALITY REQUIREMENTS:
- [ ] Budget optimization API working with AI recommendations
- [ ] Market pricing data integration operational
- [ ] Real-time budget calculations with precise decimal arithmetic
- [ ] Budget template generation and customization
- [ ] Expense categorization and tracking automation
- [ ] Financial audit trail and compliance logging

### SECURITY REQUIREMENTS:
- [ ] All financial inputs validated with Zod schemas
- [ ] Rate limiting enforced for budget optimization requests
- [ ] Budget data privacy protected with RLS policies
- [ ] Financial calculations using Decimal.js for precision
- [ ] Comprehensive audit logging for financial operations
- [ ] PCI compliance measures implemented

### DATABASE REQUIREMENTS:
- [ ] All budget optimization tables created with proper schema
- [ ] RLS policies configured for financial data privacy
- [ ] Database indexes added for budget query performance
- [ ] Migration successfully applied to staging/production
- [ ] Budget and pricing CRUD operations working

---

**EXECUTE IMMEDIATELY - Build an AI budget optimization backend so accurate that couples trust it with their wedding finances!**

**🎯 SUCCESS METRIC**: Create a budget optimization API so intelligent that it identifies an average of £3,000 in cost savings per wedding.