-- FAQ Extraction System - AI-powered FAQ discovery from documents
-- Feature ID: WS-125 - Automated FAQ Extraction from Documents  
-- Team: C - Batch 9 Round 3
-- Dependencies: WS-121 (PDF Analysis), WS-070 (FAQ Management)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- FAQ EXTRACTION TABLES
-- ============================================

-- FAQ Extraction Reviews Table - Stores extracted FAQs awaiting review
CREATE TABLE IF NOT EXISTS faq_extraction_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Extracted FAQ data
  extracted_faq JSONB NOT NULL, -- Full ExtractedFAQ object
  
  -- Review workflow
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    review_status IN ('pending', 'approved', 'rejected', 'needs_editing')
  ),
  reviewer_notes TEXT,
  auto_approved BOOLEAN DEFAULT false,
  
  -- Source information
  source_document TEXT NOT NULL,
  source_page INTEGER,
  extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Workflow timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Created FAQ reference (when approved)
  created_faq_id UUID REFERENCES faq_items(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX(supplier_id, review_status),
  INDEX(review_status, created_at),
  INDEX(extraction_confidence DESC),
  INDEX(source_document)
);

-- FAQ Extraction Sessions Table - Track bulk extraction operations
CREATE TABLE IF NOT EXISTS faq_extraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Session metadata
  session_name TEXT NOT NULL,
  document_count INTEGER DEFAULT 0,
  total_extractions INTEGER DEFAULT 0,
  approved_extractions INTEGER DEFAULT 0,
  
  -- Processing stats
  processing_time_ms INTEGER,
  avg_confidence DECIMAL(3,2),
  accuracy_estimate DECIMAL(3,2),
  
  -- Session status
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('processing', 'completed', 'failed', 'cancelled')
  ),
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  extraction_settings JSONB DEFAULT '{}',
  
  -- Indexes
  INDEX(supplier_id, status),
  INDEX(started_at DESC)
);

-- FAQ Extraction Analytics Table - Track extraction performance
CREATE TABLE IF NOT EXISTS faq_extraction_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES faq_extraction_sessions(id) ON DELETE CASCADE,
  
  -- Performance metrics
  document_type TEXT, -- contract, vendor_info, service_guide, etc.
  questions_found INTEGER DEFAULT 0,
  high_confidence_questions INTEGER DEFAULT 0,
  approved_questions INTEGER DEFAULT 0,
  rejected_questions INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_confidence DECIMAL(3,2),
  extraction_accuracy DECIMAL(3,2), -- Calculated post-review
  false_positive_rate DECIMAL(3,2),
  
  -- Processing metrics  
  processing_time_ms INTEGER,
  document_size_chars INTEGER,
  
  -- Content analysis
  categories_detected TEXT[],
  top_keywords TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX(supplier_id, document_type),
  INDEX(session_id),
  INDEX(created_at DESC)
);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update extraction session stats
CREATE OR REPLACE FUNCTION update_extraction_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session totals when reviews are updated
  IF TG_OP = 'UPDATE' AND OLD.review_status != NEW.review_status THEN
    UPDATE faq_extraction_sessions 
    SET 
      approved_extractions = (
        SELECT COUNT(*) 
        FROM faq_extraction_reviews 
        WHERE session_id = NEW.session_id AND review_status = 'approved'
      ),
      accuracy_estimate = (
        SELECT AVG(extraction_confidence)
        FROM faq_extraction_reviews 
        WHERE session_id = NEW.session_id AND review_status = 'approved'
      )
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session stats
CREATE TRIGGER trigger_update_extraction_session_stats
  AFTER UPDATE ON faq_extraction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_session_stats();

-- Function to auto-approve high confidence extractions
CREATE OR REPLACE FUNCTION auto_approve_high_confidence_faqs()
RETURNS TRIGGER AS $$
DECLARE
  confidence DECIMAL(3,2);
  auto_approval_threshold DECIMAL(3,2) := 0.85;
BEGIN
  -- Extract confidence from JSONB
  confidence := (NEW.extracted_faq->>'confidence')::DECIMAL(3,2);
  
  -- Auto-approve if confidence is above threshold
  IF confidence >= auto_approval_threshold THEN
    NEW.review_status := 'approved';
    NEW.auto_approved := true;
    NEW.reviewed_at := NOW();
    NEW.approved_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval
CREATE TRIGGER trigger_auto_approve_high_confidence
  BEFORE INSERT ON faq_extraction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_high_confidence_faqs();

-- ============================================
-- STORED PROCEDURES FOR FAQ EXTRACTION
-- ============================================

-- Get extraction dashboard metrics
CREATE OR REPLACE FUNCTION get_faq_extraction_dashboard(p_supplier_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_pending INTEGER;
  total_approved INTEGER;
  total_rejected INTEGER;
  avg_confidence DECIMAL(3,2);
  recent_sessions INTEGER;
BEGIN
  -- Get basic counts
  SELECT 
    COUNT(*) FILTER (WHERE review_status = 'pending'),
    COUNT(*) FILTER (WHERE review_status = 'approved'),
    COUNT(*) FILTER (WHERE review_status = 'rejected'),
    AVG((extracted_faq->>'confidence')::DECIMAL(3,2))
  INTO total_pending, total_approved, total_rejected, avg_confidence
  FROM faq_extraction_reviews
  WHERE supplier_id = p_supplier_id;
  
  -- Get recent sessions count
  SELECT COUNT(*)
  INTO recent_sessions
  FROM faq_extraction_sessions
  WHERE supplier_id = p_supplier_id 
    AND started_at > NOW() - INTERVAL '30 days';
  
  -- Build result
  result := jsonb_build_object(
    'pending_reviews', COALESCE(total_pending, 0),
    'approved_extractions', COALESCE(total_approved, 0),
    'rejected_extractions', COALESCE(total_rejected, 0),
    'avg_confidence', COALESCE(avg_confidence, 0),
    'recent_sessions', COALESCE(recent_sessions, 0),
    'approval_rate', CASE 
      WHEN (total_approved + total_rejected) > 0 
      THEN ROUND(total_approved::DECIMAL / (total_approved + total_rejected) * 100, 2)
      ELSE 0
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Batch approve extractions
CREATE OR REPLACE FUNCTION batch_approve_extractions(
  p_supplier_id UUID,
  p_extraction_ids UUID[]
)
RETURNS TABLE(
  extraction_id UUID,
  success BOOLEAN,
  faq_item_id UUID,
  error_message TEXT
) AS $$
DECLARE
  extraction_record RECORD;
  new_faq_id UUID;
  category_id UUID;
BEGIN
  -- Loop through each extraction ID
  FOR extraction_record IN 
    SELECT * FROM faq_extraction_reviews 
    WHERE supplier_id = p_supplier_id 
      AND id = ANY(p_extraction_ids)
      AND review_status = 'pending'
  LOOP
    BEGIN
      -- Find or create category
      SELECT id INTO category_id
      FROM faq_categories
      WHERE supplier_id = p_supplier_id 
        AND slug = (extraction_record.extracted_faq->>'category')
      LIMIT 1;
      
      -- Create FAQ item if category exists
      IF category_id IS NOT NULL THEN
        INSERT INTO faq_items (
          supplier_id,
          category_id,
          question,
          answer,
          summary,
          tags,
          is_featured
        ) VALUES (
          p_supplier_id,
          category_id,
          extraction_record.extracted_faq->>'question',
          extraction_record.extracted_faq->>'answer',
          extraction_record.extracted_faq->>'summary',
          ARRAY(SELECT jsonb_array_elements_text(extraction_record.extracted_faq->'tags')),
          (extraction_record.extracted_faq->>'confidence')::DECIMAL >= 0.9
        )
        RETURNING id INTO new_faq_id;
        
        -- Update extraction record
        UPDATE faq_extraction_reviews
        SET 
          review_status = 'approved',
          reviewed_at = NOW(),
          approved_at = NOW(),
          created_faq_id = new_faq_id
        WHERE id = extraction_record.id;
        
        -- Return success
        extraction_id := extraction_record.id;
        success := true;
        faq_item_id := new_faq_id;
        error_message := NULL;
        RETURN NEXT;
      ELSE
        -- Category not found
        extraction_id := extraction_record.id;
        success := false;
        faq_item_id := NULL;
        error_message := 'Category not found: ' || (extraction_record.extracted_faq->>'category');
        RETURN NEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle any errors
      extraction_id := extraction_record.id;
      success := false;
      faq_item_id := NULL;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Get extraction quality metrics
CREATE OR REPLACE FUNCTION get_extraction_quality_metrics(
  p_supplier_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH extraction_stats AS (
    SELECT 
      COUNT(*) as total_extractions,
      AVG((extracted_faq->>'confidence')::DECIMAL) as avg_confidence,
      COUNT(*) FILTER (WHERE review_status = 'approved') as approved_count,
      COUNT(*) FILTER (WHERE review_status = 'rejected') as rejected_count,
      COUNT(*) FILTER (WHERE auto_approved = true) as auto_approved_count
    FROM faq_extraction_reviews
    WHERE supplier_id = p_supplier_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
  ),
  category_distribution AS (
    SELECT 
      extracted_faq->>'category' as category,
      COUNT(*) as count
    FROM faq_extraction_reviews
    WHERE supplier_id = p_supplier_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
      AND review_status = 'approved'
    GROUP BY extracted_faq->>'category'
    ORDER BY count DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'total_extractions', COALESCE(s.total_extractions, 0),
    'avg_confidence', COALESCE(ROUND(s.avg_confidence, 3), 0),
    'approval_rate', CASE 
      WHEN (s.approved_count + s.rejected_count) > 0 
      THEN ROUND(s.approved_count::DECIMAL / (s.approved_count + s.rejected_count) * 100, 2)
      ELSE 0 
    END,
    'auto_approval_rate', CASE 
      WHEN s.total_extractions > 0 
      THEN ROUND(s.auto_approved_count::DECIMAL / s.total_extractions * 100, 2)
      ELSE 0 
    END,
    'category_distribution', COALESCE(
      jsonb_agg(
        jsonb_build_object('category', cd.category, 'count', cd.count)
      ), '[]'::jsonb
    )
  )
  INTO result
  FROM extraction_stats s
  LEFT JOIN category_distribution cd ON true
  GROUP BY s.total_extractions, s.avg_confidence, s.approved_count, s.rejected_count, s.auto_approved_count;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on extraction tables
ALTER TABLE faq_extraction_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_extraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_extraction_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq_extraction_reviews
CREATE POLICY "Suppliers can access their own extraction reviews"
  ON faq_extraction_reviews FOR ALL
  USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

-- RLS Policies for faq_extraction_sessions  
CREATE POLICY "Suppliers can access their own extraction sessions"
  ON faq_extraction_sessions FOR ALL
  USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

-- RLS Policies for faq_extraction_analytics
CREATE POLICY "Suppliers can access their own extraction analytics"
  ON faq_extraction_analytics FOR ALL
  USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_faq_extraction_reviews_jsonb_confidence 
  ON faq_extraction_reviews USING btree ((extracted_faq->>'confidence'));

CREATE INDEX IF NOT EXISTS idx_faq_extraction_reviews_jsonb_category
  ON faq_extraction_reviews USING btree ((extracted_faq->>'category'));

CREATE INDEX IF NOT EXISTS idx_faq_extraction_reviews_compound
  ON faq_extraction_reviews (supplier_id, review_status, created_at DESC);

-- GIN index for JSONB searching
CREATE INDEX IF NOT EXISTS idx_faq_extraction_reviews_jsonb_gin
  ON faq_extraction_reviews USING gin (extracted_faq);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for pending reviews with extracted data
CREATE OR REPLACE VIEW faq_pending_reviews AS
SELECT 
  r.id,
  r.supplier_id,
  r.extracted_faq->>'question' as question,
  r.extracted_faq->>'answer' as answer,
  r.extracted_faq->>'summary' as summary,
  r.extracted_faq->>'category' as category,
  (r.extracted_faq->>'confidence')::DECIMAL(3,2) as confidence,
  r.source_document,
  r.source_page,
  r.created_at,
  r.auto_approved
FROM faq_extraction_reviews r
WHERE r.review_status = 'pending'
ORDER BY (r.extracted_faq->>'confidence')::DECIMAL DESC, r.created_at DESC;

-- View for extraction session summary
CREATE OR REPLACE VIEW faq_extraction_session_summary AS
SELECT 
  s.*,
  COUNT(r.id) as total_reviews,
  COUNT(r.id) FILTER (WHERE r.review_status = 'approved') as approved_reviews,
  COUNT(r.id) FILTER (WHERE r.review_status = 'pending') as pending_reviews,
  AVG((r.extracted_faq->>'confidence')::DECIMAL) as actual_avg_confidence
FROM faq_extraction_sessions s
LEFT JOIN faq_extraction_reviews r ON r.session_id = s.id
GROUP BY s.id;

-- Grant permissions
GRANT ALL ON faq_extraction_reviews TO authenticated;
GRANT ALL ON faq_extraction_sessions TO authenticated; 
GRANT ALL ON faq_extraction_analytics TO authenticated;
GRANT SELECT ON faq_pending_reviews TO authenticated;
GRANT SELECT ON faq_extraction_session_summary TO authenticated;

-- Insert initial data or configurations if needed
-- (None required for this migration)

-- Migration completed successfully