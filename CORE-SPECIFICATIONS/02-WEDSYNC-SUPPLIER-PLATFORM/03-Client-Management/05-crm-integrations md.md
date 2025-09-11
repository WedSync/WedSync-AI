# 05-crm-integrations.md

## Purpose

Seamless connection to existing CRM systems where suppliers already manage their clients.

## Priority Integrations

### HoneyBook

- **Auth**: OAuth 2.0 flow
- **Sync**: Projects, contacts, pipeline stages
- **Mapping**: Project = Client, Pipeline = Journey Stage
- **Webhooks**: Real-time updates on changes
- **Limits**: 1000 clients per sync, 60 requests/minute

### Dubsado

- **Auth**: API key (stored encrypted)
- **Sync**: Clients, projects, forms, workflows
- **Mapping**: Lead capture forms → WedSync forms
- **Features**: Import form responses, project status
- **Limits**: Pagination required, 500 per page

### 17hats

- **Auth**: OAuth with refresh tokens
- **Sync**: Contacts, projects, questionnaires
- **Special**: Support their workflow stages
- **Webhooks**: Subscribe to contact updates

### Studio Ninja

- **Auth**: API token
- **Sync**: Clients, shoots, contracts
- **Photography-specific**: Shoot types, packages
- **Limits**: Rate limited, implement exponential backoff

## Sync Architecture

### Initial Import

- Full historical import (last 2 years)
- Progress indicator with client names
- Conflict resolution UI
- Rollback capability

### Ongoing Sync

- Webhook-based where available
- Polling fallback (every 4 hours)
- Bi-directional sync options
- Conflict resolution (latest wins vs manual)

### Data Mapping

- Store CRM ID for reference
- Map custom fields dynamically
- Handle CRM-specific data types
- Preserve original data structure

## Error Handling

- OAuth refresh automation
- Rate limit respect with backoff
- Partial sync recovery
- Detailed error logs
- User notifications for auth issues

## Security

- Encrypt all credentials
- Implement token rotation
- Audit all sync operations
- Allow disconnect at any time
- Data deletion on disconnect