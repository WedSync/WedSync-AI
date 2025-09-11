# WS-246: AI Personalization Engine - Technical Specification

## Feature Identifier
- **Feature ID**: WS-246
- **Feature Name**: AI Personalization Engine
- **Category**: AI Integration - Content Generation
- **Priority**: High (Revenue Analytics batch)

## User Story
As a **wedding supplier**, I want **all client communications to be intelligently personalized based on couple details, wedding characteristics, and my brand voice**, so that **I can build stronger relationships and provide more relevant, engaging experiences**.

## Database Schema

### Core Tables

```sql
-- Store personalization contexts and results
CREATE TABLE personalization_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_details JSONB NOT NULL DEFAULT '{}',
  wedding_details JSONB NOT NULL DEFAULT '{}',
  supplier_details JSONB NOT NULL DEFAULT '{}',
  relationship_context JSONB NOT NULL DEFAULT '{}',
  emotional_profile JSONB DEFAULT '{}',
  communication_preferences JSONB DEFAULT '{}',
  interaction_history JSONB DEFAULT '[]',
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store personalized content instances
CREATE TABLE personalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES personalization_contexts(id),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  content_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'article', 'form_intro', 'proposal'
  original_content TEXT NOT NULL,
  personalized_content TEXT NOT NULL,
  personalizations_applied TEXT[] DEFAULT '{}',
  dynamic_variables JSONB DEFAULT '{}',
  vendor_enhancements JSONB DEFAULT '{}',
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  tokens_used INTEGER,
  generation_cost DECIMAL(10,4),
  confidence_score DECIMAL(3,2),
  quality_score DECIMAL(3,2),
  validation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  validation_issues TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track personalization performance metrics
CREATE TABLE personalization_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personalization_id UUID REFERENCES personalizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  content_type VARCHAR(50),
  engagement_metrics JSONB DEFAULT '{}',
  response_metrics JSONB DEFAULT '{}',
  satisfaction_metrics JSONB DEFAULT '{}',
  business_impact JSONB DEFAULT '{}',
  ab_test_group VARCHAR(20), -- 'control', 'treatment_a', 'treatment_b'
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store dynamic variable definitions and processors
CREATE TABLE dynamic_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  variable_category VARCHAR(50) NOT NULL, -- 'time', 'couple', 'wedding', 'context', 'supplier'
  processor_type VARCHAR(50) NOT NULL, -- 'simple', 'calculated', 'conditional', 'ai_generated'
  processor_config JSONB NOT NULL DEFAULT '{}',
  default_value TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store vendor-specific personalization rules
CREATE TABLE vendor_personalization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  vendor_type VARCHAR(50) NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_category VARCHAR(50) NOT NULL, -- 'venue_specific', 'style_alignment', 'timing', 'expertise'
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  enhancement_template TEXT NOT NULL,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  success_rate DECIMAL(3,2),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store brand voice configurations
CREATE TABLE brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  voice_type VARCHAR(50) NOT NULL, -- 'professional', 'warm', 'creative', 'luxury', 'down_to_earth'
  tone_attributes JSONB NOT NULL DEFAULT '{}',
  communication_style JSONB NOT NULL DEFAULT '{}',
  vocabulary_preferences JSONB DEFAULT '{}',
  writing_patterns JSONB DEFAULT '{}',
  example_content TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store personalization templates by content type
CREATE TABLE personalization_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(150) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  vendor_type VARCHAR(50),
  template_content TEXT NOT NULL,
  required_variables TEXT[],
  optional_variables TEXT[],
  personalization_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache processed personalizations for efficiency
CREATE TABLE personalization_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 of original content + context
  supplier_id UUID REFERENCES suppliers(id),
  personalized_result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store A/B testing results for personalization strategies
CREATE TABLE personalization_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name VARCHAR(100) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  experiment_type VARCHAR(50) NOT NULL, -- 'tone_variation', 'variable_usage', 'enhancement_level'
  control_group_config JSONB NOT NULL DEFAULT '{}',
  treatment_groups JSONB NOT NULL DEFAULT '[]',
  success_metrics TEXT[] NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active', -- 'planning', 'active', 'completed', 'paused'
  results JSONB DEFAULT '{}',
  winner VARCHAR(50), -- 'control', 'treatment_a', 'treatment_b', etc.
  statistical_significance DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_personalization_contexts_client ON personalization_contexts(client_id);
CREATE INDEX idx_personalization_contexts_supplier ON personalization_contexts(supplier_id);
CREATE INDEX idx_personalizations_context ON personalizations(context_id);
CREATE INDEX idx_personalizations_content_type ON personalizations(content_type, supplier_id);
CREATE INDEX idx_personalization_performance_supplier ON personalization_performance(supplier_id);
CREATE INDEX idx_dynamic_variables_category ON dynamic_variables(variable_category, is_active);
CREATE INDEX idx_vendor_rules_supplier ON vendor_personalization_rules(supplier_id, is_active);
CREATE INDEX idx_brand_voice_supplier ON brand_voice_profiles(supplier_id, is_active);
CREATE INDEX idx_personalization_cache_hash ON personalization_cache(content_hash);
CREATE INDEX idx_personalization_cache_expiry ON personalization_cache(expires_at);

-- Full-text search indexes
CREATE INDEX idx_personalizations_content_fts ON personalizations USING gin(to_tsvector('english', personalized_content));
CREATE INDEX idx_templates_content_fts ON personalization_templates USING gin(to_tsvector('english', template_content));
```

## API Endpoints

### Personalization Endpoints

```typescript
// POST /api/ai/personalization/analyze-context
interface AnalyzeContextRequest {
  clientId: string;
  supplierId: string;
  weddingDetails?: {
    date: string;
    venue: VenueDetails;
    style: string;
    size: number;
    timeOfDay: string;
  };
  coupleDetails?: {
    names: string[];
    communicationStyle?: string;
    responsePatterns?: string;
  };
  refreshFromSource?: boolean; // Force refresh from client data
}

interface AnalyzeContextResponse {
  contextId: string;
  personalizationContext: {
    couple: CoupleContext;
    wedding: WeddingContext;
    supplier: SupplierContext;
    relationship: RelationshipContext;
    emotionalProfile: EmotionalProfile;
  };
  availableVariables: DynamicVariable[];
  recommendedPersonalizations: string[];
}

// POST /api/ai/personalization/personalize
interface PersonalizeContentRequest {
  contextId: string;
  content: string;
  contentType: 'email' | 'sms' | 'article' | 'form_intro' | 'proposal' | 'reminder';
  options?: {
    preserveCriticalInfo?: boolean;
    enhancementLevel?: 'minimal' | 'moderate' | 'extensive';
    includeVendorExpertise?: boolean;
    emotionalToneAdjustment?: boolean;
    maxPersonalizationChanges?: number;
  };
}

interface PersonalizeContentResponse {
  personalizationId: string;
  original: string;
  personalized: string;
  personalizations: {
    variablesApplied: Array<{
      variable: string;
      originalValue: string;
      personalizedValue: string;
    }>;
    enhancementsApplied: Array<{
      type: string;
      description: string;
      content: string;
    }>;
    toneAdjustments: string[];
  };
  quality: {
    confidenceScore: number;
    qualityScore: number;
    validationIssues: string[];
  };
  metrics: {
    tokensUsed: number;
    processingTimeMs: number;
    cost: number;
  };
  preview?: {
    emailHtml?: string;
    smsPreview?: string;
  };
}

// POST /api/ai/personalization/bulk-personalize
interface BulkPersonalizeRequest {
  contextId: string;
  contents: Array<{
    id: string;
    content: string;
    contentType: string;
  }>;
  globalOptions?: PersonalizationOptions;
}

// GET /api/ai/personalization/variables
interface GetVariablesResponse {
  variables: Array<{
    name: string;
    displayName: string;
    category: string;
    description: string;
    exampleValue: string;
    usageCount: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
    description: string;
  }>;
}

// POST /api/ai/personalization/vendor-rules
interface CreateVendorRuleRequest {
  supplierId: string;
  ruleName: string;
  category: string;
  triggerConditions: any;
  enhancementTemplate: string;
  priority?: number;
}

// GET /api/ai/personalization/performance/:supplierId
interface GetPersonalizationPerformanceResponse {
  supplierId: string;
  metrics: {
    totalPersonalizations: number;
    averageEngagementImprovement: number;
    averageResponseRate: number;
    averageSatisfactionScore: number;
    costPerPersonalization: number;
  };
  breakdown: {
    byContentType: Record<string, any>;
    byPersonalizationLevel: Record<string, any>;
    byTimeframe: Array<{
      date: string;
      metrics: any;
    }>;
  };
  experiments: Array<{
    name: string;
    status: string;
    winner?: string;
    improvement?: number;
  }>;
}

// POST /api/ai/personalization/experiments
interface CreateExperimentRequest {
  experimentName: string;
  supplierId: string;
  experimentType: string;
  controlConfig: any;
  treatmentGroups: any[];
  successMetrics: string[];
  duration: number; // days
}
```

## Frontend Components

### React Component Structure

```typescript
// components/ai/PersonalizationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { usePersonalization } from '@/hooks/usePersonalization';

interface PersonalizationDashboardProps {
  supplierId: string;
}

export const PersonalizationDashboard: React.FC<PersonalizationDashboardProps> = ({
  supplierId
}) => {
  const {
    performance,
    experiments,
    isLoading,
    loadPerformance
  } = usePersonalization(supplierId);

  useEffect(() => {
    loadPerformance();
  }, [supplierId]);

  const getEngagementColor = (improvement: number) => {
    if (improvement >= 20) return 'text-green-600';
    if (improvement >= 10) return 'text-blue-600';
    if (improvement >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total Personalizations</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{performance?.totalPersonalizations || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Engagement Improvement</p>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getEngagementColor(performance?.averageEngagementImprovement || 0)}`}>
              +{performance?.averageEngagementImprovement || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Response Rate</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{performance?.averageResponseRate || 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Client Satisfaction</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{performance?.averageSatisfactionScore || 0}/5</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="content-types">
        <TabsList>
          <TabsTrigger value="content-types">Content Types</TabsTrigger>
          <TabsTrigger value="experiments">A/B Tests</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="content-types">
          <ContentTypeAnalytics breakdown={performance?.breakdown} />
        </TabsContent>

        <TabsContent value="experiments">
          <ExperimentResults experiments={experiments} />
        </TabsContent>

        <TabsContent value="variables">
          <VariableUsageAnalytics supplierId={supplierId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// components/ai/PersonalizationEditor.tsx
export const PersonalizationEditor: React.FC<{
  clientId: string;
  supplierId: string;
  initialContent: string;
  contentType: string;
  onPersonalize: (result: any) => void;
}> = ({ clientId, supplierId, initialContent, contentType, onPersonalize }) => {
  const [content, setContent] = useState(initialContent);
  const [options, setOptions] = useState({
    enhancementLevel: 'moderate',
    includeVendorExpertise: true,
    emotionalToneAdjustment: true
  });
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { personalizeContent, analyzeContext } = usePersonalization();

  const handlePersonalize = async () => {
    setIsPersonalizing(true);
    try {
      // First analyze context
      const context = await analyzeContext(clientId, supplierId);
      
      // Then personalize content
      const personalized = await personalizeContent({
        contextId: context.contextId,
        content,
        contentType,
        options
      });
      
      setResult(personalized);
      onPersonalize(personalized);
    } finally {
      setIsPersonalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Editor */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Content to Personalize</h3>
        </CardHeader>
        <CardContent>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[200px] p-3 border rounded-md"
            placeholder="Enter your content here..."
          />
        </CardContent>
      </Card>

      {/* Personalization Options */}
      <Card>
        <CardHeader>
          <h4 className="font-medium">Personalization Options</h4>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Enhancement Level</label>
              <select
                value={options.enhancementLevel}
                onChange={(e) => setOptions({...options, enhancementLevel: e.target.value})}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="minimal">Minimal - Basic variable replacement</option>
                <option value="moderate">Moderate - Variables + tone adjustment</option>
                <option value="extensive">Extensive - Full personalization</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.includeVendorExpertise}
                onChange={(e) => setOptions({...options, includeVendorExpertise: e.target.checked})}
              />
              <label className="text-sm">Include vendor expertise mentions</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.emotionalToneAdjustment}
                onChange={(e) => setOptions({...options, emotionalToneAdjustment: e.target.checked})}
              />
              <label className="text-sm">Adjust tone based on emotional context</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Button
        onClick={handlePersonalize}
        disabled={!content || isPersonalizing}
        className="w-full"
        size="lg"
      >
        {isPersonalizing ? (
          <>
            <span className="animate-spin mr-2">⚡</span>
            Personalizing...
          </>
        ) : (
          'Personalize Content'
        )}
      </Button>

      {/* Results */}
      {result && (
        <PersonalizationResults result={result} />
      )}
    </div>
  );
};

// components/ai/PersonalizationResults.tsx
export const PersonalizationResults: React.FC<{
  result: any;
}> = ({ result }) => {
  const [activeTab, setActiveTab] = useState('personalized');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Personalization Results</h4>
          <div className="flex gap-2">
            <Badge variant="outline">
              {Math.round(result.quality.confidenceScore * 100)}% confidence
            </Badge>
            <Badge variant="secondary">
              {result.metrics.tokensUsed} tokens
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personalized">Personalized</TabsTrigger>
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="changes">Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="mt-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">
                {result.personalized}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="original" className="mt-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                {result.original}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="changes" className="mt-4">
            <div className="space-y-3">
              {/* Variables Applied */}
              {result.personalizations.variablesApplied.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Variables Applied</h5>
                  <div className="space-y-2">
                    {result.personalizations.variablesApplied.map((variable: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm font-mono">{variable.variable}</span>
                        <span className="text-sm">
                          "{variable.originalValue}" → "{variable.personalizedValue}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhancements Applied */}
              {result.personalizations.enhancementsApplied.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Enhancements Applied</h5>
                  <div className="space-y-2">
                    {result.personalizations.enhancementsApplied.map((enhancement: any, idx: number) => (
                      <div key={idx} className="p-2 bg-green-50 rounded">
                        <p className="text-sm font-medium">{enhancement.type}</p>
                        <p className="text-xs text-muted-foreground">{enhancement.description}</p>
                        <p className="text-sm mt-1">{enhancement.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Issues */}
              {result.quality.validationIssues.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2 text-yellow-700">Validation Issues</h5>
                  <div className="space-y-1">
                    {result.quality.validationIssues.map((issue: string, idx: number) => (
                      <div key={idx} className="p-2 bg-yellow-50 rounded text-sm">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

## Integration Points

### AI Service Integration

```typescript
// lib/ai/personalization-engine.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class PersonalizationEngine {
  private openai: OpenAI;
  private supabase: any;
  private dynamicVariables: DynamicVariableProcessor;
  private vendorSpecialist: VendorPersonalizationSpecialist;
  private emotionalAnalyzer: EmotionalPersonalization;
  private validator: PersonalizationValidator;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.dynamicVariables = new DynamicVariableProcessor();
    this.vendorSpecialist = new VendorPersonalizationSpecialist();
    this.emotionalAnalyzer = new EmotionalPersonalization();
    this.validator = new PersonalizationValidator();
  }

  async personalizeContent(
    content: string,
    context: PersonalizationContext,
    contentType: string,
    options: PersonalizationOptions = {}
  ): Promise<PersonalizedContent> {
    // Check cache first
    const cached = await this.checkCache(content, context);
    if (cached && !options.forceRefresh) {
      return cached;
    }

    // Analyze emotional context
    const emotionalProfile = this.emotionalAnalyzer.analyzeEmotionalContext(context);

    // Build personalization prompt
    const systemPrompt = this.buildPersonalizationPrompt(context, contentType, emotionalProfile);

    // Generate personalized content
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Personalize this ${contentType}: ${content}` }
      ],
      temperature: 0.4,
      max_tokens: 1000
    });

    let personalized = response.choices[0].message.content || content;

    // Process dynamic variables
    personalized = this.dynamicVariables.processVariables(personalized, context);

    // Apply vendor-specific enhancements
    if (options.includeVendorExpertise !== false) {
      personalized = this.vendorSpecialist.applyVendorPersonalization(personalized, context);
    }

    // Apply emotional tone adjustments
    if (options.emotionalToneAdjustment !== false) {
      personalized = this.emotionalAnalyzer.adaptToneForEmotionalState(personalized, emotionalProfile);
    }

    // Validate personalization
    const validation = this.validator.validatePersonalization(content, personalized, context);

    const result: PersonalizedContent = {
      original: content,
      personalized,
      personalizations: this.detectAppliedPersonalizations(content, personalized),
      confidence: validation.confidence,
      quality: {
        confidenceScore: validation.confidence,
        qualityScore: this.calculateQualityScore(personalized, context),
        validationIssues: validation.issues
      },
      metrics: {
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs: 0, // Set by caller
        cost: this.calculateCost(response.usage?.total_tokens || 0)
      }
    };

    // Cache result
    await this.cacheResult(content, context, result);

    // Store in database
    await this.storePersonalization(result, context, contentType);

    return result;
  }

  private buildPersonalizationPrompt(
    context: PersonalizationContext,
    contentType: string,
    emotionalProfile: EmotionalProfile
  ): string {
    const basePrompt = `You are personalizing wedding communication for a ${context.supplier.type}.

    Context:
    - Couple: ${context.couple.names.join(' & ')}
    - Wedding: ${context.wedding.style} ${context.wedding.size} wedding at ${context.wedding.venue.name}
    - Date: ${context.wedding.date.toLocaleDateString()}
    - Season: ${context.wedding.season} ${context.wedding.time_of_day}
    - Supplier brand: ${context.supplier.brand_voice}
    - Communication style: ${context.couple.communication_style}
    - Relationship stage: ${context.relationship_context.booking_recency} days since booking
    - Emotional context: ${emotionalProfile.stress_level} stress, ${emotionalProfile.excitement_level} excitement
    
    Personalization rules:
    1. Use couple's names naturally (not excessively, max 2-3 times)
    2. Reference venue/style appropriately when relevant
    3. Match brand voice: ${this.getBrandVoiceDescription(context.supplier.brand_voice)}
    4. Include relevant expertise mentions for ${context.supplier.type}
    5. Acknowledge timeline: ${context.wedding.timeline_stress_level} timeline pressure
    6. NEVER change dates, prices, or critical business details
    7. Keep the same overall structure and length
    8. Be authentic and avoid over-personalization
    
    Content type specific guidelines:
    ${this.getContentTypeGuidelines(contentType)}
    
    Emotional tone guidance:
    ${this.getEmotionalToneGuidance(emotionalProfile)}`;

    return basePrompt;
  }

  private getBrandVoiceDescription(brandVoice: string): string {
    const descriptions = {
      professional: 'Formal, expert, business-focused language',
      warm: 'Friendly, caring, approachable tone',
      creative: 'Artistic, expressive, imaginative language',
      luxury: 'Elegant, sophisticated, high-end positioning',
      down_to_earth: 'Casual, relatable, straightforward communication'
    };
    return descriptions[brandVoice] || 'Professional and friendly';
  }

  private getContentTypeGuidelines(contentType: string): string {
    const guidelines = {
      email: 'Maintain email structure with proper subject line considerations. Keep professional formatting.',
      sms: 'Keep it concise and mobile-friendly. Use casual tone appropriate for text messaging.',
      article: 'Maintain informative tone while adding personal touches. Keep expertise credible.',
      form_intro: 'Make form feel welcoming and personalized. Explain why information is needed.',
      proposal: 'Balance professionalism with personal connection. Highlight relevant experience.'
    };
    return guidelines[contentType] || 'Maintain appropriate tone for the content type.';
  }

  private getEmotionalToneGuidance(profile: EmotionalProfile): string {
    if (profile.stress_level === 'high') {
      return 'Be extra supportive and reassuring. Acknowledge that planning can be overwhelming.';
    }
    if (profile.excitement_level === 'high') {
      return 'Match their enthusiasm while maintaining professionalism.';
    }
    return 'Maintain balanced, positive tone.';
  }

  async createPersonalizationExperiment(
    supplierId: string,
    experimentConfig: ExperimentConfig
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('personalization_experiments')
      .insert({
        experiment_name: experimentConfig.name,
        supplier_id: supplierId,
        experiment_type: experimentConfig.type,
        control_group_config: experimentConfig.control,
        treatment_groups: experimentConfig.treatments,
        success_metrics: experimentConfig.metrics,
        end_date: new Date(Date.now() + experimentConfig.duration * 24 * 60 * 60 * 1000)
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }
}

// lib/ai/dynamic-variable-processor.ts
export class DynamicVariableProcessor {
  private variables = new Map<string, (context: PersonalizationContext) => string>();

  constructor() {
    this.initializeVariables();
  }

  private initializeVariables() {
    // Time-based variables
    this.variables.set('{{days_until_wedding}}', (context) => {
      const days = Math.ceil((context.wedding.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days.toString();
    });

    this.variables.set('{{weeks_until_wedding}}', (context) => {
      const days = parseInt(this.variables.get('{{days_until_wedding}}')!(context));
      return Math.ceil(days / 7).toString();
    });

    // Couple variables
    this.variables.set('{{couple_names}}', (context) => {
      return context.couple.names.join(' & ');
    });

    this.variables.set('{{couple_first_names}}', (context) => {
      return context.couple.names.map(name => name.split(' ')[0]).join(' & ');
    });

    // Wedding variables
    this.variables.set('{{wedding_date_formatted}}', (context) => {
      return context.wedding.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    this.variables.set('{{venue_name}}', (context) => {
      return context.wedding.venue.name;
    });

    this.variables.set('{{season}}', (context) => {
      return context.wedding.season;
    });

    // Dynamic contextual variables
    this.variables.set('{{appropriate_greeting}}', (context) => {
      const daysUntil = parseInt(this.variables.get('{{days_until_wedding}}')!(context));
      if (daysUntil > 180) return 'Hope your planning is going well!';
      if (daysUntil > 90) return 'Getting excited for your big day!';
      if (daysUntil > 30) return 'Your wedding is getting close!';
      if (daysUntil > 7) return 'Almost time for your big day!';
      return 'Your wedding is this week!';
    });

    this.variables.set('{{season_appropriate_comment}}', (context) => {
      const comments = {
        spring: 'Perfect timing for blooming flowers and mild weather!',
        summer: 'Great choice for outdoor celebrations and golden hour photos!',
        fall: 'Beautiful autumn colors will make stunning photos!',
        winter: 'Winter weddings have such a magical, cozy atmosphere!'
      };
      return comments[context.wedding.season] || '';
    });
  }

  processVariables(content: string, context: PersonalizationContext): string {
    let processed = content;
    
    for (const [variable, processor] of this.variables) {
      if (processed.includes(variable)) {
        const value = processor(context);
        processed = processed.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
    }
    
    return processed;
  }
}
```

## Testing Requirements

### Unit Tests
- Test variable processing accuracy
- Test vendor-specific enhancement logic
- Test emotional tone adjustment
- Test brand voice consistency
- Test personalization validation
- Test caching mechanisms

### Integration Tests
- Test full personalization pipeline
- Test OpenAI API integration
- Test database operations
- Test A/B experiment creation and tracking
- Test performance analytics

### E2E Tests with Playwright
```typescript
test('Complete personalization workflow', async ({ page }) => {
  // Setup test data
  await page.goto('/personalization/test');
  
  // Analyze context
  await page.fill('[data-testid="client-id"]', 'test-client-123');
  await page.click('[data-testid="analyze-context"]');
  
  // Wait for context analysis
  await page.waitForSelector('[data-testid="context-ready"]');
  
  // Input content to personalize
  await page.fill('[data-testid="content-input"]', 
    'Dear couple, thank you for considering us for your wedding day!'
  );
  
  // Select personalization options
  await page.selectOption('[data-testid="enhancement-level"]', 'moderate');
  await page.check('[data-testid="include-expertise"]');
  
  // Personalize content
  await page.click('[data-testid="personalize-content"]');
  
  // Wait for personalization
  await page.waitForSelector('[data-testid="personalized-result"]', { timeout: 10000 });
  
  // Verify personalization applied
  const personalizedContent = await page.textContent('[data-testid="personalized-content"]');
  expect(personalizedContent).toContain('John & Jane'); // Couple names
  expect(personalizedContent).toContain('Spring Garden Venue'); // Venue name
  
  // Check quality metrics
  const confidenceScore = await page.textContent('[data-testid="confidence-score"]');
  expect(parseInt(confidenceScore!)).toBeGreaterThan(80);
  
  // Verify variables were processed
  await page.click('[data-testid="changes-tab"]');
  const variablesApplied = await page.$$('[data-testid="variable-applied"]');
  expect(variablesApplied.length).toBeGreaterThan(0);
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Context analysis completes in < 2 seconds
- [ ] Personalization accuracy > 90% for standard variables
- [ ] Brand voice consistency maintained across all content
- [ ] Vendor-specific enhancements apply correctly
- [ ] Emotional tone adjustments are appropriate
- [ ] A/B testing framework functional

### Performance Requirements
- [ ] Personalization completes in < 3 seconds
- [ ] Cache hit rate > 70% for similar content
- [ ] Bulk personalization processes 50 items/minute
- [ ] Database queries execute in < 200ms
- [ ] API endpoints respond in < 1 second

### Quality Requirements
- [ ] 95%+ accuracy for critical information preservation
- [ ] Client satisfaction improvement > 15%
- [ ] Engagement rate improvement > 20%
- [ ] Response rate improvement > 25%
- [ ] Brand voice alignment score > 85%

## Effort Estimation

### Development Tasks
- Database schema and migrations: 10 hours
- Core personalization engine: 40 hours
- Dynamic variable system: 20 hours
- Vendor-specific enhancement rules: 24 hours
- Emotional intelligence integration: 16 hours
- Brand voice processing: 12 hours
- A/B testing framework: 20 hours
- Frontend components and UI: 32 hours
- API endpoints: 16 hours
- Caching and optimization: 12 hours
- Testing implementation: 28 hours

### Team Requirements
- Backend Developer: 120 hours
- Frontend Developer: 50 hours
- AI/ML Engineer: 45 hours
- QA Engineer: 30 hours
- DevOps: 10 hours

### Total Effort: 255 hours

## Dependencies
- OpenAI API (GPT-4)
- PostgreSQL with JSONB support
- Supabase for data storage
- Client and wedding data schemas
- Brand voice configuration system

## Risk Mitigation
- **Risk**: Over-personalization making content feel artificial
  - **Mitigation**: Strict validation rules and quality scoring
- **Risk**: High API costs for extensive personalization
  - **Mitigation**: Intelligent caching and cost optimization
- **Risk**: Brand voice inconsistency
  - **Mitigation**: Comprehensive brand voice training and validation
- **Risk**: Privacy concerns with personal data usage
  - **Mitigation**: Clear consent and data usage policies