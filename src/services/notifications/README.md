# WedSync Notification Engine Documentation

## 📋 Overview

The WedSync Notification Engine is a production-ready, wedding industry-optimized notification system built to handle the critical communication requirements of wedding suppliers and couples. This system ensures 99.9% reliability for wedding day communications with sub-second emergency response times.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WedSync Notification Engine                     │
├─────────────────────────────────────────────────────────────────────┤
│  Event Input Layer                                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ Kafka Streams   │  │  Direct API      │  │  Webhook Input  │   │
│  │ Event Processor │  │  Notifications   │  │   Sources       │   │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  Intelligence Layer                                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │            Wedding Notification Intelligence                   │ │
│  │  • Wedding Day Logic    • Weather Assessment                 │ │
│  │  • Vendor Coordination  • Timeline Analysis                  │ │
│  │  • Emergency Escalation • Content Optimization              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Processing Layer                                                  │
│  ┌───────────────────┐    ┌────────────────────────────────────────┐ │
│  │ Notification      │    │        Channel Router                 │ │
│  │ Engine            │<-->│  • Priority-based routing            │ │
│  │ • Redis/BullMQ    │    │  • Multi-channel delivery            │ │
│  │ • Queue Management│    │  • Failover & redundancy             │ │
│  └───────────────────┘    └────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Worker Layer                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │Queue        │ │Analytics    │ │Retry        │ │Dead Letter  │   │
│  │Workers      │ │Workers      │ │Workers      │ │Workers      │   │
│  │• Email      │ │• Metrics    │ │• Exp.       │ │• Manual     │   │
│  │• SMS        │ │• Insights   │ │  Backoff    │ │  Review     │   │
│  │• Push       │ │• Tracking   │ │• Recovery   │ │• Escalation │   │
│  │• Voice      │ │• Reports    │ │• Alerts     │ │• Archive    │   │
│  │• Webhook    │ │             │ │             │ │             │   │
│  │• In-App     │ │             │ │             │ │             │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  Provider Layer                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Resend  │ │ Twilio  │ │   FCM   │ │  Voice  │ │ Custom  │      │
│  │ Email   │ │ SMS     │ │ Push    │ │ Calls   │ │Webhooks │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Key Features

### Wedding-Specific Intelligence
- **Wedding Day Priority**: Automatic escalation for same-day events
- **Timeline Awareness**: Context-sensitive urgency based on wedding proximity
- **Weather Integration**: Outdoor venue weather impact assessment
- **Vendor Coordination**: Automatic dependent vendor notification chains
- **Emergency Escalation**: Multi-level escalation paths for critical issues

### Multi-Channel Delivery
- **Email**: Rich HTML templates via Resend
- **SMS**: International delivery via Twilio with cost optimization
- **Push Notifications**: Cross-platform via Firebase (iOS/Android/Web)
- **Voice Calls**: Emergency voice calls with text-to-speech
- **In-App**: Real-time browser notifications via Supabase
- **Webhooks**: Integration with external systems

### High-Performance Processing
- **Redis/BullMQ**: High-throughput queue processing
- **Kafka Integration**: Real-time event streaming
- **Worker Orchestration**: Auto-scaling based on load
- **Circuit Breakers**: Provider failure protection
- **Rate Limiting**: Cost optimization and provider protection

### Analytics & Monitoring
- **Real-time Metrics**: Delivery rates, latencies, error tracking
- **Wedding Insights**: Per-wedding engagement analytics
- **Performance Monitoring**: System health and alerts
- **Cost Tracking**: Per-channel cost analysis
- **Audit Logging**: Complete notification history

## 📁 File Structure

```
src/services/notifications/
├── 📄 README.md                              # This file
├── 📁 types/
│   ├── notification-backend.ts               # Core TypeScript interfaces
│   └── wedding-events.ts                     # Wedding-specific event types
├── 📁 core/
│   ├── WeddingNotificationEngine.ts          # Main notification engine
│   ├── NotificationChannelRouter.ts          # Multi-channel routing logic
│   ├── WeddingNotificationIntelligence.ts    # Wedding business logic
│   └── WeddingNotificationEventProcessor.ts  # Kafka event processing
├── 📁 providers/
│   ├── EmailProvider.ts                      # Resend email integration
│   ├── SMSProvider.ts                        # Twilio SMS integration
│   ├── PushProvider.ts                       # Firebase push notifications
│   ├── VoiceProvider.ts                      # Twilio voice calls
│   ├── WebhookProvider.ts                    # HTTP webhook delivery
│   ├── InAppProvider.ts                      # Supabase in-app notifications
│   └── index.ts                              # Provider factory & utilities
├── 📁 workers/
│   ├── NotificationQueueWorker.ts            # Queue processing workers
│   ├── NotificationAnalyticsWorker.ts        # Analytics & metrics collection
│   ├── NotificationWorkerCoordinator.ts      # Worker orchestration
│   └── index.ts                              # Worker management utilities
├── 📁 __tests__/
│   ├── NotificationSystem.test.ts            # Integration tests
│   ├── PerformanceBenchmarks.test.ts         # Performance testing
│   └── WeddingBusinessLogic.test.ts          # Wedding-specific logic tests
└── 📁 config/
    ├── channels.json                         # Channel configurations
    ├── templates/                            # Notification templates
    └── priorities.json                       # Priority mappings
```

## 🔧 Installation & Setup

### 1. Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Provider (Resend)
RESEND_API_KEY=re_your_resend_key
EMAIL_FROM=noreply@wedsync.com

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=wedsync-notifications
KAFKA_GROUP_ID=wedding-notification-processors

# Application URLs
NEXT_PUBLIC_APP_URL=https://app.wedsync.com
```

### 2. Required Dependencies

```bash
# Core dependencies already installed in package.json:
# - bullmq: ^5.0.0
# - ioredis: ^5.3.0
# - kafkajs: ^2.2.4
# - @supabase/supabase-js: ^2.55.0
# - resend: ^6.0.1
# - twilio: ^4.19.0
# - firebase-admin: ^12.0.0
```

### 3. Database Setup

The system requires these Supabase tables:

```sql
-- In-app notifications storage
CREATE TABLE in_app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wedding_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  color TEXT,
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Analytics events tracking
CREATE TABLE notification_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id TEXT NOT NULL,
  wedding_id UUID,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  metrics JSONB
);

-- Wedding insights storage
CREATE TABLE wedding_notification_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  insights JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Quick Start

### Starting the Notification System

```typescript
import { startNotificationSystem } from '@/services/notifications/workers';

async function initializeNotifications() {
  try {
    // Start the complete notification system
    const coordinator = await startNotificationSystem();
    
    console.log('✅ WedSync Notification System started');
    
    // Check system health
    const health = await coordinator.getSystemHealth();
    console.log(`System Status: ${health.overall}`);
    
    return coordinator;
  } catch (error) {
    console.error('❌ Failed to start notification system:', error);
    throw error;
  }
}

// Initialize on application startup
const notificationSystem = await initializeNotifications();
```

### Sending a Notification

```typescript
import { WeddingNotificationEngine } from '@/services/notifications';

const engine = new WeddingNotificationEngine();
await engine.initialize();

// Send a wedding emergency notification
const emergencyNotification = {
  id: 'emergency-001',
  event: {
    id: 'event-001',
    type: 'wedding_emergency',
    weddingId: 'wedding-123',
    userId: 'user-456',
    timestamp: new Date(),
    context: {
      weddingTitle: 'Smith Wedding',
      weddingDate: '2024-06-15',
      emergencyType: 'Venue Cancellation',
      actionRequired: 'Find replacement venue immediately',
      emergencyContact: '+1-555-0123'
    }
  },
  recipientId: 'recipient-789',
  content: 'URGENT: Your wedding venue has cancelled. Immediate action required.',
  priority: 'emergency',
  channels: ['voice', 'sms', 'push', 'in_app', 'email'],
  scheduledFor: new Date()
};

const result = await engine.processNotification(emergencyNotification);
console.log(`Notification sent with ID: ${result.id}`);
```

## 📊 Performance Characteristics

### Latency Targets (P95)
- **Emergency Notifications**: < 500ms
- **High Priority**: < 2 seconds
- **Normal Priority**: < 5 seconds

### Throughput Targets
- **Sustained Load**: 100+ notifications/second
- **Peak Burst**: 500+ simultaneous notifications
- **Daily Volume**: 100,000+ notifications

### Reliability Targets
- **Wedding Day Availability**: 99.99%
- **Emergency Success Rate**: 99.9%
- **Overall Error Rate**: < 1%

### Wedding-Specific Requirements
- **Saturday Response Time**: < 200ms (wedding day protection)
- **Emergency Escalation**: < 30 seconds
- **Vendor Coordination**: Real-time dependency chains

## 🔧 Configuration

### Channel Priority Configuration

```typescript
// Priority-based channel selection
const channelPriorities = {
  emergency: ['voice', 'sms', 'push', 'in_app', 'email'],
  high: ['sms', 'push', 'in_app', 'email'],
  medium: ['push', 'in_app', 'email'],
  low: ['in_app', 'email']
};

// Wedding day overrides (uses ALL channels)
const weddingDayChannels = ['voice', 'sms', 'push', 'in_app', 'email'];
```

### Worker Concurrency Settings

```typescript
const workerConcurrency = {
  email: 10,      // Resend has high throughput
  sms: 15,        // Twilio can handle high volume
  push: 20,       // Firebase is very fast
  voice: 5,       // Voice calls are expensive/slow
  webhook: 8,     // External systems may be slower
  in_app: 25,     // Supabase is local and fast
  emergency: 20,  // High concurrency for emergencies
  batch: 5,       // Batch processing is slower
  retry: 10,      // Moderate retry processing
  dead_letter: 2  // Manual review queue
};
```

### Template Configuration

```typescript
// Email templates for different event types
const emailTemplates = {
  wedding_emergency: {
    subject: '🚨 URGENT: Wedding Emergency - {{weddingTitle}}',
    priority: 'emergency',
    requiresAction: true
  },
  weather_alert: {
    subject: '🌦️ Weather Alert: {{weddingTitle}}',
    priority: 'high',
    includeRecommendations: true
  },
  vendor_update: {
    subject: '📋 {{vendorName}} Update - {{weddingTitle}}',
    priority: 'medium',
    showActionButton: true
  }
};
```

## 🧪 Testing

### Running Tests

```bash
# Run all notification system tests
npm test src/services/notifications

# Run performance benchmarks
npm test src/services/notifications/__tests__/PerformanceBenchmarks.test.ts

# Run wedding business logic tests
npm test src/services/notifications/__tests__/WeddingBusinessLogic.test.ts

# Run integration tests
npm test src/services/notifications/__tests__/NotificationSystem.test.ts
```

### Load Testing

```typescript
// Performance testing helper
import { generatePerformanceReport } from '@/services/notifications/__tests__/PerformanceBenchmarks.test';

// Run sustained load test
const loadTestResults = await runSustainedLoadTest({
  duration: 60000,      // 1 minute
  targetRate: 100,      // notifications per second
  priorityMix: {
    emergency: 0.05,    // 5% emergency
    high: 0.15,         // 15% high priority
    medium: 0.60,       // 60% medium priority
    low: 0.20           // 20% low priority
  }
});

const report = generatePerformanceReport(loadTestResults);
console.log('Performance Report:', JSON.stringify(report, null, 2));
```

## 📈 Monitoring & Analytics

### System Health Monitoring

```typescript
import { NotificationWorkerCoordinator } from '@/services/notifications/workers';

const coordinator = new NotificationWorkerCoordinator();

// Get real-time system health
const health = await coordinator.getSystemHealth();
console.log('System Health:', {
  overall: health.overall,          // 'healthy' | 'degraded' | 'critical' | 'down'
  redis: health.redis,              // Redis connection status
  workers: health.workers.map(w => ({
    name: w.name,
    status: w.status,
    uptime: w.uptime
  }))
});

// Get detailed metrics
const metrics = await coordinator.getSystemMetrics();
console.log('System Metrics:', {
  throughput: metrics.metrics.throughput,
  errorRate: metrics.metrics.errorRate,
  averageLatency: metrics.metrics.averageLatency,
  uptime: metrics.uptime
});
```

### Wedding-Specific Analytics

```typescript
import { NotificationAnalyticsWorker } from '@/services/notifications/workers';

const analyticsWorker = new NotificationAnalyticsWorker();

// Get wedding engagement metrics
const weddingMetrics = await analyticsWorker.getMetrics('day');
console.log('Wedding Analytics:', {
  totalSent: weddingMetrics.total_sent,
  deliveryRate: (weddingMetrics.total_delivered / weddingMetrics.total_sent * 100).toFixed(2) + '%',
  errorRate: (weddingMetrics.error_rate * 100).toFixed(2) + '%',
  averageLatency: weddingMetrics.average_latency + 'ms',
  costTotal: '$' + (weddingMetrics.cost_total / 100).toFixed(2)
});
```

## 🛠️ Troubleshooting

### Common Issues

#### High Error Rates
```bash
# Check provider health
curl http://localhost:3000/api/notifications/health

# Review error logs
tail -f logs/notification-errors.log

# Check Redis connection
redis-cli -h localhost -p 6379 ping
```

#### Slow Performance
```bash
# Monitor queue lengths
redis-cli -h localhost -p 6379 llen bull:notifications:email:wait

# Check worker status
curl http://localhost:3000/api/notifications/workers/status

# Review system metrics
curl http://localhost:3000/api/notifications/metrics
```

#### Wedding Day Issues
```bash
# Enable emergency mode (all notifications become urgent)
redis-cli -h localhost -p 6379 set emergency_mode true

# Check Saturday restrictions
curl http://localhost:3000/api/notifications/wedding-day-status

# Force manual escalation
redis-cli -h localhost -p 6379 lpush manual_intervention "wedding-123"
```

### Debug Mode

```typescript
// Enable debug logging
process.env.NOTIFICATION_DEBUG = 'true';
process.env.NOTIFICATION_LOG_LEVEL = 'debug';

// Start with verbose logging
const coordinator = await startNotificationSystem({
  debug: true,
  verboseLogging: true,
  healthCheckInterval: 10000 // More frequent health checks
});
```

## 🔒 Security & Compliance

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access to notification data
- **Audit Logging**: Complete audit trail for all notifications
- **Data Retention**: Configurable retention policies per data type

### GDPR Compliance
- **Right to Erasure**: Automated data deletion on request
- **Data Minimization**: Only required data stored
- **Consent Management**: Integrated with user preference system
- **Cross-Border**: EU data processing compliance

### Wedding Industry Specific
- **Vendor Data Protection**: Separate access controls for vendor information
- **Guest Privacy**: Enhanced protection for guest data
- **Financial Information**: Secure handling of payment-related notifications
- **Photo/Media Privacy**: Secure delivery of media notifications

## 🎯 Wedding Day Critical Path Protection

The system includes special protections for wedding day operations:

### Saturday Restrictions
- **No Deployments**: Automatic prevention of system updates on Saturdays
- **Emergency Only**: Non-critical notifications are deferred on wedding days
- **Enhanced Monitoring**: Increased system monitoring during peak wedding times

### Wedding Day Escalation
```typescript
// Automatic wedding day escalation logic
if (isWeddingDay(weddingDate)) {
  notification.priority = 'emergency';
  notification.channels = getAllChannels();
  notification.requiresManualEscalation = true;
  notification.escalationTimeout = 30000; // 30 seconds
}
```

### Failsafe Mechanisms
- **Circuit Breakers**: Prevent cascade failures during high load
- **Dead Letter Queues**: Manual review for failed critical notifications
- **Manual Override**: Emergency bypass for system failures
- **Offline Fallback**: SMS-based emergency communication when systems are down

## 📞 Support & Maintenance

### Production Support
- **24/7 Monitoring**: Automated alerts for system issues
- **Wedding Day Support**: Enhanced support during peak wedding season
- **Escalation Paths**: Clear escalation for critical issues
- **Performance Monitoring**: Real-time performance dashboards

### Maintenance Windows
- **Tuesday-Thursday**: Preferred maintenance windows
- **Never Saturdays**: No maintenance on wedding days
- **Peak Season**: Minimal changes during June-September
- **Emergency Patches**: Procedures for critical security updates

---

## 📄 License

This notification system is part of the WedSync platform and is proprietary software. All rights reserved.

For support, contact: support@wedsync.com
Documentation version: 1.0.0
Last updated: 2024-01-22