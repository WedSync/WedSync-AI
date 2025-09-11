# 02-system-health.md

## What to Build

System monitoring dashboard tracking infrastructure performance, API health, and service availability.

## Key Technical Requirements

### Health Metrics Interface

```
interface SystemHealth {
  infrastructure: {
    serverUptime: number // Percentage
    responseTime: number // Milliseconds
    cpuUsage: number
    memoryUsage: number
    diskSpace: number
  }
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    elasticsearch: ServiceStatus
    emailService: ServiceStatus
    smsService: ServiceStatus
  }
  apiHealth: {
    requestsPerMinute: number
    errorRate: number
    p95ResponseTime: number
    p99ResponseTime: number
  }
  jobQueue: {
    pending: number
    processing: number
    failed: number
    completed24h: number
  }
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  lastCheck: Date
  errorCount24h: number
}
```

### Health Check Implementation

```
class HealthMonitor {
  private checks = new Map<string, HealthCheck>()
  
  async checkAllServices(): Promise<SystemHealth> {
    const results = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkEmailService(),
      this.checkInfrastructure()
    ])
    
    return this.aggregateResults(results)
  }
  
  private async checkDatabase(): Promise<ServiceStatus> {
    const start = [Date.now](http://Date.now)()
    try {
      await db.query('SELECT 1')
      return {
        status: 'healthy',
        latency: [Date.now](http://Date.now)() - start,
        lastCheck: new Date(),
        errorCount24h: await this.getErrorCount('database')
      }
    } catch (error) {
      return {
        status: 'down',
        latency: -1,
        lastCheck: new Date(),
        errorCount24h: await this.getErrorCount('database')
      }
    }
  }
}
```

### Status Page Component

```
const SystemHealthDashboard = () => {
  const health = useSystemHealth()
  
  return (
    <div className="health-dashboard">
      <StatusOverview status={health.overall} />
      
      <div className="services-grid">
        {Object.entries([health.services](http://health.services)).map(([name, status]) => (
          <ServiceCard
            key={name}
            name={name}
            status={status}
            showDetails={true}
          />
        ))}
      </div>
      
      <PerformanceChart 
        data={health.apiHealth}
        timeRange="24h"
      />
      
      <JobQueueStatus queue={health.jobQueue} />
    </div>
  )
}
```

### Monitoring Alerts

```
class AlertManager {
  async checkThresholds(metrics: SystemHealth) {
    const alerts = []
    
    if (metrics.infrastructure.cpuUsage > 80) {
      alerts.push({
        severity: 'warning',
        message: 'High CPU usage detected',
        value: metrics.infrastructure.cpuUsage
      })
    }
    
    if (metrics.apiHealth.errorRate > 0.01) {
      alerts.push({
        severity: 'critical',
        message: 'API error rate exceeds threshold',
        value: metrics.apiHealth.errorRate
      })
    }
    
    if (alerts.length > 0) {
      await this.sendAlerts(alerts)
    }
  }
}
```

## Critical Implementation Notes

- Use Prometheus for metrics collection
- Implement circuit breakers for external services
- Store health history for trend analysis
- Auto-scale based on metrics thresholds
- Integrate with PagerDuty for critical alerts

## Database Structure

```
CREATE TABLE health_checks (
  id UUID PRIMARY KEY,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  latency INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_checks_service ON health_checks(service, checked_at DESC);

CREATE TABLE system_metrics (
  id UUID PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value DECIMAL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```