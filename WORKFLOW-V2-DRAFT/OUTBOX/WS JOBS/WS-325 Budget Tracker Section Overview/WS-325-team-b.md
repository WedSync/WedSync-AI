# TEAM B - ROUND 1: WS-325 - Budget Tracker Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for wedding budget tracking with financial security
**FEATURE ID:** WS-325 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Wedding budgets and financial tracking
CREATE TABLE wedding_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  total_budget NUMERIC(10,2) NOT NULL,
  categories JSONB DEFAULT '{}',
  expenses JSONB DEFAULT '[]',
  payments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense tracking and receipts
CREATE TABLE wedding_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES wedding_budgets(id),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  vendor_id UUID REFERENCES user_profiles(id),
  receipt_url TEXT,
  expense_date DATE,
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. BUDGET TRACKER ENDPOINTS
```typescript
// GET /api/budget-tracker/budgets
// POST /api/budget-tracker/budgets
// PUT /api/budget-tracker/budgets/[id]
// GET /api/budget-tracker/expenses
// POST /api/budget-tracker/expenses
// PUT /api/budget-tracker/expenses/[id]
```

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/budget-tracker/
- **Services:** $WS_ROOT/wedsync/src/lib/services/budget-tracker/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/

---

**EXECUTE IMMEDIATELY - Build the budget tracker backend for secure financial management!**