# 04-forms-tables.md

`### 04-forms-tables.md
```markdown
# Forms Tables

## forms Table
```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL, -- Form structure
  settings JSONB DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  marketplace_id UUID, -- If sold in marketplace
  created_at TIMESTAMPTZ DEFAULT NOW()
);`

## Fields JSONB Structure

json

`{
  "sections": [{
    "id": "uuid",
    "title": "Basic Information",
    "fields": [{
      "id": "uuid",
      "type": "text|email|date|select|core_field",
      "label": "Field Label",
      "required": true,
      "core_field_key": "wedding_date", *// If core field*
      "validation": {},
      "conditional_logic": {}
    }]
  }]
}`

## form_responses Table

sql

`CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id),
  couple_id UUID REFERENCES couples(id),
  client_id UUID REFERENCES clients(id),
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);`

## Critical Implementation Notes

- Core fields auto-populate from core_fields table
- Validation runs server-side
- Responses immutable once submitted
- File uploads reference separate storage table