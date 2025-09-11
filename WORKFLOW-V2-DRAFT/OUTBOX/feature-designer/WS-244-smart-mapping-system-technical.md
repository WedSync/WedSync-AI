# WS-244: Smart Mapping System - Technical Specification

## Feature Identifier
- **Feature ID**: WS-244
- **Feature Name**: Smart Mapping System (Form Generation)
- **Category**: AI Integration - Form Intelligence
- **Priority**: High (Revenue Analytics batch)

## User Story
As a **wedding supplier**, I want the system to **automatically map extracted form fields to standardized wedding data structures**, so that **I can quickly generate compatible forms without manual field mapping**.

## Database Schema

### Core Tables

```sql
-- Store field mapping configurations
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_type VARCHAR(50) NOT NULL,
  source_field_label TEXT NOT NULL,
  source_field_type VARCHAR(50) NOT NULL,
  core_field_name VARCHAR(100),
  custom_field_name VARCHAR(100),
  mapping_category VARCHAR(50), -- 'core', 'photography', 'catering', 'music', 'custom'
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  semantic_similarity DECIMAL(3,2),
  pattern_match_score DECIMAL(3,2),
  context_score DECIMAL(3,2),
  manual_override BOOLEAN DEFAULT FALSE,
  auto_populate BOOLEAN DEFAULT FALSE,
  validation_rules JSONB DEFAULT '{}',
  transformation_rules JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track mapping feedback and learning
CREATE TABLE mapping_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID REFERENCES field_mappings(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  feedback_type VARCHAR(20) NOT NULL, -- 'correct', 'incorrect', 'partial', 'improved'
  user_correction TEXT,
  corrected_field_name VARCHAR(100),
  confidence_adjustment DECIMAL(3,2),
  feedback_context JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store mapping conflicts and resolutions
CREATE TABLE mapping_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  conflict_type VARCHAR(50) NOT NULL, -- 'duplicate_mapping', 'type_mismatch', 'missing_required'
  core_field VARCHAR(100) NOT NULL,
  conflicting_fields JSONB NOT NULL, -- Array of field labels
  severity VARCHAR(10) NOT NULL, -- 'high', 'medium', 'low'
  resolution_type VARCHAR(50), -- 'auto_resolved', 'manual_resolved', 'pending'
  resolution_details JSONB DEFAULT '{}',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store supplier-specific mapping rules
CREATE TABLE supplier_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_type VARCHAR(50) NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'pattern', 'semantic', 'contextual', 'custom'
  source_pattern TEXT,
  target_field VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 100,
  conditions JSONB DEFAULT '{}',
  transformations JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  success_rate DECIMAL(3,2),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core wedding field definitions
CREATE TABLE core_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(100) UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  field_category VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  patterns TEXT[], -- Array of pattern keywords
  examples TEXT[],
  validation_schema JSONB DEFAULT '{}',
  auto_populate_source VARCHAR(100), -- Source field for auto-population
  wedding_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping performance metrics
CREATE TABLE mapping_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  date DATE NOT NULL,
  total_mappings INTEGER DEFAULT 0,
  automatic_mappings INTEGER DEFAULT 0,
  manual_mappings INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  average_confidence DECIMAL(3,2),
  success_rate DECIMAL(3,2),
  user_correction_rate DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, date)
);

-- Indexes for performance
CREATE INDEX idx_field_mappings_supplier ON field_mappings(supplier_id);
CREATE INDEX idx_field_mappings_core_field ON field_mappings(core_field_name);
CREATE INDEX idx_field_mappings_confidence ON field_mappings(confidence_score DESC);
CREATE INDEX idx_mapping_feedback_mapping ON mapping_feedback(mapping_id);
CREATE INDEX idx_mapping_conflicts_supplier ON mapping_conflicts(supplier_id);
CREATE INDEX idx_mapping_conflicts_status ON mapping_conflicts(resolution_type);
CREATE INDEX idx_supplier_rules_active ON supplier_mapping_rules(supplier_id, is_active);
CREATE INDEX idx_core_fields_category ON core_field_definitions(field_category);

-- Full-text search for pattern matching
CREATE INDEX idx_field_mappings_label_fts ON field_mappings USING gin(to_tsvector('english', source_field_label));
CREATE INDEX idx_core_fields_patterns_gin ON core_field_definitions USING gin(patterns);
```

## API Endpoints

### Field Mapping Endpoints

```typescript
// POST /api/ai/mapping/analyze
interface AnalyzeMappingRequest {
  supplierId: string;
  supplierType: 'photographer' | 'planner' | 'venue' | 'catering' | 'music' | 'floral';
  extractedFields: Array<{
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    context?: string;
    position?: { x: number; y: number; width: number; height: number };
  }>;
  formContext?: {
    formTitle?: string;
    formDescription?: string;
    categoryHints?: string[];
  };
}

interface AnalyzeMappingResponse {
  mappings: Array<{
    sourceField: ExtractedField;
    coreField: {
      name: string;
      category: string;
      confidence: number;
      reasoning: string;
    } | null;
    customField: {
      name: string;
      suggested: boolean;
    } | null;
    requiresReview: boolean;
    autoPopulate: boolean;
    validationRules: any[];
  }>;
  conflicts: Array<{
    type: string;
    coreField: string;
    conflictingFields: string[];
    severity: 'high' | 'medium' | 'low';
    suggestedResolution: any;
  }>;
  unmappedFields: ExtractedField[];
  overallConfidence: number;
  suggestions: Array<{
    type: string;
    message: string;
    field?: string;
  }>;
}

// POST /api/ai/mapping/confirm
interface ConfirmMappingRequest {
  supplierId: string;
  mappings: Array<{
    sourceLabel: string;
    coreField?: string;
    customField?: string;
    manualOverride?: boolean;
  }>;
  resolvedConflicts?: Array<{
    conflictId: string;
    resolution: any;
  }>;
}

// GET /api/ai/mapping/supplier/:supplierId/rules
interface GetSupplierRulesResponse {
  rules: Array<{
    id: string;
    ruleName: string;
    ruleType: string;
    sourcePattern: string;
    targetField: string;
    priority: number;
    successRate: number;
    usageCount: number;
  }>;
  performance: {
    averageConfidence: number;
    successRate: number;
    correctionRate: number;
  };
}

// POST /api/ai/mapping/feedback
interface ProvideFeedbackRequest {
  mappingId: string;
  feedbackType: 'correct' | 'incorrect' | 'partial' | 'improved';
  correction?: {
    correctField: string;
    reason?: string;
  };
}

// GET /api/ai/mapping/core-fields
interface GetCoreFieldsResponse {
  categories: {
    core: CoreField[];
    photography: CoreField[];
    catering: CoreField[];
    music: CoreField[];
    venue: CoreField[];
    floral: CoreField[];
  };
  totalFields: number;
}
```

## Frontend Components

### React Component Structure

```typescript
// components/ai/mapping/SmartMappingInterface.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useSmartMapping } from '@/hooks/useSmartMapping';

interface SmartMappingInterfaceProps {
  supplierId: string;
  supplierType: string;
  extractedFields: ExtractedField[];
  onMappingComplete: (mappings: FieldMapping[]) => void;
}

export const SmartMappingInterface: React.FC<SmartMappingInterfaceProps> = ({
  supplierId,
  supplierType,
  extractedFields,
  onMappingComplete
}) => {
  const {
    mappings,
    conflicts,
    suggestions,
    isAnalyzing,
    analyzeFields,
    updateMapping,
    resolveConflict,
    confirmMappings
  } = useSmartMapping(supplierId);

  const [reviewedMappings, setReviewedMappings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (extractedFields.length > 0) {
      analyzeFields(extractedFields, supplierType);
    }
  }, [extractedFields]);

  const handleMappingReview = (fieldId: string, approved: boolean) => {
    setReviewedMappings(prev => new Set(prev).add(fieldId));
    if (!approved) {
      // Open manual mapping dialog
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Mapping Progress */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Smart Field Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Automatically mapping {extractedFields.length} fields to wedding data structure
          </p>
        </CardHeader>
        <CardContent>
          <Progress 
            value={(reviewedMappings.size / mappings.length) * 100} 
            className="mb-4"
          />
          <div className="flex justify-between text-sm">
            <span>{reviewedMappings.size} reviewed</span>
            <span>{mappings.length - reviewedMappings.size} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            <strong>{conflicts.length} mapping conflicts detected.</strong>
            Review and resolve conflicts below to ensure accurate data mapping.
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Review Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mappings.map((mapping) => (
          <Card 
            key={mapping.sourceField.label}
            className={mapping.requiresReview ? 'border-yellow-500' : ''}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{mapping.sourceField.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {mapping.sourceField.type}
                    </p>
                  </div>
                  <Badge variant={getConfidenceBadgeColor(mapping.confidence)}>
                    {Math.round(mapping.confidence * 100)}% confident
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Maps to:</span>
                  {mapping.coreField ? (
                    <Badge variant="outline">
                      {mapping.coreField.displayName}
                    </Badge>
                  ) : (
                    <Select
                      placeholder="Select core field..."
                      onValueChange={(value) => updateMapping(mapping.id, value)}
                    >
                      {/* Core field options */}
                    </Select>
                  )}
                </div>

                {mapping.autoPopulate && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-populates from wedding data
                  </Badge>
                )}

                {mapping.requiresReview && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMappingReview(mapping.id, true)}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMappingReview(mapping.id, false)}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="font-medium">AI Suggestions</h4>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500">•</span>
                  <span>{suggestion.message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          Save as Draft
        </Button>
        <Button 
          onClick={() => confirmMappings(mappings)}
          disabled={conflicts.some(c => c.severity === 'high')}
        >
          Confirm Mappings ({mappings.filter(m => !m.requiresReview).length}/{mappings.length})
        </Button>
      </div>
    </div>
  );
};

// components/ai/mapping/ConflictResolver.tsx
export const ConflictResolver: React.FC<{
  conflicts: MappingConflict[];
  onResolve: (conflictId: string, resolution: any) => void;
}> = ({ conflicts, onResolve }) => {
  return (
    <div className="space-y-4">
      {conflicts.map((conflict) => (
        <Card key={conflict.id} className="border-red-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-red-700">
                {conflict.type.replace('_', ' ').toUpperCase()}
              </h4>
              <Badge variant="destructive">
                {conflict.severity}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-3">
              Multiple fields mapping to: <strong>{conflict.coreField}</strong>
            </p>
            <div className="space-y-2">
              {conflict.conflictingFields.map((field) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`conflict-${conflict.id}`}
                    onChange={() => onResolve(conflict.id, { selectedField: field })}
                  />
                  <span className="text-sm">{field}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

## Integration Points

### AI Service Integration

```typescript
// lib/ai/smart-mapper.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class SmartMapper {
  private openai: OpenAI;
  private supabase: any;
  private coreFieldCache: Map<string, CoreFieldDefinition>;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.coreFieldCache = new Map();
  }

  async mapFields(
    extractedFields: ExtractedField[],
    supplierType: SupplierType,
    supplierId: string
  ): Promise<MappingResult> {
    // Load supplier-specific rules
    const supplierRules = await this.loadSupplierRules(supplierId);
    
    // Load core field definitions
    const coreFields = await this.loadCoreFields();
    
    // Generate mappings using AI
    const mappings = await this.generateMappings(
      extractedFields,
      coreFields,
      supplierRules,
      supplierType
    );
    
    // Detect conflicts
    const conflicts = this.detectConflicts(mappings);
    
    // Generate suggestions
    const suggestions = await this.generateSuggestions(
      extractedFields,
      mappings,
      supplierType
    );
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(mappings);
    
    // Store mapping results
    await this.storeMappingResults(supplierId, mappings, conflicts);
    
    return {
      mappings,
      conflicts,
      suggestions,
      confidence,
      unmappedFields: this.getUnmappedFields(extractedFields, mappings)
    };
  }

  private async generateMappings(
    fields: ExtractedField[],
    coreFields: CoreFieldDefinition[],
    supplierRules: SupplierRule[],
    supplierType: string
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    
    for (const field of fields) {
      // Try pattern-based mapping first
      let mapping = this.tryPatternMapping(field, coreFields, supplierRules);
      
      // If no pattern match, use AI
      if (!mapping || mapping.confidence < 0.7) {
        mapping = await this.tryAIMapping(field, coreFields, supplierType);
      }
      
      // Enhance with wedding context
      mapping = await this.enhanceWithWeddingContext(mapping, supplierType);
      
      mappings.push(mapping);
    }
    
    return mappings;
  }

  private async tryAIMapping(
    field: ExtractedField,
    coreFields: CoreFieldDefinition[],
    supplierType: string
  ): Promise<FieldMapping> {
    const systemPrompt = this.getMappingSystemPrompt(supplierType);
    const userPrompt = this.formatFieldForAI(field, coreFields);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      sourceField: field,
      coreField: result.coreField ? {
        name: result.coreField,
        category: this.getCoreFieldCategory(result.coreField),
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || ''
      } : null,
      customField: result.customField || null,
      confidence: result.confidence || 0.5,
      requiresReview: result.confidence < 0.8,
      autoPopulate: this.checkAutoPopulate(result.coreField),
      validationRules: this.getValidationRules(result.coreField)
    };
  }

  private async enhanceWithWeddingContext(
    mapping: FieldMapping,
    supplierType: string
  ): Promise<FieldMapping> {
    // Wedding-specific enhancements based on supplier type
    const weddingEnhancements = {
      photographer: ['shot_list', 'timeline', 'family_photos', 'style_preference'],
      catering: ['guest_count', 'dietary_requirements', 'menu_preferences', 'bar_package'],
      music: ['first_dance', 'playlist_requests', 'do_not_play', 'ceremony_music'],
      venue: ['ceremony_location', 'reception_location', 'guest_capacity', 'parking'],
      planner: ['timeline', 'vendor_list', 'budget', 'design_preferences'],
      floral: ['bouquet_style', 'centerpieces', 'ceremony_decor', 'color_palette']
    };
    
    const priorityFields = weddingEnhancements[supplierType] || [];
    
    if (mapping.coreField && priorityFields.includes(mapping.coreField.name)) {
      mapping.confidence = Math.min(1.0, mapping.confidence + 0.1);
      mapping.priority = 'high';
    }
    
    return mapping;
  }
}
```

### Wedding Context Integration

```typescript
// lib/ai/wedding-context-mapper.ts
export class WeddingContextMapper {
  private seasonalRelevance = {
    spring: ['outdoor', 'garden', 'pastel', 'floral'],
    summer: ['beach', 'outdoor', 'bright', 'casual'],
    fall: ['rustic', 'barn', 'warm', 'harvest'],
    winter: ['indoor', 'elegant', 'candlelit', 'cozy']
  };
  
  async applyWeddingContext(
    mappings: FieldMapping[],
    weddingDate: Date,
    supplierType: string
  ): Promise<FieldMapping[]> {
    const season = this.getWeddingSeason(weddingDate);
    const relevantKeywords = this.seasonalRelevance[season];
    
    return mappings.map(mapping => {
      // Boost confidence for seasonally relevant fields
      if (this.isSeasonallyRelevant(mapping.sourceField.label, relevantKeywords)) {
        mapping.seasonalRelevance = true;
        mapping.confidence = Math.min(1.0, mapping.confidence + 0.05);
      }
      
      // Apply supplier-specific boosting
      mapping = this.applySupplierBoost(mapping, supplierType);
      
      return mapping;
    });
  }
  
  private applySupplierBoost(mapping: FieldMapping, supplierType: string): FieldMapping {
    const supplierBoosts = {
      photographer: {
        fields: ['shot_list', 'family_photos', 'timeline'],
        boost: 0.15
      },
      catering: {
        fields: ['guest_count', 'dietary_requirements'],
        boost: 0.20
      },
      venue: {
        fields: ['ceremony_time', 'reception_time', 'guest_capacity'],
        boost: 0.15
      }
    };
    
    const boost = supplierBoosts[supplierType];
    if (boost && mapping.coreField && boost.fields.includes(mapping.coreField.name)) {
      mapping.confidence = Math.min(1.0, mapping.confidence + boost.boost);
      mapping.supplierPriority = true;
    }
    
    return mapping;
  }
}
```

## Testing Requirements

### Unit Tests
- Test pattern-based mapping accuracy
- Test AI mapping fallback
- Test conflict detection logic
- Test confidence scoring algorithm
- Test supplier-specific rule application
- Test wedding context enhancements

### Integration Tests
- Test full mapping pipeline with real form data
- Test OpenAI API integration
- Test database operations for mapping storage
- Test feedback learning system
- Test conflict resolution workflow

### E2E Tests with Playwright
```typescript
test('Smart mapping workflow', async ({ page }) => {
  // Upload a PDF with form fields
  await page.goto('/forms/import');
  await page.setInputFiles('#pdf-upload', 'test-forms/photographer-contract.pdf');
  
  // Wait for extraction and mapping
  await page.waitForSelector('[data-testid="mapping-interface"]');
  
  // Verify automatic mappings
  const autoMappings = await page.$$('[data-badge="auto-mapped"]');
  expect(autoMappings.length).toBeGreaterThan(5);
  
  // Review and approve mappings
  await page.click('[data-testid="approve-all-high-confidence"]');
  
  // Resolve a conflict
  await page.click('[data-testid="conflict-resolver"]');
  await page.click('[data-testid="select-primary-field"]');
  
  // Confirm mappings
  await page.click('[data-testid="confirm-mappings"]');
  
  // Verify form generation
  await page.waitForSelector('[data-testid="generated-form"]');
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] System maps 80%+ of common wedding fields automatically
- [ ] AI fallback activates for unmapped fields
- [ ] Conflicts are detected and presented for resolution
- [ ] Supplier-specific rules are applied correctly
- [ ] Feedback improves future mapping accuracy
- [ ] Manual override options available for all mappings

### Performance Requirements
- [ ] Mapping analysis completes in < 3 seconds for 50 fields
- [ ] Pattern matching operates at < 100ms per field
- [ ] AI mapping calls complete in < 2 seconds
- [ ] Conflict detection runs in < 500ms
- [ ] Overall confidence calculation < 200ms

### Quality Requirements
- [ ] 85%+ accuracy for standard wedding fields
- [ ] 70%+ accuracy for supplier-specific fields
- [ ] < 5% false positive rate for auto-population flags
- [ ] Confidence scores correlate with actual accuracy
- [ ] Learning system improves accuracy by 10% over 30 days

## Effort Estimation

### Development Tasks
- Database schema and migrations: 8 hours
- Core mapping engine: 24 hours
- AI integration and prompts: 20 hours
- Pattern matching system: 16 hours
- Conflict detection and resolution: 12 hours
- Wedding context enhancements: 10 hours
- Frontend components: 20 hours
- API endpoints: 12 hours
- Feedback and learning system: 16 hours
- Testing implementation: 20 hours

### Team Requirements
- Backend Developer: 80 hours
- Frontend Developer: 40 hours
- AI/ML Engineer: 30 hours
- QA Engineer: 20 hours
- DevOps: 8 hours

### Total Effort: 178 hours

## Dependencies
- WS-242: AI PDF Analysis System (completed)
- WS-243: AI Field Extraction System (completed)
- OpenAI API (GPT-4)
- PostgreSQL with pattern matching
- Supabase for data storage
- Context7 MCP for documentation

## Risk Mitigation
- **Risk**: Low mapping accuracy for custom fields
  - **Mitigation**: Implement robust feedback loop and manual override system
- **Risk**: Performance degradation with large forms
  - **Mitigation**: Implement field batching and caching strategies
- **Risk**: Supplier resistance to automatic mapping
  - **Mitigation**: Provide full transparency and control over mappings