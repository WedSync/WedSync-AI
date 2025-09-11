# 05-timeline-view.md

## What to Build

Develop an interactive timeline showing all wedding events, supplier schedules, and task deadlines in chronological order.

## Key Technical Requirements

### Data Structure

```
// types/timeline.ts
interface TimelineEvent {
  id: string;
  date: Date;
  time?: string;
  type: 'wedding' | 'meeting' | 'deadline' | 'milestone';
  title: string;
  supplier?: {
    id: string;
    name: string;
    type: string;
  };
  location?: string;
  duration?: number; // minutes
  color: string; // Based on supplier type
}

interface TimelineGroup {
  date: Date;
  events: TimelineEvent[];
  isToday: boolean;
  isPast: boolean;
}
```

### Timeline Component

```
// components/couple/TimelineView.tsx
export function TimelineView() {
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Fetch events for visible range
  const { data: events } = useTimelineEvents({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate)
  });
  
  return (
    <div className="timeline-container">
      <ViewToggle value={view} onChange={setView} />
      {view === 'month' && <CalendarView events={events} />}
      {view === 'week' && <WeekView events={events} />}
      {view === 'list' && <ListView events={events} />}
    </div>
  );
}
```

### Visual Design

- Color-code by supplier type (photography=blue, venue=green, etc.)
- Show countdown for future events
- Highlight today with accent color
- Collapsible day sections in list view

## Critical Implementation Notes

- Use react-big-calendar for month view
- Virtual scrolling for list view (react-window)
- Sync with device calendar via .ics export
- Show travel time between venues
- Conflict detection (overlapping events)

## API Endpoint

```
// app/api/couple/timeline/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  const events = await getTimelineEvents(coupleId, start, end);
  return NextResponse.json(events);
}
```