-- WARNING: This migration references tables that may not exist: vendor_reviews, vendor_review_categories
-- Ensure these tables are created first

-- WS-085: Vendor Review System - Post-Wedding Feedback
-- Team E - Batch 6 - Round 2
-- Purpose: Enable couples to leave detailed reviews for vendors after their wedding

-- Create vendor review categories table
CREATE TABLE IF NOT EXISTS vendor_review_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default vendor review categories
INSERT INTO vendor_review_categories (name, display_order) VALUES
  ('Communication', 1),
  ('Quality of Service', 2),
  ('Professionalism', 3),
  ('Value for Money', 4),
  ('Reliability', 5),
  ('Creativity', 6),
  ('Flexibility', 7),
  ('Vendor Coordination', 8);

-- Create vendor reviews table
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Overall rating
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Review content
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 20),
  
  -- Wedding context
  wedding_date DATE NOT NULL,
  vendor_service_type TEXT NOT NULL,
  vendor_package_details TEXT,
  total_amount_paid DECIMAL(10, 2),
  
  -- Review status
  moderation_status TEXT DEFAULT 'pending' CHECK (
    moderation_status IN ('pending', 'approved', 'rejected', 'flagged', 'archived')
  ),
  moderation_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  
  -- Verification status
  is_verified_purchase BOOLEAN DEFAULT false,
  verification_method TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Review metadata
  would_recommend BOOLEAN DEFAULT true,
  hired_again BOOLEAN,
  response_time_rating INTEGER CHECK (response_time_rating IS NULL OR (response_time_rating >= 1 AND response_time_rating <= 5)),
  
  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  
  -- Ensure unique review per vendor per client
  UNIQUE(vendor_id, client_id)
);

-- Create category ratings table (specific ratings for each category)
CREATE TABLE IF NOT EXISTS vendor_review_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES vendor_review_categories(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, category_id)
);

-- Create review photos table
CREATE TABLE IF NOT EXISTS vendor_review_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review responses table (vendor can respond to reviews)
CREATE TABLE IF NOT EXISTS vendor_review_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  responder_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (LENGTH(content) >= 10),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id) -- Only one response per review
);

-- Create review flags table
CREATE TABLE IF NOT EXISTS vendor_review_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  flagger_id UUID NOT NULL REFERENCES auth.users(id),
  flag_type TEXT NOT NULL CHECK (
    flag_type IN ('spam', 'inappropriate', 'fake', 'harassment', 'competitor', 'other')
  ),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'dismissed', 'action_taken')
  ),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review helpful votes table
CREATE TABLE IF NOT EXISTS vendor_review_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Create vendor performance metrics table (aggregated data)
CREATE TABLE IF NOT EXISTS vendor_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Aggregated ratings
  total_reviews INTEGER DEFAULT 0,
  average_overall_rating DECIMAL(3, 2),
  average_communication_rating DECIMAL(3, 2),
  average_quality_rating DECIMAL(3, 2),
  average_professionalism_rating DECIMAL(3, 2),
  average_value_rating DECIMAL(3, 2),
  average_reliability_rating DECIMAL(3, 2),
  
  -- Recommendation metrics
  recommendation_percentage DECIMAL(5, 2),
  hire_again_percentage DECIMAL(5, 2),
  
  -- Response metrics
  average_response_time_rating DECIMAL(3, 2),
  vendor_response_rate DECIMAL(5, 2),
  
  -- Time-based metrics
  reviews_last_30_days INTEGER DEFAULT 0,
  reviews_last_90_days INTEGER DEFAULT 0,
  reviews_last_year INTEGER DEFAULT 0,
  
  -- Distribution
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_review_date TIMESTAMPTZ,
  metrics_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vendor_id)
);

-- Create moderation log table
CREATE TABLE IF NOT EXISTS vendor_review_moderation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES vendor_reviews(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vendor_reviews_vendor_id ON vendor_reviews(vendor_id);
CREATE INDEX idx_vendor_reviews_client_id ON vendor_reviews(client_id);
CREATE INDEX idx_vendor_reviews_moderation_status ON vendor_reviews(moderation_status);
CREATE INDEX idx_vendor_reviews_wedding_date ON vendor_reviews(wedding_date);
CREATE INDEX idx_vendor_reviews_created_at ON vendor_reviews(created_at DESC);
CREATE INDEX idx_vendor_reviews_overall_rating ON vendor_reviews(overall_rating);

CREATE INDEX idx_vendor_review_ratings_review_id ON vendor_review_ratings(review_id);
CREATE INDEX idx_vendor_review_ratings_category_id ON vendor_review_ratings(category_id);

CREATE INDEX idx_vendor_review_photos_review_id ON vendor_review_photos(review_id);
CREATE INDEX idx_vendor_review_responses_review_id ON vendor_review_responses(review_id);
CREATE INDEX idx_vendor_review_flags_review_id ON vendor_review_flags(review_id);
CREATE INDEX idx_vendor_review_flags_status ON vendor_review_flags(status);
CREATE INDEX idx_vendor_review_votes_review_id ON vendor_review_votes(review_id);
CREATE INDEX idx_vendor_review_votes_user_id ON vendor_review_votes(user_id);

CREATE INDEX idx_vendor_performance_metrics_vendor_id ON vendor_performance_metrics(vendor_id);
CREATE INDEX idx_vendor_performance_metrics_average_rating ON vendor_performance_metrics(average_overall_rating);

-- Enable Row Level Security
ALTER TABLE vendor_review_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_review_moderation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Review categories (public read)
CREATE POLICY "Anyone can view review categories" ON vendor_review_categories
  FOR SELECT USING (is_active = true);

-- Vendor reviews policies
CREATE POLICY "Public can view approved reviews" ON vendor_reviews
  FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Users can create reviews for their vendors" ON vendor_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id = vendor_reviews.client_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their pending reviews" ON vendor_reviews
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    moderation_status = 'pending'
  );

CREATE POLICY "Moderators can manage all reviews" ON vendor_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Review ratings policies
CREATE POLICY "View ratings for approved reviews" ON vendor_review_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_reviews 
      WHERE id = vendor_review_ratings.review_id 
      AND moderation_status = 'approved'
    )
  );

CREATE POLICY "Users can manage ratings for their reviews" ON vendor_review_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendor_reviews 
      WHERE id = vendor_review_ratings.review_id 
      AND user_id = auth.uid()
    )
  );

-- Review photos policies
CREATE POLICY "View photos for approved reviews" ON vendor_review_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_reviews 
      WHERE id = vendor_review_photos.review_id 
      AND moderation_status = 'approved'
    )
  );

CREATE POLICY "Users can manage photos for their reviews" ON vendor_review_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendor_reviews 
      WHERE id = vendor_review_photos.review_id 
      AND user_id = auth.uid()
    )
  );

-- Vendor response policies
CREATE POLICY "Public can view vendor responses" ON vendor_review_responses
  FOR SELECT USING (is_public = true);

CREATE POLICY "Vendors can respond to their reviews" ON vendor_review_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors 
      WHERE id = vendor_review_responses.vendor_id 
      AND user_id = auth.uid()
    )
  );

-- Review flags policies
CREATE POLICY "Users can flag reviews" ON vendor_review_flags
  FOR INSERT WITH CHECK (auth.uid() = flagger_id);

CREATE POLICY "Moderators can view and manage flags" ON vendor_review_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Review votes policies
CREATE POLICY "Users can vote on reviews" ON vendor_review_votes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view vote counts" ON vendor_review_votes
  FOR SELECT USING (true);

-- Performance metrics policies
CREATE POLICY "Public can view vendor metrics" ON vendor_performance_metrics
  FOR SELECT USING (true);

CREATE POLICY "System can manage metrics" ON vendor_performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Moderation log policies
CREATE POLICY "Moderators can view moderation logs" ON vendor_review_moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Functions

-- Function to validate review content
CREATE OR REPLACE FUNCTION validate_vendor_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Check minimum content length
  IF LENGTH(TRIM(NEW.content)) < 20 THEN
    RAISE EXCEPTION 'Review content must be at least 20 characters';
  END IF;
  
  -- Check maximum content length
  IF LENGTH(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Review content cannot exceed 5000 characters';
  END IF;
  
  -- Check title length
  IF LENGTH(TRIM(NEW.title)) < 5 OR LENGTH(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Review title must be between 5 and 200 characters';
  END IF;
  
  -- Ensure wedding date is in the past
  IF NEW.wedding_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Wedding date must be in the past';
  END IF;
  
  -- Auto-flag suspicious content
  IF NEW.content ~* '(spam|fake|bot|scam|promotional)' THEN
    NEW.moderation_status := 'flagged';
    NEW.moderation_reason := 'Auto-flagged for suspicious content';
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for review validation
CREATE TRIGGER validate_vendor_review_trigger
  BEFORE INSERT OR UPDATE ON vendor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_vendor_review();

-- Function to update review vote counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE vendor_reviews
    SET 
      helpful_count = (
        SELECT COUNT(*) FROM vendor_review_votes 
        WHERE review_id = NEW.review_id AND is_helpful = true
      ),
      not_helpful_count = (
        SELECT COUNT(*) FROM vendor_review_votes 
        WHERE review_id = NEW.review_id AND is_helpful = false
      )
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vendor_reviews
    SET 
      helpful_count = (
        SELECT COUNT(*) FROM vendor_review_votes 
        WHERE review_id = OLD.review_id AND is_helpful = true
      ),
      not_helpful_count = (
        SELECT COUNT(*) FROM vendor_review_votes 
        WHERE review_id = OLD.review_id AND is_helpful = false
      )
    WHERE id = OLD.review_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote count updates
CREATE TRIGGER update_review_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendor_review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_vote_counts();

-- Function to update vendor performance metrics
CREATE OR REPLACE FUNCTION update_vendor_performance_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  -- Get vendor_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_vendor_id := OLD.vendor_id;
  ELSE
    v_vendor_id := NEW.vendor_id;
  END IF;
  
  -- Only update metrics for approved reviews
  IF (TG_OP = 'DELETE' AND OLD.moderation_status = 'approved') OR 
     (TG_OP != 'DELETE' AND NEW.moderation_status = 'approved') THEN
    
    -- Insert or update metrics
    INSERT INTO vendor_performance_metrics (vendor_id)
    VALUES (v_vendor_id)
    ON CONFLICT (vendor_id) DO NOTHING;
    
    -- Update all metrics
    UPDATE vendor_performance_metrics
    SET
      total_reviews = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id AND moderation_status = 'approved'
      ),
      average_overall_rating = (
        SELECT AVG(overall_rating) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id AND moderation_status = 'approved'
      ),
      recommendation_percentage = (
        SELECT AVG(CASE WHEN would_recommend THEN 100 ELSE 0 END) 
        FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id AND moderation_status = 'approved'
      ),
      hire_again_percentage = (
        SELECT AVG(CASE WHEN hired_again THEN 100 ELSE 0 END) 
        FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id AND moderation_status = 'approved' AND hired_again IS NOT NULL
      ),
      reviews_last_30_days = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND created_at >= NOW() - INTERVAL '30 days'
      ),
      reviews_last_90_days = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND created_at >= NOW() - INTERVAL '90 days'
      ),
      reviews_last_year = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND created_at >= NOW() - INTERVAL '1 year'
      ),
      rating_1_count = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND overall_rating = 1
      ),
      rating_2_count = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND overall_rating = 2
      ),
      rating_3_count = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND overall_rating = 3
      ),
      rating_4_count = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND overall_rating = 4
      ),
      rating_5_count = (
        SELECT COUNT(*) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id 
        AND moderation_status = 'approved' 
        AND overall_rating = 5
      ),
      last_review_date = (
        SELECT MAX(created_at) FROM vendor_reviews 
        WHERE vendor_id = v_vendor_id AND moderation_status = 'approved'
      ),
      vendor_response_rate = (
        SELECT AVG(CASE WHEN vrr.id IS NOT NULL THEN 100 ELSE 0 END)
        FROM vendor_reviews vr
        LEFT JOIN vendor_review_responses vrr ON vr.id = vrr.review_id
        WHERE vr.vendor_id = v_vendor_id AND vr.moderation_status = 'approved'
      ),
      metrics_updated_at = NOW()
    WHERE vendor_id = v_vendor_id;
    
    -- Update category-specific ratings
    UPDATE vendor_performance_metrics
    SET
      average_communication_rating = (
        SELECT AVG(vrr.rating)
        FROM vendor_reviews vr
        JOIN vendor_review_ratings vrr ON vr.id = vrr.review_id
        JOIN vendor_review_categories vrc ON vrr.category_id = vrc.id
        WHERE vr.vendor_id = v_vendor_id 
        AND vr.moderation_status = 'approved'
        AND vrc.name = 'Communication'
      ),
      average_quality_rating = (
        SELECT AVG(vrr.rating)
        FROM vendor_reviews vr
        JOIN vendor_review_ratings vrr ON vr.id = vrr.review_id
        JOIN vendor_review_categories vrc ON vrr.category_id = vrc.id
        WHERE vr.vendor_id = v_vendor_id 
        AND vr.moderation_status = 'approved'
        AND vrc.name = 'Quality of Service'
      ),
      average_professionalism_rating = (
        SELECT AVG(vrr.rating)
        FROM vendor_reviews vr
        JOIN vendor_review_ratings vrr ON vr.id = vrr.review_id
        JOIN vendor_review_categories vrc ON vrr.category_id = vrc.id
        WHERE vr.vendor_id = v_vendor_id 
        AND vr.moderation_status = 'approved'
        AND vrc.name = 'Professionalism'
      ),
      average_value_rating = (
        SELECT AVG(vrr.rating)
        FROM vendor_reviews vr
        JOIN vendor_review_ratings vrr ON vr.id = vrr.review_id
        JOIN vendor_review_categories vrc ON vrr.category_id = vrc.id
        WHERE vr.vendor_id = v_vendor_id 
        AND vr.moderation_status = 'approved'
        AND vrc.name = 'Value for Money'
      ),
      average_reliability_rating = (
        SELECT AVG(vrr.rating)
        FROM vendor_reviews vr
        JOIN vendor_review_ratings vrr ON vr.id = vrr.review_id
        JOIN vendor_review_categories vrc ON vrr.category_id = vrc.id
        WHERE vr.vendor_id = v_vendor_id 
        AND vr.moderation_status = 'approved'
        AND vrc.name = 'Reliability'
      )
    WHERE vendor_id = v_vendor_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating vendor metrics
CREATE TRIGGER update_vendor_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_performance_metrics();

-- Function to log moderation actions
CREATE OR REPLACE FUNCTION log_vendor_review_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
    INSERT INTO vendor_review_moderation_log (
      review_id,
      moderator_id,
      action,
      previous_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      COALESCE(NEW.moderated_by, auth.uid()),
      CASE 
        WHEN NEW.moderation_status = 'approved' THEN 'approve'
        WHEN NEW.moderation_status = 'rejected' THEN 'reject'
        WHEN NEW.moderation_status = 'flagged' THEN 'flag'
        WHEN NEW.moderation_status = 'archived' THEN 'archive'
        ELSE 'update'
      END,
      OLD.moderation_status,
      NEW.moderation_status,
      NEW.moderation_reason
    );
    
    NEW.moderated_at := NOW();
    
    -- Set published_at when approved
    IF NEW.moderation_status = 'approved' AND OLD.moderation_status != 'approved' THEN
      NEW.published_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for moderation logging
CREATE TRIGGER log_review_moderation_trigger
  BEFORE UPDATE ON vendor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION log_vendor_review_moderation();

-- Function to check flag threshold and auto-escalate
CREATE OR REPLACE FUNCTION check_review_flag_threshold()
RETURNS TRIGGER AS $$
DECLARE
  flag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flag_count
  FROM vendor_review_flags
  WHERE review_id = NEW.review_id
  AND status IN ('pending', 'reviewed');
  
  -- Auto-escalate if threshold reached
  IF flag_count >= 3 THEN
    UPDATE vendor_reviews 
    SET 
      moderation_status = 'flagged',
      moderation_reason = 'Auto-flagged: Multiple user reports'
    WHERE id = NEW.review_id
    AND moderation_status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for flag threshold
CREATE TRIGGER check_flag_threshold_trigger
  AFTER INSERT ON vendor_review_flags
  FOR EACH ROW
  EXECUTE FUNCTION check_review_flag_threshold();

-- Create view for review analytics
CREATE VIEW vendor_review_analytics AS
SELECT 
  vr.vendor_id,
  v.business_name as vendor_name,
  v.category as vendor_category,
  COUNT(DISTINCT vr.id) as total_reviews,
  AVG(vr.overall_rating) as avg_rating,
  COUNT(CASE WHEN vr.overall_rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN vr.overall_rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN vr.overall_rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN vr.overall_rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN vr.overall_rating = 1 THEN 1 END) as one_star_count,
  AVG(CASE WHEN vr.would_recommend THEN 100 ELSE 0 END) as recommend_percentage,
  COUNT(DISTINCT vrr.id) as response_count,
  (COUNT(DISTINCT vrr.id)::FLOAT / NULLIF(COUNT(DISTINCT vr.id), 0) * 100) as response_rate,
  MAX(vr.created_at) as last_review_date
FROM vendor_reviews vr
JOIN vendors v ON vr.vendor_id = v.id
LEFT JOIN vendor_review_responses vrr ON vr.id = vrr.review_id
WHERE vr.moderation_status = 'approved'
GROUP BY vr.vendor_id, v.business_name, v.category;

-- Grant permissions
GRANT SELECT ON vendor_review_analytics TO authenticated;
GRANT SELECT ON vendor_review_categories TO authenticated;
GRANT SELECT ON vendor_performance_metrics TO authenticated;