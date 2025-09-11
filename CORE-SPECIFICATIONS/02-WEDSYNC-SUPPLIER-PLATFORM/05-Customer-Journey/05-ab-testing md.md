# 05-ab-testing.md

## Overview

Split testing framework for optimizing journey performance through controlled experiments.

## Test Configuration

```
interface ABTest {
  id: string
  name: string
  variants: [
    { id: 'control', allocation: 50, modules: Module[] },
    { id: 'variant_a', allocation: 50, modules: Module[] }
  ]
  metrics: ['open_rate', 'completion_rate', 'booking_rate']
  minSampleSize: number
  maxDuration: number // days
}
```

## Test Types

### Content Tests

- Email subject lines
- Message tone (formal vs casual)
- Content length
- Call-to-action wording

### Timing Tests

- Send times (morning vs evening)
- Day of week
- Interval between touches
- Journey compression

### Channel Tests

- Email vs SMS
- Single vs multi-channel
- Sequence variations

## Statistical Framework

```
// Significance calculation
function calculateSignificance(control, variant) {
  const z = calculateZScore(control, variant)
  return z > 1.96 // 95% confidence
}
```

## Winner Selection

- Automatic after significance
- Manual override option
- Gradual rollout (70/30 → 100/0)
- Reversion capability

## Analytics Dashboard

- Real-time variant performance
- Confidence intervals
- Projected lift
- Historical test results

## Scale Tier Features

- Unlimited variants
- Multivariate testing
- AI-powered test suggestions
- Cross-journey testing