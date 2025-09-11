# 03-task-categories.md

## What to Build

Implement a categorization system for wedding tasks with predefined categories and custom options. Each category has specific timing windows and default assignees.

## Key Technical Requirements

### Category Configuration

```
const TASK_CATEGORIES = {
  setup: {
    icon: '🔨',
    color: '#4F46E5',
    defaultTiming: 'ceremony-120min',
    suggestedRoles: ['groomsmen', 'family'],
    tasks: ['Chair arrangement', 'Signage placement', 'Gift table setup']
  },
  guest_management: {
    icon: '👥',
    color: '#059669',
    defaultTiming: 'ceremony-30min',
    suggestedRoles: ['ushers', 'family'],
    tasks: ['Guest greeting', 'Seating assistance', 'Program distribution']
  },
  photography: {
    icon: '📸',
    color: '#DC2626',
    defaultTiming: 'throughout',
    suggestedRoles: ['maid_of_honor', 'best_man'],
    tasks: ['Gather family groups', 'Manage photo timeline', 'Hold personal items']
  },
  coordination: {
    icon: '📋',
    color: '#7C3AED',
    defaultTiming: 'varies',
    suggestedRoles: ['coordinator', 'parents'],
    tasks: ['Vendor check-ins', 'Timeline management', 'Problem solving']
  }
};
```

### UI Implementation

- Visual category selector with icons and colors
- Category-specific task templates
- Filter view by category
- Bulk actions per category
- Category workload distribution chart

## Critical Implementation Notes

- Auto-suggest helpers based on category expertise
- Timeline validation per category (setup must complete before ceremony)
- Category-specific notification templates
- Mobile-optimized category pills for quick filtering

## Category Analytics

```
-- Track category distribution
SELECT category, COUNT(*) as task_count,
       AVG(estimated_duration) as avg_duration
FROM wedding_tasks
GROUP BY category;
```