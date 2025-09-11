# WS-342: Advanced Form Builder Engine

## Feature ID
**WS-342**

## Feature Name  
**Advanced Form Builder Engine**

## Feature Type
**Core Platform Feature - Form Creation & Management**

## User Stories

### Supplier User Story
> **As Sarah, a wedding photographer,**  
> I want to create sophisticated client intake forms with conditional logic, multi-step workflows, and smart field types, so that I can collect exactly the information I need based on each client's wedding type and automatically route them through the perfect onboarding experience.

### Business User Story  
> **As the WedSync platform,**  
> I need to provide suppliers with enterprise-grade form building capabilities that rival standalone form builders, so that they see WedSync as their complete business solution rather than just another vendor directory.

### Client Experience Story
> **As Emma, a bride filling out vendor forms,**  
> I want forms that remember my wedding details, show me only relevant questions, and guide me through the process step-by-step, so that I can provide complete information without feeling overwhelmed or repeating myself.

## Core Requirements

### 1. Drag-and-Drop Form Builder
- **Visual Form Editor**: Intuitive drag-and-drop interface for form creation
- **Real-Time Preview**: Live preview of form as it's being built
- **Template Library**: Pre-built form templates for different vendor types
- **Responsive Design**: Automatic mobile optimization for all forms

### 2. Advanced Field Types & Logic
- **Smart Field Types**: Text, email, phone, date, time, file upload, signature, payment
- **Conditional Logic**: Show/hide fields based on previous answers
- **Multi-Step Workflows**: Break complex forms into manageable steps
- **Field Dependencies**: Auto-populate fields based on other field values

### 3. Integration & Automation
- **CRM Auto-Sync**: Automatic synchronization with connected CRM systems
- **Webhook Integration**: Real-time form submission notifications
- **Email Automation**: Triggered email sequences based on form responses
- **Calendar Integration**: Auto-schedule consultations based on form submission

### 4. Analytics & Optimization
- **Completion Analytics**: Track form abandonment and completion rates
- **A/B Testing**: Test different form versions for optimal conversion
- **Response Analytics**: Analyze client responses for business insights
- **Performance Monitoring**: Track form load times and user experience metrics

## Database Schema

### Core Form Structure

```sql
-- Main forms table
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    form_name TEXT NOT NULL,
    form_description TEXT,
    form_type TEXT NOT NULL CHECK (form_type IN 
        ('intake', 'questionnaire', 'booking', 'contract', 'payment', 'feedback')),
    
    -- Form configuration
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    requires_authentication BOOLEAN DEFAULT false,
    max_submissions INTEGER, -- NULL for unlimited
    submission_count INTEGER DEFAULT 0,
    
    -- Design and behavior
    theme_id UUID REFERENCES form_themes(id),
    custom_css TEXT,
    completion_redirect_url TEXT,
    thank_you_message TEXT,
    
    -- Advanced settings
    allows_multiple_submissions BOOLEAN DEFAULT false,
    auto_save_progress BOOLEAN DEFAULT true,
    submission_deadline TIMESTAMPTZ,
    notification_email TEXT,
    
    -- SEO and sharing
    meta_title TEXT,
    meta_description TEXT,
    social_image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (supplier_id, is_active),
    INDEX (form_type, is_active)
);

-- Form fields with advanced configuration
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN 
        ('text', 'textarea', 'email', 'phone', 'number', 'date', 'time', 'datetime',
         'select', 'multiselect', 'radio', 'checkbox', 'file_upload', 'signature',
         'address', 'payment', 'rating', 'slider', 'matrix', 'section_break')),
    
    -- Field configuration
    is_required BOOLEAN DEFAULT false,
    placeholder_text TEXT,
    help_text TEXT,
    default_value TEXT,
    
    -- Field constraints
    min_length INTEGER,
    max_length INTEGER,
    min_value NUMERIC,
    max_value NUMERIC,
    validation_pattern TEXT, -- Regex pattern
    validation_message TEXT,
    
    -- Field options for select/radio/checkbox
    field_options JSONB DEFAULT '[]', -- [{value, label, color, icon}]
    allow_other_option BOOLEAN DEFAULT false,
    
    -- File upload specific
    accepted_file_types TEXT[], -- ['jpg', 'png', 'pdf']
    max_file_size_mb INTEGER DEFAULT 10,
    max_file_count INTEGER DEFAULT 1,
    
    -- Layout and display
    field_order INTEGER NOT NULL,
    field_width TEXT DEFAULT 'full' CHECK (field_width IN ('full', 'half', 'third', 'quarter')),
    is_hidden BOOLEAN DEFAULT false,
    
    -- Conditional logic
    conditional_logic JSONB DEFAULT '{}', -- Complex visibility rules
    
    -- Integration mappings
    crm_field_mapping TEXT,
    calendar_field_mapping TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (form_id, field_order),
    INDEX (form_id, is_required)
);

-- Form logic and workflows
CREATE TABLE form_logic_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN 
        ('show_field', 'hide_field', 'require_field', 'skip_page', 'redirect', 'calculate', 'send_email')),
    
    -- Condition configuration
    trigger_conditions JSONB NOT NULL, -- Complex condition logic
    action_configuration JSONB NOT NULL, -- What happens when triggered
    
    -- Rule metadata
    is_active BOOLEAN DEFAULT true,
    execution_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (form_id, is_active, execution_order)
);
```

### Form Submissions & Analytics

```sql
-- Form submissions
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Submission data
    submission_data JSONB NOT NULL, -- All field responses
    submission_status TEXT DEFAULT 'completed' CHECK (submission_status IN 
        ('draft', 'in_progress', 'completed', 'abandoned')),
    
    -- Submission metadata
    submitted_from_ip INET,
    user_agent TEXT,
    referrer_url TEXT,
    submission_source TEXT, -- 'direct', 'email', 'social', 'website'
    
    -- Timing information
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_to_complete_seconds INTEGER,
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_notes TEXT,
    
    -- Integration status
    synced_to_crm BOOLEAN DEFAULT false,
    crm_sync_id TEXT,
    email_notifications_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (form_id, submission_status, created_at DESC),
    INDEX (supplier_id, created_at DESC),
    INDEX (couple_id),
    INDEX (completed_at DESC) WHERE completed_at IS NOT NULL
);

-- Form analytics and performance tracking
CREATE TABLE form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    date_period DATE NOT NULL,
    
    -- View and engagement metrics
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_starts INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    
    -- Conversion metrics
    view_to_start_rate NUMERIC(5,4), -- % who started after viewing
    start_to_completion_rate NUMERIC(5,4), -- % who completed after starting
    overall_conversion_rate NUMERIC(5,4), -- % who completed from total views
    
    -- Time metrics
    average_completion_time_seconds INTEGER,
    median_completion_time_seconds INTEGER,
    bounce_rate NUMERIC(5,4), -- % who left without interacting
    
    -- Device and source analytics
    mobile_completion_rate NUMERIC(5,4),
    desktop_completion_rate NUMERIC(5,4),
    source_breakdown JSONB DEFAULT '{}', -- Traffic sources
    
    -- Field-specific analytics
    field_abandonment_points JSONB DEFAULT '[]', -- Where users drop off
    most_skipped_fields JSONB DEFAULT '[]',
    error_prone_fields JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (form_id, date_period),
    INDEX (date_period DESC)
);

-- Form A/B testing
CREATE TABLE form_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    variant_form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    
    test_name TEXT NOT NULL,
    test_hypothesis TEXT,
    test_status TEXT DEFAULT 'draft' CHECK (test_status IN 
        ('draft', 'running', 'paused', 'completed', 'cancelled')),
    
    -- Test configuration
    traffic_split NUMERIC(3,2) DEFAULT 0.5, -- 0.5 = 50/50 split
    minimum_sample_size INTEGER DEFAULT 100,
    confidence_level NUMERIC(3,2) DEFAULT 0.95,
    
    -- Test results
    statistical_significance NUMERIC(5,4),
    winner_form_id UUID,
    improvement_percentage NUMERIC(5,2),
    
    -- Test period
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (base_form_id),
    INDEX (test_status, started_at)
);
```

### Form Templates & Themes

```sql
-- Form templates for quick setup
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    template_description TEXT,
    vendor_type TEXT NOT NULL,
    category TEXT, -- 'popular', 'industry-specific', 'conversion-optimized'
    
    -- Template structure
    template_fields JSONB NOT NULL, -- Pre-configured field setup
    template_logic JSONB DEFAULT '{}', -- Pre-configured conditional logic
    template_settings JSONB DEFAULT '{}', -- Form configuration
    
    -- Template metadata
    usage_count INTEGER DEFAULT 0,
    average_completion_rate NUMERIC(5,4),
    is_premium BOOLEAN DEFAULT false,
    created_by_supplier_id UUID REFERENCES suppliers(id),
    
    -- Template status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (vendor_type, is_active),
    INDEX (category, is_featured),
    INDEX (usage_count DESC)
);

-- Form themes and styling
CREATE TABLE form_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name TEXT NOT NULL,
    theme_description TEXT,
    
    -- Theme styling
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#64748B',
    accent_color TEXT DEFAULT '#10B981',
    background_color TEXT DEFAULT '#FFFFFF',
    text_color TEXT DEFAULT '#1F2937',
    
    -- Typography
    font_family TEXT DEFAULT 'Inter',
    heading_font_size TEXT DEFAULT '1.5rem',
    body_font_size TEXT DEFAULT '1rem',
    
    -- Layout styling
    form_max_width TEXT DEFAULT '600px',
    field_spacing TEXT DEFAULT '1.5rem',
    border_radius TEXT DEFAULT '0.5rem',
    box_shadow TEXT DEFAULT '0 1px 3px rgba(0, 0, 0, 0.1)',
    
    -- Custom CSS
    custom_css TEXT,
    
    -- Theme metadata
    is_default BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (is_default, is_premium)
);
```

## API Endpoints

### Form Builder APIs

```typescript
// Form management
POST   /api/supplier/forms                     // Create new form
GET    /api/supplier/forms                     // Get supplier's forms
GET    /api/supplier/forms/:id                 // Get specific form
PUT    /api/supplier/forms/:id                 // Update form
DELETE /api/supplier/forms/:id                 // Delete form
POST   /api/supplier/forms/:id/duplicate       // Duplicate existing form

// Form structure
GET    /api/supplier/forms/:id/fields          // Get form fields
POST   /api/supplier/forms/:id/fields          // Add new field
PUT    /api/supplier/forms/:id/fields/:fieldId // Update field
DELETE /api/supplier/forms/:id/fields/:fieldId // Remove field
POST   /api/supplier/forms/:id/fields/reorder  // Reorder fields

// Form logic and rules
GET    /api/supplier/forms/:id/logic           // Get form logic rules
POST   /api/supplier/forms/:id/logic           // Add logic rule
PUT    /api/supplier/forms/:id/logic/:ruleId   // Update logic rule
DELETE /api/supplier/forms/:id/logic/:ruleId   // Remove logic rule

// Form templates
GET    /api/forms/templates                    // Get available templates
GET    /api/forms/templates/:id                // Get specific template
POST   /api/supplier/forms/from-template/:id   // Create form from template
```

### Form Submission APIs

```typescript
// Public form access (for clients filling forms)
GET    /api/forms/:id/public                   // Get public form structure
POST   /api/forms/:id/submit                   // Submit completed form
POST   /api/forms/:id/save-draft               // Save form progress
GET    /api/forms/:id/draft/:sessionId         // Retrieve saved draft

// Form submissions management (supplier)
GET    /api/supplier/forms/:id/submissions     // Get form submissions
GET    /api/supplier/submissions/:id           // Get specific submission
PUT    /api/supplier/submissions/:id/status    // Update submission status
DELETE /api/supplier/submissions/:id           // Delete submission
POST   /api/supplier/submissions/:id/process   // Process submission (CRM sync, etc.)

// Bulk operations
POST   /api/supplier/submissions/export        // Export submissions to CSV/Excel
POST   /api/supplier/submissions/bulk-process  // Bulk process multiple submissions
```

### Analytics & Testing APIs

```typescript
// Form analytics
GET    /api/supplier/forms/:id/analytics       // Get form performance analytics
GET    /api/supplier/forms/:id/analytics/realtime // Real-time analytics
GET    /api/supplier/analytics/overview        // Overview of all forms performance
GET    /api/supplier/analytics/abandonment     // Abandonment analysis

// A/B testing
POST   /api/supplier/forms/:id/ab-test         // Create A/B test
GET    /api/supplier/forms/:id/ab-tests        // Get form's A/B tests
PUT    /api/supplier/ab-tests/:testId          // Update A/B test
POST   /api/supplier/ab-tests/:testId/start    // Start A/B test
POST   /api/supplier/ab-tests/:testId/stop     // Stop A/B test
GET    /api/supplier/ab-tests/:testId/results  // Get test results
```

## Frontend Components

### Form Builder Interface

```typescript
// Main form builder component
const AdvancedFormBuilder: React.FC<{
    formId?: string;
    onSave?: (form: Form) => void;
}> = ({ formId, onSave }) => {
    const [form, setForm] = useState<Form>();
    const [selectedField, setSelectedField] = useState<FormField | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { data: formData, mutate } = useSWR(
        formId ? `/api/supplier/forms/${formId}` : null,
        fetcher
    );

    const fieldTypes = [
        { type: 'text', name: 'Text Input', icon: Type },
        { type: 'textarea', name: 'Text Area', icon: AlignLeft },
        { type: 'email', name: 'Email', icon: Mail },
        { type: 'phone', name: 'Phone', icon: Phone },
        { type: 'date', name: 'Date', icon: Calendar },
        { type: 'select', name: 'Dropdown', icon: ChevronDown },
        { type: 'radio', name: 'Multiple Choice', icon: Circle },
        { type: 'checkbox', name: 'Checkboxes', icon: Square },
        { type: 'file_upload', name: 'File Upload', icon: Upload },
        { type: 'signature', name: 'Signature', icon: Edit3 },
        { type: 'payment', name: 'Payment', icon: CreditCard },
        { type: 'section_break', name: 'Section Break', icon: Minus }
    ];

    const handleAddField = useCallback((fieldType: string) => {
        const newField: FormField = {
            id: generateId(),
            form_id: form?.id || '',
            field_name: `field_${Date.now()}`,
            field_label: getDefaultLabel(fieldType),
            field_type: fieldType,
            field_order: (form?.fields?.length || 0) + 1,
            is_required: false,
            field_width: 'full',
            field_options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox' 
                ? [{ value: 'option1', label: 'Option 1' }] 
                : [],
        };

        setForm(prev => ({
            ...prev!,
            fields: [...(prev?.fields || []), newField]
        }));
        setSelectedField(newField);
    }, [form]);

    const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<FormField>) => {
        setForm(prev => ({
            ...prev!,
            fields: prev!.fields!.map(field => 
                field.id === fieldId ? { ...field, ...updates } : field
            )
        }));
        
        if (selectedField?.id === fieldId) {
            setSelectedField(prev => prev ? { ...prev, ...updates } : null);
        }
    }, [selectedField]);

    const handleSaveForm = useCallback(async () => {
        if (!form) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`/api/supplier/forms${formId ? `/${formId}` : ''}`, {
                method: formId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (response.ok) {
                const savedForm = await response.json();
                mutate(savedForm);
                onSave?.(savedForm);
                toast.success('Form saved successfully!');
            }
        } catch (error) {
            toast.error('Failed to save form');
        } finally {
            setIsLoading(false);
        }
    }, [form, formId, onSave, mutate]);

    return (
        <div className="h-screen flex bg-gray-50">
            {/* Field Types Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Form Fields</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Drag fields to add them to your form
                    </p>
                </div>

                <div className="flex-1 p-4 space-y-2">
                    {fieldTypes.map(({ type, name, icon: Icon }) => (
                        <div
                            key={type}
                            className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            onClick={() => handleAddField(type)}
                        >
                            <Icon className="h-5 w-5 text-gray-500 mr-3" />
                            <span className="text-sm font-medium text-gray-700">{name}</span>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <Button
                        onClick={() => setPreviewMode(!previewMode)}
                        variant="outline"
                        className="w-full"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        {previewMode ? 'Edit Mode' : 'Preview'}
                    </Button>
                </div>
            </div>

            {/* Form Builder Area */}
            <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Input
                            placeholder="Form Name"
                            value={form?.form_name || ''}
                            onChange={(e) => setForm(prev => ({ ...prev!, form_name: e.target.value }))}
                            className="text-lg font-semibold border-none px-0 focus:ring-0"
                        />
                        <Badge variant="outline" className="ml-2">
                            {form?.fields?.length || 0} fields
                        </Badge>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                        <Button 
                            onClick={handleSaveForm}
                            disabled={isLoading}
                            size="sm"
                        >
                            {isLoading ? (
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Form
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex">
                    {/* Form Canvas */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {previewMode ? (
                            <FormPreview form={form} />
                        ) : (
                            <FormCanvas 
                                form={form}
                                selectedField={selectedField}
                                onFieldSelect={setSelectedField}
                                onFieldUpdate={handleFieldUpdate}
                                onFieldDelete={(fieldId) => {
                                    setForm(prev => ({
                                        ...prev!,
                                        fields: prev!.fields!.filter(f => f.id !== fieldId)
                                    }));
                                    if (selectedField?.id === fieldId) {
                                        setSelectedField(null);
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Field Properties Panel */}
                    {selectedField && !previewMode && (
                        <div className="w-80 bg-white border-l border-gray-200">
                            <FieldPropertiesPanel
                                field={selectedField}
                                onUpdate={(updates) => handleFieldUpdate(selectedField.id, updates)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
```

### Conditional Logic Builder

```typescript
// Advanced conditional logic configuration
const ConditionalLogicBuilder: React.FC<{
    form: Form;
    field: FormField;
    onUpdateLogic: (logic: ConditionalLogic) => void;
}> = ({ form, field, onUpdateLogic }) => {
    const [conditions, setConditions] = useState<LogicCondition[]>(
        field.conditional_logic?.conditions || []
    );
    const [action, setAction] = useState<LogicAction>(
        field.conditional_logic?.action || { type: 'show' }
    );

    const availableFields = form.fields?.filter(f => 
        f.id !== field.id && 
        f.field_order < field.field_order &&
        f.field_type !== 'section_break'
    ) || [];

    const handleAddCondition = () => {
        setConditions(prev => [...prev, {
            id: generateId(),
            field_id: '',
            operator: 'equals',
            value: ''
        }]);
    };

    const handleUpdateCondition = (conditionId: string, updates: Partial<LogicCondition>) => {
        setConditions(prev => prev.map(condition =>
            condition.id === conditionId ? { ...condition, ...updates } : condition
        ));
    };

    const handleSave = () => {
        const logic: ConditionalLogic = {
            conditions,
            action,
            logic_operator: conditions.length > 1 ? 'AND' : undefined
        };
        onUpdateLogic(logic);
    };

    return (
        <div className="space-y-6">
            <div>
                <Label className="text-sm font-medium text-gray-900">
                    Conditional Logic
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                    Show or hide this field based on other field values
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <Label className="text-sm font-medium">Action</Label>
                    <Select 
                        value={action.type} 
                        onValueChange={(value) => setAction({ type: value as any })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="show">Show this field</SelectItem>
                            <SelectItem value="hide">Hide this field</SelectItem>
                            <SelectItem value="require">Require this field</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="text-sm font-medium">When</Label>
                    <div className="space-y-3 mt-2">
                        {conditions.map((condition, index) => (
                            <div key={condition.id} className="flex items-center space-x-2">
                                {index > 0 && (
                                    <span className="text-xs font-medium text-gray-500 px-2">
                                        AND
                                    </span>
                                )}

                                <Select
                                    value={condition.field_id}
                                    onValueChange={(value) => handleUpdateCondition(condition.id, { field_id: value })}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFields.map(field => (
                                            <SelectItem key={field.id} value={field.id}>
                                                {field.field_label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={condition.operator}
                                    onValueChange={(value) => handleUpdateCondition(condition.id, { operator: value as any })}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="equals">equals</SelectItem>
                                        <SelectItem value="not_equals">not equals</SelectItem>
                                        <SelectItem value="contains">contains</SelectItem>
                                        <SelectItem value="is_empty">is empty</SelectItem>
                                        <SelectItem value="is_not_empty">is not empty</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    placeholder="Value"
                                    value={condition.value}
                                    onChange={(e) => handleUpdateCondition(condition.id, { value: e.target.value })}
                                    className="flex-1"
                                />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConditions(prev => prev.filter(c => c.id !== condition.id))}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddCondition}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Condition
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm">
                    Cancel
                </Button>
                <Button onClick={handleSave} size="sm">
                    Apply Logic
                </Button>
            </div>
        </div>
    );
};
```

## Implementation Code Examples

### Form Processing Service

```typescript
// Comprehensive form processing and submission handling
export class FormProcessingService {
    constructor(
        private supabase: SupabaseClient,
        private emailService: EmailService,
        private crmService: CRMService,
        private analyticsService: AnalyticsService
    ) {}

    async processFormSubmission(
        formId: string,
        submissionData: Record<string, any>,
        metadata: SubmissionMetadata
    ): Promise<FormSubmissionResult> {
        try {
            // Get form configuration
            const form = await this.getForm(formId);
            if (!form || !form.is_active) {
                throw new Error('Form not found or inactive');
            }

            // Validate submission against form schema
            const validationResult = await this.validateSubmission(form, submissionData);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    errors: validationResult.errors,
                    fieldErrors: validationResult.fieldErrors
                };
            }

            // Process conditional logic and calculate dependent fields
            const processedData = await this.applyFormLogic(form, submissionData);

            // Create submission record
            const submission = await this.createSubmission({
                form_id: formId,
                supplier_id: form.supplier_id,
                submission_data: processedData,
                submitted_from_ip: metadata.ipAddress,
                user_agent: metadata.userAgent,
                referrer_url: metadata.referrer,
                submission_source: metadata.source,
                started_at: metadata.startTime,
                completed_at: new Date().toISOString(),
                time_to_complete_seconds: metadata.completionTime
            });

            // Process integrations asynchronously
            this.processIntegrationsAsync(form, submission, processedData);

            // Update form analytics
            this.updateFormAnalytics(formId, metadata);

            return {
                success: true,
                submissionId: submission.id,
                redirectUrl: form.completion_redirect_url,
                message: form.thank_you_message || 'Thank you for your submission!'
            };

        } catch (error) {
            console.error('Form submission processing failed:', error);
            return {
                success: false,
                errors: ['An error occurred while processing your submission. Please try again.']
            };
        }
    }

    private async validateSubmission(
        form: Form,
        submissionData: Record<string, any>
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const fieldErrors: Record<string, string> = {};

        for (const field of form.fields || []) {
            const value = submissionData[field.field_name];

            // Required field validation
            if (field.is_required && this.isEmpty(value)) {
                fieldErrors[field.field_name] = `${field.field_label} is required`;
                continue;
            }

            // Skip further validation if field is empty and not required
            if (this.isEmpty(value)) continue;

            // Field type validation
            const typeValidation = this.validateFieldType(field, value);
            if (!typeValidation.isValid) {
                fieldErrors[field.field_name] = typeValidation.error!;
                continue;
            }

            // Field constraints validation
            const constraintValidation = this.validateFieldConstraints(field, value);
            if (!constraintValidation.isValid) {
                fieldErrors[field.field_name] = constraintValidation.error!;
            }

            // Custom validation patterns
            if (field.validation_pattern) {
                const regex = new RegExp(field.validation_pattern);
                if (!regex.test(String(value))) {
                    fieldErrors[field.field_name] = field.validation_message || 'Invalid format';
                }
            }
        }

        return {
            isValid: Object.keys(fieldErrors).length === 0 && errors.length === 0,
            errors,
            fieldErrors
        };
    }

    private async applyFormLogic(
        form: Form,
        submissionData: Record<string, any>
    ): Promise<Record<string, any>> {
        const processedData = { ...submissionData };

        // Get form logic rules
        const { data: logicRules } = await this.supabase
            .from('form_logic_rules')
            .select('*')
            .eq('form_id', form.id)
            .eq('is_active', true)
            .order('execution_order');

        for (const rule of logicRules || []) {
            if (this.evaluateRuleConditions(rule.trigger_conditions, processedData)) {
                processedData = await this.executeRuleAction(
                    rule.action_configuration,
                    processedData,
                    form
                );
            }
        }

        return processedData;
    }

    private async processIntegrationsAsync(
        form: Form,
        submission: FormSubmission,
        submissionData: Record<string, any>
    ): Promise<void> {
        // Process CRM integration
        if (form.supplier?.crm_integration_active) {
            try {
                await this.crmService.syncFormSubmission({
                    supplierId: form.supplier_id,
                    submissionData,
                    formType: form.form_type,
                    clientInfo: this.extractClientInfo(submissionData)
                });

                await this.supabase
                    .from('form_submissions')
                    .update({ synced_to_crm: true })
                    .eq('id', submission.id);
            } catch (error) {
                console.error('CRM sync failed:', error);
            }
        }

        // Send email notifications
        if (form.notification_email) {
            try {
                await this.emailService.sendFormSubmissionNotification({
                    to: form.notification_email,
                    formName: form.form_name,
                    submissionData,
                    submissionId: submission.id
                });

                await this.supabase
                    .from('form_submissions')
                    .update({ email_notifications_sent: true })
                    .eq('id', submission.id);
            } catch (error) {
                console.error('Email notification failed:', error);
            }
        }

        // Trigger automation workflows
        this.triggerAutomationWorkflows(form, submissionData);
    }

    async generateFormFromTemplate(
        supplierId: string,
        templateId: string,
        customizations: FormCustomizations = {}
    ): Promise<Form> {
        // Get template
        const { data: template } = await this.supabase
            .from('form_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (!template) {
            throw new Error('Template not found');
        }

        // Create form from template
        const form: Partial<Form> = {
            supplier_id: supplierId,
            form_name: customizations.name || `${template.template_name} - Copy`,
            form_description: customizations.description || template.template_description,
            form_type: template.vendor_type as any,
            ...template.template_settings,
            ...customizations.settings
        };

        const { data: createdForm } = await this.supabase
            .from('forms')
            .insert(form)
            .select()
            .single();

        // Create fields from template
        const templateFields = template.template_fields as FormField[];
        const fields = templateFields.map((field, index) => ({
            ...field,
            id: generateId(),
            form_id: createdForm.id,
            field_order: index + 1,
            ...customizations.fieldOverrides?.[field.field_name]
        }));

        await this.supabase
            .from('form_fields')
            .insert(fields);

        // Create logic rules from template
        if (template.template_logic && Object.keys(template.template_logic).length > 0) {
            const logicRules = this.convertTemplateLogicToRules(
                template.template_logic,
                createdForm.id,
                fields
            );

            if (logicRules.length > 0) {
                await this.supabase
                    .from('form_logic_rules')
                    .insert(logicRules);
            }
        }

        // Update template usage
        await this.supabase
            .from('form_templates')
            .update({ usage_count: template.usage_count + 1 })
            .eq('id', templateId);

        return { ...createdForm, fields };
    }

    async analyzeFormPerformance(formId: string): Promise<FormAnalytics> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get form analytics data
        const { data: analytics } = await this.supabase
            .from('form_analytics')
            .select('*')
            .eq('form_id', formId)
            .gte('date_period', thirtyDaysAgo.toISOString().split('T')[0]);

        // Get submission data for detailed analysis
        const { data: submissions } = await this.supabase
            .from('form_submissions')
            .select('*')
            .eq('form_id', formId)
            .gte('created_at', thirtyDaysAgo.toISOString());

        return {
            totalViews: analytics?.reduce((sum, a) => sum + a.total_views, 0) || 0,
            totalStarts: analytics?.reduce((sum, a) => sum + a.total_starts, 0) || 0,
            totalCompletions: analytics?.reduce((sum, a) => sum + a.total_completions, 0) || 0,
            conversionRate: this.calculateConversionRate(analytics || []),
            averageCompletionTime: this.calculateAverageCompletionTime(submissions || []),
            abandonmentPoints: this.identifyAbandonmentPoints(submissions || []),
            deviceBreakdown: this.analyzeDevicePerformance(analytics || []),
            timeToConvert: this.analyzeTimeToConvert(submissions || []),
            recommendations: this.generateOptimizationRecommendations(analytics || [], submissions || [])
        };
    }
}
```

## MCP Server Usage

### Development & Testing
- **Browser MCP**: Form builder UI testing, conditional logic validation, mobile form rendering
- **Playwright MCP**: Automated form submission testing, field validation, analytics accuracy
- **PostgreSQL MCP**: Form data integrity, submission processing, analytics calculations

### AI Enhancement
- **OpenAI MCP**: Form optimization suggestions, field naming improvements, completion rate analysis
- **Sequential Thinking MCP**: Complex conditional logic planning, form structure optimization
- **Context7 MCP**: Form builder library documentation, best practices research

### Integration & Analytics
- **Supabase MCP**: Real-time form analytics, submission event streaming, form sharing
- **Memory MCP**: Form template patterns, user behavior learning, optimization insights
- **Filesystem MCP**: Form template storage, submission exports, backup management

## Acceptance Criteria

### Form Builder Functionality
- [ ] Create forms with 15+ field types including advanced types (signature, payment, rating)
- [ ] Implement drag-and-drop interface with real-time preview
- [ ] Support conditional logic with multiple conditions and operators
- [ ] Enable multi-step form workflows with progress indicators

### Form Performance
- [ ] Form loading time under 2 seconds on 3G connections
- [ ] Support 1000+ concurrent form submissions without degradation
- [ ] Mobile form completion rate within 10% of desktop rates
- [ ] Form builder handles forms with 100+ fields smoothly

### Integration Capabilities
- [ ] Automatic CRM synchronization with 99.9% reliability
- [ ] Real-time email notifications within 30 seconds of submission
- [ ] Webhook delivery with retry logic and failure handling
- [ ] Calendar integration for automated appointment scheduling

### Analytics & Optimization
- [ ] Real-time analytics with less than 5-minute delay
- [ ] A/B testing framework with statistical significance calculations
- [ ] Abandonment tracking with field-level precision
- [ ] Optimization recommendations with actionable insights

## Dependencies

### Technical Dependencies
- **Database Schema**: Form structure, submissions, and analytics tables
- **File Upload System**: Document and image handling for form attachments
- **Email Service**: Automated notifications and form response delivery
- **Payment Integration**: Stripe connectivity for payment forms

### Business Dependencies
- **CRM Integrations**: API connections to Tave, Light Blue, HoneyBook
- **Template Library**: Pre-built form templates for different vendor types
- **Analytics Platform**: Performance tracking and optimization insights
- **User Management**: Supplier authentication and permission systems

## Effort Estimation

### Development Phase (4-5 weeks)
- **Core Form Builder**: 2 weeks
  - Drag-and-drop interface with field types
  - Real-time preview and form validation
  - Basic conditional logic implementation
- **Advanced Features**: 1.5 weeks
  - Multi-step workflows and complex logic
  - A/B testing framework
  - Template system and customization
- **Integrations**: 1 week
  - CRM synchronization and webhooks
  - Email automation and notifications
  - Calendar and third-party integrations
- **Analytics & Optimization**: 0.5 weeks
  - Performance tracking and reporting
  - Optimization recommendations engine

### Testing & Polish (1 week)
- **Form Builder Testing**: 3 days
- **Submission Processing**: 2 days  
- **Performance Optimization**: 2 days

**Total Estimated Effort: 5-6 weeks** (including comprehensive testing and integrations)

---

**Status**: Ready for Development  
**Priority**: Critical - Core Platform Feature  
**Technical Complexity**: High  
**Business Impact**: Very High - Core value proposition delivery

This Advanced Form Builder Engine transforms WedSync into a comprehensive form solution that rivals dedicated form builders while providing deep integration with wedding vendor workflows. The system's sophisticated conditional logic, real-time analytics, and seamless integrations create a powerful tool that suppliers will use daily and rely on for their business success.