# WS-340 Scalability Infrastructure - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the WedSync Scalability Infrastructure system. The system provides intelligent auto-scaling, wedding-aware load prediction, real-time performance monitoring, and enterprise-grade security for handling 1M+ concurrent users.

## Prerequisites

### System Requirements

- **Node.js**: 18.17.0 or higher
- **Next.js**: 15.4.3 with App Router
- **TypeScript**: 5.9.2 strict mode
- **Database**: PostgreSQL 15+ with Supabase
- **Memory**: Minimum 16GB RAM for production
- **CPU**: Minimum 8 cores for production
- **Storage**: 100GB+ SSD storage

### Dependencies

```bash
npm install @supabase/supabase-js
npm install next react react-dom typescript
npm install @types/node @types/react @types/react-dom
npm install zustand @tanstack/react-query
npm install zod react-hook-form @hookform/resolvers
```

### Development Dependencies

```bash
npm install -D jest @jest/globals @types/jest
npm install -D jest-environment-jsdom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D supertest @types/supertest
```

## Architecture Overview

The scalability system consists of four main components:

### 1. IntelligentAutoScalingEngine
- **Location**: `src/lib/scalability/backend/intelligent-auto-scaling-engine.ts`
- **Purpose**: ML-powered auto-scaling decisions with wedding-specific intelligence
- **Performance**: Sub-30-second response to traffic spikes

### 2. WeddingLoadPredictor
- **Location**: `src/lib/scalability/backend/wedding-load-predictor.ts`
- **Purpose**: Wedding season and day-specific load predictions
- **Accuracy**: >90% prediction accuracy for wedding loads

### 3. RealTimePerformanceMonitor
- **Location**: `src/lib/scalability/backend/real-time-performance-monitor.ts`
- **Purpose**: Real-time metrics processing and anomaly detection
- **Throughput**: 100,000+ metrics per second processing

### 4. RBACManager
- **Location**: `src/lib/scalability/security/rbac-manager.ts`
- **Purpose**: Enterprise RBAC with comprehensive audit logging
- **Security**: Role-based access control with contextual permissions

## Environment Configuration

### Required Environment Variables

```env
# Core Application
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://wedsync.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Scalability Configuration
SCALABILITY_MONITORING_ENABLED=true
SCALABILITY_AUTO_SCALING_ENABLED=true
SCALABILITY_WEDDING_INTELLIGENCE_ENABLED=true
SCALABILITY_RBAC_ENABLED=true

# Performance Thresholds
SCALABILITY_CPU_THRESHOLD_WARNING=75
SCALABILITY_CPU_THRESHOLD_CRITICAL=90
SCALABILITY_MEMORY_THRESHOLD_WARNING=80
SCALABILITY_MEMORY_THRESHOLD_CRITICAL=95
SCALABILITY_RESPONSE_TIME_THRESHOLD_MS=1000
SCALABILITY_ERROR_RATE_THRESHOLD=0.05

# Wedding-Specific Configuration
WEDDING_DAY_MODE_AUTO_ENABLE=true
WEDDING_SEASON_MULTIPLIERS_ENABLED=true
WEDDING_EMERGENCY_RESPONSE_ENABLED=true

# Security Configuration
RBAC_AUDIT_LOGGING_ENABLED=true
SECURITY_THREAT_DETECTION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365

# Monitoring Configuration
METRICS_SAMPLING_INTERVAL_MS=1000
ANOMALY_DETECTION_ENABLED=true
ANOMALY_DETECTION_SENSITIVITY=medium
ALERT_CHANNELS=email,slack,pagerduty

# Database Configuration
DATABASE_MAX_CONNECTIONS=200
DATABASE_CONNECTION_TIMEOUT_MS=30000
DATABASE_QUERY_TIMEOUT_MS=60000
```

## Deployment Steps

### 1. Infrastructure Setup

#### Database Schema Setup

```bash
# Apply scalability-specific migrations
npx supabase migration up --file scalability_core_tables
npx supabase migration up --file scalability_metrics_tables  
npx supabase migration up --file scalability_security_tables
```

Required tables:
- `scalability_metrics` - Real-time performance metrics
- `scalability_decisions` - Auto-scaling decision history  
- `wedding_predictions` - Wedding load predictions
- `security_audit_logs` - RBAC audit trail
- `system_health_snapshots` - System health history

#### Supabase Row Level Security (RLS)

```sql
-- Enable RLS for scalability tables
ALTER TABLE scalability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scalability_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for scalability_admin role
CREATE POLICY "scalability_admin_all_access" ON scalability_metrics
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'scalability_admin');

-- Policies for scalability_operator role  
CREATE POLICY "scalability_operator_read_write" ON scalability_metrics
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'role' IN ('scalability_admin', 'scalability_operator'));

-- Policies for wedding_coordinator role
CREATE POLICY "wedding_coordinator_wedding_access" ON wedding_predictions
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('scalability_admin', 'wedding_coordinator') 
  OR wedding_date = CURRENT_DATE
);
```

### 2. Application Deployment

#### Build Configuration

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Verify build
npm run test:prod

# Run performance tests
npm run test:performance
```

#### Next.js Configuration

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    optimizePackageImports: ['@/lib/scalability'],
  },
  // Scalability-specific optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Performance monitoring
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },

  // Webpack optimizations for scalability modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Optimize scalability module loading
    config.optimization.splitChunks.cacheGroups.scalability = {
      name: 'scalability',
      chunks: 'all',
      test: /[\\/]src[\\/]lib[\\/]scalability[\\/]/,
      priority: 10,
    };

    return config;
  },

  // Environment-specific redirects
  async redirects() {
    return [
      {
        source: '/scalability',
        destination: '/dashboard/scalability',
        permanent: false,
      },
    ];
  },

  // API rate limiting
  async headers() {
    return [
      {
        source: '/api/scalability/:path*',
        headers: [
          {
            key: 'X-RateLimit-Limit',
            value: '100',
          },
          {
            key: 'X-RateLimit-Window',
            value: '60',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 3. Monitoring Setup

#### Performance Monitoring

```typescript
// src/lib/scalability/monitoring/setup.ts
export const initializeScalabilityMonitoring = async () => {
  const monitor = new RealTimePerformanceMonitor();
  
  // Start monitoring all critical services
  const services = [
    'api', 'database', 'auth', 'storage', 'realtime', 
    'media', 'notifications', 'search', 'analytics'
  ];

  const monitoringConfig = {
    samplingIntervalMs: process.env.METRICS_SAMPLING_INTERVAL_MS || 1000,
    enableAnomalyDetection: true,
    alertThresholds: {
      cpuUtilization: parseInt(process.env.SCALABILITY_CPU_THRESHOLD_WARNING) || 75,
      memoryUtilization: parseInt(process.env.SCALABILITY_MEMORY_THRESHOLD_WARNING) || 80,
      responseTimeP95: parseInt(process.env.SCALABILITY_RESPONSE_TIME_THRESHOLD_MS) || 1000,
      errorRate: parseFloat(process.env.SCALABILITY_ERROR_RATE_THRESHOLD) || 0.05,
    },
    weddingDayMode: process.env.WEDDING_DAY_MODE_AUTO_ENABLE === 'true',
  };

  const session = await monitor.startRealTimeMonitoring(services, monitoringConfig);
  console.log(`✅ Scalability monitoring started - Session: ${session.sessionId}`);
  
  return session;
};
```

#### Auto-Scaling Setup

```typescript
// src/lib/scalability/scaling/setup.ts
export const initializeAutoScaling = async () => {
  const engine = new IntelligentAutoScalingEngine();
  const predictor = new WeddingLoadPredictor();

  // Initialize wedding intelligence
  if (process.env.SCALABILITY_WEDDING_INTELLIGENCE_ENABLED === 'true') {
    await predictor.initializeWeddingIntelligence();
    console.log('✅ Wedding intelligence initialized');
  }

  // Start auto-scaling loop
  const scalingInterval = setInterval(async () => {
    try {
      const result = await engine.executeIntelligentScaling();
      if (result.decisionsExecuted > 0) {
        console.log(`🔄 Auto-scaling executed: ${result.decisionsExecuted} decisions in ${result.executionTimeMs}ms`);
      }
    } catch (error) {
      console.error('❌ Auto-scaling error:', error);
    }
  }, 30000); // Every 30 seconds

  // Cleanup on shutdown
  process.on('SIGTERM', () => {
    clearInterval(scalingInterval);
    console.log('✅ Auto-scaling stopped gracefully');
  });

  console.log('✅ Auto-scaling engine started');
  return { engine, predictor, scalingInterval };
};
```

### 4. Security Configuration

#### RBAC Setup

```typescript
// src/lib/scalability/security/setup.ts
export const initializeScalabilitySecurity = async () => {
  const rbacManager = new RBACManager();

  // Define role hierarchy
  const roles = [
    {
      name: 'scalability_admin',
      permissions: ['scalability:*'],
      hierarchy: 1,
      description: 'Full scalability system access'
    },
    {
      name: 'scalability_operator', 
      permissions: ['scalability:read', 'scalability:scale_standard', 'scalability:monitor'],
      hierarchy: 2,
      inheritsFrom: ['scalability_viewer'],
      description: 'Standard scaling operations'
    },
    {
      name: 'scalability_viewer',
      permissions: ['scalability:read', 'scalability:monitor'],
      hierarchy: 3,
      description: 'Read-only scalability access'
    },
    {
      name: 'wedding_coordinator',
      permissions: ['scalability:read', 'scalability:wedding_priority', 'scalability:monitor'],
      hierarchy: 3,
      contextualAccess: ['wedding_day'],
      description: 'Wedding-specific scalability access'
    }
  ];

  // Initialize roles
  for (const role of roles) {
    await rbacManager.createRole(role);
  }

  // Enable audit logging
  if (process.env.RBAC_AUDIT_LOGGING_ENABLED === 'true') {
    await rbacManager.enableAuditLogging({
      retentionPeriodDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 365,
      enableSecurityEventDetection: true,
      enableThreatDetection: process.env.SECURITY_THREAT_DETECTION_ENABLED === 'true'
    });
  }

  console.log('✅ Scalability RBAC initialized');
  return rbacManager;
};
```

## Health Checks and Validation

### System Health Endpoints

```typescript
// src/app/api/scalability/health/route.ts
export async function GET() {
  const healthChecks = {
    scalingEngine: false,
    loadPredictor: false,
    performanceMonitor: false,
    rbacManager: false,
    database: false,
    overallHealth: 'unhealthy' as 'healthy' | 'degraded' | 'unhealthy'
  };

  try {
    // Check scaling engine
    const engine = new IntelligentAutoScalingEngine();
    const engineHealth = await engine.getHealthStatus();
    healthChecks.scalingEngine = engineHealth.healthy;

    // Check load predictor
    const predictor = new WeddingLoadPredictor();
    const predictorHealth = await predictor.getHealthStatus();
    healthChecks.loadPredictor = predictorHealth.healthy;

    // Check performance monitor
    const monitor = new RealTimePerformanceMonitor();
    const monitorHealth = await monitor.getHealthStatus();
    healthChecks.performanceMonitor = monitorHealth.healthy;

    // Check RBAC manager
    const rbac = new RBACManager();
    const rbacHealth = await rbac.getHealthStatus();
    healthChecks.rbacManager = rbacHealth.healthy;

    // Check database connectivity
    const { supabase } = await import('@/lib/supabase/server');
    const { error } = await supabase.from('scalability_metrics').select('id').limit(1);
    healthChecks.database = !error;

    // Calculate overall health
    const healthyComponents = Object.values(healthChecks).filter(Boolean).length;
    if (healthyComponents === 5) {
      healthChecks.overallHealth = 'healthy';
    } else if (healthyComponents >= 3) {
      healthChecks.overallHealth = 'degraded';
    } else {
      healthChecks.overallHealth = 'unhealthy';
    }

    return Response.json(healthChecks, {
      status: healthChecks.overallHealth === 'unhealthy' ? 503 : 200
    });
  } catch (error) {
    return Response.json(
      { error: 'Health check failed', details: error.message },
      { status: 503 }
    );
  }
}
```

### Deployment Validation Script

```bash
#!/bin/bash
# deploy-validate.sh

echo "🚀 WedSync Scalability Infrastructure Deployment Validation"
echo "========================================================="

# Function to check service health
check_service() {
    local service_name=$1
    local endpoint=$2
    local expected_status=$3
    
    echo "🔍 Checking $service_name..."
    
    response=$(curl -s -w "%{http_code}" "$endpoint")
    status_code="${response: -3}"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo "✅ $service_name: HEALTHY (HTTP $status_code)"
        return 0
    else
        echo "❌ $service_name: UNHEALTHY (HTTP $status_code)"
        return 1
    fi
}

# Base URL (update for your environment)
BASE_URL="${DEPLOYMENT_BASE_URL:-http://localhost:3000}"
HEALTH_CHECKS_PASSED=0
TOTAL_HEALTH_CHECKS=6

# Check overall system health
if check_service "System Health" "$BASE_URL/api/scalability/health" 200; then
    ((HEALTH_CHECKS_PASSED++))
fi

# Check individual components
if check_service "Metrics API" "$BASE_URL/api/scalability/metrics/realtime" 401; then # Expect 401 without auth
    ((HEALTH_CHECKS_PASSED++))
fi

if check_service "Status API" "$BASE_URL/api/scalability/status" 401; then # Expect 401 without auth
    ((HEALTH_CHECKS_PASSED++))
fi

# Check frontend routes
if check_service "Dashboard" "$BASE_URL/dashboard/scalability" 200; then
    ((HEALTH_CHECKS_PASSED++))
fi

# Run integration tests
echo "🧪 Running integration tests..."
if npm run test:integration; then
    echo "✅ Integration tests: PASSED"
    ((HEALTH_CHECKS_PASSED++))
else
    echo "❌ Integration tests: FAILED"
fi

# Run performance benchmarks
echo "⚡ Running performance benchmarks..."
if npm run test:performance; then
    echo "✅ Performance benchmarks: PASSED"
    ((HEALTH_CHECKS_PASSED++))
else
    echo "❌ Performance benchmarks: FAILED"
fi

# Summary
echo ""
echo "📊 Deployment Validation Summary"
echo "================================"
echo "Health checks passed: $HEALTH_CHECKS_PASSED/$TOTAL_HEALTH_CHECKS"

if [ $HEALTH_CHECKS_PASSED -eq $TOTAL_HEALTH_CHECKS ]; then
    echo "🎉 DEPLOYMENT SUCCESSFUL - All systems operational"
    exit 0
elif [ $HEALTH_CHECKS_PASSED -ge $((TOTAL_HEALTH_CHECKS * 2 / 3)) ]; then
    echo "⚠️  DEPLOYMENT PARTIAL - Some systems degraded but operational"
    exit 1
else
    echo "💥 DEPLOYMENT FAILED - Critical systems not operational"
    exit 2
fi
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Performance Metrics**
   - Response time P95 < 500ms
   - Throughput > 10,000 RPS
   - Error rate < 1%
   - CPU utilization < 80%
   - Memory utilization < 85%

2. **Scalability Metrics**
   - Auto-scaling decisions per hour
   - Scaling response time < 30s
   - Wedding prediction accuracy > 90%
   - Cost optimization savings

3. **Security Metrics**
   - Failed authentication attempts
   - Privilege escalation attempts
   - Unusual access patterns
   - Audit log completeness

### Alert Configuration

```typescript
// src/lib/scalability/alerts/configuration.ts
export const ALERT_CONFIGURATION = {
  // Critical alerts (immediate notification)
  critical: {
    responseTime: 2000, // 2 seconds
    errorRate: 0.1, // 10%
    cpuUtilization: 95,
    memoryUtilization: 90,
    healthScore: 50,
    channels: ['pagerduty', 'sms', 'slack'],
    escalation: {
      immediate: true,
      escalateAfter: 0
    }
  },

  // Warning alerts (5-minute delay)
  warning: {
    responseTime: 1000, // 1 second
    errorRate: 0.05, // 5%
    cpuUtilization: 80,
    memoryUtilization: 75,
    healthScore: 70,
    channels: ['slack', 'email'],
    escalation: {
      immediate: false,
      escalateAfter: 300 // 5 minutes
    }
  },

  // Wedding day overrides (stricter thresholds)
  weddingDay: {
    responseTime: 500, // 0.5 seconds
    errorRate: 0.01, // 1%
    cpuUtilization: 70,
    memoryUtilization: 70,
    healthScore: 80,
    channels: ['pagerduty', 'sms', 'slack', 'phone'],
    escalation: {
      immediate: true,
      escalateAfter: 0
    }
  }
};
```

## Troubleshooting

### Common Issues

#### 1. High Response Times

**Symptoms**: API response times > 1 second

**Diagnosis**:
```bash
# Check system metrics
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/api/scalability/metrics/realtime"

# Check database connections
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/api/scalability/status?includeDatabase=true"
```

**Solutions**:
- Verify database connection pooling
- Check auto-scaling thresholds
- Review query performance
- Increase instance capacity

#### 2. Auto-Scaling Not Triggering

**Symptoms**: High load but no scaling decisions

**Diagnosis**:
```bash
# Check auto-scaling engine status
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/api/scalability/status?includeScaling=true"

# View recent scaling decisions
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/api/scalability/decisions?limit=10"
```

**Solutions**:
- Verify environment variables
- Check RBAC permissions
- Review scaling thresholds
- Check monitoring service connectivity

#### 3. Wedding Intelligence Not Working

**Symptoms**: No wedding-specific optimizations applied

**Diagnosis**:
```bash
# Check wedding predictions
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/api/scalability/predictions" \
  -d '{"timeHorizonHours": 24, "includeWeddingContext": true}'

# Verify wedding data
npx supabase sql --query "SELECT COUNT(*) FROM wedding_predictions WHERE wedding_date >= CURRENT_DATE"
```

**Solutions**:
- Verify wedding data ingestion
- Check prediction model status
- Review wedding intelligence configuration
- Validate date/time calculations

## Security Considerations

### Access Control

1. **API Endpoints**: All scalability APIs require authentication and proper RBAC permissions
2. **Database Access**: Row Level Security (RLS) enforced on all tables
3. **Audit Logging**: All access attempts logged with full context
4. **Threat Detection**: Automated detection of suspicious patterns

### Data Protection

1. **Encryption**: All sensitive data encrypted at rest and in transit
2. **Data Retention**: Metrics and logs retained according to compliance requirements
3. **Access Logging**: Complete audit trail for compliance reporting
4. **Anonymization**: Wedding data anonymized in non-production environments

## Performance Optimization

### Database Optimization

```sql
-- Indexes for scalability tables
CREATE INDEX CONCURRENTLY idx_scalability_metrics_timestamp 
ON scalability_metrics (timestamp DESC);

CREATE INDEX CONCURRENTLY idx_scalability_decisions_created_at 
ON scalability_decisions (created_at DESC);

CREATE INDEX CONCURRENTLY idx_wedding_predictions_date 
ON wedding_predictions (wedding_date, created_at DESC);

-- Partitioning for high-volume tables
CREATE TABLE scalability_metrics_y2024 PARTITION OF scalability_metrics
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Caching Strategy

```typescript
// src/lib/scalability/cache/strategy.ts
export const CACHE_STRATEGY = {
  metrics: {
    ttl: 30, // 30 seconds
    key: (service: string) => `metrics:${service}:latest`
  },
  
  predictions: {
    ttl: 3600, // 1 hour
    key: (weddingId: string) => `prediction:${weddingId}`
  },
  
  healthStatus: {
    ttl: 60, // 1 minute
    key: 'system:health:status'
  },

  userPermissions: {
    ttl: 900, // 15 minutes
    key: (userId: string) => `rbac:permissions:${userId}`
  }
};
```

## Conclusion

The WedSync Scalability Infrastructure provides enterprise-grade auto-scaling with wedding-specific intelligence. This deployment guide ensures proper setup, monitoring, and maintenance of the system for production environments handling millions of users during peak wedding seasons.

For additional support or questions, refer to the comprehensive test suite and integration examples provided in the codebase.