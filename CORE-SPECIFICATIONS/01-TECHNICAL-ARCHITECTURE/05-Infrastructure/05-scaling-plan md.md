# 05-scaling-plan.md

## Purpose

Plan for handling growth from 100 to 100,000+ users while maintaining performance and reliability.

## Growth Projections

### User Growth Phases

```
Phase 1 (Months 1-6): 0-1,000 suppliers
Phase 2 (Months 7-12): 1,000-5,000 suppliers
Phase 3 (Year 2): 5,000-20,000 suppliers
Phase 4 (Year 3+): 20,000-100,000+ suppliers
```

### Load Expectations

```
Per supplier:
- 20 active couples average
- 5 forms per supplier
- 100 API calls/day
- 50MB storage

At 10,000 suppliers:
- 200,000 couples
- 1M API calls/day
- 500GB total storage
```

## Infrastructure Scaling

### Database Scaling

### Phase 1-2: Vertical Scaling

- Increase Supabase plan tiers
- Optimize queries and indexes
- Implement connection pooling
- Add read replicas

### Phase 3-4: Horizontal Scaling

- Database sharding by supplier_id
- Separate read/write databases
- Move analytics to data warehouse
- Implement caching layer (Redis)

### Application Scaling

### Compute Resources

- Vercel auto-scaling for Next.js
- Edge functions for geo-distribution
- Background jobs via queue system
- Microservices for heavy operations

### Caching Strategy

```
1. CDN (Vercel Edge Network)
   - Static assets
   - API responses (where applicable)

2. Redis Cache
   - Session data
   - Frequently accessed data
   - Rate limiting counters

3. Database Query Cache
   - Prepared statements
   - Materialized views
```

## Performance Optimization

### Code Splitting

- Lazy load heavy components
- Route-based code splitting
- Dynamic imports for features
- Separate vendor bundles

### API Optimization

- GraphQL for complex queries
- Pagination everywhere
- Batch operations
- Response compression

### Database Optimization

- Denormalize hot paths
- Archive old data
- Partition large tables
- Async processing for reports

## Cost Management

### Resource Monitoring

```
Phase 1: <$500/month
- Basic Supabase
- Vercel Pro
- Minimal third-party APIs

Phase 2: $500-2,000/month
- Supabase Pro
- Vercel Pro
- Redis cache
- Monitoring tools

Phase 3: $2,000-10,000/month
- Supabase Business
- Vercel Enterprise
- Multiple service instances
- Advanced monitoring

Phase 4: $10,000+/month
- Custom infrastructure
- Dedicated support
- Global distribution
```

## Bottleneck Identification

### Current Limitations

1. Supabase connection limits
2. OpenAI API rate limits
3. File upload processing
4. Real-time subscriptions
5. Email sending limits

### Mitigation Strategies

1. Connection pooling + pgBouncer
2. Queue AI requests, use multiple keys
3. Background processing with queues
4. Limit channels per user
5. Multiple email providers + batching

## Team Scaling

### Technical Team Growth

```
Phase 1: 1-2 developers
Phase 2: 3-5 developers + 1 DevOps
Phase 3: 8-12 developers + 2 DevOps + 1 DBA
Phase 4: Multiple teams by domain
```

## Migration Strategies

### When to Migrate

- Database CPU consistently >70%
- Response times >2s average
- Storage costs exceeding compute
- Need for custom infrastructure

### Migration Plan

1. Set up parallel infrastructure
2. Replicate data in real-time
3. Gradual traffic shifting
4. Feature flag controlled
5. Rollback capability

## Critical Considerations

- Monitor growth metrics weekly
- Plan scaling 3 months ahead
- Keep architecture modular
- Avoid premature optimization
- Document scaling decisions
- Regular load testing
- Cost optimization reviews