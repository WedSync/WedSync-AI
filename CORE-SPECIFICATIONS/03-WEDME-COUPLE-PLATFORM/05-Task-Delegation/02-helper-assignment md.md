# 02-helper-assignment.md

## What to Build

Create an assignment system that maps tasks to specific helpers (wedding party, family, friends). Include role-based assignments and workload balancing.

## Key Technical Requirements

### Database Schema

```
interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: {
    type: 'guest' | 'external_helper' | 'role';
    guest_id?: string;
    name: string;
    contact: string; // email or phone
    role?: 'best_man' | 'maid_of_honor' | 'groomsman' | 'bridesmaid' | 'parent' | 'coordinator';
  };
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  accepted_at?: Date;
  completed_at?: Date;
  notes?: string;
}
```

### UI Features

- Drag tasks onto helper avatars for quick assignment
- Workload indicator (show task count per helper)
- Bulk assign by role ("Assign all setup tasks to groomsmen")
- Availability checker (helpers can mark unavailable times)
- Task trading between helpers

## Critical Implementation Notes

- Prevent over-assignment (max 5 tasks per helper default)
- Show helper expertise tags ("Good with tech", "Strong lifter")
- Send assignment notifications via email/SMS
- Track acceptance rate for follow-up
- Allow co-assignment for heavy tasks

## Real-time Updates

```
// Supabase subscription
supabase
  .channel('task_assignments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'task_assignments'
  }, handleAssignmentChange)
  .subscribe();
```