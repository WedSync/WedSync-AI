'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react';

interface AlertsOverviewProps {
  viewMode?: 'summary' | 'detailed';
}

const alerts = [
  {
    id: 1,
    type: 'warning',
    title: 'High Memory Usage',
    description: 'Database query cache at 72.8% utilization',
    timestamp: '2 hours ago',
    status: 'active',
  },
  {
    id: 2,
    type: 'info',
    title: 'Auto-scaling Event',
    description: 'Scaled up to 18 instances due to increased load',
    timestamp: '4 hours ago',
    status: 'resolved',
  },
  {
    id: 3,
    type: 'success',
    title: 'Performance Target Met',
    description: 'Channel switching time below 200ms target',
    timestamp: '6 hours ago',
    status: 'resolved',
  },
];

export function AlertsOverview({ viewMode = 'detailed' }: AlertsOverviewProps) {
  if (viewMode === 'summary') {
    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Active Alerts</span>
            <Badge variant="outline">1</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Resolved Today</span>
            <Badge variant="secondary">12</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">System Status</span>
            <Badge variant="default">Healthy</Badge>
          </div>
        </div>

        <div className="space-y-2">
          {alerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-2">
                {alert.type === 'warning' && (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
                {alert.type === 'success' && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                {alert.type === 'info' && (
                  <Bell className="h-3 w-3 text-blue-500" />
                )}
                <span className="text-xs">{alert.title}</span>
              </div>
              <Badge
                variant={
                  alert.status === 'active' ? 'destructive' : 'secondary'
                }
                className="text-xs"
              >
                {alert.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Warning level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Auto-resolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2m</div>
            <p className="text-xs text-green-600">Average resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Bell className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Healthy</div>
            <Badge className="mt-2" variant="default">
              All Systems Operational
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            System alerts and performance notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {alert.type === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {alert.type === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {alert.type === 'info' && (
                      <Bell className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.timestamp}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    alert.status === 'active' ? 'destructive' : 'secondary'
                  }
                  className="ml-2"
                >
                  {alert.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wedding Day Alert Protocol</CardTitle>
          <CardDescription>
            Special alerting configuration for wedding day operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Critical Alert Response</span>
              <Badge variant="default">&lt;30 seconds</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Wedding Day Priority</span>
              <Badge variant="destructive">Maximum</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Automatic Escalation</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Performance Thresholds</span>
              <Badge variant="secondary">Optimized</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
