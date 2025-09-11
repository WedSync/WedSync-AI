# 03-progress-tracking.md

## What to Build

Build a visual progress tracking system showing overall wedding planning completion and individual supplier task progress.

## Key Technical Requirements

### Component Structure

```
// components/couple/dashboard/ProgressTracking.tsx
interface ProgressData {
  overall: number; // 0-100
  byCategory: {
    venue: ProgressItem;
    photography: ProgressItem;
    catering: ProgressItem;
    // ... other categories
  };
  upcomingMilestones: Milestone[];
}

interface ProgressItem {
  percentage: number;
  completed: number;
  total: number;
  status: 'on-track' | 'behind' | 'ahead';
}
```

### Database Query

```
-- Get progress data for couple
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(*) as total,
  supplier_type
FROM couple_tasks ct
JOIN suppliers s ON ct.supplier_id = [s.id](http://s.id)
WHERE couple_id = $1
GROUP BY supplier_type;
```

### Visual Implementation

- Use Radial Progress charts for overall completion
- Linear progress bars for category breakdowns
- Color coding: Green (>75%), Yellow (50-75%), Red (<50%)
- Animate progress changes with framer-motion

## Critical Implementation Notes

- Cache progress calculations (update every 5 minutes)
- Show percentage and absolute numbers (e.g., "73% - 23 of 31 tasks")
- Include tooltips showing what's remaining
- Mobile: Stack progress cards vertically
- Real-time updates via Supabase subscriptions

## API Structure

```
// app/api/couple/progress/route.ts
export async function GET(request: Request) {
  const coupleId = await getCoupleId(request);
  
  const progress = await calculateProgress(coupleId);
  
  return NextResponse.json({
    overall: progress.overall,
    categories: progress.byCategory,
    nextMilestone: progress.upcomingMilestones[0]
  });
}
```