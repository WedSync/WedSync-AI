# 07-activities-tracking.md

`### 07-activities-tracking.md
```markdown
# Activities Tracking

## activities Table
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL, -- supplier, couple, system
  actor_id UUID NOT NULL,
  action TEXT NOT NULL, -- form_submitted, email_opened, etc.
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized for time-series queries
CREATE INDEX idx_activities_created_at 
ON activities(created_at DESC);

CREATE INDEX idx_activities_actor 
ON activities(actor_type, actor_id);`

## Action Types to Track

`Authentication:
- signup, login, logout, password_reset

Forms:
- form_created, form_submitted, form_updated

Journey:
- journey_started, node_executed, journey_completed

Client:
- client_invited, client_activated, client_connected

Email:
- email_sent, email_opened, email_clicked`

## Analytics Queries

sql

- `*- Viral coefficient calculation*
SELECT COUNT(DISTINCT invited_by) as inviters, COUNT(*) as invitees, COUNT(*)::FLOAT / COUNT(DISTINCT invited_by) as avg_invites
FROM activities
WHERE action = 'client_invited';`

## Performance Considerations

- Partition by month for large datasets
- Archive old data to cold storage
- Aggregate metrics hourly for dashboards