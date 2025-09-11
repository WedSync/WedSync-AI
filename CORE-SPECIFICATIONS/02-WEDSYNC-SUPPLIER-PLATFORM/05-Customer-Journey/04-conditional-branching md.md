# 04-conditional-branching.md

## Overview

Logic system for creating dynamic journeys that adapt based on client data, behavior, and responses.

## Condition Types

```
interface BranchCondition {
  type: 'field_match' | 'form_response' | 'behavior' | 'date_based'
  operator: 'equals' | 'contains' | 'greater_than' | 'exists' | 'between'
  field: string
  value: any
  combineWith?: 'AND' | 'OR'
}
```

## Common Branch Scenarios

### Venue-Based

```
// Outdoor venues need weather content
if (client.venueType === 'outdoor') {
  addModule('weather-contingency-guide')
  addModule('tent-rental-info')
}
```

### Package-Based

- Premium: Additional touchpoints
- Standard: Core modules only
- Budget: Minimal automation

### Timeline-Based

- Rush weddings: Compressed journey
- Long engagements: Extended nurture
- Off-season: Different content focus

## Visual Builder

- Diamond-shaped decision nodes
- Color-coded paths (green/red)
- Percentage split display
- Test coverage indicators

## Complex Logic

```
// Multiple conditions
if (client.guestCount > 150 && 
    client.venue === 'outdoor' && 
    client.season === 'summer') {
  // Large outdoor summer wedding path
}
```

## Performance Tracking

- Path distribution analytics
- Conversion by branch
- Drop-off points
- A/B test results

## Professional Tier

Conditional branching requires Professional tier or higher for execution.