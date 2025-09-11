# 01-supabase-realtime.md

## Overview

Configure Supabase Realtime for instant updates across the platform, enabling live collaboration between wedding suppliers and couples.

## Core Use Cases

### 1. Form Response Updates

- Couple completes form → Supplier sees instantly
- Progress indicators update in real-time
- Notification badges update without refresh

### 2. Journey Progress Tracking

- Module completion broadcasts to dashboard
- Timeline updates propagate immediately
- Task status changes reflect everywhere

### 3. Core Fields Synchronization

- Wedding date change → All suppliers notified
- Venue update → Location-dependent data refreshes
- Guest count change → Capacity warnings update

## Implementation Setup

### Enable Realtime on Tables

```
-- Enable realtime for critical tables
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE couples REPLICA IDENTITY FULL;
ALTER TABLE form_responses REPLICA IDENTITY FULL;
ALTER TABLE core_fields REPLICA IDENTITY FULL;
ALTER TABLE journey_progress REPLICA IDENTITY FULL;
```

### Client Subscription Pattern

```
// Subscribe to supplier's form responses
const channel = supabase
  .channel('form-responses')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'form_responses',
      filter: `supplier_id=eq.${supplierId}`
    },
    (payload) => {
      // Update UI immediately
      updateFormResponses([payload.new](http://payload.new))
    }
  )
  .subscribe()
```

## Performance Optimization

- Use specific filters to reduce payload
- Implement debouncing for rapid updates
- Clean up subscriptions on unmount
- Batch updates when possible