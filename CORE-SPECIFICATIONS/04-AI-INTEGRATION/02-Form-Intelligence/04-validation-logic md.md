# 04-validation-logic.md

# Validation Logic System

## What to Build

Intelligent validation rule generator that creates appropriate field validation based on field types, wedding context, and extracted patterns from source forms.

## Key Technical Requirements

### Validation Rule Engine

```
interface ValidationRule {
  type: 'required' | 'format' | 'length' | 'range' | 'custom'
  value: any
  message: string
  priority: number
  weddingContext?: string
}

class ValidationGenerator {
  generateValidation(
    field: ExtractedField,
    fieldType: string,
    context: WeddingContext
  ): ValidationRule[] {
    const rules: ValidationRule[] = []
    
    // Base type validation
    rules.push(...this.getTypeValidation(fieldType))
    
    // Wedding-specific validation
    rules.push(...this.getWeddingValidation(field, context))
    
    // Extracted pattern validation
    rules.push(...this.getPatternValidation(field))
    
    return this.prioritizeRules(rules)
  }
}
```

### Wedding-Specific Validation

```
const WEDDING_VALIDATIONS = {
  wedding_date: {
    rules: [
      { type: 'required', message: 'Wedding date is required' },
      { type: 'format', value: 'date', message: 'Please enter a valid date' },
      { 
        type: 'custom', 
        validator: (date: Date) => date > new Date(),
        message: 'Wedding date must be in the future'
      },
      {
        type: 'custom',
        validator: (date: Date) => {
          const daysDiff = (date.getTime() - [Date.now](http://Date.now)()) / (1000 * 60 * 60 * 24)
          return daysDiff >= 30
        },
        message: 'Wedding should be at least 30 days away for proper planning'
      }
    ]
  },
  
  guest_count: {
    rules: [
      { type: 'required', message: 'Guest count helps with planning' },
      { type: 'range', value: { min: 1, max: 1000 }, message: 'Guest count must be between 1 and 1000' },
      {
        type: 'custom',
        validator: (count: number) => Number.isInteger(count),
        message: 'Guest count must be a whole number'
      }
    ]
  },
  
  couple_names: {
    rules: [
      { type: 'required', message: 'Couple names are required' },
      { type: 'length', value: { min: 2, max: 100 }, message: 'Names must be 2-100 characters' },
      {
        type: 'custom',
        validator: (name: string) => !/\d/.test(name),
        message: 'Names should not contain numbers'
      }
    ]
  }
}

class WeddingValidationGenerator {
  getWeddingValidation(
    field: ExtractedField,
    context: WeddingContext
  ): ValidationRule[] {
    const rules: ValidationRule[] = []
    
    // Core field validation
    if (field.mappedToCoreField) {
      const coreValidation = WEDDING_VALIDATIONS[field.mappedToCoreField]
      if (coreValidation) {
        rules.push(...coreValidation.rules)
      }
    }
    
    // Vendor-specific validation
    rules.push(...this.getVendorSpecificValidation(field, context.vendorType))
    
    // Cross-field validation
    rules.push(...this.getCrossFieldValidation(field, context))
    
    return rules
  }
}
```

## Critical Implementation Notes

### Pattern-Based Validation Detection

```
class PatternValidationExtractor {
  extractFromSource(field: ExtractedField): ValidationRule[] {
    const rules: ValidationRule[] = []
    const text = `${field.label} ${field.context} ${field.placeholder}`.toLowerCase()
    
    // Required field detection
    if (this.isRequired(text)) {
      rules.push({
        type: 'required',
        value: true,
        message: 'This field is required',
        priority: 1
      })
    }
    
    // Length limits
    const lengthLimit = this.extractLengthLimit(text)
    if (lengthLimit) {
      rules.push({
        type: 'length',
        value: { max: lengthLimit },
        message: `Maximum ${lengthLimit} characters`,
        priority: 2
      })
    }
    
    // Format validation
    const formatRule = this.extractFormatValidation(field)
    if (formatRule) {
      rules.push(formatRule)
    }
    
    return rules
  }
  
  private isRequired(text: string): boolean {
    return /required|mandatory|\*|\(required\)/i.test(text)
  }
  
  private extractLengthLimit(text: string): number | null {
    const matches = text.match(/(\d+)\s*(characters?|chars?|character limit)/i)
    return matches ? parseInt(matches[1]) : null
  }
}
```

### Vendor-Specific Validation

```
const VENDOR_VALIDATIONS = {
  photography: {
    timeline_start: {
      rules: [{
        type: 'custom',
        validator: (time: string) => {
          const hour = parseInt(time.split(':')[0])
          return hour >= 8 && hour <= 22
        },
        message: 'Photography typically starts between 8 AM and 10 PM'
      }]
    },
    
    shot_list: {
      rules: [{
        type: 'custom',
        validator: (shots: string[]) => shots.length <= 50,
        message: 'Keep shot list manageable (max 50 items)'
      }]
    }
  },
  
  catering: {
    dietary_requirements: {
      rules: [{
        type: 'custom',
        validator: (requirements: any[]) => {
          const total = requirements.reduce((sum, req) => sum + (req.count || 0), 0)
          return total <= 1000 // reasonable guest limit
        },
        message: 'Total dietary requirements exceed reasonable guest count'
      }]
    }
  }
}
```

### Cross-Field Validation

```
class CrossFieldValidator {
  generateCrossFieldRules(
    fields: ExtractedField[],
    context: WeddingContext
  ): ValidationRule[] {
    const rules: ValidationRule[] = []
    
    // Date consistency rules
    const weddingDate = fields.find(f => f.mappedToCoreField === 'wedding_date')
    const engagementDate = fields.find(f => f.label.includes('engagement'))
    
    if (weddingDate && engagementDate) {
      rules.push({
        type: 'custom',
        validator: (dates: { wedding: Date, engagement: Date }) => {
          return dates.engagement < [dates.wedding](http://dates.wedding)
        },
        message: 'Engagement date must be before wedding date',
        priority: 1
      })
    }
    
    // Guest count consistency
    const ceremonyGuests = fields.find(f => f.label.includes('ceremony') && f.label.includes('guest'))
    const receptionGuests = fields.find(f => f.label.includes('reception') && f.label.includes('guest'))
    
    if (ceremonyGuests && receptionGuests) {
      rules.push({
        type: 'custom',
        validator: (counts: { ceremony: number, reception: number }) => {
          return counts.ceremony <= counts.reception
        },
        message: 'Reception guests cannot be fewer than ceremony guests',
        priority: 2
      })
    }
    
    return rules
  }
}
```

### Intelligent Default Values

```
class DefaultValueGenerator {
  generateDefaults(field: ExtractedField, context: WeddingContext): any {
    switch (field.type) {
      case 'date':
        if (field.mappedToCoreField === 'wedding_date') {
          return context.weddingDate || null
        }
        break
        
      case 'time':
        if (field.label.includes('ceremony')) {
          return '15:00' // Common ceremony time
        }
        if (field.label.includes('reception')) {
          return '18:00' // Common reception time
        }
        break
        
      case 'number':
        if (field.mappedToCoreField === 'guest_count') {
          return context.guestCount || 100 // Average wedding size
        }
        break
    }
    
    return null
  }
}
```

### API Endpoints

```
// Generate validation rules for field
POST /api/forms/fields/validation
{
  field: ExtractedField,
  context: WeddingContext,
  options?: ValidationOptions
}

// Validate form data
POST /api/forms/:id/validate
{
  data: Record<string, any>,
  skipOptional?: boolean
}

// Get validation templates
GET /api/forms/validation/templates?vendor_type=:type
```

### Performance Targets

- Rule generation time: <100ms per field
- Validation accuracy: >98%
- False positive rate: <2%
- Client-side validation sync: 100%

```

```

### Database Schema

```
CREATE TABLE field_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES form_fields(id),
  rule_type TEXT NOT NULL,
  rule_value JSONB,
  error_message TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_validation_field (field_id),
  INDEX idx_validation_type (rule_type)
);

CREATE TABLE validation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  vendor_type TEXT,
  validation_rules JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Runtime Validation

```
class FormValidator {
  async validateForm(
    formData: Record<string, any>,
    formId: string
  ): Promise<ValidationResult> {
    const rules = await this.getValidationRules(formId)
    const errors: ValidationError[] = []
    
    for (const rule of rules) {
      const fieldValue = formData[rule.fieldKey]
      const isValid = await this.validateField(fieldValue, rule)
      
      if (!isValid) {
        errors.push({
          fieldKey: rule.fieldKey,
          message: rule.errorMessage,
          priority: rule.priority
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.sort((a, b) => a.priority - b.priority)
    }
  }
}
```

### Smart Error Messages

```
class ErrorMessageGenerator {
  generateContextualMessage(
    rule: ValidationRule,
    field: FormField,
    value: any
  ): string {
    const baseMessage = rule.message
    
    // Add wedding context
    if (field.weddingContext) {
      return `${baseMessage} This helps ensure your ${field.weddingContext} goes smoothly.`
    }
    
    // Add helpful hints
    if (rule.type === 'format' && rule.value === 'email') {
      return `${baseMessage} We'll use this to send important updates about your wedding.`
    }
    
    return baseMessage
  }
}
```