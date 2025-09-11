-- WS-112 Quality Control Workflow System Migration
-- Creating comprehensive quality control and review workflow for marketplace templates
-- Team E - Batch 8 Round 2 Implementation

-- Extension of marketplace templates to support quality control workflow
-- This migration adds review workflow tracking, quality assessment, and feedback systems

-- Template review workflow queue and tracking
CREATE TABLE IF NOT EXISTS marketplace_quality_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  
  -- Review priority and scoring
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=highest priority
  auto_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (auto_quality_score >= 0 AND auto_quality_score <= 100),
  performance_score DECIMAL(5,2) DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
  originality_score DECIMAL(5,2) DEFAULT 0 CHECK (originality_score >= 0 AND originality_score <= 1),
  
  -- Review assignment and status
  reviewer_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'approved', 'rejected', 'changes_requested', 'escalated')),
  
  -- Automated checks results
  automated_checks_passed BOOLEAN DEFAULT false,
  automated_checks_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  automated_failures JSONB DEFAULT '[]'::jsonb,
  
  -- Review timeline
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  
  -- SLA tracking
  target_review_time INTERVAL DEFAULT INTERVAL '48 hours',
  is_sla_breached BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0),
  
  -- Resubmission tracking
  original_submission_id UUID REFERENCES marketplace_quality_review_queue(id),
  resubmission_count INTEGER DEFAULT 0 CHECK (resubmission_count >= 0),
  
  -- Creator notes and context
  creator_notes TEXT,
  expedited_review BOOLEAN DEFAULT false,
  target_publish_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate active reviews
  CONSTRAINT unique_active_review UNIQUE (template_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Manual review results and feedback
CREATE TABLE IF NOT EXISTS marketplace_quality_review_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_queue_id UUID NOT NULL REFERENCES marketplace_quality_review_queue(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Review decision
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested', 'escalated')),
  decision_rationale TEXT NOT NULL,
  
  -- Manual quality scores (1-10 scale)
  design_quality_score DECIMAL(3,1) DEFAULT 0 CHECK (design_quality_score >= 1 AND design_quality_score <= 10),
  usefulness_score DECIMAL(3,1) DEFAULT 0 CHECK (usefulness_score >= 1 AND usefulness_score <= 10),
  uniqueness_score DECIMAL(3,1) DEFAULT 0 CHECK (uniqueness_score >= 1 AND uniqueness_score <= 10),
  documentation_score DECIMAL(3,1) DEFAULT 0 CHECK (documentation_score >= 1 AND documentation_score <= 10),
  overall_score DECIMAL(3,1) DEFAULT 0 CHECK (overall_score >= 1 AND overall_score <= 10),
  
  -- Detailed feedback
  strengths TEXT[] DEFAULT '{}',
  improvement_areas TEXT[] DEFAULT '{}',
  specific_feedback TEXT NOT NULL,
  suggested_changes JSONB DEFAULT '[]'::jsonb,
  
  -- Template compliance checklist
  meets_platform_standards BOOLEAN DEFAULT false,
  appropriate_for_target_audience BOOLEAN DEFAULT false,
  pricing_reasonable BOOLEAN DEFAULT false,
  content_quality_acceptable BOOLEAN DEFAULT false,
  technical_requirements_met BOOLEAN DEFAULT false,
  
  -- Review metadata
  review_time_minutes INTEGER DEFAULT 0 CHECK (review_time_minutes >= 0),
  confidence_level DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_level >= 0 AND confidence_level <= 1), -- Reviewer confidence in decision
  complexity_rating INTEGER DEFAULT 3 CHECK (complexity_rating >= 1 AND complexity_rating <= 5),
  
  -- Follow-up actions
  requires_followup BOOLEAN DEFAULT false,
  followup_notes TEXT,
  next_review_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template originality and plagiarism detection
CREATE TABLE IF NOT EXISTS marketplace_template_hashes (
  template_id UUID PRIMARY KEY REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  
  -- Content fingerprinting
  content_hash TEXT NOT NULL,
  structure_hash TEXT NOT NULL,
  feature_hash TEXT NOT NULL,
  metadata_hash TEXT NOT NULL,
  
  -- Similarity detection vectors
  content_tokens TSVECTOR,
  structural_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_signatures JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Hash metadata
  hash_version TEXT DEFAULT '2.0',
  hash_algorithm TEXT DEFAULT 'sha256_composite',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template similarity detection results
CREATE TABLE IF NOT EXISTS marketplace_template_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  similar_template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  
  -- Similarity metrics (0.0000 to 1.0000 scale)
  content_similarity DECIMAL(5,4) NOT NULL CHECK (content_similarity >= 0 AND content_similarity <= 1),
  structure_similarity DECIMAL(5,4) NOT NULL CHECK (structure_similarity >= 0 AND structure_similarity <= 1),
  feature_similarity DECIMAL(5,4) NOT NULL CHECK (feature_similarity >= 0 AND feature_similarity <= 1),
  metadata_similarity DECIMAL(5,4) NOT NULL CHECK (metadata_similarity >= 0 AND metadata_similarity <= 1),
  overall_similarity DECIMAL(5,4) NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 1),
  
  -- Detection metadata
  detection_algorithm TEXT DEFAULT 'cosine_similarity_v2',
  confidence_score DECIMAL(5,4) DEFAULT 1.0000 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  similarity_type TEXT DEFAULT 'content' CHECK (similarity_type IN ('content', 'structure', 'feature', 'metadata', 'mixed')),
  
  -- Review and resolution
  flagged_for_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES suppliers(id),
  review_decision TEXT CHECK (review_decision IN ('original', 'similar_acceptable', 'duplicate', 'derivative')),
  review_notes TEXT,
  
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  -- Prevent duplicate comparisons
  CONSTRAINT unique_similarity_pair UNIQUE (template_id, similar_template_id),
  -- Prevent self-comparison
  CONSTRAINT no_self_similarity CHECK (template_id != similar_template_id)
);

-- Performance testing results
CREATE TABLE IF NOT EXISTS marketplace_template_performance (
  template_id UUID PRIMARY KEY REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  
  -- Performance metrics
  load_time_ms INTEGER DEFAULT 0 CHECK (load_time_ms >= 0),
  render_time_ms INTEGER DEFAULT 0 CHECK (render_time_ms >= 0),
  interaction_time_ms INTEGER DEFAULT 0 CHECK (interaction_time_ms >= 0),
  memory_usage_mb DECIMAL(8,2) DEFAULT 0 CHECK (memory_usage_mb >= 0),
  
  -- Performance scores (0-100 scale)
  load_time_score INTEGER DEFAULT 0 CHECK (load_time_score >= 0 AND load_time_score <= 100),
  render_time_score INTEGER DEFAULT 0 CHECK (render_time_score >= 0 AND render_time_score <= 100),
  interaction_score INTEGER DEFAULT 0 CHECK (interaction_score >= 0 AND interaction_score <= 100),
  memory_score INTEGER DEFAULT 0 CHECK (memory_score >= 0 AND memory_score <= 100),
  overall_performance_score INTEGER DEFAULT 0 CHECK (overall_performance_score >= 0 AND overall_performance_score <= 100),
  
  -- Performance status
  performance_grade TEXT DEFAULT 'F' CHECK (performance_grade IN ('A', 'B', 'C', 'D', 'F')),
  passes_performance_threshold BOOLEAN DEFAULT false,
  performance_issues TEXT[] DEFAULT '{}',
  
  -- Test environment and conditions
  test_device TEXT DEFAULT 'standard_desktop',
  test_browser TEXT DEFAULT 'chrome_latest',
  test_network_speed TEXT DEFAULT '4g',
  test_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Recommendations and optimization
  performance_recommendations JSONB DEFAULT '[]'::jsonb,
  optimization_suggestions TEXT[] DEFAULT '{}',
  bottleneck_analysis JSONB DEFAULT '{}'::jsonb,
  
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated quality checks configuration
CREATE TABLE IF NOT EXISTS marketplace_quality_check_configs (
  check_name TEXT PRIMARY KEY,
  check_category TEXT NOT NULL CHECK (check_category IN ('completeness', 'technical', 'content', 'compliance', 'performance', 'security')),
  check_description TEXT NOT NULL,
  
  -- Check parameters
  is_enabled BOOLEAN DEFAULT true,
  is_blocking BOOLEAN DEFAULT true, -- Prevents manual review if failed
  check_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (check_weight >= 0 AND check_weight <= 5),
  severity_level TEXT DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Thresholds and criteria
  pass_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_algorithm TEXT DEFAULT 'binary',
  threshold_values JSONB DEFAULT '{}'::jsonb,
  
  -- Configuration metadata
  version TEXT DEFAULT '1.0',
  last_updated_by UUID REFERENCES suppliers(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual quality check results for each template
CREATE TABLE IF NOT EXISTS marketplace_quality_check_results (
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  check_name TEXT REFERENCES marketplace_quality_check_configs(check_name) ON DELETE CASCADE,
  
  -- Check results
  passed BOOLEAN NOT NULL,
  score DECIMAL(5,2) DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  check_value TEXT, -- Actual measured value
  expected_value TEXT, -- Expected/threshold value
  
  -- Check details and diagnostics
  check_details JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  error_messages TEXT[] DEFAULT '{}',
  suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Check execution metadata
  check_duration_ms INTEGER DEFAULT 0 CHECK (check_duration_ms >= 0),
  check_version TEXT DEFAULT '1.0',
  execution_context JSONB DEFAULT '{}'::jsonb,
  
  -- Retry and debugging info
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  last_error TEXT,
  
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (template_id, check_name)
);

-- Reviewer performance and metrics tracking
CREATE TABLE IF NOT EXISTS marketplace_reviewer_metrics (
  reviewer_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Review statistics
  total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  approved_reviews INTEGER DEFAULT 0 CHECK (approved_reviews >= 0),
  rejected_reviews INTEGER DEFAULT 0 CHECK (rejected_reviews >= 0),
  changes_requested_reviews INTEGER DEFAULT 0 CHECK (changes_requested_reviews >= 0),
  escalated_reviews INTEGER DEFAULT 0 CHECK (escalated_reviews >= 0),
  
  -- Performance metrics
  avg_review_time_minutes DECIMAL(8,2) DEFAULT 0 CHECK (avg_review_time_minutes >= 0),
  median_review_time_minutes DECIMAL(8,2) DEFAULT 0 CHECK (median_review_time_minutes >= 0),
  accuracy_score DECIMAL(5,4) DEFAULT 0 CHECK (accuracy_score >= 0 AND accuracy_score <= 1), -- Based on appeal outcomes
  consistency_score DECIMAL(5,4) DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 1), -- Compared to other reviewers
  
  -- Quality and satisfaction metrics
  helpful_feedback_rating DECIMAL(3,2) DEFAULT 0 CHECK (helpful_feedback_rating >= 0 AND helpful_feedback_rating <= 5), -- Creator feedback
  review_quality_score DECIMAL(3,2) DEFAULT 0 CHECK (review_quality_score >= 0 AND review_quality_score <= 5),
  creator_satisfaction_score DECIMAL(3,2) DEFAULT 0 CHECK (creator_satisfaction_score >= 0 AND creator_satisfaction_score <= 5),
  
  -- Activity tracking
  last_review_at TIMESTAMPTZ,
  reviews_this_week INTEGER DEFAULT 0 CHECK (reviews_this_week >= 0),
  reviews_this_month INTEGER DEFAULT 0 CHECK (reviews_this_month >= 0),
  
  -- Performance goals and targets
  monthly_review_target INTEGER DEFAULT 20 CHECK (monthly_review_target >= 0),
  target_review_time_minutes INTEGER DEFAULT 45 CHECK (target_review_time_minutes >= 0),
  specialization_categories TEXT[] DEFAULT '{}',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community reporting and flagging system
CREATE TABLE IF NOT EXISTS marketplace_template_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN ('quality_issue', 'inappropriate_content', 'plagiarism', 'misleading_description', 'technical_problem', 'pricing_issue', 'copyright_violation', 'other')),
  report_description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Supporting evidence
  evidence_urls TEXT[] DEFAULT '{}',
  screenshot_urls TEXT[] DEFAULT '{}',
  supporting_details JSONB DEFAULT '{}'::jsonb,
  
  -- Report status and workflow
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed', 'escalated')),
  assigned_to UUID REFERENCES suppliers(id),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  
  -- Resolution tracking
  resolution_notes TEXT,
  action_taken TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('no_action', 'warning_issued', 'template_modified', 'template_suspended', 'template_removed')),
  
  -- Follow-up and communication
  reporter_notified BOOLEAN DEFAULT false,
  creator_notified BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review workflow audit trail
CREATE TABLE IF NOT EXISTS marketplace_review_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_queue_id UUID NOT NULL REFERENCES marketplace_quality_review_queue(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  
  -- Change tracking
  action_type TEXT NOT NULL CHECK (action_type IN ('submitted', 'assigned', 'review_started', 'review_completed', 'status_changed', 'escalated', 'resubmitted')),
  old_status TEXT,
  new_status TEXT,
  
  -- User and system context
  performed_by UUID REFERENCES suppliers(id), -- NULL for system actions
  performed_by_system BOOLEAN DEFAULT false,
  user_agent TEXT,
  ip_address INET,
  
  -- Action details
  action_details JSONB DEFAULT '{}'::jsonb,
  change_reason TEXT,
  system_notes TEXT,
  
  -- Metadata
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template version control and revision history
CREATE TABLE IF NOT EXISTS marketplace_template_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  review_queue_id UUID REFERENCES marketplace_quality_review_queue(id),
  
  -- Revision information
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  revision_type TEXT NOT NULL CHECK (revision_type IN ('initial_submission', 'quality_update', 'content_update', 'metadata_update', 'major_revision')),
  change_summary TEXT NOT NULL,
  
  -- Snapshot data
  template_data_snapshot JSONB NOT NULL,
  metadata_snapshot JSONB NOT NULL,
  
  -- Change tracking
  changed_fields TEXT[] DEFAULT '{}',
  change_impact_score INTEGER DEFAULT 1 CHECK (change_impact_score >= 1 AND change_impact_score <= 5),
  requires_re_review BOOLEAN DEFAULT false,
  
  -- Revision context
  created_by UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  change_reason TEXT,
  creator_notes TEXT,
  
  -- Quality impact
  quality_score_before DECIMAL(5,2),
  quality_score_after DECIMAL(5,2),
  expected_approval_impact TEXT CHECK (expected_approval_impact IN ('positive', 'neutral', 'negative')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure revision numbering per template
  CONSTRAINT unique_revision_per_template UNIQUE (template_id, revision_number)
);

-- Performance Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_review_queue_status_priority ON marketplace_quality_review_queue(status, priority, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_reviewer_status ON marketplace_quality_review_queue(reviewer_id, status, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_template_status ON marketplace_quality_review_queue(template_id, status);
CREATE INDEX IF NOT EXISTS idx_review_queue_sla_tracking ON marketplace_quality_review_queue(is_sla_breached, target_review_time, submitted_at) WHERE status IN ('pending', 'assigned', 'in_review');
CREATE INDEX IF NOT EXISTS idx_review_queue_escalation ON marketplace_quality_review_queue(escalation_level, status) WHERE escalation_level > 0;

CREATE INDEX IF NOT EXISTS idx_review_results_template_decision ON marketplace_quality_review_results(template_id, decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_results_reviewer_performance ON marketplace_quality_review_results(reviewer_id, decision, review_time_minutes);
CREATE INDEX IF NOT EXISTS idx_review_results_quality_scores ON marketplace_quality_review_results(overall_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_hashes_content ON marketplace_template_hashes USING gin(content_tokens);
CREATE INDEX IF NOT EXISTS idx_template_hashes_lookup ON marketplace_template_hashes(content_hash, structure_hash);

CREATE INDEX IF NOT EXISTS idx_template_similarity_score ON marketplace_template_similarity(overall_similarity DESC);
CREATE INDEX IF NOT EXISTS idx_template_similarity_flagged ON marketplace_template_similarity(flagged_for_review, overall_similarity DESC) WHERE flagged_for_review = true;
CREATE INDEX IF NOT EXISTS idx_template_similarity_template ON marketplace_template_similarity(template_id, overall_similarity DESC);

CREATE INDEX IF NOT EXISTS idx_performance_score_grade ON marketplace_template_performance(overall_performance_score DESC, performance_grade);
CREATE INDEX IF NOT EXISTS idx_performance_threshold ON marketplace_template_performance(passes_performance_threshold, overall_performance_score DESC);

CREATE INDEX IF NOT EXISTS idx_quality_checks_template_status ON marketplace_quality_check_results(template_id, passed, check_name);
CREATE INDEX IF NOT EXISTS idx_quality_checks_category ON marketplace_quality_check_results(check_name, passed) WHERE passed = false;

CREATE INDEX IF NOT EXISTS idx_reviewer_metrics_performance ON marketplace_reviewer_metrics(avg_review_time_minutes, accuracy_score DESC);
CREATE INDEX IF NOT EXISTS idx_reviewer_metrics_activity ON marketplace_reviewer_metrics(last_review_at DESC, reviews_this_month DESC);

CREATE INDEX IF NOT EXISTS idx_template_reports_status ON marketplace_template_reports(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_reports_template ON marketplace_template_reports(template_id, status);
CREATE INDEX IF NOT EXISTS idx_template_reports_assigned ON marketplace_template_reports(assigned_to, status) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_review ON marketplace_review_audit_trail(review_queue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_template ON marketplace_review_audit_trail(template_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON marketplace_review_audit_trail(performed_by, created_at DESC) WHERE performed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_revisions_template ON marketplace_template_revisions(template_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_template_revisions_review ON marketplace_template_revisions(review_queue_id, requires_re_review) WHERE review_queue_id IS NOT NULL;

-- Insert default quality check configurations
INSERT INTO marketplace_quality_check_configs (check_name, check_category, check_description, is_enabled, is_blocking, check_weight, severity_level, pass_criteria, scoring_algorithm) VALUES
  ('title_length', 'completeness', 'Template title must be at least 10 characters', true, true, 1.0, 'high', '{"min_length": 10}', 'threshold'),
  ('description_length', 'completeness', 'Template description must be at least 100 characters', true, true, 1.5, 'high', '{"min_length": 100}', 'threshold'),
  ('component_count', 'completeness', 'Template must have at least 1 component', true, true, 2.0, 'critical', '{"min_count": 1}', 'threshold'),
  ('pricing_validation', 'completeness', 'Template must have valid pricing information', true, true, 1.0, 'high', '{"min_price_cents": 100, "max_price_cents": 500000}', 'range'),
  ('category_assignment', 'completeness', 'Template must be assigned to a valid category', true, true, 1.0, 'high', '{"required": true}', 'binary'),
  
  ('json_validation', 'technical', 'Template data must be valid JSON', true, true, 2.0, 'critical', '{}', 'binary'),
  ('schema_compliance', 'technical', 'Template must comply with schema requirements', true, true, 1.5, 'high', '{}', 'binary'),
  ('dependencies_resolved', 'technical', 'All template dependencies must be resolved', true, true, 1.5, 'high', '{}', 'binary'),
  ('performance_threshold', 'technical', 'Template must meet minimum performance requirements', true, false, 1.0, 'medium', '{"min_score": 70}', 'threshold'),
  
  ('content_quality', 'content', 'Template content must meet quality standards', true, false, 1.5, 'medium', '{}', 'manual'),
  ('spelling_grammar', 'content', 'Template text must have correct spelling and grammar', true, false, 1.0, 'medium', '{"max_errors": 3}', 'threshold'),
  ('profanity_check', 'content', 'Template must not contain inappropriate language', true, true, 2.0, 'critical', '{}', 'binary'),
  ('originality_check', 'content', 'Template must meet originality requirements', true, false, 1.5, 'high', '{"min_originality": 0.7}', 'threshold'),
  
  ('platform_compliance', 'compliance', 'Template must comply with platform guidelines', true, true, 2.0, 'critical', '{}', 'manual'),
  ('target_audience', 'compliance', 'Template must be appropriate for target audience', true, false, 1.0, 'medium', '{}', 'manual'),
  ('pricing_fairness', 'compliance', 'Template pricing must be reasonable and fair', true, false, 1.0, 'medium', '{}', 'manual'),
  ('copyright_check', 'compliance', 'Template must not violate copyright', true, true, 2.0, 'critical', '{}', 'manual')
ON CONFLICT (check_name) DO NOTHING;

-- Functions for workflow automation and management

-- Function to calculate review priority based on template and creator context
CREATE OR REPLACE FUNCTION calculate_review_priority(
  template_id UUID,
  creator_tier TEXT DEFAULT 'starter',
  expedited BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
  priority INTEGER := 3; -- Default medium priority
  creator_sales INTEGER := 0;
  template_price INTEGER := 0;
BEGIN
  -- Get template price and creator information
  SELECT price_cents INTO template_price
  FROM marketplace_templates
  WHERE id = template_id;
  
  -- Adjust priority based on creator tier and sales
  CASE 
    WHEN creator_tier = 'scale' OR expedited = true THEN
      priority := 1; -- Highest priority
    WHEN creator_tier = 'professional' AND template_price > 5000 THEN
      priority := 2; -- High priority
    WHEN creator_tier = 'professional' THEN
      priority := 3; -- Medium priority
    ELSE
      priority := 4; -- Standard priority
  END CASE;
  
  -- Premium pricing gets higher priority
  IF template_price > 10000 THEN
    priority := GREATEST(priority - 1, 1);
  END IF;
  
  RETURN priority;
END;
$$ LANGUAGE plpgsql;

-- Function to update template status based on review result
CREATE OR REPLACE FUNCTION process_review_decision(
  review_result_id UUID
) RETURNS VOID AS $$
DECLARE
  review_record RECORD;
  new_template_status TEXT;
BEGIN
  -- Get review result details
  SELECT 
    qrr.decision,
    qrr.template_id,
    qrq.id as queue_id
  INTO review_record
  FROM marketplace_quality_review_results qrr
  JOIN marketplace_quality_review_queue qrq ON qrr.review_queue_id = qrq.id
  WHERE qrr.id = review_result_id;
  
  -- Update template status based on decision
  CASE review_record.decision
    WHEN 'approved' THEN
      new_template_status := 'active';
      -- Update queue status
      UPDATE marketplace_quality_review_queue
      SET status = 'approved', reviewed_at = NOW()
      WHERE id = review_record.queue_id;
      
    WHEN 'rejected' THEN
      new_template_status := 'rejected';
      -- Update queue status
      UPDATE marketplace_quality_review_queue
      SET status = 'rejected', reviewed_at = NOW()
      WHERE id = review_record.queue_id;
      
    WHEN 'changes_requested' THEN
      new_template_status := 'pending_review';
      -- Update queue status
      UPDATE marketplace_quality_review_queue
      SET status = 'changes_requested', reviewed_at = NOW()
      WHERE id = review_record.queue_id;
      
    ELSE
      -- Escalated or other status
      new_template_status := 'pending_review';
      UPDATE marketplace_quality_review_queue
      SET status = 'escalated', reviewed_at = NOW(), escalation_level = escalation_level + 1
      WHERE id = review_record.queue_id;
  END CASE;
  
  -- Update marketplace template status
  UPDATE marketplace_templates
  SET 
    status = new_template_status,
    reviewed_at = NOW(),
    reviewed_by = (SELECT reviewer_id FROM marketplace_quality_review_results WHERE id = review_result_id)
  WHERE id = review_record.template_id;
  
  -- Create audit trail entry
  INSERT INTO marketplace_review_audit_trail (
    review_queue_id, 
    template_id, 
    action_type, 
    new_status, 
    performed_by_system, 
    action_details
  ) VALUES (
    review_record.queue_id,
    review_record.template_id,
    'review_completed',
    review_record.decision,
    true,
    jsonb_build_object('review_result_id', review_result_id, 'decision', review_record.decision)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check and update SLA status
CREATE OR REPLACE FUNCTION check_sla_breaches() RETURNS INTEGER AS $$
DECLARE
  breach_count INTEGER := 0;
BEGIN
  -- Update SLA breach status for overdue reviews
  WITH overdue_reviews AS (
    UPDATE marketplace_quality_review_queue
    SET is_sla_breached = true
    WHERE status IN ('pending', 'assigned', 'in_review')
      AND submitted_at + target_review_time < NOW()
      AND is_sla_breached = false
    RETURNING id
  )
  SELECT COUNT(*) INTO breach_count FROM overdue_reviews;
  
  -- Auto-escalate severely overdue reviews
  UPDATE marketplace_quality_review_queue
  SET 
    escalation_level = escalation_level + 1,
    status = 'escalated'
  WHERE status IN ('pending', 'assigned', 'in_review')
    AND submitted_at + target_review_time + INTERVAL '24 hours' < NOW()
    AND escalation_level = 0;
  
  RETURN breach_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update reviewer metrics after review completion
CREATE OR REPLACE FUNCTION update_reviewer_metrics(reviewer_user_id UUID) RETURNS VOID AS $$
DECLARE
  metrics_data RECORD;
BEGIN
  -- Calculate updated metrics
  WITH review_stats AS (
    SELECT 
      COUNT(*) as total_reviews,
      COUNT(CASE WHEN decision = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN decision = 'rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN decision = 'changes_requested' THEN 1 END) as changes_requested_count,
      COUNT(CASE WHEN decision = 'escalated' THEN 1 END) as escalated_count,
      AVG(review_time_minutes) as avg_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY review_time_minutes) as median_time
    FROM marketplace_quality_review_results
    WHERE reviewer_id = reviewer_user_id
      AND created_at >= NOW() - INTERVAL '90 days' -- Last 90 days
  )
  SELECT * INTO metrics_data FROM review_stats;
  
  -- Update or insert reviewer metrics
  INSERT INTO marketplace_reviewer_metrics (
    reviewer_id,
    total_reviews,
    approved_reviews,
    rejected_reviews,
    changes_requested_reviews,
    escalated_reviews,
    avg_review_time_minutes,
    median_review_time_minutes,
    last_review_at,
    updated_at
  ) VALUES (
    reviewer_user_id,
    metrics_data.total_reviews,
    metrics_data.approved_count,
    metrics_data.rejected_count,
    metrics_data.changes_requested_count,
    metrics_data.escalated_count,
    metrics_data.avg_time,
    metrics_data.median_time,
    NOW(),
    NOW()
  ) ON CONFLICT (reviewer_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    approved_reviews = EXCLUDED.approved_reviews,
    rejected_reviews = EXCLUDED.rejected_reviews,
    changes_requested_reviews = EXCLUDED.changes_requested_reviews,
    escalated_reviews = EXCLUDED.escalated_reviews,
    avg_review_time_minutes = EXCLUDED.avg_review_time_minutes,
    median_review_time_minutes = EXCLUDED.median_review_time_minutes,
    last_review_at = EXCLUDED.last_review_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically process review decisions
CREATE OR REPLACE FUNCTION trigger_process_review_decision()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_review_decision(NEW.id);
  PERFORM update_reviewer_metrics(NEW.reviewer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_result_insert
  AFTER INSERT ON marketplace_quality_review_results
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_review_decision();

-- Trigger to update audit trail on queue status changes
CREATE OR REPLACE FUNCTION trigger_queue_status_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO marketplace_review_audit_trail (
      review_queue_id,
      template_id,
      action_type,
      old_status,
      new_status,
      performed_by_system,
      action_details
    ) VALUES (
      NEW.id,
      NEW.template_id,
      'status_changed',
      OLD.status,
      NEW.status,
      true,
      jsonb_build_object('trigger', 'status_change', 'timestamp', NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_queue_status_update
  AFTER UPDATE ON marketplace_quality_review_queue
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_queue_status_audit();

-- Enable RLS on all new tables
ALTER TABLE marketplace_quality_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_quality_review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_quality_check_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_quality_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviewer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_review_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_template_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Quality Control System

-- Review queue policies (template creators can view their submissions, reviewers can view assigned reviews)
CREATE POLICY "Template creators can view their review submissions" ON marketplace_quality_review_queue
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Reviewers can view assigned and available reviews" ON marketplace_quality_review_queue
  FOR SELECT USING (
    reviewer_id::text = auth.uid()::text OR 
    (status = 'pending' AND auth.uid() IN (SELECT reviewer_id FROM marketplace_reviewer_metrics))
  );

CREATE POLICY "System can manage review queue" ON marketplace_quality_review_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Review results policies (reviewers can insert their own reviews, creators can view results for their templates)
CREATE POLICY "Reviewers can create review results" ON marketplace_quality_review_results
  FOR INSERT WITH CHECK (reviewer_id::text = auth.uid()::text);

CREATE POLICY "Review results are viewable by creators and reviewers" ON marketplace_quality_review_results
  FOR SELECT USING (
    reviewer_id::text = auth.uid()::text OR
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

-- Template hashes and similarity - system access only
CREATE POLICY "System manages template hashes" ON marketplace_template_hashes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "System manages similarity detection" ON marketplace_template_similarity
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Performance results viewable by template creators
CREATE POLICY "Creators can view performance results" ON marketplace_template_performance
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

-- Quality check configs - read-only for most users
CREATE POLICY "Quality check configs are publicly readable" ON marketplace_quality_check_configs
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage quality configs" ON marketplace_quality_check_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Quality check results viewable by template creators
CREATE POLICY "Creators can view quality check results" ON marketplace_quality_check_results
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

-- Reviewer metrics viewable by reviewer themselves
CREATE POLICY "Reviewers can view their own metrics" ON marketplace_reviewer_metrics
  FOR SELECT USING (reviewer_id::text = auth.uid()::text);

-- Template reports - creators of reports can view, assigned reviewers can manage
CREATE POLICY "Users can create template reports" ON marketplace_template_reports
  FOR INSERT WITH CHECK (reported_by::text = auth.uid()::text);

CREATE POLICY "Report visibility based on involvement" ON marketplace_template_reports
  FOR SELECT USING (
    reported_by::text = auth.uid()::text OR
    assigned_to::text = auth.uid()::text OR
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

-- Audit trail - viewable by involved parties
CREATE POLICY "Audit trail viewable by involved parties" ON marketplace_review_audit_trail
  FOR SELECT USING (
    performed_by::text = auth.uid()::text OR
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    ) OR
    review_queue_id IN (
      SELECT id FROM marketplace_quality_review_queue WHERE reviewer_id::text = auth.uid()::text
    )
  );

-- Template revisions viewable by creators
CREATE POLICY "Creators can view template revisions" ON marketplace_template_revisions
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Creators can create template revisions" ON marketplace_template_revisions
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM marketplace_templates WHERE supplier_id::text = auth.uid()::text
    ) AND created_by::text = auth.uid()::text
  );

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT ON marketplace_quality_review_queue TO authenticated;
GRANT SELECT, INSERT ON marketplace_quality_review_results TO authenticated;
GRANT SELECT ON marketplace_template_hashes TO authenticated;
GRANT SELECT ON marketplace_template_similarity TO authenticated;
GRANT SELECT ON marketplace_template_performance TO authenticated;
GRANT SELECT ON marketplace_quality_check_configs TO authenticated;
GRANT SELECT ON marketplace_quality_check_results TO authenticated;
GRANT SELECT ON marketplace_reviewer_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON marketplace_template_reports TO authenticated;
GRANT SELECT ON marketplace_review_audit_trail TO authenticated;
GRANT SELECT, INSERT ON marketplace_template_revisions TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create materialized view for review queue dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_review_queue_summary AS
SELECT 
  status,
  priority,
  COUNT(*) as queue_count,
  AVG(auto_quality_score) as avg_auto_score,
  AVG(EXTRACT(epoch FROM (COALESCE(reviewed_at, NOW()) - submitted_at))/3600) as avg_hours_in_queue,
  COUNT(CASE WHEN is_sla_breached THEN 1 END) as sla_breaches
FROM marketplace_quality_review_queue
WHERE submitted_at >= NOW() - INTERVAL '30 days'
GROUP BY status, priority
ORDER BY priority, status;

CREATE INDEX IF NOT EXISTS idx_review_queue_summary ON marketplace_review_queue_summary(status, priority);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_review_queue_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_review_queue_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on materialized view
GRANT SELECT ON marketplace_review_queue_summary TO authenticated;