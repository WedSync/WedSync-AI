# WedSync Advanced Form Builder - Technical Documentation

## Architecture Overview

The Advanced Form Builder is a comprehensive React-based form creation and submission system designed specifically for the wedding industry. It provides drag-and-drop form building, complex conditional logic, CRM integration, and real-time analytics.

### Core Components

```typescript
// Main form builder architecture
FormBuilder/
├── components/
│   ├── FormBuilder.tsx          // Main form builder interface
│   ├── FieldPalette.tsx         // Drag-and-drop field types
│   ├── FormCanvas.tsx           // Form building area
│   ├── FieldRenderer.tsx        // Individual field rendering
│   ├── ConditionalLogicEngine.tsx // Logic processing
│   └── FormPreview.tsx          // Live form preview
├── hooks/
│   ├── useFormBuilder.ts        // Form state management
│   ├── useConditionalLogic.ts   // Conditional logic processing
│   ├── useDragDrop.ts           // Drag and drop functionality
│   └── useFormValidation.ts     // Validation engine
├── types/
│   ├── form.types.ts            // TypeScript definitions
│   ├── field.types.ts           // Field type definitions
│   └── validation.types.ts      // Validation schemas
└── utils/
    ├── formSerializer.ts        // Form data serialization
    ├── validationEngine.ts      // Field validation logic
    └── crmIntegration.ts        // CRM sync utilities
```

### Technology Stack

- **Frontend Framework**: Next.js 15.4.3 with App Router
- **UI Library**: React 19.1.1 with Server Components
- **Drag & Drop**: @dnd-kit/core with accessibility support
- **State Management**: Zustand 5.0.7 + TanStack Query 5.85.0
- **Form Handling**: React Hook Form 7.62.0 + Zod 4.0.17
- **Database**: Supabase PostgreSQL 15 with Row Level Security
- **Real-time**: Supabase Realtime for collaborative editing
- **File Storage**: Supabase Storage with CDN
- **Styling**: Tailwind CSS 4.1.11 with Untitled UI components

## Database Schema

### Core Tables

```sql
-- Forms table - stores form definitions
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  status form_status NOT NULL DEFAULT 'draft',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Form fields - stores individual field definitions
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type field_type_enum NOT NULL,
  field_order INTEGER NOT NULL,
  required BOOLEAN DEFAULT false,
  field_options JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  conditional_logic JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions - stores submitted form data
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id),
  submission_data JSONB NOT NULL,
  submitter_email TEXT,
  submitter_ip INET,
  submission_metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM sync status tracking
CREATE TABLE crm_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES form_submissions(id),
  crm_type TEXT NOT NULL, -- 'tave', 'honeybook', 'lightblue'
  sync_status sync_status_enum NOT NULL DEFAULT 'pending',
  crm_record_id TEXT,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Types

```sql
-- Form status enumeration
CREATE TYPE form_status AS ENUM ('draft', 'published', 'archived', 'paused');

-- Field types supported
CREATE TYPE field_type_enum AS ENUM (
  'text', 'email', 'phone', 'number', 'date', 'time', 'datetime',
  'select', 'radio', 'checkbox', 'textarea', 'file', 'signature',
  'address', 'payment', 'wedding_date', 'guest_count'
);

-- Sync status tracking
CREATE TYPE sync_status_enum AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'retry'
);
```

### Indexes for Performance

```sql
-- Form queries
CREATE INDEX idx_forms_organization_status ON forms(organization_id, status);
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);

-- Form fields
CREATE INDEX idx_form_fields_form_id_order ON form_fields(form_id, field_order);

-- Submissions
CREATE INDEX idx_submissions_form_created ON form_submissions(form_id, created_at DESC);
CREATE INDEX idx_submissions_email ON form_submissions(submitter_email);

-- CRM sync
CREATE INDEX idx_crm_sync_status ON crm_sync_status(sync_status, last_sync_attempt);
CREATE INDEX idx_crm_sync_submission ON crm_sync_status(submission_id);
```

## API Endpoints

### Form Management

```typescript
// GET /api/forms - List forms for organization
interface ListFormsResponse {
  forms: Form[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// POST /api/forms - Create new form
interface CreateFormRequest {
  name: string;
  description?: string;
  template_id?: string;
}

interface CreateFormResponse {
  form: Form;
  fields: FormField[];
}

// GET /api/forms/[id] - Get form details
interface GetFormResponse {
  form: Form;
  fields: FormField[];
  analytics: FormAnalytics;
}

// PUT /api/forms/[id] - Update form
interface UpdateFormRequest {
  name?: string;
  description?: string;
  status?: FormStatus;
  settings?: FormSettings;
  fields?: FormField[];
}

// DELETE /api/forms/[id] - Delete form (soft delete)
interface DeleteFormResponse {
  success: boolean;
  archived_at: string;
}
```

### Form Submission

```typescript
// POST /api/forms/[id]/submit - Submit form data
interface SubmitFormRequest {
  data: Record<string, any>;
  metadata?: {
    source?: string;
    referrer?: string;
    user_agent?: string;
  };
}

interface SubmitFormResponse {
  success: boolean;
  submission_id: string;
  redirect_url?: string;
  message?: string;
}

// GET /api/forms/[id]/submissions - List submissions
interface ListSubmissionsResponse {
  submissions: FormSubmission[];
  pagination: PaginationInfo;
  analytics: SubmissionAnalytics;
}
```

### CRM Integration

```typescript
// POST /api/crm/sync - Manual CRM sync
interface CRMSyncRequest {
  submission_id: string;
  crm_type: 'tave' | 'honeybook' | 'lightblue';
  force_resync?: boolean;
}

interface CRMSyncResponse {
  success: boolean;
  crm_record_id?: string;
  sync_status: SyncStatus;
  error_message?: string;
}

// GET /api/crm/status/[submission_id] - Check sync status
interface CRMSyncStatusResponse {
  submission_id: string;
  syncs: Array<{
    crm_type: string;
    status: SyncStatus;
    crm_record_id?: string;
    last_attempt: string;
    error_message?: string;
  }>;
}
```

### Analytics

```typescript
// GET /api/forms/[id]/analytics - Form performance metrics
interface FormAnalyticsResponse {
  form_id: string;
  date_range: {
    start: string;
    end: string;
  };
  metrics: {
    views: number;
    starts: number;
    completions: number;
    conversion_rate: number;
    average_completion_time: number;
    drop_off_points: Array<{
      field_name: string;
      drop_off_rate: number;
    }>;
  };
  device_breakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  source_breakdown: {
    [source: string]: number;
  };
}
```

## Field Types and Configuration

### Standard Field Types

```typescript
interface BaseField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  description?: string;
  placeholder?: string;
  conditional_logic?: ConditionalLogic;
}

interface TextField extends BaseField {
  type: 'text';
  validation: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

interface EmailField extends BaseField {
  type: 'email';
  validation: {
    custom_domains?: string[];
    blocked_domains?: string[];
  };
}

interface SelectField extends BaseField {
  type: 'select';
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  multiple?: boolean;
}

interface FileField extends BaseField {
  type: 'file';
  settings: {
    accept: string;
    max_size: number; // bytes
    max_files: number;
    storage_path: string;
  };
}
```

### Wedding-Specific Field Types

```typescript
interface WeddingDateField extends BaseField {
  type: 'wedding_date';
  validation: {
    min_advance_days?: number; // e.g., 180 days minimum
    blackout_dates?: string[]; // dates not available
    preferred_seasons?: string[];
  };
  integration: {
    check_vendor_availability?: boolean;
    sync_with_calendar?: boolean;
  };
}

interface GuestCountField extends BaseField {
  type: 'guest_count';
  validation: {
    min_guests?: number;
    max_guests?: number;
    venue_capacity_check?: boolean;
  };
  pricing: {
    price_breaks?: Array<{
      min_guests: number;
      multiplier: number;
    }>;
  };
}
```

## Conditional Logic Engine

### Logic Configuration

```typescript
interface ConditionalLogic {
  conditions: LogicCondition[];
  action: LogicAction;
  operator: 'AND' | 'OR'; // For multiple conditions
}

interface LogicCondition {
  field_name: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value: any;
}

interface LogicAction {
  type: 'show' | 'hide' | 'require' | 'set_value' | 'skip_to';
  target_fields?: string[];
  value?: any;
}
```

### Logic Processing

```typescript
class ConditionalLogicEngine {
  private formData: Record<string, any>;
  private fieldLogic: Map<string, ConditionalLogic>;

  evaluateConditions(fieldName: string): boolean {
    const logic = this.fieldLogic.get(fieldName);
    if (!logic) return true;

    const results = logic.conditions.map(condition => 
      this.evaluateCondition(condition)
    );

    return logic.operator === 'AND' 
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  private evaluateCondition(condition: LogicCondition): boolean {
    const fieldValue = this.formData[condition.field_name];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      // ... other operators
      default:
        return false;
    }
  }

  applyAction(fieldName: string): void {
    const logic = this.fieldLogic.get(fieldName);
    if (!logic || !this.evaluateConditions(fieldName)) return;

    switch (logic.action.type) {
      case 'show':
        this.showFields(logic.action.target_fields);
        break;
      case 'require':
        this.requireFields(logic.action.target_fields);
        break;
      // ... other actions
    }
  }
}
```

## Validation Engine

### Field Validation

```typescript
interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

class FormValidationEngine {
  private rules: Map<string, ValidationRule[]>;

  validateField(fieldName: string, value: any): ValidationResult {
    const fieldRules = this.rules.get(fieldName) || [];
    const errors: string[] = [];

    for (const rule of fieldRules) {
      const result = this.applyRule(rule, value);
      if (!result.valid) {
        errors.push(result.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private applyRule(rule: ValidationRule, value: any): RuleResult {
    switch (rule.type) {
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
          message: rule.message
        };
      
      case 'min_length':
        return {
          valid: String(value).length >= rule.value,
          message: rule.message
        };
      
      case 'pattern':
        const regex = new RegExp(rule.value);
        return {
          valid: regex.test(String(value)),
          message: rule.message
        };
      
      default:
        return { valid: true, message: '' };
    }
  }

  validateForm(formData: Record<string, any>): FormValidationResult {
    const fieldErrors: Record<string, string[]> = {};
    let isValid = true;

    for (const [fieldName, value] of Object.entries(formData)) {
      const result = this.validateField(fieldName, value);
      if (!result.valid) {
        fieldErrors[fieldName] = result.errors;
        isValid = false;
      }
    }

    return {
      valid: isValid,
      fieldErrors
    };
  }
}
```

### Wedding-Specific Validation

```typescript
class WeddingValidationRules {
  static weddingDateValidation(date: string, advanceDays: number = 180): ValidationResult {
    const weddingDate = new Date(date);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + advanceDays);

    if (weddingDate < minDate) {
      return {
        valid: false,
        errors: [`Wedding date must be at least ${advanceDays} days in advance`]
      };
    }

    // Check if date falls on popular wedding days
    const dayOfWeek = weddingDate.getDay();
    if (dayOfWeek === 6) { // Saturday
      return {
        valid: true,
        errors: [],
        warnings: ['Saturday weddings book quickly - consider backup dates']
      };
    }

    return { valid: true, errors: [] };
  }

  static guestCountValidation(count: number, venueCapacity?: number): ValidationResult {
    if (count < 1) {
      return {
        valid: false,
        errors: ['Guest count must be at least 1']
      };
    }

    if (venueCapacity && count > venueCapacity) {
      return {
        valid: false,
        errors: [`Guest count exceeds venue capacity of ${venueCapacity}`]
      };
    }

    return { valid: true, errors: [] };
  }
}
```

## CRM Integration Implementation

### Tave Integration

```typescript
class TaveIntegration implements CRMIntegration {
  private apiKey: string;
  private baseURL = 'https://api.tave.com';

  async syncFormSubmission(submission: FormSubmission): Promise<CRMSyncResult> {
    try {
      const taveContact = this.mapFormDataToTave(submission.data);
      
      const response = await fetch(`${this.baseURL}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taveContact)
      });

      if (!response.ok) {
        throw new Error(`Tave API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        crm_record_id: result.id,
        sync_timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        sync_timestamp: new Date().toISOString()
      };
    }
  }

  private mapFormDataToTave(formData: any): TaveContact {
    return {
      first_name: formData.primary_contact?.split(' ')[0] || formData.bride_name,
      last_name: formData.primary_contact?.split(' ').slice(1).join(' ') || formData.groom_name,
      email: formData.email,
      phone: formData.phone,
      wedding_date: formData.wedding_date,
      venue: formData.venue_name,
      guest_count: parseInt(formData.guest_count) || 0,
      budget: formData.photography_budget,
      notes: [
        formData.special_requirements,
        formData.additional_notes,
        `Source: WedSync Form - ${formData.form_name}`
      ].filter(Boolean).join('\n'),
      tags: this.generateTags(formData),
      source: 'WedSync Advanced Form Builder'
    };
  }

  private generateTags(formData: any): string[] {
    const tags = ['wedding'];
    
    if (formData.wedding_type) tags.push(formData.wedding_type);
    if (formData.photography_style) tags.push(formData.photography_style);
    if (formData.engagement_session === 'yes') tags.push('engagement');
    if (parseInt(formData.guest_count) > 200) tags.push('large-wedding');
    
    return tags;
  }
}
```

### HoneyBook Integration

```typescript
class HoneyBookIntegration implements CRMIntegration {
  private accessToken: string;
  private baseURL = 'https://api.honeybook.com';

  async syncFormSubmission(submission: FormSubmission): Promise<CRMSyncResult> {
    try {
      const honeyBookLead = this.mapFormDataToHoneyBook(submission.data);
      
      const response = await fetch(`${this.baseURL}/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(honeyBookLead)
      });

      if (!response.ok) {
        throw new Error(`HoneyBook API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Auto-create project if high-value lead
      if (this.isHighValueLead(submission.data)) {
        await this.createProject(result.id, submission.data);
      }
      
      return {
        success: true,
        crm_record_id: result.id,
        sync_timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        sync_timestamp: new Date().toISOString()
      };
    }
  }

  private mapFormDataToHoneyBook(formData: any): HoneyBookLead {
    return {
      contact: {
        firstName: formData.primary_contact?.split(' ')[0] || formData.bride_name,
        lastName: formData.primary_contact?.split(' ').slice(1).join(' ') || formData.groom_name,
        email: formData.email,
        phone: formData.phone
      },
      event: {
        date: formData.wedding_date,
        venue: formData.venue_name,
        guestCount: parseInt(formData.guest_count) || 0,
        type: 'wedding'
      },
      budget: this.parseBudget(formData.total_budget || formData.photography_budget),
      notes: formData.special_requirements || formData.additional_notes,
      source: 'WedSync Advanced Form Builder',
      customFields: this.extractCustomFields(formData)
    };
  }

  private isHighValueLead(formData: any): boolean {
    const budget = this.parseBudget(formData.total_budget || formData.photography_budget);
    const guestCount = parseInt(formData.guest_count) || 0;
    const isDestination = formData.wedding_type === 'destination';
    
    return budget > 5000 || guestCount > 150 || isDestination;
  }
}
```

## Performance Optimization

### Form Rendering Optimization

```typescript
// Virtual scrolling for large forms
import { FixedSizeList as List } from 'react-window';

const VirtualizedFormBuilder: React.FC<{ fields: FormField[] }> = ({ fields }) => {
  const renderField = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <FieldRenderer field={fields[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={fields.length}
      itemSize={80}
      itemData={fields}
    >
      {renderField}
    </List>
  );
};

// Memoized field components
const FieldRenderer = React.memo<{ field: FormField }>(({ field }) => {
  const fieldProps = useFieldProps(field);
  
  return (
    <div className="form-field">
      <FieldComponent {...fieldProps} />
    </div>
  );
});

// Debounced form saves
const useAutoSave = (formData: any, delay: number = 2000) => {
  const debouncedSave = useMemo(
    () => debounce(async (data: any) => {
      await saveFormDraft(data);
    }, delay),
    [delay]
  );

  useEffect(() => {
    debouncedSave(formData);
    
    return () => {
      debouncedSave.cancel();
    };
  }, [formData, debouncedSave]);
};
```

### Database Optimization

```sql
-- Materialized view for form analytics
CREATE MATERIALIZED VIEW form_analytics_mv AS
SELECT 
  f.id as form_id,
  f.name,
  COUNT(DISTINCT fs.id) as total_submissions,
  COUNT(DISTINCT CASE WHEN fs.created_at > NOW() - INTERVAL '30 days' THEN fs.id END) as submissions_30d,
  AVG(EXTRACT(EPOCH FROM (fs.created_at - fs.started_at))) as avg_completion_time,
  COUNT(DISTINCT fs.submitter_email) as unique_submitters
FROM forms f
LEFT JOIN form_submissions fs ON f.id = fs.form_id
WHERE f.status = 'published'
GROUP BY f.id, f.name;

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_form_analytics()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY form_analytics_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time updates
CREATE TRIGGER refresh_analytics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON form_submissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_form_analytics();

-- Partition large tables by date
CREATE TABLE form_submissions_partitioned (
  LIKE form_submissions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE form_submissions_2024_01 PARTITION OF form_submissions_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Security Implementation

### Input Sanitization

```typescript
import DOMPurify from 'dompurify';
import { z } from 'zod';

// Input validation schemas
const FormDataSchema = z.object({
  primary_contact: z.string().min(1).max(100),
  email: z.string().email(),
  wedding_date: z.string().datetime(),
  guest_count: z.number().min(1).max(1000),
  special_requirements: z.string().max(1000).optional()
});

class SecurityService {
  static sanitizeInput(input: string): string {
    // Remove potentially dangerous HTML
    const cleaned = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
    
    // Additional sanitization for form data
    return cleaned
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static validateFormSubmission(data: any): ValidationResult {
    try {
      const validatedData = FormDataSchema.parse(data);
      
      // Additional wedding-specific validation
      if (validatedData.wedding_date) {
        const weddingDate = new Date(validatedData.wedding_date);
        const today = new Date();
        
        if (weddingDate < today) {
          throw new Error('Wedding date cannot be in the past');
        }
      }
      
      return {
        valid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return {
        valid: false,
        data: null,
        errors: error instanceof z.ZodError 
          ? error.errors.map(e => e.message)
          : [error.message]
      };
    }
  }
}
```

### Row Level Security

```sql
-- Enable RLS on all form tables
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Form access policies
CREATE POLICY "Users can view own organization forms" ON forms
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forms in own organization" ON forms
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'editor')
    )
  );

-- Submission access policies
CREATE POLICY "Users can view submissions for own forms" ON form_submissions
  FOR SELECT USING (
    form_id IN (
      SELECT f.id FROM forms f
      JOIN user_organizations uo ON f.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

-- Public submission policy (for form filling)
CREATE POLICY "Anyone can submit to published forms" ON form_submissions
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT id FROM forms WHERE status = 'published'
    )
  );
```

## Testing Strategy

### Unit Tests

```typescript
// Form validation tests
describe('FormValidationEngine', () => {
  let validator: FormValidationEngine;

  beforeEach(() => {
    validator = new FormValidationEngine();
  });

  test('should validate required fields', () => {
    const rules = new Map([
      ['email', [{ type: 'required', message: 'Email is required' }]]
    ]);
    validator.setRules(rules);

    const result = validator.validateField('email', '');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Email is required');
  });

  test('should validate email format', () => {
    const rules = new Map([
      ['email', [{ type: 'pattern', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Invalid email' }]]
    ]);
    validator.setRules(rules);

    const result = validator.validateField('email', 'invalid-email');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid email');
  });
});

// Conditional logic tests
describe('ConditionalLogicEngine', () => {
  let engine: ConditionalLogicEngine;

  beforeEach(() => {
    engine = new ConditionalLogicEngine();
  });

  test('should show field when condition is met', () => {
    const logic = {
      conditions: [{ field_name: 'wedding_type', operator: 'equals', value: 'destination' }],
      action: { type: 'show', target_fields: ['travel_details'] },
      operator: 'AND'
    };

    engine.setFormData({ wedding_type: 'destination' });
    engine.setFieldLogic('travel_details', logic);

    expect(engine.evaluateConditions('travel_details')).toBe(true);
  });
});
```

### Integration Tests

```typescript
// CRM integration tests
describe('TaveIntegration', () => {
  let taveIntegration: TaveIntegration;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    taveIntegration = new TaveIntegration('test-api-key');
  });

  test('should sync form submission to Tave', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'tave-123' })
    } as Response);

    const submission = {
      data: {
        primary_contact: 'John Doe',
        email: 'john@example.com',
        wedding_date: '2024-08-15'
      }
    };

    const result = await taveIntegration.syncFormSubmission(submission);
    
    expect(result.success).toBe(true);
    expect(result.crm_record_id).toBe('tave-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.tave.com/contacts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        })
      })
    );
  });
});
```

### End-to-End Tests

```typescript
// Playwright E2E tests
import { test, expect } from '@playwright/test';

test.describe('Form Builder E2E', () => {
  test('should create and publish a photography form', async ({ page }) => {
    await page.goto('/forms/new');
    
    // Create form
    await page.fill('[data-testid="form-name"]', 'Photography Consultation');
    
    // Add fields
    await page.click('[data-testid="field-type-text"]');
    await page.fill('[data-testid="field-label"]', 'Primary Contact');
    await page.click('[data-testid="save-field"]');
    
    // Add conditional logic
    await page.click('[data-testid="field-type-select"]');
    await page.fill('[data-testid="field-label"]', 'Wedding Type');
    await page.click('[data-testid="add-conditional-logic"]');
    
    // Publish form
    await page.click('[data-testid="publish-form"]');
    
    // Verify form is live
    const formUrl = await page.textContent('[data-testid="form-url"]');
    await page.goto(formUrl!);
    
    expect(await page.textContent('h1')).toBe('Photography Consultation');
  });

  test('should submit form and sync to CRM', async ({ page }) => {
    await page.goto('/forms/photography-consultation-123');
    
    // Fill form
    await page.fill('[name="primary_contact"]', 'Sarah Johnson');
    await page.fill('[name="email"]', 'sarah@example.com');
    await page.selectOption('[name="wedding_type"]', 'local');
    
    // Submit
    await page.click('[type="submit"]');
    
    // Verify success
    await expect(page.getByText('Thank you for your submission')).toBeVisible();
    
    // Check CRM sync (would need CRM API mocking)
    await expect(page.getByText('Syncing to your CRM...')).toBeVisible();
    await expect(page.getByText('Successfully synced to Tave')).toBeVisible();
  });
});
```

## Deployment and Monitoring

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Monitoring and Observability

```typescript
// Performance monitoring
import { performance } from 'perf_hooks';

class FormBuilderMetrics {
  static trackFormRenderTime(formId: string, fieldCount: number) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Send to monitoring service
        this.sendMetric('form.render.duration', renderTime, {
          form_id: formId,
          field_count: fieldCount,
          performance_tier: this.getPerformanceTier(renderTime)
        });
      }
    };
  }

  static trackSubmissionProcessing(submissionId: string) {
    const startTime = performance.now();
    
    return {
      end: (success: boolean, crmSynced: boolean) => {
        const processingTime = performance.now() - startTime;
        
        this.sendMetric('form.submission.processing', processingTime, {
          submission_id: submissionId,
          success,
          crm_synced: crmSynced
        });
      }
    };
  }

  private static getPerformanceTier(renderTime: number): string {
    if (renderTime < 100) return 'excellent';
    if (renderTime < 500) return 'good';
    if (renderTime < 1000) return 'fair';
    return 'poor';
  }

  private static sendMetric(name: string, value: number, tags: Record<string, any>) {
    // Send to your monitoring service (DataDog, New Relic, etc.)
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value, tags, timestamp: Date.now() })
    });
  }
}

// Error tracking
class ErrorTracker {
  static trackFormError(error: Error, context: {
    form_id?: string;
    field_name?: string;
    user_id?: string;
    action: string;
  }) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    };

    // Send to error tracking service
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  }
}
```

---

## API Rate Limiting

```typescript
// Rate limiting implementation
import { Redis } from 'ioredis';

class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async checkLimit(
    identifier: string, 
    windowMs: number, 
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const window = Math.floor(Date.now() / windowMs);
    const windowKey = `${key}:${window}`;

    const current = await this.redis.incr(windowKey);
    
    if (current === 1) {
      await this.redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    const remaining = Math.max(0, maxRequests - current);
    const resetTime = (window + 1) * windowMs;

    return {
      allowed: current <= maxRequests,
      remaining,
      resetTime
    };
  }
}

// Apply rate limiting to form submissions
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimiter = new RateLimiter();
  
  // 5 submissions per minute per IP
  const { allowed, remaining, resetTime } = await rateLimiter.checkLimit(
    ip, 
    60 * 1000, // 1 minute
    5 // max requests
  );

  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        }
      }
    );
  }

  // Process form submission...
}
```

This technical documentation provides a comprehensive foundation for developers working with the WedSync Advanced Form Builder system. It covers architecture, implementation details, security considerations, and operational practices needed to maintain and extend the system effectively.