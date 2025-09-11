import { NextRequest } from 'next/server';

// WS-258 Real-Time Performance Monitoring WebSocket API
// Provides live performance data with <100ms latency for wedding industry requirements

interface WeddingContext {
  isWeddingDay: boolean;
  hoursUntilWedding: number;
  criticalPeriod: boolean;
  clientName?: string;
  weddingType: 'photographer' | 'venue' | 'planner' | 'vendor';
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  category: 'backup' | 'network' | 'ui' | 'system';
}

interface PerformanceAlert {
  id: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  weddingImpact: string;
  recommendedAction: string;
}

// Global WebSocket connections store (in production, use Redis or similar)
const connections = new Map<string, WebSocket>();
const weddingContexts = new Map<string, WeddingContext>();

// Wedding-specific performance thresholds (stricter during critical periods)
const WEDDING_THRESHOLDS = {
  backup_sync_latency: { normal: 100, critical: 50 }, // ms
  dashboard_load_time: { normal: 800, critical: 400 }, // ms
  emergency_response: { normal: 200, critical: 100 }, // ms
  touch_response: { normal: 16, critical: 8 }, // ms (60fps/120fps)
  network_latency: { normal: 200, critical: 100 }, // ms
  api_response: { normal: 500, critical: 200 }, // ms
  memory_usage: { normal: 75, critical: 60 }, // %
  cpu_usage: { normal: 70, critical: 50 }, // %
  battery_level: { normal: 30, critical: 50 }, // %
};

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');

  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  try {
    // In a real implementation, we'd use a WebSocket library like ws
    // For Next.js, we'll simulate the WebSocket response
    return new Response(null, {
      status: 101,
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Accept': 'mock-accept-key',
      },
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Simulated real-time performance data generator
// In production, this would collect actual system metrics
function generatePerformanceMetrics(
  weddingContext?: WeddingContext,
): PerformanceMetric[] {
  const now = Date.now();
  const isWeddingDay = weddingContext?.isWeddingDay || false;
  const criticalPeriod = weddingContext?.criticalPeriod || false;

  // Simulate performance variations based on wedding context
  const baseVariation = isWeddingDay ? 1.2 : 1.0; // 20% higher load on wedding days
  const criticalVariation = criticalPeriod ? 1.5 : 1.0; // 50% higher during critical periods

  return [
    // Backup performance metrics (WS-258 core requirements)
    {
      id: 'backup_sync_latency',
      name: 'backup_sync_latency',
      value: Math.random() * 80 * baseVariation * criticalVariation + 20, // 20-100ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.backup_sync_latency.critical
        : WEDDING_THRESHOLDS.backup_sync_latency.normal,
      category: 'backup',
    },
    {
      id: 'dashboard_load_time',
      name: 'dashboard_load_time',
      value: Math.random() * 600 * baseVariation + 200, // 200-800ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.dashboard_load_time.critical
        : WEDDING_THRESHOLDS.dashboard_load_time.normal,
      category: 'ui',
    },
    {
      id: 'emergency_response',
      name: 'emergency_response',
      value: Math.random() * 150 * baseVariation + 50, // 50-200ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.emergency_response.critical
        : WEDDING_THRESHOLDS.emergency_response.normal,
      category: 'backup',
    },

    // Mobile performance metrics
    {
      id: 'touch_response',
      name: 'touch_response',
      value: Math.random() * 20 * baseVariation + 5, // 5-25ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.touch_response.critical
        : WEDDING_THRESHOLDS.touch_response.normal,
      category: 'ui',
    },
    {
      id: 'offline_cache_lookup',
      name: 'offline_cache_lookup',
      value: Math.random() * 40 * baseVariation + 10, // 10-50ms range
      unit: 'ms',
      threshold: 50,
      category: 'backup',
    },

    // Network performance
    {
      id: 'network_latency',
      name: 'network_latency',
      value: Math.random() * 300 * baseVariation + 50, // 50-350ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.network_latency.critical
        : WEDDING_THRESHOLDS.network_latency.normal,
      category: 'network',
    },
    {
      id: 'api_response',
      name: 'api_response',
      value: Math.random() * 400 * baseVariation + 100, // 100-500ms range
      unit: 'ms',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.api_response.critical
        : WEDDING_THRESHOLDS.api_response.normal,
      category: 'network',
    },

    // System performance
    {
      id: 'memory_usage',
      name: 'memory_usage',
      value: Math.random() * 30 + 45 + (baseVariation - 1) * 20, // 45-75% range, higher on wedding days
      unit: '%',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.memory_usage.critical
        : WEDDING_THRESHOLDS.memory_usage.normal,
      category: 'system',
    },
    {
      id: 'cpu_usage',
      name: 'cpu_usage',
      value: Math.random() * 40 + 30 + (baseVariation - 1) * 25, // 30-70% range, higher on wedding days
      unit: '%',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.cpu_usage.critical
        : WEDDING_THRESHOLDS.cpu_usage.normal,
      category: 'system',
    },
    {
      id: 'battery_level',
      name: 'battery_level',
      value: Math.max(10, 100 - Math.random() * 60), // 40-100% range
      unit: '%',
      threshold: criticalPeriod
        ? WEDDING_THRESHOLDS.battery_level.critical
        : WEDDING_THRESHOLDS.battery_level.normal,
      category: 'system',
    },
  ];
}

// Generate performance alerts based on metrics
function generateAlerts(
  metrics: PerformanceMetric[],
  weddingContext?: WeddingContext,
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];

  metrics.forEach((metric) => {
    const threshold = metric.threshold;
    const severity = getSeverity(metric.value, threshold, metric.name);

    if (severity !== 'normal') {
      alerts.push({
        id: `alert_${metric.id}_${Date.now()}`,
        metric: metric.name.replace('_', ' ').toUpperCase(),
        severity,
        message: generateAlertMessage(metric, severity),
        weddingImpact: getWeddingImpact(metric.name, severity, weddingContext),
        recommendedAction: getRecommendedAction(metric.name, severity),
      });
    }
  });

  return alerts;
}

// Determine alert severity based on metric value and threshold
function getSeverity(
  value: number,
  threshold: number,
  metricName: string,
): 'normal' | 'low' | 'medium' | 'high' | 'critical' {
  // For percentage metrics (memory, CPU, battery), higher values are worse (except battery)
  if (metricName.includes('usage')) {
    if (value > threshold * 1.3) return 'critical';
    if (value > threshold * 1.2) return 'high';
    if (value > threshold * 1.1) return 'medium';
    if (value > threshold) return 'low';
    return 'normal';
  }

  // For battery, lower values are worse
  if (metricName.includes('battery')) {
    if (value < threshold * 0.5) return 'critical';
    if (value < threshold * 0.7) return 'high';
    if (value < threshold * 0.85) return 'medium';
    if (value < threshold) return 'low';
    return 'normal';
  }

  // For latency metrics, higher values are worse
  if (value > threshold * 2) return 'critical';
  if (value > threshold * 1.5) return 'high';
  if (value > threshold * 1.2) return 'medium';
  if (value > threshold) return 'low';
  return 'normal';
}

// Generate human-readable alert messages
function generateAlertMessage(
  metric: PerformanceMetric,
  severity: string,
): string {
  const metricName = metric.name.replace('_', ' ');
  const messages = {
    critical: [
      `Critical: ${metricName} at ${metric.value.toFixed(1)}${metric.unit} - immediate action required`,
      `System failure risk: ${metricName} exceeded critical threshold`,
      `Emergency: ${metricName} performance severely degraded`,
    ],
    high: [
      `High priority: ${metricName} performance degraded to ${metric.value.toFixed(1)}${metric.unit}`,
      `Warning: ${metricName} approaching critical levels`,
      `Performance issue: ${metricName} requires attention`,
    ],
    medium: [
      `Moderate: ${metricName} performance at ${metric.value.toFixed(1)}${metric.unit}`,
      `Advisory: ${metricName} above normal thresholds`,
      `Monitor: ${metricName} showing elevated values`,
    ],
    low: [
      `Notice: ${metricName} slightly elevated at ${metric.value.toFixed(1)}${metric.unit}`,
      `FYI: ${metricName} above optimal range`,
      `Info: ${metricName} performance dip detected`,
    ],
  };

  const messageList = messages[severity as keyof typeof messages];
  return messageList[Math.floor(Math.random() * messageList.length)];
}

// Determine wedding-specific impact
function getWeddingImpact(
  metricName: string,
  severity: string,
  weddingContext?: WeddingContext,
): string {
  const weddingType = weddingContext?.weddingType || 'vendor';

  const impacts = {
    backup_sync_latency: {
      photographer: 'Photo backup delays may cause data loss during shoots',
      venue: 'Guest list sync issues may affect check-in process',
      planner: 'Timeline updates may not sync across vendor team',
      vendor: 'Critical data backup delays detected',
    },
    dashboard_load_time: {
      photographer: 'Slow client dashboard affects timeline management',
      venue: 'Delayed venue dashboard impacts day-of coordination',
      planner: 'Planning dashboard delays affect vendor oversight',
      vendor: 'Vendor dashboard performance impacts client service',
    },
    emergency_response: {
      photographer: 'Emergency backup restore time increased',
      venue: 'Venue emergency response system delayed',
      planner: 'Emergency coordination tools responding slowly',
      vendor: 'Emergency system performance degraded',
    },
    touch_response: {
      photographer: 'Camera controls and form inputs feel laggy',
      venue: 'Check-in kiosks and tablets responding slowly',
      planner: 'Mobile coordination tools have touch delays',
      vendor: 'Mobile interface performance impacting workflow',
    },
    network_latency: {
      photographer: 'Photo uploads and client communication delayed',
      venue: 'Guest management sync issues likely',
      planner: 'Real-time vendor coordination affected',
      vendor: 'Cloud sync and communication delays expected',
    },
  };

  const metricImpacts = impacts[metricName as keyof typeof impacts];
  if (!metricImpacts) {
    return severity === 'critical'
      ? 'May affect wedding day operations'
      : 'Minor impact on wedding operations';
  }

  return metricImpacts[weddingType];
}

// Get recommended actions
function getRecommendedAction(metricName: string, severity: string): string {
  const actions = {
    backup_sync_latency: {
      critical: 'Switch to emergency backup mode, contact DevOps immediately',
      high: 'Clear backup queue, restart sync service',
      medium: 'Monitor closely, consider cache clearing',
      low: 'Continue monitoring, check network stability',
    },
    dashboard_load_time: {
      critical: 'Enable emergency mode dashboard, contact technical support',
      high: 'Clear browser cache, check network connection',
      medium: 'Refresh dashboard, monitor performance',
      low: 'Normal operation, continue monitoring',
    },
    emergency_response: {
      critical: 'Test manual backup procedures, alert technical team',
      high: 'Verify emergency protocols, check system resources',
      medium: 'Review emergency procedures, monitor closely',
      low: 'Continue normal operations, keep monitoring',
    },
    touch_response: {
      critical: 'Restart app, switch to high-performance mode',
      high: 'Close other apps, clear memory cache',
      medium: 'Reduce multitasking, monitor responsiveness',
      low: 'Normal operation, background optimization ongoing',
    },
    network_latency: {
      critical: 'Switch to offline mode, check internet connection',
      high: 'Move closer to WiFi, use mobile data backup',
      medium: 'Monitor connection, avoid large uploads',
      low: 'Normal operation, connection stable',
    },
  };

  const metricActions = actions[metricName as keyof typeof actions];
  if (!metricActions) {
    return severity === 'critical'
      ? 'Contact technical support immediately'
      : 'Monitor and investigate if persists';
  }

  return metricActions[severity as keyof typeof metricActions];
}

// POST endpoint to handle wedding context updates
export async function POST(request: NextRequest) {
  try {
    const { weddingContext, connectionId } = await request.json();

    if (connectionId && weddingContext) {
      weddingContexts.set(connectionId, weddingContext);
    }

    return Response.json({
      success: true,
      message: 'Wedding context updated',
    });
  } catch (error) {
    console.error('Error updating wedding context:', error);
    return Response.json(
      { success: false, error: 'Failed to update context' },
      { status: 500 },
    );
  }
}

// Mock WebSocket message broadcaster
// In production, this would be handled by the WebSocket server
export function broadcastPerformanceData() {
  // This would typically run on a separate service or worker
  setInterval(() => {
    connections.forEach((ws, connectionId) => {
      const weddingContext = weddingContexts.get(connectionId);
      const metrics = generatePerformanceMetrics(weddingContext);
      const alerts = generateAlerts(metrics, weddingContext);

      // Send performance metrics
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'PERFORMANCE_METRICS',
            payload: metrics,
            timestamp: new Date().toISOString(),
          }),
        );

        // Send alerts if any
        alerts.forEach((alert) => {
          ws.send(
            JSON.stringify({
              type: 'PERFORMANCE_ALERT',
              payload: alert,
              timestamp: new Date().toISOString(),
            }),
          );
        });

        // Send wedding day critical alerts if needed
        if (weddingContext?.criticalPeriod) {
          const criticalAlerts = alerts.filter(
            (a) => a.severity === 'critical',
          );
          if (criticalAlerts.length > 0) {
            ws.send(
              JSON.stringify({
                type: 'WEDDING_DAY_CRITICAL',
                payload: {
                  message: `${criticalAlerts.length} critical performance issues detected during wedding critical period`,
                  alerts: criticalAlerts,
                },
                timestamp: new Date().toISOString(),
              }),
            );
          }
        }
      }
    });
  }, 1000); // Send updates every second for real-time monitoring
}

/* 
Usage Example:

WebSocket connection from client:
```javascript
const ws = new WebSocket('ws://localhost:3000/api/performance/realtime')

ws.onopen = () => {
  // Send wedding context
  ws.send(JSON.stringify({
    type: 'WEDDING_CONTEXT',
    data: {
      isWeddingDay: true,
      hoursUntilWedding: 2,
      criticalPeriod: true,
      clientName: 'Smith Wedding',
      weddingType: 'photographer'
    }
  }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  switch (message.type) {
    case 'PERFORMANCE_METRICS':
      updateMetricsDisplay(message.payload)
      break
      
    case 'PERFORMANCE_ALERT':
      showAlert(message.payload)
      triggerHapticFeedback(message.payload.severity)
      break
      
    case 'WEDDING_DAY_CRITICAL':
      handleCriticalWeddingAlert(message.payload)
      break
  }
}
```
*/
