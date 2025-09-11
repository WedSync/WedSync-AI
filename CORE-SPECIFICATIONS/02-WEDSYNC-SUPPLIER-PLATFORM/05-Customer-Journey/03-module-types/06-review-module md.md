# 06-review-module.md

## Overview

Automated review collection at optimal post-wedding timing with platform distribution.

## Configuration

```
interface ReviewModule {
  type: 'review_request'
  timing: {
    daysAfterWedding: number // Typically 7-14
    followUpAfter: number // If no response
  }
  platforms: ('google' | 'facebook' | 'weddingwire' | 'internal')[]
  incentive?: {
    type: 'discount' | 'credit' | 'gift'
    value: string
  }
}
```

## Timing Strategy

- **Sweet Spot**: 7-14 days post-wedding
- **Honeymoon Check**: Avoid if traveling
- **Photo Delivery**: Coordinate with gallery
- **Emotion Peak**: While memories fresh

## Request Sequence

1. Thank you message
2. Gentle review ask
3. Direct platform links
4. Follow-up if needed
5. Thank you for review

## Platform Integration

```
// Generate platform-specific links
const reviewLinks = {
  google: `[https://g.page/r/${businessId}/review`](https://g.page/r/${businessId}/review`),
  facebook: `[https://facebook.com/${pageId}/reviews`](https://facebook.com/${pageId}/reviews`),
  internal: `${domain}/review/${clientId}`
}
```

## Response Handling

- Positive (4-5 stars): Public platforms
- Neutral (3 stars): Internal feedback
- Negative (1-2 stars): Direct contact

## Analytics

- Request to review conversion
- Platform preference tracking
- Sentiment analysis
- Response time patterns