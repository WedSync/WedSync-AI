'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  EyeSlashIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ClockIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface SecurityMonitoringProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface SecurityThreat {
  id: string;
  timestamp: Date;
  type:
    | 'authentication'
    | 'authorization'
    | 'data_breach'
    | 'suspicious_activity'
    | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  affectedUsers?: number;
  weddingDataImpact?: string;
  mitigationStatus: 'unresolved' | 'investigating' | 'mitigated' | 'resolved';
  assignee?: string;
}

interface SecurityMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold: number;
  description: string;
  weddingContext: string;
}

interface ComplianceCheck {
  framework: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  lastAudit: Date;
  issues: number;
  criticalFindings: number;
  weddingSpecificRequirements: string[];
}

export function SecurityMonitoring({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: SecurityMonitoringProps) {
  const [securityThreats, setSecurityThreats] = useState<SecurityThreat[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetric[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceCheck[]>(
    [],
  );
  const [selectedThreatType, setSelectedThreatType] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');

  useEffect(() => {
    fetchSecurityData();
  }, [lastRefresh, selectedThreatType, selectedTimeframe]);

  const fetchSecurityData = async () => {
    // Mock security data - In production, integrate with security monitoring tools
    const mockThreats: SecurityThreat[] = [
      {
        id: 'sec_001',
        timestamp: new Date(Date.now() - 10 * 60000), // 10 minutes ago
        type: 'suspicious_activity',
        severity: 'high',
        title: 'Multiple failed login attempts from same IP',
        description:
          '15 failed login attempts detected from IP 192.168.1.100 targeting wedding supplier accounts',
        source: 'Auth Monitor',
        affectedUsers: 3,
        weddingDataImpact:
          'Attempted access to supplier portfolios and booking calendars',
        mitigationStatus: 'investigating',
        assignee: 'security@wedsync.com',
      },
      {
        id: 'sec_002',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        type: 'data_breach',
        severity: 'critical',
        title: 'Unauthorized database access attempt',
        description:
          'Suspicious SQL queries detected targeting wedding_bookings table',
        source: 'Database Monitor',
        affectedUsers: 0,
        weddingDataImpact:
          'Potential exposure of couple contact details and wedding dates',
        mitigationStatus: 'mitigated',
        assignee: 'security@wedsync.com',
      },
      {
        id: 'sec_003',
        timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
        type: 'compliance',
        severity: 'medium',
        title: 'GDPR data retention policy violation',
        description: 'Old wedding data found exceeding 5-year retention period',
        source: 'Compliance Scanner',
        affectedUsers: 47,
        weddingDataImpact:
          'Historical wedding records and couple data past retention limits',
        mitigationStatus: 'investigating',
      },
    ];

    const mockMetrics: SecurityMetric[] = [
      {
        name: 'Failed Login Attempts',
        value: 23,
        unit: '/hour',
        status: 'warning',
        threshold: 50,
        description: 'Brute force attack indicators',
        weddingContext: 'Targeting wedding supplier and couple accounts',
      },
      {
        name: 'Data Encryption Coverage',
        value: 98.7,
        unit: '%',
        status: 'good',
        threshold: 95,
        description: 'Wedding data encryption compliance',
        weddingContext:
          'Couple personal info, payment details, venue contracts',
      },
      {
        name: 'Session Security Score',
        value: 94.2,
        unit: '/100',
        status: 'good',
        threshold: 85,
        description: 'User session protection strength',
        weddingContext: 'Wedding planning sessions and booking processes',
      },
      {
        name: 'API Rate Limit Violations',
        value: 12,
        unit: '/hour',
        status: 'warning',
        threshold: 25,
        description: 'Suspicious API usage patterns',
        weddingContext: 'Automated scraping of wedding venue data',
      },
      {
        name: 'SSL/TLS Grade',
        value: 95,
        unit: '/100',
        status: 'good',
        threshold: 80,
        description: 'Transport security quality',
        weddingContext: 'Secure transmission of sensitive wedding data',
      },
    ];

    const mockCompliance: ComplianceCheck[] = [
      {
        framework: 'GDPR',
        status: 'partial',
        lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60000), // 7 days ago
        issues: 3,
        criticalFindings: 1,
        weddingSpecificRequirements: [
          'Couple consent for data processing',
          'Right to deletion of wedding photos',
          'Supplier data sharing agreements',
        ],
      },
      {
        framework: 'PCI DSS',
        status: 'compliant',
        lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60000), // 14 days ago
        issues: 0,
        criticalFindings: 0,
        weddingSpecificRequirements: [
          'Wedding deposit payment security',
          'Vendor payment card protection',
          'Booking transaction encryption',
        ],
      },
      {
        framework: 'SOC 2 Type II',
        status: 'partial',
        lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60000), // 30 days ago
        issues: 5,
        criticalFindings: 2,
        weddingSpecificRequirements: [
          'Wedding data access controls',
          'Supplier background verification',
          'Audit trails for booking changes',
        ],
      },
    ];

    setSecurityThreats(mockThreats);
    setSecurityMetrics(mockMetrics);
    setComplianceStatus(mockCompliance);
  };

  const getThreatSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'warning':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-success-700 bg-success-100';
      case 'partial':
        return 'text-warning-700 bg-warning-100';
      case 'non_compliant':
        return 'text-error-700 bg-error-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getMitigationStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-success-700 bg-success-100';
      case 'mitigated':
        return 'text-blue-700 bg-blue-100';
      case 'investigating':
        return 'text-warning-700 bg-warning-100';
      case 'unresolved':
        return 'text-error-700 bg-error-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  const filteredThreats = securityThreats.filter((threat) => {
    if (selectedThreatType === 'all') return true;
    return threat.type === selectedThreatType;
  });

  const criticalThreats = securityThreats.filter(
    (t) => t.severity === 'critical',
  ).length;
  const highThreats = securityThreats.filter(
    (t) => t.severity === 'high',
  ).length;
  const unresolvedThreats = securityThreats.filter(
    (t) => t.mitigationStatus === 'unresolved',
  ).length;

  return (
    <div className="space-y-8">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Critical Threats
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {criticalThreats}
              </p>
              <p className="text-sm text-error-600 mt-1">
                Immediate action required
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <ShieldExclamationIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                {highThreats}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                Wedding data at risk
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unresolved</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {unresolvedThreats}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Pending investigation
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Security Score
              </p>
              <p className="text-3xl font-bold text-success-700 mt-1">94</p>
              <p className="text-sm text-success-600 mt-1">
                Wedding data protected
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Security Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityMetrics.map((metric) => (
            <div
              key={metric.name}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  {metric.name}
                </h4>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getMetricStatusColor(metric.status)}`}
                >
                  {metric.status}
                </span>
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value.toFixed(
                    metric.name.includes('Encryption') ||
                      metric.name.includes('Score')
                      ? 1
                      : 0,
                  )}
                  {metric.unit}
                </div>
                <div className="text-xs text-gray-500">
                  Threshold: {metric.threshold}
                  {metric.unit}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">{metric.description}</p>

              <div className="p-2 bg-primary-50 rounded border border-primary-200">
                <div className="text-xs text-primary-600 font-medium mb-1">
                  Wedding Context:
                </div>
                <div className="text-sm text-primary-700">
                  {metric.weddingContext}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Compliance Status
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {complianceStatus.map((compliance) => (
            <div
              key={compliance.framework}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  {compliance.framework}
                </h4>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceStatusColor(compliance.status)}`}
                >
                  {compliance.status === 'non_compliant'
                    ? 'Non-Compliant'
                    : compliance.status === 'partial'
                      ? 'Partial'
                      : 'Compliant'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Audit:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {compliance.lastAudit.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Open Issues:</span>
                  <span
                    className={`text-sm font-medium ${compliance.issues > 0 ? 'text-warning-700' : 'text-success-700'}`}
                  >
                    {compliance.issues}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Critical Findings:
                  </span>
                  <span
                    className={`text-sm font-medium ${compliance.criticalFindings > 0 ? 'text-error-700' : 'text-success-700'}`}
                  >
                    {compliance.criticalFindings}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-2">
                  Wedding Industry Requirements:
                </div>
                <ul className="space-y-1">
                  {compliance.weddingSpecificRequirements.map((req, index) => (
                    <li key={index} className="text-sm text-blue-700">
                      • {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Threat Type:
            </label>
            <select
              value={selectedThreatType}
              onChange={(e) => setSelectedThreatType(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="all">All Types</option>
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_breach">Data Breach</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Time Period:
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredThreats.length} of {securityThreats.length} threats
        </div>
      </div>

      {/* Security Threats List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Security Threats
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredThreats.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-success-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No active threats
              </h4>
              <p className="text-gray-600">
                All wedding data security systems operating normally.
              </p>
            </div>
          ) : (
            filteredThreats.map((threat) => (
              <div key={threat.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getThreatSeverityColor(threat.severity)}`}
                    >
                      {threat.severity.toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {threat.title}
                        </h4>
                        {threat.affectedUsers && threat.affectedUsers > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            <UserGroupIcon className="w-3 h-3 mr-1" />
                            {threat.affectedUsers} users
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-900 mb-2">
                        {threat.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>{threat.source}</span>
                        <span>•</span>
                        <span>{formatTimestamp(threat.timestamp)}</span>
                        <span>•</span>
                        <span className="capitalize">
                          {threat.type.replace('_', ' ')}
                        </span>
                      </div>

                      {threat.weddingDataImpact && (
                        <div className="p-3 bg-error-50 rounded-lg border border-error-200 mb-3">
                          <div className="text-xs text-error-600 font-medium mb-1">
                            Wedding Data Impact:
                          </div>
                          <div className="text-sm text-error-700">
                            {threat.weddingDataImpact}
                          </div>
                        </div>
                      )}

                      {threat.assignee && (
                        <div className="text-sm text-gray-600">
                          Assigned to:{' '}
                          <span className="font-medium">{threat.assignee}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMitigationStatusColor(threat.mitigationStatus)}`}
                    >
                      {threat.mitigationStatus === 'unresolved'
                        ? 'Unresolved'
                        : threat.mitigationStatus === 'investigating'
                          ? 'Investigating'
                          : threat.mitigationStatus === 'mitigated'
                            ? 'Mitigated'
                            : 'Resolved'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Wedding-Specific Security Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <LockClosedIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-900 mb-2">
              Wedding Industry Security Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-primary-800">
              <li>
                • Implement additional MFA for wedding supplier accounts
                handling sensitive couple data
              </li>
              <li>
                • Enhanced monitoring during peak wedding seasons
                (April-October)
              </li>
              <li>
                • Regular security training for wedding industry data handling
                requirements
              </li>
              <li>
                • Automated detection of unusual venue photo download patterns
              </li>
              <li>
                • Strengthen payment security for wedding deposits and final
                payments
              </li>
              <li>
                • Monitor for data scraping of wedding supplier directories
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
