# 03-alert-system.md

## What to Build

Intelligent alert system that monitors platform health, business metrics, and user activities to proactively notify administrators of issues or opportunities requiring attention.

## Key Technical Requirements

### Alert Types & Priorities

```
enum AlertPriority {
  CRITICAL = 'critical',   // System down, payment failures
  HIGH = 'high',           // Performance degradation, high churn
  MEDIUM = 'medium',       // Unusual patterns, pending actions
  LOW = 'low',            // Informational, suggestions
  INFO = 'info'           // FYI notifications
}

interface Alert {
  id: string
  type: AlertType
  priority: AlertPriority
  title: string
  message: string
  metadata: Record<string, any>
  timestamp: Date
  acknowledged: boolean
  resolvedAt?: Date
  assignedTo?: string
}
```

### Alert Categories Implementation

```
class AlertManager {
  // System Health Alerts
  async checkSystemHealth() {
    const checks = [
      { metric: 'api_response_time', threshold: 2000, priority: 'high' },
      { metric: 'error_rate', threshold: 0.05, priority: 'critical' },
      { metric: 'database_connections', threshold: 80, priority: 'medium' },
      { metric: 'memory_usage', threshold: 90, priority: 'high' }
    ]
    
    for (const check of checks) {
      const value = await this.getMetric(check.metric)
      if (value > check.threshold) {
        await this.createAlert({
          type: 'system_health',
          priority: check.priority,
          title: `${check.metric} exceeded threshold`,
          message: `Current: ${value}, Threshold: ${check.threshold}`
        })
      }
    }
  }
  
  // Business Metric Alerts
  async checkBusinessMetrics() {
    // Churn spike detection
    const churnRate = await this.calculateChurnRate()
    if (churnRate > this.baseline.churn * 1.5) {
      await this.createAlert({
        type: 'business',
        priority: 'high',
        title: 'Churn rate spike detected',
        message: `Current: ${churnRate}%, Baseline: ${this.baseline.churn}%`,
        metadata: { affectedUsers: await this.getChurnedUsers() }
      })
    }
    
    // Low activation rate
    const activationRate = await this.getActivationRate()
    if (activationRate < 0.4) {
      await this.createAlert({
        type: 'business',
        priority: 'medium',
        title: 'Low user activation rate',
        message: `Only ${activationRate * 100}% of new users activating`
      })
    }
  }
}
```

### Alert UI Component

```
const AlertCenter = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<AlertPriority | 'all'>('all')
  
  useEffect(() => {
    // Subscribe to real-time alerts
    const subscription = supabase
      .channel('admin-alerts')
      .on('INSERT', (payload) => {
        setAlerts(prev => [[payload.new](http://payload.new), ...prev])
        // Show toast for critical alerts
        if ([payload.new](http://payload.new).priority === 'critical') {
          toast.error([payload.new](http://payload.new).title, { duration: 10000 })
        }
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
  
  return (
    <div className="alert-center">
      <div className="alert-header">
        <h2>System Alerts</h2>
        <div className="alert-filters">
          {['all', 'critical', 'high', 'medium', 'low'].map(level => (
            <button 
              key={level}
              onClick={() => setFilter(level)}
              className={filter === level ? 'active' : ''}
            >
              {level} ({alerts.filter(a => level === 'all' || a.priority === level).length})
            </button>
          ))}
        </div>
      </div>
      
      <div className="alert-list">
        {[filteredAlerts.map](http://filteredAlerts.map)(alert => (
          <AlertCard 
            key={[alert.id](http://alert.id)}
            alert={alert}
            onAcknowledge={() => acknowledgeAlert([alert.id](http://alert.id))}
            onResolve={() => resolveAlert([alert.id](http://alert.id))}
          />
        ))}
      </div>
    </div>
  )
}
```

### Alert Rules Engine

```
interface AlertRule {
  id: string
  name: string
  condition: string  // SQL or expression
  threshold: number
  operator: 'gt' | 'lt' | 'eq' | 'between'
  checkInterval: number  // minutes
  enabled: boolean
  actions: AlertAction[]
}

// Configurable alert rules stored in database
const alertRules = [
  {
    name: 'High Failed Payments',
    condition: 'SELECT COUNT(*) FROM payments WHERE status = "failed" AND created_at > NOW() - INTERVAL 1 HOUR',
    threshold: 5,
    operator: 'gt',
    checkInterval: 15,
    actions: ['email_admin', 'create_ticket']
  },
  {
    name: 'Low Supplier Activity',
    condition: 'SELECT COUNT(*) FROM suppliers WHERE last_login < NOW() - INTERVAL 30 DAY',
    threshold: 100,
    operator: 'gt',
    checkInterval: 1440,  // Daily
    actions: ['dashboard_alert', 'weekly_report']
  }
]
```

## Critical Implementation Notes

1. **Alert Deduplication**: Prevent alert fatigue by grouping similar alerts
2. **Escalation Paths**: Unacknowledged critical alerts escalate after 15 minutes
3. **Alert History**: Keep 90-day history for pattern analysis
4. **Notification Channels**: Email, SMS (for critical), Slack, in-app
5. **Smart Grouping**: Group related alerts (e.g., multiple payment failures)
6. **Snooze Functionality**: Allow temporary muting of non-critical alerts
7. **Custom Thresholds**: Make thresholds configurable per deployment

## Database Structure

```
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES admin_users(id),
  snoozed_until TIMESTAMPTZ
);

CREATE INDEX idx_alerts_priority ON alerts(priority) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Alert rules configuration
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  condition TEXT NOT NULL,
  threshold DECIMAL,
  operator VARCHAR(10),
  check_interval INTEGER, -- minutes
  last_checked TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  actions JSONB
);
```