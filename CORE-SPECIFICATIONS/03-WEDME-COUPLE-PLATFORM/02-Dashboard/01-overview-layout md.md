# 01-overview-layout.md

## What to Build

Main couple dashboard showing vendor connections, progress tracking, and upcoming tasks in a responsive grid layout.

## Layout Structure

### Grid System

```
// Responsive grid using CSS Grid
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;
```

### Priority Zones

1. **Hero Section**: Wedding countdown + key stats
2. **Vendor Cards**: Connected suppliers grid
3. **Tasks Widget**: Upcoming to-dos
4. **Timeline**: Visual progress tracker
5. **Quick Actions**: Common tasks

## Data Fetching

```
// Parallel data loading
const [vendors, tasks, timeline, coreFields] = 
  await Promise.all([
    getConnectedVendors(coupleId),
    getUpcomingTasks(coupleId),
    getWeddingTimeline(coupleId),
    getCoreFields(coupleId)
  ]);
```

## Real-time Updates

```
// Supabase subscription
const subscription = supabase
  .channel('dashboard-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'couple_tasks'
  }, handleTaskUpdate)
  .subscribe();
```

## Mobile Layout

- Stack vertically on mobile
- Collapsible sections
- Bottom navigation bar
- Pull-to-refresh

## Critical Notes

- Lazy load below-fold content
- Show skeleton loaders
- Cache dashboard state
- Offline support for viewing