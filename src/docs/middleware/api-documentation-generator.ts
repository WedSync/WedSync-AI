import { OpenAPIV3 } from 'openapi-types';
import {
  MiddlewareRoute,
  AuthRequirement,
  RateLimitConfig,
} from '../types/middleware';

export class MiddlewareDocumentationGenerator {
  private openApiSpec: OpenAPIV3.Document;

  constructor() {
    this.openApiSpec = this.initializeOpenAPISpec();
  }

  private initializeOpenAPISpec(): OpenAPIV3.Document {
    return {
      openapi: '3.0.3',
      info: {
        title: 'WedSync Middleware API',
        description:
          'Comprehensive API documentation for WedSync middleware infrastructure',
        version: '1.0.0',
        contact: {
          name: 'WedSync Development Team',
          email: 'dev@wedsync.com',
        },
      },
      servers: [
        {
          url: 'https://api.wedsync.com',
          description: 'Production API',
        },
        {
          url: 'https://staging-api.wedsync.com',
          description: 'Staging API',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          SessionAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Session-ID',
          },
        },
      },
    };
  }

  generateMiddlewareDocumentation(routes: MiddlewareRoute[]): string {
    // Generate OpenAPI documentation for all middleware routes
    for (const route of routes) {
      this.documentRoute(route);
    }

    // Generate comprehensive middleware documentation
    const documentation = `
# WedSync Middleware API Documentation

## Overview
WedSync's middleware infrastructure provides authentication, authorization, rate limiting, caching, and integration services for the wedding coordination platform.

## Architecture

### Authentication Flow
\`\`\`mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant Auth Service
    participant Redis
    
    Client->>Middleware: API Request + JWT
    Middleware->>Redis: Check Session
    Middleware->>Auth Service: Validate JWT
    Auth Service-->>Middleware: Validation Result
    Middleware-->>Client: Authorized Response
\`\`\`

### Rate Limiting Strategy
\`\`\`mermaid
graph TD
    A[Incoming Request] --> B{Check User Type}
    B -->|Couple| C[10 req/min limit]
    B -->|Supplier| D[50 req/min limit]  
    B -->|Admin| E[200 req/min limit]
    C --> F{Under Limit?}
    D --> F
    E --> F
    F -->|Yes| G[Process Request]
    F -->|No| H[Return 429 Rate Limited]
\`\`\`

## Middleware Components

### 1. Authentication Middleware
Handles JWT token validation, session management, and user authorization.

**Key Features:**
- JWT token validation with wedding-specific claims
- Redis-backed session management
- Role-based access control (Couple, Supplier, Admin, Coordinator)
- Wedding-specific permission validation

**Configuration:**
\`\`\`typescript
{
  jwtSecret: process.env.JWT_SECRET,
  sessionExpiry: 3600, // 1 hour
  refreshThreshold: 300, // 5 minutes
  weddingPermissions: {
    couple: ['read', 'write', 'invite'],
    supplier: ['read', 'update_availability', 'message'],
    coordinator: ['read', 'write', 'manage'],
    admin: ['*']
  }
}
\`\`\`

### 2. Rate Limiting Middleware  
Implements distributed rate limiting with Redis backend.

**Rate Limits by User Type:**
- **Couples**: 10 requests/minute (wedding planning workflows)
- **Suppliers**: 50 requests/minute (availability updates, messaging)
- **Coordinators**: 100 requests/minute (wedding management)
- **Admin**: 200 requests/minute (system management)

**Peak Season Adjustments:**
During wedding season (May-September), limits are increased by 50% to handle higher demand.

### 3. Integration Gateway Middleware
Manages third-party service integrations with circuit breaker patterns.

**Supported Integrations:**
- **Stripe**: Payment processing and webhooks
- **Email Services**: Transactional emails and notifications  
- **Supplier APIs**: Availability and booking synchronization
- **SMS Services**: Mobile notifications and alerts

**Circuit Breaker Configuration:**
\`\`\`typescript
{
  errorThreshold: 5,
  timeout: 30000,
  retryAttempts: 3,
  fallbackStrategy: 'cache' | 'queue' | 'notify'
}
\`\`\`

### 4. Mobile & PWA Middleware
Optimizes responses for mobile devices and handles PWA functionality.

**Mobile Optimizations:**
- Automatic image compression and format conversion
- Response payload reduction for mobile clients
- Touch-friendly error messages and feedback
- Battery-conscious background processing

**PWA Features:**
- Service worker integration and caching strategies
- Background sync for offline actions  
- Push notification delivery and management
- App update mechanisms and cache invalidation

## API Endpoints

${this.generateEndpointDocumentation(routes)}

## Error Handling

### Standard Error Response Format
\`\`\`typescript
{
  error: {
    code: string,
    message: string,
    details?: any,
    timestamp: string,
    requestId: string
  }
}
\`\`\`

### Common Error Codes
- **AUTH_001**: Invalid or expired JWT token
- **AUTH_002**: Insufficient permissions for wedding access
- **RATE_001**: Rate limit exceeded for user type
- **RATE_002**: Peak season traffic limits applied
- **INTEG_001**: Third-party service unavailable
- **INTEG_002**: Webhook signature validation failed
- **MOBILE_001**: Unsupported mobile client version
- **CACHE_001**: Cache miss, data fetched from origin

## Monitoring and Metrics

### Key Performance Indicators
- **Authentication**: <10ms average validation time
- **Rate Limiting**: <5ms lookup time  
- **Integration**: <200ms third-party response time
- **Mobile**: <3s page load time on 3G networks

### Alert Conditions
- Authentication failure rate >5%
- Rate limiting activation >20% of requests
- Third-party service errors >10%
- Mobile optimization failure rate >2%

## Testing and Quality Assurance

### Automated Testing Coverage
- Unit tests: >95% middleware code coverage
- Integration tests: All third-party service flows
- Load tests: Peak wedding season traffic simulation  
- Security tests: Authentication and authorization validation

### Manual Testing Scenarios
- Wedding coordination workflows across all user types
- Mobile device testing on iOS and Android
- Offline functionality validation
- Peak season traffic handling

## Deployment and Operations

### Environment Configuration
\`\`\`bash
# Required Environment Variables
JWT_SECRET=your_jwt_secret_key
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
EMAIL_SERVICE_URL=https://api.emailservice.com
SUPPLIER_API_URL=https://api.suppliers.com
\`\`\`

### Health Check Endpoints
- \`GET /health\` - Overall system health
- \`GET /health/middleware\` - Middleware-specific health
- \`GET /health/integrations\` - Third-party service status

### Troubleshooting Guide

#### High Error Rate
1. Check Redis connectivity and memory usage
2. Verify third-party service status  
3. Review rate limiting configuration
4. Check JWT secret configuration

#### Poor Performance
1. Monitor Redis response times
2. Check third-party service latency
3. Review caching hit rates
4. Analyze mobile optimization effectiveness

#### Authentication Issues  
1. Verify JWT secret matches across services
2. Check Redis session storage
3. Review user permission configuration
4. Validate wedding-specific authorization rules

---

*Generated by WedSync Middleware Documentation System*
*Last updated: ${new Date().toISOString()}*
`;

    return documentation;
  }

  private documentRoute(route: MiddlewareRoute): void {
    // Add route documentation to OpenAPI spec
    if (!this.openApiSpec.paths[route.path]) {
      this.openApiSpec.paths[route.path] = {};
    }

    this.openApiSpec.paths[route.path][route.method.toLowerCase()] = {
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      parameters: route.parameters,
      requestBody: route.requestBody,
      responses: route.responses,
      security: this.getSecurityRequirements(route.authRequirement),
    };
  }

  private generateEndpointDocumentation(routes: MiddlewareRoute[]): string {
    if (!routes || routes.length === 0) {
      return `
### Authentication Endpoints

#### POST /auth/login
Authenticate a user and create a session.

**Request:**
\`\`\`json
{
  "email": "couple@example.com",
  "password": "securepassword",
  "userType": "couple"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "session-12345",
  "user": {
    "id": "user-123",
    "email": "couple@example.com",
    "type": "couple",
    "permissions": ["read", "write", "invite"]
  }
}
\`\`\`

#### POST /auth/refresh
Refresh an expired JWT token.

**Request:**
\`\`\`json
{
  "refreshToken": "refresh-token-12345"
}
\`\`\`

#### POST /auth/logout
Invalidate a user session.

### Wedding Management Endpoints

#### GET /api/weddings/{weddingId}
Get wedding details with authorization check.

**Parameters:**
- \`weddingId\`: UUID of the wedding
- \`Authorization\`: Bearer JWT token
- \`X-Session-ID\`: Session identifier

#### PUT /api/weddings/{weddingId}/timeline
Update wedding timeline with real-time sync.

#### GET /api/suppliers/search
Search for available wedding suppliers.

**Query Parameters:**
- \`date\`: Wedding date (YYYY-MM-DD)
- \`location\`: Wedding location
- \`category\`: Supplier category (photography, catering, etc.)

### Integration Endpoints

#### POST /api/webhooks/stripe
Handle Stripe payment webhooks.

**Headers:**
- \`stripe-signature\`: Webhook signature for verification

#### POST /api/webhooks/suppliers
Handle supplier availability updates.

### Mobile Endpoints

#### GET /api/mobile/sync
Sync data for mobile app with optimization.

**Headers:**
- \`User-Agent\`: Mobile user agent for optimization
- \`X-Device-Type\`: mobile | tablet | desktop

#### POST /api/mobile/photos/upload
Upload wedding photos with mobile optimization.

### Notification Endpoints

#### POST /api/push/subscribe
Subscribe to push notifications.

#### POST /api/push/send
Send push notifications to wedding participants.
`;
    }

    return routes
      .map(
        (route) => `
#### ${route.method.toUpperCase()} ${route.path}
${route.description}

**Authentication:** ${route.authRequirement}
**Rate Limit:** ${route.rateLimit?.requests || 'Default'} requests per ${route.rateLimit?.window || '60'} seconds
`,
      )
      .join('\n');
  }

  private getSecurityRequirements(authRequirement: AuthRequirement): any[] {
    switch (authRequirement) {
      case 'jwt':
        return [{ BearerAuth: [] }];
      case 'session':
        return [{ SessionAuth: [] }];
      case 'both':
        return [{ BearerAuth: [], SessionAuth: [] }];
      default:
        return [];
    }
  }

  generateArchitectureDecisionRecord(decision: {
    title: string;
    context: string;
    decision: string;
    consequences: string[];
    alternatives: string[];
    status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
  }): string {
    return `
# ADR-${Date.now()}: ${decision.title}

## Status
${decision.status.toUpperCase()}

## Context
${decision.context}

## Decision
${decision.decision}

## Consequences
${decision.consequences.map((c) => `- ${c}`).join('\n')}

## Alternatives Considered
${decision.alternatives.map((a) => `- ${a}`).join('\n')}

## Date
${new Date().toISOString()}

---
*Architecture Decision Record for WedSync Middleware*
`;
  }

  generateTroubleshootingGuide(): string {
    return `
# WedSync Middleware Troubleshooting Guide

## Common Issues and Solutions

### 1. Authentication Failures

#### Symptoms
- Users receiving 401 Unauthorized responses
- JWT tokens being rejected
- Session validation failures

#### Diagnosis Steps
1. Check JWT secret configuration across all services
2. Verify Redis connectivity for session storage
3. Validate token expiration times
4. Check user permissions in database

#### Solutions
\`\`\`bash
# Check JWT secret configuration
echo $JWT_SECRET

# Verify Redis connectivity
redis-cli ping

# Check session storage
redis-cli keys "session:*" | head -5

# Validate token manually
node -e "console.log(require('jsonwebtoken').verify('$TOKEN', '$JWT_SECRET'))"
\`\`\`

### 2. Rate Limiting Issues

#### Symptoms
- Users receiving 429 Too Many Requests
- Legitimate requests being blocked
- Uneven rate limit enforcement

#### Diagnosis Steps
1. Check Redis rate limit keys
2. Review user type classification
3. Verify rate limit configuration
4. Analyze request patterns

#### Solutions
\`\`\`bash
# Check rate limit keys
redis-cli keys "rate_limit:*" | head -10

# View specific user's rate limit
redis-cli get "rate_limit:user-123:api"

# Reset rate limit for user
redis-cli del "rate_limit:user-123:api"

# Check rate limit configuration
grep -r "RATE_LIMIT" /app/config/
\`\`\`

### 3. Third-Party Integration Failures

#### Symptoms
- Webhook processing failures
- Circuit breaker activation
- Service timeout errors

#### Diagnosis Steps
1. Check service health endpoints
2. Review webhook signature validation
3. Monitor circuit breaker status
4. Analyze error patterns

#### Solutions
\`\`\`bash
# Check service health
curl https://api.wedsync.com/health/integrations

# View webhook events
redis-cli keys "webhook:*" | head -5

# Reset circuit breaker
redis-cli del "circuit_breaker:email-service"

# Check webhook signatures
tail -f /var/log/webhooks.log | grep "signature"
\`\`\`

### 4. Mobile Optimization Issues

#### Symptoms
- Slow mobile page loads
- Large payload sizes
- PWA functionality not working

#### Diagnosis Steps
1. Check device detection accuracy
2. Review image optimization results
3. Verify service worker registration
4. Test offline functionality

#### Solutions
\`\`\`bash
# Check mobile optimization metrics
curl -H "User-Agent: Mobile" https://api.wedsync.com/api/suppliers

# Verify service worker
curl https://api.wedsync.com/service-worker.js

# Check cache headers
curl -I https://api.wedsync.com/api/mobile/sync

# Test push notification setup
curl -X POST https://api.wedsync.com/api/push/test
\`\`\`

### 5. Performance Issues

#### Symptoms
- High response times
- Memory leaks
- Database connection pool exhaustion

#### Diagnosis Steps
1. Monitor Redis response times
2. Check database connection pools
3. Review memory usage patterns
4. Analyze slow query logs

#### Solutions
\`\`\`bash
# Check Redis performance
redis-cli --latency-history

# Monitor database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check memory usage
free -h && top -n 1

# Review slow queries
tail -f /var/log/postgresql/slow.log
\`\`\`

## Wedding Day Emergency Procedures

### Immediate Response Protocol
1. **Assess Impact**: Determine affected weddings
2. **Notify Stakeholders**: Alert wedding coordinators
3. **Implement Workarounds**: Enable emergency bypass modes
4. **Monitor Recovery**: Track system restoration

### Emergency Contacts
- **On-Call Engineer**: +1-555-WEDSYNC
- **Operations Manager**: ops@wedsync.com
- **Emergency Escalation**: emergency@wedsync.com

### Emergency Commands
\`\`\`bash
# Enable emergency bypass mode
redis-cli set "emergency_mode" "true"

# Disable rate limiting temporarily
redis-cli set "rate_limit_disabled" "true"

# Check wedding day status
curl https://api.wedsync.com/health/wedding-day

# Reset all circuit breakers
redis-cli keys "circuit_breaker:*" | xargs redis-cli del
\`\`\`

## Monitoring and Alerts

### Key Metrics to Monitor
- Authentication success rate (>95%)
- Average response time (<200ms)
- Rate limiting activation rate (<20%)
- Third-party service availability (>99%)
- Mobile optimization effectiveness (>90%)

### Alert Thresholds
- **Critical**: Authentication failure rate >10%
- **Warning**: Response time >500ms
- **Info**: Rate limiting activation >15%

### Dashboard URLs
- **Production Monitoring**: https://monitoring.wedsync.com
- **Error Tracking**: https://errors.wedsync.com
- **Performance Metrics**: https://performance.wedsync.com

---
*WedSync Middleware Troubleshooting Guide*
*Last updated: ${new Date().toISOString()}*
*For emergency support: emergency@wedsync.com*
`;
  }

  generateRunbookTemplate(): string {
    return `
# WedSync Middleware Operations Runbook

## Daily Operations Checklist

### Morning Checks (Every Day)
- [ ] Check system health dashboard
- [ ] Review overnight error logs
- [ ] Verify all services are responding
- [ ] Check Redis memory usage
- [ ] Review rate limiting metrics
- [ ] Validate SSL certificate status

### Peak Season Checks (May-September)
- [ ] Monitor concurrent user counts
- [ ] Check autoscaling status
- [ ] Review peak traffic handling
- [ ] Verify circuit breaker thresholds
- [ ] Monitor third-party service status
- [ ] Check mobile optimization metrics

### Wedding Day Protocol (Saturdays)
- [ ] Enable enhanced monitoring
- [ ] Check all emergency contacts
- [ ] Verify backup systems ready
- [ ] Monitor real-time metrics
- [ ] Prepare incident response team
- [ ] Review today's wedding schedules

## Incident Response Procedures

### Severity Levels

#### P0 - Critical (Wedding Day Impact)
- **Response Time**: Immediate (5 minutes)
- **Examples**: Complete system outage, payment failures, authentication down
- **Actions**: 
  1. Page on-call engineer immediately
  2. Create incident channel
  3. Notify wedding coordinators
  4. Implement emergency procedures

#### P1 - High (Service Degradation)
- **Response Time**: 30 minutes
- **Examples**: High error rates, slow responses, partial outages
- **Actions**:
  1. Notify on-call engineer
  2. Begin investigation
  3. Implement workarounds if available

#### P2 - Medium (Non-Critical Issues)
- **Response Time**: 2 hours
- **Examples**: Minor feature issues, documentation problems
- **Actions**:
  1. Log in tracking system
  2. Schedule fix during business hours

### Escalation Path
1. **On-Call Engineer** (Primary response)
2. **Senior Engineer** (Complex technical issues)
3. **Engineering Manager** (Resource allocation needed)
4. **VP Engineering** (Business impact assessment)
5. **CEO** (Public relations impact)

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] Code review completed
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

### Deployment Steps
1. **Staging Deployment**
   \`\`\`bash
   git checkout main
   git pull origin main
   ./deploy-staging.sh
   ./verify-staging.sh
   \`\`\`

2. **Production Deployment**
   \`\`\`bash
   ./deploy-production.sh
   ./verify-production.sh
   ./run-smoke-tests.sh
   \`\`\`

3. **Post-Deployment Verification**
   - [ ] Health checks passing
   - [ ] Error rates normal
   - [ ] Response times acceptable
   - [ ] All integrations working

### Rollback Procedures
\`\`\`bash
# Immediate rollback
./rollback-production.sh

# Verify rollback
./verify-rollback.sh

# Notify stakeholders
./notify-rollback.sh
\`\`\`

## Regular Maintenance Tasks

### Weekly Tasks
- [ ] Review and rotate logs
- [ ] Update SSL certificates
- [ ] Review security alerts
- [ ] Performance optimization review
- [ ] Dependency updates check

### Monthly Tasks
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Team training updates

### Quarterly Tasks
- [ ] Full security assessment
- [ ] Performance benchmarking
- [ ] Disaster recovery drill
- [ ] Architecture review
- [ ] Tool and service evaluation

## Emergency Contacts

### Internal Team
- **On-Call Engineer**: +1-555-ONCALL
- **Engineering Manager**: +1-555-ENGMGR
- **Operations Manager**: +1-555-OPSMGR
- **VP Engineering**: +1-555-VPENG

### External Vendors
- **AWS Support**: [Account-specific number]
- **Stripe Support**: +1-888-STRIPE1
- **Redis Cloud**: [Account-specific number]
- **Monitoring Service**: [Account-specific number]

### Communication Channels
- **Incident Channel**: #incidents
- **Operations Channel**: #operations
- **Emergency Email**: emergency@wedsync.com
- **Status Page**: https://status.wedsync.com

---
*WedSync Middleware Operations Runbook*
*Version 1.0 - ${new Date().toISOString()}*
*For updates: operations@wedsync.com*
`;
  }

  exportOpenAPISpec(): string {
    return JSON.stringify(this.openApiSpec, null, 2);
  }

  exportPostmanCollection(): string {
    // Convert OpenAPI spec to Postman collection format
    return JSON.stringify(
      {
        info: {
          name: 'WedSync Middleware API',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: Object.entries(this.openApiSpec.paths).map(([path, methods]) => ({
          name: path,
          item: Object.entries(methods as any).map(
            ([method, spec]: [string, any]) => ({
              name: `${method.toUpperCase()} ${path}`,
              request: {
                method: method.toUpperCase(),
                header: [],
                url: {
                  raw: `{{baseUrl}}${path}`,
                  host: ['{{baseUrl}}'],
                  path: path.split('/').filter(Boolean),
                },
              },
            }),
          ),
        })),
      },
      null,
      2,
    );
  }
}
