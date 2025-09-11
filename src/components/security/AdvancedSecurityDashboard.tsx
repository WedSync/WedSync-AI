'use client';

// WS-147 Advanced Security Dashboard for Threat Detection & Analytics
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface SecurityMetrics {
  totalThreats: number;
  blockedAttacks: number;
  suspiciousActivities: number;
  activeAlerts: number;
  avgResponseTime: string;
  riskScore: number;
}

interface UserRiskData {
  userId: string;
  email: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivity: string;
  threatCount: number;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  userId?: string;
}

interface BehaviorAnalysis {
  userId: string;
  anomalyScore: number;
  behaviorPatterns: string[];
  riskFactors: string[];
  lastAnalysis: string;
}

export default function AdvancedSecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalThreats: 0,
    blockedAttacks: 0,
    suspiciousActivities: 0,
    activeAlerts: 0,
    avgResponseTime: '0s',
    riskScore: 0,
  });

  const [userRisks, setUserRisks] = useState<UserRiskData[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<BehaviorAnalysis[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSecurityData();

    // Set up real-time updates
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Load user risk data
      const riskResponse = await fetch('/api/security/user-risks');
      if (riskResponse.ok) {
        const riskData = await riskResponse.json();
        setUserRisks(riskData);
      }

      // Load security alerts
      const alertsResponse = await fetch('/api/security/alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }

      // Load behavior analysis
      const behaviorResponse = await fetch('/api/security/behavior-analysis');
      if (behaviorResponse.ok) {
        const behaviorData = await behaviorResponse.json();
        setBehaviorAnalysis(behaviorData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading security data:', error);
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleAlertAction = async (
    alertId: string,
    action: 'acknowledge' | 'resolve',
  ) => {
    try {
      await fetch(`/api/security/alerts/${alertId}/${action}`, {
        method: 'POST',
      });

      // Update local state
      setAlerts(
        alerts.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: action === 'acknowledge' ? 'acknowledged' : 'resolved',
              }
            : alert,
        ),
      );
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-analytics">
      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Threats</p>
              <p
                className="text-2xl font-bold"
                data-testid="metric-totalThreats"
              >
                {metrics.totalThreats}
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              🛡️
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Blocked Attacks</p>
              <p
                className="text-2xl font-bold text-green-600"
                data-testid="metric-blockedAttacks"
              >
                {metrics.blockedAttacks}
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              ✅
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Suspicious Activities
              </p>
              <p
                className="text-2xl font-bold text-yellow-600"
                data-testid="metric-suspiciousActivities"
              >
                {metrics.suspiciousActivities}
              </p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              ⚠️
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p
                className="text-2xl font-bold text-red-600"
                data-testid="metric-activeAlerts"
              >
                {metrics.activeAlerts}
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              🚨
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p
                className="text-2xl font-bold"
                data-testid="metric-avgResponseTime"
              >
                {metrics.avgResponseTime}
              </p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              ⚡
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="behavior">Behavior Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Threat Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Brute Force Attempts</span>
                  <Badge variant="destructive">45%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Suspicious Login Patterns</span>
                  <Badge variant="default">30%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Geographic Anomalies</span>
                  <Badge variant="secondary">15%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Device Anomalies</span>
                  <Badge variant="outline">10%</Badge>
                </div>
              </div>
            </Card>

            {/* Security Trends */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Security Trends (7 days)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Threats Detected</span>
                  <span className="text-sm text-green-600">↓ 12%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Response Time</span>
                  <span className="text-sm text-green-600">↓ 25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>False Positives</span>
                  <span className="text-sm text-green-600">↓ 8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>User Risk Scores</span>
                  <span className="text-sm text-yellow-600">→ 0%</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">User Risk Analysis</h3>
            <div className="space-y-4">
              {userRisks.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid="user-risk-score"
                  data-user-id={user.userId}
                  data-risk-level={user.riskLevel}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-3 w-3 rounded-full ${getRiskLevelColor(user.riskLevel)}`}
                    />
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Last activity:{' '}
                        {new Date(user.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold">{user.riskScore}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {user.riskLevel} Risk
                      </p>
                    </div>
                    {user.riskLevel === 'high' ||
                    user.riskLevel === 'critical' ? (
                      <Button variant="outline" size="sm">
                        Investigate
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Alerts</h3>
            <div className="space-y-4" data-testid="security-alerts-list">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid="security-alert"
                >
                  <div className="flex items-start space-x-3">
                    <Badge variant={getSeverityColor(alert.severity) as any}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mb-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        alert.status === 'active' ? 'destructive' : 'outline'
                      }
                    >
                      {alert.status}
                    </Badge>
                    {alert.status === 'active' && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleAlertAction(alert.id, 'acknowledge')
                          }
                        >
                          Acknowledge
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAlertAction(alert.id, 'resolve')}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">ML Behavior Analysis</h3>
            <div className="space-y-4">
              {behaviorAnalysis.map((analysis) => (
                <div
                  key={analysis.userId}
                  className="p-4 border rounded-lg"
                  data-testid="behavior-analysis"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">User: {analysis.userId}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Anomaly Score:</span>
                      <Badge
                        variant={
                          analysis.anomalyScore > 0.7
                            ? 'destructive'
                            : analysis.anomalyScore > 0.4
                              ? 'default'
                              : 'outline'
                        }
                      >
                        {Math.round(analysis.anomalyScore * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Behavior Patterns:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.behaviorPatterns.map((pattern, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Risk Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.riskFactors.map((factor, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Last Analysis:{' '}
                    {new Date(analysis.lastAnalysis).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
