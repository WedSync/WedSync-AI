# 06-progress-charts.md

## Overview

Visual progress tracking system for post-wedding deliverables with customizable workflows.

## Chart Configuration

```
interface ProgressChart {
  id: string
  name: string // 'Photo Editing Progress'
  stages: ProgressStage[]
  displayType: 'linear' | 'circular' | 'kanban'
  showPercentage: boolean
  allowClientInput: boolean
  emailTriggers: EmailTrigger[]
}

interface ProgressStage {
  id: string
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  completedAt?: Date
  estimatedDuration?: number
  icon?: string
}
```

## Photography Workflow Example

```
const photoProgress = {
  stages: [
    { name: 'Images Backed Up', status: 'completed' },
    { name: 'Culling Complete', status: 'completed' },
    { name: 'Editing in Progress', status: 'in_progress' },
    { name: 'Quality Check', status: 'pending' },
    { name: 'Gallery Ready', status: 'pending' },
    { name: 'Delivered', status: 'pending' }
  ]
}
```

## Visual Representations

### Linear Progress Bar

```
// Calculate completion
const progress = (completedStages / totalStages) * 100
```

### Circular Progress

- Donut chart visualization
- Color-coded segments
- Animated transitions

### Kanban Board

- Drag-drop stages
- Multiple items tracking
- Due date indicators

## Email Triggers

```
// Auto-notify on stage completion
const triggers = [
  {
    stage: 'editing_complete',
    template: 'editing-complete-email',
    delay: 0
  },
  {
    stage: 'gallery_ready',
    template: 'gallery-ready-email',
    delay: 3600 // 1 hour delay
  }
]
```

## Client Interaction

- View-only vs interactive
- Approval requirements
- Feedback collection
- Estimated completion dates

## Analytics

- Average stage duration
- Bottleneck identification
- Client satisfaction correlation
- Supplier performance metrics