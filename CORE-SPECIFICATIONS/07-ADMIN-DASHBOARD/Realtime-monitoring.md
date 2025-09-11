# Realtime-monitoring

# 07-realtime-monitoring.md

## What to Build

Real-time activity monitoring dashboard showing live user sessions, system events, and operational metrics with WebSocket updates.

## Key Technical Requirements

### Real-time Data Structure

```tsx
interface RealtimeMetrics {
  activeUsers: {
    current: number
    suppliers: number
    couples: number
    locations: GeoLocation[]
    trend: number // vs 1 hour ago
  }
  liveActivity: {
    signups: LiveEvent[]
    payments: LiveEvent[]
    formSubmissions: LiveEvent[]
    invitations: LiveEvent[]
  }
  systemLoad: {
    requestsPerSecond: number
    avgResponseTime: number
    errorRate: number
    queueDepth: number
  }
  alerts: RealtimeAlert[]
}

interface LiveEvent {
  id: string
  type: string
  userId: string
  userName: string
  description: string
  value?: number
  timestamp: Date
  metadata: any
}

interface RealtimeAlert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  affectedUsers: number
  autoResolve: boolean
  timestamp: Date
}

```

### WebSocket Implementation

```tsx
class RealtimeMonitor {
  private ws: WebSocket
  private subscribers: Map<string, Set<Function>> = new Map()

  async initialize() {
    this.ws = new WebSocket(process.env.WS_ENDPOINT)

    this.ws.on('message', (data) => {
      const event = JSON.parse(data)
      this.broadcast(event.type, event.data)
    })

    // Subscribe to database changes
    await this.subscribeToDatabase()

    // Start metric collectors
    this.startMetricCollectors()
  }

  private async subscribeToDatabase() {
    const subscription = supabase
      .channel('realtime-monitor')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'users' },
        (payload) => {
          this.handleNewUser(payload.new)
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_transactions' },
        (payload) => {
          this.handleNewPayment(payload.new)
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'form_responses' },
        (payload) => {
          this.handleFormActivity(payload)
        }
      )
      .subscribe()
  }

  private handleNewUser(user: any) {
    const event: LiveEvent = {
      id: generateId(),
      type: 'signup',
      userId: user.id,
      userName: user.name || 'New User',
      description: `New ${user.user_type} signed up`,
      timestamp: new Date(),
      metadata: {
        vendorType: user.vendor_type,
        source: user.utm_source
      }
    }

    this.broadcast('new_signup', event)
    this.updateMetrics('signups', event)
  }

  private startMetricCollectors() {
    // Collect system metrics every second
    setInterval(async () => {
      const metrics = await this.collectSystemMetrics()
      this.broadcast('system_metrics', metrics)
    }, 1000)

    // Update active users every 10 seconds
    setInterval(async () => {
      const activeUsers = await this.getActiveUsers()
      this.broadcast('active_users', activeUsers)
    }, 10000)
  }
}

```

### Real-time Dashboard Component

```tsx
const RealtimeDashboard = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const ws = new WebSocket(WS_ENDPOINT)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch(data.type) {
        case 'new_signup':
          setEvents(prev => [data.payload, ...prev].slice(0, 100))
          toast.success(`New ${data.payload.metadata.vendorType} signed up!`)
          break

        case 'payment_success':
          if (data.payload.value > 100) {
            toast.success(`💰 New payment: ${formatCurrency(data.payload.value)}`)
          }
          break

        case 'system_alert':
          if (data.payload.severity === 'critical') {
            toast.error(data.payload.message)
          }
          break
      }
    }

    return () => ws.close()
  }, [])

  return (
    <div className="realtime-dashboard">
      {/* Live Activity Feed */}
      <div className="activity-feed">
        <div className="feed-header">
          <h3>Live Activity</h3>
          <ActivityFilter value={filter} onChange={setFilter} />
        </div>

        <div className="feed-items">
          {events
            .filter(e => filter === 'all' || e.type === filter)
            .map(event => (
              <ActivityItem key={event.id} event={event} />
            ))}
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="live-metrics">
        <LiveMetricCard
          title="Active Now"
          value={metrics?.activeUsers.current}
          sparkline={metrics?.activeUsers.history}
        />
        <LiveMetricCard
          title="Requests/sec"
          value={metrics?.systemLoad.requestsPerSecond}
          threshold={1000}
        />
        <LiveMetricCard
          title="Response Time"
          value={`${metrics?.systemLoad.avgResponseTime}ms`}
          threshold={500}
        />
      </div>

      {/* Geographic Activity Map */}
      <ActivityMap locations={metrics?.activeUsers.locations} />

      {/* System Health Indicators */}
      <SystemHealthBar metrics={metrics?.systemLoad} />
    </div>
  )
}

```

### Activity Stream Component

```tsx
const ActivityStream = () => {
  return (
    <div className="activity-stream">
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .activity-item {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      <div className="stream-container">
        {/* Recent signups ticker */}
        <div className="signup-ticker">
          <span className="ticker-label">New Signups:</span>
          <div className="ticker-items">
            {recentSignups.map(signup => (
              <span key={signup.id} className="ticker-item">
                {signup.userName} ({signup.vendorType})
              </span>
            ))}
          </div>
        </div>

        {/* Live counters */}
        <div className="live-counters">
          <Counter
            label="Forms Created Today"
            value={todayStats.formsCreated}
            incrementAnimation
          />
          <Counter
            label="Invites Sent"
            value={todayStats.invitesSent}
            incrementAnimation
          />
          <Counter
            label="Revenue Today"
            value={todayStats.revenue}
            format="currency"
            incrementAnimation
          />
        </div>
      </div>
    </div>
  )
}

```

### Peak Detection & Auto-scaling

```tsx
class LoadMonitor {
  private readonly SCALE_THRESHOLDS = {
    cpu: 70,
    memory: 80,
    responseTime: 2000,
    errorRate: 2
  }

  async monitorAndScale() {
    const metrics = await this.getCurrentMetrics()

    // Detect if scaling needed
    const scaleNeeded = this.shouldScale(metrics)

    if (scaleNeeded) {
      await this.triggerAutoScale(metrics)
    }

    // Predict upcoming load
    const prediction = await this.predictLoad()
    if (prediction.peakExpected) {
      await this.preemptiveScale(prediction)
    }
  }

  private async predictLoad(): Promise<LoadPrediction> {
    // Check for patterns (wedding season, weekends, etc)
    const dayOfWeek = new Date().getDay()
    const month = new Date().getMonth()

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isPeakSeason = month >= 4 && month <= 8 // May-Sept

    // Get historical patterns
    const historicalLoad = await this.getHistoricalLoad(
      dayOfWeek,
      new Date().getHours()
    )

    return {
      peakExpected: isWeekend && isPeakSeason,
      expectedLoad: historicalLoad * (isPeakSeason ? 1.5 : 1),
      confidence: 0.85,
      timeUntilPeak: this.calculateTimeUntilPeak()
    }
  }
}

```

## Critical Implementation Notes

- Use Redis for real-time metric aggregation
- Implement circuit breakers for WebSocket connections
- Buffer events client-side to prevent overwhelming UI
- Use server-sent events (SSE) as fallback for WebSocket
- Implement exponential backoff for reconnection
- Consider using time-series database for metrics (InfluxDB/TimescaleDB)

## Database Structure

```sql
-- Real-time session tracking
CREATE TABLE active_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  page_views INTEGER DEFAULT 1,
  events_count INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT
);

-- Automatically clean up old sessions
CREATE INDEX idx_active_sessions_activity ON active_sessions(last_activity);

-- Real-time metrics buffer
CREATE TABLE realtime_metrics (
  metric_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  value DECIMAL,
  tags JSONB,
  PRIMARY KEY (metric_name, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for each hour
CREATE TABLE realtime_metrics_2024_01_01_00
  PARTITION OF realtime_metrics
  FOR VALUES FROM ('2024-01-01 00:00:00') TO ('2024-01-01 01:00:00');

-- Activity log for real-time feed
CREATE TABLE activity_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_stream_recent ON activity_stream(created_at DESC);

```