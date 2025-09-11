-- WS-166: Budget Reports & Export System
-- Team B: Database Schema for Export Processing
-- Date: 2025-01-20

-- Budget export tracking table
CREATE TABLE IF NOT EXISTS budget_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  export_type VARCHAR(20) CHECK (export_type IN ('pdf', 'csv', 'excel')) NOT NULL,
  export_filters JSONB NOT NULL DEFAULT '{}',
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER,
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('generating', 'completed', 'failed', 'expired')) DEFAULT 'generating',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export generation queue for async processing
CREATE TABLE IF NOT EXISTS export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID REFERENCES budget_exports(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_exports_couple_id ON budget_exports(couple_id);
CREATE INDEX IF NOT EXISTS idx_budget_exports_status ON budget_exports(status);
CREATE INDEX IF NOT EXISTS idx_budget_exports_created_at ON budget_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_exports_expires_at ON budget_exports(expires_at);

CREATE INDEX IF NOT EXISTS idx_export_queue_export_id ON export_queue(export_id);
CREATE INDEX IF NOT EXISTS idx_export_queue_priority ON export_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_export_queue_status ON export_queue(started_at, completed_at);

-- RLS Policies for security
ALTER TABLE budget_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_queue ENABLE ROW LEVEL SECURITY;

-- Couples can only see their own exports
CREATE POLICY "Couples can view their own exports"
  ON budget_exports FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user_id = auth.uid()
    )
  );

-- Couples can create exports for their own data
CREATE POLICY "Couples can create their own exports"
  ON budget_exports FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user_id = auth.uid()
    )
  );

-- Couples can update their own export records (for download count)
CREATE POLICY "Couples can update their own exports"
  ON budget_exports FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user_id = auth.uid()
    )
  );

-- System service role can manage export queue
CREATE POLICY "System can manage export queue"
  ON export_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Couples can view queue status for their exports
CREATE POLICY "Couples can view their export queue status"
  ON export_queue FOR SELECT
  USING (
    export_id IN (
      SELECT id FROM budget_exports 
      WHERE couple_id IN (
        SELECT id FROM couples 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_budget_exports_updated_at
  BEFORE UPDATE ON budget_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_queue_updated_at
  BEFORE UPDATE ON export_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  -- Mark exports as expired
  UPDATE budget_exports 
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND status = 'completed';
  
  -- Clean up old failed exports (older than 7 days)
  DELETE FROM budget_exports 
  WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
  -- Clean up completed export queue entries (older than 24 hours)
  DELETE FROM export_queue 
  WHERE completed_at IS NOT NULL 
    AND completed_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON budget_exports TO authenticated;
GRANT SELECT ON export_queue TO authenticated;

-- Comments for documentation
COMMENT ON TABLE budget_exports IS 'Tracks budget export requests and file metadata for couples';
COMMENT ON TABLE export_queue IS 'Background processing queue for export generation';
COMMENT ON FUNCTION cleanup_expired_exports() IS 'Maintenance function to clean up old and expired export records';