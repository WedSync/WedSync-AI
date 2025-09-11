'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  MapPin,
  TrendingUp,
  Settings,
  Eye,
  Download,
  Plus,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ComplianceJurisdiction,
  WeddingJurisdictionCompliance,
  CrossBorderDataTransfer,
  ComplianceMonitoringMetrics,
  ComplianceAction,
} from '@/lib/types/multi-jurisdiction-compliance';

interface MultiJurisdictionComplianceDashboardProps {
  organizationId: string;
  onAssessWedding?: () => void;
  onTrackTransfer?: () => void;
  onViewCompliance?: (weddingId: string) => void;
}

export default function MultiJurisdictionComplianceDashboard({
  organizationId,
  onAssessWedding,
  onTrackTransfer,
  onViewCompliance,
}: MultiJurisdictionComplianceDashboardProps) {
  const [metrics, setMetrics] = useState<ComplianceMonitoringMetrics | null>(
    null,
  );
  const [jurisdictions, setJurisdictions] = useState<ComplianceJurisdiction[]>(
    [],
  );
  const [weddingCompliances, setWeddingCompliances] = useState<
    WeddingJurisdictionCompliance[]
  >([]);
  const [crossBorderTransfers, setCrossBorderTransfers] = useState<
    CrossBorderDataTransfer[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, [organizationId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load compliance metrics
      const metricsResponse = await fetch(
        '/api/security/multi-jurisdiction-compliance',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_compliance_metrics',
            organizationId,
          }),
        },
      );

      if (!metricsResponse.ok) {
        throw new Error('Failed to load compliance metrics');
      }

      const metricsData = await metricsResponse.json();
      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      // Load jurisdictions
      const jurisdictionsResponse = await fetch(
        `/api/security/multi-jurisdiction-compliance?action=list_jurisdictions`,
      );

      if (jurisdictionsResponse.ok) {
        const jurisdictionsData = await jurisdictionsResponse.json();
        if (jurisdictionsData.success) {
          setJurisdictions(jurisdictionsData.data);
        }
      }

      // Load cross-border transfers
      const transfersResponse = await fetch(
        `/api/security/multi-jurisdiction-compliance?action=get_cross_border_transfers&organizationId=${organizationId}`,
      );

      if (transfersResponse.ok) {
        const transfersData = await transfersResponse.json();
        if (transfersData.success) {
          setCrossBorderTransfers(transfersData.data);
        }
      }
    } catch (err) {
      console.error('[MultiJurisdictionDashboard] Failed to load data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load compliance data',
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplianceScore = () => {
    if (!metrics) return 0;
    return metrics.complianceScore;
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredTransfers = crossBorderTransfers.filter((transfer) => {
    if (filterRisk === 'all') return true;
    return transfer.transferRiskLevel === filterRisk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error loading compliance data</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <Button
            onClick={loadDashboardData}
            variant="outline"
            className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            Multi-Jurisdiction Compliance
          </h2>
          <p className="text-gray-600 mt-1">
            Manage international wedding data compliance across multiple
            jurisdictions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAssessWedding} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Assess Wedding
          </Button>
          <Button onClick={onTrackTransfer} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Track Transfer
          </Button>
        </div>
      </div>

      {/* Compliance Score Overview */}
      {metrics && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Overall Compliance Score
                </CardTitle>
                <CardDescription>
                  Current compliance across all jurisdictions
                </CardDescription>
              </div>
              <div
                className={`text-3xl font-bold ${getComplianceScoreColor(getComplianceScore())}`}
              >
                {getComplianceScore()}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={getComplianceScore()} className="mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {metrics.totalWeddings}
                </div>
                <div className="text-gray-600">Total Weddings</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {metrics.internationalWeddings}
                </div>
                <div className="text-gray-600">International</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">
                  {metrics.jurisdictionsCovered}
                </div>
                <div className="text-gray-600">Jurisdictions</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {metrics.recentAudits}
                </div>
                <div className="text-gray-600">Recent Audits</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="transfers">Data Transfers</TabsTrigger>
          <TabsTrigger value="compliance">Wedding Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Risk Distribution */}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Low Risk</span>
                    <Badge className={getRiskBadgeColor('low')}>
                      {metrics.riskDistribution.low}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Medium Risk</span>
                    <Badge className={getRiskBadgeColor('medium')}>
                      {metrics.riskDistribution.medium}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">High Risk</span>
                    <Badge className={getRiskBadgeColor('high')}>
                      {metrics.riskDistribution.high}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Critical Risk</span>
                    <Badge className={getRiskBadgeColor('critical')}>
                      {metrics.riskDistribution.critical}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Compliance Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Compliance Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Actions</span>
                  <Badge variant="secondary">
                    {metrics?.pendingActions || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overdue</span>
                  <Badge className="bg-red-100 text-red-800">
                    {metrics?.overdueDates || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Compliance</span>
                  <Badge className="bg-green-100 text-green-800">
                    {metrics?.activeCompliance || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {crossBorderTransfers.slice(0, 3).map((transfer) => (
                    <div
                      key={transfer.id}
                      className="flex justify-between items-center py-1"
                    >
                      <span className="text-gray-600">
                        {transfer.dataCategory.replace('_', ' ')} transfer
                      </span>
                      <span className="text-xs text-gray-500">
                        {transfer.sourceCountry} → {transfer.destinationCountry}
                      </span>
                    </div>
                  ))}
                  {crossBorderTransfers.length === 0 && (
                    <p className="text-gray-500 italic">No recent transfers</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Jurisdictions Tab */}
        <TabsContent value="jurisdictions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jurisdictions.map((jurisdiction) => (
              <Card key={jurisdiction.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {jurisdiction.countryName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {jurisdiction.countryCode}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {jurisdiction.dataProtectionFramework}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Authority:</span>
                      <span
                        className="font-medium text-right max-w-32 truncate"
                        title={jurisdiction.authorityName}
                      >
                        {jurisdiction.authorityName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Notification Deadline:
                      </span>
                      <span className="font-medium">
                        {jurisdiction.breachNotificationDeadlineHours}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Primary Language:</span>
                      <span className="font-medium uppercase">
                        {jurisdiction.primaryLanguage}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Transfers Tab */}
        <TabsContent value="transfers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Cross-Border Data Transfers
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {transfer.dataCategory.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-medium">
                          {transfer.sourceCountry} →{' '}
                          {transfer.destinationCountry}
                        </span>
                        <Badge
                          className={getRiskBadgeColor(
                            transfer.transferRiskLevel,
                          )}
                        >
                          {transfer.transferRiskLevel} risk
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          Transfer Mechanism:{' '}
                          {transfer.transferMechanism.replace('_', ' ')}
                        </div>
                        <div>
                          Affected Subjects:{' '}
                          {transfer.affectedDataSubjectsCount}
                        </div>
                        <div>Legal Basis: {transfer.legalBasis}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {new Date(transfer.transferDate).toLocaleDateString()}
                      </div>
                      <Button variant="ghost" size="sm" className="mt-1">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTransfers.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-8 pb-8 text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No cross-border transfers found
                  </p>
                  <p className="text-sm text-gray-500">
                    {filterRisk !== 'all'
                      ? 'Try adjusting the filter'
                      : 'Track your first international data transfer'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Wedding Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Wedding Compliance Records
            </h3>
            <Button onClick={onAssessWedding} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assess New Wedding
            </Button>
          </div>

          <div className="space-y-4">
            {weddingCompliances.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-8 pb-8 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No wedding compliance assessments yet
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Start by assessing the compliance requirements for an
                    international wedding
                  </p>
                  <Button onClick={onAssessWedding} variant="outline">
                    Create First Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
