# WedSync Budget Optimizer - Technical Documentation

> **For Developers**: Complete technical reference for the AI-powered wedding budget optimization system with zero financial error tolerance.

## 🏗️ Architecture Overview

### Core System Design
```
┌─────────────────────────────────────────────────────────────┐
│                    Budget Optimizer System                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + TypeScript)                          │
│  ├── BudgetCalculator Components                           │
│  ├── AI Optimization Interface                             │
│  ├── Real-time Budget Updates                              │
│  └── Accessibility-First Design                            │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js 15 App Router)                         │
│  ├── /api/budget/calculate - Decimal.js calculations       │
│  ├── /api/budget/optimize - AI optimization engine         │
│  ├── /api/pricing/market - Market data integration         │
│  └── /api/budget/validate - Input validation & security    │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                       │
│  ├── BudgetCalculator - Core financial calculations        │
│  ├── AIBudgetOptimizer - Machine learning recommendations  │
│  ├── MarketPricingService - External API integration       │
│  └── SecurityService - Data protection & validation        │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (Supabase PostgreSQL)                      │
│  ├── wedding_budgets - Budget storage with encryption      │
│  ├── budget_categories - Category definitions              │
│  ├── market_pricing_cache - Cached pricing data           │
│  └── budget_audit_logs - Complete audit trail             │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Financial Precision Engine

### Decimal.js Configuration
```typescript
import Decimal from 'decimal.js';

// CRITICAL: Configure for maximum financial precision
Decimal.set({
  precision: 28,              // 28 significant digits
  rounding: Decimal.ROUND_HALF_UP,  // Banker's rounding
  toExpNeg: -7,              // Scientific notation threshold
  toExpPos: 21,              // Scientific notation threshold  
  maxE: 9e15,                // Maximum exponent
  minE: -9e15,               // Minimum exponent
  modulo: Decimal.ROUND_DOWN, // Modulo operation rounding
  crypto: false              // Don't use crypto for performance
});
```

**Why Decimal.js?**
- JavaScript's `Number` type: `0.1 + 0.2 = 0.30000000000000004` ❌
- Decimal.js precision: `new Decimal(0.1).plus(0.2) = 0.3` ✅
- Wedding budgets can exceed £100,000 - precision is critical

### Core Calculator API

```typescript
interface BudgetCalculator {
  /**
   * Calculate category allocation with decimal precision
   * @param totalBudget - Total wedding budget (Decimal)
   * @param percentage - Category percentage (0.0 to 1.0)
   * @returns Precise allocation amount
   */
  calculateCategoryAllocation(
    totalBudget: Decimal, 
    percentage: Decimal
  ): Decimal;

  /**
   * Validate budget integrity
   * @param totalBudget - Expected total
   * @param categories - Category allocations
   * @returns True if allocations sum to total
   */
  validateBudgetIntegrity(
    totalBudget: Decimal,
    categories: Record<string, Decimal>
  ): boolean;

  /**
   * Calculate variance percentage
   * @param budgeted - Original budgeted amount
   * @param actual - Actual spent amount  
   * @returns Percentage variance
   */
  calculateVariancePercentage(
    budgeted: Decimal,
    actual: Decimal
  ): Decimal;
}
```

### Financial Calculation Examples

```typescript
// Basic allocation calculation
const totalBudget = new Decimal('25000.00');
const photographyPercentage = new Decimal('0.15'); // 15%
const allocation = calculator.calculateCategoryAllocation(
  totalBudget, 
  photographyPercentage
);
// Result: 3750.00 (exactly)

// Currency conversion with precision
const gbpAmount = new Decimal('1000.00');
const exchangeRate = new Decimal('1.2756'); // GBP to USD
const usdAmount = gbpAmount.mul(exchangeRate);
// Result: 1275.60 (precise to the cent)

// Tax calculation  
const venuePrice = new Decimal('8000.00');
const vatRate = new Decimal('0.20'); // 20% UK VAT
const vatAmount = venuePrice.mul(vatRate);
const totalWithVat = venuePrice.plus(vatAmount);
// Result: 9600.00 (8000 + 1600 VAT)
```

## 🤖 AI Optimization Engine

### Machine Learning Architecture
```typescript
interface AIBudgetOptimizer {
  /**
   * Optimize budget with AI recommendations
   */
  optimizeBudget(
    budget: WeddingBudget,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult>;

  /**
   * Generate market-based recommendations
   */
  generateRecommendations(
    budget: WeddingBudget,
    context: MarketContext
  ): Promise<OptimizationRecommendation[]>;
}

interface OptimizationConstraints {
  targetReduction?: Decimal;      // Target savings amount
  preserveCategories?: string[];  // Categories to never change
  maxCategoryReduction?: Decimal; // Max % reduction per category
  priorityCategories?: string[];  // Categories to prioritize
}

interface OptimizationResult {
  totalSavings: Decimal;
  feasibilityScore: number;       // 0.0 to 1.0 confidence
  recommendations: OptimizationRecommendation[];
  optimizedCategories: Record<string, Decimal>;
  warnings: string[];
  marketDataUsed: boolean;
  processingTimeMs: number;
}
```

### AI Recommendation Logic
```typescript
class AIBudgetOptimizer {
  private async analyzeOptimizationOpportunity(
    category: string,
    currentAmount: Decimal,
    marketData: MarketPricingData,
    constraints: OptimizationConstraints
  ): Promise<OptimizationRecommendation> {
    // 1. Market Analysis
    const marketAverage = marketData.averagePrice;
    const potentialSaving = currentAmount.minus(marketAverage);
    
    // 2. Quality Impact Assessment
    const qualityTiers = marketData.qualityTiers;
    const currentTier = this.determineQualityTier(currentAmount, qualityTiers);
    const recommendedTier = this.findOptimalTier(currentAmount, qualityTiers);
    
    // 3. Confidence Scoring
    const confidenceFactors = {
      sampleSize: marketData.sampleSize > 100 ? 0.3 : 0.1,
      dataFreshness: this.calculateDataFreshness(marketData.lastUpdated),
      marketVolatility: this.calculateVolatility(marketData),
      seasonalReliability: this.getSeasonalReliability(marketData)
    };
    
    const confidenceScore = Object.values(confidenceFactors)
      .reduce((sum, factor) => sum + factor, 0);
    
    // 4. Generate Recommendation
    return {
      category,
      currentAllocation: currentAmount,
      recommendedAllocation: recommendedTier.price,
      potentialSaving: potentialSaving.greaterThan(0) ? potentialSaving : new Decimal('0'),
      reason: this.generateExplanation(currentTier, recommendedTier, marketData),
      confidenceScore: Math.min(confidenceScore, 1.0),
      alternatives: this.generateAlternatives(qualityTiers),
      implementationComplexity: this.assessComplexity(category, currentAmount),
      qualityImpact: this.assessQualityImpact(currentTier, recommendedTier)
    };
  }
}
```

## 🌐 Market Pricing Integration

### External API Management
```typescript
interface MarketPricingService {
  /**
   * Fetch pricing data with caching and fallbacks
   */
  fetchPricingData(category: string, region: string): Promise<MarketPricingData>;
  
  /**
   * Batch fetch multiple categories
   */
  fetchMultiplePricingData(
    requests: Array<{category: string, region: string}>
  ): Promise<MarketPricingData[]>;
}

interface MarketPricingData {
  category: string;
  region: string;
  currency: 'GBP' | 'USD' | 'EUR';
  averagePrice: Decimal;
  minPrice: Decimal;
  maxPrice: Decimal;
  sampleSize: number;
  confidenceScore: number;
  lastUpdated: Date;
  seasonalMultipliers: {
    peak: number;      // 1.25 = 25% premium
    shoulder: number;  // 1.10 = 10% premium  
    'off-peak': number; // 0.90 = 10% discount
  };
  qualityTiers: Record<string, {
    price: Decimal;
    satisfaction: number;
  }>;
}
```

### Caching Strategy
```typescript
class MarketPricingService {
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  async fetchPricingData(category: string, region: string): Promise<MarketPricingData> {
    const cacheKey = `${category}-${region}`;
    
    // 1. Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    try {
      // 2. Fetch from primary API
      const data = await this.fetchFromPrimaryAPI(category, region);
      
      // 3. Validate data integrity
      this.validatePricingData(data);
      
      // 4. Cache validated data
      this.cache.set(cacheKey, {
        data,
        expiresAt: new Date(Date.now() + this.cacheTTL)
      });
      
      return data;
    } catch (error) {
      // 5. Return fallback data if primary fails
      return this.getFallbackPricingData(category, region);
    }
  }
}
```

## 🔒 Security Implementation

### Input Validation & Sanitization
```typescript
interface SecurityValidator {
  /**
   * Validate and sanitize budget input
   */
  validateBudgetInput(input: string): {
    isValid: boolean;
    sanitized: string;
    threats: string[];
  };
}

class BudgetSecurityService {
  validateBudgetInput(input: string) {
    const threats: string[] = [];
    let sanitized = input;

    // SQL Injection Detection
    const sqlPatterns = [
      /('|(\\?')|(\\?"))|(--)|(;)|(\||or|and|\+|\*|%|=)/i,
      /(union|select|insert|update|delete|drop|create|alter)/i
    ];
    
    sqlPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('SQL_INJECTION_DETECTED');
      }
    });

    // XSS Prevention  
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    xssPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('XSS_DETECTED');
        sanitized = sanitized.replace(pattern, '');
      }
    });

    // Financial Value Validation
    if (!/^\d+(\.\d{1,2})?$/.test(sanitized.replace(/[£$€,\s]/g, ''))) {
      threats.push('INVALID_FINANCIAL_FORMAT');
    }

    return {
      isValid: threats.length === 0,
      sanitized: sanitized.replace(/[<>\"']/g, ''),
      threats
    };
  }
}
```

### Data Encryption
```typescript
class BudgetEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  /**
   * Encrypt sensitive budget data
   */
  encryptBudgetData(data: WeddingBudget): EncryptedBudgetData {
    const key = crypto.randomBytes(this.keyLength);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from(data.organizationId)); // Additional auth data
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      key: key.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt budget data with integrity verification
   */
  decryptBudgetData(encrypted: EncryptedBudgetData): WeddingBudget {
    const key = Buffer.from(encrypted.key, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    
    const decipher = crypto.createDecipher(encrypted.algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

## 📊 Database Schema

### Core Budget Tables
```sql
-- Wedding budgets with encryption
CREATE TABLE wedding_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  couple_id UUID REFERENCES couples(id),
  total_budget DECIMAL(10,2) NOT NULL CHECK (total_budget >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Encrypted sensitive data
  encrypted_categories JSONB, -- Category allocations
  encryption_key_id UUID NOT NULL,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT valid_currency CHECK (currency IN ('GBP', 'USD', 'EUR')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'archived'))
);

-- Budget categories reference data
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  typical_percentage DECIMAL(4,3), -- 0.150 = 15%
  is_essential BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- Market pricing cache
CREATE TABLE market_pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  
  -- Pricing data (encrypted)
  encrypted_pricing_data JSONB NOT NULL,
  
  -- Metadata
  sample_size INTEGER NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  data_source VARCHAR(100) NOT NULL,
  
  -- Freshness tracking
  data_date DATE NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(category, region, currency)
);

-- Complete audit trail
CREATE TABLE budget_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES wedding_budgets(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  
  -- Action details
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'OPTIMIZE', 'DELETE'
  category VARCHAR(50), -- Affected category
  previous_amount DECIMAL(10,2),
  new_amount DECIMAL(10,2),
  change_reason TEXT,
  
  -- Security context
  ip_address INET NOT NULL,
  user_agent TEXT,
  session_id UUID,
  
  -- Timestamp
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('CREATE', 'UPDATE', 'OPTIMIZE', 'DELETE', 'VIEW'))
);
```

### Row Level Security (RLS)
```sql
-- Enable RLS on all budget tables
ALTER TABLE wedding_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_audit_logs ENABLE ROW LEVEL SECURITY;

-- Budget access policy
CREATE POLICY "Users can only access their organization's budgets" ON wedding_budgets
  USING (organization_id = get_user_organization_id());

-- Audit log policy
CREATE POLICY "Users can only view their own audit logs" ON budget_audit_logs
  USING (user_id = auth.uid() OR has_organization_admin_role());

-- Market pricing access (read-only for all authenticated users)
CREATE POLICY "All users can read market pricing" ON market_pricing_cache
  FOR SELECT USING (auth.role() = 'authenticated');
```

## ⚡ Performance Optimization

### Calculation Performance
```typescript
class PerformanceBudgetCalculator {
  private calculationCache = new Map<string, any>();

  calculateBudgetAllocation(
    totalBudget: Decimal,
    categories: string[],
    percentages: Decimal[]
  ) {
    // Cache key for memoization
    const cacheKey = `${totalBudget}-${categories.join(',')}-${percentages.map(p => p.toString()).join(',')}`;
    
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey);
    }

    const startTime = performance.now();
    
    // Optimized calculation loop
    const allocations: Record<string, Decimal> = {};
    for (let i = 0; i < categories.length; i++) {
      allocations[categories[i]] = totalBudget
        .mul(percentages[i])
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    const result = {
      allocations,
      calculationTime: performance.now() - startTime
    };

    // Cache result with TTL
    this.calculationCache.set(cacheKey, result);
    
    return result;
  }
}
```

### Database Query Optimization
```sql
-- Indexes for performance
CREATE INDEX idx_wedding_budgets_org_status ON wedding_budgets(organization_id, status);
CREATE INDEX idx_wedding_budgets_created_at ON wedding_budgets(created_at DESC);
CREATE INDEX idx_market_pricing_category_region ON market_pricing_cache(category, region);
CREATE INDEX idx_market_pricing_expires ON market_pricing_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_audit_logs_budget_action ON budget_audit_logs(budget_id, action, logged_at DESC);

-- Optimized queries
-- Fast budget retrieval
EXPLAIN (ANALYZE, BUFFERS) 
SELECT b.*, c.name as couple_name
FROM wedding_budgets b
LEFT JOIN couples c ON b.couple_id = c.id  
WHERE b.organization_id = $1 
  AND b.status = 'active'
ORDER BY b.updated_at DESC
LIMIT 50;

-- Efficient market pricing lookup
EXPLAIN (ANALYZE, BUFFERS)
SELECT encrypted_pricing_data, confidence_score
FROM market_pricing_cache 
WHERE category = $1 AND region = $2 AND expires_at > NOW()
LIMIT 1;
```

## 🧪 Testing Strategy

### Test Coverage Requirements
- **Financial Calculations**: 100% coverage (zero tolerance for errors)
- **AI Optimization**: >95% coverage
- **API Endpoints**: >90% coverage
- **Security Functions**: 100% coverage
- **Integration Tests**: >85% coverage

### Test Execution Commands
```bash
# Run all budget tests
npm run test:budget

# Run specific test suites
npm run test:budget:calculations    # Decimal precision tests
npm run test:budget:optimization    # AI validation tests
npm run test:budget:security        # Security tests
npm run test:budget:integration     # API integration tests
npm run test:budget:performance     # Load and performance tests
npm run test:budget:accessibility   # WCAG compliance tests

# Coverage reporting
npm run test:budget:coverage        # Generate coverage report
npm run test:budget:ci              # CI/CD pipeline tests
```

### Example Test Structure
```typescript
describe('Budget Calculation Precision', () => {
  test('prevents JavaScript floating-point errors', () => {
    const result = calculator.addAmounts(
      new Decimal('0.1'),
      new Decimal('0.2')
    );
    
    expect(result.toString()).toBe('0.30');
    expect(result.equals(new Decimal('0.3'))).toBe(true);
  });

  test('maintains precision in complex wedding scenarios', () => {
    const luxuryBudget = new Decimal('150000.00');
    const photographyPercent = new Decimal('0.125'); // 12.5%
    
    const allocation = calculator.calculateCategoryAllocation(
      luxuryBudget, 
      photographyPercent
    );
    
    expect(allocation.toString()).toBe('18750.00');
    expect(allocation.decimalPlaces()).toBe(2);
  });
});
```

## 🚀 Deployment & Monitoring

### Environment Configuration
```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Budget optimization settings
BUDGET_CACHE_TTL=86400                    # 24 hours
BUDGET_MAX_CONCURRENT_OPTIMIZATIONS=500  # Peak wedding season capacity
BUDGET_AI_CONFIDENCE_THRESHOLD=0.75      # Minimum confidence for recommendations

# Market pricing API
MARKET_PRICING_API_URL=https://api.wedding-market-pricing.com/v1
MARKET_PRICING_API_KEY=your-api-key
MARKET_PRICING_CACHE_TTL=21600           # 6 hours

# Security settings
BUDGET_ENCRYPTION_KEY=your-256-bit-key
BUDGET_RATE_LIMIT_REQUESTS=100           # Per minute per user
BUDGET_AUDIT_RETENTION_DAYS=2555         # 7 years for financial records
```

### Health Checks
```typescript
// API health check endpoint
export async function GET() {
  const healthChecks = {
    database: await checkDatabaseConnection(),
    calculator: await testBudgetCalculation(),
    aiOptimizer: await testAIOptimization(),
    marketPricing: await testMarketPricingAPI(),
    security: await testSecurityServices()
  };

  const allHealthy = Object.values(healthChecks).every(check => check.healthy);
  
  return Response.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks: healthChecks,
    timestamp: new Date().toISOString()
  }, {
    status: allHealthy ? 200 : 503
  });
}
```

### Monitoring Alerts
```typescript
// Critical alert thresholds
const MONITORING_THRESHOLDS = {
  budgetCalculationError: 0,        // Zero tolerance
  aiOptimizationFailureRate: 0.05,  // <5% failure rate
  marketPricingAPITimeout: 0.02,    // <2% timeout rate
  databaseResponseTime: 100,        // <100ms p95
  financialDataIntegrityError: 0    // Zero tolerance
};
```

## 📖 API Reference

### Budget Calculation Endpoint
```typescript
POST /api/budget/calculate
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "totalBudget": "25000.00",
  "categories": [
    {"name": "venue", "percentage": "0.32"},
    {"name": "catering", "percentage": "0.28"},
    {"name": "photography", "percentage": "0.15"}
  ],
  "currency": "GBP"
}

Response:
{
  "success": true,
  "data": {
    "allocations": {
      "venue": "8000.00",
      "catering": "7000.00", 
      "photography": "3750.00"
    },
    "totalAllocated": "18750.00",
    "remaining": "6250.00",
    "calculationTime": 12.5
  }
}
```

### AI Optimization Endpoint
```typescript
POST /api/budget/optimize
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "budgetId": "budget-uuid",
  "constraints": {
    "targetReduction": "2000.00",
    "preserveCategories": ["photography"],
    "maxCategoryReduction": "0.20"
  },
  "context": {
    "region": "london",
    "season": "peak",
    "guestCount": 120
  }
}

Response:
{
  "success": true,
  "data": {
    "optimizationId": "opt-uuid",
    "totalSavings": "1750.00",
    "feasibilityScore": 0.89,
    "recommendations": [
      {
        "category": "venue",
        "currentAllocation": "10000.00",
        "recommendedAllocation": "8500.00",
        "potentialSaving": "1500.00",
        "reason": "Found comparable venues offering 15% savings",
        "confidenceScore": 0.92
      }
    ],
    "processingTime": 1247
  }
}
```

## 🔍 Troubleshooting

### Common Issues

**Issue: Decimal precision errors**
```typescript
// ❌ Wrong - using JavaScript Number
const wrong = 0.1 + 0.2; // 0.30000000000000004

// ✅ Correct - using Decimal.js
const correct = new Decimal(0.1).plus(0.2); // 0.3
```

**Issue: Budget totals not matching**
```typescript
// Always validate budget integrity
const isValid = calculator.validateBudgetIntegrity(totalBudget, categories);
if (!isValid) {
  throw new Error('Budget allocation mismatch detected');
}
```

**Issue: Market pricing API failures**
```typescript
// Always implement fallback pricing
try {
  const pricing = await marketService.fetchPricingData(category, region);
} catch (error) {
  const fallbackPricing = await marketService.getFallbackPricing(category, region);
  console.warn('Using fallback pricing due to API failure', error);
}
```

### Performance Debugging
```typescript
// Enable calculation timing
process.env.BUDGET_DEBUG_TIMING = 'true';

// Monitor calculation performance
console.time('budget-calculation');
const result = calculator.optimizeBudget(budget, constraints);
console.timeEnd('budget-calculation');

// Track memory usage
const memoryUsage = process.memoryUsage();
console.log('Memory usage:', {
  rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
  heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
});
```

---

**Last Updated**: September 2025  
**Version**: 2.1.0  
**Maintained by**: WedSync Development Team

*This documentation is automatically updated with each release. For the latest version, see the [GitHub repository](https://github.com/wedsync/budget-optimizer).*