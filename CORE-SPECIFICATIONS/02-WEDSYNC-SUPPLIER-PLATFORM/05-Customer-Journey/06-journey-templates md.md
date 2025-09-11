# 06-journey-templates.md

## Overview

Pre-built journey templates for different supplier types and service levels.

## Template Structure

```
interface JourneyTemplate {
  id: string
  name: string
  category: SupplierType
  tier: 'basic' | 'standard' | 'premium'
  modules: Module[]
  timeline: TimelineConfig
  description: string
  metrics: PerformanceMetrics
}
```

## Photography Templates

### Basic Journey

- Welcome email
- Contract & forms
- Timeline planning (6 weeks before)
- Final details (1 week before)
- Thank you & gallery delivery

### Premium Journey

- Adds: Engagement session planning
- Style consultation
- Vendor coordination
- Multiple check-ins
- Album design follow-up

## Template Categories

- **By Supplier Type**: Photography, DJ, Catering, etc.
- **By Package Level**: Budget, Standard, Luxury
- **By Timeline**: Rush, Standard, Extended
- **By Season**: Summer, Winter weddings

## Customization

```
// Clone and modify
const customJourney = cloneTemplate('premium-photography')
customJourney.modules.push(newModule)
customJourney.timeline.adjust(days: -7)
```

## Marketplace Integration

- Browse community templates
- Purchase proven journeys
- Share successful patterns
- Rating and reviews

## Import/Export

- JSON format for sharing
- Version control
- Backup and restore
- Cross-account transfer