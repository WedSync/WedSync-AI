-- WS-158 Task Categories System
-- Team A - Round 3: Complete task categorization with drag-and-drop and visual timeline
-- Wedding phase-based categorization with color coding and advanced management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: WEDDING PHASE CATEGORIES
-- =====================================================

-- Create wedding phase enum for categorization
CREATE TYPE IF NOT EXISTS wedding_phase AS ENUM (
  'planning',      -- Pre-wedding planning phase
  'setup',         -- Wedding day setup phase
  'ceremony',      -- Ceremony phase
  'cocktail',      -- Cocktail hour
  'reception',     -- Reception phase
  'breakdown',     -- Breakdown and cleanup phase
  'post_wedding'   -- Post-wedding tasks
);

-- Task category table for flexible categorization
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase wedding_phase NOT NULL,
  color_hex TEXT NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  icon_name TEXT DEFAULT 'calendar',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_org_category_name UNIQUE(organization_id, name)
);

-- Create indexes for category performance
CREATE INDEX IF NOT EXISTS idx_task_categories_org_active 
ON task_categories(organization_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_categories_phase 
ON task_categories(phase, display_order);

-- =====================================================
-- PART 2: ENHANCED TASK CATEGORIZATION
-- =====================================================

-- Add category fields to workflow_tasks
ALTER TABLE workflow_tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase wedding_phase,
ADD COLUMN IF NOT EXISTS color_hex TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS timeline_position INTEGER, -- Position on visual timeline (in minutes from start)
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Create indexes for category-based operations
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_category 
ON workflow_tasks(category_id) WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_phase 
ON workflow_tasks(phase) WHERE phase IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_timeline 
ON workflow_tasks(wedding_id, timeline_position) WHERE timeline_position IS NOT NULL;

-- =====================================================
-- PART 3: CATEGORY PREFERENCES AND TEMPLATES
-- =====================================================

-- Wedding type category preferences
CREATE TABLE IF NOT EXISTS category_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wedding_type TEXT NOT NULL, -- e.g., 'traditional', 'destination', 'elopement', 'cultural'
  category_id UUID NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  default_task_count INTEGER DEFAULT 0,
  typical_duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_wedding_type_category UNIQUE(organization_id, wedding_type, category_id)
);

-- Index for preference lookups
CREATE INDEX IF NOT EXISTS idx_category_preferences_wedding_type 
ON category_preferences(organization_id, wedding_type);

-- =====================================================
-- PART 4: DRAG AND DROP SUPPORT
-- =====================================================

-- Task position tracking for drag and drop
CREATE TABLE IF NOT EXISTS task_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES task_categories(id) ON DELETE CASCADE,
  position_x INTEGER NOT NULL DEFAULT 0, -- X position on timeline/board
  position_y INTEGER NOT NULL DEFAULT 0, -- Y position on timeline/board
  swimlane TEXT DEFAULT 'default', -- Swimlane for grouped view
  last_moved_by UUID REFERENCES auth.users(id),
  last_moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_task_position UNIQUE(task_id)
);

-- Index for position queries
CREATE INDEX IF NOT EXISTS idx_task_positions_category 
ON task_positions(category_id);

-- =====================================================
-- PART 5: VISUAL TIMELINE DATA
-- =====================================================

-- Timeline view configurations
CREATE TABLE IF NOT EXISTS timeline_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  view_type TEXT NOT NULL DEFAULT 'phase', -- 'phase', 'chronological', 'helper', 'location'
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '23:00',
  time_scale INTEGER DEFAULT 15, -- Minutes per grid unit
  show_dependencies BOOLEAN DEFAULT true,
  show_helpers BOOLEAN DEFAULT true,
  color_by TEXT DEFAULT 'category', -- 'category', 'priority', 'status', 'helper'
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_wedding_timeline_config UNIQUE(wedding_id, view_type)
);

-- =====================================================
-- PART 6: CATEGORY ANALYTICS
-- =====================================================

-- Category usage analytics
CREATE TABLE IF NOT EXISTS category_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  task_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  average_completion_time INTEGER, -- in minutes
  overdue_count INTEGER DEFAULT 0,
  reassignment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_category_wedding_analytics UNIQUE(category_id, wedding_id)
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_category_analytics_wedding 
ON category_analytics(wedding_id);

-- =====================================================
-- PART 7: DEFAULT CATEGORIES
-- =====================================================

-- Insert default wedding phase categories (to be run for each organization)
CREATE OR REPLACE FUNCTION create_default_categories(org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO task_categories (organization_id, name, phase, color_hex, icon_name, display_order, is_default)
  VALUES 
    (org_id, 'Wedding Planning', 'planning', '#9333EA', 'clipboard-list', 0, true),
    (org_id, 'Venue Setup', 'setup', '#3B82F6', 'building', 100, true),
    (org_id, 'Ceremony Preparation', 'ceremony', '#10B981', 'heart', 200, true),
    (org_id, 'Ceremony Tasks', 'ceremony', '#059669', 'users', 210, true),
    (org_id, 'Cocktail Hour', 'cocktail', '#F59E0B', 'wine-glass', 300, true),
    (org_id, 'Reception Setup', 'reception', '#EF4444', 'music', 400, true),
    (org_id, 'Reception Activities', 'reception', '#DC2626', 'star', 410, true),
    (org_id, 'Breakdown & Cleanup', 'breakdown', '#6B7280', 'trash', 500, true),
    (org_id, 'Post-Wedding Tasks', 'post_wedding', '#8B5CF6', 'envelope', 600, true)
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 8: RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_analytics ENABLE ROW LEVEL SECURITY;

-- Task categories policies
CREATE POLICY "Users can view categories in their organization" 
ON task_categories FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage categories in their organization" 
ON task_categories FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Category preferences policies
CREATE POLICY "Users can view preferences in their organization" 
ON category_preferences FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage preferences in their organization" 
ON category_preferences FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Task positions policies
CREATE POLICY "Users can view task positions for their weddings" 
ON task_positions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workflow_tasks wt
    JOIN weddings w ON wt.wedding_id = w.id
    WHERE wt.id = task_positions.task_id
    AND w.organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update task positions for their weddings" 
ON task_positions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM workflow_tasks wt
    JOIN weddings w ON wt.wedding_id = w.id
    WHERE wt.id = task_positions.task_id
    AND w.organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Timeline configs policies
CREATE POLICY "Users can view timeline configs for their weddings" 
ON timeline_configs FOR SELECT 
USING (
  wedding_id IN (
    SELECT id FROM weddings 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage timeline configs for their weddings" 
ON timeline_configs FOR ALL 
USING (
  wedding_id IN (
    SELECT id FROM weddings 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Category analytics policies
CREATE POLICY "Users can view analytics for their categories" 
ON category_analytics FOR SELECT 
USING (
  category_id IN (
    SELECT id FROM task_categories 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- =====================================================
-- PART 9: HELPER FUNCTIONS
-- =====================================================

-- Function to update task category with cascade updates
CREATE OR REPLACE FUNCTION update_task_category(
  p_task_id UUID,
  p_category_id UUID
) RETURNS void AS $$
DECLARE
  v_category RECORD;
BEGIN
  -- Get category details
  SELECT * INTO v_category FROM task_categories WHERE id = p_category_id;
  
  -- Update task with category details
  UPDATE workflow_tasks
  SET 
    category_id = p_category_id,
    phase = v_category.phase,
    color_hex = v_category.color_hex,
    updated_at = NOW()
  WHERE id = p_task_id;
  
  -- Update or create position record
  INSERT INTO task_positions (task_id, category_id, last_moved_by, last_moved_at)
  VALUES (p_task_id, p_category_id, auth.uid(), NOW())
  ON CONFLICT (task_id) 
  DO UPDATE SET 
    category_id = p_category_id,
    last_moved_by = auth.uid(),
    last_moved_at = NOW();
  
  -- Update analytics
  UPDATE category_analytics
  SET task_count = task_count + 1
  WHERE category_id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get timeline data for a wedding
CREATE OR REPLACE FUNCTION get_timeline_data(p_wedding_id UUID)
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  category_id UUID,
  category_name TEXT,
  phase wedding_phase,
  color_hex TEXT,
  timeline_position INTEGER,
  duration_minutes INTEGER,
  assigned_to UUID,
  status task_status,
  priority task_priority
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id AS task_id,
    wt.title AS task_title,
    tc.id AS category_id,
    tc.name AS category_name,
    wt.phase,
    wt.color_hex,
    wt.timeline_position,
    wt.duration_minutes,
    wt.assigned_to,
    wt.status,
    wt.priority
  FROM workflow_tasks wt
  LEFT JOIN task_categories tc ON wt.category_id = tc.id
  WHERE wt.wedding_id = p_wedding_id
  AND wt.timeline_position IS NOT NULL
  ORDER BY wt.timeline_position, wt.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 10: TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON task_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_preferences_updated_at BEFORE UPDATE ON category_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_configs_updated_at BEFORE UPDATE ON timeline_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_analytics_updated_at BEFORE UPDATE ON category_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Migration complete
COMMENT ON TABLE task_categories IS 'WS-158: Task categorization system for wedding phase management';
COMMENT ON TABLE category_preferences IS 'WS-158: Category preferences by wedding type';
COMMENT ON TABLE task_positions IS 'WS-158: Task position tracking for drag and drop';
COMMENT ON TABLE timeline_configs IS 'WS-158: Visual timeline configuration';
COMMENT ON TABLE category_analytics IS 'WS-158: Category usage analytics';