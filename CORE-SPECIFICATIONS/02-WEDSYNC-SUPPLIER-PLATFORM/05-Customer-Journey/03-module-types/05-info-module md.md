# 05-info-module.md

## Overview

Informational content delivery without requiring action, perfect for tips and updates.

## Configuration

```
interface InfoModule {
  type: 'info'
  config: {
    contentType: 'text' | 'html' | 'markdown'
    content: string
    displayIn: ('dashboard' | 'email' | 'both')[]
    priority: 'low' | 'normal' | 'high'
    dismissible: boolean
  }
}
```

## Content Types

- **Tips & Advice**: Preparation guides
- **Updates**: Status changes, timeline shifts
- **Education**: Process explanations
- **Inspiration**: Mood boards, examples

## Display Logic

- Dashboard cards with formatting
- Email rendering for notifications
- Mobile-responsive layouts
- Read receipt tracking

## Conditional Display

```
// Show venue-specific content
if (client.venue === 'outdoor') {
  showContent('weather-contingency-tips')
}
```

## Content Management

- Version control for updates
- A/B testing different messages
- Engagement tracking
- Feedback collection

## Free Tier Behavior

- Info modules work in free tier
- No automation or scheduling
- Manual sending only
- Basic analytics