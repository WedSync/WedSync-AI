# 07-form-templates.md

## What to Build

Pre-built form templates library organized by vendor type with marketplace integration.

## Key Technical Requirements

### Template Structure

```
interface FormTemplate {
  id: string
  vendorType: 'photographer' | 'caterer' | 'dj' | 'venue' | 'florist'
  name: string
  description: string
  fields: Field[]
  layout: GridLayout
  tags: string[]
  installCount: number
  rating: number
}
```

### Template Categories

```
const TEMPLATE_LIBRARY = {
  photographer: [
    'Wedding Questionnaire',
    'Shot List Builder',
    'Timeline Planner',
    'Engagement Session'
  ],
  caterer: [
    'Menu Selection',
    'Dietary Requirements',
    'Bar Service Options',
    'Tasting Booking'
  ]
}
```

## Critical Implementation Notes

- Clone templates, don't reference (avoid accidental modifications)
- Track template usage for analytics
- Version templates for updates
- Include sample data for preview

## Database Structure

```
CREATE TABLE form_templates (
  id UUID PRIMARY KEY,
  vendor_type TEXT NOT NULL,
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  is_marketplace BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES suppliers(id),
  usage_count INTEGER DEFAULT 0
);
```