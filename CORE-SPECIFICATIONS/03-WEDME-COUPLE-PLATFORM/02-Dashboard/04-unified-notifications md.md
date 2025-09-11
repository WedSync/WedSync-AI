# 04-unified-notifications.md

## What to Build

Create a centralized notification center that aggregates all wedding-related updates from suppliers, tasks, and system events.

## Key Technical Requirements

### Notification Types

```
// types/notifications.ts
type NotificationType = 
  | 'form_request'     // Supplier needs form completion
  | 'task_due'        // Task deadline approaching
  | 'supplier_update' // Supplier posted update
  | 'journey_milestone' // Journey stage completed
  | 'document_shared' // New document available
  | 'meeting_scheduled'; // Meeting booked/changed

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  supplier_id?: string;
  action_url?: string;
  read: boolean;
  created_at: Date;
  priority: 'high' | 'medium' | 'low';
}
```

### Real-time Subscription

```
// hooks/useNotifications.ts
const channel = supabase
  .channel(`notifications:${coupleId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `couple_id=eq.${coupleId}`
  }, handleNewNotification)
  .subscribe();
```

### UI Components

- Bell icon with unread count badge
- Dropdown panel (max-height: 400px, scrollable)
- Group by date (Today, Yesterday, This Week, Older)
- Swipe-to-dismiss on mobile
- Mark all as read button

## Critical Implementation Notes

- Limit displayed notifications to 50 most recent
- Auto-mark as read after 3 seconds viewing
- Different icons per notification type
- Click notification → navigate to relevant section
- Store dismissed notifications for 30 days

## Database Structure

```
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  couple_id UUID REFERENCES couples(id),
  type VARCHAR(50),
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_couple 
ON notifications(couple_id, read, created_at DESC);
```