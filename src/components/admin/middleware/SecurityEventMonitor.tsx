'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldExclamationIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  UserIcon,
  GlobeAltIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface SecurityEventMonitorProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface SecurityEvent {
  id: string;
  timestamp: Date;
  type:
    | 'brute_force'
    | 'suspicious_login'
    | 'data_access'
    | 'file_upload'
    | 'form_injection'
    | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceIp: string;
  userAgent: string;
  affectedResource: string;
  weddingDataImpact: string;
  mitigationStatus: 'active' | 'investigating' | 'mitigated' | 'resolved';
  assignedTo?: string;
  actionRequired: boolean;
}

interface ThreatLevel {
  current: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
  riskFactors: string[];
  weddingSeasonContext: string;
}

interface AlertFilter {
  type: string[];
  severity: string[];
  timeframe: string;
  showResolved: boolean;
}

interface WeddingSecurityContext {
  activeSupplierAccounts: number;
  recentBookingAttempts: number;
  photoUploadEvents: number;
  formSubmissionSpikes: boolean;
  bridalShowTraffic: boolean;
}

export function SecurityEventMonitor({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: SecurityEventMonitorProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel | null>(null);
  const [weddingContext, setWeddingContext] =
    useState<WeddingSecurityContext | null>(null);
  const [filters, setFilters] = useState<AlertFilter>({
    type: [],
    severity: [],
    timeframe: '24h',
    showResolved: false,
  });
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(
    null,
  );

  const fetchSecurityEvents = useCallback(async () => {
    // Mock security events data - In production, integrate with SIEM/security monitoring
    const mockEvents: SecurityEvent[] = [
      {
        id: 'sec_evt_001',
        timestamp: new Date(Date.now() - 3 * 60000), // 3 minutes ago
        type: 'brute_force',
        severity: 'critical',
        title: 'Brute Force Attack on Supplier Accounts',
        description:
          'Multiple failed login attempts detected from IP targeting wedding photography accounts',
        sourceIp: '185.220.100.240',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        affectedResource: '/api/auth/login',
        weddingDataImpact:
          'Attempted unauthorized access to supplier portfolios and client wedding data',
        mitigationStatus: 'investigating',
        assignedTo: 'security-team@wedsync.com',
        actionRequired: true,
      },
      {
        id: 'sec_evt_002',
        timestamp: new Date(Date.now() - 12 * 60000), // 12 minutes ago
        type: 'suspicious_login',
        severity: 'high',
        title: 'Login from Unusual Location',
        description:
          'Wedding venue account accessed from new geographical location without MFA',
        sourceIp: '45.33.32.156',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        affectedResource: '/dashboard/venues',
        weddingDataImpact:
          'Potential unauthorized access to venue booking calendar and couple contact details',
        mitigationStatus: 'active',
        actionRequired: true,
      },
      {
        id: 'sec_evt_003',
        timestamp: new Date(Date.now() - 25 * 60000), // 25 minutes ago
        type: 'form_injection',
        severity: 'medium',
        title: 'SQL Injection Attempt in Wedding Form',
        description:
          'Malicious input detected in couple consultation form submission',
        sourceIp: '94.102.49.190',
        userAgent: 'curl/7.68.0',
        affectedResource: '/api/forms/wedding-consultation',
        weddingDataImpact:
          'Attempted data extraction from wedding booking database',
        mitigationStatus: 'mitigated',
        actionRequired: false,
      },
      {
        id: 'sec_evt_004',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        type: 'rate_limit_exceeded',
        severity: 'high',
        title: 'API Rate Limit Breach',
        description: 'Excessive API calls to wedding venue directory endpoint',
        sourceIp: '162.142.125.21',
        userAgent: 'Python/3.9 requests/2.26.0',
        affectedResource: '/api/venues/search',
        weddingDataImpact:
          'Potential scraping of venue contact information and pricing data',
        mitigationStatus: 'mitigated',
        assignedTo: 'api-security@wedsync.com',
        actionRequired: false,
      },
      {
        id: 'sec_evt_005',
        timestamp: new Date(Date.now() - 90 * 60000), // 90 minutes ago
        type: 'file_upload',
        severity: 'medium',
        title: 'Suspicious File Upload Pattern',
        description:
          'Large volume of file uploads from single photographer account in short timeframe',
        sourceIp: '203.0.113.45',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        affectedResource: '/api/photos/upload',
        weddingDataImpact:
          'Potential storage abuse or malicious file distribution through photo galleries',
        mitigationStatus: 'investigating',
        actionRequired: true,
      },
    ];

    const mockThreatLevel: ThreatLevel = {
      current: 'high',
      trend: 'increasing',
      riskFactors: [
        'Increased brute force attempts during wedding season',
        'New attack patterns targeting venue data',
        'Elevated API abuse from competitor reconnaissance',
      ],
      weddingSeasonContext:
        'Peak bridal show season increases attack surface with higher supplier activity',
    };

    const mockWeddingContext: WeddingSecurityContext = {
      activeSupplierAccounts: 1247 + Math.floor(Math.random() * 100),
      recentBookingAttempts: 28 + Math.floor(Math.random() * 15),
      photoUploadEvents: 156 + Math.floor(Math.random() * 50),
      formSubmissionSpikes: Math.random() > 0.7,
      bridalShowTraffic: Math.random() > 0.6,
    };

    setEvents(mockEvents);
    setThreatLevel(mockThreatLevel);
    setWeddingContext(mockWeddingContext);
  }, [filters.timeframe]);

  useEffect(() => {
    fetchSecurityEvents();
  }, [fetchSecurityEvents, lastRefresh]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealTimeEnabled) {
      interval = setInterval(fetchSecurityEvents, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealTimeEnabled, fetchSecurityEvents]);

  const getSeverityColor = (severity: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-error-700 bg-error-100';
      case 'investigating':
        return 'text-warning-700 bg-warning-100';
      case 'mitigated':
        return 'text-blue-700 bg-blue-100';
      case 'resolved':
        return 'text-success-700 bg-success-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-error-700 bg-error-100 border-error-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-warning-700 bg-warning-100 border-warning-300';
      case 'low':
        return 'text-success-700 bg-success-100 border-success-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const filteredEvents = events.filter((event) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !event.title.toLowerCase().includes(query) &&
        !event.description.toLowerCase().includes(query) &&
        !event.sourceIp.includes(query) &&
        !event.affectedResource.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(event.type)) {
      return false;
    }

    // Severity filter
    if (
      filters.severity.length > 0 &&
      !filters.severity.includes(event.severity)
    ) {
      return false;
    }

    // Resolved filter
    if (!filters.showResolved && event.mitigationStatus === 'resolved') {
      return false;
    }

    return true;
  });

  const criticalEvents = events.filter((e) => e.severity === 'critical').length;
  const activeEvents = events.filter(
    (e) => e.mitigationStatus === 'active',
  ).length;
  const requireActionEvents = events.filter((e) => e.actionRequired).length;

  if (!threatLevel || !weddingContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">
          Loading security event data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Security Event Monitor
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time threat detection and wedding data protection monitoring
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Real-time Updates:</span>
            <button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRealTimeEnabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRealTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Threat Level Overview */}
      <div
        className={`p-6 rounded-xl border-2 ${getThreatLevelColor(threatLevel.current)}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldExclamationIcon className="w-8 h-8 text-current" />
            <div>
              <h3 className="text-lg font-semibold">
                Current Threat Level: {threatLevel.current.toUpperCase()}
              </h3>
              <p className="text-sm opacity-90">
                Trend: {threatLevel.trend} • {threatLevel.weddingSeasonContext}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">Risk Factors:</p>
            <ul className="text-xs mt-1 space-y-1">
              {threatLevel.riskFactors.slice(0, 2).map((factor, index) => (
                <li key={index}>• {factor}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Critical Events
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {criticalEvents}
              </p>
              <p className="text-sm text-error-600 mt-1">Immediate attention</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Threats
              </p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                {activeEvents}
              </p>
              <p className="text-sm text-orange-600 mt-1">Ongoing incidents</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <EyeIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Action Required
              </p>
              <p className="text-3xl font-bold text-warning-700 mt-1">
                {requireActionEvents}
              </p>
              <p className="text-sm text-warning-600 mt-1">Awaiting response</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg">
              <BellIcon className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Wedding Security
              </p>
              <p className="text-3xl font-bold text-primary-700 mt-1">94%</p>
              <p className="text-sm text-primary-600 mt-1">Protection level</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Wedding Context */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Wedding Platform Security Context
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.activeSupplierAccounts}
            </p>
            <p className="text-sm text-primary-700">Active Suppliers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.recentBookingAttempts}
            </p>
            <p className="text-sm text-primary-700">Booking Attempts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.photoUploadEvents}
            </p>
            <p className="text-sm text-primary-700">Photo Uploads</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                weddingContext.formSubmissionSpikes
                  ? 'bg-warning-100 text-warning-700'
                  : 'bg-success-100 text-success-700'
              }`}
            >
              {weddingContext.formSubmissionSpikes ? 'Active' : 'Normal'}
            </div>
            <p className="text-sm text-primary-700 mt-1">Form Spikes</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                weddingContext.bridalShowTraffic
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {weddingContext.bridalShowTraffic ? 'Peak' : 'Normal'}
            </div>
            <p className="text-sm text-primary-700 mt-1">Bridal Traffic</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events by title, IP, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filters.timeframe}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, timeframe: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.showResolved}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    showResolved: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show resolved</span>
            </label>
          </div>
        </div>
      </div>

      {/* Security Events List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Security Events
            </h3>
            <span className="text-sm text-gray-500">
              Showing {filteredEvents.length} of {events.length} events
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-success-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No security events
              </h4>
              <p className="text-gray-600">
                All wedding platform security systems operating normally.
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}
                    >
                      {event.severity.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </h4>
                        {event.actionRequired && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700">
                            Action Required
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {event.description}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span className="flex items-center space-x-1">
                          <GlobeAltIcon className="w-3 h-3" />
                          <span>{event.sourceIp}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </span>
                        <span>{event.affectedResource}</span>
                      </div>

                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="text-xs text-orange-600 font-medium mb-1">
                          Wedding Data Impact:
                        </div>
                        <div className="text-xs text-orange-700">
                          {event.weddingDataImpact}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.mitigationStatus)}`}
                    >
                      {event.mitigationStatus.charAt(0).toUpperCase() +
                        event.mitigationStatus.slice(1)}
                    </span>
                    {event.assignedTo && (
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <UserIcon className="w-3 h-3" />
                        <span>Assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedEvent.title}
                  </h3>
                  <div
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border mt-2 ${getSeverityColor(selectedEvent.severity)}`}
                  >
                    {selectedEvent.severity.toUpperCase()} SEVERITY
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Event Details
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedEvent.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Source IP
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.sourceIp}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Timestamp
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Affected Resource
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.affectedResource}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Status
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.mitigationStatus)}`}
                    >
                      {selectedEvent.mitigationStatus.charAt(0).toUpperCase() +
                        selectedEvent.mitigationStatus.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    User Agent
                  </h4>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {selectedEvent.userAgent}
                  </p>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-900 mb-2">
                    Wedding Data Impact
                  </h4>
                  <p className="text-sm text-orange-700">
                    {selectedEvent.weddingDataImpact}
                  </p>
                </div>

                {selectedEvent.assignedTo && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Assigned To
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.assignedTo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
