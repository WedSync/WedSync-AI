# WS-243: AI Field Extraction System - Technical Specification

## User Story
**As a wedding supplier using the PDF analysis system,**  
**I want intelligent field extraction that accurately identifies form elements with wedding-specific context,**  
**So that my imported forms have proper field types, validation, and mapping to core wedding data.**

**Business Scenario:**
Wedding planner "Perfect Day Planning" uploads their consultation form PDF containing:
- Mixed field types (text, dates, checkboxes, dropdowns)
- Wedding-specific fields (ceremony venue, guest count, timeline)
- Complex layouts with nested sections

Without intelligent extraction: Manual field type assignment taking 45 minutes with high error risk.
With WS-243: AI extracts all 62 fields with 92% accuracy, identifies 18 wedding-specific fields, and maps 12 to core wedding data - total time 2 minutes.

## Database Schema

```sql
-- Field extraction processing
CREATE TABLE field_extraction_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_analysis_job_id UUID REFERENCES pdf_analysis_jobs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  extraction_method VARCHAR(30) NOT NULL, -- 'vision_api', 'text_parsing', 'hybrid', 'manual_fallback'
  
  -- Extraction parameters
  context_type VARCHAR(20) DEFAULT 'wedding', -- 'wedding', 'general'
  supplier_type VARCHAR(30), -- 'photographer', 'planner', 'venue', etc.
  language VARCHAR(10) DEFAULT 'en',
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'requires_review'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  total_fields_extracted INTEGER DEFAULT 0,
  wedding_specific_fields INTEGER DEFAULT 0,
  core_field_mappings INTEGER DEFAULT 0,
  high_confidence_fields INTEGER DEFAULT 0,
  
  -- Quality metrics
  overall_confidence DECIMAL(4,3), -- 0.000-1.000
  extraction_accuracy DECIMAL(4,3), -- Based on user feedback
  processing_time_ms INTEGER,
  
  -- Cost tracking
  ai_api_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_pounds DECIMAL(6,4) DEFAULT 0.0000,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_extraction_jobs_supplier (supplier_id),
  INDEX idx_extraction_jobs_status (status),
  INDEX idx_extraction_jobs_pdf (pdf_analysis_job_id)
);

-- Enhanced extracted fields with wedding intelligence
CREATE TABLE extracted_field_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_job_id UUID REFERENCES field_extraction_jobs(id) ON DELETE CASCADE,
  field_id UUID REFERENCES extracted_form_fields(id) ON DELETE CASCADE,
  
  -- Field identification
  original_label TEXT NOT NULL,
  cleaned_label TEXT NOT NULL, -- Normalized/cleaned version
  generated_name VARCHAR(100) NOT NULL, -- snake_case field name
  display_label TEXT NOT NULL, -- User-friendly label
  
  -- Field classification
  field_type VARCHAR(30) NOT NULL,
  field_subtype VARCHAR(30), -- More specific type
  input_format VARCHAR(50), -- 'single_line', 'multi_line', 'dropdown', etc.
  data_type VARCHAR(20), -- 'string', 'number', 'date', 'boolean', etc.
  
  -- Wedding intelligence
  is_wedding_specific BOOLEAN DEFAULT false,
  wedding_category VARCHAR(30), -- 'core_info', 'photography', 'catering', 'music', 'timeline', etc.
  wedding_field_type VARCHAR(50), -- 'couple_names', 'wedding_date', 'shot_list', etc.
  core_field_mapping VARCHAR(50), -- Maps to WedSync core fields
  wedding_relevance_score INTEGER DEFAULT 0, -- 0-100
  
  -- Validation and constraints
  validation_rules JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  regex_pattern TEXT,
  custom_validation TEXT,
  
  -- Options and choices
  has_options BOOLEAN DEFAULT false,
  options_list JSONB, -- Array of {value, label} for select/radio/checkbox
  default_value TEXT,
  placeholder_text TEXT,
  help_text TEXT,
  
  -- Conditional logic
  has_conditional_logic BOOLEAN DEFAULT false,
  conditional_rules JSONB, -- Show/hide based on other fields
  depends_on_fields TEXT[], -- Field IDs this field depends on
  
  -- Auto-population capability
  can_auto_populate BOOLEAN DEFAULT false,
  auto_populate_source VARCHAR(50), -- 'wedding_data', 'user_profile', 'previous_forms'
  auto_populate_field VARCHAR(100), -- Source field to pull from
  
  -- Quality and confidence
  extraction_confidence DECIMAL(4,3) NOT NULL,
  type_detection_confidence DECIMAL(4,3),
  validation_confidence DECIMAL(4,3),
  mapping_confidence DECIMAL(4,3),
  
  -- Pattern matching results
  pattern_matches JSONB, -- Which patterns matched this field
  keyword_matches TEXT[], -- Keywords that helped identify the field
  context_clues TEXT[], -- Surrounding text that helped classification
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_field_details_extraction (extraction_job_id),
  INDEX idx_field_details_wedding (is_wedding_specific, wedding_category),
  INDEX idx_field_details_confidence (extraction_confidence DESC),
  INDEX idx_field_details_auto_populate (can_auto_populate)
);

-- Wedding field patterns and mappings
CREATE TABLE wedding_field_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(30) NOT NULL, -- 'core_info', 'photography', 'catering', etc.
  field_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  
  -- Pattern matching
  label_patterns TEXT[] NOT NULL, -- Regex patterns for labels
  keyword_triggers TEXT[] NOT NULL, -- Keywords that indicate this field
  context_patterns TEXT[], -- Surrounding context patterns
  
  -- Field properties
  suggested_input_type VARCHAR(30) NOT NULL,
  suggested_validation JSONB,
  suggested_placeholder TEXT,
  suggested_help_text TEXT,
  
  -- Mapping information
  core_field_id VARCHAR(50), -- Maps to WedSync core field
  auto_populate_capable BOOLEAN DEFAULT false,
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(4,3) DEFAULT 0.000,
  
  -- Supplier type relevance
  relevant_suppliers TEXT[], -- Which supplier types use this field
  importance_by_supplier JSONB, -- {photographer: 5, planner: 3, ...}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(category, field_type),
  INDEX idx_wedding_patterns_category (category),
  INDEX idx_wedding_patterns_usage (usage_count DESC)
);

-- Field extraction confidence tracking
CREATE TABLE extraction_confidence_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_job_id UUID REFERENCES field_extraction_jobs(id),
  
  -- Overall metrics
  total_fields INTEGER NOT NULL,
  high_confidence_count INTEGER DEFAULT 0, -- >80% confidence
  medium_confidence_count INTEGER DEFAULT 0, -- 60-80%
  low_confidence_count INTEGER DEFAULT 0, -- <60%
  
  -- Category-specific confidence
  text_fields_confidence DECIMAL(4,3),
  date_fields_confidence DECIMAL(4,3),
  select_fields_confidence DECIMAL(4,3),
  checkbox_fields_confidence DECIMAL(4,3),
  
  -- Wedding-specific confidence
  wedding_fields_confidence DECIMAL(4,3),
  core_mapping_confidence DECIMAL(4,3),
  
  -- Issues detected
  extraction_issues JSONB, -- Array of {field, issue, severity}
  ambiguous_fields INTEGER DEFAULT 0,
  missing_validations INTEGER DEFAULT 0,
  uncertain_types INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seasonal field importance
CREATE TABLE seasonal_field_importance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_type VARCHAR(50) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  importance_score INTEGER DEFAULT 50, -- 0-100
  
  -- Seasonal variations
  peak_season_multiplier DECIMAL(3,2) DEFAULT 1.00,
  off_season_multiplier DECIMAL(3,2) DEFAULT 1.00,
  
  -- Context
  reason TEXT,
  examples TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_type, month)
);

-- Insert wedding field patterns
INSERT INTO wedding_field_patterns (category, field_type, field_name, label_patterns, keyword_triggers, suggested_input_type, core_field_id, relevant_suppliers) VALUES
-- Core Wedding Information
('core_info', 'couple_names', 'Couple Names', ARRAY['couple.?names?', 'bride.?(?:and|&).?groom', 'partners?'], ARRAY['couple', 'bride', 'groom', 'partner'], 'text', 'couple_names', ARRAY['photographer', 'planner', 'venue', 'catering']),
('core_info', 'wedding_date', 'Wedding Date', ARRAY['wedding.?date', 'ceremony.?date', 'big.?day'], ARRAY['wedding', 'date', 'ceremony', 'when'], 'date', 'wedding_date', ARRAY['photographer', 'planner', 'venue', 'catering']),
('core_info', 'guest_count', 'Guest Count', ARRAY['guest.?count', 'number.?of.?guests', 'attendees?', 'head.?count'], ARRAY['guests', 'attendees', 'people', 'count'], 'number', 'guest_count', ARRAY['venue', 'catering', 'planner']),

-- Photography Specific
('photography', 'shot_list', 'Shot List', ARRAY['shot.?list', 'must.?have.?shots?', 'photo.?list'], ARRAY['shots', 'photos', 'pictures', 'must have'], 'textarea', NULL, ARRAY['photographer']),
('photography', 'family_photos', 'Family Photos', ARRAY['family.?photos?', 'group.?photos?', 'formal.?shots?'], ARRAY['family', 'group', 'formal', 'portraits'], 'textarea', NULL, ARRAY['photographer']),
('photography', 'style_preference', 'Photography Style', ARRAY['photo(?:graphy)?.?style', 'style.?preference'], ARRAY['style', 'candid', 'traditional', 'artistic'], 'select', NULL, ARRAY['photographer']),

-- Catering Specific
('catering', 'dietary_requirements', 'Dietary Requirements', ARRAY['dietary', 'allergies?', 'restrictions?', 'special.?diet'], ARRAY['dietary', 'allergies', 'vegan', 'gluten'], 'checkbox', NULL, ARRAY['catering', 'venue']),
('catering', 'menu_preferences', 'Menu Preferences', ARRAY['menu', 'food.?preference', 'cuisine'], ARRAY['menu', 'food', 'cuisine', 'meal'], 'select', NULL, ARRAY['catering', 'venue']),
('catering', 'bar_package', 'Bar Package', ARRAY['bar', 'drinks?', 'beverage', 'alcohol'], ARRAY['bar', 'drinks', 'wine', 'cocktails'], 'select', NULL, ARRAY['catering', 'venue']),

-- Music & Entertainment
('music', 'first_dance', 'First Dance Song', ARRAY['first.?dance', 'special.?dance'], ARRAY['first dance', 'song', 'music'], 'text', NULL, ARRAY['dj', 'band', 'planner']),
('music', 'do_not_play', 'Do Not Play List', ARRAY['do.?not.?play', 'avoid', 'skip.?list'], ARRAY['avoid', 'skip', 'not play'], 'textarea', NULL, ARRAY['dj', 'band']),

-- Timeline & Schedule
('timeline', 'ceremony_time', 'Ceremony Time', ARRAY['ceremony.?time', 'start.?time'], ARRAY['ceremony', 'time', 'start'], 'time', NULL, ARRAY['planner', 'venue', 'photographer']),
('timeline', 'reception_time', 'Reception Time', ARRAY['reception.?time', 'party.?start'], ARRAY['reception', 'party', 'celebration'], 'time', NULL, ARRAY['planner', 'venue']),

-- Venue Specific
('venue', 'ceremony_location', 'Ceremony Location', ARRAY['ceremony.?(?:venue|location)', 'church', 'where.?ceremony'], ARRAY['ceremony', 'church', 'location'], 'text', 'ceremony_venue', ARRAY['venue', 'planner']),
('venue', 'reception_location', 'Reception Location', ARRAY['reception.?(?:venue|location)', 'party.?venue'], ARRAY['reception', 'party', 'venue'], 'text', 'reception_venue', ARRAY['venue', 'planner']);

-- Insert seasonal field importance
INSERT INTO seasonal_field_importance (field_type, month, importance_score, peak_season_multiplier, reason) VALUES
-- Outdoor/weather related fields peak in summer
('outdoor_ceremony', 6, 95, 1.8, 'June peak wedding season, outdoor ceremonies common'),
('outdoor_ceremony', 12, 20, 0.3, 'December low season, indoor preferred'),
('weather_contingency', 5, 85, 1.5, 'May weather uncertainty requires planning'),
('weather_contingency', 8, 80, 1.4, 'August heat concerns'),

-- Timeline fields important year-round but peak in busy seasons
('timeline', 6, 90, 1.6, 'Complex coordination in peak season'),
('timeline', 1, 60, 0.8, 'Simpler timelines in off-season'),

-- Guest count varies by season
('guest_count', 6, 85, 1.5, 'Larger summer weddings'),
('guest_count', 2, 65, 0.9, 'Smaller winter weddings');
```

## API Endpoints

### Field Extraction Management

```typescript
// POST /api/ai/field-extraction/extract
interface ExtractFieldsRequest {
  pdfAnalysisJobId?: string; // If coming from PDF analysis
  text?: string; // Direct text input
  imageUrl?: string; // Image URL for vision API
  context: 'wedding' | 'general';
  supplierType?: string;
  enhancementLevel?: 'basic' | 'standard' | 'advanced';
}

interface ExtractFieldsResponse {
  jobId: string;
  status: 'processing' | 'completed';
  fields: Array<{
    id: string;
    originalLabel: string;
    cleanedLabel: string;
    generatedName: string;
    displayLabel: string;
    
    // Field properties
    fieldType: string;
    fieldSubtype?: string;
    inputFormat: string;
    dataType: string;
    
    // Wedding intelligence
    isWeddingSpecific: boolean;
    weddingCategory?: string;
    weddingFieldType?: string;
    coreFieldMapping?: string;
    weddingRelevanceScore: number;
    
    // Validation
    validationRules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      customValidation?: string;
    };
    
    // Options
    hasOptions: boolean;
    options?: Array<{
      value: string;
      label: string;
    }>;
    
    // Auto-population
    canAutoPopulate: boolean;
    autoPopulateSource?: string;
    autoPopulateField?: string;
    
    // Quality metrics
    extractionConfidence: number;
    typeDetectionConfidence: number;
    validationConfidence: number;
    mappingConfidence: number;
    
    // Context
    patternMatches: string[];
    keywordMatches: string[];
    contextClues: string[];
  }>;
  
  summary: {
    totalFields: number;
    weddingSpecificFields: number;
    coreFieldMappings: number;
    highConfidenceFields: number;
    overallConfidence: number;
  };
  
  suggestions: Array<{
    type: 'improve_label' | 'add_validation' | 'map_to_core' | 'add_options';
    fieldId: string;
    description: string;
    confidence: number;
  }>;
}

// GET /api/ai/field-extraction/status/{jobId}
interface GetExtractionStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'requires_review';
  progress: number; // 0-100
  
  currentStage?: string;
  estimatedCompletion?: string;
  
  // Results summary (when completed)
  totalFieldsExtracted?: number;
  weddingSpecificFields?: number;
  coreFieldMappings?: number;
  overallConfidence?: number;
  
  // Performance metrics
  processingTimeMs?: number;
  aiApiCalls?: number;
  tokensUsed?: number;
  costPounds?: number;
  
  error?: {
    message: string;
    details: any;
    canRetry: boolean;
  };
}

// POST /api/ai/field-extraction/enhance/{jobId}
interface EnhanceFieldsRequest {
  fieldIds?: string[]; // Specific fields to enhance, or all if not specified
  enhancements: {
    improveLabels?: boolean;
    detectValidation?: boolean;
    findOptions?: boolean;
    mapToCoreFields?: boolean;
    addConditionalLogic?: boolean;
    generatePlaceholders?: boolean;
    generateHelpText?: boolean;
  };
  targetConfidence?: number; // Keep enhancing until this confidence is reached
}

interface EnhanceFieldsResponse {
  enhancedFields: number;
  improvements: Array<{
    fieldId: string;
    originalConfidence: number;
    newConfidence: number;
    changes: Array<{
      property: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
  
  totalCost: number;
  processingTime: number;
  overallConfidenceIncrease: number;
}

// GET /api/ai/field-extraction/patterns
interface GetFieldPatternsResponse {
  categories: Array<{
    name: string;
    patterns: Array<{
      fieldType: string;
      fieldName: string;
      labelPatterns: string[];
      keywordTriggers: string[];
      suggestedInputType: string;
      coreFieldId?: string;
      relevantSuppliers: string[];
      usageCount: number;
      successRate: number;
    }>;
  }>;
  
  seasonalImportance: Array<{
    fieldType: string;
    currentMonthScore: number;
    peakMonths: number[];
    lowMonths: number[];
  }>;
}

// POST /api/ai/field-extraction/validate
interface ValidateFieldsRequest {
  fields: Array<{
    id: string;
    label: string;
    type: string;
    validation?: any;
  }>;
  strictMode?: boolean; // Enforce wedding industry best practices
}

interface ValidateFieldsResponse {
  valid: boolean;
  issues: Array<{
    fieldId: string;
    severity: 'error' | 'warning' | 'info';
    issue: string;
    suggestion: string;
  }>;
  
  recommendations: Array<{
    type: string;
    description: string;
    affectedFields: string[];
  }>;
}
```

### Wedding Intelligence APIs

```typescript
// GET /api/ai/field-extraction/wedding-intelligence/{supplierType}
interface GetWeddingIntelligenceResponse {
  supplierType: string;
  
  recommendedFields: Array<{
    category: string;
    fields: Array<{
      fieldType: string;
      fieldName: string;
      importance: number; // 0-100
      reason: string;
      suggestedPosition: number; // Order in form
    }>;
  }>;
  
  coreFieldMappings: Array<{
    coreFieldId: string;
    coreFieldName: string;
    typicalLabels: string[];
    autoPopulateCapable: boolean;
  }>;
  
  seasonalConsiderations: Array<{
    fieldType: string;
    currentImportance: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    peakMonths: number[];
  }>;
}

// POST /api/ai/field-extraction/apply-wedding-context
interface ApplyWeddingContextRequest {
  jobId: string;
  supplierType: string;
  weddingDate?: string; // To apply seasonal context
  venueType?: 'indoor' | 'outdoor' | 'both';
}

interface ApplyWeddingContextResponse {
  fieldsUpdated: number;
  newMappings: number;
  
  contextualChanges: Array<{
    fieldId: string;
    change: string;
    reason: string;
  }>;
  
  seasonalAdjustments: Array<{
    fieldId: string;
    importanceChange: number;
    reason: string;
  }>;
}
```

## Frontend Components

### Field Extraction Interface

```typescript
// src/components/ai/FieldExtractionInterface.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Calendar,
  Users,
  Camera,
  Music,
  MapPin
} from 'lucide-react';

interface FieldExtractionInterfaceProps {
  pdfJobId?: string;
  supplierType: string;
  onExtractionComplete: (fields: any[]) => void;
}

export default function FieldExtractionInterface({ 
  pdfJobId, 
  supplierType,
  onExtractionComplete 
}: FieldExtractionInterfaceProps) {
  const [extractionJob, setExtractionJob] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => {
    if (pdfJobId) {
      startExtraction();
    }
  }, [pdfJobId]);

  const startExtraction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/field-extraction/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfAnalysisJobId: pdfJobId,
          context: 'wedding',
          supplierType,
          enhancementLevel: 'advanced'
        })
      });

      const result = await response.json();
      setExtractionJob(result);
      
      if (result.status === 'completed') {
        setFields(result.fields);
        onExtractionComplete(result.fields);
      } else {
        pollExtractionStatus(result.jobId);
      }
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollExtractionStatus = async (jobId: string) => {
    const poll = async () => {
      const response = await fetch(`/api/ai/field-extraction/status/${jobId}`);
      const status = await response.json();

      if (status.status === 'completed') {
        const resultsResponse = await fetch(`/api/ai/field-extraction/results/${jobId}`);
        const results = await resultsResponse.json();
        setFields(results.fields);
        onExtractionComplete(results.fields);
      } else if (status.status !== 'failed') {
        setTimeout(poll, 2000);
      }
    };
    poll();
  };

  const enhanceFields = async () => {
    setEnhancing(true);
    try {
      const response = await fetch(`/api/ai/field-extraction/enhance/${extractionJob.jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancements: {
            improveLabels: true,
            detectValidation: true,
            findOptions: true,
            mapToCoreFields: true,
            generatePlaceholders: true,
            generateHelpText: true
          },
          targetConfidence: 0.85
        })
      });

      const result = await response.json();
      
      // Refresh fields
      await startExtraction();
    } finally {
      setEnhancing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'core_info': Users,
      'photography': Camera,
      'catering': FileText,
      'music': Music,
      'timeline': Calendar,
      'venue': MapPin
    };
    return icons[category] || FileText;
  };

  const getFieldTypeColor = (type: string) => {
    const colors = {
      'text': 'default',
      'email': 'secondary',
      'phone': 'secondary',
      'date': 'outline',
      'select': 'default',
      'checkbox': 'secondary',
      'textarea': 'outline',
      'number': 'default'
    };
    return colors[type] || 'default';
  };

  const weddingFields = fields.filter(f => f.isWeddingSpecific);
  const highConfidenceFields = fields.filter(f => f.extractionConfidence > 0.8);
  const autoPopulateFields = fields.filter(f => f.canAutoPopulate);

  return (
    <div className="space-y-6">
      {/* Extraction Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Field Extraction Intelligence
            </span>
            {extractionJob && (
              <Badge variant="default">
                {(extractionJob.summary.overallConfidence * 100).toFixed(1)}% Confidence
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Progress value={66} />
              <p className="text-sm text-gray-600">Extracting fields with wedding intelligence...</p>
            </div>
          ) : extractionJob ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{extractionJob.summary.totalFields}</div>
                <div className="text-xs text-gray-600">Total Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {extractionJob.summary.weddingSpecificFields}
                </div>
                <div className="text-xs text-gray-600">Wedding Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {extractionJob.summary.coreFieldMappings}
                </div>
                <div className="text-xs text-gray-600">Core Mappings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {extractionJob.summary.highConfidenceFields}
                </div>
                <div className="text-xs text-gray-600">High Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {autoPopulateFields.length}
                </div>
                <div className="text-xs text-gray-600">Auto-Populate</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button onClick={startExtraction}>Start Field Extraction</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Categories */}
      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Fields by Category</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={enhanceFields}
                disabled={enhancing}
              >
                {enhancing ? 'Enhancing...' : 'Enhance with AI'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="all">All ({fields.length})</TabsTrigger>
                <TabsTrigger value="wedding">
                  Wedding ({weddingFields.length})
                </TabsTrigger>
                <TabsTrigger value="core_info">Core Info</TabsTrigger>
                <TabsTrigger value="photography">Photography</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="auto">Auto-Fill</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {fields.map((field) => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </TabsContent>

              <TabsContent value="wedding" className="space-y-4 mt-4">
                {weddingFields.map((field) => (
                  <FieldCard key={field.id} field={field} showWeddingBadge />
                ))}
              </TabsContent>

              <TabsContent value="auto" className="space-y-4 mt-4">
                {autoPopulateFields.map((field) => (
                  <FieldCard key={field.id} field={field} showAutoPopulate />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {extractionJob?.suggestions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Improvement Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractionJob.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{suggestion.description}</p>
                    <p className="text-sm text-gray-600">
                      Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Apply</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Field Card Component
function FieldCard({ field, showWeddingBadge = false, showAutoPopulate = false }) {
  const Icon = field.weddingCategory ? getCategoryIcon(field.weddingCategory) : FileText;
  
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-gray-400 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{field.displayLabel}</h4>
              {showWeddingBadge && field.isWeddingSpecific && (
                <Badge variant="outline" className="bg-purple-50">
                  Wedding Field
                </Badge>
              )}
              {showAutoPopulate && field.canAutoPopulate && (
                <Badge variant="outline" className="bg-green-50">
                  Auto-Populate
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              Field name: <code className="bg-gray-100 px-1 rounded">{field.generatedName}</code>
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getFieldTypeColor(field.fieldType)}>
                {field.fieldType}
                {field.fieldSubtype && `.${field.fieldSubtype}`}
              </Badge>
              
              {field.validationRules?.required && (
                <Badge variant="destructive">Required</Badge>
              )}
              
              {field.coreFieldMapping && (
                <Badge variant="outline" className="text-xs">
                  Maps to: {field.coreFieldMapping}
                </Badge>
              )}

              <Badge 
                variant={
                  field.extractionConfidence > 0.8 ? 'default' : 
                  field.extractionConfidence > 0.6 ? 'secondary' : 
                  'destructive'
                }
              >
                {(field.extractionConfidence * 100).toFixed(0)}%
              </Badge>
            </div>

            {field.hasOptions && field.options && (
              <div className="mt-3">
                <p className="text-sm font-medium">Options:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {field.options.slice(0, 5).map((option, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {option.label}
                    </Badge>
                  ))}
                  {field.options.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{field.options.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {field.autoPopulateSource && (
              <div className="mt-2 text-sm text-green-600">
                ✓ Auto-populates from {field.autoPopulateSource}
              </div>
            )}

            {field.contextClues?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  Context: {field.contextClues.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">
            Relevance: {field.weddingRelevanceScore}%
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Integration Points

### MCP Server Integration

```typescript
// src/lib/ai/mcp-field-extraction-integration.ts
import { MCPServer } from '@/lib/mcp/server';

export class FieldExtractionMCPIntegration {
  constructor(private mcpServer: MCPServer) {}

  // Use Context7 for latest OpenAI function calling patterns
  async getLatestExtractionPatterns() {
    const openaiDocs = await this.mcpServer.context7.getLibraryDocs({
      context7CompatibleLibraryID: '/openai/openai-node',
      topic: 'function_calling'
    });

    return this.applyBestPractices(openaiDocs);
  }

  // Store extraction results in PostgreSQL
  async storeExtractionResults(jobId: string, fields: any[]) {
    const client = await this.mcpServer.postgres.getClient();
    
    try {
      await client.query('BEGIN');

      // Store job summary
      await client.query(`
        UPDATE field_extraction_jobs 
        SET 
          total_fields_extracted = $1,
          wedding_specific_fields = $2,
          core_field_mappings = $3,
          high_confidence_fields = $4,
          overall_confidence = $5,
          status = 'completed',
          completed_at = NOW()
        WHERE id = $6
      `, [
        fields.length,
        fields.filter(f => f.isWeddingSpecific).length,
        fields.filter(f => f.coreFieldMapping).length,
        fields.filter(f => f.extractionConfidence > 0.8).length,
        this.calculateOverallConfidence(fields),
        jobId
      ]);

      // Store individual field details
      for (const field of fields) {
        await client.query(`
          INSERT INTO extracted_field_details (
            extraction_job_id, field_id, original_label, cleaned_label,
            generated_name, display_label, field_type, field_subtype,
            is_wedding_specific, wedding_category, core_field_mapping,
            extraction_confidence, validation_rules, can_auto_populate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          jobId, field.id, field.originalLabel, field.cleanedLabel,
          field.generatedName, field.displayLabel, field.fieldType, field.fieldSubtype,
          field.isWeddingSpecific, field.weddingCategory, field.coreFieldMapping,
          field.extractionConfidence, JSON.stringify(field.validationRules),
          field.canAutoPopulate
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Use Supabase MCP for real-time updates
  async publishExtractionProgress(jobId: string, progress: number, stage: string) {
    await this.mcpServer.supabase.broadcast({
      channel: `extraction_${jobId}`,
      event: 'progress',
      payload: { progress, stage, timestamp: new Date() }
    });
  }
}
```

### Wedding Context Enhancement

```typescript
// src/lib/ai/wedding-field-enhancer.ts
export class WeddingFieldEnhancer {
  // Apply wedding-specific intelligence to fields
  async enhanceWithWeddingContext(fields: any[], supplierType: string) {
    const enhanced = [];

    for (const field of fields) {
      const weddingContext = await this.detectWeddingContext(field, supplierType);
      
      enhanced.push({
        ...field,
        ...weddingContext,
        weddingRelevanceScore: this.calculateWeddingRelevance(field, weddingContext),
        seasonalImportance: this.getSeasonalImportance(field, new Date()),
        supplierSpecificImportance: this.getSupplierImportance(field, supplierType)
      });
    }

    return enhanced;
  }

  // Detect wedding-specific context
  private async detectWeddingContext(field: any, supplierType: string) {
    const patterns = {
      photographer: {
        'shot_list': ['must have', 'photo list', 'specific shots'],
        'style': ['candid', 'traditional', 'documentary', 'artistic'],
        'timeline': ['getting ready', 'first look', 'ceremony', 'reception']
      },
      planner: {
        'vendor_list': ['photographer', 'florist', 'caterer', 'dj'],
        'timeline': ['processional', 'recessional', 'cocktail hour'],
        'budget': ['total budget', 'vendor budgets', 'contingency']
      },
      venue: {
        'capacity': ['guest count', 'seated', 'standing', 'maximum'],
        'catering': ['in-house', 'preferred vendors', 'outside catering'],
        'amenities': ['parking', 'bridal suite', 'dance floor']
      }
    };

    const supplierPatterns = patterns[supplierType] || {};
    
    for (const [category, keywords] of Object.entries(supplierPatterns)) {
      if (keywords.some(kw => field.label.toLowerCase().includes(kw))) {
        return {
          weddingCategory: category,
          isWeddingSpecific: true,
          supplierRelevance: 'high'
        };
      }
    }

    return {
      weddingCategory: null,
      isWeddingSpecific: false,
      supplierRelevance: 'low'
    };
  }

  // Calculate wedding relevance score
  private calculateWeddingRelevance(field: any, context: any): number {
    let score = 0;

    // Base score from wedding specificity
    if (context.isWeddingSpecific) score += 40;
    
    // Core field mapping bonus
    if (field.coreFieldMapping) score += 30;
    
    // Supplier relevance
    if (context.supplierRelevance === 'high') score += 20;
    
    // Common wedding keywords
    const weddingKeywords = ['wedding', 'ceremony', 'reception', 'bride', 'groom', 'venue'];
    const keywordMatches = weddingKeywords.filter(kw => 
      field.label.toLowerCase().includes(kw)
    ).length;
    score += keywordMatches * 5;

    return Math.min(100, score);
  }

  // Get seasonal importance
  private getSeasonalImportance(field: any, date: Date): number {
    const month = date.getMonth() + 1;
    const seasonalFields = {
      'outdoor': { peak: [5, 6, 7, 8, 9], low: [12, 1, 2] },
      'weather': { peak: [4, 5, 6, 9, 10], low: [7, 8] },
      'heating': { peak: [11, 12, 1, 2], low: [6, 7, 8] }
    };

    for (const [keyword, seasons] of Object.entries(seasonalFields)) {
      if (field.label.toLowerCase().includes(keyword)) {
        if (seasons.peak.includes(month)) return 90;
        if (seasons.low.includes(month)) return 30;
        return 60;
      }
    }

    return 70; // Default medium importance
  }

  // Get supplier-specific importance
  private getSupplierImportance(field: any, supplierType: string): number {
    const importanceMap = {
      photographer: {
        'shot_list': 95,
        'timeline': 90,
        'style': 85,
        'family_photos': 80
      },
      planner: {
        'timeline': 95,
        'vendor_list': 90,
        'budget': 85,
        'guest_count': 80
      },
      venue: {
        'guest_count': 95,
        'catering': 90,
        'date': 95,
        'amenities': 75
      }
    };

    const supplierMap = importanceMap[supplierType] || {};
    
    for (const [fieldType, importance] of Object.entries(supplierMap)) {
      if (field.label.toLowerCase().includes(fieldType.replace('_', ' '))) {
        return importance;
      }
    }

    return 50; // Default medium importance
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// src/__tests__/unit/field-extraction.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { FieldExtractor } from '@/lib/ai/field-extractor';
import { WeddingFieldDetector } from '@/lib/ai/wedding-field-detector';

describe('Field Extraction System', () => {
  let extractor: FieldExtractor;
  let detector: WeddingFieldDetector;

  beforeEach(() => {
    extractor = new FieldExtractor();
    detector = new WeddingFieldDetector();
  });

  test('extracts basic form fields correctly', async () => {
    const text = `
      Name: _____________
      Email: _____________
      Phone Number: _____________
      Wedding Date: _____________
    `;

    const fields = await extractor.extractFields(text);

    expect(fields).toHaveLength(4);
    expect(fields.find(f => f.fieldType === 'text')).toBeDefined();
    expect(fields.find(f => f.fieldType === 'email')).toBeDefined();
    expect(fields.find(f => f.fieldType === 'phone')).toBeDefined();
    expect(fields.find(f => f.fieldType === 'date')).toBeDefined();
  });

  test('detects wedding-specific fields', () => {
    const testFields = [
      { label: 'Bride Name', expected: { isWeddingSpecific: true, category: 'core_info' } },
      { label: 'Shot List', expected: { isWeddingSpecific: true, category: 'photography' } },
      { label: 'Dietary Requirements', expected: { isWeddingSpecific: true, category: 'catering' } },
      { label: 'Random Field', expected: { isWeddingSpecific: false, category: null } }
    ];

    testFields.forEach(({ label, expected }) => {
      const result = detector.detectWeddingCategory(label);
      if (expected.isWeddingSpecific) {
        expect(result).not.toBeNull();
        expect(result.category).toBe(expected.category);
      } else {
        expect(result).toBeNull();
      }
    });
  });

  test('calculates confidence scores correctly', () => {
    const fields = [
      { label: 'Email Address', type: 'email', validation: { required: true } },
      { label: 'X', type: 'text', validation: null },
      { label: 'Wedding Date', type: 'date', isWeddingSpecific: true }
    ];

    fields.forEach(field => {
      const confidence = extractor.calculateFieldConfidence(field);
      
      if (field.label.length < 3) {
        expect(confidence).toBeLessThan(0.5);
      } else if (field.isWeddingSpecific) {
        expect(confidence).toBeGreaterThan(0.7);
      } else if (field.type !== 'text') {
        expect(confidence).toBeGreaterThan(0.6);
      }
    });
  });

  test('generates appropriate validation rules', () => {
    const emailField = { label: 'Email', type: 'email' };
    const phoneField = { label: 'Phone', type: 'phone' };
    const dateField = { label: 'Wedding Date', type: 'date' };

    const emailValidation = extractor.generateValidation(emailField);
    expect(emailValidation.pattern).toContain('@');

    const phoneValidation = extractor.generateValidation(phoneField);
    expect(phoneValidation.pattern).toBeDefined();

    const dateValidation = extractor.generateValidation(dateField);
    expect(dateValidation.future).toBe(true);
  });

  test('maps fields to core wedding fields', () => {
    const fields = [
      { label: 'Bride\'s Name', expectedMapping: 'bride_name' },
      { label: 'Number of Guests', expectedMapping: 'guest_count' },
      { label: 'Ceremony Venue', expectedMapping: 'ceremony_venue' },
      { label: 'Custom Field', expectedMapping: null }
    ];

    fields.forEach(({ label, expectedMapping }) => {
      const mapping = extractor.mapToCoreField(label);
      expect(mapping).toBe(expectedMapping);
    });
  });

  test('handles seasonal field importance', () => {
    const outdoorField = { label: 'Outdoor Ceremony Setup' };
    
    const juneImportance = detector.getSeasonalImportance(outdoorField, new Date('2025-06-15'));
    const decemberImportance = detector.getSeasonalImportance(outdoorField, new Date('2025-12-15'));

    expect(juneImportance).toBeGreaterThan(decemberImportance);
  });

  test('applies supplier-specific context', () => {
    const shotListField = { label: 'Photography Shot List' };
    
    const photographerImportance = detector.getSupplierImportance(shotListField, 'photographer');
    const venueImportance = detector.getSupplierImportance(shotListField, 'venue');

    expect(photographerImportance).toBeGreaterThan(venueImportance);
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/field-extraction-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestSupabaseClient } from '@/test-utils/supabase';

describe('Field Extraction Integration', () => {
  let supabase: any;
  let testSupplierId: string;
  let testPdfJobId: string;

  beforeAll(async () => {
    supabase = createTestSupabaseClient();
    testSupplierId = await createTestSupplier('photographer', 'professional');
    testPdfJobId = await createTestPdfAnalysisJob(testSupplierId);
  });

  afterAll(async () => {
    await cleanupTestData(testSupplierId);
  });

  test('complete field extraction workflow', async () => {
    // 1. Start extraction
    const extractResponse = await fetch('/api/ai/field-extraction/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfAnalysisJobId: testPdfJobId,
        context: 'wedding',
        supplierType: 'photographer',
        enhancementLevel: 'advanced'
      })
    });

    const extractResult = await extractResponse.json();
    expect(extractResult.jobId).toBeDefined();
    expect(extractResult.status).toMatch(/processing|completed/);

    // 2. Wait for completion
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`/api/ai/field-extraction/status/${extractResult.jobId}`);
      const status = await statusResponse.json();
      
      if (status.status === 'completed') {
        completed = true;
        expect(status.totalFieldsExtracted).toBeGreaterThan(0);
        expect(status.overallConfidence).toBeGreaterThan(0.5);
      }
      attempts++;
    }

    expect(completed).toBe(true);

    // 3. Enhance fields
    const enhanceResponse = await fetch(`/api/ai/field-extraction/enhance/${extractResult.jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enhancements: {
          improveLabels: true,
          detectValidation: true,
          mapToCoreFields: true
        },
        targetConfidence: 0.8
      })
    });

    const enhanceResult = await enhanceResponse.json();
    expect(enhanceResult.enhancedFields).toBeGreaterThan(0);
    expect(enhanceResult.overallConfidenceIncrease).toBeGreaterThan(0);

    // 4. Apply wedding context
    const contextResponse = await fetch('/api/ai/field-extraction/apply-wedding-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: extractResult.jobId,
        supplierType: 'photographer',
        weddingDate: '2025-06-15'
      })
    });

    const contextResult = await contextResponse.json();
    expect(contextResult.fieldsUpdated).toBeGreaterThan(0);
    expect(contextResult.seasonalAdjustments).toBeDefined();

    // 5. Validate fields
    const validateResponse = await fetch('/api/ai/field-extraction/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: extractResult.fields,
        strictMode: true
      })
    });

    const validateResult = await validateResponse.json();
    expect(validateResult.valid).toBeDefined();
    expect(validateResult.issues).toBeDefined();
  });

  test('wedding intelligence application', async () => {
    const intelligenceResponse = await fetch('/api/ai/field-extraction/wedding-intelligence/photographer');
    const intelligence = await intelligenceResponse.json();

    expect(intelligence.recommendedFields).toBeDefined();
    expect(intelligence.recommendedFields.length).toBeGreaterThan(0);
    
    const photographyFields = intelligence.recommendedFields.find(
      cat => cat.category === 'photography'
    );
    expect(photographyFields).toBeDefined();
    expect(photographyFields.fields.some(f => f.fieldType === 'shot_list')).toBe(true);

    expect(intelligence.coreFieldMappings).toBeDefined();
    expect(intelligence.seasonalConsiderations).toBeDefined();
  });

  async function createTestPdfAnalysisJob(supplierId: string): Promise<string> {
    const result = await supabase
      .from('pdf_analysis_jobs')
      .insert({
        supplier_id: supplierId,
        original_filename: 'test-form.pdf',
        file_url: 'https://test.com/test-form.pdf',
        analysis_status: 'completed',
        fields_detected_count: 20
      })
      .select()
      .single();

    // Create some test extracted fields
    for (let i = 0; i < 5; i++) {
      await supabase
        .from('extracted_form_fields')
        .insert({
          job_id: result.data.id,
          page_number: 1,
          field_label: `Test Field ${i}`,
          field_name: `test_field_${i}`,
          field_type: ['text', 'email', 'date', 'select', 'checkbox'][i],
          extraction_confidence: 0.75 + (i * 0.05),
          position_data: JSON.stringify({ x: 100, y: 100 + (i * 50), width: 200, height: 30 })
        });
    }

    return result.data.id;
  }
});
```

### E2E Tests

```typescript
// tests/e2e/field-extraction-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Field Extraction Complete Workflow', () => {
  test('extracts and enhances fields with wedding intelligence', async ({ page }) => {
    // Login and navigate
    await loginAsSupplier(page, 'photographer');
    await page.goto('/dashboard/ai/field-extraction');

    // Start with PDF analysis result
    await page.click('[data-testid="select-pdf-result"]');
    await page.selectOption('[data-testid="pdf-selector"]', 'consultation-form.pdf');

    // Start extraction
    await page.click('[data-testid="start-extraction"]');
    
    // Wait for extraction to complete
    await expect(page.locator('[data-testid="extraction-progress"]')).toBeVisible();
    await page.waitForSelector('[data-testid="extraction-complete"]', { timeout: 30000 });

    // Verify summary stats
    await expect(page.locator('[data-testid="total-fields"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="wedding-fields"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="core-mappings"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText(/%/);

    // Check tabs functionality
    await page.click('[data-testid="tab-wedding"]');
    const weddingFields = await page.locator('[data-testid="field-card"]').count();
    expect(weddingFields).toBeGreaterThan(0);

    // Verify wedding field badges
    await expect(page.locator('[data-testid="wedding-badge"]').first()).toBeVisible();

    // Check auto-populate fields
    await page.click('[data-testid="tab-auto"]');
    const autoFields = await page.locator('[data-testid="auto-populate-badge"]').count();
    expect(autoFields).toBeGreaterThan(0);

    // Enhance fields with AI
    await page.click('[data-testid="enhance-fields"]');
    await expect(page.locator('[data-testid="enhancing-indicator"]')).toBeVisible();
    await page.waitForSelector('[data-testid="enhancement-complete"]', { timeout: 20000 });

    // Verify improvements
    const newConfidence = await page.locator('[data-testid="confidence-score"]').textContent();
    expect(parseInt(newConfidence || '0')).toBeGreaterThan(70);

    // Check AI suggestions
    const suggestionsExist = await page.locator('[data-testid="ai-suggestion"]').count() > 0;
    if (suggestionsExist) {
      await page.click('[data-testid="apply-suggestion"]');
      await expect(page.locator('[data-testid="suggestion-applied"]')).toBeVisible();
    }

    // Test field validation
    await page.click('[data-testid="validate-fields"]');
    await page.waitForSelector('[data-testid="validation-results"]');
    
    const validationIssues = await page.locator('[data-testid="validation-issue"]').count();
    if (validationIssues > 0) {
      await page.click('[data-testid="fix-issues"]');
      await expect(page.locator('[data-testid="issues-fixed"]')).toBeVisible();
    }

    // Export to form builder
    await page.click('[data-testid="export-to-form-builder"]');
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    
    // Verify form builder integration
    await page.click('[data-testid="open-in-form-builder"]');
    await expect(page).toHaveURL(/\/dashboard\/form-builder/);
    
    // Verify fields imported correctly
    const formFields = await page.locator('[data-testid="form-field"]').count();
    expect(formFields).toBeGreaterThan(0);
  });
});
```

## Acceptance Criteria

### Extraction Accuracy Requirements
- **Field Detection**: Extract 90%+ of form fields from analyzed PDFs
- **Type Classification**: Correctly identify field types with 85%+ accuracy
- **Wedding Recognition**: Identify wedding-specific fields with 88%+ accuracy
- **Core Mapping**: Map common wedding fields with 90%+ success rate

### Performance Requirements
- **Processing Speed**: Extract fields from 50-field form in <10 seconds
- **Enhancement Speed**: Enhance all fields in <15 seconds
- **API Response**: Status checks complete in <100ms
- **Concurrent Jobs**: Handle 10+ simultaneous extraction jobs

### Wedding Intelligence Requirements
- **Supplier Context**: Apply supplier-specific field importance correctly
- **Seasonal Awareness**: Adjust field importance based on wedding season
- **Auto-Population**: Identify 80%+ of fields that can auto-populate
- **Validation Rules**: Generate appropriate validation for 75%+ of fields

### Quality Assurance Requirements
- **Confidence Scoring**: Provide accurate confidence scores per field
- **Enhancement Impact**: Improve confidence by 15%+ through enhancement
- **Error Recovery**: Gracefully fallback when AI extraction fails
- **Manual Override**: Allow manual field type and validation adjustment

### Technical Requirements
- **Integration**: Seamless connection with PDF analysis system
- **Database Performance**: Store/retrieve extraction results in <100ms
- **MCP Integration**: Utilize Context7, PostgreSQL, and Supabase MCPs
- **Cost Efficiency**: Extract typical form for <£1.50 in AI costs

## Effort Estimation

### Team D (AI/ML) - 76 hours
- Field extraction algorithms (28h)
- Wedding intelligence system (20h)
- Confidence scoring and validation (16h)
- Enhancement algorithms (12h)

### Team B (Backend) - 48 hours
- Database schema and API endpoints (24h)
- Processing pipeline (16h)
- Integration with PDF analysis (8h)

### Team A (Frontend) - 36 hours
- Field extraction interface (20h)
- Enhancement and validation UI (12h)
- Export to form builder (4h)

### Team C (Integration) - 22 hours
- MCP server integration (14h)
- Wedding context application (8h)

### Team E (Platform) - 14 hours
- Job processing queue (10h)
- Performance monitoring (4h)

### Team F (General) - 30 hours
- Testing implementation (22h)
- Documentation (8h)

**Total Effort: 226 hours**

## Dependencies
- PDF Analysis System (WS-242) must be complete
- OpenAI API for field extraction
- Wedding field pattern database
- Core field mapping definitions
- MCP server integrations

## Risks & Mitigations
- **Risk**: AI misclassifies complex field types
- **Mitigation**: Pattern-based validation and manual review options
- **Risk**: Poor extraction from low-quality PDFs
- **Mitigation**: Multiple extraction methods with fallback strategies
- **Risk**: High API costs for large forms
- **Mitigation**: Batch processing and caching of common patterns