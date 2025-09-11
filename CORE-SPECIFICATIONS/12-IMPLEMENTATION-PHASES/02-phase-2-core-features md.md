# 02-phase-2-core-features.md

## What to Build

Forms system with AI generation, core fields integration, and basic customer journey builder. This phase delivers the primary value proposition.

## Week 5-6: Forms System

### Technical Requirements

```
interface FormsSystem {
  builder: {
    type: 'canvas_based'
    dragDrop: '@dnd-kit/core'
    gridColumns: 1 | 2 | 3 | 4
  }
  fieldTypes: [
    'text', 'email', 'phone', 'date',
    'select', 'multiselect', 'radio',
    'checkbox', 'textarea', 'file',
    'payment_addon', 'photo_groups' // Wedding-specific
  ]
  ai: {
    pdfImport: true
    generation: 'openai_api'
  }
}
```

### Database Schema

```
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL, -- Form structure
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_fields (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  label TEXT,
  required BOOLEAN DEFAULT false,
  core_field_mapping TEXT, -- Links to core fields
  validation_rules JSONB,
  position INTEGER
);

CREATE TABLE form_responses (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  client_id UUID REFERENCES clients(id),
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Form Builder Implementation

```
// Main form builder component
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

const FormBuilder = () => {
  const [fields, setFields] = useState([])
  
  const handleDragEnd = (event) => {
    // Reorder fields logic
    const {active, over} = event
    if ([active.id](http://active.id) !== [over.id](http://over.id)) {
      setFields(arrayMove(fields, active.index, over.index))
    }
  }
  
  return (
    <div className="flex h-screen">
      {/* Field Palette */}
      <FieldPalette />
      
      {/* Canvas */}
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={fields}>
          <FormCanvas fields={fields} />
        </SortableContext>
      </DndContext>
      
      {/* Field Settings */}
      <FieldSettings />
    </div>
  )
}
```

### Core Fields Integration

```
// Core fields that auto-populate
const CORE_FIELDS = {
  'couple_names': ['partner1_name', 'partner2_name'],
  'wedding_date': 'wedding_date',
  'venue_ceremony': 'ceremony_venue',
  'venue_reception': 'reception_venue',
  'guest_count': 'guest_count',
  'email': 'primary_email',
  'phone': 'primary_phone'
}

// Auto-population logic
const populateCoreFields = async (formId: string, coupleId: string) => {
  const coreData = await supabase
    .from('core_fields')
    .select('*')
    .eq('couple_id', coupleId)
    .single()
    
  const formFields = await getFormFields(formId)
  
  const populatedData = {}
  formFields.forEach(field => {
    if (field.core_field_mapping && coreData[field.core_field_mapping]) {
      populatedData[field.field_key] = coreData[field.core_field_mapping]
    }
  })
  
  return populatedData
}
```

## Week 6: AI Form Generation

### OpenAI Integration

```
// AI form generation from description
const generateFormFromDescription = async (description: string) => {
  const prompt = `
    Create a wedding ${vendorType} form with these requirements:
    ${description}
    
    Return JSON with fields array containing:
    - field_key, label, type, required, validation
  `
  
  const response = await [openai.chat](http://openai.chat).completions.create({
    model: 'gpt-4',
    messages: [{role: 'user', content: prompt}],
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(response.choices[0].message.content)
}

// PDF import using vision API
const importFormFromPDF = async (pdfFile: File) => {
  const images = await convertPDFToImages(pdfFile)
  
  const analysis = await [openai.chat](http://openai.chat).completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract form fields from this document' },
        { type: 'image_url', image_url: { url: images[0] }}
      ]
    }]
  })
  
  return parseFormStructure(analysis)
}
```

## Week 7: Basic Customer Journey

### Journey Builder Setup

```
interface CustomerJourney {
  id: string
  name: string
  trigger: 'manual' | 'form_submission' | 'date_based'
  nodes: JourneyNode[]
}

interface JourneyNode {
  id: string
  type: 'email' | 'wait' | 'condition'
  config: NodeConfig
  next: string[] // Next node IDs
}
```

### Database Structure

```
CREATE TABLE customer_journeys (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT NOT NULL,
  trigger_type TEXT,
  trigger_config JSONB,
  nodes JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journey_executions (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES customer_journeys(id),
  client_id UUID REFERENCES clients(id),
  current_node_id TEXT,
  state JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Simple Email Module

```
// Email node configuration
const EmailNode = ({ node, onChange }) => {
  return (
    <div className="border rounded p-4">
      <Input 
        label="Subject"
        value={node.config.subject}
        onChange={(e) => onChange({...node, config: {...node.config, subject: [e.target](http://e.target).value}})}
      />
      <Textarea
        label="Body"
        value={node.config.body}
        placeholder="Use [[couple_names]], [[wedding_date]] for merge tags"
      />
    </div>
  )
}
```

## Week 8: Client Import & Basic Analytics

### CSV Import System

```
// CSV parsing with Papa Parse
import Papa from 'papaparse'

const importClientsFromCSV = async (file: File) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const clients = [results.data.map](http://results.data.map)(row => ({
          couple_names: `${row.partner1} & ${row.partner2}`,
          email: [row.email](http://row.email),
          phone: [row.phone](http://row.phone),
          wedding_date: parseDate([row.wedding](http://row.wedding)_date),
          venue: row.venue
        }))
        
        // Bulk insert
        const { data, error } = await supabase
          .from('clients')
          .insert(clients)
          
        resolve(data)
      },
      error: reject
    })
  })
}
```

### Basic Activity Tracking

```
CREATE TABLE client_activities (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  activity_type TEXT, -- 'form_view', 'form_submit', 'email_open'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick queries
CREATE INDEX idx_activities_client_date 
  ON client_activities(client_id, created_at DESC);
```

### Activity Dashboard Component

```
const ActivityFeed = () => {
  const activities = useRealtimeActivities()
  
  return (
    <div className="space-y-2">
      {[activities.map](http://activities.map)(activity => (
        <div key={[activity.id](http://activity.id)} className="flex items-center gap-3 p-2">
          <ActivityIcon type={activity.activity_type} />
          <div>
            <div className="font-medium">
              {activity.client.couple_names}
            </div>
            <div className="text-sm text-gray-500">
              {activity.activity_type} • {timeAgo(activity.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## API Endpoints

```
// Core features APIs
const phase2Endpoints = [
  // Forms
  'GET /api/forms',
  'POST /api/forms',
  'PUT /api/forms/:id',
  'POST /api/forms/:id/responses',
  'POST /api/forms/generate', // AI generation
  'POST /api/forms/import', // PDF import
  
  // Journeys
  'GET /api/journeys',
  'POST /api/journeys',
  'POST /api/journeys/:id/execute',
  
  // Import
  'POST /api/clients/import',
  
  // Analytics
  'GET /api/analytics/activities',
  'GET /api/analytics/engagement'
]
```

## Critical Implementation Notes

1. **Forms must work offline** - Cache in localStorage
2. **Core fields are read-only** when populated
3. **Journey execution is async** - Use background jobs
4. **CSV import needs validation** - Show preview before import
5. **Keep AI costs low** - Cache generated forms

## Success Criteria

1. Supplier can create forms with drag-drop
2. Forms auto-populate from core fields
3. AI can generate form from description
4. Basic email journey works
5. CSV import handles 1000+ clients
6. Activity tracking shows real-time updates

## Performance Targets

- Form builder loads in <2 seconds
- AI generation completes in <10 seconds
- CSV import: 100 clients/second
- Journey email sends within 1 minute