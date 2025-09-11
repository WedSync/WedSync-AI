/**
 * WS-190 Incident Response Dashboard - Team A Round 1
 * Ultra Hard Thinking Implementation
 *
 * Real-time incident monitoring with emergency response capabilities
 * Wedding-specific security context and GDPR compliance tracking
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Shield,
  Users,
  Clock,
  Activity,
  Star,
  AlertCircle,
  CheckCircle,
  RefreshCcw,
  Phone,
  Bell,
  Zap,
  Calendar,
  Heart,
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
  assignedTo?: string;
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

interface IncidentMetrics {
  totalIncidents: number;
  activeIncidents: number;
  averageResolutionTime: number;
  mttr: number;
  incidentsByPriority: Record<string, number>;
  gdprComplianceRate: number;
}

interface IncidentDashboardProps {
  organizationId?: string;
  userRole?: 'security_lead' | 'incident_commander' | 'technical_lead';
  className?: string;
}

const severityColors = {
  P1: 'border-red-500 bg-red-50 text-red-800',
  P2: 'border-orange-500 bg-orange-50 text-orange-800',
  P3: 'border-yellow-500 bg-yellow-50 text-yellow-800',
  P4: 'border-blue-500 bg-blue-50 text-blue-800',
} as const;

const severityBadgeColors = {
  P1: 'bg-red-600 text-white border-red-600',
  P2: 'bg-orange-600 text-white border-orange-600',
  P3: 'bg-yellow-600 text-white border-yellow-600',
  P4: 'bg-blue-600 text-white border-blue-600',
} as const;

export default function IncidentDashboard({
  organizationId = 'default',
  userRole = 'security_lead',
  className = '',
}: IncidentDashboardProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'gdpr'>(
    'overview',
  );
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isWeddingDay, setIsWeddingDay] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check if today is Saturday (wedding day)
  useEffect(() => {
    const today = new Date();
    setIsWeddingDay(today.getDay() === 6);
  }, []);

  // Mock data initialization
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockIncidents: Incident[] = [
        {
          id: 'INC-2025-001',
          severity: 'P1',
          type: 'security_breach',
          title: 'Unauthorized access attempt detected',
          description:
            'Multiple failed login attempts from suspicious IP addresses targeting celebrity client accounts',
          status: 'active',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          updatedAt: new Date(),
          affectedWeddings: ['wedding-123', 'wedding-456'],
          affectedGuests: 150,
          weddingContext: {
            isCelebrity: true,
            isWeekend: isWeddingDay,
            venueId: 'venue-789',
            guestCount: 150,
          },
          gdprImplications: {
            dataTypes: ['personal_data', 'contact_information'],
            notificationDeadline: new Date(Date.now() + 70 * 60 * 60 * 1000), // 70 hours
            complianceStatus: 'at_risk',
          },
        },
        {
          id: 'INC-2025-002',
          severity: 'P2',
          type: 'data_violation',
          title: 'GDPR data retention violation',
          description:
            'Guest data found stored beyond retention policy limits for archived wedding events',
          status: 'investigating',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          updatedAt: new Date(),
          affectedWeddings: ['wedding-789'],
          affectedGuests: 80,
          weddingContext: {
            isCelebrity: false,
            isWeekend: false,
            venueId: 'venue-456',
            guestCount: 80,
          },
          gdprImplications: {
            dataTypes: ['guest_lists', 'dietary_requirements'],
            notificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            complianceStatus: 'compliant',
          },
        },
        {
          id: 'INC-2025-003',
          severity: 'P3',
          type: 'venue_security',
          title: 'Venue access system malfunction',
          description:
            'Digital door locks at premium venue experiencing intermittent failures',
          status: 'resolved',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          updatedAt: new Date(),
          resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          affectedWeddings: ['wedding-012'],
          affectedGuests: 200,
          weddingContext: {
            isCelebrity: false,
            isWeekend: true,
            venueId: 'venue-premium-001',
            guestCount: 200,
          },
        },
      ];

      const mockMetrics: IncidentMetrics = {
        totalIncidents: mockIncidents.length,
        activeIncidents: mockIncidents.filter((i) => i.status === 'active')
          .length,
        averageResolutionTime: 4.5 * 60 * 60, // 4.5 hours in seconds
        mttr: 3.2 * 60 * 60, // 3.2 hours in seconds
        incidentsByPriority: {
          P1: mockIncidents.filter((i) => i.severity === 'P1').length,
          P2: mockIncidents.filter((i) => i.severity === 'P2').length,
          P3: mockIncidents.filter((i) => i.severity === 'P3').length,
          P4: mockIncidents.filter((i) => i.severity === 'P4').length,
        },
        gdprComplianceRate: 0.94,
      };

      setIncidents(mockIncidents);
      setMetrics(mockMetrics);
      setIsConnected(true);
      setIsLoading(false);
      setLastUpdate(new Date());
    };

    initializeDashboard();
  }, [isWeddingDay]);

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());

      // Simulate random incident updates
      if (Math.random() < 0.1) {
        // 10% chance each minute
        setIncidents((prev) =>
          prev.map((incident) => ({
            ...incident,
            updatedAt: new Date(),
          })),
        );
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = useMemo(() => {
    if (filterSeverity === 'all') return incidents;
    return incidents.filter((incident) => incident.severity === filterSeverity);
  }, [incidents, filterSeverity]);

  const priorityIncidents = useMemo(() => {
    return incidents.filter(
      (incident) => incident.severity === 'P1' && incident.status === 'active',
    );
  }, [incidents]);

  const activeWeddingIncidents = useMemo(() => {
    return incidents.filter(
      (incident) =>
        incident.affectedWeddings.length > 0 && incident.status !== 'closed',
    );
  }, [incidents]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLastUpdate(new Date());
    setIsLoading(false);
  }, []);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">
          Loading incident dashboard...
        </span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load incident data</p>
          <button
            onClick={refreshData}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            🚨 Incident Response Dashboard
            {isWeddingDay && (
              <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                💒 Wedding Day Protocol
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time active' : 'Connection lost'}
            </span>
          </div>

          {/* Emergency Actions */}
          {priorityIncidents.length > 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
              <Bell className="h-4 w-4" />
              Emergency Mode
            </button>
          )}

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Emergency Alert for P1 Incidents */}
      {priorityIncidents.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-6 w-6 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                CRITICAL INCIDENTS ACTIVE
              </h3>
              <p className="text-red-700 mt-1">
                {priorityIncidents.length} P1 incident
                {priorityIncidents.length > 1 ? 's' : ''} requiring immediate
                attention.
                {isWeddingDay && ' Wedding day protocol is in effect.'}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Call Emergency Team
                </button>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium">
                  Escalate to Leadership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Incidents */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Active Incidents
              </p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {metrics.activeIncidents}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {priorityIncidents.length} critical
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Wedding Impacts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Wedding Impacts
              </p>
              <p className="text-3xl font-bold text-pink-600 mt-2">
                {activeWeddingIncidents.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {incidents.reduce((sum, i) => sum + i.affectedGuests, 0)} guests
                affected
              </p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </div>

        {/* GDPR Compliance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                GDPR Compliance
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {Math.round(metrics.gdprComplianceRate * 100)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {
                  incidents.filter(
                    (i) => i.gdprImplications?.complianceStatus === 'at_risk',
                  ).length
                }{' '}
                at risk
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Resolution Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Resolution
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {Math.round(metrics.averageResolutionTime / 3600)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                MTTR: {Math.round(metrics.mttr / 3600)}h
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Incident Overview', icon: '📊' },
              { id: 'timeline', name: 'Timeline View', icon: '📅' },
              { id: 'gdpr', name: 'GDPR Compliance', icon: '🔒' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Priority:
                </label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Severities</option>
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>

              {/* Incidents List */}
              <div className="space-y-4">
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                      severityColors[incident.severity]
                    } ${selectedIncident?.id === incident.id ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              severityBadgeColors[incident.severity]
                            }`}
                          >
                            {incident.severity}
                          </span>

                          <span className="text-sm text-gray-600 uppercase tracking-wide">
                            {incident.type.replace('_', ' ')}
                          </span>

                          {incident.weddingContext?.isCelebrity && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              <Star className="h-3 w-3" />
                              Celebrity
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2">
                          {incident.title}
                        </h3>

                        <p className="text-sm text-gray-600 mb-3">
                          {incident.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(incident.createdAt)}
                          </span>

                          {incident.affectedWeddings.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {incident.affectedWeddings.length} weddings
                            </span>
                          )}

                          {incident.affectedGuests > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {incident.affectedGuests} guests
                            </span>
                          )}

                          {incident.gdprImplications && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              GDPR Impact
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            incident.status === 'active'
                              ? 'bg-red-100 text-red-800'
                              : incident.status === 'investigating'
                                ? 'bg-yellow-100 text-yellow-800'
                                : incident.status === 'resolved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {incident.status.toUpperCase()}
                        </span>

                        {incident.resolvedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Resolved {getTimeAgo(incident.resolvedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredIncidents.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No incidents found
                    </h3>
                    <p className="text-gray-600">
                      {filterSeverity === 'all'
                        ? 'All systems are operating normally!'
                        : `No ${filterSeverity} incidents at this time.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="text-center py-12 text-gray-500">
              Timeline view will be implemented by IncidentTimeline component
            </div>
          )}

          {activeTab === 'gdpr' && (
            <div className="text-center py-12 text-gray-500">
              GDPR compliance tracking will be implemented by
              GDPRComplianceTracker component
            </div>
          )}
        </div>
      </div>

      {/* Selected Incident Details */}
      {selectedIncident && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Incident Details
            </h3>
            <button
              onClick={() => setSelectedIncident(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">
                Basic Information
              </h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">ID:</dt>
                  <dd className="font-mono">{selectedIncident.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type:</dt>
                  <dd className="capitalize">
                    {selectedIncident.type.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="capitalize">{selectedIncident.status}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Assigned to:</dt>
                  <dd>{selectedIncident.assignedTo || 'Unassigned'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-3">
                Impact Assessment
              </h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Affected Weddings:</dt>
                  <dd>{selectedIncident.affectedWeddings.length}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Guest Impact:</dt>
                  <dd>{selectedIncident.affectedGuests} guests</dd>
                </div>
                {selectedIncident.weddingContext?.isCelebrity && (
                  <div>
                    <dt className="text-gray-500">Special Notes:</dt>
                    <dd className="text-purple-600 font-medium">
                      ⭐ Celebrity client involved
                    </dd>
                  </div>
                )}
                {selectedIncident.weddingContext?.isWeekend && (
                  <div>
                    <dt className="text-gray-500">Weekend Impact:</dt>
                    <dd className="text-pink-600 font-medium">
                      💒 Wedding day affected
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {selectedIncident.gdprImplications && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                GDPR Compliance Impact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <dt className="text-blue-700 font-medium">
                    Data Types Affected:
                  </dt>
                  <dd>
                    {selectedIncident.gdprImplications.dataTypes.join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-blue-700 font-medium">
                    Notification Deadline:
                  </dt>
                  <dd>
                    {selectedIncident.gdprImplications.notificationDeadline.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-blue-700 font-medium">
                    Compliance Status:
                  </dt>
                  <dd
                    className={`font-medium capitalize ${
                      selectedIncident.gdprImplications.complianceStatus ===
                      'compliant'
                        ? 'text-green-600'
                        : selectedIncident.gdprImplications.complianceStatus ===
                            'at_risk'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {selectedIncident.gdprImplications.complianceStatus.replace(
                      '_',
                      ' ',
                    )}
                  </dd>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Status Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
        <span>
          WedSync Security Operations Center - Protecting Wedding Memories
        </span>
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {isConnected ? 'Real-time monitoring active' : 'Offline mode'}
        </span>
      </div>
    </div>
  );
}
