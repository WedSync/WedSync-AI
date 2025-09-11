'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  MapPinIcon,
  CameraIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SessionManagementPanelProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  userType: 'supplier' | 'couple' | 'admin' | 'venue';
  userTier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  ipAddress: string;
  location: string;
  startTime: Date;
  lastActivity: Date;
  sessionDuration: number; // in minutes
  weddingContext: string;
  suspicious: boolean;
  riskScore: number; // 0-100
  activities: string[];
}

interface SessionSecurityMetrics {
  totalActiveSessions: number;
  suspiciousActivity: number;
  multipleLocationLogins: number;
  concurrentSessions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  mobileVsDesktop: { mobile: number; desktop: number };
}

interface SecurityBehaviorPattern {
  id: string;
  pattern: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  affectedSessions: number;
  weddingSpecificRisk: string;
  detectedAt: Date;
}

interface WeddingSessionContext {
  supplierBookingSessions: number;
  coupleSearchSessions: number;
  venueManagementSessions: number;
  photoUploadSessions: number;
  activeWeddingPlannings: number;
  bridalShowTraffic: boolean;
}

export function SessionManagementPanel({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: SessionManagementPanelProps) {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securityMetrics, setSecurityMetrics] =
    useState<SessionSecurityMetrics | null>(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState<
    SecurityBehaviorPattern[]
  >([]);
  const [weddingContext, setWeddingContext] =
    useState<WeddingSessionContext | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('activity');
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(
    null,
  );
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const fetchSessionData = useCallback(async () => {
    // Mock session data - In production, integrate with session management system
    const mockActiveSessions: ActiveSession[] = [
      {
        id: 'sess_001',
        userId: 'user_photographer_001',
        userEmail: 'sarah@snapweddings.com',
        userType: 'supplier',
        userTier: 'professional',
        deviceType: 'desktop',
        browser: 'Chrome 120.0',
        ipAddress: '203.0.113.45',
        location: 'London, UK',
        startTime: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
        lastActivity: new Date(Date.now() - 3 * 60000), // 3 minutes ago
        sessionDuration: 117,
        weddingContext: 'Managing Smith-Johnson wedding gallery and timeline',
        suspicious: false,
        riskScore: 15,
        activities: ['photo_upload', 'timeline_edit', 'client_communication'],
      },
      {
        id: 'sess_002',
        userId: 'user_couple_001',
        userEmail: 'emily.david@gmail.com',
        userType: 'couple',
        userTier: 'free',
        deviceType: 'mobile',
        browser: 'Safari Mobile',
        ipAddress: '192.168.1.105',
        location: 'Manchester, UK',
        startTime: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        lastActivity: new Date(Date.now() - 1 * 60000), // 1 minute ago
        sessionDuration: 44,
        weddingContext: 'Searching venues for June 2024 wedding in Yorkshire',
        suspicious: false,
        riskScore: 8,
        activities: ['venue_search', 'supplier_browse', 'save_favorites'],
      },
      {
        id: 'sess_003',
        userId: 'user_venue_001',
        userEmail: 'manager@grandballroom.co.uk',
        userType: 'venue',
        userTier: 'scale',
        deviceType: 'desktop',
        browser: 'Firefox 119.0',
        ipAddress: '45.33.32.156',
        location: 'Birmingham, UK',
        startTime: new Date(Date.now() - 20 * 60000), // 20 minutes ago
        lastActivity: new Date(Date.now() - 30000), // 30 seconds ago
        sessionDuration: 19,
        weddingContext:
          'Updating availability calendar and booking confirmations',
        suspicious: false,
        riskScore: 12,
        activities: [
          'calendar_management',
          'booking_approval',
          'couple_communication',
        ],
      },
      {
        id: 'sess_004',
        userId: 'user_suspicious_001',
        userEmail: 'temp123@tempmail.com',
        userType: 'supplier',
        userTier: 'free',
        deviceType: 'desktop',
        browser: 'Chrome 115.0',
        ipAddress: '185.220.100.240',
        location: 'Unknown Location',
        startTime: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        lastActivity: new Date(Date.now() - 2 * 60000), // 2 minutes ago
        sessionDuration: 13,
        weddingContext: 'Rapid browsing of competitor supplier profiles',
        suspicious: true,
        riskScore: 85,
        activities: [
          'mass_profile_view',
          'contact_scraping',
          'rapid_navigation',
        ],
      },
      {
        id: 'sess_005',
        userId: 'user_couple_002',
        userEmail: 'james.lisa@outlook.com',
        userType: 'couple',
        userTier: 'starter',
        deviceType: 'tablet',
        browser: 'Chrome Mobile',
        ipAddress: '203.0.113.78',
        location: 'Edinburgh, UK',
        startTime: new Date(Date.now() - 90 * 60000), // 90 minutes ago
        lastActivity: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        sessionDuration: 85,
        weddingContext:
          'Planning September 2024 Highland wedding with multiple suppliers',
        suspicious: false,
        riskScore: 22,
        activities: [
          'supplier_comparison',
          'budget_planning',
          'consultation_booking',
        ],
      },
    ];

    const mockSecurityMetrics: SessionSecurityMetrics = {
      totalActiveSessions: 342 + Math.floor(Math.random() * 50),
      suspiciousActivity: 3 + Math.floor(Math.random() * 3),
      multipleLocationLogins: 7 + Math.floor(Math.random() * 5),
      concurrentSessions: 289 + Math.floor(Math.random() * 30),
      averageSessionDuration: 47.3,
      peakConcurrentUsers: 445,
      mobileVsDesktop: { mobile: 58, desktop: 42 },
    };

    const mockBehaviorPatterns: SecurityBehaviorPattern[] = [
      {
        id: 'pattern_001',
        pattern: 'Rapid Profile Browsing',
        riskLevel: 'high',
        description:
          'User accessing multiple supplier profiles in rapid succession',
        affectedSessions: 2,
        weddingSpecificRisk:
          'Potential data scraping of wedding supplier contact information and pricing',
        detectedAt: new Date(Date.now() - 10 * 60000),
      },
      {
        id: 'pattern_002',
        pattern: 'Unusual Geographic Access',
        riskLevel: 'medium',
        description:
          'User account accessed from multiple geographic locations within short timeframe',
        affectedSessions: 1,
        weddingSpecificRisk:
          'Potential account compromise affecting couple wedding data security',
        detectedAt: new Date(Date.now() - 25 * 60000),
      },
      {
        id: 'pattern_003',
        pattern: 'Excessive Form Submissions',
        riskLevel: 'medium',
        description:
          'Multiple consultation form submissions with similar patterns',
        affectedSessions: 1,
        weddingSpecificRisk:
          'Spam consultation requests affecting supplier response quality',
        detectedAt: new Date(Date.now() - 35 * 60000),
      },
    ];

    const mockWeddingContext: WeddingSessionContext = {
      supplierBookingSessions: 78 + Math.floor(Math.random() * 20),
      coupleSearchSessions: 156 + Math.floor(Math.random() * 40),
      venueManagementSessions: 23 + Math.floor(Math.random() * 8),
      photoUploadSessions: 12 + Math.floor(Math.random() * 6),
      activeWeddingPlannings: 234 + Math.floor(Math.random() * 30),
      bridalShowTraffic: Math.random() > 0.6,
    };

    setActiveSessions(mockActiveSessions);
    setSecurityMetrics(mockSecurityMetrics);
    setBehaviorPatterns(mockBehaviorPatterns);
    setWeddingContext(mockWeddingContext);
  }, []);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData, lastRefresh]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealTimeEnabled) {
      interval = setInterval(fetchSessionData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealTimeEnabled, fetchSessionData]);

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'text-error-700 bg-error-50 border-error-200';
    if (riskScore >= 40)
      return 'text-warning-700 bg-warning-50 border-warning-200';
    if (riskScore >= 20) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-success-700 bg-success-50 border-success-200';
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 70) return 'Critical';
    if (riskScore >= 40) return 'High';
    if (riskScore >= 20) return 'Medium';
    return 'Low';
  };

  const getPatternRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'medium':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="w-4 h-4" />;
      case 'tablet':
        return <DevicePhoneMobileIcon className="w-4 h-4" />;
      default:
        return <ComputerDesktopIcon className="w-4 h-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  const filteredSessions = activeSessions.filter((session) => {
    if (filterType !== 'all' && session.userType !== filterType) return false;

    if (filterRisk === 'suspicious' && !session.suspicious) return false;
    if (filterRisk === 'high' && session.riskScore < 70) return false;
    if (
      filterRisk === 'medium' &&
      (session.riskScore < 20 || session.riskScore >= 70)
    )
      return false;
    if (filterRisk === 'low' && session.riskScore >= 20) return false;

    return true;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'activity':
        return b.lastActivity.getTime() - a.lastActivity.getTime();
      case 'risk':
        return b.riskScore - a.riskScore;
      case 'duration':
        return b.sessionDuration - a.sessionDuration;
      default:
        return 0;
    }
  });

  if (!securityMetrics || !weddingContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading session data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Session Management Panel
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor active user sessions and detect suspicious behavior patterns
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Real-time:</span>
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

      {/* Session Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Sessions
              </p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {securityMetrics.totalActiveSessions}
              </p>
              <p className="text-sm text-primary-600 mt-1">All user types</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <UserIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Suspicious Activity
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {securityMetrics.suspiciousActivity}
              </p>
              <p className="text-sm text-error-600 mt-1">High risk sessions</p>
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
                Multi-Location
              </p>
              <p className="text-3xl font-bold text-warning-700 mt-1">
                {securityMetrics.multipleLocationLogins}
              </p>
              <p className="text-sm text-warning-600 mt-1">
                Geographic anomalies
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-success-700 mt-1">
                {securityMetrics.averageSessionDuration}m
              </p>
              <p className="text-sm text-success-600 mt-1">Per session</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Wedding Context */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Wedding Platform Session Context
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <CameraIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.supplierBookingSessions}
            </p>
            <p className="text-sm text-primary-700">Supplier Bookings</p>
          </div>
          <div className="text-center">
            <GlobeAltIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.coupleSearchSessions}
            </p>
            <p className="text-sm text-primary-700">Couple Searches</p>
          </div>
          <div className="text-center">
            <ComputerDesktopIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.venueManagementSessions}
            </p>
            <p className="text-sm text-primary-700">Venue Management</p>
          </div>
          <div className="text-center">
            <CameraIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.photoUploadSessions}
            </p>
            <p className="text-sm text-primary-700">Photo Uploads</p>
          </div>
          <div className="text-center">
            <CalendarIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.activeWeddingPlannings}
            </p>
            <p className="text-sm text-primary-700">Active Plannings</p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                weddingContext.bridalShowTraffic
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-success-100 text-success-700'
              }`}
            >
              {weddingContext.bridalShowTraffic ? 'Peak' : 'Normal'}
            </div>
            <p className="text-sm text-primary-700 mt-1">Bridal Traffic</p>
          </div>
        </div>
      </div>

      {/* Device Usage Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Device Usage Distribution
        </h3>

        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {securityMetrics.mobileVsDesktop.mobile}%
              </p>
              <p className="text-sm text-gray-600">Mobile Users</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ComputerDesktopIcon className="w-6 h-6 text-gray-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {securityMetrics.mobileVsDesktop.desktop}%
              </p>
              <p className="text-sm text-gray-600">Desktop Users</p>
            </div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-l-full"
                style={{ width: `${securityMetrics.mobileVsDesktop.mobile}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Behavior Patterns */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Security Behavior Patterns
        </h3>

        <div className="space-y-4">
          {behaviorPatterns.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <p className="text-gray-600">
                No suspicious behavior patterns detected
              </p>
            </div>
          ) : (
            behaviorPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {pattern.pattern}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPatternRiskColor(pattern.riskLevel)}`}
                      >
                        {pattern.riskLevel.toUpperCase()} RISK
                      </span>
                      <span className="text-xs text-gray-500">
                        {pattern.affectedSessions} session
                        {pattern.affectedSessions > 1 ? 's' : ''}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {pattern.description}
                    </p>

                    <div className="p-3 bg-orange-50 rounded border border-orange-200">
                      <div className="text-xs text-orange-600 font-medium mb-1">
                        Wedding Platform Risk:
                      </div>
                      <div className="text-sm text-orange-700">
                        {pattern.weddingSpecificRisk}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 ml-4">
                    Detected: {formatLastActivity(pattern.detectedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Session Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                User Type:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Users</option>
                <option value="couple">Couples</option>
                <option value="supplier">Suppliers</option>
                <option value="venue">Venues</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Risk Level:
              </label>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Levels</option>
                <option value="suspicious">Suspicious Only</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Sort By:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="activity">Last Activity</option>
                <option value="risk">Risk Score</option>
                <option value="duration">Session Duration</option>
              </select>
            </div>

            <span className="text-sm text-gray-500">
              Showing {sortedSessions.length} of {activeSessions.length}{' '}
              sessions
            </span>
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Sessions
          </h3>
        </div>

        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {sortedSessions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                No sessions match the current filters
              </p>
            </div>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${session.suspicious ? 'bg-error-25' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(session.deviceType)}
                      <div className="w-3 h-3 rounded-full bg-success-500"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {session.userEmail}
                        </h4>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {session.userType}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {session.userTier}
                        </span>
                        {session.suspicious && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                            Suspicious
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span className="flex items-center space-x-1">
                          <GlobeAltIcon className="w-3 h-3" />
                          <span>{session.ipAddress}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPinIcon className="w-3 h-3" />
                          <span>{session.location}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{formatDuration(session.sessionDuration)}</span>
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 truncate">
                        {session.weddingContext}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(session.riskScore)}`}
                    >
                      Risk: {getRiskLevel(session.riskScore)}
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <p>Last: {formatLastActivity(session.lastActivity)}</p>
                      <p>{session.browser}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Session Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedSession.userEmail}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      User Type
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedSession.userType}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Subscription Tier
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedSession.userTier}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Device
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedSession.deviceType}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Browser
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.browser}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      IP Address
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.ipAddress}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Location
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.location}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Session Duration
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatDuration(selectedSession.sessionDuration)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Risk Score
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(selectedSession.riskScore)}`}
                    >
                      {selectedSession.riskScore}/100 -{' '}
                      {getRiskLevel(selectedSession.riskScore)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Wedding Context
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedSession.weddingContext}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Recent Activities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.activities.map((activity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {activity.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Session Started
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.startTime.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Last Activity
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.lastActivity.toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedSession.suspicious && (
                  <div className="p-3 bg-error-50 rounded-lg border border-error-200">
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />
                      <h4 className="text-sm font-medium text-error-900">
                        Suspicious Activity Detected
                      </h4>
                    </div>
                    <p className="text-sm text-error-700 mt-1">
                      This session has been flagged for suspicious behavior
                      patterns that may indicate security risks.
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
