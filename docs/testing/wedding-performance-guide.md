# Wedding Performance Testing Guide

## 🚨 Guardian Protocol - Wedding Day Testing Strategy

This guide explains how to use the comprehensive wedding performance testing suite to ensure your WedSync deployment can handle real wedding day operations.

## Overview

Wedding vendors depend on WedSync during critical moments - Saturday ceremonies, guest coordination, vendor management, and real-time communication. Our testing suite validates that the platform can handle these scenarios without failure.

### Critical Success Metrics

- **Response Time**: <500ms for all critical operations
- **Uptime**: 100% (zero tolerance for Saturday failures)
- **Error Rate**: <1% (wedding coordination cannot fail)
- **Concurrent Users**: Support 500+ simultaneous users
- **Data Integrity**: 100% (no lost wedding data)

## Testing Suite Components

### 1. Wedding Performance Suite (`wedding-performance-suite.js`)

Comprehensive performance validation across wedding-specific scenarios:

```bash
# Run complete performance test
npm run test:wedding-performance

# Test specific scenarios
node scripts/wedding-performance-suite.js
```

**Key Features:**
- **Pre-flight Checks**: Validates system health before testing
- **Wedding Scenarios**: Tests 5 critical wedding day patterns
- **Endpoint Validation**: Tests all critical API endpoints
- **Network Conditions**: Validates performance on poor venue connections
- **Wedding Readiness**: Provides pass/fail assessment

**Scenarios Tested:**
- Saturday Peak Load (200 concurrent users)
- Venue Coordination Rush (urgent timeline changes)
- Guest Check-in Burst (arrival chaos)
- Rural Venue Challenge (poor connectivity)
- Vendor Emergency Response (crisis coordination)

### 2. Wedding Load Test (`wedding-load-test.js`)

Simulates real wedding day load patterns throughout the day:

```bash
# Run ceremony peak load test
npm run test:wedding-load -- --pattern ceremonyPeak

# Run full day simulation
npm run test:wedding-load -- --pattern receptionChaos --duration 60

# Real HTTP requests (production testing)
npm run test:wedding-load -- --pattern ceremonyPeak --real
```

**Load Patterns:**
- **Morning Setup** (6-9 AM): Vendors arriving and setting up
- **Pre-Rush** (10 AM-12 PM): Guest arrivals and form submissions
- **Ceremony Peak** (12-2 PM): Maximum coordination load
- **Reception Chaos** (6-11 PM): Extended high-load period
- **Late Cleanup** (11 PM-2 AM): Final tasks and reports

**User Actions Simulated:**
- Authentication (vendor logins)
- Guest check-in and form submissions
- Timeline synchronization
- Photo uploads (2-5MB files)
- Real-time coordination updates
- Emergency responses
- Payment processing

### 3. Combined Wedding Readiness Test

```bash
# Complete wedding readiness validation
npm run test:wedding-ready

# Guardian Protocol deployment check
npm run guardian:deploy-check
```

## Test Execution Guide

### Pre-Test Setup

1. **Environment Configuration**:
   ```bash
   export NEXT_PUBLIC_SITE_URL=https://your-domain.com
   export NODE_ENV=production
   ```

2. **Database Preparation**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. **Security Verification**:
   ```bash
   npm run security:scan
   ```

### Running Tests

#### Development Testing (Simulation Mode)
```bash
# Quick performance check
npm run test:wedding-performance

# Load test simulation
npm run test:wedding-load -- --pattern ceremonyPeak --users 100
```

#### Staging/Production Testing (Real Mode)
```bash
# Real load test (use carefully)
npm run test:wedding-load -- --real --pattern ceremonyPeak --duration 30
```

⚠️ **Warning**: Real mode makes actual HTTP requests to your server. Only use on staging or during planned maintenance windows.

### Understanding Results

#### Wedding Readiness Status

**✅ WEDDING READY**: Platform can handle wedding day operations
- All critical endpoints respond <500ms
- Error rate <1%
- No critical issues detected
- Concurrency targets met

**🚨 WEDDING RISK**: Critical issues must be resolved
- Slow response times detected
- High error rates
- Critical functionality failures
- Insufficient concurrency handling

#### Performance Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Average Response Time | <300ms | <500ms |
| 95th Percentile Response Time | <500ms | <1000ms |
| Error Rate | <0.5% | <1% |
| Concurrent Users | 500+ | 200+ |
| Uptime | 100% | 99.9% |

## Test Reports

### Automated Report Generation

Tests automatically generate comprehensive reports:

```
wedsync/reports/
├── wedding-performance-[timestamp].json     # Detailed performance data
├── wedding-performance-[timestamp]-summary.md # Human-readable summary
├── load-tests/
│   ├── [test-id].json                       # Load test data
│   └── [test-id]-summary.md                 # Load test summary
```

### Key Report Sections

1. **Executive Summary**: Wedding readiness status and critical issues
2. **Performance Metrics**: Response times, error rates, concurrency
3. **Scenario Results**: Performance across wedding day patterns
4. **Critical Issues**: Must-fix problems for wedding safety
5. **Recommendations**: Specific actions to improve performance
6. **Network Analysis**: Performance across connection qualities

## Wedding Day Scenarios

### Scenario 1: Saturday Morning Setup
**Time**: 6-9 AM  
**Users**: 10-40 concurrent  
**Actions**: Vendor authentication, timeline review, setup checklists

```bash
npm run test:wedding-load -- --pattern morningSetup
```

### Scenario 2: Pre-Ceremony Rush  
**Time**: 10 AM-12 PM  
**Users**: 30-150 concurrent  
**Actions**: Guest check-ins, form submissions, photo uploads

```bash
npm run test:wedding-load -- --pattern preRush
```

### Scenario 3: Ceremony Peak
**Time**: 12-2 PM  
**Users**: 150-300 concurrent  
**Actions**: Timeline sync, real-time updates, photo streaming

```bash
npm run test:wedding-load -- --pattern ceremonyPeak
```

### Scenario 4: Reception Chaos
**Time**: 6-11 PM  
**Users**: 200-500 concurrent  
**Actions**: All systems, emergency coordination, guest interactions

```bash
npm run test:wedding-load -- --pattern receptionChaos
```

## Network Condition Testing

Tests validate performance across realistic venue conditions:

### Connection Types
- **Good**: Corporate/high-speed (5 Mbps, 50ms latency)
- **Venue 3G**: Typical wedding venue (750 Kbps, 300ms latency)
- **Venue Edge**: Poor venue connection (240 Kbps, 500ms latency)
- **Rural**: Remote location (150 Kbps, 800ms latency)

### Critical Thresholds by Connection
| Connection | Max Response Time | Max Error Rate |
|------------|------------------|----------------|
| Good | 200ms | 0.1% |
| Venue 3G | 500ms | 1% |
| Venue Edge | 1000ms | 2% |
| Rural | 2000ms | 5% |

## Troubleshooting Common Issues

### Slow Response Times
```bash
# Analyze performance bottlenecks
npm run analyze:bundle
npm run lighthouse

# Check database performance
npm run db:analyze
```

**Solutions**:
- Enable caching for static assets
- Optimize database queries
- Implement CDN
- Add connection pooling

### High Error Rates
```bash
# Check error logs
tail -f logs/application.log

# Monitor system resources
htop
```

**Solutions**:
- Implement circuit breakers
- Add retry logic
- Improve error handling
- Scale infrastructure

### Failed Concurrency Tests
```bash
# Monitor resource usage during tests
docker stats
```

**Solutions**:
- Increase server capacity
- Optimize connection handling
- Implement horizontal scaling
- Add load balancing

## CI/CD Integration

### Pre-Deployment Testing
```yaml
# GitHub Actions example
- name: Wedding Readiness Test
  run: |
    npm run guardian:deploy-check
    if [ $? -ne 0 ]; then
      echo "❌ NOT WEDDING READY - Deployment blocked"
      exit 1
    fi
```

### Monitoring Integration
```bash
# Set up continuous monitoring
npm run performance:monitor -- --interval=60 --alert-threshold=500
```

## Saturday Deployment Protocol

**🚨 CRITICAL RULE**: NO deployments on Saturdays (wedding days)

### Pre-Saturday Checklist
1. **Friday 6 PM**: Run complete test suite
2. **Verify**: Wedding readiness status = ✅
3. **Monitor**: Set up enhanced monitoring
4. **Prepare**: Emergency response procedures
5. **Communicate**: Notify all stakeholders

### Emergency Procedures
If issues arise during a Saturday wedding:

1. **Immediate**: Switch to read-only mode
2. **Alert**: Notify emergency response team
3. **Fallback**: Activate backup systems
4. **Communication**: Update affected vendors
5. **Recovery**: Plan post-wedding fixes

## Best Practices

### 1. Regular Testing Schedule
- **Daily**: Performance monitoring
- **Weekly**: Load testing on staging
- **Monthly**: Full wedding readiness test
- **Pre-Season**: Comprehensive stress testing

### 2. Test Environment Management
- **Staging**: Mirror production exactly
- **Data**: Use realistic wedding datasets
- **Scale**: Test at 2x expected load
- **Monitoring**: Full observability stack

### 3. Performance Budget Management
- **API Response**: <500ms budget
- **Bundle Size**: <2MB total
- **Memory Usage**: <512MB per process
- **CPU Usage**: <80% average

### 4. Continuous Improvement
- **Baselines**: Establish performance baselines
- **Trending**: Monitor performance over time
- **Alerting**: Set up proactive alerts
- **Review**: Regular performance reviews

## Emergency Contacts

For wedding day emergencies:
- **Technical Lead**: [Contact Information]
- **Database Admin**: [Contact Information]
- **DevOps Engineer**: [Contact Information]
- **Emergency Hotline**: [Number]

---

**Remember**: Wedding days are sacred. Zero tolerance for failure. When in doubt, test more, deploy less.

*Generated by Guardian Protocol Wedding Testing Suite*