# 08-response-management.md

## What to Build

System to collect, store, and manage form responses with real-time updates and analytics.

## Key Technical Requirements

### Response Collection

```
interface FormResponse {
  id: string
  formId: string
  coupleId: string
  responses: Record<string, any>
  completedAt: Date
  ipAddress: string
  deviceInfo: DeviceMetadata
}

// Real-time subscription
const responseChannel = supabase
  .channel('form-responses')
  .on('INSERT', payload => {
    notifySupplier([payload.new](http://payload.new))
    updateAnalytics([payload.new](http://payload.new))
  })
  .subscribe()
```

### Response Processing

```
const processResponse = async (response: FormResponse) => {
  // Update core fields if mapped
  await updateCoreFields(response)
  
  // Trigger journey actions
  await triggerJourneyEvents(response.formId, 'form_completed')
  
  // Send notifications
  await sendResponseNotification(response)
}
```

## Critical Implementation Notes

- Implement partial response saving (auto-save every 30 seconds)
- Store response history for audit trail
- Handle file uploads separately (Supabase Storage)
- Validate responses against field rules

## Database Structure

```
CREATE TABLE form_responses (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  couple_id UUID REFERENCES couples(id),
  responses JSONB NOT NULL,
  completed_at TIMESTAMPTZ,
  metadata JSONB
);
```