# Product Requirements Document: Form Import & Builder Feature
## WedSync MVP - Phase 1

---

## Executive Summary

The Form Import & Builder feature is the cornerstone of WedSync's value proposition, allowing wedding vendors to instantly convert their existing PDF forms into intelligent digital forms with AI-powered field detection and Core Fields auto-population. This feature provides immediate value (saves 2-4 hours per form creation) and triggers the viral growth loop (vendors invite couples to fill forms).

**Priority**: P0 - Critical Path to Launch
**Timeline**: 4-6 weeks
**Success Metric**: 90%+ accurate field detection from PDF imports

---

## Problem Statement

### Current Pain Points
Wedding vendors currently:
- Manually recreate paper forms digitally (2-4 hours per form)
- Re-enter the same wedding details for every couple
- Use generic form builders not designed for weddings
- Lose data in email attachments and paper forms
- Can't track form completion or analytics

### Impact
- **Time Lost**: 10+ hours per wedding on form administration
- **Data Entry**: Couples enter wedding date 14+ times across vendors
- **Error Rate**: 30% of forms have missing/incorrect information
- **Completion Rate**: Only 40% of emailed forms get returned

---

## Proposed Solution

### Core Concept
An AI-powered form system that:
1. **Imports existing PDFs** using OpenAI Vision API for instant digitization
2. **Builds forms visually** with drag-and-drop specifically for weddings
3. **Auto-populates data** via Core Fields system (couple enters once, flows everywhere)
4. **Tracks everything** with analytics and real-time response notifications

### Key Innovation: Core Fields System
Revolutionary auto-population where wedding details (date, venue, guest count) entered once by couples automatically fill across ALL vendor forms.

---

## User Stories

### Supplier (Photographer) Stories
1. **As a photographer**, I want to upload my existing PDF contract so it becomes a digital form in under 60 seconds
2. **As a photographer**, I want couples' wedding dates to auto-fill so I never have to ask for basic information
3. **As a photographer**, I want to build a shot list form with family photo groups without any coding
4. **As a photographer**, I want to see when couples view and complete my forms in real-time

### Couple Stories
1. **As a couple**, I want to enter my wedding details once and have them appear in all vendor forms
2. **As a couple**, I want to complete forms on my phone while commuting
3. **As a couple**, I want to save progress and return later without losing data

---

## Feature Requirements

### 1. PDF Import System (Week 1-2)

#### Functional Requirements
- **Upload**: Accept PDF files up to 10MB
- **Processing**: Convert PDF to images for Vision API analysis
- **Field Detection**: Extract labels, field types, layout
- **Confidence Scoring**: Show accuracy confidence per field
- **Preview**: Side-by-side PDF vs generated form
- **Edit**: Modify detected fields before saving

#### Technical Specifications
```typescript
interface PDFImportFlow {
  // Step 1: Upload & Convert
  uploadPDF: (file: File) => Promise<PDFData>
  convertToImages: (pdf: PDFData) => Promise<Base64Image[]>
  
  // Step 2: AI Analysis
  analyzeWithVision: (images: Base64Image[]) => Promise<{
    fields: DetectedField[]
    confidence: number
    layout: GridLayout
  }>
  
  // Step 3: Form Generation
  generateForm: (detectedFields: DetectedField[]) => Form
  
  // Step 4: Review & Save
  previewForm: (form: Form) => React.Component
  saveForm: (form: Form) => Promise<void>
}
```

#### AI Prompt Engineering
```javascript
const VISION_PROMPT = `
Analyze this form image and extract:
1. All field labels and their types (text, checkbox, date, etc.)
2. Required field indicators (asterisks, "required" text)
3. Field groupings and sections
4. Relative positioning for layout

Output as JSON:
{
  "fields": [
    {
      "label": "Couple Names",
      "type": "text",
      "required": true,
      "section": "Basic Information",
      "position": { "row": 1, "column": 1 }
    }
  ]
}
`;
```

### 2. Visual Form Builder (Week 2-3)

#### Drag & Drop Canvas
- **Component Palette**: 15+ wedding-specific field types
- **Canvas Area**: 1-4 column responsive grid
- **Sections**: Collapsible groups with headers
- **Real-time Preview**: See form as couples will see it

#### Field Types - Basic
1. **Text Fields**: Single line, multi-line, email, phone
2. **Selection**: Dropdown, radio, checkboxes
3. **Date/Time**: Date picker, time picker, date range
4. **Numbers**: Number, currency, percentage

#### Field Types - Wedding Specific
1. **Shot List Manager**: Family photo groups organizer
2. **Dietary Matrix**: Allergen and dietary requirement grid
3. **Guest Count**: Adults/children/infants breakdown
4. **Vendor List**: Other vendors at wedding
5. **Timeline Builder**: Hour-by-hour schedule
6. **Music Preferences**: Must play/don't play lists

#### Implementation Using @dnd-kit
```typescript
// Core drag-drop structure
interface FormBuilder {
  sensors: UseSensors // Mouse, touch, keyboard
  palette: FieldPalette // Available field types
  canvas: {
    sections: FormSection[]
    activeSection: string | null
    gridColumns: 1 | 2 | 3 | 4
  }
  properties: FieldProperties // Selected field settings
}

// Drag behavior
const handleDragEnd = (event: DragEndEvent) => {
  if (over.id === 'canvas') addFieldToForm()
  if (over.id === 'trash') removeField()
  if (over.id === 'section') moveFieldToSection()
}
```

### 3. Core Fields Integration (Week 3-4)

#### Auto-Population System
```typescript
interface CoreFields {
  // These fields auto-populate across ALL forms
  wedding_date: Date
  ceremony_venue: Venue
  reception_venue: Venue
  guest_count: GuestCount
  ceremony_time: Time
  // ... 20+ core fields
}

// Field mapping
const mapFormFieldToCore = (field: FormField) => {
  // AI-suggested mapping
  const suggestion = detectCoreFieldMatch(field.label)
  
  // Manual override option
  if (suggestion.confidence < 0.8) {
    return promptUserToMap(field)
  }
  
  return linkToCoreField(suggestion.coreField)
}
```

#### Privacy & Permissions
- Couples control what data is shared
- Suppliers see only fields relevant to their service
- Audit log of all data access
- GDPR compliant data handling

### 4. Response Management (Week 4)

#### Collection System
- **Auto-save**: Every 30 seconds
- **Progress Tracking**: Show completion percentage
- **File Uploads**: Support for documents/images
- **Mobile Optimized**: Touch-friendly interface

#### Supplier Dashboard
```typescript
interface ResponseDashboard {
  // Real-time notifications
  newResponses: FormResponse[]
  
  // Analytics
  metrics: {
    views: number
    started: number
    completed: number
    averageTime: Duration
    dropOffField: string | null
  }
  
  // Export options
  exportFormats: 'CSV' | 'PDF' | 'Excel'
}
```

### 5. Analytics & Insights (Week 4)

#### Key Metrics
- **Completion Rate**: Track by form and field
- **Time Spent**: Per field and total
- **Drop-off Points**: Where couples abandon
- **Device Breakdown**: Mobile vs desktop
- **Peak Times**: When forms are completed

---

## Technical Architecture

### Tech Stack
```yaml
Frontend:
  - Next.js 15.4.3 (App Router)
  - React 19.1.0
  - TypeScript 5 (strict mode)
  - @dnd-kit for drag-drop
  - React Hook Form + Zod validation

Backend:
  - Supabase (PostgreSQL 15)
  - Edge Functions for PDF processing
  - OpenAI API for Vision analysis

Storage:
  - Supabase Storage for PDFs/images
  - PostgreSQL JSONB for form schemas
```

### Database Schema
```sql
-- Core form tables
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  structure JSONB NOT NULL, -- Form field configuration
  core_field_mappings JSONB, -- Links to core fields
  settings JSONB, -- Form settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id),
  couple_id UUID REFERENCES couples(id),
  responses JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB -- IP, device, etc.
);

-- Analytics tracking
CREATE TABLE form_analytics (
  form_id UUID REFERENCES forms(id),
  date DATE,
  views INT DEFAULT 0,
  starts INT DEFAULT 0,
  completions INT DEFAULT 0,
  avg_duration_seconds INT,
  PRIMARY KEY (form_id, date)
);

-- PDF import history
CREATE TABLE pdf_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  original_pdf_url TEXT,
  extracted_fields JSONB,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
```typescript
// Form management
POST   /api/forms/import-pdf     // Upload and process PDF
POST   /api/forms                // Create new form
GET    /api/forms/:id            // Get form structure
PUT    /api/forms/:id            // Update form
DELETE /api/forms/:id            // Delete form

// Responses
POST   /api/forms/:id/responses  // Submit response
GET    /api/forms/:id/responses  // Get all responses
GET    /api/responses/:id        // Get single response

// Analytics
GET    /api/forms/:id/analytics  // Get form analytics
```

---

## Success Criteria

### MVP Launch Requirements
- [ ] PDF import works with 90%+ accuracy
- [ ] 15+ wedding-specific field types available
- [ ] Core fields auto-populate correctly
- [ ] Forms work perfectly on mobile
- [ ] Response time <2 seconds
- [ ] Auto-save prevents data loss

### Key Metrics
- **Import Success Rate**: >90% of PDFs convert successfully
- **Form Creation Time**: <5 minutes from PDF to published
- **Completion Rate**: >70% of started forms
- **Mobile Usage**: >60% complete on mobile
- **Supplier Satisfaction**: >4.5/5 rating

---

## Implementation Phases

### Week 1-2: PDF Import
- Set up OpenAI Vision API
- Build PDF upload interface
- Implement field detection
- Create preview/edit flow

### Week 2-3: Form Builder
- Implement @dnd-kit drag-drop
- Create field component library
- Build canvas with sections
- Add responsive preview

### Week 3-4: Core Fields
- Design core fields structure
- Build mapping interface
- Implement auto-population
- Add privacy controls

### Week 4: Response System
- Create response collection
- Build analytics dashboard
- Add real-time notifications
- Implement exports

### Week 5-6: Testing & Polish
- Mobile optimization
- Performance testing
- Security audit
- Beta user feedback

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| OpenAI API costs | Cache results, use GPT-3.5 for simple tasks |
| PDF parsing accuracy | Allow manual correction, improve prompts |
| Performance at scale | Implement pagination, lazy loading |
| Data privacy concerns | Clear consent, granular permissions |

### Business Risks
| Risk | Mitigation |
|------|------------|
| Low adoption | Strong onboarding, templates library |
| Complex for users | Video tutorials, guided setup |
| Competitors copy | Patent core fields system |

---

## Dependencies

### External Services
- **OpenAI API**: Vision model for PDF analysis
- **Google Places API**: Venue autocomplete
- **Supabase**: Database, auth, storage
- **Vercel**: Hosting and edge functions

### Internal Dependencies
- Authentication system must be complete
- Database schema must be migrated
- Core fields structure must be defined

---

## Testing Requirements

### Unit Tests
- Field type validation
- Form structure integrity
- Core fields mapping logic
- PDF parsing accuracy

### Integration Tests
- PDF upload → form generation flow
- Form builder → response collection
- Core fields → auto-population
- Analytics tracking accuracy

### E2E Tests
- Complete supplier journey
- Complete couple journey
- Mobile form completion
- Cross-browser compatibility

---

## Notes for Claude Code

### Critical Implementation Details

1. **PDF Processing**: PDFs must be converted to images first (Vision API doesn't accept PDFs directly)
2. **Cost Management**: Cache OpenAI responses, use GPT-3.5 where possible
3. **Mobile First**: 60% of couples will use mobile - must be perfect
4. **Auto-Save**: Implement every 30 seconds to prevent data loss
5. **Real-time**: Use Supabase subscriptions for instant updates

### Folder Structure
```
/src
  /components
    /forms
      /builder         # Drag-drop builder
      /fields          # Field components
      /responses       # Response display
  /app
    /api
      /forms          # Form CRUD
      /import         # PDF import
      /analytics      # Analytics endpoints
  /lib
    /ai              # OpenAI integration
    /pdf             # PDF processing
    /forms           # Form utilities
```

### Getting Started
1. Set up Supabase project and get credentials
2. Get OpenAI API key with Vision access
3. Install dependencies: `@dnd-kit/core`, `react-hook-form`, `zod`
4. Start with PDF import feature (highest value)
5. Test with real wedding vendor PDFs

---

## Appendix

### A. Sample Form Templates
- Photography Shot List
- Catering Dietary Requirements
- DJ Music Preferences
- Venue Setup Requirements

### B. Core Fields Complete List
[Detailed in Core Fields specification document]

### C. Field Type Components
[Detailed component specifications for each field type]

---

**Document Version**: 1.0
**Last Updated**: November 2024
**Author**: Mary (Business Analyst)
**For**: Claude Code Implementation