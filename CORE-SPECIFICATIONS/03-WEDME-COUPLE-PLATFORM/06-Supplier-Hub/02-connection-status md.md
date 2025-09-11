# 02-connection-status.md

## What to Build

Real-time connection status system showing sync state, data sharing permissions, and activity indicators for each supplier relationship.

## Key Technical Requirements

### Status Tracking

```
interface ConnectionStatus {
  connection_id: string;
  sync_status: {
    connected: boolean;
    last_sync: Date;
    sync_frequency: 'realtime' | 'hourly' | 'daily' | 'manual';
    data_points_shared: string[]; // ['wedding_date', 'venue', 'guest_count']
  };
  activity_metrics: {
    forms_sent: number;
    forms_completed: number;
    messages_exchanged: number;
    last_activity: Date;
    response_time_avg: number; // hours
  };
  permissions: {
    can_view_core_fields: boolean;
    can_message: boolean;
    can_view_timeline: boolean;
    can_view_other_suppliers: boolean;
  };
}
```

### Visual Indicators

- Green dot for active/online suppliers
- Sync spinner during data updates
- Red alert for connection issues
- Activity sparkline graph
- Response time indicator

## Critical Implementation Notes

- WebSocket for real-time status updates
- Automatic reconnection on network issues
- Permission management UI with toggles
- Connection health score algorithm
- Alert on unusual activity patterns

## Real-time Implementation

```
// Supabase presence tracking
const presenceChannel = [supabase.channel](http://supabase.channel)('supplier_presence')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    updateSupplierStatuses(state);
  })
  .subscribe();
```