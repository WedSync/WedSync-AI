# 04-rate-limiting.md

## Purpose

Implement rate limiting to prevent API abuse, ensure fair usage, and maintain system performance under load.

## Key Implementation Details

### Rate Limit Strategy

- **Per-endpoint limits**: Different limits for different operations
- **User-based limiting**: Track by authenticated user ID
- **IP-based fallback**: For unauthenticated endpoints
- **Tiered limits**: Higher limits for premium tiers

### Technical Implementation

```
// Use Upstash Redis for distributed rate limiting
// Key pattern: rate_limit:{user_id}:{endpoint}:{window}
// Windows: 1min, 1hour, 1day
```

### Limit Configuration

- **Forms API**: 100 requests/hour (create/update heavy)
- **Search API**: 1000 requests/hour (read-heavy)
- **AI Generation**: 50 requests/day (expensive operation)
- **File Upload**: 20 requests/hour (bandwidth intensive)

### Response Headers

- Always include: X-RateLimit-Limit, X-RateLimit-Remaining
- Include X-RateLimit-Reset on limit exceeded
- Return 429 status with retry-after header

### Premium Tier Multipliers

- Free: 1x base limits
- Starter: 2x base limits
- Professional: 5x base limits
- Scale: 10x base limits
- Enterprise: Custom/unlimited

## Critical Considerations

- Cache rate limit checks for performance
- Implement gradual backoff for repeated violations
- Whitelist critical internal services
- Monitor and alert on unusual patterns
- Provide clear error messages with upgrade paths