# 05-journeys-tables.md

````markdown
# Customer Journey Tables

## customer_journeys Table
```sql
CREATE TABLE customer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, active, paused
  canvas_data JSONB NOT NULL, -- Visual positioning
  nodes JSONB NOT NULL, -- Journey logic
  created_at TIMESTAMPTZ DEFAULT NOW()
);`

## Nodes Structure

json

`{
  "nodes": [{
    "id": "node_1",
    "type": "timeline|email|form|meeting",
    "trigger": {
      "type": "relative_date",
      "value": -30,
      "unit": "days",
      "reference": "wedding_date"
    },
    "content": {
      "template_id": "uuid",
      "form_id": "uuid"
    },
    "conditions": []
  }]
}`

## journey_executions Table

sql

`CREATE TABLE journey_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES customer_journeys(id),
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'active',
  current_node_id TEXT,
  state JSONB DEFAULT '{}', *-- Execution state*
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);`

## Implementation Critical

- Executions run via cron job every 5 minutes
- State machine prevents duplicate sends
- Timezone handling based on venue location
- Pause/resume maintains state