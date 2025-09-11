# 02-supplier-schedules.md

## What to Build

Individual supplier schedule views showing arrival times, setup windows, service periods, and breakdown times integrated with master timeline.

## Key Technical Requirements

### Supplier Schedule Schema

```
interface SupplierSchedule {
  supplier_id: string;
  timeline_id: string;
  schedule_blocks: {
    type: 'travel' | 'setup' | 'service' | 'breakdown' | 'break';
    start_time: string;
    end_time: string;
    location: string;
    requirements: {
      power_access?: boolean;
      loading_access?: boolean;
      storage_space?: boolean;
      assistance_needed?: number; // helpers
    };
    notes: string;
    status: 'confirmed' | 'tentative' | 'conflict';
  }[];
  key_moments: {
    time: string;
    description: string;
    critical: boolean;
  }[];
  contact_during_event: {
    primary: string;
    backup: string;
  };
}
```

### UI Features

- Supplier-specific timeline view
- Overlap detection with other suppliers
- Setup/breakdown time calculator
- Travel time from base location
- Resource requirement checklist
- Multi-supplier coordination view

## Critical Implementation Notes

- Auto-notify suppliers of timeline changes
- Venue access time validation
- Equipment load-in sequencing
- Break time scheduling for long services
- Export to supplier's calendar app

## Coordination Logic

```
// Check supplier conflicts
const findSupplierConflicts = (suppliers: SupplierSchedule[]) => {
  return suppliers.flatMap((s1, i) => 
    suppliers.slice(i + 1).map(s2 => {
      const conflicts = s1.schedule_blocks.filter(b1 => 
        s2.schedule_blocks.some(b2 => 
          b1.location === b2.location &&
          timeOverlap(b1, b2)
        )
      );
      return { s1, s2, conflicts };
    })
  ).filter(c => c.conflicts.length > 0);
};
```