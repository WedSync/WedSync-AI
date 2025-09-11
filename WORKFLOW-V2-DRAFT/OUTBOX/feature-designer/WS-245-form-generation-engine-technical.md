# WS-245: Form Generation Engine - Technical Specification

## Feature Identifier
- **Feature ID**: WS-245
- **Feature Name**: AI Form Generation Engine
- **Category**: AI Integration - Form Intelligence
- **Priority**: High (Revenue Analytics batch)

## User Story
As a **wedding supplier**, I want to **generate complete, professional forms from natural language descriptions or existing PDFs**, so that **I can quickly create customized forms without manual field-by-field construction**.

## Database Schema

### Core Tables

```sql
-- Store generated form templates
CREATE TABLE generated_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_type VARCHAR(50) NOT NULL,
  generation_method VARCHAR(50) NOT NULL, -- 'natural_language', 'pdf_import', 'template_enhancement', 'ai_suggestion'
  input_prompt TEXT,
  input_pdf_url TEXT,
  template_id UUID REFERENCES form_templates(id),
  form_name VARCHAR(255) NOT NULL,
  form_description TEXT,
  form_schema JSONB NOT NULL, -- Complete form structure
  sections JSONB NOT NULL DEFAULT '[]',
  field_count INTEGER DEFAULT 0,
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  generation_tokens INTEGER,
  generation_cost DECIMAL(10,4),
  generation_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  vendor_specific_fields JSONB DEFAULT '{}',
  wedding_context JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store form generation sessions
CREATE TABLE form_generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  session_type VARCHAR(50) NOT NULL,
  initial_input TEXT,
  refinement_prompts TEXT[],
  iterations INTEGER DEFAULT 1,
  final_form_id UUID REFERENCES generated_forms(id),
  total_tokens_used INTEGER,
  total_cost DECIMAL(10,4),
  user_satisfaction_rating INTEGER, -- 1-5 scale
  completion_status VARCHAR(50) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Cache similar prompts for cost optimization
CREATE TABLE prompt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  prompt_text TEXT NOT NULL,
  supplier_type VARCHAR(50),
  generated_schema JSONB NOT NULL,
  ai_model VARCHAR(50),
  tokens_used INTEGER,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_hash, supplier_type)
);

-- Store field generation patterns
CREATE TABLE field_generation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR(100) NOT NULL,
  supplier_type VARCHAR(50),
  trigger_keywords TEXT[], -- Keywords that trigger this pattern
  field_template JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store vendor-specific field libraries
CREATE TABLE vendor_field_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type VARCHAR(50) NOT NULL,
  field_category VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_config JSONB NOT NULL, -- Complete field configuration
  display_name TEXT NOT NULL,
  description TEXT,
  validation_rules JSONB DEFAULT '{}',
  default_value TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  popularity_score INTEGER DEFAULT 0, -- Based on usage
  wedding_specific BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_type, field_category, field_name)
);

-- Track form generation quality metrics
CREATE TABLE generation_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES generated_forms(id),
  supplier_id UUID REFERENCES suppliers(id),
  fields_added_manually INTEGER DEFAULT 0,
  fields_removed INTEGER DEFAULT 0,
  fields_modified INTEGER DEFAULT 0,
  time_to_first_submission INTEGER, -- Minutes
  submission_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2),
  user_feedback TEXT,
  quality_score DECIMAL(3,2), -- Calculated metric
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store form sections and layouts
CREATE TABLE form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES generated_forms(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  section_title VARCHAR(255) NOT NULL,
  section_description TEXT,
  column_count INTEGER DEFAULT 1 CHECK (column_count BETWEEN 1 AND 4),
  is_collapsible BOOLEAN DEFAULT FALSE,
  is_collapsed BOOLEAN DEFAULT FALSE,
  conditional_logic JSONB DEFAULT '{}',
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, section_order)
);

-- Indexes for performance
CREATE INDEX idx_generated_forms_supplier ON generated_forms(supplier_id);
CREATE INDEX idx_generated_forms_published ON generated_forms(is_published, supplier_type);
CREATE INDEX idx_generation_sessions_supplier ON form_generation_sessions(supplier_id);
CREATE INDEX idx_prompt_cache_hash ON prompt_cache(prompt_hash);
CREATE INDEX idx_prompt_cache_expiry ON prompt_cache(expires_at);
CREATE INDEX idx_field_patterns_keywords ON field_generation_patterns USING gin(trigger_keywords);
CREATE INDEX idx_vendor_libraries_type ON vendor_field_libraries(vendor_type, field_category);
CREATE INDEX idx_quality_metrics_form ON generation_quality_metrics(form_id);

-- Full-text search for prompts
CREATE INDEX idx_prompt_cache_fts ON prompt_cache USING gin(to_tsvector('english', prompt_text));
CREATE INDEX idx_field_patterns_name_fts ON field_generation_patterns USING gin(to_tsvector('english', pattern_name));
```

## API Endpoints

### Form Generation Endpoints

```typescript
// POST /api/ai/forms/generate
interface GenerateFormRequest {
  supplierId: string;
  supplierType: 'photographer' | 'planner' | 'venue' | 'catering' | 'music' | 'floral';
  generationMethod: 'natural_language' | 'pdf_import' | 'template_enhancement';
  input: {
    prompt?: string; // For natural language
    pdfUrl?: string; // For PDF import
    templateId?: string; // For template enhancement
    extractedFields?: ExtractedField[]; // From WS-243
    mappedFields?: MappedField[]; // From WS-244
  };
  preferences?: {
    formStyle?: 'minimal' | 'detailed' | 'conversational';
    fieldGrouping?: 'logical' | 'chronological' | 'priority';
    includeConditionalLogic?: boolean;
    includeValidation?: boolean;
    maxSections?: number;
  };
}

interface GenerateFormResponse {
  formId: string;
  sessionId: string;
  form: {
    name: string;
    description: string;
    sections: FormSection[];
    totalFields: number;
    estimatedCompletionTime: number; // minutes
  };
  generation: {
    method: string;
    confidence: number;
    tokensUsed: number;
    cost: number;
    timeMs: number;
  };
  suggestions: Array<{
    type: 'add_field' | 'remove_field' | 'reorder' | 'group';
    description: string;
    field?: any;
  }>;
  preview: {
    url: string;
    mobileUrl: string;
  };
}

// POST /api/ai/forms/refine
interface RefineFormRequest {
  sessionId: string;
  formId: string;
  refinementPrompt: string;
  specificChanges?: Array<{
    action: 'add' | 'remove' | 'modify' | 'reorder';
    target: string;
    details: any;
  }>;
}

// POST /api/ai/forms/enhance-with-vendor-fields
interface EnhanceWithVendorFieldsRequest {
  formId: string;
  vendorType: string;
  categories?: string[]; // Specific categories to include
  autoDetect?: boolean; // Auto-detect relevant fields
}

// GET /api/ai/forms/vendor-libraries/:vendorType
interface GetVendorLibraryResponse {
  vendorType: string;
  categories: Array<{
    name: string;
    fields: Array<{
      id: string;
      name: string;
      displayName: string;
      description: string;
      fieldConfig: any;
      popularityScore: number;
    }>;
  }>;
  totalFields: number;
  popularFields: any[];
}

// POST /api/ai/forms/validate-generation
interface ValidateGenerationRequest {
  formSchema: any;
  supplierType: string;
  checkAccessibility?: boolean;
  checkMobileResponsiveness?: boolean;
  checkFieldRelationships?: boolean;
}

interface ValidateGenerationResponse {
  isValid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    type: string;
    field?: string;
    message: string;
    suggestion?: string;
  }>;
  accessibilityScore?: number;
  mobileScore?: number;
  qualityScore: number;
}
```

## Frontend Components

### React Component Structure

```typescript
// components/forms/FormGenerationWizard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFormGeneration } from '@/hooks/useFormGeneration';
import { FormCanvas } from './FormCanvas';
import { VendorFieldLibrary } from './VendorFieldLibrary';

interface FormGenerationWizardProps {
  supplierId: string;
  supplierType: string;
  onComplete: (formId: string) => void;
}

export const FormGenerationWizard: React.FC<FormGenerationWizardProps> = ({
  supplierId,
  supplierType,
  onComplete
}) => {
  const [generationMethod, setGenerationMethod] = useState<string>('natural_language');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const {
    generateForm,
    refineForm,
    generatedForm,
    preview,
    suggestions,
    sessionId
  } = useFormGeneration(supplierId);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateForm({
        supplierType,
        generationMethod,
        input: { prompt }
      });
      
      if (result.formId) {
        // Show preview and refinement options
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getPromptSuggestions = () => {
    const suggestions = {
      photographer: [
        "Create a wedding photography booking form with shot list preferences",
        "Generate a form for collecting family photo groups and timeline",
        "Build a photography style questionnaire with venue details"
      ],
      catering: [
        "Create a catering inquiry form with dietary requirements matrix",
        "Generate a tasting appointment booking form with menu preferences",
        "Build a comprehensive catering questionnaire with guest counts"
      ],
      venue: [
        "Create a venue booking inquiry with ceremony and reception details",
        "Generate a venue tour request form with preferred dates",
        "Build a venue requirements form with guest capacity and amenities"
      ],
      planner: [
        "Create a wedding planning consultation form",
        "Generate a comprehensive wedding details questionnaire",
        "Build a vendor preference and budget allocation form"
      ]
    };
    
    return suggestions[supplierType] || [];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Generation Method Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold">AI Form Generator</h2>
          <p className="text-muted-foreground">
            Create professional forms instantly with AI assistance
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={generationMethod} onValueChange={setGenerationMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="natural_language">
                Natural Language
              </TabsTrigger>
              <TabsTrigger value="pdf_import">
                Import PDF
              </TabsTrigger>
              <TabsTrigger value="template_enhancement">
                Enhance Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value="natural_language" className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Describe your form in natural language
                </label>
                <Textarea
                  placeholder="E.g., I need a form to collect wedding photography preferences including shot lists, family groups, and timeline details..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] mt-2"
                />
              </div>

              {/* Prompt Suggestions */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Try these examples:
                </p>
                <div className="flex flex-wrap gap-2">
                  {getPromptSuggestions().map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pdf_import">
              <PDFImportInterface
                onFieldsExtracted={(fields) => {
                  // Handle extracted fields from WS-242/243
                }}
              />
            </TabsContent>

            <TabsContent value="template_enhancement">
              <TemplateSelector
                supplierType={supplierType}
                onSelect={(templateId) => {
                  // Handle template selection
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
              className="min-w-[150px]"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⚡</span>
                  Generating...
                </>
              ) : (
                'Generate Form'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Form Preview */}
      {generatedForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{generatedForm.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedForm.totalFields} fields • {generatedForm.sections.length} sections
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {Math.round(generatedForm.confidence * 100)}% confidence
                </Badge>
                <Badge variant="secondary">
                  ~{generatedForm.estimatedCompletionTime} min
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormCanvas
              form={generatedForm}
              editable={true}
              onUpdate={(updates) => {
                // Handle form updates
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="font-medium">AI Suggestions</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{suggestion.description}</p>
                    {suggestion.field && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Field: {suggestion.field.name}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refinement Interface */}
      {sessionId && (
        <Card>
          <CardHeader>
            <h4 className="font-medium">Refine Your Form</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Tell me what changes you'd like... (e.g., 'Add a section for timeline details' or 'Make the guest count field required')"
                className="min-h-[80px]"
              />
              <Button onClick={() => refineForm(sessionId, prompt)}>
                Refine Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// components/forms/FormCanvas.tsx
export const FormCanvas: React.FC<{
  form: GeneratedForm;
  editable: boolean;
  onUpdate: (updates: any) => void;
}> = ({ form, editable, onUpdate }) => {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      {form.sections.map((section, sectionIdx) => (
        <div key={section.id} className="border rounded-lg p-4">
          <div className="mb-4">
            <h4 className="font-medium">{section.title}</h4>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          
          <div className={`grid grid-cols-${section.columnCount} gap-4`}>
            {section.fields.map((field) => (
              <FormFieldPreview
                key={field.id}
                field={field}
                editable={editable}
                selected={selectedField === field.id}
                onSelect={() => setSelectedField(field.id)}
                onUpdate={(updates) => onUpdate({ fieldId: field.id, ...updates })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// components/forms/VendorFieldLibrary.tsx
export const VendorFieldLibrary: React.FC<{
  vendorType: string;
  onFieldSelect: (field: any) => void;
}> = ({ vendorType, onFieldSelect }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  useEffect(() => {
    loadVendorLibrary(vendorType);
  }, [vendorType]);
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Badge
            key={category.name}
            variant={selectedCategory === category.name ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.name)}
          >
            {category.name} ({category.fields.length})
          </Badge>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {selectedCategory && categories
          .find(c => c.name === selectedCategory)
          ?.fields.map((field: any) => (
            <Card
              key={field.id}
              className="cursor-pointer hover:border-primary"
              onClick={() => onFieldSelect(field)}
            >
              <CardContent className="p-3">
                <p className="font-medium text-sm">{field.displayName}</p>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                <div className="flex gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {field.type}
                  </Badge>
                  {field.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};
```

## Integration Points

### AI Service Integration

```typescript
// lib/ai/form-generator.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class FormGenerator {
  private openai: OpenAI;
  private supabase: any;
  private promptCache: Map<string, any>;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.promptCache = new Map();
  }

  async generateForm(
    prompt: string,
    supplierType: string,
    preferences?: FormGenerationPreferences
  ): Promise<GeneratedForm> {
    // Check cache first
    const cachedResult = await this.checkPromptCache(prompt, supplierType);
    if (cachedResult) {
      return this.enhanceWithLatestPatterns(cachedResult);
    }

    // Generate with AI
    const systemPrompt = this.buildSystemPrompt(supplierType, preferences);
    const enhancedPrompt = await this.enhancePromptWithContext(prompt, supplierType);

    const response = await this.openai.chat.completions.create({
      model: preferences?.useAdvancedModel ? 'gpt-4' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedSchema = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and enhance
    const validatedForm = await this.validateAndEnhance(generatedSchema, supplierType);
    
    // Apply wedding intelligence
    const weddingEnhanced = await this.applyWeddingIntelligence(validatedForm, supplierType);
    
    // Cache the result
    await this.cachePromptResult(prompt, supplierType, weddingEnhanced);
    
    // Store in database
    const stored = await this.storeGeneratedForm(weddingEnhanced, {
      prompt,
      supplierType,
      tokensUsed: response.usage?.total_tokens || 0
    });
    
    return stored;
  }

  private buildSystemPrompt(supplierType: string, preferences?: any): string {
    const basePrompt = `You are an expert wedding form builder specializing in ${supplierType} services.
    
Create a comprehensive form with these requirements:
1. Generate appropriate sections with clear titles
2. Include all essential fields for ${supplierType} services
3. Add wedding-specific fields that improve service delivery
4. Include proper validation rules for each field
5. Organize fields logically with good UX flow
6. Add helpful descriptions and placeholder text
7. Consider mobile responsiveness (1-4 columns per section)

Output JSON format:
{
  "name": "Form title",
  "description": "Form description",
  "sections": [
    {
      "title": "Section title",
      "description": "Optional description",
      "columnCount": 1-4,
      "fields": [
        {
          "name": "field_name",
          "label": "Display Label",
          "type": "text|email|phone|date|number|select|checkbox|radio|textarea|file",
          "required": boolean,
          "placeholder": "Optional placeholder",
          "helpText": "Optional help text",
          "validation": { rules },
          "options": ["for select/radio/checkbox"],
          "conditionalLogic": { optional }
        }
      ]
    }
  ]
}`;

    const vendorSpecific = {
      photographer: `
Include fields for:
- Shot list preferences (must-have shots)
- Family photo groups and combinations
- Photography timeline and schedule
- Style preferences (candid, traditional, artistic)
- Special moments to capture
- Do-not-photograph list
- Delivery preferences`,
      
      catering: `
Include fields for:
- Guest count (adults/children)
- Dietary requirements matrix
- Menu preferences and selections
- Service style (buffet, plated, family-style)
- Bar package preferences
- Tasting appointment scheduling
- Special dietary accommodations`,
      
      venue: `
Include fields for:
- Ceremony and reception times
- Guest capacity requirements
- Setup/breakdown timeline
- Vendor access requirements
- Parking and transportation
- Amenity requirements
- Weather contingency plans`,
      
      planner: `
Include fields for:
- Overall wedding vision and style
- Budget allocation
- Vendor preferences
- Timeline and schedule
- Guest list management
- Design preferences
- Special traditions or customs`,
      
      music: `
Include fields for:
- First dance song selection
- Playlist preferences
- Do-not-play list
- Special songs for key moments
- Equipment requirements
- Timeline coordination
- MC/announcement preferences`,
      
      floral: `
Include fields for:
- Bouquet styles and preferences
- Centerpiece requirements
- Ceremony decorations
- Color palette
- Flower preferences/allergies
- Delivery and setup timeline
- Preservation options`
    };

    return basePrompt + '\n\nVendor-specific requirements:\n' + (vendorSpecific[supplierType] || '');
  }

  private async applyWeddingIntelligence(
    form: any,
    supplierType: string
  ): Promise<any> {
    // Add smart defaults based on wedding context
    const enhancedSections = form.sections.map((section: any) => ({
      ...section,
      fields: section.fields.map((field: any) => {
        // Apply wedding-specific enhancements
        if (field.name.includes('date') || field.label.toLowerCase().includes('date')) {
          field.type = 'date';
          field.validation = {
            ...field.validation,
            minDate: 'today',
            maxDate: '+2 years'
          };
          field.helpText = field.helpText || 'Select your wedding date';
        }
        
        if (field.name.includes('guest') || field.label.toLowerCase().includes('guest')) {
          field.type = 'number';
          field.validation = {
            ...field.validation,
            min: 1,
            max: 500
          };
          field.placeholder = field.placeholder || 'Expected number of guests';
        }
        
        if (field.name.includes('venue') || field.label.toLowerCase().includes('venue')) {
          field.autocomplete = 'google_places';
          field.helpText = field.helpText || 'Start typing to search for venues';
        }
        
        if (field.name.includes('budget') || field.label.toLowerCase().includes('budget')) {
          field.type = 'currency';
          field.currency = 'USD';
          field.helpText = field.helpText || 'Enter your budget range';
        }
        
        return field;
      })
    }));
    
    // Add vendor-specific intelligent sections
    const vendorSections = await this.getVendorSpecificSections(supplierType);
    
    return {
      ...form,
      sections: [...enhancedSections, ...vendorSections],
      weddingOptimized: true
    };
  }

  private async getVendorSpecificSections(supplierType: string): Promise<any[]> {
    // Load from vendor field library
    const { data: vendorFields } = await this.supabase
      .from('vendor_field_libraries')
      .select('*')
      .eq('vendor_type', supplierType)
      .order('popularity_score', { ascending: false })
      .limit(20);
    
    if (!vendorFields || vendorFields.length === 0) {
      return [];
    }
    
    // Group into logical sections
    const sections = this.groupFieldsIntoSections(vendorFields);
    
    return sections;
  }

  async refineForm(
    sessionId: string,
    formId: string,
    refinementPrompt: string
  ): Promise<GeneratedForm> {
    // Load current form
    const { data: currentForm } = await this.supabase
      .from('generated_forms')
      .select('*')
      .eq('id', formId)
      .single();
    
    if (!currentForm) {
      throw new Error('Form not found');
    }
    
    // Generate refinements
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are refining an existing wedding form. Make specific changes based on the user request while preserving the overall structure.'
        },
        {
          role: 'user',
          content: `Current form: ${JSON.stringify(currentForm.form_schema)}
          
          Refinement request: ${refinementPrompt}
          
          Return the updated form schema with the requested changes.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    });
    
    const refinedSchema = JSON.parse(response.choices[0].message.content || '{}');
    
    // Update session
    await this.supabase
      .from('form_generation_sessions')
      .update({
        refinement_prompts: [...(currentForm.refinement_prompts || []), refinementPrompt],
        iterations: (currentForm.iterations || 1) + 1
      })
      .eq('id', sessionId);
    
    // Store refined form
    const refined = await this.storeGeneratedForm(refinedSchema, {
      ...currentForm,
      refinementPrompt
    });
    
    return refined;
  }
}

// lib/ai/cost-optimizer.ts
export class FormGenerationCostOptimizer {
  private promptSimilarityThreshold = 0.85;
  
  async optimizeGeneration(
    prompt: string,
    supplierType: string
  ): Promise<OptimizationResult> {
    // Check for similar cached prompts
    const similarPrompts = await this.findSimilarPrompts(prompt, supplierType);
    
    if (similarPrompts.length > 0) {
      // Use cached result with minor modifications
      return {
        method: 'cache_hit',
        savedTokens: 1500,
        savedCost: 0.03,
        result: similarPrompts[0].schema
      };
    }
    
    // Determine optimal model based on complexity
    const complexity = this.assessPromptComplexity(prompt);
    const model = complexity > 0.7 ? 'gpt-4' : 'gpt-3.5-turbo';
    
    return {
      method: 'generate',
      model,
      estimatedTokens: this.estimateTokens(prompt),
      estimatedCost: this.estimateCost(model, prompt)
    };
  }
  
  private assessPromptComplexity(prompt: string): number {
    let complexity = 0.5; // Base complexity
    
    // Check for complex requirements
    if (prompt.includes('conditional') || prompt.includes('logic')) complexity += 0.2;
    if (prompt.includes('validation') || prompt.includes('rules')) complexity += 0.1;
    if (prompt.includes('multiple sections') || prompt.includes('groups')) complexity += 0.1;
    if (prompt.length > 200) complexity += 0.1;
    
    return Math.min(complexity, 1.0);
  }
}
```

## Testing Requirements

### Unit Tests
- Test form generation from natural language
- Test PDF import and field extraction integration
- Test template enhancement logic
- Test vendor-specific field libraries
- Test cost optimization and caching
- Test form validation and quality checks

### Integration Tests
- Test complete generation pipeline
- Test OpenAI API integration with retries
- Test database storage and retrieval
- Test refinement iterations
- Test session management

### E2E Tests with Playwright
```typescript
test('AI form generation from natural language', async ({ page }) => {
  await page.goto('/forms/generate');
  
  // Select natural language method
  await page.click('[data-testid="natural-language-tab"]');
  
  // Enter prompt
  await page.fill('[data-testid="generation-prompt"]', 
    'Create a wedding photography form with shot list and timeline'
  );
  
  // Generate form
  await page.click('[data-testid="generate-form"]');
  
  // Wait for generation
  await page.waitForSelector('[data-testid="form-preview"]', { timeout: 10000 });
  
  // Verify sections created
  const sections = await page.$$('[data-testid="form-section"]');
  expect(sections.length).toBeGreaterThan(2);
  
  // Verify wedding-specific fields
  await expect(page.locator('text=Shot List')).toBeVisible();
  await expect(page.locator('text=Timeline')).toBeVisible();
  
  // Test refinement
  await page.fill('[data-testid="refinement-prompt"]', 
    'Add a section for family photo groups'
  );
  await page.click('[data-testid="refine-form"]');
  
  // Verify new section added
  await expect(page.locator('text=Family Photos')).toBeVisible();
  
  // Publish form
  await page.click('[data-testid="publish-form"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Natural language generates complete forms in < 5 seconds
- [ ] PDF import preserves 90%+ of original fields
- [ ] Template enhancement adds relevant vendor fields
- [ ] Form refinement works iteratively
- [ ] Vendor-specific libraries are comprehensive
- [ ] Generated forms are mobile-responsive

### Performance Requirements
- [ ] Generation completes in < 5 seconds for standard forms
- [ ] Cache hit rate > 60% for similar prompts
- [ ] Refinement iterations complete in < 3 seconds
- [ ] Form preview renders in < 1 second
- [ ] Batch operations process 10 forms/minute

### Quality Requirements
- [ ] Generated forms have 85%+ field relevance
- [ ] Validation rules are appropriate 90%+ of time
- [ ] Section organization is logical and intuitive
- [ ] Accessibility standards met (WCAG 2.1 AA)
- [ ] Forms work across all major browsers

## Effort Estimation

### Development Tasks
- Database schema and migrations: 8 hours
- Core generation engine: 32 hours
- Natural language processing: 24 hours
- PDF integration (with WS-242/243): 12 hours
- Template enhancement system: 16 hours
- Vendor field libraries: 20 hours
- Cost optimization and caching: 12 hours
- Frontend components and UI: 28 hours
- API endpoints: 16 hours
- Testing implementation: 24 hours

### Team Requirements
- Backend Developer: 100 hours
- Frontend Developer: 48 hours
- AI/ML Engineer: 40 hours
- QA Engineer: 24 hours
- DevOps: 10 hours

### Total Effort: 222 hours

## Dependencies
- WS-242: AI PDF Analysis System (completed)
- WS-243: AI Field Extraction System (completed)
- WS-244: Smart Mapping System (completed)
- OpenAI API (GPT-4 and GPT-3.5)
- PostgreSQL with JSONB support
- Supabase for data storage
- React with TypeScript
- dnd-kit for drag-and-drop

## Risk Mitigation
- **Risk**: High API costs for complex forms
  - **Mitigation**: Implement aggressive caching and prompt optimization
- **Risk**: Generated forms missing critical fields
  - **Mitigation**: Maintain comprehensive vendor field libraries
- **Risk**: Poor mobile experience
  - **Mitigation**: Test all generated forms on mobile devices
- **Risk**: User dissatisfaction with AI output
  - **Mitigation**: Provide extensive refinement and manual editing options