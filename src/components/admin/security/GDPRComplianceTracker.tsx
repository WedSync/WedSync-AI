/**
 * WS-190 GDPR Compliance Tracker - Team A Round 1
 * Ultra Hard Thinking Implementation
 *
 * Real-time GDPR breach notification deadline management
 * Wedding-specific privacy considerations and compliance monitoring
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  FileText,
  Heart,
  Star,
  Zap,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react';

interface Incident {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  type:
    | 'security_breach'
    | 'data_violation'
    | 'system_outage'
    | 'gdpr_compliance'
    | 'celebrity_protection'
    | 'venue_security';
  title: string;
  description: string;
  status: 'active' | 'investigating' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  affectedWeddings: string[];
  affectedGuests: number;
  weddingContext?: {
    isCelebrity: boolean;
    isWeekend: boolean;
    venueId: string;
    guestCount: number;
  };
  gdprImplications?: {
    dataTypes: string[];
    notificationDeadline: Date;
    complianceStatus: 'compliant' | 'at_risk' | 'violated';
  };
}

interface ComplianceDeadline {
  incidentId: string;
  title: string;
  deadline: Date;
  status: 'compliant' | 'at_risk' | 'violated';
  dataTypes: string[];
  hoursRemaining: number;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  affectedWeddings: number;
  affectedGuests: number;
  isWeddingDay: boolean;
  isCelebrity: boolean;
  notificationsSent: {
    regulator: boolean;
    individuals: boolean;
    management: boolean;
  };
  evidencePreserved: boolean;
}

interface GDPRComplianceTrackerProps {
  incidents: Incident[];
  complianceRate?: number;
  className?: string;
}

const dataTypeIcons: Record<string, string> = {
  personal_data: '👤',
  contact_information: '📧',
  guest_lists: '📋',
  dietary_requirements: '🍽️',
  payment_data: '💳',
  photos_media: '📷',
  special_categories: '🔒',
  health_data: '🏥',
  wedding_preferences: '💒',
};

const complianceStatusColors = {
  compliant: 'border-green-200 bg-green-50 text-green-800',
  at_risk: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  violated: 'border-red-200 bg-red-50 text-red-800',
};

const urgencyColors = {
  immediate: 'bg-red-600 text-white',
  urgent: 'bg-orange-600 text-white',
  normal: 'bg-blue-600 text-white',
  low: 'bg-gray-600 text-white',
};

export default function GDPRComplianceTracker({
  incidents,
  complianceRate = 0.94,
  className = '',
}: GDPRComplianceTrackerProps) {
  const [selectedDeadline, setSelectedDeadline] =
    useState<ComplianceDeadline | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showViolated, setShowViolated] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Process GDPR deadlines from incidents
  const deadlines = useMemo(() => {
    const now = new Date();

    return incidents
      .filter((incident) => incident.gdprImplications)
      .map((incident) => {
        const gdpr = incident.gdprImplications!;
        const deadline = gdpr.notificationDeadline;
        const hoursRemaining = Math.round(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60),
        );

        let status: 'compliant' | 'at_risk' | 'violated' = 'compliant';
        if (hoursRemaining < 0) {
          status = 'violated';
        } else if (hoursRemaining < 24) {
          status = 'at_risk';
        }

        return {
          incidentId: incident.id,
          title: incident.title,
          deadline,
          status,
          dataTypes: gdpr.dataTypes,
          hoursRemaining,
          severity: incident.severity,
          affectedWeddings: incident.affectedWeddings.length,
          affectedGuests: incident.affectedGuests,
          isWeddingDay: incident.weddingContext?.isWeekend || false,
          isCelebrity: incident.weddingContext?.isCelebrity || false,
          notificationsSent: {
            regulator: hoursRemaining < 48, // Simulate notifications based on timeline
            individuals: hoursRemaining < 24,
            management: hoursRemaining < 60,
          },
          evidencePreserved: true, // In real implementation, check actual evidence status
        } as ComplianceDeadline;
      })
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  }, [incidents]);

  // Filter deadlines based on current filters
  const filteredDeadlines = useMemo(() => {
    let filtered = deadlines;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((d) => d.status === filterStatus);
    }

    if (!showViolated) {
      filtered = filtered.filter((d) => d.status !== 'violated');
    }

    return filtered;
  }, [deadlines, filterStatus, showViolated]);

  // Calculate compliance statistics
  const complianceStats = useMemo(() => {
    const total = deadlines.length;
    const compliant = deadlines.filter((d) => d.status === 'compliant').length;
    const atRisk = deadlines.filter((d) => d.status === 'at_risk').length;
    const violated = deadlines.filter((d) => d.status === 'violated').length;
    const weddingImpacted = deadlines.filter(
      (d) => d.affectedWeddings > 0,
    ).length;
    const celebrityImpacted = deadlines.filter((d) => d.isCelebrity).length;

    return {
      total,
      compliant,
      atRisk,
      violated,
      weddingImpacted,
      celebrityImpacted,
    };
  }, [deadlines]);

  // Auto-refresh compliance status
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000); // Update every minute for deadline accuracy

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getUrgencyLevel = (
    hoursRemaining: number,
  ): 'immediate' | 'urgent' | 'normal' | 'low' => {
    if (hoursRemaining < 0) return 'immediate';
    if (hoursRemaining < 6) return 'immediate';
    if (hoursRemaining < 24) return 'urgent';
    if (hoursRemaining < 48) return 'normal';
    return 'low';
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours < 0) {
      return `${Math.abs(hours)}h OVERDUE`;
    }
    if (hours < 24) {
      return `${hours}h remaining`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  };

  const generateReport = useCallback(() => {
    const reportData = {
      timestamp: new Date(),
      complianceRate,
      totalDeadlines: deadlines.length,
      stats: complianceStats,
      deadlines: filteredDeadlines,
    };

    // In real implementation, generate and download PDF/CSV report
    console.log('GDPR Compliance Report:', reportData);
    alert('GDPR compliance report generated - check console for details');
  }, [complianceRate, deadlines, complianceStats, filteredDeadlines]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* GDPR Compliance Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                GDPR Compliance Dashboard
              </h3>
              <p className="text-blue-700 text-sm">
                Monitoring data protection obligations and breach notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">
                {Math.round(complianceRate * 100)}%
              </div>
              <div className="text-sm text-blue-700">Overall Compliance</div>
            </div>

            <button
              onClick={generateReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Compliance Progress Bar */}
        <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${complianceRate * 100}%` }}
          />
        </div>

        {/* Compliance Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-xl font-semibold text-green-600">
              {complianceStats.compliant}
            </div>
            <div className="text-xs text-gray-600">Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-yellow-600">
              {complianceStats.atRisk}
            </div>
            <div className="text-xs text-gray-600">At Risk</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-red-600">
              {complianceStats.violated}
            </div>
            <div className="text-xs text-gray-600">Violated</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-pink-600">
              {complianceStats.weddingImpacted}
            </div>
            <div className="text-xs text-gray-600">Wedding Impact</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-purple-600">
              {complianceStats.celebrityImpacted}
            </div>
            <div className="text-xs text-gray-600">Celebrity</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-600">
              {complianceStats.total}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </div>

      {/* Critical Deadline Alert */}
      {deadlines.some((d) => d.hoursRemaining < 6 && d.hoursRemaining >= 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-6 w-6 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-red-900">
                URGENT: Notification Deadlines Approaching
              </h4>
              <p className="text-red-700 mt-1">
                {
                  deadlines.filter(
                    (d) => d.hoursRemaining < 6 && d.hoursRemaining >= 0,
                  ).length
                }{' '}
                deadline(s) expiring within 6 hours. Immediate action required.
              </p>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Emergency Escalation
                </button>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium">
                  Bulk Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Notification Deadlines ({filteredDeadlines.length})
          </h4>

          <div className="flex items-center gap-2">
            {autoRefresh && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Live Updates
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="compliant">Compliant</option>
            <option value="at_risk">At Risk</option>
            <option value="violated">Violated</option>
          </select>

          {/* Show Violated Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showViolated}
              onChange={(e) => setShowViolated(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Show violated</span>
          </label>

          {/* Auto-refresh Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="space-y-4">
        {filteredDeadlines.map((deadline) => {
          const urgency = getUrgencyLevel(deadline.hoursRemaining);

          return (
            <div
              key={deadline.incidentId}
              onClick={() => setSelectedDeadline(deadline)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                complianceStatusColors[deadline.status]
              } ${selectedDeadline?.incidentId === deadline.incidentId ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Status Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        deadline.status === 'compliant'
                          ? 'bg-green-500'
                          : deadline.status === 'at_risk'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />

                    <span className="font-semibold text-gray-900">
                      {deadline.title}
                    </span>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[urgency]}`}
                    >
                      {deadline.severity}
                    </span>

                    {deadline.isCelebrity && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        <Star className="h-3 w-3" />
                        Celebrity
                      </span>
                    )}

                    {deadline.isWeddingDay && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">
                        <Heart className="h-3 w-3" />
                        Wedding Day
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Data Types Affected
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {deadline.dataTypes.map((dataType) => (
                          <span
                            key={dataType}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs"
                          >
                            <span>{dataTypeIcons[dataType] || '📊'}</span>
                            {dataType.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Impact Assessment
                      </h5>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {deadline.affectedWeddings} weddings affected
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {deadline.affectedGuests} individuals impacted
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Deadline: {deadline.deadline.toLocaleString()}
                    </span>
                    <span
                      className={`font-medium ${
                        deadline.hoursRemaining < 0
                          ? 'text-red-600'
                          : deadline.hoursRemaining < 24
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {formatTimeRemaining(deadline.hoursRemaining)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      deadline.status === 'compliant'
                        ? 'bg-green-100 text-green-800'
                        : deadline.status === 'at_risk'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {deadline.status === 'compliant'
                      ? '✅ Compliant'
                      : deadline.status === 'at_risk'
                        ? '⚠️ At Risk'
                        : '❌ Violated'}
                  </span>

                  {/* Notification Status */}
                  <div className="mt-2 space-y-1">
                    {deadline.notificationsSent.regulator && (
                      <div className="text-xs text-green-600">
                        📋 Regulator notified
                      </div>
                    )}
                    {deadline.notificationsSent.individuals && (
                      <div className="text-xs text-blue-600">
                        👥 Individuals notified
                      </div>
                    )}
                    {deadline.evidencePreserved && (
                      <div className="text-xs text-purple-600">
                        📁 Evidence preserved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDeadlines.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No GDPR deadlines
            </h3>
            <p className="text-gray-600">
              {deadlines.length === 0
                ? 'No incidents with GDPR implications currently tracked'
                : filterStatus === 'all' && !showViolated
                  ? 'All violated deadlines are hidden'
                  : `No ${filterStatus} deadlines found`}
            </p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setShowViolated(true);
                }}
                className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Show All Deadlines
              </button>
            )}
          </div>
        )}
      </div>

      {/* Wedding Industry GDPR Context */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <h4 className="font-medium text-pink-800 mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Wedding Industry GDPR Considerations
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-pink-700">
          <ul className="space-y-1">
            <li>
              • Guest lists contain personal data requiring 72-hour breach
              notification
            </li>
            <li>• Celebrity weddings have heightened privacy requirements</li>
            <li>
              • Venue partnerships create joint data controller obligations
            </li>
          </ul>
          <ul className="space-y-1">
            <li>
              • Wedding photos/videos require explicit consent for processing
            </li>
            <li>
              • Supplier access to guest data must be logged and monitored
            </li>
            <li>
              • Special category data (dietary, accessibility) needs extra
              protection
            </li>
          </ul>
        </div>
      </div>

      {/* Selected Deadline Details Modal-style */}
      {selectedDeadline && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              GDPR Deadline Details
            </h4>
            <button
              onClick={() => setSelectedDeadline(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-3">
                Timeline & Status
              </h5>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Incident ID:</span>
                  <span className="font-mono">
                    {selectedDeadline.incidentId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Notification deadline:</span>
                  <span className="font-medium">
                    {selectedDeadline.deadline.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time remaining:</span>
                  <span
                    className={`font-medium ${
                      selectedDeadline.hoursRemaining < 0
                        ? 'text-red-600'
                        : selectedDeadline.hoursRemaining < 24
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}
                  >
                    {formatTimeRemaining(selectedDeadline.hoursRemaining)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Compliance status:</span>
                  <span
                    className={`font-medium capitalize ${
                      selectedDeadline.status === 'compliant'
                        ? 'text-green-600'
                        : selectedDeadline.status === 'at_risk'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {selectedDeadline.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-3">Data Impact</h5>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-2">
                  Affected Data Types:
                </div>
                {selectedDeadline.dataTypes.map((dataType) => (
                  <div key={dataType} className="flex items-center gap-2">
                    <span className="text-lg">
                      {dataTypeIcons[dataType] || '📊'}
                    </span>
                    <span className="text-sm capitalize">
                      {dataType.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recommended Actions
            </h5>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="text-sm text-gray-700 space-y-1">
                {selectedDeadline.status === 'violated' ? (
                  <>
                    <li>• Immediately notify supervisory authority</li>
                    <li>• Document delay reasons and mitigation steps</li>
                    <li>• Prepare formal incident report</li>
                    <li>• Review and update breach response procedures</li>
                  </>
                ) : selectedDeadline.status === 'at_risk' ? (
                  <>
                    <li>• Prepare notification documentation immediately</li>
                    <li>• Escalate to data protection officer</li>
                    <li>• Verify incident containment status</li>
                    <li>• Ready communications for affected individuals</li>
                  </>
                ) : (
                  <>
                    <li>• Continue monitoring incident progress</li>
                    <li>• Prepare notification materials as precaution</li>
                    <li>• Document remediation efforts</li>
                    <li>• Update stakeholders on resolution timeline</li>
                  </>
                )}
              </ul>

              <div className="space-y-2">
                <h6 className="font-medium text-gray-700">
                  Wedding-Specific Actions:
                </h6>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Coordinate with wedding planners</li>
                  <li>• Prepare couple reassurance communications</li>
                  <li>• Review vendor data sharing agreements</li>
                  <li>• Ensure Saturday wedding day protocols</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              <Mail className="h-4 w-4 inline mr-2" />
              Send Notification
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              <FileText className="h-4 w-4 inline mr-2" />
              Generate Report
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              <ExternalLink className="h-4 w-4 inline mr-2" />
              View Incident
            </button>
          </div>
        </div>
      )}

      {/* Footer with Last Update */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
        <span>
          GDPR Compliance Monitoring - Last updated:{' '}
          {lastUpdate.toLocaleString()}
        </span>
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Protecting {incidents.reduce(
            (sum, i) => sum + i.affectedGuests,
            0,
          )}{' '}
          wedding guests
        </span>
      </div>
    </div>
  );
}
