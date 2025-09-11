'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldAlertIcon,
  BotIcon,
  ZapIcon,
  EyeIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  ActivityIcon,
} from 'lucide-react';
import {
  SuspiciousPattern,
  AutomatedResponse,
  ViolationHistory,
  PatternType,
  SecuritySeverity,
  ResponseAction,
  SEVERITY_COLORS,
} from '@/types/rate-limiting';

interface AbuseDetectionMonitorProps {
  suspiciousPatterns: SuspiciousPattern[];
  automatedResponses: AutomatedResponse[];
  violationHistory: ViolationHistory[];
  onTakeAction?: (patternId: string, action: ResponseAction) => void;
  onEscalate?: (patternId: string) => void;
}

export default function AbuseDetectionMonitor({
  suspiciousPatterns,
  automatedResponses,
  violationHistory,
  onTakeAction,
  onEscalate,
}: AbuseDetectionMonitorProps) {
  const [selectedPattern, setSelectedPattern] =
    useState<SuspiciousPattern | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate detection statistics
  const highRiskPatterns = suspiciousPatterns.filter(
    (p) =>
      p.severity === SecuritySeverity.HIGH ||
      p.severity === SecuritySeverity.CRITICAL,
  );
  const recentPatterns = suspiciousPatterns.filter(
    (p) => new Date().getTime() - p.detectedAt.getTime() < 3600000, // Last hour
  );
  const activeResponses = automatedResponses.filter(
    (r) =>
      r.appliedAt &&
      (!r.duration ||
        new Date().getTime() - r.appliedAt.getTime() < r.duration * 1000),
  );

  // Wedding-specific abuse patterns
  const weddingAbusePatterns = suspiciousPatterns.filter(
    (p) =>
      p.patternType === PatternType.WEDDING_DATA_HARVESTING ||
      p.patternType === PatternType.SUPPLIER_LIST_SCRAPING,
  );

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // In real implementation, this would trigger a data refresh
      console.log('Refreshing abuse detection data...');
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSeverityColor = (severity: SecuritySeverity): string => {
    return SEVERITY_COLORS[severity];
  };

  const getSeverityIcon = (severity: SecuritySeverity) => {
    switch (severity) {
      case SecuritySeverity.LOW:
        return <EyeIcon className="w-4 h-4" />;
      case SecuritySeverity.MEDIUM:
        return <AlertCircleIcon className="w-4 h-4" />;
      case SecuritySeverity.HIGH:
        return <ShieldAlertIcon className="w-4 h-4" />;
      case SecuritySeverity.CRITICAL:
        return <BotIcon className="w-4 h-4" />;
    }
  };

  const getPatternTypeLabel = (patternType: PatternType): string => {
    return patternType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionIcon = (action: ResponseAction) => {
    switch (action) {
      case ResponseAction.SOFT_THROTTLE:
        return <ClockIcon className="w-4 h-4" />;
      case ResponseAction.HARD_THROTTLE:
        return <ZapIcon className="w-4 h-4" />;
      case ResponseAction.TEMPORARY_BLOCK:
        return <XCircleIcon className="w-4 h-4" />;
      case ResponseAction.PERMANENT_BLOCK:
        return <XCircleIcon className="w-4 h-4" />;
      case ResponseAction.REQUIRE_CAPTCHA:
        return <ShieldAlertIcon className="w-4 h-4" />;
      case ResponseAction.ESCALATE_TO_HUMAN:
        return <AlertCircleIcon className="w-4 h-4" />;
    }
  };

  const handleTakeAction = (patternId: string, action: ResponseAction) => {
    onTakeAction?.(patternId, action);
    // Close the selected pattern modal
    setSelectedPattern(null);
  };

  const calculateRiskScore = (pattern: SuspiciousPattern): number => {
    let baseScore = pattern.riskScore;

    // Increase risk for wedding-specific abuse
    if (
      pattern.patternType === PatternType.WEDDING_DATA_HARVESTING ||
      pattern.patternType === PatternType.SUPPLIER_LIST_SCRAPING
    ) {
      baseScore += 20;
    }

    // Time-based risk amplification
    const hoursAgo =
      (new Date().getTime() - pattern.detectedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 1) baseScore += 10; // Recent patterns are riskier

    return Math.min(100, baseScore);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Abuse Detection Monitor
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of suspicious patterns and automated responses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <ActivityIcon
              className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`}
            />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Alert for High Risk Patterns */}
      {highRiskPatterns.length > 0 && (
        <Alert variant="destructive">
          <ShieldAlertIcon className="h-4 w-4" />
          <AlertDescription>
            {highRiskPatterns.length} high-risk security pattern
            {highRiskPatterns.length > 1 ? 's' : ''} detected. Immediate
            attention required.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Patterns
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {suspiciousPatterns.length}
                </p>
              </div>
              <EyeIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {highRiskPatterns.length}
                </p>
              </div>
              <ShieldAlertIcon className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Responses
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {activeResponses.length}
                </p>
              </div>
              <ZapIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Wedding Abuse
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {weddingAbusePatterns.length}
                </p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="patterns" className="w-full">
        <TabsList>
          <TabsTrigger value="patterns">Suspicious Patterns</TabsTrigger>
          <TabsTrigger value="responses">Automated Responses</TabsTrigger>
          <TabsTrigger value="history">Violation History</TabsTrigger>
          <TabsTrigger value="wedding">Wedding Abuse</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Suspicious Patterns</CardTitle>
              <CardDescription>
                Patterns detected by our abuse prevention system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousPatterns
                  .sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a))
                  .map((pattern) => {
                    const riskScore = calculateRiskScore(pattern);
                    return (
                      <div
                        key={pattern.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedPattern(pattern)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-full"
                              style={{
                                backgroundColor:
                                  getSeverityColor(pattern.severity) + '20',
                              }}
                            >
                              <div
                                style={{
                                  color: getSeverityColor(pattern.severity),
                                }}
                              >
                                {getSeverityIcon(pattern.severity)}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {getPatternTypeLabel(pattern.patternType)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {pattern.requestCount} requests in{' '}
                                {pattern.timeWindow}
                              </p>
                              <p className="text-xs text-gray-500">
                                Detected: {pattern.detectedAt.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: getSeverityColor(pattern.severity),
                                color: getSeverityColor(pattern.severity),
                              }}
                            >
                              {pattern.severity}
                            </Badge>
                            <p className="text-sm font-bold mt-1">
                              Risk: {riskScore}%
                            </p>
                          </div>
                        </div>

                        {/* Pattern Indicators */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pattern.indicators
                            .slice(0, 3)
                            .map((indicator, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {indicator}
                              </Badge>
                            ))}
                          {pattern.indicators.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{pattern.indicators.length - 3} more
                            </Badge>
                          )}
                        </div>

                        {/* Automated Response Status */}
                        {pattern.automatedAction && (
                          <div className="mt-3 p-2 bg-blue-50 rounded">
                            <div className="flex items-center gap-2">
                              {getActionIcon(pattern.automatedAction.action)}
                              <span className="text-sm font-medium text-blue-800">
                                Automated Response:{' '}
                                {pattern.automatedAction.action.replace(
                                  /_/g,
                                  ' ',
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Responses</CardTitle>
              <CardDescription>
                Actions taken by the system to prevent abuse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automatedResponses.map((response) => (
                  <div key={response.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          {getActionIcon(response.action)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {response.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Applied: {response.appliedAt.toLocaleString()}
                          </p>
                          {response.duration && (
                            <p className="text-xs text-gray-500">
                              Duration: {response.duration} seconds
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            response.escalationLevel > 2
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          Level {response.escalationLevel}
                        </Badge>
                        {response.notificationSent && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600">
                              Notified
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Violation History</CardTitle>
              <CardDescription>
                Historical patterns of abuse and violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {violationHistory.map((history) => (
                  <div
                    key={`${history.userId}-${history.organizationId}`}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          User: {history.userId}
                        </p>
                        <p className="text-sm text-gray-600">
                          Organization: {history.organizationId}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last violation:{' '}
                          {history.lastViolation.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {history.totalViolations}
                        </p>
                        <p className="text-xs text-gray-600">
                          Total violations
                        </p>
                        <Badge
                          variant={
                            history.escalationLevel > 3
                              ? 'destructive'
                              : 'outline'
                          }
                          className="mt-1"
                        >
                          Level {history.escalationLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Recent: {history.recentViolations} violations
                      </p>
                      <p className="text-xs text-gray-500">
                        Avg time between:{' '}
                        {history.averageTimeBetweenViolations.toFixed(1)} hours
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wedding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Industry Abuse Patterns</CardTitle>
              <CardDescription>
                Abuse patterns specific to wedding data and suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weddingAbusePatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingUpIcon className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="font-medium text-purple-900">
                            {getPatternTypeLabel(pattern.patternType)}
                          </p>
                          <p className="text-sm text-purple-700">
                            Target: Wedding supplier data extraction
                          </p>
                          <p className="text-xs text-purple-600">
                            {pattern.requestCount} requests detected
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className="border-purple-300 text-purple-700"
                        >
                          Wedding Abuse
                        </Badge>
                        <p className="text-sm font-bold text-purple-800 mt-1">
                          Risk: {calculateRiskScore(pattern)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {weddingAbusePatterns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUpIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No wedding-specific abuse patterns detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Pattern Details</h3>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPattern(null)}
                >
                  <XCircleIcon className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-medium">
                    {getPatternTypeLabel(selectedPattern.patternType)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Risk Score: {calculateRiskScore(selectedPattern)}%
                  </p>
                </div>

                <div>
                  <p className="font-medium">Indicators:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedPattern.indicators.map((indicator, index) => (
                      <Badge key={index} variant="secondary">
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleTakeAction(
                        selectedPattern.id,
                        ResponseAction.SOFT_THROTTLE,
                      )
                    }
                  >
                    Soft Throttle
                  </Button>
                  <Button
                    onClick={() =>
                      handleTakeAction(
                        selectedPattern.id,
                        ResponseAction.HARD_THROTTLE,
                      )
                    }
                  >
                    Hard Throttle
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleTakeAction(
                        selectedPattern.id,
                        ResponseAction.TEMPORARY_BLOCK,
                      )
                    }
                  >
                    Temporary Block
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onEscalate?.(selectedPattern.id)}
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
