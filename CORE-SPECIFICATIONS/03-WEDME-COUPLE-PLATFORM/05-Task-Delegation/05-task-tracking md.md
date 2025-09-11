# 05-task-tracking.md

## What to Build

Real-time task tracking dashboard showing task completion status, helper check-ins, and day-of coordination tools.

## Key Technical Requirements

### Tracking Schema

```
interface TaskTracking {
  task_id: string;
  assigned_to: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  started_at?: Date;
  completed_at?: Date;
  completion_verified_by?: string;
  location_check_in?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  issues?: {
    type: 'missing_supplies' | 'time_delay' | 'no_show' | 'other';
    description: string;
    reported_at: Date;
  }[];
}
```

### Live Dashboard Components

- Real-time status board with color coding
- Helper location map (optional GPS tracking)
- Completion percentage by category
- Alert system for blocked tasks
- Quick reassignment for no-shows

## Critical Implementation Notes

- Mobile-first design for day-of use
- Offline capability with sync when connected
- Push notifications for critical task updates
- One-tap completion confirmation
- Escalation path for issues

## Real-time Subscriptions

```
// Task status updates
const taskChannel = supabase
  .channel('wedding_day_tasks')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'task_tracking',
    filter: `wedding_date=eq.${weddingDate}`
  }, (payload) => {
    updateTaskStatus([payload.new](http://payload.new));
    if ([payload.new](http://payload.new).status === 'blocked') {
      sendAlert([payload.new](http://payload.new));
    }
  })
  .subscribe();
```