# Deployment Guide - WS-182 Churn Intelligence System

## Overview

This guide provides comprehensive instructions for deploying, configuring, and maintaining the WS-182 Churn Intelligence System across different environments. Follow these procedures to ensure reliable, secure, and performant deployments.

## 🚀 Deployment Architecture

### Environment Structure

```
Production (wedsync.com)
├── Load Balancer (AWS ALB)
├── Web Servers (3x Vercel instances)
├── API Gateway (Next.js API routes)
├── ML Serving Layer (Python/FastAPI)
├── Database (Supabase PostgreSQL)
├── Monitoring (Custom + DataDog)
└── Storage (Supabase Storage)

Staging (staging.wedsync.com)
├── Single Vercel instance
├── Staging database (Supabase branch)
├── ML model validation environment
└── Limited monitoring

Development (localhost:3000)
├── Local Next.js development server
├── Local PostgreSQL or Docker
├── Mock ML models for testing
└── Development tools and debugging
```

## 🛠️ Prerequisites

### System Requirements

**Development Environment:**
- Node.js 18.0+ with npm 8+
- Python 3.9+ with pip
- PostgreSQL 14+ or Docker
- Git with LFS support
- 16GB RAM minimum for ML training

**Production Environment:**
- Vercel Pro plan or equivalent
- Supabase Pro plan with compute scaling
- External ML serving infrastructure (AWS/GCP)
- CDN for static assets
- Monitoring and alerting systems

### Required Access and Credentials

```bash
# Environment Variables Checklist
SUPABASE_URL=https://azhgptjkqiiqvvvhapml.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# ML Model Configuration
CHURN_MODEL_VERSION=v2.1.3
CHURN_MODEL_API_URL=https://ml-api.wedsync.com
ML_MODEL_API_KEY=sk-model-...

# External Service APIs
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Monitoring and Analytics
DATADOG_API_KEY=...
SENTRY_DSN=https://...
POSTHOG_KEY=phc_...

# Security
NEXTAUTH_SECRET=...
ENCRYPTION_KEY=...
JWT_SECRET=...
```

## 🏗️ Development Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/wedsync/wedsync-2.0.git
cd wedsync-2.0/WedSync2/wedsync

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Database setup
npm run db:setup
npm run db:migrate
npm run db:seed
```

### 2. ML Model Setup

```bash
# Setup Python environment for ML components
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install ML dependencies
pip install -r ml-requirements.txt

# Download pre-trained models
npm run ml:setup
npm run ml:validate
```

### 3. Development Server

```bash
# Start development server with hot reloading
npm run dev

# Run with ML model validation
npm run dev:ml

# Run with full monitoring
npm run dev:monitoring
```

### 4. Validation Checks

```bash
# Run comprehensive test suite
npm test

# Run ML-specific tests
npm test __tests__/ml/

# Run quality validation
npm run quality:check

# Type checking
npm run typecheck

# Build validation
npm run build
```

## 🧪 Staging Deployment

### 1. Staging Environment Setup

```bash
# Create Supabase staging branch
npx supabase branches create staging
npx supabase link --project-ref <staging-project-id>

# Apply migrations to staging
npx supabase migration up

# Deploy to Vercel staging
vercel --env staging
```

### 2. Staging Configuration

```javascript
// vercel.json for staging
{
  "env": {
    "NODE_ENV": "staging",
    "CHURN_MODEL_VERSION": "latest-staging",
    "QUALITY_GATES_ENABLED": "true",
    "MONITORING_LEVEL": "debug"
  },
  "functions": {
    "src/pages/api/churn/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 3. Staging Validation Protocol

```bash
#!/bin/bash
# staging-validation.sh

echo "Starting staging validation..."

# 1. Health check
curl -f https://staging.wedsync.com/api/churn/health || exit 1

# 2. ML model validation
npm run ml:validate:staging || exit 1

# 3. Data quality check
npm run data:quality:check:staging || exit 1

# 4. Integration tests
npm run test:integration:staging || exit 1

# 5. Performance benchmarks
npm run perf:benchmark:staging || exit 1

echo "Staging validation completed successfully"
```

## 🚀 Production Deployment

### 1. Pre-Deployment Checklist

**Code Quality Gates:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] ML model accuracy ≥85% on validation set
- [ ] TypeScript compilation successful
- [ ] ESLint and Prettier checks passed
- [ ] Security scan completed without critical issues
- [ ] Performance benchmarks within thresholds

**Infrastructure Readiness:**
- [ ] Database migrations reviewed and approved
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested
- [ ] Capacity planning completed
- [ ] Security certificates updated
- [ ] CDN and caching configured

**Business Validation:**
- [ ] Stakeholder approval received
- [ ] Documentation updated
- [ ] Support team notified
- [ ] Incident response team on standby
- [ ] User communication plan executed
- [ ] Quality gates configuration verified

### 2. Deployment Process

#### Step 1: Database Migration

```bash
# Connect to production database
npx supabase link --project-ref azhgptjkqiiqvvvhapml

# Backup current database
npx supabase db dump > backup-$(date +%Y%m%d-%H%M%S).sql

# Apply migrations with validation
npx supabase migration up --dry-run  # Validate first
npx supabase migration up            # Apply migrations

# Verify migration success
npm run db:validate:production
```

#### Step 2: ML Model Deployment

```bash
# Deploy ML models to serving infrastructure
npm run ml:deploy:production

# Validate model endpoints
npm run ml:validate:production

# Update model version in configuration
export CHURN_MODEL_VERSION="v2.1.3"
```

#### Step 3: Application Deployment

```bash
# Build production optimized version
npm run build

# Deploy to production with Vercel
vercel deploy --prod --env production

# Verify deployment
npm run health:check:production
```

#### Step 4: Post-Deployment Validation

```bash
#!/bin/bash
# production-validation.sh

# Wait for deployment to propagate
sleep 30

# Comprehensive health check
npm run health:check:comprehensive || exit 1

# ML model validation
npm run ml:validate:production || exit 1

# Performance validation
npm run perf:validate:production || exit 1

# Business logic validation  
npm run business:validate:production || exit 1

echo "Production deployment validated successfully"
```

### 3. Deployment Monitoring

**Immediate Monitoring (0-30 minutes):**
- Error rate monitoring
- Response time validation
- ML model accuracy verification
- Database connection health
- User experience metrics

**Short-term Monitoring (30 minutes - 24 hours):**
- System performance trends
- Business KPI tracking
- Data quality monitoring
- User adoption metrics
- Support ticket analysis

**Long-term Monitoring (24+ hours):**
- Model drift detection
- Business impact measurement
- Quality metrics trending
- Capacity utilization analysis
- User feedback incorporation

## 🔄 CI/CD Pipeline Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/churn-intelligence.yml
name: Churn Intelligence CI/CD

on:
  push:
    paths:
      - 'src/lib/services/Churn*'
      - '__tests__/ml/**'
      - 'src/app/api/churn/**'
  pull_request:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Install dependencies
        run: |
          npm ci
          pip install -r ml-requirements.txt
          
      - name: Type checking
        run: npm run typecheck
        
      - name: Unit tests
        run: npm test
        
      - name: ML model validation
        run: npm run ml:validate
        
      - name: Data quality checks
        run: npm run data:quality:check
        
      - name: Security scan
        run: npm run security:scan
        
      - name: Performance benchmarks
        run: npm run perf:benchmark

  staging-deployment:
    needs: quality-gates
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        
      - name: Deploy to staging
        run: vercel deploy --env staging --token ${{ secrets.VERCEL_TOKEN }}
        
      - name: Run integration tests
        run: npm run test:integration:staging
        
      - name: Performance validation
        run: npm run perf:validate:staging

  production-deployment:
    needs: staging-deployment
    if: github.ref == 'refs/heads/main'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        
      - name: Production deployment
        run: |
          vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
          
      - name: Post-deployment validation
        run: npm run health:check:production
        
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
```

### Quality Gate Configuration

```typescript
// .github/quality-gates.config.ts
export const QUALITY_GATES = {
  UNIT_TESTS: {
    COVERAGE_THRESHOLD: 90,        // 90% code coverage required
    SUCCESS_RATE: 100,             // All tests must pass
    MAX_EXECUTION_TIME: 300        // 5 minutes maximum
  },
  ML_VALIDATION: {
    MIN_ACCURACY: 0.85,            // 85% model accuracy required
    MAX_PREDICTION_LATENCY: 200,   // 200ms maximum prediction time
    DATA_QUALITY_SCORE: 0.90       // 90% data quality required
  },
  PERFORMANCE: {
    MAX_BUILD_TIME: 600,           // 10 minutes maximum build time
    MAX_BUNDLE_SIZE: 5242880,      // 5MB maximum bundle size
    LIGHTHOUSE_SCORE: 90           // 90 Lighthouse performance score
  },
  SECURITY: {
    VULNERABILITY_THRESHOLD: 0,     // No high/critical vulnerabilities
    DEPENDENCY_AUDIT: true,         // Dependency audit required
    SECRET_DETECTION: true          // Secret detection required
  }
};
```

## 🔧 Configuration Management

### Environment-Specific Configurations

```typescript
// config/environments.ts
export const ENVIRONMENT_CONFIG = {
  development: {
    API_BASE_URL: 'http://localhost:3000/api',
    ML_MODEL_ENDPOINT: 'http://localhost:8000',
    LOG_LEVEL: 'debug',
    CACHE_ENABLED: false,
    RATE_LIMITING: false,
    ML_MODEL_VERSION: 'development'
  },
  staging: {
    API_BASE_URL: 'https://staging.wedsync.com/api',
    ML_MODEL_ENDPOINT: 'https://ml-staging.wedsync.com',
    LOG_LEVEL: 'info',
    CACHE_ENABLED: true,
    RATE_LIMITING: true,
    ML_MODEL_VERSION: 'staging',
    QUALITY_GATES_STRICT: true
  },
  production: {
    API_BASE_URL: 'https://wedsync.com/api',
    ML_MODEL_ENDPOINT: 'https://ml.wedsync.com',
    LOG_LEVEL: 'warn',
    CACHE_ENABLED: true,
    RATE_LIMITING: true,
    ML_MODEL_VERSION: 'v2.1.3',
    QUALITY_GATES_STRICT: true,
    MONITORING_ENABLED: true
  }
};
```

### Feature Flag Management

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  // ML Features
  ENABLE_REAL_TIME_PREDICTIONS: {
    development: true,
    staging: true,
    production: true
  },
  ENABLE_ADVANCED_SEGMENTATION: {
    development: true,
    staging: true,
    production: true
  },
  ENABLE_AUTO_RETENTION_CAMPAIGNS: {
    development: true,
    staging: true,
    production: false  // Gradual rollout
  },
  
  // Quality Features
  ENABLE_STRICT_QUALITY_GATES: {
    development: false,
    staging: true,
    production: true
  },
  ENABLE_MODEL_DRIFT_DETECTION: {
    development: false,
    staging: true,
    production: true
  },
  
  // UI Features
  ENABLE_BI_DASHBOARD_V2: {
    development: true,
    staging: true,
    production: false  // A/B testing phase
  }
};
```

## 📊 Monitoring and Observability

### Application Monitoring Setup

```typescript
// lib/monitoring/setup.ts
import { DataDog } from '@datadog/datadog-api-client';
import { Sentry } from '@sentry/nextjs';

export function setupMonitoring() {
  // Sentry for error tracking
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter sensitive data
      return sanitizeEvent(event);
    }
  });

  // DataDog for metrics and APM
  DataDog.configure({
    apiKey: process.env.DATADOG_API_KEY,
    appKey: process.env.DATADOG_APP_KEY,
    site: 'datadoghq.com'
  });
}

// Custom metrics tracking
export const metrics = {
  churnPredictions: new Counter('churn_predictions_total'),
  modelAccuracy: new Gauge('model_accuracy_current'),
  apiLatency: new Histogram('api_response_time_seconds'),
  dataQualityScore: new Gauge('data_quality_score_current')
};
```

### Health Check Endpoints

```typescript
// pages/api/health/index.ts
export default async function handler(req: Request, res: Response) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      mlModel: await checkMLModelHealth(),
      qualityMonitoring: await checkQualityMonitoringHealth(),
      externalAPIs: await checkExternalAPIHealth()
    },
    metrics: {
      modelAccuracy: await getCurrentModelAccuracy(),
      avgResponseTime: await getAverageResponseTime(),
      dataQualityScore: await getCurrentDataQualityScore()
    },
    version: process.env.DEPLOYMENT_VERSION
  };

  const isHealthy = Object.values(healthCheck.services).every(
    service => service === 'healthy'
  );

  res.status(isHealthy ? 200 : 503).json(healthCheck);
}
```

### Alert Configuration

```yaml
# alerts/churn-intelligence.yml
alerts:
  - name: "Model Accuracy Degradation"
    condition: "model_accuracy_current < 0.85"
    severity: "critical"
    channels: ["#ml-alerts", "email:ml-team@wedsync.com"]
    
  - name: "API Response Time High"
    condition: "api_response_time_p95 > 0.5"
    severity: "warning"
    channels: ["#performance-alerts"]
    
  - name: "Data Quality Score Low"
    condition: "data_quality_score_current < 0.90"
    severity: "high"
    channels: ["#data-quality", "email:data-team@wedsync.com"]
    
  - name: "System Availability"
    condition: "system_uptime < 0.999"
    severity: "critical"
    channels: ["#incidents", "pager:on-call"]
```

## 🔄 Rollback Procedures

### Automated Rollback Triggers

```typescript
// lib/rollback/triggers.ts
export const ROLLBACK_TRIGGERS = {
  ERROR_RATE_THRESHOLD: 0.05,        // 5% error rate
  RESPONSE_TIME_THRESHOLD: 1000,     // 1 second average
  MODEL_ACCURACY_THRESHOLD: 0.80,    // 80% accuracy minimum
  USER_IMPACT_THRESHOLD: 100         // 100+ affected users
};

export async function checkRollbackConditions() {
  const metrics = await getCurrentMetrics();
  
  if (metrics.errorRate > ROLLBACK_TRIGGERS.ERROR_RATE_THRESHOLD) {
    await initiateRollback('High error rate detected');
  }
  
  if (metrics.modelAccuracy < ROLLBACK_TRIGGERS.MODEL_ACCURACY_THRESHOLD) {
    await initiateRollback('Model accuracy below threshold');
  }
}
```

### Manual Rollback Process

```bash
#!/bin/bash
# rollback-production.sh

echo "Starting production rollback process..."

# 1. Get current deployment info
CURRENT_DEPLOYMENT=$(vercel ls --prod | head -2 | tail -1)
echo "Current deployment: $CURRENT_DEPLOYMENT"

# 2. Get previous stable deployment
PREVIOUS_DEPLOYMENT=$(vercel ls --prod | head -3 | tail -1)
echo "Rolling back to: $PREVIOUS_DEPLOYMENT"

# 3. Execute rollback
vercel rollback $PREVIOUS_DEPLOYMENT --prod

# 4. Verify rollback
sleep 30
curl -f https://wedsync.com/api/churn/health || {
  echo "Rollback verification failed!"
  exit 1
}

# 5. Notify team
echo "Production rollback completed successfully"
```

## 🔒 Security Considerations

### Deployment Security Checklist

**Infrastructure Security:**
- [ ] TLS certificates valid and renewed
- [ ] API endpoints secured with authentication
- [ ] Rate limiting configured and tested
- [ ] WAF rules configured for API protection
- [ ] Database access restricted to application servers
- [ ] Secrets management properly configured

**Application Security:**
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention measures active
- [ ] XSS protection configured
- [ ] CSRF tokens implemented
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Dependency vulnerabilities scanned and resolved

**Data Security:**
- [ ] PII encryption at rest and in transit
- [ ] Data anonymization for ML training
- [ ] Access logging and audit trails active
- [ ] GDPR compliance measures implemented
- [ ] Data retention policies configured
- [ ] Backup encryption verified

### Security Monitoring

```typescript
// lib/security/monitoring.ts
export const SECURITY_MONITORS = {
  FAILED_LOGIN_ATTEMPTS: {
    threshold: 10,
    timeWindow: '5m',
    action: 'block_ip'
  },
  UNUSUAL_API_PATTERNS: {
    threshold: 1000,
    timeWindow: '1m',
    action: 'rate_limit'
  },
  SQL_INJECTION_ATTEMPTS: {
    threshold: 1,
    timeWindow: '1m',
    action: 'block_and_alert'
  },
  DATA_EXPORT_ANOMALIES: {
    threshold: 100,
    timeWindow: '1h',
    action: 'alert_security_team'
  }
};
```

## 📋 Maintenance Procedures

### Regular Maintenance Schedule

**Daily Maintenance:**
- Health check validation
- Log file rotation and analysis
- Performance metrics review
- Security scan results review

**Weekly Maintenance:**
- Dependency updates (minor versions)
- Database performance optimization
- Model performance evaluation
- System capacity planning

**Monthly Maintenance:**
- Full security assessment
- Dependency updates (major versions)
- Infrastructure cost optimization
- Documentation updates

**Quarterly Maintenance:**
- ML model retraining and validation
- Disaster recovery testing
- Performance baseline updates
- Architecture review and optimization

### Maintenance Scripts

```bash
#!/bin/bash
# daily-maintenance.sh

echo "Starting daily maintenance tasks..."

# 1. Database maintenance
npx supabase db optimize
npx supabase db vacuum

# 2. Log rotation
npm run logs:rotate

# 3. Security checks
npm run security:daily-scan

# 4. Performance optimization
npm run cache:warm
npm run performance:optimize

# 5. Backup verification
npm run backup:verify

echo "Daily maintenance completed"
```

## 📞 Support and Troubleshooting

### Common Issues and Solutions

**Issue: Model predictions returning errors**
```bash
# Check model health
curl https://ml.wedsync.com/health

# Verify model version
echo $CHURN_MODEL_VERSION

# Restart model service if needed
kubectl rollout restart deployment/churn-model-service
```

**Issue: Database connection timeouts**
```bash
# Check database status
npx supabase status

# Check connection pool usage
npm run db:connection-status

# Scale database if needed
npx supabase db scale --compute-size medium
```

**Issue: API response times high**
```bash
# Check system metrics
npm run metrics:api-performance

# Clear caches
npm run cache:clear

# Check for memory leaks
npm run memory:analyze
```

### Emergency Contacts

- **On-call Engineer**: +1-555-ONCALL (24/7)
- **ML Team Lead**: ml-lead@wedsync.com
- **DevOps Team**: devops@wedsync.com
- **Security Team**: security@wedsync.com
- **Product Manager**: product@wedsync.com

### Documentation and Resources

- **Technical Documentation**: `/docs/churn-intelligence/`
- **API Reference**: `/docs/churn-intelligence/api-reference.md`
- **Runbooks**: `/runbooks/churn-intelligence/`
- **Architecture Diagrams**: `/architecture/churn-intelligence/`
- **Performance Benchmarks**: `/benchmarks/churn-intelligence/`

---

**Document Version**: 1.0.0  
**Last Updated**: August 30, 2025  
**Next Review**: November 30, 2025  
**Maintained By**: DevOps and ML Teams