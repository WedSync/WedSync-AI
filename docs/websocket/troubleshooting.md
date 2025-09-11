# WebSocket Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide addresses common WebSocket issues in WedSync's wedding coordination platform. Solutions are organized by severity and wedding industry impact, with emphasis on wedding day reliability.

## Emergency Response Protocol

### 🚨 Wedding Day Issues (CRITICAL)
**Wedding day is SACRED** - Immediate response required for Saturday operations.

#### Symptoms: Complete WebSocket Failure During Wedding
```bash
# Emergency Diagnosis
curl -I https://your-supabase-project.supabase.co/realtime/v1/websocket
# Expected: HTTP 101 Switching Protocols

# Check Supabase status
curl -s https://status.supabase.com/api/v2/summary.json | jq '.status.indicator'
# Expected: "none" (no incidents)
```

#### Immediate Actions
1. **Activate SMS Fallback**: All critical messages via SMS
2. **Switch to Manual Coordination**: Revert to phone/text coordination
3. **Alert All Stakeholders**: Immediate notification of technical issues
4. **Document Everything**: Log for post-wedding analysis

#### Recovery Steps
```typescript
// Emergency WebSocket Recovery
const emergencyRecovery = async () => {
  // 1. Force reconnect all channels
  await RealtimeSubscriptionManager.getInstance().reconnectAll();
  
  // 2. Validate critical channels
  const criticalChannels = [
    'supplier_dashboard',
    'venue_coordination', 
    'emergency_broadcast'
  ];
  
  for (const channelType of criticalChannels) {
    const status = await validateChannelHealth(channelType);
    if (!status.healthy) {
      await escalateToManualCoordination(channelType);
    }
  }
  
  // 3. Resume normal operations
  await resumeAutomatedCoordination();
};
```

## Common Issues and Solutions

### 1. Connection Failures

#### Issue: WebSocket Connection Refused
```
Error: WebSocket connection failed
Code: ECONNREFUSED
```

**Diagnosis Steps:**
```bash
# Check Supabase connection
npx supabase status --local
# Verify: All services running

# Test direct WebSocket connection
npx wscat -c "wss://your-project.supabase.co/realtime/v1/websocket"
```

**Root Causes & Solutions:**

##### Cause: Supabase Project Paused
```bash
# Check project status
npx supabase projects list
# Look for "PAUSED" status

# Solution: Resume project
npx supabase projects activate YOUR_PROJECT_ID
```

##### Cause: Network/Firewall Issues
```typescript
// Test network connectivity
const testConnection = async () => {
  try {
    const response = await fetch('https://your-project.supabase.co/rest/v1/', {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    });
    console.log('REST API Status:', response.status);
  } catch (error) {
    console.error('Network connectivity issue:', error);
  }
};
```

##### Cause: Invalid Authentication
```typescript
// Debug authentication
const debugAuth = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Auth error:', error);
    // Redirect to login
    window.location.href = '/login';
  }
  
  if (!user) {
    console.error('No authenticated user');
    // Refresh token
    await supabase.auth.refreshSession();
  }
};
```

### 2. Channel Isolation Failures

#### Issue: Cross-Wedding Message Leakage
```
ERROR: Message from Wedding A appeared in Wedding B dashboard
SEVERITY: CRITICAL - Wedding coordination disaster
```

**Detection:**
```typescript
// Monitor for cross-wedding leakage
const detectMessageLeakage = (receivedMessage: any, expectedWeddingId: string) => {
  if (receivedMessage.weddingId !== expectedWeddingId) {
    console.error('CRITICAL: Cross-wedding message leakage detected', {
      expected: expectedWeddingId,
      received: receivedMessage.weddingId,
      message: receivedMessage
    });
    
    // Immediately alert operations team
    alertOperationsTeam('Cross-wedding message leakage');
    
    // Log for investigation
    logSecurityIncident({
      type: 'cross_wedding_leakage',
      severity: 'critical',
      details: { expectedWeddingId, receivedMessage }
    });
    
    return true; // Leakage detected
  }
  
  return false; // No leakage
};
```

**Root Cause Analysis:**
```typescript
// Debug channel subscription
const debugChannelSubscription = async (subscriptionId: string) => {
  const manager = RealtimeSubscriptionManager.getInstance();
  const subscriptions = manager.getActiveSubscriptions();
  
  const subscription = subscriptions.find(s => s.id === subscriptionId);
  
  console.log('Subscription Debug:', {
    subscriptionId,
    channelName: subscription?.channelName,
    organizationId: subscription?.organizationId,
    weddingId: subscription?.weddingId,
    filters: subscription?.filters
  });
  
  // Verify channel name format
  const expectedChannelName = `supplier:dashboard:${subscription?.weddingId}`;
  if (subscription?.channelName !== expectedChannelName) {
    console.error('Invalid channel name format:', {
      actual: subscription?.channelName,
      expected: expectedChannelName
    });
  }
};
```

**Solution:**
```typescript
// Fix channel isolation
const fixChannelIsolation = async () => {
  const manager = RealtimeSubscriptionManager.getInstance();
  
  // 1. Unsubscribe from all channels
  await manager.unsubscribeAll();
  
  // 2. Clear channel cache
  manager.clearChannelCache();
  
  // 3. Re-subscribe with strict isolation
  await manager.subscribe({
    organizationId: user.organizationId,
    userId: user.id,
    channelName: `supplier:dashboard:${weddingId}`,
    channelType: 'supplier_dashboard',
    weddingId: weddingId, // CRITICAL: Wedding-specific isolation
    filters: {
      wedding_id: `eq.${weddingId}`, // Database-level filtering
      organization_id: `eq.${user.organizationId}`
    }
  });
};
```

### 3. Performance Issues

#### Issue: Slow Channel Switching (>200ms)
```
WARNING: Channel switch took 450ms (target: <200ms)
Impact: Poor user experience during wedding coordination
```

**Performance Diagnosis:**
```typescript
// Measure channel switch performance
const measureChannelSwitch = async (fromWeddingId: string, toWeddingId: string) => {
  const startTime = performance.now();
  
  // Unsubscribe from current channel
  await manager.unsubscribe(fromWeddingId);
  
  // Subscribe to new channel
  const result = await manager.subscribe({
    // ... subscription params for toWeddingId
  });
  
  const switchTime = performance.now() - startTime;
  
  if (switchTime > 200) {
    console.warn(`Slow channel switch: ${switchTime.toFixed(2)}ms`, {
      from: fromWeddingId,
      to: toWeddingId,
      target: '200ms'
    });
    
    // Log performance issue
    logPerformanceIssue('slow_channel_switch', {
      duration: switchTime,
      fromWeddingId,
      toWeddingId
    });
  }
  
  return switchTime;
};
```

**Optimization Solutions:**
```typescript
// Optimize channel switching with connection pooling
class OptimizedChannelManager {
  private connectionPool = new Map<string, RealtimeChannel>();
  
  async switchChannel(weddingId: string) {
    // Use pre-established connections
    let channel = this.connectionPool.get(weddingId);
    
    if (!channel) {
      // Create new connection
      channel = await this.createChannel(weddingId);
      this.connectionPool.set(weddingId, channel);
    }
    
    // Instant switch using existing connection
    this.activeChannel = channel;
    return channel;
  }
  
  // Pre-warm connections for photographer's weddings
  async preWarmConnections(weddingIds: string[]) {
    const warmupPromises = weddingIds.map(weddingId => 
      this.createChannel(weddingId)
    );
    
    const channels = await Promise.all(warmupPromises);
    
    channels.forEach((channel, index) => {
      this.connectionPool.set(weddingIds[index], channel);
    });
  }
}
```

#### Issue: High Memory Usage
```
WARNING: WebSocket manager using 150MB (target: <50MB per 100 connections)
```

**Memory Diagnosis:**
```typescript
// Monitor memory usage
const monitorMemoryUsage = () => {
  const usage = process.memoryUsage();
  const manager = RealtimeSubscriptionManager.getInstance();
  const activeConnections = manager.getActiveSubscriptions().length;
  
  const memoryPerConnection = usage.heapUsed / activeConnections / 1024 / 1024;
  
  console.log('Memory Usage:', {
    totalHeapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    activeConnections,
    memoryPerConnection: `${memoryPerConnection.toFixed(2)}MB`,
    target: '<0.5MB per connection'
  });
  
  if (memoryPerConnection > 0.5) {
    console.warn('High memory usage per connection');
    
    // Trigger cleanup
    manager.cleanupInactiveConnections();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
};

// Run memory monitoring every 30 seconds
setInterval(monitorMemoryUsage, 30000);
```

**Memory Optimization:**
```typescript
// Implement connection cleanup
class MemoryOptimizedManager {
  private connectionTimeout = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval = 60 * 1000; // 1 minute
  
  constructor() {
    // Regular cleanup of inactive connections
    setInterval(() => this.cleanupInactiveConnections(), this.cleanupInterval);
  }
  
  cleanupInactiveConnections() {
    const now = Date.now();
    const connections = this.getActiveSubscriptions();
    
    connections.forEach(connection => {
      const inactive = now - connection.lastActivity.getTime();
      
      if (inactive > this.connectionTimeout) {
        console.log(`Cleaning up inactive connection: ${connection.id}`);
        this.unsubscribe(connection.id);
      }
    });
  }
  
  // Optimize message handling
  handleMessage(message: any) {
    // Process message immediately, don't store history
    this.processMessage(message);
    
    // Don't keep large payloads in memory
    if (message.payload && message.payload.length > 1000) {
      message.payload = '[Large payload - truncated]';
    }
  }
}
```

### 4. Authentication Issues

#### Issue: JWT Token Expired
```
Error: JWT token expired
Status: 401 Unauthorized
```

**Detection and Recovery:**
```typescript
// Handle token expiration gracefully
const handleTokenExpiration = async () => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'TOKEN_REFRESHED' && session) {
      console.log('Token refreshed, reconnecting WebSocket...');
      
      // Reconnect all WebSocket subscriptions with new token
      await RealtimeSubscriptionManager.getInstance().reconnectAll();
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('User signed out, cleaning up connections...');
      
      // Clean up all WebSocket connections
      await RealtimeSubscriptionManager.getInstance().disconnectAll();
    }
  });
};
```

#### Issue: Row Level Security (RLS) Violations
```
Error: Permission denied for table 'form_responses'
Cause: RLS policy blocking WebSocket subscription
```

**Debug RLS Policies:**
```sql
-- Check RLS policies for form_responses table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pol.polqual as condition,
  pol.polwithcheck as with_check
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'form_responses';
```

**Fix RLS Issues:**
```sql
-- Example: Fix WebSocket RLS policy
CREATE POLICY "Users can access their organization's form responses via realtime"
ON form_responses
FOR SELECT
USING (
  auth.uid()::text IN (
    SELECT user_id::text 
    FROM user_profiles 
    WHERE organization_id = form_responses.organization_id
  )
);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE form_responses;
```

### 5. Wedding Venue Connectivity Issues

#### Issue: Poor WiFi at Wedding Venues
```
Frequent disconnections at venue
Slow message delivery
Intermittent connectivity
```

**Venue Connectivity Solutions:**
```typescript
// Implement robust offline handling
class VenueConnectivityManager {
  private messageQueue: QueuedMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  async handleConnectivityIssues() {
    // Monitor connection quality
    this.monitorConnectionQuality();
    
    // Queue messages during poor connectivity
    this.enableOfflineMessageQueue();
    
    // Implement intelligent reconnection
    this.intelligentReconnection();
  }
  
  monitorConnectionQuality() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      console.log('Connection info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
      
      // Adjust behavior based on connection quality
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.enableLowBandwidthMode();
      }
    }
  }
  
  async enableOfflineMessageQueue() {
    // Queue messages when offline
    window.addEventListener('offline', () => {
      this.queueMode = true;
      console.log('Offline detected - queueing messages');
    });
    
    // Send queued messages when back online
    window.addEventListener('online', async () => {
      console.log('Back online - sending queued messages');
      await this.sendQueuedMessages();
      this.queueMode = false;
    });
  }
  
  async sendQueuedMessages() {
    for (const message of this.messageQueue) {
      try {
        await this.sendMessage(message);
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Message remains in queue for next attempt
      }
    }
  }
}
```

### 6. Mobile App WebSocket Issues

#### Issue: iOS Safari WebSocket Limitations
```
WebSocket connections closing on iOS Safari
Background app WebSocket termination
```

**Mobile WebSocket Solutions:**
```typescript
// iOS Safari WebSocket handling
class MobileWebSocketManager {
  constructor() {
    // Handle iOS Safari limitations
    this.handleiOSWebSocketIssues();
    
    // Background/foreground app state handling
    this.handleAppStateChanges();
  }
  
  handleiOSWebSocketIssues() {
    // iOS Safari closes WebSocket connections after 30 seconds in background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('App backgrounded - preparing for WebSocket closure');
        this.prepareForBackground();
      } else {
        console.log('App foregrounded - reconnecting WebSocket');
        this.reconnectAfterForeground();
      }
    });
  }
  
  async prepareForBackground() {
    // Save current state
    this.saveWebSocketState();
    
    // Switch to polling mode for critical updates
    this.enablePollingFallback();
  }
  
  async reconnectAfterForeground() {
    // Disable polling
    this.disablePollingFallback();
    
    // Reconnect WebSocket
    await this.reconnectWebSocket();
    
    // Restore state
    this.restoreWebSocketState();
  }
  
  enablePollingFallback() {
    // Poll for critical updates every 30 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const updates = await fetch('/api/wedding/updates');
        const data = await updates.json();
        this.processPolledUpdates(data);
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, 30000);
  }
}
```

## Monitoring and Alerting

### WebSocket Health Monitoring

```typescript
// Comprehensive health monitoring
class WebSocketHealthMonitor {
  private healthMetrics = {
    connectionCount: 0,
    messageCount: 0,
    errorCount: 0,
    averageLatency: 0,
    lastHealthCheck: new Date()
  };
  
  startHealthMonitoring() {
    // Health check every 30 seconds
    setInterval(() => this.performHealthCheck(), 30000);
    
    // Detailed metrics every 5 minutes
    setInterval(() => this.collectDetailedMetrics(), 300000);
  }
  
  async performHealthCheck() {
    const manager = RealtimeSubscriptionManager.getInstance();
    const activeConnections = manager.getActiveSubscriptions();
    
    this.healthMetrics.connectionCount = activeConnections.length;
    this.healthMetrics.lastHealthCheck = new Date();
    
    // Test message delivery
    const latency = await this.testMessageLatency();
    this.healthMetrics.averageLatency = latency;
    
    // Alert on health issues
    if (latency > 1000) { // >1 second latency
      this.alertHighLatency(latency);
    }
    
    if (this.healthMetrics.errorCount > 10) { // >10 errors per interval
      this.alertHighErrorRate();
    }
    
    // Log health status
    console.log('WebSocket Health:', this.healthMetrics);
  }
  
  async testMessageLatency() {
    const startTime = Date.now();
    
    try {
      // Send test message and measure response time
      await this.sendTestMessage();
      return Date.now() - startTime;
    } catch (error) {
      this.healthMetrics.errorCount++;
      return -1; // Error occurred
    }
  }
}
```

### Alerting Configuration

```typescript
// Alert configuration for different scenarios
const alertConfig = {
  critical: {
    // Wedding day issues - immediate response
    weddingDayFailure: {
      channels: ['sms', 'phone', 'slack'],
      escalation: '1 minute',
      recipients: ['on-call-engineer', 'cto']
    },
    
    crossWeddingLeakage: {
      channels: ['sms', 'email', 'slack'],
      escalation: '2 minutes',
      recipients: ['security-team', 'engineering-lead']
    }
  },
  
  warning: {
    highLatency: {
      threshold: '500ms',
      channels: ['slack', 'email'],
      recipients: ['engineering-team']
    },
    
    highMemoryUsage: {
      threshold: '100MB',
      channels: ['slack'],
      recipients: ['engineering-team']
    }
  }
};
```

## Performance Debugging

### WebSocket Performance Profiling

```typescript
// Performance profiling tools
class WebSocketProfiler {
  private performanceLog: PerformanceEntry[] = [];
  
  startProfiling() {
    // Monitor all WebSocket operations
    this.monitorChannelSwitching();
    this.monitorMessageDelivery();
    this.monitorMemoryUsage();
  }
  
  monitorChannelSwitching() {
    const originalSubscribe = RealtimeSubscriptionManager.prototype.subscribe;
    
    RealtimeSubscriptionManager.prototype.subscribe = async function(...args) {
      const startTime = performance.now();
      const result = await originalSubscribe.apply(this, args);
      const duration = performance.now() - startTime;
      
      console.log('Channel Subscribe Performance:', {
        duration: `${duration.toFixed(2)}ms`,
        channel: args[0]?.channelName,
        target: '200ms'
      });
      
      if (duration > 200) {
        console.warn('Slow channel subscribe detected');
      }
      
      return result;
    };
  }
  
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      averageChannelSwitchTime: this.calculateAverage('channelSwitch'),
      averageMessageLatency: this.calculateAverage('messageLatency'),
      peakMemoryUsage: this.getPeakValue('memoryUsage'),
      totalOperations: this.performanceLog.length
    };
    
    console.log('WebSocket Performance Report:', report);
    return report;
  }
}
```

## Recovery Procedures

### Wedding Day Recovery Checklist

When WebSocket issues occur during wedding day:

#### Immediate Actions (0-2 minutes)
- [ ] Assess scope: Single wedding or platform-wide?
- [ ] Activate SMS backup communication
- [ ] Alert all stakeholders of technical issue
- [ ] Switch to manual coordination mode

#### Short-term Recovery (2-10 minutes)
- [ ] Attempt automated recovery procedures
- [ ] Validate critical channels are restored
- [ ] Test message delivery between key stakeholders
- [ ] Confirm wedding timeline communication restored

#### Follow-up Actions (Post-wedding)
- [ ] Full incident analysis and documentation
- [ ] Update recovery procedures based on learnings
- [ ] Implement additional monitoring/alerting
- [ ] Communication with affected couples and vendors

### Emergency Contact Information

```typescript
// Emergency escalation contacts
const emergencyContacts = {
  weddingDayIncidents: {
    primary: 'on-call-engineer@wedsync.com',
    secondary: 'cto@wedsync.com',
    phone: '+44123456789'
  },
  
  securityIncidents: {
    primary: 'security@wedsync.com',
    escalation: 'security-lead@wedsync.com'
  },
  
  infrastractureIssues: {
    primary: 'infrastructure@wedsync.com',
    supabaseSupport: 'Direct Supabase support channel'
  }
};
```

This troubleshooting guide ensures rapid resolution of WebSocket issues while maintaining the sacred reliability required for wedding day operations.