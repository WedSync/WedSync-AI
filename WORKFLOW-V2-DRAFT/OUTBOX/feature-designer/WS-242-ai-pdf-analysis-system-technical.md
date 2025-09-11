# WS-242: AI PDF Analysis System - Technical Specification

## User Story
**As a wedding supplier onboarding to WedSync,**  
**I want to upload my existing PDF forms and have them automatically converted to digital forms,**  
**So that I can quickly digitize my client intake process without manually recreating all my forms.**

**Business Scenario:**
Photography studio "Lens & Light" has 3 detailed PDF forms:
- Pre-wedding consultation form (47 fields across 4 pages)
- Wedding day timeline form (23 fields, complex layout with time slots)
- Client feedback form (15 fields with rating scales)

Manual recreation: 8-12 hours of work, high error risk.
With WS-242: Upload PDFs → 5 minutes analysis → Review/approve extracted fields → Live digital forms ready in 15 minutes total.

## Database Schema

```sql
-- PDF analysis job tracking
CREATE TABLE pdf_analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  original_filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL, -- Supabase storage URL
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  mime_type VARCHAR(50) DEFAULT 'application/pdf',
  
  -- Processing status
  analysis_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'requires_review'
  processing_stage VARCHAR(30), -- 'upload', 'pdf_parsing', 'vision_analysis', 'field_extraction', 'validation'
  progress_percentage INTEGER DEFAULT 0,
  
  -- Results
  extracted_fields JSONB, -- Array of detected form fields
  layout_structure JSONB, -- Page structure, sections, layout info
  processing_metadata JSONB, -- OCR confidence, vision API responses, etc.
  
  -- Quality metrics
  overall_confidence_score DECIMAL(4,3), -- 0.000-1.000
  fields_detected_count INTEGER DEFAULT 0,
  high_confidence_fields_count INTEGER DEFAULT 0,
  manual_review_required BOOLEAN DEFAULT false,
  
  -- Performance tracking
  processing_time_ms INTEGER,
  vision_api_calls INTEGER DEFAULT 0,
  vision_api_cost_pounds DECIMAL(6,4) DEFAULT 0.0000,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_pdf_jobs_supplier (supplier_id),
  INDEX idx_pdf_jobs_status (analysis_status),
  INDEX idx_pdf_jobs_created (created_at DESC),
  INDEX idx_pdf_jobs_requires_review (manual_review_required, created_at) WHERE manual_review_required = true
);

-- Extracted form fields from PDF analysis
CREATE TABLE extracted_form_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES pdf_analysis_jobs(id) ON DELETE CASCADE,
  
  -- Field identification
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  field_sequence INTEGER NOT NULL, -- Order on page
  field_group VARCHAR(100), -- Grouping/section name
  
  -- Field properties
  field_label TEXT NOT NULL,
  field_name VARCHAR(100), -- Generated snake_case name
  field_type VARCHAR(30) NOT NULL, -- 'text', 'email', 'phone', 'date', 'select', 'checkbox', 'textarea', etc.
  field_subtype VARCHAR(30), -- 'wedding_date', 'guest_count', 'venue_address', etc.
  placeholder_text TEXT,
  help_text TEXT,
  
  -- Field constraints
  is_required BOOLEAN DEFAULT false,
  max_length INTEGER,
  min_length INTEGER,
  options JSONB, -- For select/radio/checkbox fields
  validation_rules JSONB, -- RegEx patterns, custom rules
  default_value TEXT,
  
  -- Visual/layout properties
  position_data JSONB NOT NULL, -- {x, y, width, height} in PDF coordinates
  font_info JSONB, -- Font size, family, style detected
  visual_styling JSONB, -- Borders, background, etc.
  
  -- Wedding-specific enhancements
  is_core_wedding_field BOOLEAN DEFAULT false,
  core_field_mapping VARCHAR(50), -- Maps to WedSync core fields
  wedding_field_category VARCHAR(30), -- 'couple_info', 'venue_details', 'timeline', 'preferences', etc.
  season_relevance JSONB, -- Which seasons this field is most relevant
  
  -- Quality and confidence
  extraction_confidence DECIMAL(4,3) NOT NULL, -- 0.000-1.000
  vision_confidence DECIMAL(4,3), -- OpenAI Vision API confidence
  text_extraction_confidence DECIMAL(4,3), -- PDF text layer confidence
  needs_manual_review BOOLEAN DEFAULT false,
  review_reason VARCHAR(100), -- Why manual review is needed
  
  -- Approval workflow
  approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'modified'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  modifications JSONB, -- Track changes made during review
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_extracted_fields_job (job_id),
  INDEX idx_extracted_fields_page (job_id, page_number),
  INDEX idx_extracted_fields_confidence (extraction_confidence),
  INDEX idx_extracted_fields_review (needs_manual_review, created_at) WHERE needs_manual_review = true
);

-- PDF analysis processing logs
CREATE TABLE pdf_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES pdf_analysis_jobs(id) ON DELETE CASCADE,
  stage VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  message TEXT,
  details JSONB,
  processing_time_ms INTEGER,
  memory_usage_mb INTEGER,
  api_calls_made INTEGER DEFAULT 0,
  cost_incurred_pounds DECIMAL(6,4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_pdf_logs_job (job_id, created_at),
  INDEX idx_pdf_logs_stage (stage, status)
);

-- Field type detection patterns and mapping
CREATE TABLE pdf_field_detection_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_type VARCHAR(30) NOT NULL,
  field_subtype VARCHAR(30),
  label_patterns TEXT[] NOT NULL, -- Array of regex patterns
  context_patterns TEXT[], -- Surrounding text patterns
  position_hints JSONB, -- Layout position clues
  validation_patterns JSONB, -- Expected validation rules
  confidence_boost DECIMAL(3,2) DEFAULT 0.00, -- Confidence increase if matched
  wedding_relevance_score INTEGER DEFAULT 1, -- 1-5, how wedding-specific this is
  examples TEXT[], -- Example labels that match this pattern
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(field_type, field_subtype),
  INDEX idx_patterns_type (field_type),
  INDEX idx_patterns_wedding_relevance (wedding_relevance_score DESC)
);

-- Wedding core field mappings
CREATE TABLE wedding_core_field_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  core_field_id VARCHAR(50) NOT NULL, -- 'bride_name', 'groom_name', 'wedding_date', etc.
  core_field_name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL, -- 'couple_info', 'venue_details', 'timeline', etc.
  field_type VARCHAR(30) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  
  -- Detection patterns
  common_labels TEXT[] NOT NULL, -- Common ways this field is labeled
  alias_patterns TEXT[], -- Alternative names/patterns
  validation_rules JSONB, -- Standard validation for this core field
  
  -- Integration info
  wedme_field_path VARCHAR(100), -- Path in WedMe data structure
  priority INTEGER DEFAULT 1, -- Import priority for matching
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(core_field_id),
  INDEX idx_core_mappings_category (category)
);

-- PDF analysis performance metrics
CREATE VIEW pdf_analysis_performance AS
SELECT 
  DATE_TRUNC('day', created_at) as analysis_date,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE analysis_status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE analysis_status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE manual_review_required = true) as review_required_jobs,
  
  AVG(processing_time_ms) as avg_processing_time_ms,
  AVG(fields_detected_count) as avg_fields_detected,
  AVG(overall_confidence_score) as avg_confidence,
  AVG(vision_api_cost_pounds) as avg_cost_per_job,
  
  -- Quality metrics
  AVG(CASE WHEN fields_detected_count > 0 
      THEN high_confidence_fields_count::DECIMAL / fields_detected_count 
      ELSE 0 END) as avg_high_confidence_rate,
      
  SUM(vision_api_cost_pounds) as total_daily_cost,
  MAX(processing_time_ms) as max_processing_time_ms
FROM pdf_analysis_jobs
GROUP BY DATE_TRUNC('day', created_at);

-- Insert default wedding core field mappings
INSERT INTO wedding_core_field_mappings (core_field_id, core_field_name, category, field_type, is_required, common_labels, validation_rules) VALUES
-- Couple Information
('bride_name', 'Bride Name', 'couple_info', 'text', true, ARRAY['bride name', 'bride''s name', 'first bride', 'partner 1'], '{"required": true, "minLength": 2}'),
('groom_name', 'Groom Name', 'couple_info', 'text', true, ARRAY['groom name', 'groom''s name', 'second partner', 'partner 2'], '{"required": true, "minLength": 2}'),
('couple_email', 'Couple Email', 'couple_info', 'email', true, ARRAY['email', 'e-mail', 'contact email', 'your email'], '{"required": true, "pattern": "email"}'),
('couple_phone', 'Couple Phone', 'couple_info', 'phone', true, ARRAY['phone', 'mobile', 'contact number', 'phone number'], '{"required": true, "pattern": "phone"}'),

-- Wedding Details  
('wedding_date', 'Wedding Date', 'wedding_details', 'date', true, ARRAY['wedding date', 'ceremony date', 'big day', 'date of wedding'], '{"required": true, "future": true}'),
('wedding_time', 'Wedding Time', 'wedding_details', 'time', false, ARRAY['wedding time', 'ceremony time', 'start time'], '{}'),
('guest_count', 'Guest Count', 'wedding_details', 'number', false, ARRAY['guest count', 'number of guests', 'attendees', 'pax', 'how many guests'], '{"min": 1, "max": 2000}'),

-- Venue Information
('ceremony_venue', 'Ceremony Venue', 'venue_details', 'text', false, ARRAY['ceremony venue', 'church', 'ceremony location', 'where ceremony'], '{}'),
('reception_venue', 'Reception Venue', 'venue_details', 'text', false, ARRAY['reception venue', 'party venue', 'reception location', 'where reception'], '{}'),
('venue_address', 'Venue Address', 'venue_details', 'address', false, ARRAY['venue address', 'location address', 'where located', 'ceremony address'], '{}'),

-- Budget & Services
('budget_range', 'Budget Range', 'budget_services', 'select', false, ARRAY['budget', 'budget range', 'how much', 'spending'], '{"options": ["Under £1,000", "£1,000-£3,000", "£3,000-£5,000", "£5,000-£10,000", "£10,000+"]}'),
('services_needed', 'Services Needed', 'budget_services', 'multiselect', false, ARRAY['services', 'what services', 'packages', 'what do you need'], '{}'),

-- Timeline & Planning
('timeline_preferences', 'Timeline Preferences', 'timeline_planning', 'textarea', false, ARRAY['timeline', 'schedule', 'itinerary', 'day schedule'], '{}'),
('special_requests', 'Special Requests', 'timeline_planning', 'textarea', false, ARRAY['special requests', 'notes', 'additional info', 'anything else'], '{}');

-- Insert field detection patterns
INSERT INTO pdf_field_detection_patterns (field_type, field_subtype, label_patterns, context_patterns, wedding_relevance_score, examples) VALUES
-- Email patterns
('email', NULL, ARRAY['email', 'e-?mail', 'contact.?email', '@'], ARRAY['contact', 'reach', 'correspondence'], 5, ARRAY['Email Address', 'Contact Email', 'Your Email']),

-- Phone patterns  
('phone', NULL, ARRAY['phone', 'mobile', 'cell', 'tel', 'contact.?number'], ARRAY['call', 'reach', 'contact'], 5, ARRAY['Phone Number', 'Mobile', 'Contact Number']),

-- Date patterns
('date', 'wedding_date', ARRAY['wedding.?date', 'ceremony.?date', 'big.?day', 'date.?of'], ARRAY['when', 'day', 'ceremony'], 5, ARRAY['Wedding Date', 'Date of Wedding', 'Ceremony Date']),
('date', 'general', ARRAY['date', 'when', 'day'], ARRAY[], 3, ARRAY['Date', 'When', 'Day']),

-- Number patterns
('number', 'guest_count', ARRAY['guest.?count', 'number.?of.?guests', 'attendees', 'pax', 'how.?many'], ARRAY['guests', 'people', 'attending'], 5, ARRAY['Guest Count', 'Number of Guests', 'How many people']),
('number', 'general', ARRAY['number', 'count', 'quantity', 'amount'], ARRAY[], 2, ARRAY['Number', 'Count', 'Quantity']),

-- Text area patterns
('textarea', 'special_requests', ARRAY['special.?request', 'notes', 'additional', 'anything.?else'], ARRAY['tell us', 'describe', 'explain'], 4, ARRAY['Special Requests', 'Additional Notes', 'Anything else?']),
('textarea', 'timeline', ARRAY['timeline', 'schedule', 'itinerary', 'runsheet'], ARRAY['day', 'ceremony', 'reception'], 5, ARRAY['Timeline', 'Wedding Day Schedule', 'Itinerary']),

-- Address patterns
('address', 'venue', ARRAY['venue.?address', 'ceremony.?location', 'where.?located', 'address'], ARRAY['venue', 'location', 'place'], 4, ARRAY['Venue Address', 'Ceremony Location', 'Where is the venue?']),

-- Select patterns
('select', 'budget', ARRAY['budget', 'budget.?range', 'how.?much', 'spending'], ARRAY['money', 'cost', 'price'], 4, ARRAY['Budget Range', 'How much are you looking to spend?']),
('select', 'package', ARRAY['package', 'service', 'option'], ARRAY['choose', 'select'], 3, ARRAY['Package Options', 'Service Level', 'Choose Package']);
```

## API Endpoints

### PDF Analysis Management

```typescript
// POST /api/ai/pdf-analysis/upload
interface UploadPDFRequest {
  file: File; // PDF file to analyze
  formName?: string; // Optional name for the form
  description?: string; // Optional description
}

interface UploadPDFResponse {
  jobId: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  estimatedProcessingTime: number; // seconds
  status: 'pending' | 'processing';
  message: string;
}

// GET /api/ai/pdf-analysis/status/{jobId}
interface GetAnalysisStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'requires_review';
  stage: string; // Current processing stage
  progress: number; // 0-100%
  
  // Results (when completed)
  fieldsDetected?: number;
  highConfidenceFields?: number;
  overallConfidence?: number;
  manualReviewRequired?: boolean;
  
  // Performance metrics
  processingTime?: number; // milliseconds
  visionApiCalls?: number;
  cost?: number; // pounds
  
  // Error information
  error?: {
    message: string;
    details: any;
    canRetry: boolean;
  };
  
  estimatedCompletion?: string; // ISO timestamp
  createdAt: string;
  completedAt?: string;
}

// GET /api/ai/pdf-analysis/results/{jobId}
interface GetAnalysisResultsResponse {
  jobId: string;
  originalFilename: string;
  pageCount: number;
  overallConfidence: number;
  
  pages: Array<{
    pageNumber: number;
    fields: Array<{
      id: string;
      label: string;
      generatedName: string;
      type: string;
      subtype?: string;
      required: boolean;
      confidence: number;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      
      // Field-specific properties
      placeholder?: string;
      helpText?: string;
      options?: string[]; // For select fields
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        required?: boolean;
      };
      
      // Wedding integration
      isCoreWeddingField: boolean;
      coreFieldMapping?: string;
      category?: string;
      
      // Quality indicators
      needsReview: boolean;
      reviewReason?: string;
      approvalStatus: 'pending' | 'approved' | 'rejected' | 'modified';
    }>;
  }>;
  
  detectedSections: Array<{
    name: string;
    pageNumber: number;
    fieldCount: number;
    confidence: number;
  }>;
  
  suggestions: Array<{
    type: 'merge_fields' | 'split_field' | 'change_type' | 'add_validation';
    description: string;
    fieldIds: string[];
    confidence: number;
  }>;
}

// POST /api/ai/pdf-analysis/approve/{jobId}
interface ApproveAnalysisRequest {
  approvedFields: Array<{
    id: string;
    approved: boolean;
    modifications?: {
      label?: string;
      type?: string;
      required?: boolean;
      validation?: any;
    };
  }>;
  createForm: boolean; // Whether to create the digital form
  formSettings?: {
    name: string;
    description?: string;
    category?: string;
    isTemplate?: boolean;
  };
}

interface ApproveAnalysisResponse {
  approvedFields: number;
  rejectedFields: number;
  modifiedFields: number;
  formCreated: boolean;
  formId?: string;
  message: string;
}

// GET /api/ai/pdf-analysis/history
interface GetAnalysisHistoryResponse {
  jobs: Array<{
    jobId: string;
    filename: string;
    status: string;
    fieldsDetected: number;
    confidence: number;
    cost: number;
    formCreated: boolean;
    createdAt: string;
    completedAt?: string;
  }>;
  
  summary: {
    totalJobs: number;
    successRate: number;
    averageConfidence: number;
    totalCost: number;
    totalFieldsDetected: number;
    formsCreated: number;
  };
}

// POST /api/ai/pdf-analysis/retry/{jobId}
interface RetryAnalysisRequest {
  useHigherQuality?: boolean; // Use more expensive but accurate model
  focusAreas?: string[]; // Specific areas to re-analyze
}
```

### Field Enhancement and Mapping

```typescript
// GET /api/ai/pdf-analysis/field-patterns
interface GetFieldPatternsResponse {
  patterns: Array<{
    fieldType: string;
    subtype?: string;
    weddingRelevance: number;
    examples: string[];
    commonLabels: string[];
    detectionRules: string[];
  }>;
  
  coreWeddingFields: Array<{
    id: string;
    name: string;
    category: string;
    required: boolean;
    commonLabels: string[];
    fieldType: string;
  }>;
}

// POST /api/ai/pdf-analysis/enhance-field
interface EnhanceFieldRequest {
  fieldId: string;
  enhancements: {
    addValidation?: boolean;
    improveLabel?: boolean;
    detectOptions?: boolean; // For select fields
    mapToCoreField?: boolean;
  };
}

interface EnhanceFieldResponse {
  fieldId: string;
  originalField: any;
  enhancedField: any;
  changes: Array<{
    property: string;
    oldValue: any;
    newValue: any;
    confidence: number;
  }>;
  cost: number; // AI processing cost
}

// POST /api/ai/pdf-analysis/bulk-enhance
interface BulkEnhanceRequest {
  jobId: string;
  fieldIds: string[];
  enhancements: {
    addValidation?: boolean;
    improveLabels?: boolean;
    detectOptions?: boolean;
    mapToCoreFields?: boolean;
    generatePlaceholders?: boolean;
    generateHelpText?: boolean;
  };
}
```

## Frontend Components

### PDF Upload and Analysis Interface

```typescript
// src/components/ai/PDFAnalysisUpload.tsx
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface PDFAnalysisUploadProps {
  onAnalysisComplete: (jobId: string, results: any) => void;
}

export default function PDFAnalysisUpload({ onAnalysisComplete }: PDFAnalysisUploadProps) {
  const [uploadJob, setUploadJob] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be under 10MB');
      return;
    }

    try {
      setError(null);
      
      // Upload and start analysis
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/ai/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setUploadJob(result);

      // Start polling for progress
      pollProgress(result.jobId);

    } catch (error) {
      setError('Failed to upload and analyze PDF. Please try again.');
    }
  }, []);

  const pollProgress = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/ai/pdf-analysis/status/${jobId}`);
        const status = await response.json();

        setProgress(status.progress);
        setStage(status.stage);

        if (status.status === 'completed') {
          // Fetch results
          const resultsResponse = await fetch(`/api/ai/pdf-analysis/results/${jobId}`);
          const results = await resultsResponse.json();
          onAnalysisComplete(jobId, results);
        } else if (status.status === 'failed') {
          setError(status.error?.message || 'Analysis failed');
        } else {
          // Continue polling
          setTimeout(poll, 2000);
        }
      } catch (error) {
        setError('Failed to check analysis status');
      }
    };

    poll();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-6">
      {!uploadJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload PDF Form for Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isDragActive
                  ? 'Drop your PDF here'
                  : 'Drop your PDF form here, or click to select'}
              </h3>
              <p className="text-sm text-gray-600">
                Supported: PDF files up to 10MB
              </p>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analyzing: {uploadJob.filename}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress: {progress}%</span>
                <span className="text-gray-600">{stage}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">File Size:</span> {uploadJob.fileSize} bytes
              </div>
              <div>
                <span className="font-medium">Pages:</span> {uploadJob.pageCount}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Analysis Results Review Interface

```typescript
// src/components/ai/PDFAnalysisResults.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle, Edit, Eye, Settings } from 'lucide-react';

interface PDFAnalysisResultsProps {
  jobId: string;
  results: GetAnalysisResultsResponse;
  onApprove: (approvalData: ApproveAnalysisRequest) => void;
}

export default function PDFAnalysisResults({ jobId, results, onApprove }: PDFAnalysisResultsProps) {
  const [fieldApprovals, setFieldApprovals] = useState<Record<string, any>>({});
  const [formSettings, setFormSettings] = useState({
    name: results.originalFilename.replace('.pdf', '') + ' Form',
    description: '',
    category: 'client_intake',
    isTemplate: false
  });

  const allFields = results.pages.flatMap(page => page.fields);
  const highConfidenceFields = allFields.filter(field => field.confidence > 0.8);
  const reviewFields = allFields.filter(field => field.needsReview);
  const coreWeddingFields = allFields.filter(field => field.isCoreWeddingField);

  const handleFieldApproval = (fieldId: string, approved: boolean, modifications?: any) => {
    setFieldApprovals(prev => ({
      ...prev,
      [fieldId]: { approved, modifications }
    }));
  };

  const handleApproveAll = () => {
    const approvalData: ApproveAnalysisRequest = {
      approvedFields: allFields.map(field => ({
        id: field.id,
        approved: fieldApprovals[field.id]?.approved ?? true,
        modifications: fieldApprovals[field.id]?.modifications
      })),
      createForm: true,
      formSettings
    };

    onApprove(approvalData);
  };

  const getFieldTypeIcon = (type: string) => {
    const icons = {
      text: '📝',
      email: '📧',
      phone: '📞',
      date: '📅',
      select: '📋',
      checkbox: '☑️',
      textarea: '📄',
      number: '🔢',
      address: '📍'
    };
    return icons[type] || '📝';
  };

  return (
    <div className="space-y-6">
      {/* Analysis Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Analysis Results: {results.originalFilename}
            <Badge variant={results.overallConfidence > 0.8 ? 'default' : 'secondary'}>
              {(results.overallConfidence * 100).toFixed(1)}% Confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{allFields.length}</div>
              <div className="text-sm text-gray-600">Total Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{highConfidenceFields.length}</div>
              <div className="text-sm text-gray-600">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{reviewFields.length}</div>
              <div className="text-sm text-gray-600">Need Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{coreWeddingFields.length}</div>
              <div className="text-sm text-gray-600">Wedding Fields</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Form Creation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Form Name</label>
              <Input
                value={formSettings.name}
                onChange={(e) => setFormSettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={formSettings.category} onValueChange={(value) => 
                setFormSettings(prev => ({ ...prev, category: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_intake">Client Intake</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="timeline">Timeline Planning</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              value={formSettings.description}
              onChange={(e) => setFormSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this form"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-template"
              checked={formSettings.isTemplate}
              onCheckedChange={(checked) => 
                setFormSettings(prev => ({ ...prev, isTemplate: !!checked }))
              }
            />
            <label htmlFor="is-template" className="text-sm font-medium">
              Save as template for future use
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Fields by Page */}
      {results.pages.map((page) => (
        <Card key={page.pageNumber}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Page {page.pageNumber}
              <Badge variant="outline">{page.fields.length} fields</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {page.fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getFieldTypeIcon(field.type)}</span>
                        <div>
                          <h4 className="font-medium">{field.label}</h4>
                          <p className="text-sm text-gray-600">
                            Generated name: <code>{field.generatedName}</code>
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={field.type === 'text' ? 'secondary' : 'default'}>
                          {field.type}
                          {field.subtype && `.${field.subtype}`}
                        </Badge>
                        
                        {field.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                        
                        {field.isCoreWeddingField && (
                          <Badge variant="outline" className="bg-purple-50">
                            Wedding Field
                          </Badge>
                        )}

                        <Badge 
                          variant={field.confidence > 0.8 ? 'default' : field.confidence > 0.6 ? 'secondary' : 'destructive'}
                        >
                          {(field.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>

                      {field.needsReview && (
                        <div className="mt-2 flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">{field.reviewReason}</span>
                        </div>
                      )}

                      {field.coreFieldMapping && (
                        <div className="mt-2 text-sm text-purple-600">
                          Maps to: {field.coreFieldMapping}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`approve-${field.id}`}
                          checked={fieldApprovals[field.id]?.approved ?? true}
                          onCheckedChange={(checked) => 
                            handleFieldApproval(field.id, !!checked)
                          }
                        />
                        <label htmlFor={`approve-${field.id}`} className="text-sm">
                          Include
                        </label>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {field.options && field.options.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Detected Options:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {field.options.map((option, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Suggestions */}
      {results.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{suggestion.description}</p>
                      <p className="text-sm text-gray-600">
                        Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">
          Save as Draft
        </Button>
        <Button onClick={handleApproveAll} className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Create Digital Form ({Object.values(fieldApprovals).filter(f => f.approved).length || allFields.length} fields)
        </Button>
      </div>
    </div>
  );
}
```

## Integration Points

### MCP Server Integration

```typescript
// src/lib/ai/mcp-pdf-analysis-integration.ts
import { MCPServer } from '@/lib/mcp/server';

export class PDFAnalysisMCPIntegration {
  constructor(private mcpServer: MCPServer) {}

  // Use Context7 for latest OpenAI Vision API documentation
  async getVisionAPIBestPractices() {
    const visionDocs = await this.mcpServer.context7.getLibraryDocs({
      context7CompatibleLibraryID: '/openai/openai-node',
      topic: 'vision_api'
    });

    return this.applyVisionAPIOptimizations(visionDocs);
  }

  // Store analysis results in PostgreSQL via MCP
  async storeAnalysisResults(jobId: string, analysis: any) {
    await this.mcpServer.postgres.query(`
      UPDATE pdf_analysis_jobs 
      SET 
        extracted_fields = $1,
        layout_structure = $2,
        overall_confidence_score = $3,
        fields_detected_count = $4,
        analysis_status = 'completed'
      WHERE id = $5
    `, [
      JSON.stringify(analysis.fields),
      JSON.stringify(analysis.layout),
      analysis.confidence,
      analysis.fields.length,
      jobId
    ]);

    // Store individual fields
    for (const field of analysis.fields) {
      await this.mcpServer.postgres.query(`
        INSERT INTO extracted_form_fields 
        (job_id, page_number, field_label, field_name, field_type, position_data, extraction_confidence)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        jobId,
        field.pageNumber,
        field.label,
        field.generatedName,
        field.type,
        JSON.stringify(field.position),
        field.confidence
      ]);
    }
  }

  // Use Supabase MCP for file storage
  async uploadAndProcessPDF(file: File, supplierId: string) {
    // Upload file to Supabase Storage
    const fileName = `pdf-analysis/${supplierId}/${Date.now()}-${file.name}`;
    const fileUrl = await this.mcpServer.supabase.storage.upload(fileName, file);

    // Create job record
    const job = await this.mcpServer.supabase.executeSQL(`
      INSERT INTO pdf_analysis_jobs (supplier_id, original_filename, file_url, file_size)
      VALUES ($1, $2, $3, $4)
      RETURNING id, analysis_status
    `, [supplierId, file.name, fileUrl, file.size]);

    return job[0];
  }

  // Monitor processing performance
  async trackProcessingMetrics(jobId: string, stage: string, metrics: any) {
    await this.mcpServer.postgres.query(`
      INSERT INTO pdf_processing_logs 
      (job_id, stage, status, processing_time_ms, memory_usage_mb, api_calls_made)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      jobId,
      stage,
      metrics.status,
      metrics.processingTime,
      metrics.memoryUsage,
      metrics.apiCalls
    ]);
  }
}
```

### Wedding Context Integration

```typescript
// src/lib/ai/wedding-pdf-analysis.ts
export class WeddingPDFAnalysis {
  // Enhance field detection with wedding context
  async enhanceWithWeddingContext(fields: any[], supplierId: string) {
    const supplierProfile = await this.getSupplierProfile(supplierId);
    const supplierType = supplierProfile.supplier_type; // photographer, planner, venue, etc.

    return fields.map(field => {
      const enhanced = { ...field };

      // Apply wedding-specific field mapping
      const coreMapping = this.mapToWeddingCoreField(field.label, supplierType);
      if (coreMapping) {
        enhanced.isCoreWeddingField = true;
        enhanced.coreFieldMapping = coreMapping.id;
        enhanced.category = coreMapping.category;
        enhanced.confidence += 0.1; // Boost confidence for recognized wedding fields
      }

      // Add supplier-specific context
      enhanced.supplierContext = this.getSupplierSpecificContext(field, supplierType);

      // Add seasonal relevance
      enhanced.seasonalRelevance = this.getSeasonalRelevance(field.label);

      return enhanced;
    });
  }

  // Map field labels to wedding core fields
  private mapToWeddingCoreField(label: string, supplierType: string) {
    const commonMappings = {
      'bride name': { id: 'bride_name', category: 'couple_info' },
      'groom name': { id: 'groom_name', category: 'couple_info' },
      'wedding date': { id: 'wedding_date', category: 'wedding_details' },
      'guest count': { id: 'guest_count', category: 'wedding_details' },
      'venue': { id: 'ceremony_venue', category: 'venue_details' },
      'budget': { id: 'budget_range', category: 'budget_services' }
    };

    // Supplier-specific mappings
    const supplierMappings = {
      photographer: {
        'engagement session': { id: 'engagement_session', category: 'services' },
        'photo package': { id: 'photo_package', category: 'services' },
        'shot list': { id: 'photo_shot_list', category: 'preferences' }
      },
      wedding_planner: {
        'timeline': { id: 'wedding_timeline', category: 'timeline_planning' },
        'vendor preferences': { id: 'vendor_preferences', category: 'preferences' },
        'coordinator contact': { id: 'coordinator_contact', category: 'contact_info' }
      },
      venue: {
        'ceremony location': { id: 'ceremony_venue', category: 'venue_details' },
        'reception space': { id: 'reception_venue', category: 'venue_details' },
        'catering': { id: 'catering_preferences', category: 'services' }
      }
    };

    // Check common mappings first
    for (const [pattern, mapping] of Object.entries(commonMappings)) {
      if (label.toLowerCase().includes(pattern.toLowerCase())) {
        return mapping;
      }
    }

    // Check supplier-specific mappings
    const supplierMap = supplierMappings[supplierType] || {};
    for (const [pattern, mapping] of Object.entries(supplierMap)) {
      if (label.toLowerCase().includes(pattern.toLowerCase())) {
        return mapping;
      }
    }

    return null;
  }

  // Get supplier-specific field context
  private getSupplierSpecificContext(field: any, supplierType: string) {
    const contexts = {
      photographer: {
        importance: this.getPhotographyFieldImportance(field.label),
        seasonalVariations: this.getPhotographySeasonalVariations(field.label),
        typicalOptions: this.getPhotographyOptions(field.label)
      },
      wedding_planner: {
        importance: this.getPlannerFieldImportance(field.label),
        coordinationLevel: this.getCoordinationLevel(field.label),
        timelineRelevance: this.getTimelineRelevance(field.label)
      },
      venue: {
        capacityRelevance: this.getCapacityRelevance(field.label),
        spaceType: this.getSpaceType(field.label),
        cateringRelevance: this.getCateringRelevance(field.label)
      }
    };

    return contexts[supplierType] || {};
  }

  // Determine seasonal relevance of fields
  private getSeasonalRelevance(label: string) {
    const seasonalFields = {
      'outdoor': { high: [3, 4, 5, 6, 7, 8, 9, 10], low: [11, 12, 1, 2] },
      'weather': { high: [3, 4, 5, 6, 7, 8, 9, 10], low: [11, 12, 1, 2] },
      'heating': { high: [11, 12, 1, 2, 3], low: [6, 7, 8] },
      'garden': { high: [4, 5, 6, 7, 8, 9], low: [11, 12, 1, 2] },
      'indoor': { high: [11, 12, 1, 2], low: [6, 7, 8] }
    };

    for (const [keyword, seasons] of Object.entries(seasonalFields)) {
      if (label.toLowerCase().includes(keyword)) {
        return seasons;
      }
    }

    return { high: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], low: [] };
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// src/__tests__/unit/pdf-analysis-system.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { PDFAnalysisSystem } from '@/lib/ai/pdf-analysis-system';
import { WeddingFieldDetector } from '@/lib/ai/wedding-field-detector';
import { mockPDFFile, mockVisionResponse } from '@/test-utils/mocks';

describe('PDF Analysis System', () => {
  let analysisSystem: PDFAnalysisSystem;
  let fieldDetector: WeddingFieldDetector;

  beforeEach(() => {
    analysisSystem = new PDFAnalysisSystem();
    fieldDetector = new WeddingFieldDetector();
  });

  test('processes PDF and extracts form fields', async () => {
    const mockPDF = mockPDFFile('wedding-consultation-form.pdf', 3);
    
    const analysis = await analysisSystem.analyzePDF(mockPDF, 'photographer_123');
    
    expect(analysis.fields.length).toBeGreaterThan(0);
    expect(analysis.confidence).toBeGreaterThan(0.5);
    expect(analysis.layout.pageCount).toBe(3);
  });

  test('detects wedding-specific field types correctly', () => {
    const testCases = [
      { label: 'Bride Name', expected: 'bride_name' },
      { label: 'Wedding Date', expected: 'wedding_date' },
      { label: 'Number of Guests', expected: 'guest_count' },
      { label: 'Venue Address', expected: 'venue_address' },
      { label: 'Photography Package', expected: 'photo_package' }
    ];

    testCases.forEach(({ label, expected }) => {
      const fieldType = fieldDetector.detectWeddingFieldType(label);
      expect(fieldType.coreFieldId).toBe(expected);
    });
  });

  test('applies correct confidence scoring', () => {
    const fields = [
      { label: 'Email Address', type: 'email', hasValidation: true },
      { label: 'Unclear text', type: 'text', hasValidation: false },
      { label: 'Wedding Date', type: 'date', hasValidation: true, isCoreField: true }
    ];

    fields.forEach(field => {
      const confidence = fieldDetector.calculateConfidence(field);
      
      if (field.isCoreField) {
        expect(confidence).toBeGreaterThan(0.8); // Wedding core fields get high confidence
      } else if (field.type !== 'text') {
        expect(confidence).toBeGreaterThan(0.6); // Specific field types
      } else {
        expect(confidence).toBeGreaterThan(0.3); // Basic text fields
      }
    });
  });

  test('handles supplier-specific field context', () => {
    const photographerFields = [
      'Engagement Session Requested',
      'Photo Package Selection',
      'Shot List Preferences'
    ];

    photographerFields.forEach(label => {
      const context = fieldDetector.getSupplierContext(label, 'photographer');
      expect(context.supplierType).toBe('photographer');
      expect(context.relevance).toBeGreaterThan(0.7);
    });
  });

  test('manages seasonal field relevance', () => {
    const outdoorField = { label: 'Outdoor Ceremony Backup Plan' };
    const seasonalRelevance = fieldDetector.getSeasonalRelevance(outdoorField);
    
    expect(seasonalRelevance.highSeasons).toContain(6); // June
    expect(seasonalRelevance.highSeasons).toContain(9); // September
    expect(seasonalRelevance.lowSeasons).toContain(1); // January
  });

  test('error handling for corrupted PDFs', async () => {
    const corruptedPDF = mockPDFFile('corrupted.pdf', 0, true);
    
    await expect(analysisSystem.analyzePDF(corruptedPDF, 'supplier_123'))
      .rejects.toThrow('PDF appears to be corrupted');
  });

  test('handles password-protected PDFs', async () => {
    const protectedPDF = mockPDFFile('protected.pdf', 2, false, true);
    
    await expect(analysisSystem.analyzePDF(protectedPDF, 'supplier_123'))
      .rejects.toThrow('PDF is password protected');
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/pdf-analysis-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestSupabaseClient } from '@/test-utils/supabase';
import { PDFAnalysisAPI } from '@/app/api/ai/pdf-analysis/route';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PDF Analysis Integration', () => {
  let supabase: any;
  let testSupplierId: string;

  beforeAll(async () => {
    supabase = createTestSupabaseClient();
    testSupplierId = await createTestSupplier('photographer', 'professional');
  });

  afterAll(async () => {
    await cleanupTestData(testSupplierId);
  });

  test('complete PDF analysis workflow', async () => {
    // Load test PDF file
    const pdfBuffer = readFileSync(resolve(__dirname, '../fixtures/sample-wedding-form.pdf'));
    const pdfFile = new File([pdfBuffer], 'sample-wedding-form.pdf', { type: 'application/pdf' });

    // 1. Upload PDF for analysis
    const formData = new FormData();
    formData.append('file', pdfFile);

    const uploadResponse = await fetch('/api/ai/pdf-analysis/upload', {
      method: 'POST',
      body: formData
    });

    expect(uploadResponse.ok).toBe(true);
    const uploadResult = await uploadResponse.json();
    expect(uploadResult.jobId).toBeDefined();
    expect(uploadResult.status).toBe('pending');

    // 2. Poll for completion
    let analysisComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 1 minute timeout

    while (!analysisComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`/api/ai/pdf-analysis/status/${uploadResult.jobId}`);
      const status = await statusResponse.json();

      if (status.status === 'completed') {
        analysisComplete = true;
        expect(status.fieldsDetected).toBeGreaterThan(0);
        expect(status.overallConfidence).toBeGreaterThan(0.5);
      } else if (status.status === 'failed') {
        throw new Error(`Analysis failed: ${status.error?.message}`);
      }
      
      attempts++;
    }

    expect(analysisComplete).toBe(true);

    // 3. Fetch detailed results
    const resultsResponse = await fetch(`/api/ai/pdf-analysis/results/${uploadResult.jobId}`);
    const results = await resultsResponse.json();

    expect(results.pages.length).toBeGreaterThan(0);
    expect(results.pages[0].fields.length).toBeGreaterThan(0);
    
    // Verify field detection quality
    const allFields = results.pages.flatMap(page => page.fields);
    const highConfidenceFields = allFields.filter(field => field.confidence > 0.8);
    const weddingFields = allFields.filter(field => field.isCoreWeddingField);

    expect(highConfidenceFields.length).toBeGreaterThan(0);
    expect(weddingFields.length).toBeGreaterThan(0);

    // 4. Approve analysis and create form
    const approvalResponse = await fetch(`/api/ai/pdf-analysis/approve/${uploadResult.jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedFields: allFields.map(field => ({
          id: field.id,
          approved: true
        })),
        createForm: true,
        formSettings: {
          name: 'Test Wedding Form',
          description: 'Automatically generated from PDF',
          category: 'client_intake'
        }
      })
    });

    const approval = await approvalResponse.json();
    expect(approval.approvedFields).toBeGreaterThan(0);
    expect(approval.formCreated).toBe(true);
    expect(approval.formId).toBeDefined();
  });

  test('field enhancement workflow', async () => {
    // Create a test analysis job with basic fields
    const jobId = await createTestAnalysisJob(testSupplierId);
    const fieldId = await createTestExtractedField(jobId, 'Basic text field');

    // Enhance the field
    const enhanceResponse = await fetch('/api/ai/pdf-analysis/enhance-field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId,
        enhancements: {
          addValidation: true,
          improveLabel: true,
          mapToCoreField: true
        }
      })
    });

    const enhancement = await enhanceResponse.json();
    expect(enhancement.changes.length).toBeGreaterThan(0);
    expect(enhancement.enhancedField).toBeDefined();
  });

  test('bulk field enhancement', async () => {
    const jobId = await createTestAnalysisJob(testSupplierId);
    const fieldIds = await createTestExtractedFields(jobId, 5);

    const bulkEnhanceResponse = await fetch('/api/ai/pdf-analysis/bulk-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        fieldIds,
        enhancements: {
          addValidation: true,
          improveLabels: true,
          mapToCoreFields: true,
          generatePlaceholders: true
        }
      })
    });

    const result = await bulkEnhanceResponse.json();
    expect(result.enhancedFields).toBe(5);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  test('analysis history and metrics', async () => {
    const historyResponse = await fetch('/api/ai/pdf-analysis/history');
    const history = await historyResponse.json();

    expect(history.jobs).toBeDefined();
    expect(history.summary).toBeDefined();
    expect(history.summary.totalJobs).toBeGreaterThanOrEqual(0);
    expect(history.summary.successRate).toBeGreaterThanOrEqual(0);
  });

  async function createTestAnalysisJob(supplierId: string): Promise<string> {
    const result = await supabase
      .from('pdf_analysis_jobs')
      .insert({
        supplier_id: supplierId,
        original_filename: 'test.pdf',
        file_url: 'https://test.com/test.pdf',
        file_size: 1024,
        analysis_status: 'completed',
        fields_detected_count: 5,
        overall_confidence_score: 0.85
      })
      .select()
      .single();

    return result.data.id;
  }

  async function createTestExtractedField(jobId: string, label: string): Promise<string> {
    const result = await supabase
      .from('extracted_form_fields')
      .insert({
        job_id: jobId,
        page_number: 1,
        field_label: label,
        field_name: label.toLowerCase().replace(' ', '_'),
        field_type: 'text',
        extraction_confidence: 0.75,
        position_data: JSON.stringify({ x: 100, y: 100, width: 200, height: 30 })
      })
      .select()
      .single();

    return result.data.id;
  }
});
```

### E2E Tests

```typescript
// tests/e2e/pdf-analysis-complete-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { createTestSupplier, loginAsSupplier } from '../helpers/auth';
import { uploadFile } from '../helpers/file-upload';

test.describe('PDF Analysis Complete Workflow', () => {
  test('supplier uploads PDF and creates digital form', async ({ page }) => {
    // Setup test data
    const supplierId = await createTestSupplier('photographer', 'professional');
    await loginAsSupplier(page, supplierId);

    // Navigate to PDF analysis page
    await page.goto('/dashboard/ai/pdf-analysis');
    
    // Upload PDF file
    await uploadFile(page, '[data-testid="pdf-upload-zone"]', 'tests/fixtures/wedding-consultation-form.pdf');
    
    // Verify upload started
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-status"]')).toContainText('Processing');

    // Wait for analysis completion
    await page.waitForSelector('[data-testid="analysis-completed"]', { timeout: 60000 });
    
    // Verify results summary
    await expect(page.locator('[data-testid="total-fields-detected"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="overall-confidence"]')).toContainText(/%/);
    await expect(page.locator('[data-testid="wedding-fields-count"]')).toBeVisible();

    // Review detected fields
    const fieldCards = page.locator('[data-testid="field-card"]');
    const fieldCount = await fieldCards.count();
    expect(fieldCount).toBeGreaterThan(0);

    // Check first few fields
    for (let i = 0; i < Math.min(fieldCount, 3); i++) {
      const field = fieldCards.nth(i);
      await expect(field.locator('[data-testid="field-label"]')).toBeVisible();
      await expect(field.locator('[data-testid="field-type"]')).toBeVisible();
      await expect(field.locator('[data-testid="confidence-score"]')).toBeVisible();
    }

    // Look for wedding-specific fields
    const weddingFieldExists = await page.locator('[data-testid="field-card"][data-wedding-field="true"]').count() > 0;
    expect(weddingFieldExists).toBe(true);

    // Configure form settings
    await page.fill('[data-testid="form-name"]', 'Photography Consultation Form');
    await page.selectOption('[data-testid="form-category"]', 'client_intake');
    await page.fill('[data-testid="form-description"]', 'Client intake form for photography services');

    // Verify field approval status
    const approvedFields = await page.locator('[data-testid="field-approval-checkbox"]:checked').count();
    expect(approvedFields).toBeGreaterThan(0);

    // Test field modification
    await page.click('[data-testid="edit-field-button"]');
    await page.fill('[data-testid="field-label-input"]', 'Modified Field Label');
    await page.click('[data-testid="save-field-changes"]');
    
    await expect(page.locator('[data-testid="field-modified-indicator"]')).toBeVisible();

    // Test AI suggestions (if any)
    const suggestionsExist = await page.locator('[data-testid="ai-suggestion"]').count() > 0;
    if (suggestionsExist) {
      await page.click('[data-testid="apply-suggestion-button"]');
      await expect(page.locator('[data-testid="suggestion-applied"]')).toBeVisible();
    }

    // Create the digital form
    await page.click('[data-testid="create-digital-form"]');
    
    // Verify form creation progress
    await expect(page.locator('[data-testid="form-creation-progress"]')).toBeVisible();
    await page.waitForSelector('[data-testid="form-created-successfully"]', { timeout: 30000 });

    // Verify form was created
    await expect(page.locator('[data-testid="new-form-link"]')).toBeVisible();
    
    const formId = await page.locator('[data-testid="new-form-id"]').textContent();
    expect(formId).toBeTruthy();

    // Navigate to the created form
    await page.click('[data-testid="view-new-form"]');
    
    // Verify form is working
    await expect(page.locator('[data-testid="form-title"]')).toContainText('Photography Consultation Form');
    
    // Test that form fields are functional
    const formFields = page.locator('[data-testid="form-field"]');
    const formFieldCount = await formFields.count();
    expect(formFieldCount).toBe(approvedFields);

    // Test form submission (preview mode)
    const firstTextField = page.locator('input[type="text"]').first();
    if (await firstTextField.isVisible()) {
      await firstTextField.fill('Test input');
      await expect(firstTextField).toHaveValue('Test input');
    }

    // Return to PDF analysis history
    await page.goto('/dashboard/ai/pdf-analysis/history');
    
    // Verify job appears in history
    await expect(page.locator('[data-testid="analysis-job-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="job-status"]').first()).toContainText('Completed');
    await expect(page.locator('[data-testid="form-created-indicator"]').first()).toBeVisible();

    // Check analytics/metrics
    await page.goto('/dashboard/ai/pdf-analysis/analytics');
    
    await expect(page.locator('[data-testid="total-analyses"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="success-rate"]')).toContainText(/%/);
    await expect(page.locator('[data-testid="avg-confidence"]')).toContainText(/%/);
  });

  test('handles PDF analysis errors gracefully', async ({ page }) => {
    const supplierId = await createTestSupplier('venue', 'professional');
    await loginAsSupplier(page, supplierId);

    await page.goto('/dashboard/ai/pdf-analysis');
    
    // Test invalid file upload
    await uploadFile(page, '[data-testid="pdf-upload-zone"]', 'tests/fixtures/not-a-pdf.txt');
    
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('Please upload a PDF file only');

    // Test oversized file (mock)
    // Note: In real test, you'd upload a file >10MB
    await page.route('/api/ai/pdf-analysis/upload', async route => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'File size exceeds 10MB limit' })
      });
    });

    await uploadFile(page, '[data-testid="pdf-upload-zone"]', 'tests/fixtures/large-file.pdf');
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('exceeds 10MB limit');
  });
});
```

## Acceptance Criteria

### Analysis Accuracy Requirements
- **Field Detection Rate**: Detect 85%+ of form fields with 70%+ confidence
- **Type Classification**: Correctly classify field types with 80%+ accuracy
- **Wedding Field Recognition**: Identify core wedding fields with 90%+ accuracy
- **Layout Preservation**: Maintain original field order and grouping with 95% fidelity

### Performance Requirements
- **Processing Speed**: Analyze standard 3-page form in <30 seconds
- **Concurrent Processing**: Handle 5+ simultaneous PDF analyses
- **Memory Efficiency**: Process 10MB PDFs using <500MB RAM
- **API Response Time**: Status checks complete in <200ms

### Wedding Industry Requirements
- **Supplier Specialization**: Apply supplier-type-specific field enhancement
- **Core Field Mapping**: Map 15+ common wedding fields to WedSync standards
- **Seasonal Awareness**: Adjust field importance based on wedding seasons
- **Integration Ready**: Generate forms compatible with WedSync form builder

### Quality Assurance Requirements
- **Confidence Scoring**: Provide accurate 0.0-1.0 confidence scores per field
- **Manual Review Triggers**: Flag low-confidence fields for human review
- **Error Recovery**: Gracefully handle corrupted, protected, or invalid PDFs
- **Validation Rules**: Auto-detect and apply appropriate field validation

### Technical Requirements
- **File Support**: Handle PDF files up to 10MB, max 20 pages
- **Database Performance**: Store/retrieve analysis results in <100ms
- **API Reliability**: 99.5% uptime for analysis endpoints
- **Cost Efficiency**: Process typical form for <£2.50 in AI costs

## Effort Estimation

### Team D (AI/ML) - 86 hours
- PDF parsing and vision API integration (32h)
- Field type detection and classification (24h)
- Wedding-specific field mapping (18h)
- Confidence scoring and quality metrics (12h)

### Team B (Backend) - 52 hours
- Database schema and API endpoints (28h)
- Processing queue and job management (16h)
- File upload and storage integration (8h)

### Team A (Frontend) - 38 hours
- PDF upload interface (16h)
- Results review and approval interface (18h)
- Analytics and history dashboard (4h)

### Team C (Integration) - 24 hours
- MCP server integration (16h)
- Wedding context enhancement (8h)

### Team E (Platform) - 16 hours
- Job queue processing (12h)
- Performance monitoring (4h)

### Team F (General) - 34 hours
- Testing implementation (26h)
- Documentation and deployment (8h)

**Total Effort: 250 hours**

## Dependencies
- OpenAI Vision API access and credits
- PDF.js or similar PDF parsing library
- File upload/storage infrastructure (Supabase Storage)
- Job queue system (background processing)
- Wedding core field definitions
- MCP server integrations (Context7, PostgreSQL, Supabase)

## Risks & Mitigations
- **Risk**: Vision API costs higher than expected for complex forms
- **Mitigation**: Implement image preprocessing and optimize API calls
- **Risk**: OCR accuracy poor for handwritten or low-quality PDFs
- **Mitigation**: Multi-stage analysis with fallback to manual review
- **Risk**: Processing queue bottlenecks during high usage
- **Mitigation**: Auto-scaling job workers and priority queuing