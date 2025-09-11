# WS-245: Wedding Budget Optimizer System - Technical Specification

## Executive Summary

An AI-powered wedding budget optimization system that helps couples and planners make data-driven financial decisions, track spending patterns, identify cost-saving opportunities, and ensure budget adherence throughout the wedding planning process.

**Estimated Effort**: 134 hours
- **Frontend**: 48 hours (36%)
- **Backend**: 42 hours (31%)
- **Integration**: 24 hours (18%)
- **Platform**: 12 hours (9%)
- **QA/Testing**: 8 hours (6%)

**Business Impact**:
- Help couples save 15-20% on wedding costs through smart optimization
- Increase vendor booking conversion by 25% via budget-aware recommendations
- Reduce planning stress by 40% through automated budget monitoring
- Improve supplier relationships via transparent pricing insights

## User Story

**As a** couple planning a £25,000 wedding  
**I want to** receive AI-powered suggestions on budget allocation and cost optimization  
**So that** I can maximize value while staying within budget constraints

**Acceptance Criteria**:
- ✅ AI analyzes local market prices and suggests optimal budget distribution
- ✅ Real-time alerts when approaching budget limits in any category
- ✅ Alternative vendor suggestions based on budget constraints
- ✅ Seasonal pricing insights and booking recommendations
- ✅ ROI analysis for different spending priorities
- ✅ Integration with actual vendor pricing and availability

## Database Schema

```sql
-- Wedding budget templates and baselines
CREATE TABLE budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template categorization
  budget_range budget_range_enum NOT NULL,
  wedding_style style_enum NOT NULL,
  guest_count_range VARCHAR(20), -- e.g., "50-75", "100-150"
  location_type location_type_enum,
  
  -- Budget allocation percentages
  venue_percentage DECIMAL(5,2) NOT NULL,
  catering_percentage DECIMAL(5,2) NOT NULL,
  photography_percentage DECIMAL(5,2) NOT NULL,
  flowers_percentage DECIMAL(5,2) NOT NULL,
  music_percentage DECIMAL(5,2) NOT NULL,
  attire_percentage DECIMAL(5,2) NOT NULL,
  transport_percentage DECIMAL(5,2) NOT NULL,
  stationery_percentage DECIMAL(5,2) NOT NULL,
  miscellaneous_percentage DECIMAL(5,2) NOT NULL,
  
  -- Market data
  created_from_market_data BOOLEAN DEFAULT FALSE,
  data_source VARCHAR(100),
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual wedding budgets
CREATE TABLE wedding_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  
  -- Budget basics
  total_budget DECIMAL(10,2) NOT NULL,
  currency CHAR(3) DEFAULT 'GBP',
  
  -- Template and customization
  based_on_template UUID REFERENCES budget_templates(id),
  custom_allocations JSONB, -- Override template percentages
  
  -- AI optimization settings
  optimization_goals TEXT[], -- 'maximize_quality', 'minimize_cost', 'balance'
  risk_tolerance risk_tolerance_enum DEFAULT 'medium',
  flexibility_preferences JSONB,
  
  -- Tracking and status
  spent_to_date DECIMAL(10,2) DEFAULT 0,
  committed_amount DECIMAL(10,2) DEFAULT 0,
  remaining_budget DECIMAL(10,2),
  
  -- AI insights
  last_optimization_run TIMESTAMP WITH TIME ZONE,
  optimization_suggestions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget categories with AI-powered allocation
CREATE TABLE budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES wedding_budgets(id) ON DELETE CASCADE,
  
  -- Category definition
  category category_enum NOT NULL,
  subcategory VARCHAR(100),
  
  -- Budget allocation
  allocated_amount DECIMAL(10,2) NOT NULL,
  spent_amount DECIMAL(10,2) DEFAULT 0,
  committed_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2),
  
  -- AI optimization data
  market_average DECIMAL(10,2),
  recommended_range_min DECIMAL(10,2),
  recommended_range_max DECIMAL(10,2),
  priority_score INTEGER, -- 1-10 importance to couple
  
  -- Optimization suggestions
  optimization_opportunities JSONB,
  alternative_options JSONB,
  seasonal_pricing_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget line items and transactions
CREATE TABLE budget_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  
  -- Item details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  vendor_id UUID REFERENCES suppliers(id),
  
  -- Financial details
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  payment_status payment_status_enum DEFAULT 'pending',
  
  -- Payment schedule
  deposit_amount DECIMAL(10,2),
  deposit_due_date DATE,
  final_payment_due_date DATE,
  payment_terms TEXT,
  
  -- AI insights
  market_comparison JSONB, -- How this compares to market rates
  value_score INTEGER, -- AI-calculated value assessment
  alternative_suggestions JSONB,
  
  -- Status tracking
  status line_item_status_enum DEFAULT 'estimated',
  booking_confirmed BOOLEAN DEFAULT FALSE,
  contract_signed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market pricing data for AI optimization
CREATE TABLE market_pricing_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Geographic and temporal context
  location VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  country CHAR(2) DEFAULT 'GB',
  data_period DATE NOT NULL,
  
  -- Service categorization
  category category_enum NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  
  -- Pricing statistics
  average_price DECIMAL(10,2) NOT NULL,
  median_price DECIMAL(10,2),
  price_range_low DECIMAL(10,2),
  price_range_high DECIMAL(10,2),
  
  -- Market context
  sample_size INTEGER,
  confidence_level DECIMAL(3,2),
  seasonal_variation JSONB,
  
  -- Data quality
  data_source VARCHAR(100) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget optimization recommendations
CREATE TABLE budget_optimizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES wedding_budgets(id) ON DELETE CASCADE,
  
  -- Optimization details
  recommendation_type optimization_type_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Financial impact
  potential_savings DECIMAL(10,2),
  investment_required DECIMAL(10,2),
  roi_percentage DECIMAL(5,2),
  
  -- Recommendation metadata
  confidence_score DECIMAL(3,2) NOT NULL,
  priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 10),
  implementation_difficulty difficulty_enum,
  
  -- Recommendation details
  affected_categories category_enum[],
  action_items JSONB,
  timeline_recommendations JSONB,
  
  -- Tracking
  status recommendation_status_enum DEFAULT 'pending',
  user_feedback JSONB,
  implemented_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget alerts and notifications
CREATE TABLE budget_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES wedding_budgets(id) ON DELETE CASCADE,
  
  -- Alert configuration
  alert_type alert_type_enum NOT NULL,
  trigger_condition JSONB NOT NULL, -- Flexible alert conditions
  
  -- Alert details
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity alert_severity_enum DEFAULT 'medium',
  
  -- Notification settings
  notification_channels TEXT[], -- 'email', 'sms', 'push', 'dashboard'
  recipient_roles TEXT[], -- 'couple', 'planner', 'vendor'
  
  -- Alert lifecycle
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums for budget system
CREATE TYPE budget_range_enum AS ENUM ('under_10k', '10k_25k', '25k_50k', '50k_100k', 'over_100k');
CREATE TYPE style_enum AS ENUM ('traditional', 'modern', 'rustic', 'luxury', 'destination', 'intimate');
CREATE TYPE location_type_enum AS ENUM ('city_center', 'suburban', 'countryside', 'destination', 'home');
CREATE TYPE risk_tolerance_enum AS ENUM ('conservative', 'medium', 'aggressive');
CREATE TYPE category_enum AS ENUM ('venue', 'catering', 'photography', 'flowers', 'music', 'attire', 'transport', 'stationery', 'miscellaneous');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'deposit_paid', 'partial_paid', 'fully_paid', 'refunded');
CREATE TYPE line_item_status_enum AS ENUM ('estimated', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled');
CREATE TYPE optimization_type_enum AS ENUM ('cost_reduction', 'value_improvement', 'timing_optimization', 'vendor_alternative', 'package_bundling');
CREATE TYPE difficulty_enum AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE recommendation_status_enum AS ENUM ('pending', 'viewed', 'accepted', 'rejected', 'implemented');
CREATE TYPE alert_type_enum AS ENUM ('budget_exceeded', 'category_overspend', 'payment_due', 'market_opportunity', 'seasonal_pricing');
CREATE TYPE alert_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
```

## API Endpoints

### Budget Management
```typescript
// Create/update wedding budget
POST|PUT /api/weddings/{weddingId}/budget
{
  totalBudget: number;
  optimizationGoals: string[];
  riskTolerance: 'conservative' | 'medium' | 'aggressive';
  customAllocations?: CategoryAllocation[];
}

// Get budget with AI insights
GET /api/weddings/{weddingId}/budget/insights

// Get budget optimization recommendations
GET /api/weddings/{weddingId}/budget/optimizations
```

### Market Data Integration
```typescript
// Get market pricing for category
GET /api/market-data/pricing
{
  category: string;
  location: string;
  dateRange: string;
}

// Compare vendor pricing to market
GET /api/market-data/compare
{
  vendorId: string;
  serviceType: string;
  location: string;
}
```

### Budget Optimization
```typescript
// Run AI budget optimization
POST /api/weddings/{weddingId}/budget/optimize
{
  goals: string[];
  constraints: BudgetConstraints;
  preferences: OptimizationPreferences;
}

// Accept/reject optimization recommendation
POST /api/budget/optimizations/{optimizationId}/respond
{
  action: 'accept' | 'reject';
  feedback?: string;
}
```

## Frontend Components

### Budget Dashboard (`/components/budget/BudgetDashboard.tsx`)
```typescript
interface BudgetDashboardProps {
  weddingId: string;
  budget: WeddingBudget;
  showOptimizations?: boolean;
}

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  weddingId,
  budget,
  showOptimizations = true
}) => {
  // Budget overview with spending vs allocated
  // Visual budget breakdown by category
  // AI optimization recommendations
  // Spending alerts and warnings
  // Market comparison insights
  // Payment timeline visualization
};
```

### Budget Optimizer (`/components/budget/BudgetOptimizer.tsx`)
```typescript
const BudgetOptimizer: React.FC<{budgetId: string}> = ({ budgetId }) => {
  // AI-powered optimization suggestions
  // Interactive budget reallocation
  // Market-based recommendations
  // Seasonal pricing insights
  // Alternative vendor suggestions
  // ROI calculations for different scenarios
};
```

### Category Breakdown (`/components/budget/CategoryBreakdown.tsx`)
```typescript
interface CategoryBreakdownProps {
  categories: BudgetCategory[];
  allowReallocation: boolean;
  showMarketComparison: boolean;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  allowReallocation,
  showMarketComparison
}) => {
  // Interactive category budget editing
  // Drag-and-drop budget reallocation
  // Market price comparison indicators
  // Overspend alerts and warnings
  // Optimization opportunities per category
};
```

## Integration Requirements

### AI Budget Optimization Engine
```typescript
class BudgetOptimizationEngine {
  async generateOptimizations(
    budget: WeddingBudget,
    marketData: MarketPricingData[],
    preferences: OptimizationPreferences
  ): Promise<BudgetOptimization[]> {
    // Analyze spending patterns
    // Compare to market data
    // Identify optimization opportunities
    // Generate actionable recommendations
    // Calculate potential savings and ROI
  }
  
  async optimizeBudgetAllocation(
    totalBudget: number,
    priorities: CategoryPriority[],
    constraints: BudgetConstraints
  ): Promise<OptimalAllocation> {
    // AI-powered budget distribution
    // Factor in market pricing
    // Consider seasonal variations
    // Optimize for value and satisfaction
  }
}
```

### Market Data Integration
```typescript
class MarketDataService {
  async fetchPricingData(
    category: string,
    location: string,
    timeframe: string
  ): Promise<MarketPricingData> {
    // Real-time market pricing collection
    // Vendor rate aggregation
    // Seasonal trend analysis
    // Regional price variations
  }
  
  async compareVendorPricing(
    vendor: Supplier,
    marketData: MarketPricingData
  ): Promise<PricingComparison> {
    // Value assessment calculations
    // Market position analysis
    // Price competitiveness scoring
  }
}
```

## Security & Privacy

### Financial Data Protection
- PCI DSS compliance for payment information
- Encrypted storage of all financial data
- Audit logging for budget modifications
- Role-based access to budget information

## Performance Requirements

### Optimization Performance
- Budget optimization calculations: <3 seconds
- Market data retrieval: <1 second
- Real-time budget updates: <500ms
- Dashboard loading: <2 seconds

### Data Accuracy
- Market pricing accuracy: >95%
- Budget calculations precision: 100%
- Optimization recommendations relevance: >85%

## Testing Strategy

### Financial Calculations Testing
- Budget allocation accuracy validation
- Optimization algorithm verification
- Market data integration testing
- Edge case financial scenarios

### User Experience Testing
- Budget modification workflows
- Optimization acceptance flows
- Alert and notification effectiveness

## Success Metrics

### User Engagement
- Budget feature adoption: >80% of active users
- Optimization recommendation acceptance: >60%
- Budget tracking consistency: >90%
- User satisfaction with recommendations: >4.2/5

### Business Impact
- Average cost savings per wedding: 15-20%
- Vendor booking conversion increase: 25%
- Budget adherence improvement: 40%
- Planning stress reduction: 30%

---

**Feature ID**: WS-245  
**Priority**: High  
**Complexity**: High  
**Dependencies**: Market Data APIs, AI/ML Infrastructure  
**Estimated Timeline**: 17 sprint days