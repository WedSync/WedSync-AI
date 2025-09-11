# 03-form-module.md

## Overview

Triggers form completion requests with smart reminders and progress tracking.

## Module Configuration

```
interface FormModule {
  formId: string
  config: {
    dueDate: RelativeDate | FixedDate
    reminderSchedule: number[] // [3, 7, 14] days
    required: boolean
    blockProgress: boolean // Prevents journey continuation
    notifyOnComplete: boolean
  }
}
```

## Form Deployment

- Generate unique access URLs
- Pre-populate with core fields
- Track partial completion
- Save progress automatically

## Reminder System

```
// Escalating reminders
const reminders = [
  { days: 3, channel: 'email', tone: 'friendly' },
  { days: 7, channel: 'email', tone: 'urgent' },
  { days: 14, channel: 'sms', tone: 'final' }
]
```

## Completion Tracking

- Real-time progress updates
- Field-by-field completion
- Time spent metrics
- Abandonment points

## Conditional Logic

- Skip if already completed
- Branch based on responses
- Trigger follow-up forms
- Update journey path

## Integration

- Form builder connection
- Response data flow to core fields
- Activity timeline logging
- Analytics dashboard updates