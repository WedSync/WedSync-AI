'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  Activity,
  BarChart3,
  PieChart,
  Lock,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface ComplianceMetrics {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  complianceScore: number;
  dataBreaches: number;
  consentRate: number;
  activeUsers: number;
}

interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  completed_at?: string;
  deadline_at: string;
  user_email?: string;
}

interface AuditEvent {
  id: string;
  event_type: string;
  user_id: string;
  created_at: string;
  ip_address: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  event_data: any;
}

export default function ComplianceReportingDashboard() {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    averageResponseTime: 0,
    complianceScore: 0,
    dataBreaches: 0,
    consentRate: 0,
    activeUsers: 0,
  });
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      // Load privacy requests
      const { data: requestData } = await supabase
        .from('privacy_requests')
        .select(
          `
          *,
          user_profiles!privacy_requests_user_id_fkey (email)
        `,
        )
        .order('requested_at', { ascending: false })
        .limit(50);

      if (requestData) {
        setRequests(
          requestData.map((r) => ({
            ...r,
            user_email: r.user_profiles?.email,
          })),
        );

        // Calculate metrics
        const pending = requestData.filter(
          (r) => r.status === 'pending',
        ).length;
        const completed = requestData.filter(
          (r) => r.status === 'completed',
        ).length;

        // Calculate average response time for completed requests
        const completedWithTime = requestData.filter((r) => r.completed_at);
        const avgTime =
          completedWithTime.length > 0
            ? completedWithTime.reduce((acc, r) => {
                const requested = new Date(r.requested_at).getTime();
                const completed = new Date(r.completed_at).getTime();
                return acc + (completed - requested) / (1000 * 60 * 60 * 24); // Days
              }, 0) / completedWithTime.length
            : 0;

        setMetrics((prev) => ({
          ...prev,
          totalRequests: requestData.length,
          pendingRequests: pending,
          completedRequests: completed,
          averageResponseTime: Math.round(avgTime * 10) / 10,
        }));
      }

      // Load audit events
      const { data: auditData } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditData) {
        setAuditEvents(auditData);
      }

      // Load consent metrics
      const { data: consentData } = await supabase
        .from('consent_records')
        .select('consent_type, is_granted');

      if (consentData) {
        const granted = consentData.filter((c) => c.is_granted).length;
        const rate =
          consentData.length > 0 ? (granted / consentData.length) * 100 : 0;
        setMetrics((prev) => ({ ...prev, consentRate: Math.round(rate) }));
      }

      // Load data breach incidents
      const { data: breachData } = await supabase
        .from('data_breach_incidents')
        .select('id')
        .eq('status', 'open');

      setMetrics((prev) => ({
        ...prev,
        dataBreaches: breachData?.length || 0,
        complianceScore: calculateComplianceScore(prev),
      }));
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateComplianceScore = (metrics: ComplianceMetrics): number => {
    let score = 100;

    // Deduct points for pending requests over 20 days old
    if (metrics.pendingRequests > 0) score -= 10;

    // Deduct points for slow response time
    if (metrics.averageResponseTime > 20) score -= 15;
    if (metrics.averageResponseTime > 25) score -= 10;

    // Deduct points for data breaches
    score -= metrics.dataBreaches * 20;

    // Deduct points for low consent rate
    if (metrics.consentRate < 50) score -= 10;

    return Math.max(0, Math.min(100, score));
  };

  const exportComplianceReport = async () => {
    try {
      const report = {
        generated_at: new Date().toISOString(),
        metrics,
        recent_requests: requests.slice(0, 20),
        high_risk_events: auditEvents.filter(
          (e) => e.risk_level === 'high' || e.risk_level === 'critical',
        ),
        compliance_status:
          metrics.complianceScore >= 80 ? 'COMPLIANT' : 'NEEDS_ATTENTION',
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 90)
      return {
        label: 'Excellent',
        color: 'text-green-600',
        bg: 'bg-green-100',
      };
    if (score >= 75)
      return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60)
      return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return {
      label: 'Needs Attention',
      color: 'text-red-600',
      bg: 'bg-red-100',
    };
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      low: 'outline',
      medium: 'secondary',
      high: 'default',
      critical: 'destructive',
    };
    return <Badge variant={variants[level] || 'default'}>{level}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const complianceStatus = getComplianceStatus(metrics.complianceScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground">
            GDPR/CCPA compliance monitoring and reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadComplianceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportComplianceReport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Compliance Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Compliance Score</CardTitle>
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl font-bold">{metrics.complianceScore}%</div>
            <div className={`px-3 py-1 rounded-full ${complianceStatus.bg}`}>
              <span className={`font-medium ${complianceStatus.color}`}>
                {complianceStatus.label}
              </span>
            </div>
          </div>
          <Progress value={metrics.complianceScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingRequests} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageResponseTime} days
            </div>
            <p className="text-xs text-muted-foreground">Target: &lt;30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consent Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.consentRate}%</div>
            <p className="text-xs text-muted-foreground">
              Users with active consent
            </p>
          </CardContent>
        </Card>

        <Card className={metrics.dataBreaches > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dataBreaches}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.dataBreaches > 0
                ? 'Requires immediate attention'
                : 'No active incidents'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Privacy Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="breaches">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Recent Privacy Requests</CardTitle>
              <CardDescription>
                Monitor and manage data subject requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.slice(0, 10).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.user_email || 'Anonymous'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {request.request_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'completed'
                              ? 'outline'
                              : 'default'
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.requested_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.deadline_at), 'MMM d, yyyy')}
                        {new Date(request.deadline_at) < new Date() &&
                          request.status !== 'completed' && (
                            <AlertCircle className="h-4 w-4 text-red-500 inline ml-2" />
                          )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                High-risk events and compliance violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents
                    .filter(
                      (e) =>
                        e.risk_level === 'high' || e.risk_level === 'critical',
                    )
                    .slice(0, 10)
                    .map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.event_type}
                        </TableCell>
                        <TableCell>{getRiskBadge(event.risk_level)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{event.ip_address}</TableCell>
                        <TableCell>
                          {format(new Date(event.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <CardTitle>Data Breach Incidents</CardTitle>
              <CardDescription>
                Monitor and respond to security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.dataBreaches === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No Active Incidents</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All systems operating normally with no detected breaches
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {metrics.dataBreaches} active incident(s) require
                      immediate attention. GDPR requires notification within 72
                      hours of detection.
                    </AlertDescription>
                  </Alert>
                  {/* Incident details would go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
