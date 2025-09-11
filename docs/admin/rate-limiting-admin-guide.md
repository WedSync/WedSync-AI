# WedSync Rate Limiting - Administrator Guide

## 📚 Quick Navigation
- [Executive Summary](#executive-summary)
- [Wedding Industry Context](#wedding-industry-context)
- [System Overview](#system-overview)
- [Configuration Management](#configuration-management)
- [Wedding Season Operations](#wedding-season-operations)
- [Emergency Procedures](#emergency-procedures)
- [Monitoring & Alerts](#monitoring--alerts)
- [Troubleshooting](#troubleshooting)

## Executive Summary

The WedSync Rate Limiting System is mission-critical infrastructure that protects our platform during peak wedding season traffic while ensuring fair access for all vendors. This system automatically scales to handle the unique traffic patterns of the wedding industry, where demand can increase by 500% during peak months (May-September) and surge by 1000% on Saturday mornings.

**Critical Success Metrics:**
- **Response Time**: <5ms (industry-leading)
- **Availability**: 99.99% uptime during wedding season
- **Fair Access**: All subscription tiers receive guaranteed bandwidth
- **Abuse Protection**: Block data scraping and DDoS attempts
- **Wedding Day Protection**: Zero rate limit denials on Saturdays

## Wedding Industry Context

### Understanding Wedding Vendor Behavior

**Photographers (40% of our users):**
- Upload galleries Sunday evenings after weddings
- Peak activity: 6-10 PM Sunday nights
- Bulk operations: 200-500 photos per wedding
- Critical periods: Day-after delivery expectations

**Venues (25% of our users):**
- Schedule updates Monday mornings
- Peak activity: 8-10 AM Mondays
- Bulk operations: Multiple wedding bookings
- Critical periods: Booking season (January-March)

**Wedding Planners (20% of our users):**
- Coordination calls throughout the day
- Peak activity: 9 AM - 6 PM weekdays
- Bulk operations: Multi-vendor communications
- Critical periods: Final month before weddings

**Other Vendors (15%):**
- Florists: Tuesday-Thursday prep days
- Caterers: Week-of final counts
- Musicians: Equipment check downloads

### Traffic Patterns

```
Wedding Season Traffic Multipliers:
- January-February: 0.7x (planning season starts)
- March-April: 1.2x (booking confirmations)
- May-September: 2.0x (PEAK WEDDING SEASON)
- October-November: 1.3x (fall weddings)
- December: 0.8x (holiday slowdown)

Daily Patterns:
- Saturday 8-11 AM: 5x normal (wedding day prep)
- Sunday 6-10 PM: 3x normal (post-wedding uploads)
- Monday 8-10 AM: 2x normal (venue updates)
- Weekday 1-3 PM: 1.5x normal (lunch break planning)
```

## System Overview

### Architecture Components

**Primary Rate Limiter:**
- Redis Cluster for distributed state management
- Sliding window algorithm for smooth rate limiting
- Memory fallback for Redis unavailability
- Per-subscription-tier limits with vendor-type modifiers

**Wedding Season Multipliers:**
- Automatic scaling based on calendar month
- Real-time adjustment for peak periods
- Weekend surge protection
- Holiday schedule awareness

**Subscription Tier Limits:**

| Tier | Requests/Minute | Burst Allowance | Upload Limit | API Calls |
|------|-----------------|-----------------|--------------|-----------|
| FREE | 30 | 45 | 50MB | 100/hour |
| STARTER | 60 | 90 | 200MB | 500/hour |
| PROFESSIONAL | 120 | 180 | 1GB | 2000/hour |
| SCALE | 300 | 450 | 5GB | 10000/hour |
| ENTERPRISE | 1000 | 1500 | 50GB | 50000/hour |

### Redis Configuration

**Production Redis Cluster:**
```yaml
Cluster Nodes: 6 (3 masters, 3 replicas)
Memory per Node: 8GB
Persistence: RDB + AOF
Failover: Automatic with 30s timeout
Backup Schedule: Daily at 2 AM UTC
Retention: 7 days rolling
```

**Rate Limit Keys Structure:**
```
rate_limit:{org_id}:{endpoint}:{minute_window}
rate_limit:global:{endpoint}:{minute_window}
rate_limit:burst:{org_id}:{endpoint}
```

## Configuration Management

### Environment Variables

**Production Environment (/.env.production):**
```env
# Redis Configuration
REDIS_URL=redis://wedding-redis-cluster.internal:6379
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
REDIS_SENTINEL_SERVICE=wedding-redis-sentinel
REDIS_PASSWORD=${REDIS_PASSWORD}

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT_WINDOW=60000
RATE_LIMIT_WEDDING_SEASON_MULTIPLIER=2.0
RATE_LIMIT_SATURDAY_MORNING_MULTIPLIER=5.0
RATE_LIMIT_EMERGENCY_MODE=false

# Wedding Season Dates (updated annually)
WEDDING_SEASON_START=05-01
WEDDING_SEASON_END=09-30
PEAK_SATURDAY_START_HOUR=8
PEAK_SATURDAY_END_HOUR=11

# Monitoring
RATE_LIMIT_ALERTS_ENABLED=true
RATE_LIMIT_SLACK_WEBHOOK=${SLACK_WEBHOOK_URL}
RATE_LIMIT_METRICS_RETENTION_DAYS=90
```

### Tier Limit Adjustments

**Dynamic Tier Adjustments:**
```typescript
// Emergency capacity increase (use with caution)
await updateTierLimits({
  tier: 'PROFESSIONAL',
  multiplier: 1.5, // 50% increase
  duration: '4h',   // Automatic revert
  reason: 'Mother\'s Day wedding surge'
});

// Vendor-specific adjustments
await updateVendorLimits({
  vendorType: 'photographer',
  multiplier: 2.0,
  timeWindow: 'sunday_evening',
  reason: 'Post-wedding gallery uploads'
});
```

### Feature Flags

**Critical Feature Flags:**
```javascript
RATE_LIMIT_STRICT_MODE: false        // Emergency: disable all limits
RATE_LIMIT_WEDDING_DAY_BOOST: true   // Saturday morning multipliers
RATE_LIMIT_MEMORY_FALLBACK: true     // Redis failure protection
RATE_LIMIT_AUDIT_LOGGING: true       // GDPR compliance tracking
RATE_LIMIT_BURST_PROTECTION: true    // Short-term surge handling
```

## Wedding Season Operations

### Pre-Season Preparation (April)

**Infrastructure Scaling:**
1. **Redis Cluster Health Check**
   ```bash
   # Run comprehensive cluster health assessment
   ./scripts/redis-cluster-health-check.sh
   
   # Expected output: All nodes GREEN, <50ms latency
   # Action required if: Any node YELLOW or RED status
   ```

2. **Capacity Planning**
   ```bash
   # Analyze previous year's peak traffic
   ./scripts/wedding-season-capacity-analysis.sh
   
   # Review and adjust tier limits based on growth
   ./scripts/update-seasonal-multipliers.sh 2.5  # 25% increase from last year
   ```

3. **Load Testing**
   ```bash
   # Run wedding season simulation
   npm run test:load-wedding-season
   
   # Validate 500+ concurrent users performance
   # Verify <5ms response times under peak load
   ```

### Peak Season Monitoring (May-September)

**Daily Operations Checklist:**
- [ ] **Morning (8 AM):** Check Saturday wedding traffic surge
- [ ] **Midday (12 PM):** Verify photographer upload capacity
- [ ] **Evening (6 PM):** Monitor post-wedding data uploads
- [ ] **Night (10 PM):** Review daily peak metrics and alerts

**Weekly Operations:**
- [ ] **Monday:** Analyze weekend traffic patterns
- [ ] **Wednesday:** Review tier utilization and adjust if needed
- [ ] **Friday:** Prepare for weekend wedding surge
- [ ] **Sunday:** Process post-weekend upload surge

**Saturday Wedding Day Protocol:**

```bash
# 6 AM: Activate wedding day boost
./scripts/activate-wedding-day-boost.sh

# Monitor critical metrics every 15 minutes:
# - Request success rate: >99.5%
# - Response time p95: <5ms
# - Redis cluster health: All GREEN
# - Memory usage: <80%

# 2 PM: Begin post-ceremony upload preparation
./scripts/prepare-upload-surge.sh

# 6 PM: Monitor evening reception uploads
# Expected: 3x normal upload volume
```

### Emergency Scaling Procedures

**Traffic Surge Response (5-minute procedure):**

1. **Immediate Assessment (0-1 minute):**
   ```bash
   # Check current load
   curl -s http://internal-monitoring.wedsync.com/api/rate-limit-status
   
   # Verify Redis cluster health
   redis-cli -c cluster nodes | grep -E "(master|fail)"
   ```

2. **Auto-scaling Activation (1-2 minutes):**
   ```bash
   # Activate emergency capacity
   ./scripts/emergency-capacity-boost.sh 1.5x
   
   # Enable burst protection
   ./scripts/enable-burst-protection.sh
   ```

3. **Team Notification (2-3 minutes):**
   ```bash
   # Alert engineering team
   ./scripts/alert-engineering-team.sh "WEDDING_TRAFFIC_SURGE"
   
   # Update status page
   ./scripts/update-status-page.sh "Increased capacity activated for wedding season traffic"
   ```

4. **Monitoring Activation (3-5 minutes):**
   ```bash
   # Enable enhanced monitoring
   ./scripts/enable-enhanced-monitoring.sh
   
   # Start real-time dashboard
   ./scripts/launch-realtime-dashboard.sh
   ```

## Emergency Procedures

### Redis Cluster Failure

**Symptoms:**
- Rate limiting falls back to in-memory (per-server)
- Uneven load distribution across servers
- Some users may experience inconsistent limits

**Immediate Response (2-minute procedure):**

1. **Verify Failure (0-30 seconds):**
   ```bash
   # Check Redis cluster status
   redis-cli -c cluster info
   
   # Expected: cluster_state:fail or connection timeout
   ```

2. **Activate Memory Fallback (30-60 seconds):**
   ```bash
   # Ensure fallback is active (should be automatic)
   ./scripts/verify-memory-fallback.sh
   
   # Temporarily reduce limits to prevent server overload
   ./scripts/reduce-fallback-limits.sh 0.7x
   ```

3. **Begin Recovery (1-2 minutes):**
   ```bash
   # Attempt cluster recovery
   ./scripts/redis-cluster-recovery.sh
   
   # If recovery fails, failover to backup cluster
   ./scripts/failover-to-backup-cluster.sh
   ```

**Post-Recovery Actions:**
- Run full cluster health check
- Verify data consistency across nodes
- Restore normal rate limits gradually
- Document incident for post-mortem

### DDoS Attack Response

**Identification Criteria:**
- Sudden spike in requests from single IP/org
- Requests bypass normal user behavior patterns
- Response times increase across the platform

**Response Procedure (3-minute response):**

1. **Immediate Block (0-1 minute):**
   ```bash
   # Block attacking IP/organization
   ./scripts/emergency-ip-block.sh [ATTACKER_IP]
   
   # Enable strict rate limiting
   ./scripts/enable-strict-mode.sh
   ```

2. **Analysis and Expansion (1-2 minutes):**
   ```bash
   # Analyze attack pattern
   ./scripts/analyze-attack-pattern.sh
   
   # Block attack subnet if distributed
   ./scripts/block-subnet.sh [SUBNET_RANGE]
   ```

3. **Platform Protection (2-3 minutes):**
   ```bash
   # Reduce limits for all free tier users
   ./scripts/emergency-free-tier-limits.sh 0.5x
   
   # Enable enhanced logging
   ./scripts/enable-attack-logging.sh
   ```

### Data Scraping Detection

**Automated Detection Triggers:**
- Rapid, sequential requests across multiple endpoints
- Requests for large datasets outside normal vendor patterns
- Attempts to access competitor data

**Response Actions:**
```bash
# Automatically triggered by system:
./scripts/scraping-response.sh [ORG_ID]

# This script:
# 1. Reduces org limits to 10% of normal
# 2. Enables enhanced logging for the organization
# 3. Alerts security team
# 4. Requires manual review to restore normal limits
```

## Monitoring & Alerts

### Key Performance Indicators (KPIs)

**Response Time Metrics:**
- **Target:** <5ms p95 response time
- **Warning:** >8ms p95 response time
- **Critical:** >15ms p95 response time

**Availability Metrics:**
- **Target:** 99.99% success rate
- **Warning:** <99.95% success rate
- **Critical:** <99.9% success rate

**Throughput Metrics:**
- **Normal:** 1,000-5,000 requests/minute
- **Peak Season:** 10,000-25,000 requests/minute
- **Saturday Mornings:** 50,000+ requests/minute

**Resource Utilization:**
- **Redis Memory:** <80% usage
- **CPU Usage:** <70% across all nodes
- **Network Bandwidth:** <60% of available

### Alert Configuration

**Slack Alerts (Engineering Channel):**
```yaml
High Priority (Immediate Response):
  - Rate limit failure rate >1%
  - Redis cluster node failure
  - Response time p95 >15ms
  - Saturday morning traffic issues

Medium Priority (15-minute Response):
  - Rate limit failure rate >0.5%
  - Response time p95 >8ms
  - Memory usage >80%
  - Unusual traffic patterns

Low Priority (1-hour Response):
  - Tier utilization changes >50%
  - New attack pattern detected
  - Performance degradation trends
```

**Email Alerts (Management Team):**
```yaml
Critical Business Impact:
  - Wedding day rate limiting failures
  - Revenue-affecting tier limit issues
  - Security incidents requiring user notification
  - Planned maintenance during peak periods
```

### Dashboard Monitoring

**Real-time Dashboard Metrics:**
1. **Current Request Rate:** Live requests/minute with trend
2. **Response Time Distribution:** P50, P95, P99 response times
3. **Success Rate by Tier:** Success percentage per subscription tier
4. **Redis Cluster Health:** Node status and memory usage
5. **Geographic Distribution:** Traffic by region
6. **Vendor Type Analysis:** Usage patterns by vendor type

**Historical Analysis Dashboard:**
1. **Wedding Season Trends:** Year-over-year comparison
2. **Tier Migration Patterns:** User upgrade/downgrade trends
3. **Peak Event Correlation:** Traffic vs. wedding dates
4. **Performance Over Time:** Long-term response time trends

## Troubleshooting

### Common Issues and Solutions

#### 1. Photographers Unable to Upload Wedding Galleries

**Symptoms:**
- Multiple photographers reporting upload failures
- Error: "Rate limit exceeded - please try again"
- Time: Typically Sunday evenings

**Diagnosis:**
```bash
# Check photographer-specific limits
./scripts/check-vendor-limits.sh photographer

# Review Sunday evening traffic patterns
./scripts/analyze-upload-traffic.sh --day sunday --time evening
```

**Solution:**
```bash
# Temporarily increase photographer limits
./scripts/increase-vendor-limits.sh photographer 1.5x --duration 4h

# Enable upload queue for large galleries
./scripts/enable-upload-queue.sh --vendor photographer
```

#### 2. Venue Double-booking Prevention Failures

**Symptoms:**
- Venues reporting duplicate bookings
- Rate limits preventing availability checks
- Peak times: Monday mornings

**Diagnosis:**
```bash
# Check venue booking API limits
./scripts/check-endpoint-limits.sh /api/venue/check-availability

# Review venue booking patterns
./scripts/analyze-booking-patterns.sh --vendor venue
```

**Solution:**
```bash
# Prioritize availability check endpoints
./scripts/prioritize-endpoint.sh /api/venue/check-availability

# Implement booking queue system
./scripts/enable-booking-queue.sh venue
```

#### 3. Wedding Planner Coordination Issues

**Symptoms:**
- Planners unable to send bulk communications
- Rate limits during final month coordination
- Multiple vendor messaging failures

**Diagnosis:**
```bash
# Check communication endpoint limits
./scripts/check-communication-limits.sh wedding-planner

# Analyze bulk messaging patterns
./scripts/analyze-bulk-messaging.sh
```

**Solution:**
```bash
# Enable planner burst allowance
./scripts/enable-planner-burst.sh --multiplier 2.0

# Implement message queuing
./scripts/enable-message-queue.sh wedding-planner
```

### Performance Optimization

#### Redis Memory Optimization

**Memory Usage Analysis:**
```bash
# Check Redis memory usage patterns
redis-cli -c info memory

# Identify memory-intensive keys
redis-cli -c --bigkeys

# Expected findings:
# - Rate limit keys should be <1KB each
# - Total memory <80% of available
# - Eviction count should be 0
```

**Optimization Commands:**
```bash
# Adjust key expiration
./scripts/optimize-key-expiration.sh

# Enable memory-efficient serialization
./scripts/enable-efficient-serialization.sh

# Configure memory eviction policy
redis-cli config set maxmemory-policy allkeys-lru
```

#### Algorithm Optimization

**Sliding Window Tuning:**
```bash
# Analyze current window performance
./scripts/analyze-sliding-window.sh

# Adjust window size based on traffic patterns
./scripts/optimize-window-size.sh --size 60000ms

# Enable micro-batching for better performance
./scripts/enable-micro-batching.sh
```

### Security Troubleshooting

#### Audit Log Analysis

**GDPR Compliance Check:**
```bash
# Verify all rate limiting decisions are logged
./scripts/verify-audit-logging.sh

# Generate GDPR compliance report
./scripts/generate-gdpr-report.sh --days 30

# Expected output:
# - All rate limit denials logged with user context
# - Personal data handling documented
# - Retention policies enforced
```

#### Attack Pattern Analysis

**Identify Sophisticated Attacks:**
```bash
# Analyze subtle scraping patterns
./scripts/analyze-subtle-scraping.sh

# Detect credential stuffing attempts
./scripts/detect-credential-stuffing.sh

# Generate attack intelligence report
./scripts/generate-attack-report.sh --days 7
```

### Escalation Procedures

#### Level 1 - Support Team
**Response Time:** 15 minutes
**Issues:** Individual user rate limiting problems
**Actions:** Check user tier, verify usage patterns, temporary limit adjustments

#### Level 2 - Engineering Team
**Response Time:** 5 minutes
**Issues:** System-wide rate limiting issues, performance degradation
**Actions:** System diagnostics, infrastructure scaling, emergency configurations

#### Level 3 - Leadership Team
**Response Time:** Immediate
**Issues:** Revenue-impacting outages, security incidents, wedding day failures
**Actions:** Business continuity decisions, customer communication, legal compliance

### Contact Information

**Emergency Contacts:**
- **Engineering On-Call:** +44 7700 900123 (24/7)
- **Product Manager:** +44 7700 900124 (Business Hours)
- **CTO:** +44 7700 900125 (Critical Issues Only)

**Vendor Support:**
- **Redis Enterprise:** support@redis.com
- **AWS Support:** Via AWS Console (Business Plan)
- **Monitoring:** alerts@datadog.com

## Conclusion

The WedSync Rate Limiting System is designed to handle the unique demands of the wedding industry while maintaining exceptional performance and reliability. This system automatically adapts to wedding season traffic patterns, protects against abuse, and ensures fair access for all vendors.

**Success is measured by:**
- ✅ Zero wedding day disruptions
- ✅ <5ms response times during peak traffic
- ✅ Fair access across all subscription tiers
- ✅ Proactive protection against abuse
- ✅ Seamless scaling during wedding season

**Remember:** Every wedding is once-in-a-lifetime. Our rate limiting system ensures that vendors can focus on creating perfect wedding experiences while we handle the technical infrastructure seamlessly.

---

*Last Updated: January 2025*  
*Document Version: 1.0*  
*Review Schedule: Monthly during wedding season, quarterly off-season*  
*Owner: Platform Engineering Team*