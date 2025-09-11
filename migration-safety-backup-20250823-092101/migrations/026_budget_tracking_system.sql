-- Migration: 026_budget_tracking_system.sql
-- Description: Comprehensive budget tracking system for WS-059
-- Author: Claude Code
-- Date: 2025-01-22

BEGIN;

-- =====================================================
-- BUDGET TRACKING SYSTEM SCHEMA
-- =====================================================

-- 1. Budget Categories Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (spent_amount >= 0),
    remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'dollar-sign',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_categories_name_user_unique UNIQUE(user_id, name),
    CONSTRAINT budget_categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT budget_categories_allocated_positive CHECK (allocated_amount >= 0),
    CONSTRAINT budget_categories_spent_positive CHECK (spent_amount >= 0)
);

-- 2. Budget Transactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
    payment_method VARCHAR(50),
    vendor_name VARCHAR(200),
    receipt_url TEXT,
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_transactions_amount_not_zero CHECK (amount != 0),
    CONSTRAINT budget_transactions_date_reasonable CHECK (transaction_date >= '2020-01-01' AND transaction_date <= CURRENT_DATE + INTERVAL '1 year')
);

-- 3. Budget Receipts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES budget_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_receipts_mime_type_valid CHECK (
        mime_type IN ('image/jpeg', 'image/png', 'image/gif', 'application/pdf')
    ),
    CONSTRAINT budget_receipts_file_size_valid CHECK (file_size > 0 AND file_size <= 10485760)
);

-- Add indexes for performance
CREATE INDEX idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX idx_budget_categories_active ON budget_categories(is_active, user_id);
CREATE INDEX idx_budget_transactions_user_id ON budget_transactions(user_id);
CREATE INDEX idx_budget_transactions_category_id ON budget_transactions(category_id);
CREATE INDEX idx_budget_transactions_date ON budget_transactions(transaction_date DESC);
CREATE INDEX idx_budget_receipts_transaction_id ON budget_receipts(transaction_id);
CREATE INDEX idx_budget_receipts_user_id ON budget_receipts(user_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to update spent amounts
CREATE OR REPLACE FUNCTION update_budget_category_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Update spent amount for the affected category
    UPDATE budget_categories 
    SET 
        spent_amount = (
            SELECT COALESCE(SUM(ABS(amount)), 0)
            FROM budget_transactions 
            WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)
            AND transaction_type = 'expense'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.category_id, OLD.category_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for budget transactions
CREATE TRIGGER trigger_update_budget_spent
    AFTER INSERT OR UPDATE OR DELETE ON budget_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_category_spent();

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trigger_budget_categories_updated_at
    BEFORE UPDATE ON budget_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_budget_transactions_updated_at
    BEFORE UPDATE ON budget_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_receipts ENABLE ROW LEVEL SECURITY;

-- Budget Categories Policies
CREATE POLICY "Users can manage own budget categories" ON budget_categories
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Budget Transactions Policies
CREATE POLICY "Users can manage own budget transactions" ON budget_transactions
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Budget Receipts Policies
CREATE POLICY "Users can manage own budget receipts" ON budget_receipts
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

COMMIT;