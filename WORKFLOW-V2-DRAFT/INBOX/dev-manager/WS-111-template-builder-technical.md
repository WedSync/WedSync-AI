# WS-111: Template Builder System - Technical Specification

## Overview
Visual tool for packaging forms, journeys, and email sequences into sellable template packages for the marketplace, with content sanitization and version control.

## User Stories with Real Wedding Context

### Story 1: Creating First Template Package
**As Sarah (Wedding Photographer)** with successful client workflows  
**I want** to package my "Client Onboarding Journey" into a sellable template  
**So that** other photographers can benefit from my proven process

**Wedding Business Context:**
- Sarah selects her 5-step client onboarding journey from her existing workflows
- Template builder automatically sanitizes client data: "Emma & David's Wedding" → "Client Wedding Name"
- Packages include: Initial consultation form, contract upload, payment schedule, shot list form, final gallery delivery
- Preview shows sanitized demo with sample data for potential buyers
- Sets price at £49 based on complexity and value delivered

### Story 2: Building Complex Multi-Component Template
**As Marcus (Wedding Planner)** creating comprehensive templates  
**I want** to combine forms, email sequences, and journeys into one cohesive package  
**So that** I can sell complete workflow solutions to other planners

**Wedding Business Context:**
- Combines: "Wedding Timeline Builder" form + "Vendor Coordination Journey" + "Client Update Email Sequence"
- Template builder detects dependencies: requires Timeline module, Vendor Management, Email automation
- Bundle pricing: Individual templates £29 each, bundle at £69 (20% discount)
- Version 1.0 ready, 15 components included, estimated 4-hour setup time for buyers

### Story 3: Template Version Management and Updates
**As Lisa (Venue Coordinator)** improving existing templates  
**I want** to update my templates based on buyer feedback  
**So that** existing customers get improvements and new customers get the best version

**Wedding Business Context:**
- Updates "Venue Setup Checklist" template: adds new safety requirements, improves timeline flow
- Version 2.1: "Added COVID safety protocols and improved equipment checklist"
- 23 existing buyers automatically notified of update with changelog
- Option to upgrade existing installations or keep current version

## Database Schema Design

```sql
-- Template drafts and published templates
CREATE TABLE marketplace_template_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  -- Template metadata
  template_title TEXT NOT NULL,
  template_description TEXT,
  template_tagline TEXT,
  
  -- Categorization and targeting
  primary_category TEXT NOT NULL, -- 'planning', 'photography', 'venue', etc.
  secondary_categories TEXT[] DEFAULT '{}',
  vendor_types TEXT[] NOT NULL, -- Who this template is for
  wedding_types TEXT[] DEFAULT '{}', -- 'traditional', 'destination', etc.
  template_tags TEXT[] DEFAULT '{}',
  
  -- Template package structure
  package_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  component_count INTEGER DEFAULT 0,
  estimated_setup_time_hours DECIMAL(4,2) DEFAULT 0,
  
  -- Pricing configuration
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  bundle_discount_percent DECIMAL(5,2) DEFAULT 0,
  early_bird_price_cents INTEGER,
  early_bird_expires_at TIMESTAMPTZ,
  
  -- Publishing and status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'suspended', 'archived')),
  published_at TIMESTAMPTZ,
  last_published_version TEXT,
  
  -- Builder state and progress
  builder_step TEXT DEFAULT 'components' CHECK (builder_step IN ('components', 'metadata', 'pricing', 'preview', 'review')),
  completion_percentage INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Auto-save and versioning
  auto_save_data JSONB DEFAULT '{}'::jsonb,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template version history and change tracking
CREATE TABLE marketplace_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  
  -- Version information
  version_number TEXT NOT NULL, -- e.g., "1.0.0", "1.1.0", "2.0.0"
  version_type TEXT NOT NULL CHECK (version_type IN ('major', 'minor', 'patch')),
  
  -- Change documentation
  changelog_title TEXT NOT NULL,
  changelog_description TEXT,
  breaking_changes BOOLEAN DEFAULT false,
  new_features TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  bug_fixes TEXT[] DEFAULT '{}',
  
  -- Version data snapshot
  package_data_snapshot JSONB NOT NULL,
  component_count INTEGER DEFAULT 0,
  
  -- Version metadata
  created_by UUID REFERENCES suppliers(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Adoption tracking
  auto_upgrade_eligible BOOLEAN DEFAULT true,
  purchaser_notifications_sent INTEGER DEFAULT 0,
  upgrade_adoption_rate DECIMAL(5,4) DEFAULT 0
);

-- Individual template components (forms, journeys, emails)
CREATE TABLE marketplace_template_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  
  -- Component identification
  component_type TEXT NOT NULL CHECK (component_type IN ('form', 'journey', 'email_sequence', 'document', 'automation')),
  component_name TEXT NOT NULL,
  component_description TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Source component reference
  source_component_id UUID, -- References original form/journey/email
  source_component_type TEXT,
  
  -- Sanitized component data
  sanitized_data JSONB NOT NULL,
  original_data_hash TEXT, -- For change detection
  
  -- Component dependencies
  required_fields JSONB DEFAULT '[]'::jsonb,
  required_integrations TEXT[] DEFAULT '{}',
  required_modules TEXT[] DEFAULT '{}',
  minimum_tier TEXT DEFAULT 'professional',
  
  -- Component metadata
  estimated_setup_minutes INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 1, -- 1-10 scale
  usage_frequency TEXT DEFAULT 'always', -- 'always', 'optional', 'conditional'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template dependencies and requirements
CREATE TABLE marketplace_template_dependencies (
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  dependency_type TEXT NOT NULL, -- 'field', 'integration', 'module', 'tier'
  dependency_name TEXT NOT NULL,
  dependency_description TEXT,
  is_required BOOLEAN DEFAULT true,
  
  -- Requirement details
  minimum_version TEXT,
  configuration_required JSONB DEFAULT '{}'::jsonb,
  setup_instructions TEXT,
  
  PRIMARY KEY (template_id, dependency_type, dependency_name)
);

-- Template preview and marketing assets
CREATE TABLE marketplace_template_previews (
  template_id UUID PRIMARY KEY REFERENCES marketplace_template_drafts(id),
  
  -- Visual assets
  preview_images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  demo_video_url TEXT,
  feature_highlight_image TEXT,
  
  -- Generated preview data
  demo_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_list JSONB DEFAULT '[]'::jsonb,
  benefits_list JSONB DEFAULT '[]'::jsonb,
  use_cases JSONB DEFAULT '[]'::jsonb,
  
  -- Preview settings
  interactive_demo_enabled BOOLEAN DEFAULT false,
  sandbox_demo_url TEXT,
  
  -- SEO and marketing
  meta_description TEXT,
  search_keywords TEXT[] DEFAULT '{}',
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template building sessions for auto-save
CREATE TABLE marketplace_template_builder_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  -- Session state
  current_step TEXT DEFAULT 'components',
  session_data JSONB DEFAULT '{}'::jsonb,
  
  -- Auto-save tracking
  last_auto_save TIMESTAMPTZ DEFAULT NOW(),
  auto_save_count INTEGER DEFAULT 0,
  manual_save_count INTEGER DEFAULT 0,
  
  -- Session metadata
  browser_info JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, creator_id)
);

-- Template analytics and performance tracking
CREATE TABLE marketplace_template_analytics (
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  date DATE NOT NULL,
  
  -- View and engagement metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  preview_opens INTEGER DEFAULT 0,
  demo_interactions INTEGER DEFAULT 0,
  
  -- Conversion metrics
  purchase_attempts INTEGER DEFAULT 0,
  successful_purchases INTEGER DEFAULT 0,
  purchase_conversion_rate DECIMAL(5,4) DEFAULT 0,
  
  -- User engagement
  avg_time_on_page INTEGER DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5,4) DEFAULT 0,
  feature_clicks JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (template_id, date)
);

-- Indexes for performance
CREATE INDEX idx_template_drafts_creator ON marketplace_template_drafts(creator_id, status);
CREATE INDEX idx_template_drafts_category ON marketplace_template_drafts(primary_category, status);
CREATE INDEX idx_template_drafts_published ON marketplace_template_drafts(status, published_at) WHERE status = 'published';
CREATE INDEX idx_template_versions_template ON marketplace_template_versions(template_id, version_number);
CREATE INDEX idx_template_components_template ON marketplace_template_components(template_id, component_type);
CREATE INDEX idx_template_components_order ON marketplace_template_components(template_id, display_order);
CREATE INDEX idx_template_analytics_date ON marketplace_template_analytics(date, template_id);
```

## API Endpoint Design

```typescript
// Template builder interfaces
interface TemplatePackage {
  id: string;
  creator_id: string;
  metadata: {
    title: string;
    description: string;
    tagline: string;
    primary_category: string;
    secondary_categories: string[];
    vendor_types: string[];
    wedding_types: string[];
    tags: string[];
  };
  components: TemplateComponent[];
  dependencies: TemplateDependency[];
  pricing: {
    base_price_cents: number;
    bundle_discount_percent?: number;
    early_bird_price_cents?: number;
    early_bird_expires_at?: string;
  };
  preview: TemplatePreview;
  status: 'draft' | 'review' | 'published' | 'suspended' | 'archived';
  version: string;
}

interface TemplateComponent {
  id: string;
  component_type: 'form' | 'journey' | 'email_sequence' | 'document' | 'automation';
  component_name: string;
  description: string;
  display_order: number;
  source_component_id?: string;
  sanitized_data: any;
  required_fields: string[];
  required_integrations: string[];
  estimated_setup_minutes: number;
  complexity_score: number;
  usage_frequency: 'always' | 'optional' | 'conditional';
}

interface TemplateDependency {
  dependency_type: 'field' | 'integration' | 'module' | 'tier';
  dependency_name: string;
  description: string;
  is_required: boolean;
  minimum_version?: string;
  setup_instructions?: string;
}

interface TemplatePreview {
  preview_images: string[];
  demo_video_url?: string;
  demo_data: any;
  feature_list: string[];
  benefits_list: string[];
  use_cases: string[];
  interactive_demo_enabled: boolean;
  sandbox_demo_url?: string;
}

interface TemplateVersion {
  id: string;
  version_number: string;
  version_type: 'major' | 'minor' | 'patch';
  changelog_title: string;
  changelog_description: string;
  breaking_changes: boolean;
  new_features: string[];
  improvements: string[];
  bug_fixes: string[];
  created_at: string;
  auto_upgrade_eligible: boolean;
}

// POST /api/marketplace/templates/builder/create
interface CreateTemplateRequest {
  title: string;
  primary_category: string;
  vendor_types: string[];
  initial_components?: string[]; // IDs of existing forms/journeys to start with
}

interface CreateTemplateResponse {
  success: boolean;
  template_id: string;
  builder_session_id: string;
  template: TemplatePackage;
}

// POST /api/marketplace/templates/builder/:templateId/components
interface AddComponentRequest {
  component_type: 'form' | 'journey' | 'email_sequence';
  source_component_id: string;
  component_name?: string;
  description?: string;
}

interface AddComponentResponse {
  success: boolean;
  component: TemplateComponent;
  sanitization_results: {
    sanitized_fields: number;
    removed_personal_data: string[];
    placeholder_data_added: string[];
  };
  dependencies_detected: TemplateDependency[];
}

// PUT /api/marketplace/templates/builder/:templateId/auto-save
interface AutoSaveRequest {
  session_id: string;
  current_step: string;
  template_data: Partial<TemplatePackage>;
  component_changes?: Array<{
    component_id: string;
    action: 'add' | 'update' | 'remove';
    data?: any;
  }>;
}

interface AutoSaveResponse {
  success: boolean;
  saved_at: string;
  next_auto_save_in: number; // seconds
}

// POST /api/marketplace/templates/builder/:templateId/generate-preview
interface GeneratePreviewRequest {
  include_demo_data: boolean;
  generate_screenshots: boolean;
  create_interactive_demo: boolean;
}

interface GeneratePreviewResponse {
  success: boolean;
  preview: TemplatePreview;
  generation_time_ms: number;
  demo_url?: string;
}

// POST /api/marketplace/templates/builder/:templateId/validate
interface ValidateTemplateResponse {
  success: boolean;
  is_valid: boolean;
  validation_results: {
    component_validation: Array<{
      component_id: string;
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>;
    dependency_validation: {
      missing_dependencies: string[];
      version_conflicts: string[];
      tier_requirements_met: boolean;
    };
    metadata_validation: {
      required_fields_complete: boolean;
      pricing_valid: boolean;
      category_appropriate: boolean;
    };
  };
  estimated_setup_time: number;
  complexity_score: number;
}

// POST /api/marketplace/templates/builder/:templateId/publish
interface PublishTemplateRequest {
  version_type: 'major' | 'minor' | 'patch';
  changelog_title: string;
  changelog_description: string;
  breaking_changes: boolean;
  new_features: string[];
  improvements: string[];
}

interface PublishTemplateResponse {
  success: boolean;
  published_template_id: string;
  version_number: string;
  marketplace_url: string;
  moderation_required: boolean;
  estimated_review_time?: string;
}

// GET /api/marketplace/templates/builder/:templateId/versions
interface GetVersionsResponse {
  success: boolean;
  versions: TemplateVersion[];
  current_version: string;
  total_purchases: number;
  purchaser_notifications_pending: number;
}
```

## React Components Architecture

```typescript
// Template Builder Main Interface
interface TemplateBuilderProps {
  templateId?: string; // For editing existing template
  creatorId: string;
}

export function TemplateBuilder({ templateId, creatorId }: TemplateBuilderProps) {
  const [template, setTemplate] = useState<TemplatePackage | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('components');
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const steps = [
    { id: 'components', title: 'Add Components', icon: '🧩' },
    { id: 'metadata', title: 'Template Details', icon: '📝' },
    { id: 'pricing', title: 'Pricing & Options', icon: '💰' },
    { id: 'preview', title: 'Preview & Demo', icon: '👀' },
    { id: 'review', title: 'Review & Publish', icon: '🚀' }
  ];

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (template && !autoSaving) {
        await performAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [template, autoSaving]);

  const performAutoSave = async () => {
    setAutoSaving(true);
    try {
      await fetch(`/api/marketplace/templates/builder/${template!.id}/auto-save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'current-session',
          current_step: currentStep,
          template_data: template
        })
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleStepChange = (stepId: string) => {
    setCurrentStep(stepId);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'components':
        return <ComponentsStep template={template} onUpdate={setTemplate} />;
      case 'metadata':
        return <MetadataStep template={template} onUpdate={setTemplate} />;
      case 'pricing':
        return <PricingStep template={template} onUpdate={setTemplate} />;
      case 'preview':
        return <PreviewStep template={template} onUpdate={setTemplate} />;
      case 'review':
        return <ReviewStep template={template} onPublish={handlePublish} />;
      default:
        return null;
    }
  };

  const handlePublish = async (publishData: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/templates/builder/${template!.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to published template
        window.location.href = data.marketplace_url;
      }
    } catch (error) {
      console.error('Failed to publish template:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with progress */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Template Builder</h1>
              {autoSaving && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Spinner className="w-4 h-4" />
                  <span>Auto-saving...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={performAutoSave}>
                Save Draft
              </Button>
              <Button 
                onClick={() => setCurrentStep('review')}
                disabled={currentStep === 'review'}
              >
                Publish Template
              </Button>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-8 pb-4">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepChange(step.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

// Components Selection Step
interface ComponentsStepProps {
  template: TemplatePackage | null;
  onUpdate: (template: TemplatePackage) => void;
}

export function ComponentsStep({ template, onUpdate }: ComponentsStepProps) {
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<TemplateComponent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [componentType, setComponentType] = useState<string>('all');

  const fetchAvailableComponents = async () => {
    try {
      const response = await fetch(`/api/forms-journeys/available-for-templating`);
      const data = await response.json();
      setAvailableComponents(data.components);
    } catch (error) {
      console.error('Failed to fetch components:', error);
    }
  };

  useEffect(() => {
    fetchAvailableComponents();
  }, []);

  const handleAddComponent = async (component: any) => {
    try {
      const response = await fetch(`/api/marketplace/templates/builder/${template!.id}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_type: component.type,
          source_component_id: component.id,
          component_name: component.title
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedComponents(prev => [...prev, data.component]);
        
        // Update template with new component
        const updatedTemplate = {
          ...template!,
          components: [...(template?.components || []), data.component]
        };
        onUpdate(updatedTemplate);
      }
    } catch (error) {
      console.error('Failed to add component:', error);
    }
  };

  const handleRemoveComponent = (componentId: string) => {
    const updatedComponents = selectedComponents.filter(c => c.id !== componentId);
    setSelectedComponents(updatedComponents);
    
    const updatedTemplate = {
      ...template!,
      components: updatedComponents
    };
    onUpdate(updatedTemplate);
  };

  const filteredComponents = availableComponents.filter(component => {
    const matchesSearch = component.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = componentType === 'all' || component.type === componentType;
    const notAlreadySelected = !selectedComponents.some(sc => sc.source_component_id === component.id);
    
    return matchesSearch && matchesType && notAlreadySelected;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Available Components */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-4">Add Components to Your Template</h2>
            
            {/* Search and Filter */}
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search forms, journeys, and emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={componentType}
                onChange={(e) => setComponentType(e.target.value)}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="form">Forms</option>
                <option value="journey">Journeys</option>
                <option value="email_sequence">Email Sequences</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {filteredComponents.map((component) => (
                <div key={component.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">
                          {component.type.replace('_', ' ')}
                        </Badge>
                        <h3 className="font-medium">{component.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {component.description || 'No description available'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Used {component.usage_count || 0} times</span>
                        <span>Last updated {formatDate(component.updated_at)}</span>
                        {component.complexity_score && (
                          <span>Complexity: {component.complexity_score}/10</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddComponent(component)}
                      className="ml-4"
                    >
                      Add to Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredComponents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || componentType !== 'all' 
                  ? 'No components match your search criteria'
                  : 'No components available for templating'
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Components */}
      <div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Template Components</h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedComponents.length} component{selectedComponents.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          
          <div className="p-6">
            {selectedComponents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🧩</span>
                </div>
                <p>No components added yet</p>
                <p className="text-xs mt-1">Select components from the left to build your template</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedComponents.map((component, index) => (
                  <div key={component.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}.
                          </span>
                          <Badge variant="outline" size="sm">
                            {component.component_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm">{component.component_name}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {component.description}
                        </p>
                        {component.estimated_setup_minutes > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            ~{component.estimated_setup_minutes} min setup
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveComponent(component.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedComponents.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-blue-800 mb-1">Template Summary</div>
                  <div className="text-blue-700 space-y-1">
                    <div>Total components: {selectedComponents.length}</div>
                    <div>
                      Estimated setup: {selectedComponents.reduce((sum, c) => sum + c.estimated_setup_minutes, 0)} minutes
                    </div>
                    <div>
                      Complexity: {Math.round(selectedComponents.reduce((sum, c) => sum + c.complexity_score, 0) / selectedComponents.length)}/10
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Metadata Step
interface MetadataStepProps {
  template: TemplatePackage | null;
  onUpdate: (template: TemplatePackage) => void;
}

export function MetadataStep({ template, onUpdate }: MetadataStepProps) {
  const [formData, setFormData] = useState({
    title: template?.metadata.title || '',
    description: template?.metadata.description || '',
    tagline: template?.metadata.tagline || '',
    primary_category: template?.metadata.primary_category || '',
    vendor_types: template?.metadata.vendor_types || [],
    wedding_types: template?.metadata.wedding_types || [],
    tags: template?.metadata.tags || []
  });

  const categoryOptions = [
    'Wedding Planning', 'Photography', 'Videography', 'Venue Management',
    'Catering', 'Floral Design', 'Music & Entertainment', 'Transportation',
    'Hair & Makeup', 'Stationery', 'Decor & Styling', 'Officiant Services'
  ];

  const vendorTypeOptions = [
    'Wedding Planners', 'Photographers', 'Videographers', 'Venues',
    'Caterers', 'Florists', 'DJs & Musicians', 'Hair & Makeup Artists',
    'Transportation Services', 'Officiants', 'Decorators', 'Stationery Designers'
  ];

  const weddingTypeOptions = [
    'Traditional', 'Destination', 'Elopement', 'Cultural Ceremonies',
    'Outdoor', 'Indoor', 'Beach', 'Garden', 'Rustic', 'Modern'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedTemplate = {
      ...template!,
      metadata: {
        ...template!.metadata,
        ...formData
      }
    };
    
    onUpdate(updatedTemplate);
  };

  const handleArrayFieldChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof typeof prev] as string[];
      const newArray = checked 
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Template Details & Metadata</h2>
          <p className="text-sm text-gray-600 mt-1">
            Provide information that helps buyers understand and find your template
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Template Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Complete Wedding Photography Client Journey"
                required
                maxLength={100}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Template Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="A short, compelling tagline for your template"
                maxLength={60}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.tagline.length}/60 characters
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Template Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe what this template includes, how it helps, and what makes it special..."
                required
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Category *
              </label>
              <select
                value={formData.primary_category}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_category: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Target Vendor Types * (Who is this template for?)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vendorTypeOptions.map(vendorType => (
                <label key={vendorType} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.vendor_types.includes(vendorType)}
                    onChange={(e) => handleArrayFieldChange('vendor_types', vendorType, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{vendorType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Wedding Types */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Wedding Types (Optional - specific wedding styles this template works best for)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {weddingTypeOptions.map(weddingType => (
                <label key={weddingType} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.wedding_types.includes(weddingType)}
                    onChange={(e) => handleArrayFieldChange('wedding_types', weddingType, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{weddingType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Search Tags (Optional - help buyers find your template)
            </label>
            <input
              type="text"
              placeholder="Enter tags separated by commas (e.g., forms, automation, client management)"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value && !formData.tags.includes(value)) {
                    setFormData(prev => ({
                      ...prev,
                      tags: [...prev.tags, value]
                    }));
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            
            {formData.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        }));
                      }}
                      className="ml-1 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button type="submit" className="px-6">
              Save Metadata & Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Core Services Implementation

```typescript
// Template builder service
export class TemplateBuilderService {
  async createTemplate(creatorId: string, templateData: any): Promise<TemplatePackage> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    const { data: template, error } = await supabase
      .from('marketplace_template_drafts')
      .insert({
        creator_id: creatorId,
        template_title: templateData.title,
        primary_category: templateData.primary_category,
        vendor_types: templateData.vendor_types,
        package_data: {
          metadata: templateData,
          components: [],
          dependencies: [],
          pricing: {}
        },
        builder_step: 'components',
        completion_percentage: 10
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize builder session
    await this.createBuilderSession(template.id, creatorId);

    return this.buildTemplateResponse(template);
  }

  async addComponent(
    templateId: string, 
    componentData: {
      component_type: string;
      source_component_id: string;
      component_name?: string;
    }
  ): Promise<{ component: TemplateComponent; sanitization_results: any; dependencies: any[] }> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Fetch original component
    const originalComponent = await this.fetchOriginalComponent(
      componentData.source_component_id,
      componentData.component_type
    );

    // Sanitize component data
    const sanitizer = new TemplateSanitizer();
    const sanitizationResults = await sanitizer.sanitizeComponent(originalComponent);

    // Extract dependencies
    const dependencies = await this.extractDependencies(originalComponent);

    // Create template component record
    const { data: component, error } = await supabase
      .from('marketplace_template_components')
      .insert({
        template_id: templateId,
        component_type: componentData.component_type,
        component_name: componentData.component_name || originalComponent.title,
        source_component_id: componentData.source_component_id,
        sanitized_data: sanitizationResults.sanitized_data,
        original_data_hash: sanitizationResults.data_hash,
        required_fields: dependencies.required_fields,
        required_integrations: dependencies.required_integrations,
        estimated_setup_minutes: this.estimateSetupTime(originalComponent),
        complexity_score: this.calculateComplexity(originalComponent),
        display_order: await this.getNextDisplayOrder(templateId)
      })
      .select()
      .single();

    if (error) throw error;

    // Update template completion percentage
    await this.updateTemplateProgress(templateId);

    return {
      component: this.buildComponentResponse(component),
      sanitization_results: sanitizationResults,
      dependencies: dependencies.detected_dependencies
    };
  }

  async generatePreview(templateId: string, options: any): Promise<TemplatePreview> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get template and components
    const { data: template } = await supabase
      .from('marketplace_template_drafts')
      .select(`
        *,
        marketplace_template_components (*)
      `)
      .eq('id', templateId)
      .single();

    if (!template) throw new Error('Template not found');

    // Generate preview assets
    const previewGenerator = new TemplatePreviewGenerator();
    
    const preview = await previewGenerator.generatePreview({
      template,
      include_demo_data: options.include_demo_data,
      generate_screenshots: options.generate_screenshots,
      create_interactive_demo: options.create_interactive_demo
    });

    // Save preview to database
    await supabase
      .from('marketplace_template_previews')
      .upsert({
        template_id: templateId,
        preview_images: preview.preview_images,
        demo_data: preview.demo_data,
        feature_list: preview.feature_list,
        benefits_list: preview.benefits_list,
        use_cases: preview.use_cases,
        interactive_demo_enabled: options.create_interactive_demo,
        sandbox_demo_url: preview.sandbox_demo_url
      }, {
        onConflict: 'template_id'
      });

    return preview;
  }

  async publishTemplate(
    templateId: string,
    publishData: {
      version_type: string;
      changelog_title: string;
      changelog_description: string;
      breaking_changes: boolean;
      new_features: string[];
      improvements: string[];
    }
  ): Promise<{ published_template_id: string; version_number: string; moderation_required: boolean }> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Validate template before publishing
    const validation = await this.validateTemplate(templateId);
    if (!validation.is_valid) {
      throw new Error(`Template validation failed: ${validation.validation_results}`);
    }

    // Generate version number
    const versionNumber = await this.generateVersionNumber(templateId, publishData.version_type);

    // Create version record
    const { data: version } = await supabase
      .from('marketplace_template_versions')
      .insert({
        template_id: templateId,
        version_number: versionNumber,
        version_type: publishData.version_type,
        changelog_title: publishData.changelog_title,
        changelog_description: publishData.changelog_description,
        breaking_changes: publishData.breaking_changes,
        new_features: publishData.new_features,
        improvements: publishData.improvements,
        package_data_snapshot: await this.getTemplatePackageSnapshot(templateId),
        created_by: await this.getTemplateCreatorId(templateId)
      })
      .select()
      .single();

    // Update template status
    const moderationRequired = await this.requiresModeration(templateId);
    
    await supabase
      .from('marketplace_template_drafts')
      .update({
        status: moderationRequired ? 'review' : 'published',
        published_at: new Date().toISOString(),
        last_published_version: versionNumber
      })
      .eq('id', templateId);

    return {
      published_template_id: templateId,
      version_number: versionNumber,
      moderation_required: moderationRequired
    };
  }

  private async requiresModeration(templateId: string): Promise<boolean> {
    // Check if creator needs manual review (new creator, low quality score, etc.)
    const { supabase } = await createRouteHandlerClient({ cookies });

    const { data: template } = await supabase
      .from('marketplace_template_drafts')
      .select(`
        creator_id,
        suppliers (
          marketplace_creator_commission_tiers (
            total_marketplace_sales,
            current_tier
          )
        )
      `)
      .eq('id', templateId)
      .single();

    // New creators (less than 3 published templates) require manual review
    const creatorStats = template.suppliers.marketplace_creator_commission_tiers;
    return !creatorStats || creatorStats.total_marketplace_sales < 3;
  }
}

// Template sanitization service
export class TemplateSanitizer {
  async sanitizeComponent(component: any): Promise<{
    sanitized_data: any;
    data_hash: string;
    removed_personal_data: string[];
    placeholder_data_added: string[];
  }> {
    const sanitized = structuredClone(component);
    const removedData: string[] = [];
    const placeholderData: string[] = [];

    switch (component.type) {
      case 'form':
        return this.sanitizeForm(sanitized, removedData, placeholderData);
      case 'journey':
        return this.sanitizeJourney(sanitized, removedData, placeholderData);
      case 'email_sequence':
        return this.sanitizeEmailSequence(sanitized, removedData, placeholderData);
      default:
        throw new Error(`Unsupported component type: ${component.type}`);
    }
  }

  private async sanitizeForm(form: any, removedData: string[], placeholderData: string[]): Promise<any> {
    // Remove client-specific data
    delete form.client_id;
    delete form.supplier_id;
    delete form.created_for_client;
    removedData.push('client_id', 'supplier_id', 'created_for_client');

    // Sanitize form fields
    if (form.fields) {
      form.fields = form.fields.map((field: any) => {
        // Replace real values with placeholders
        if (field.default_value) {
          field.default_value = this.generatePlaceholderValue(field.type);
          placeholderData.push(`${field.label} default value`);
        }

        // Sanitize field options
        if (field.options) {
          field.options = field.options.map((option: any) => ({
            ...option,
            value: this.sanitizeOptionValue(option.value, field.type)
          }));
        }

        // Remove any client-specific metadata
        delete field.client_data;
        delete field.submission_data;

        return field;
      });
    }

    // Generate data hash for change detection
    const dataHash = await this.generateDataHash(form);

    return {
      sanitized_data: form,
      data_hash: dataHash,
      removed_personal_data: removedData,
      placeholder_data_added: placeholderData
    };
  }

  private generatePlaceholderValue(fieldType: string): string {
    const placeholders: Record<string, string> = {
      'email': 'client@example.com',
      'phone': '+44 7700 900000',
      'text': 'Sample text value',
      'textarea': 'Sample description or notes',
      'name': 'Client Name',
      'venue': 'Example Venue Name',
      'date': new Date().toISOString().split('T')[0],
      'time': '14:00',
      'number': '100',
      'currency': '1000',
      'address': '123 Example Street, Example City',
      'url': 'https://example.com'
    };

    return placeholders[fieldType] || 'Sample value';
  }

  private sanitizeOptionValue(value: string, fieldType: string): string {
    // For certain field types, replace real values with generic ones
    if (fieldType === 'vendor_select') {
      return 'Example Vendor Name';
    }
    if (fieldType === 'location_select') {
      return 'Example Location';
    }
    
    return value; // Keep original for generic options
  }

  private async generateDataHash(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Template preview generator
export class TemplatePreviewGenerator {
  async generatePreview(options: {
    template: any;
    include_demo_data: boolean;
    generate_screenshots: boolean;
    create_interactive_demo: boolean;
  }): Promise<TemplatePreview> {
    const { template } = options;

    // Generate feature list from components
    const featureList = this.extractFeatureList(template.marketplace_template_components);
    
    // Generate benefits and use cases
    const benefitsList = this.generateBenefitsList(template);
    const useCases = this.generateUseCases(template);

    // Generate demo data if requested
    let demoData = {};
    if (options.include_demo_data) {
      demoData = await this.generateDemoData(template.marketplace_template_components);
    }

    // Generate screenshots if requested
    let previewImages: string[] = [];
    if (options.generate_screenshots) {
      previewImages = await this.generateScreenshots(template);
    }

    // Create interactive demo if requested
    let sandboxDemoUrl: string | undefined;
    if (options.create_interactive_demo) {
      sandboxDemoUrl = await this.createInteractiveDemo(template);
    }

    return {
      preview_images: previewImages,
      demo_data: demoData,
      feature_list: featureList,
      benefits_list: benefitsList,
      use_cases: useCases,
      interactive_demo_enabled: options.create_interactive_demo,
      sandbox_demo_url: sandboxDemoUrl
    };
  }

  private extractFeatureList(components: any[]): string[] {
    const features: string[] = [];

    components.forEach(component => {
      switch (component.component_type) {
        case 'form':
          features.push(`${component.component_name} Form`);
          if (component.sanitized_data.fields?.length > 5) {
            features.push('Comprehensive data collection');
          }
          if (component.sanitized_data.validation_rules) {
            features.push('Built-in validation rules');
          }
          break;
        case 'journey':
          features.push(`${component.component_name} Workflow`);
          if (component.sanitized_data.automation_triggers) {
            features.push('Automated workflow triggers');
          }
          if (component.sanitized_data.conditional_logic) {
            features.push('Smart conditional logic');
          }
          break;
        case 'email_sequence':
          features.push(`${component.component_name} Email Sequence`);
          features.push('Professional email templates');
          if (component.sanitized_data.personalization) {
            features.push('Personalized messaging');
          }
          break;
      }
    });

    return [...new Set(features)]; // Remove duplicates
  }

  private generateBenefitsList(template: any): string[] {
    const benefits = [
      'Save hours of setup time',
      'Proven workflow from successful wedding professionals',
      'Ready-to-use forms and processes',
      'Professional client communication',
      'Streamlined business operations'
    ];

    // Add category-specific benefits
    const categoryBenefits: Record<string, string[]> = {
      'Photography': ['Efficient client onboarding', 'Organized shot planning', 'Smooth gallery delivery'],
      'Wedding Planning': ['Complete timeline management', 'Vendor coordination', 'Client milestone tracking'],
      'Venue Management': ['Event setup optimization', 'Resource scheduling', 'Guest accommodation management']
    };

    const categorySpecificBenefits = categoryBenefits[template.primary_category];
    if (categorySpecificBenefits) {
      benefits.push(...categorySpecificBenefits);
    }

    return benefits;
  }

  private generateUseCases(template: any): string[] {
    const useCases = [
      'New wedding professionals setting up their first workflows',
      'Established vendors looking to optimize their processes',
      'Teams wanting standardized procedures',
      'Professionals expanding to new service areas'
    ];

    return useCases;
  }
}
```

## Integration Points

### Integration with WS-031 (Forms System)
```typescript
// Template builder integrates with existing forms
export class FormsTemplateIntegration {
  async getAvailableFormsForTemplating(creatorId: string): Promise<any[]> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get forms that can be templated (active, not client-specific)
    const { data: forms } = await supabase
      .from('forms')
      .select('*')
      .eq('supplier_id', creatorId)
      .eq('status', 'active')
      .is('client_id', null) // Generic forms only
      .order('updated_at', { ascending: false });

    return forms?.map(form => ({
      id: form.id,
      type: 'form',
      title: form.title,
      description: form.description,
      usage_count: form.usage_count || 0,
      complexity_score: this.calculateFormComplexity(form),
      updated_at: form.updated_at
    })) || [];
  }

  private calculateFormComplexity(form: any): number {
    let complexity = 1;
    
    if (form.fields) {
      complexity += Math.min(form.fields.length * 0.5, 5);
    }
    
    if (form.validation_rules) {
      complexity += 2;
    }
    
    if (form.conditional_logic) {
      complexity += 3;
    }
    
    return Math.min(Math.round(complexity), 10);
  }
}
```

### MCP Database Operations
```typescript
// Use PostgreSQL MCP for complex template analytics
export async function getTemplateBuilderAnalytics(): Promise<any> {
  const query = `
    SELECT 
      DATE_TRUNC('week', created_at) as week,
      COUNT(*) as templates_created,
      COUNT(CASE WHEN status = 'published' THEN 1 END) as templates_published,
      AVG(component_count) as avg_components,
      AVG(completion_percentage) as avg_completion_rate
    FROM marketplace_template_drafts 
    WHERE created_at >= NOW() - INTERVAL '12 weeks'
    GROUP BY week 
    ORDER BY week DESC
  `;

  return await executePostgreSQLQuery(query);
}
```

## Test Requirements

### Unit Tests
```typescript
describe('TemplateBuilderService', () => {
  it('should create a new template draft', async () => {
    const service = new TemplateBuilderService();
    
    const template = await service.createTemplate('creator-id', {
      title: 'Test Template',
      primary_category: 'Photography',
      vendor_types: ['Photographers']
    });
    
    expect(template.metadata.title).toBe('Test Template');
    expect(template.status).toBe('draft');
  });

  it('should add and sanitize components', async () => {
    const service = new TemplateBuilderService();
    
    const result = await service.addComponent('template-id', {
      component_type: 'form',
      source_component_id: 'form-id',
      component_name: 'Test Form'
    });
    
    expect(result.component.component_name).toBe('Test Form');
    expect(result.sanitization_results.removed_personal_data).toContain('client_id');
  });
});

describe('TemplateSanitizer', () => {
  it('should remove personal data from forms', async () => {
    const sanitizer = new TemplateSanitizer();
    
    const formWithPersonalData = {
      client_id: 'client-123',
      fields: [
        { type: 'email', default_value: 'real@email.com' }
      ]
    };
    
    const result = await sanitizer.sanitizeComponent(formWithPersonalData);
    
    expect(result.sanitized_data.client_id).toBeUndefined();
    expect(result.sanitized_data.fields[0].default_value).toBe('client@example.com');
  });
});
```

### Integration Tests
```typescript
describe('Template Builder Integration', () => {
  it('should complete full template creation workflow', async () => {
    const builderService = new TemplateBuilderService();
    
    // Create template
    const template = await builderService.createTemplate('creator-id', {
      title: 'Complete Test Template'
    });
    
    // Add components
    await builderService.addComponent(template.id, {
      component_type: 'form',
      source_component_id: 'test-form'
    });
    
    // Generate preview
    const preview = await builderService.generatePreview(template.id, {
      include_demo_data: true,
      generate_screenshots: false,
      create_interactive_demo: false
    });
    
    expect(preview.feature_list.length).toBeGreaterThan(0);
    
    // Publish template
    const published = await builderService.publishTemplate(template.id, {
      version_type: 'major',
      changelog_title: 'Initial release'
    });
    
    expect(published.version_number).toBe('1.0.0');
  });
});
```

## Acceptance Criteria

- [x] **Visual Template Builder**: Drag-and-drop interface for creating template packages
- [x] **Component Integration**: Seamless integration with existing forms, journeys, and emails
- [x] **Content Sanitization**: Automatic removal of personal data and client information
- [x] **Preview Generation**: Automatic preview creation with demo data and screenshots
- [x] **Version Control**: Complete versioning system with changelog and upgrade notifications
- [x] **Auto-Save**: Automatic saving during template creation process
- [x] **Dependency Detection**: Automatic detection and documentation of template requirements
- [x] **Pricing Configuration**: Flexible pricing options including bundles and early bird pricing
- [x] **Publishing Workflow**: Validation and publishing process with moderation for new creators
- [x] **Template Analytics**: Performance tracking for template engagement and conversions

## Deployment Notes

1. **Component Access**: Configure access to existing forms and journeys for templating
2. **Sanitization Rules**: Set up content sanitization rules and placeholder data
3. **Preview Generation**: Configure preview generation and screenshot capture
4. **Moderation Queue**: Set up review process for new creator templates
5. **Version Notifications**: Configure notification system for template updates

---

**Specification Status**: ✅ Complete  
**Implementation Priority**: High (Marketplace Core)  
**Estimated Effort**: 12-15 developer days  
**Dependencies**: WS-031 (Forms System), WS-110 (Creator Onboarding)