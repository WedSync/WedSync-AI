-- PDF imports tracking table
CREATE TABLE pdf_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, processing, completed, failed
  
  -- OCR results
  ocr_confidence DECIMAL(3,2), -- 0.00 to 1.00
  page_count INTEGER,
  extracted_text TEXT,
  detected_fields JSONB,
  field_mapping JSONB,
  
  -- Generated form reference
  generated_form_id UUID REFERENCES forms(id),
  
  -- Metadata
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX idx_pdf_imports_org ON pdf_imports(organization_id);
CREATE INDEX idx_pdf_imports_status ON pdf_imports(status);
CREATE INDEX idx_pdf_imports_created_at ON pdf_imports(created_at DESC);

-- RLS policies
ALTER TABLE pdf_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization PDFs"
  ON pdf_imports FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can upload PDFs"
  ON pdf_imports FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update own organization PDFs"
  ON pdf_imports FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- Storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-uploads', 'pdf-uploads', false);

-- RLS policy for storage
CREATE POLICY "Users can upload PDFs to their organization folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can view their organization PDF files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can delete their organization PDF files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );