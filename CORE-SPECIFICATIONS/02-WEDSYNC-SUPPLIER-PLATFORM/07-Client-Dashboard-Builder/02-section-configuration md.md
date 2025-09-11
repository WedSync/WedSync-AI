# 02-section-configuration.md

## Overview

Configuration system for individual dashboard sections with content, styling, and behavior options.

## Section Schema

```
interface DashboardSection {
  id: string
  type: SectionType
  title: string
  description?: string
  content: SectionContent
  visibility: {
    condition?: VisibilityCondition
    timeline?: TimelineVisibility
    devices?: ('desktop' | 'mobile')[]
  }
  style: SectionStyle
  order: number
}
```

## Content Configuration

### Forms Section

```
interface FormsSection {
  displayMode: 'list' | 'cards' | 'timeline'
  showStatus: boolean
  showDueDate: boolean
  groupBy?: 'status' | 'dueDate' | 'supplier'
  includeCompleted: boolean
}
```

### Documents Section

- File categories
- Download permissions
- Preview capabilities
- Version display

### FAQ Section

- Categories/topics
- Search enabled
- Expandable answers
- Related articles

## Visibility Rules

```
// Conditional display
const visibilityRules = {
  showAfter: 'booking_confirmed',
  hideAfter: 'wedding_complete',
  onlyIf: (client) => client.package === 'premium',
  timeline: {
    from: '6_months_before',
    to: '1_month_after'
  }
}
```

## Dynamic Content

- Journey stage-based content
- Countdown timers
- Progress indicators
- Live updates via WebSocket

## Section Interactions

- Expandable/collapsible
- Drag to reorder (admin)
- Quick actions
- Deep linking