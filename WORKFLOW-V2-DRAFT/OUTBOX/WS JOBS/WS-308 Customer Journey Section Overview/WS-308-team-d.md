# WS-308: Customer Journey Section Overview - Team D Platform Prompt

## COMPREHENSIVE TEAM D PROMPT
### Platform Engineering & Infrastructure Development for WedSync Journey System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-308 - Customer Journey Section Overview  
**Team**: D (Platform Engineering & Infrastructure)  
**Sprint**: Customer Journey System Infrastructure  
**Priority**: P0 (Foundation for journey automation)

**Context**: You are Team D, responsible for the platform engineering and infrastructure that powers WedSync's automated customer journey system. This system will revolutionize how wedding vendors automate their client communications, from initial inquiry through post-wedding follow-up, handling millions of journey executions for our wedding platform.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
Before proceeding, you MUST verify these files exist and read their contents:

```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-308-customer-journey-section-overview-technical.md',
  '/wedsync/src/components/journeys/JourneySystemLayout.tsx', // From Team A
  '/wedsync/src/lib/services/journey-execution-engine.ts',   // From Team B
  '/wedsync/src/lib/integrations/journey-integration-orchestrator.ts', // From Team C
  '/wedsync/src/lib/platform/journey-infrastructure.ts',     // Your foundation
  '/wedsync/supabase/migrations/055_journey_infrastructure_tables.sql'
];

// VERIFY: Each file must be read and understood before coding
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot proceed with hallucinated development.`);
  }
});
```

### ARCHITECTURAL CONTEXT VERIFICATION
You must understand the complete journey system architecture:

1. **Journey Designer** (Team A): Visual workflow builder with React Flow
2. **Journey Engine** (Team B): Execution engine with trigger processing
3. **Journey Integrations** (Team C): CRM/email sync and webhooks
4. **Journey Infrastructure** (Team D): Platform services and monitoring
5. **Journey Quality** (Team E): Testing and performance validation

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Complex Analysis

For every major architectural decision, you MUST use the Sequential Thinking MCP to analyze platform requirements:

```typescript
// REQUIRED: Before implementing any infrastructure component
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the platform infrastructure for WedSync's customer journey system. This will handle millions of journey executions for wedding vendors. Let me analyze the key components: 1) Journey Queue Management - Redis-based queuing for reliable execution, 2) Journey Monitoring - Real-time metrics and health checks, 3) Journey Scaling - Horizontal scaling with load balancing, 4) Journey Storage - Optimized data storage patterns, 5) Journey Analytics - Performance tracking and insights.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});

// Continue analysis through all platform considerations
```

### WEDDING INDUSTRY CONTEXT ANALYSIS
```typescript
await mcp__sequential_thinking__sequential_thinking({
  thought: "The wedding industry has unique platform requirements that I must consider: 1) Seasonal Load Patterns - Wedding season (May-October) creates 5x traffic spikes, 2) Critical Timing - Journeys tied to wedding dates cannot fail, 3) Vendor Diversity - Photographers, venues, caterers have different infrastructure needs, 4) Geographic Distribution - Weddings happen globally requiring regional infrastructure, 5) Weekend Peaks - Saturday weddings create massive concurrent loads.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 8
});
```

---

## 🎨 WEDSYNC UI STACK INTEGRATION

### REQUIRED COMPONENT ARCHITECTURE
All platform monitoring interfaces must follow WedSync design system:

```typescript
// MANDATORY: Use these exact imports for consistency
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart, PieChart } from '@/components/ui/charts';

// Platform monitoring dashboard must integrate with existing navigation
import { PlatformNavigationWrapper } from '@/components/platform/PlatformNavigationWrapper';
```

### DESIGN SYSTEM COMPLIANCE
- **Colors**: Use `journey-primary`, `journey-secondary`, `wedding-rose` from theme
- **Typography**: `font-inter` for metrics, `font-display` for headers
- **Spacing**: Follow 4px grid system (`space-4`, `space-8`, `space-12`)
- **Mobile**: All platform interfaces must work on mobile devices

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

### MANDATORY SETUP PROTOCOL
```bash
# REQUIRED: Before any development work
serena activate_project WedSync2
serena get_symbols_overview src/lib/platform/
serena find_symbol "JourneyInfrastructure"
serena write_memory "WS-308-team-d-platform-architecture" "Platform infrastructure design for customer journey system execution and monitoring"
```

### SEMANTIC CODE REQUIREMENTS
All platform code must be written using Serena MCP for consistency:

```typescript
// Use Serena for intelligent code generation
serena replace_symbol_body "JourneyQueueManager" "
class JourneyQueueManager {
  private redisClient: Redis;
  private healthChecker: HealthChecker;
  
  async enqueueJourney(journey: JourneyExecution): Promise<void> {
    // Platform-level journey queuing with reliability
  }
  
  async processJourneyQueue(): Promise<void> {
    // Batch processing with error handling
  }
}
";

// Maintain architectural consistency across all platform services
```

---

## 🔐 SECURITY REQUIREMENTS CHECKLIST

### ENTERPRISE SECURITY COMPLIANCE
```typescript
interface PlatformSecurityChecklist {
  infrastructureSecurity: {
    // ✅ All platform services must implement these
    encrypted_data_at_rest: boolean;          // Required: Encrypt journey data
    encrypted_data_in_transit: boolean;       // Required: TLS for all connections
    service_authentication: boolean;          // Required: JWT tokens between services
    audit_logging: boolean;                   // Required: Log all platform operations
    rate_limiting: boolean;                   // Required: Prevent abuse
    ip_whitelisting: boolean;                 // Required: Platform access control
    secrets_management: boolean;              // Required: Vault/secure storage
  };
  
  monitoringSecurity: {
    access_control: boolean;                  // Required: RBAC for monitoring
    sensitive_data_masking: boolean;          // Required: Mask PII in logs
    security_alerting: boolean;               // Required: Alert on security events
    compliance_reporting: boolean;            // Required: GDPR/SOC2 compliance
  };
}
```

---

## 🎯 TEAM D SPECIALIZATION: PLATFORM ENGINEERING

### PRIMARY RESPONSIBILITIES
You are the **Platform Engineering team** responsible for:

1. **Journey Infrastructure Services**
   - Queue management and processing
   - Load balancing and scaling
   - Service orchestration
   - Resource optimization

2. **Monitoring & Observability** 
   - Real-time metrics dashboard
   - Performance monitoring
   - Error tracking and alerting
   - Health check systems

3. **Data Platform**
   - Journey data optimization
   - Analytics data pipeline
   - Backup and recovery systems
   - Data retention policies

4. **DevOps & Deployment**
   - CI/CD pipeline optimization
   - Container orchestration
   - Environment management
   - Disaster recovery

---

## 📊 CORE DELIVERABLES

### 1. JOURNEY INFRASTRUCTURE SERVICES
```typescript
// FILE: /src/lib/platform/journey-infrastructure.ts
export class JourneyInfrastructure {
  private queueManager: JourneyQueueManager;
  private loadBalancer: LoadBalancer;
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;
  
  async initializeInfrastructure(): Promise<void> {
    // Initialize all platform services
    await this.queueManager.initialize();
    await this.loadBalancer.configure();
    await this.healthChecker.startMonitoring();
    await this.metricsCollector.beginCollection();
  }
  
  async processJourneyLoad(load: JourneyLoad): Promise<void> {
    // Handle journey processing load distribution
    const availableWorkers = await this.loadBalancer.getAvailableWorkers();
    const optimizedDistribution = this.calculateOptimalDistribution(load, availableWorkers);
    await this.distributeJourneyLoad(optimizedDistribution);
  }
  
  async handleWeddingSeasonScale(expectedLoad: number): Promise<void> {
    // Scale infrastructure for wedding season peaks
    const currentCapacity = await this.getCurrentCapacity();
    if (expectedLoad > currentCapacity * 0.8) {
      await this.scaleUp(Math.ceil(expectedLoad / currentCapacity));
    }
  }
}
```

### 2. MONITORING DASHBOARD
```typescript
// FILE: /src/components/platform/JourneyMonitoringDashboard.tsx
'use client';

import { useJourneyMetrics } from '@/hooks/useJourneyMetrics';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { LineChart, BarChart } from '@/components/ui/charts';

interface JourneyMonitoringDashboardProps {
  timeRange: '1h' | '24h' | '7d' | '30d';
}

export const JourneyMonitoringDashboard: React.FC<JourneyMonitoringDashboardProps> = ({
  timeRange = '24h'
}) => {
  const { metrics, loading, error } = useJourneyMetrics(timeRange);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Journey Execution Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Journey Executions</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Executions</span>
              <span className="font-mono text-lg">{metrics.totalExecutions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Success Rate</span>
              <span className="font-mono text-lg text-green-600">
                {metrics.successRate}%
              </span>
            </div>
            <LineChart
              data={metrics.executionHistory}
              height={200}
              color="journey-primary"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* System Performance */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">System Performance</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Queue Length</span>
              <span className="font-mono text-lg">{metrics.queueLength}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Avg Processing Time</span>
              <span className="font-mono text-lg">{metrics.avgProcessingTime}ms</span>
            </div>
            <BarChart
              data={metrics.performanceHistory}
              height={200}
              color="journey-secondary"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Error Tracking */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Error Tracking</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Error Rate</span>
              <span className="font-mono text-lg text-red-600">
                {metrics.errorRate}%
              </span>
            </div>
            <div className="space-y-2">
              {metrics.topErrors.map((error, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-red-600">{error.type}</span>
                  <span>{error.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 3. QUEUE MANAGEMENT SYSTEM
```typescript
// FILE: /src/lib/platform/journey-queue-manager.ts
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

export class JourneyQueueManager extends EventEmitter {
  private redisClient: Redis;
  private workerPool: WorkerPool;
  private retryPolicy: RetryPolicy;
  
  constructor() {
    super();
    this.redisClient = new Redis(process.env.REDIS_URL);
    this.workerPool = new WorkerPool();
    this.retryPolicy = new RetryPolicy({
      maxRetries: 3,
      backoffStrategy: 'exponential',
      weddingDayPriority: true // Prioritize wedding-related journeys
    });
  }
  
  async enqueueJourney(journey: JourneyExecution): Promise<void> {
    const priority = this.calculateJourneyPriority(journey);
    const queueName = this.getQueueName(priority);
    
    await this.redisClient.lpush(
      queueName,
      JSON.stringify({
        journeyId: journey.id,
        clientId: journey.clientId,
        weddingDate: journey.weddingDate,
        priority,
        enqueuedAt: new Date().toISOString()
      })
    );
    
    this.emit('journeyEnqueued', journey);
  }
  
  private calculateJourneyPriority(journey: JourneyExecution): number {
    const daysToWedding = this.getDaysToWedding(journey.weddingDate);
    
    // Wedding day and day before get highest priority
    if (daysToWedding <= 1) return 10;
    if (daysToWedding <= 7) return 8;
    if (daysToWedding <= 30) return 6;
    return 4;
  }
  
  async processJourneyQueue(): Promise<void> {
    const queues = ['high-priority', 'medium-priority', 'low-priority'];
    
    for (const queueName of queues) {
      const journeyData = await this.redisClient.rpop(queueName);
      if (journeyData) {
        const journey = JSON.parse(journeyData);
        await this.processJourneyWithRetry(journey);
      }
    }
  }
  
  private async processJourneyWithRetry(journey: JourneyData): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < this.retryPolicy.maxRetries) {
      try {
        await this.workerPool.processJourney(journey);
        this.emit('journeyCompleted', journey);
        return;
      } catch (error) {
        attempts++;
        lastError = error as Error;
        
        if (attempts < this.retryPolicy.maxRetries) {
          const backoffMs = this.retryPolicy.calculateBackoff(attempts);
          await this.sleep(backoffMs);
        }
      }
    }
    
    // All retries failed
    this.emit('journeyFailed', journey, lastError);
    await this.moveToDeadLetterQueue(journey, lastError);
  }
}
```

### 4. PERFORMANCE MONITORING
```typescript
// FILE: /src/lib/platform/journey-performance-monitor.ts
export class JourneyPerformanceMonitor {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private performanceThresholds: PerformanceThresholds;
  
  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.performanceThresholds = {
      maxExecutionTime: 30000, // 30 seconds
      maxQueueLength: 1000,
      minSuccessRate: 95,
      maxErrorRate: 5
    };
  }
  
  async trackJourneyExecution(journeyId: string, metrics: ExecutionMetrics): Promise<void> {
    // Record execution metrics
    await this.metricsCollector.record('journey_execution_time', metrics.executionTime, {
      journey_id: journeyId,
      success: metrics.success.toString()
    });
    
    // Check performance thresholds
    if (metrics.executionTime > this.performanceThresholds.maxExecutionTime) {
      await this.alertManager.sendAlert({
        type: 'performance',
        severity: 'warning',
        message: `Journey ${journeyId} exceeded maximum execution time`,
        metadata: { executionTime: metrics.executionTime }
      });
    }
    
    // Wedding-specific performance tracking
    if (this.isWeddingWeek(metrics.weddingDate)) {
      await this.trackWeddingWeekPerformance(journeyId, metrics);
    }
  }
  
  async generatePerformanceReport(timeRange: string): Promise<PerformanceReport> {
    const metrics = await this.metricsCollector.query(timeRange);
    
    return {
      totalExecutions: metrics.count,
      averageExecutionTime: metrics.avg_execution_time,
      successRate: (metrics.successful_executions / metrics.total_executions) * 100,
      errorRate: (metrics.failed_executions / metrics.total_executions) * 100,
      queueMetrics: {
        averageQueueLength: metrics.avg_queue_length,
        maxQueueLength: metrics.max_queue_length,
        averageWaitTime: metrics.avg_wait_time
      },
      weddingSpecificMetrics: {
        weddingWeekExecutions: metrics.wedding_week_executions,
        weddingDayExecutions: metrics.wedding_day_executions,
        criticalPathSuccessRate: metrics.critical_path_success_rate
      }
    };
  }
}
```

---

## 🏗️ INFRASTRUCTURE REQUIREMENTS

### CONTAINERIZATION
```dockerfile
# FILE: /docker/journey-infrastructure/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy platform services
COPY src/lib/platform/ ./lib/platform/
COPY src/components/platform/ ./components/platform/

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["npm", "run", "start:platform"]
```

### KUBERNETES DEPLOYMENT
```yaml
# FILE: /k8s/journey-infrastructure/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: journey-infrastructure
  namespace: wedsync-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: journey-infrastructure
  template:
    metadata:
      labels:
        app: journey-infrastructure
    spec:
      containers:
      - name: journey-infrastructure
        image: wedsync/journey-infrastructure:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: journey-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi" 
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 📊 WEDDING INDUSTRY INTEGRATION

### WEDDING-SPECIFIC PLATFORM CONSIDERATIONS
```typescript
// Wedding season scaling logic
export class WeddingSeasonManager {
  async adjustInfrastructureForSeason(): Promise<void> {
    const currentMonth = new Date().getMonth() + 1;
    const isWeddingSeason = currentMonth >= 4 && currentMonth <= 10; // Apr-Oct
    
    if (isWeddingSeason) {
      // Scale up for wedding season
      await this.scaleInfrastructure({
        queueWorkers: 10,
        redisNodes: 3,
        monitoringInstances: 2
      });
    } else {
      // Scale down for off-season
      await this.scaleInfrastructure({
        queueWorkers: 3,
        redisNodes: 1,
        monitoringInstances: 1
      });
    }
  }
  
  async handleSaturdayLoad(): Promise<void> {
    const isSaturday = new Date().getDay() === 6;
    
    if (isSaturday) {
      // Most weddings are on Saturday - maximum reliability required
      await this.enableWeddingDayMode({
        increasedMonitoring: true,
        fasterHealthChecks: true,
        prioritizeWeddingJourneys: true,
        alertThresholds: 'strict'
      });
    }
  }
}
```

---

## 🧪 TESTING REQUIREMENTS

### INFRASTRUCTURE TESTING
```typescript
// FILE: /src/__tests__/platform/journey-infrastructure.test.ts
describe('Journey Infrastructure', () => {
  describe('Queue Management', () => {
    it('should prioritize wedding day journeys', async () => {
      const queueManager = new JourneyQueueManager();
      
      const weddingDayJourney = createMockJourney({
        weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      });
      
      const regularJourney = createMockJourney({
        weddingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      await queueManager.enqueueJourney(regularJourney);
      await queueManager.enqueueJourney(weddingDayJourney);
      
      const nextJourney = await queueManager.getNextJourney();
      expect(nextJourney.id).toBe(weddingDayJourney.id);
    });
    
    it('should handle high load during wedding season', async () => {
      const infrastructure = new JourneyInfrastructure();
      const highLoad = { executionsPerSecond: 500 };
      
      await infrastructure.processJourneyLoad(highLoad);
      
      const metrics = await infrastructure.getMetrics();
      expect(metrics.queueLength).toBeLessThan(100);
      expect(metrics.averageProcessingTime).toBeLessThan(1000);
    });
  });
  
  describe('Performance Monitoring', () => {
    it('should track wedding-specific metrics', async () => {
      const monitor = new JourneyPerformanceMonitor();
      
      await monitor.trackJourneyExecution('journey-123', {
        executionTime: 1500,
        success: true,
        weddingDate: new Date('2024-06-15')
      });
      
      const report = await monitor.generatePerformanceReport('24h');
      expect(report.weddingSpecificMetrics).toBeDefined();
    });
  });
});
```

---

## 🔄 INTEGRATION WITH OTHER TEAMS

### TEAM COORDINATION REQUIREMENTS
```typescript
// Integration with Team A (Journey Designer)
interface JourneyDesignerIntegration {
  validateJourneyConfiguration(journey: JourneyConfig): Promise<ValidationResult>;
  deployJourneyToInfrastructure(journey: Journey): Promise<DeploymentResult>;
}

// Integration with Team B (Journey Engine) 
interface JourneyEngineIntegration {
  provideExecutionInfrastructure(engine: JourneyEngine): Promise<void>;
  monitorEnginePerformance(engine: JourneyEngine): Promise<EngineMetrics>;
}

// Integration with Team C (Journey Integrations)
interface JourneyIntegrationInfrastructure {
  provideWebhookInfrastructure(): Promise<WebhookEndpoint[]>;
  monitorIntegrationHealth(): Promise<IntegrationHealthStatus>;
}

// Integration with Team E (Journey Quality)
interface JourneyQualityInfrastructure {
  provideTestingInfrastructure(): Promise<TestEnvironment>;
  collectQualityMetrics(): Promise<QualityMetrics>;
}
```

---

## ✅ DEFINITION OF DONE

### ACCEPTANCE CRITERIA
- [ ] **Journey Infrastructure Services**: Queue management, load balancing, and scaling implemented
- [ ] **Monitoring Dashboard**: Real-time metrics and alerts for journey performance
- [ ] **Performance Optimization**: Sub-1000ms journey processing during peak loads
- [ ] **Wedding Season Scaling**: Automatic infrastructure scaling for seasonal patterns
- [ ] **Error Handling**: Comprehensive retry logic and dead letter queue management
- [ ] **Security Compliance**: Enterprise-grade security for all platform services
- [ ] **Mobile Monitoring**: Platform monitoring interfaces work on mobile devices
- [ ] **Integration Ready**: APIs and interfaces for other teams completed

### QUALITY GATES
- [ ] **Load Testing**: Handles 1000+ concurrent journey executions
- [ ] **Reliability**: 99.9% uptime with automatic failover
- [ ] **Performance**: <500ms average journey processing time
- [ ] **Security**: All security checklist items verified
- [ ] **Documentation**: Complete API documentation and runbooks
- [ ] **Testing**: 90%+ test coverage for all platform services

---

## 🚀 EXECUTION TIMELINE

### SPRINT BREAKDOWN
**Week 1**: Infrastructure foundation and queue management
**Week 2**: Monitoring dashboard and performance optimization  
**Week 3**: Wedding-specific scaling and error handling
**Week 4**: Integration testing and production deployment

---

## 📞 TEAM COORDINATION

**Daily Standups**: Share infrastructure status and performance metrics
**Integration Points**: Coordinate with Teams A, B, C, E for seamless integration
**Code Reviews**: Platform code must be reviewed by senior engineers
**Documentation**: Maintain infrastructure runbooks and deployment guides

---

**Platform Engineering Excellence: Building the foundation for millions of wedding journey automations! 🏗️💍**