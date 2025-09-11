'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAltIcon,
  UserIcon,
  CalendarIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

interface CSRFProtectionMonitorProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface CSRFEvent {
  id: string;
  timestamp: Date;
  eventType:
    | 'token_validation'
    | 'csrf_attack'
    | 'token_mismatch'
    | 'missing_token';
  severity: 'info' | 'warning' | 'error' | 'critical';
  sourceIp: string;
  userAgent: string;
  formEndpoint: string;
  formType:
    | 'wedding_consultation'
    | 'venue_booking'
    | 'supplier_contact'
    | 'photo_upload'
    | 'timeline_edit'
    | 'payment_form';
  tokenStatus: 'valid' | 'invalid' | 'missing' | 'expired';
  weddingDataContext: string;
  blocked: boolean;
  userContext?: {
    userType: string;
    userEmail?: string;
    userTier?: string;
  };
}

interface CSRFMetrics {
  totalRequests: number;
  validTokens: number;
  invalidTokens: number;
  missingTokens: number;
  blockedAttacks: number;
  protectionRate: number;
  mostTargetedForms: { form: string; attempts: number }[];
}

interface FormProtectionStatus {
  formType: string;
  endpoint: string;
  protectionEnabled: boolean;
  requestsToday: number;
  validationSuccess: number;
  attackAttempts: number;
  lastAttack?: Date;
  weddingSpecificRisk: string;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface WeddingFormContext {
  consultationForms: number;
  venueBookings: number;
  supplierContacts: number;
  photoUploads: number;
  timelineEdits: number;
  paymentForms: number;
  peakSubmissionHours: string;
  bridalShowActivitySpike: boolean;
}

export function CSRFProtectionMonitor({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: CSRFProtectionMonitorProps) {
  const [csrfEvents, setCSRFEvents] = useState<CSRFEvent[]>([]);
  const [metrics, setMetrics] = useState<CSRFMetrics | null>(null);
  const [formProtection, setFormProtection] = useState<FormProtectionStatus[]>(
    [],
  );
  const [weddingContext, setWeddingContext] =
    useState<WeddingFormContext | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterFormType, setFilterFormType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CSRFEvent | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const fetchCSRFData = useCallback(async () => {
    // Mock CSRF protection data - In production, integrate with CSRF middleware
    const mockCSRFEvents: CSRFEvent[] = [
      {
        id: 'csrf_001',
        timestamp: new Date(Date.now() - 2 * 60000), // 2 minutes ago
        eventType: 'csrf_attack',
        severity: 'critical',
        sourceIp: '185.220.100.240',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        formEndpoint: '/api/forms/wedding-consultation',
        formType: 'wedding_consultation',
        tokenStatus: 'missing',
        weddingDataContext:
          'Attempted submission of fake wedding consultation with couple contact harvesting',
        blocked: true,
        userContext: {
          userType: 'anonymous',
          userTier: 'free',
        },
      },
      {
        id: 'csrf_002',
        timestamp: new Date(Date.now() - 8 * 60000), // 8 minutes ago
        eventType: 'token_mismatch',
        severity: 'warning',
        sourceIp: '203.0.113.78',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        formEndpoint: '/api/venues/booking',
        formType: 'venue_booking',
        tokenStatus: 'invalid',
        weddingDataContext:
          'Venue booking form with mismatched token - potential session hijacking attempt',
        blocked: true,
        userContext: {
          userType: 'couple',
          userEmail: 'test@example.com',
          userTier: 'starter',
        },
      },
      {
        id: 'csrf_003',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        eventType: 'csrf_attack',
        severity: 'error',
        sourceIp: '45.33.32.199',
        userAgent: 'curl/7.68.0',
        formEndpoint: '/api/suppliers/contact',
        formType: 'supplier_contact',
        tokenStatus: 'missing',
        weddingDataContext:
          'Automated contact form spam targeting wedding photographers and venues',
        blocked: true,
        userContext: {
          userType: 'anonymous',
        },
      },
      {
        id: 'csrf_004',
        timestamp: new Date(Date.now() - 22 * 60000), // 22 minutes ago
        eventType: 'token_validation',
        severity: 'info',
        sourceIp: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        formEndpoint: '/api/photos/upload',
        formType: 'photo_upload',
        tokenStatus: 'valid',
        weddingDataContext:
          'Wedding photographer uploading couple engagement photos to secure gallery',
        blocked: false,
        userContext: {
          userType: 'supplier',
          userEmail: 'photographer@snapweddings.com',
          userTier: 'professional',
        },
      },
      {
        id: 'csrf_005',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        eventType: 'csrf_attack',
        severity: 'critical',
        sourceIp: '94.102.49.190',
        userAgent: 'Python/3.9 requests/2.26.0',
        formEndpoint: '/api/payments/process',
        formType: 'payment_form',
        tokenStatus: 'missing',
        weddingDataContext:
          'Attempted unauthorized payment processing for wedding deposits',
        blocked: true,
        userContext: {
          userType: 'anonymous',
        },
      },
    ];

    const mockMetrics: CSRFMetrics = {
      totalRequests: 3247 + Math.floor(Math.random() * 200),
      validTokens: 3189 + Math.floor(Math.random() * 150),
      invalidTokens: 28 + Math.floor(Math.random() * 10),
      missingTokens: 30 + Math.floor(Math.random() * 15),
      blockedAttacks: 23 + Math.floor(Math.random() * 8),
      protectionRate: 99.2 + Math.random() * 0.5,
      mostTargetedForms: [
        { form: 'Wedding Consultation', attempts: 12 },
        { form: 'Venue Booking', attempts: 8 },
        { form: 'Supplier Contact', attempts: 6 },
        { form: 'Photo Upload', attempts: 4 },
      ],
    };

    const mockFormProtection: FormProtectionStatus[] = [
      {
        formType: 'Wedding Consultation',
        endpoint: '/api/forms/wedding-consultation',
        protectionEnabled: true,
        requestsToday: 247,
        validationSuccess: 235,
        attackAttempts: 12,
        lastAttack: new Date(Date.now() - 2 * 60000),
        weddingSpecificRisk:
          'High value target - contains couple contact details, wedding dates, and budget information',
        criticalityLevel: 'critical',
      },
      {
        formType: 'Venue Booking',
        endpoint: '/api/venues/booking',
        protectionEnabled: true,
        requestsToday: 156,
        validationSuccess: 148,
        attackAttempts: 8,
        lastAttack: new Date(Date.now() - 8 * 60000),
        weddingSpecificRisk:
          'Contains payment information and personal celebration details',
        criticalityLevel: 'critical',
      },
      {
        formType: 'Supplier Contact',
        endpoint: '/api/suppliers/contact',
        protectionEnabled: true,
        requestsToday: 89,
        validationSuccess: 83,
        attackAttempts: 6,
        lastAttack: new Date(Date.now() - 15 * 60000),
        weddingSpecificRisk:
          'Spam target for fake inquiries affecting supplier response quality',
        criticalityLevel: 'high',
      },
      {
        formType: 'Photo Upload',
        endpoint: '/api/photos/upload',
        protectionEnabled: true,
        requestsToday: 67,
        validationSuccess: 63,
        attackAttempts: 4,
        weddingSpecificRisk:
          'Potential malicious file uploads or unauthorized access to wedding galleries',
        criticalityLevel: 'high',
      },
      {
        formType: 'Timeline Edit',
        endpoint: '/api/timeline/edit',
        protectionEnabled: true,
        requestsToday: 34,
        validationSuccess: 34,
        attackAttempts: 0,
        weddingSpecificRisk:
          'Wedding day schedule manipulation could disrupt vendor coordination',
        criticalityLevel: 'medium',
      },
      {
        formType: 'Payment Processing',
        endpoint: '/api/payments/process',
        protectionEnabled: true,
        requestsToday: 23,
        validationSuccess: 22,
        attackAttempts: 1,
        lastAttack: new Date(Date.now() - 45 * 60000),
        weddingSpecificRisk:
          'Financial fraud targeting wedding deposits and final payments',
        criticalityLevel: 'critical',
      },
    ];

    const mockWeddingContext: WeddingFormContext = {
      consultationForms: 247,
      venueBookings: 156,
      supplierContacts: 89,
      photoUploads: 67,
      timelineEdits: 34,
      paymentForms: 23,
      peakSubmissionHours: '10 AM - 2 PM, 6 PM - 9 PM',
      bridalShowActivitySpike: Math.random() > 0.6,
    };

    setCSRFEvents(mockCSRFEvents);
    setMetrics(mockMetrics);
    setFormProtection(mockFormProtection);
    setWeddingContext(mockWeddingContext);
  }, [selectedTimeframe]);

  useEffect(() => {
    fetchCSRFData();
  }, [fetchCSRFData, lastRefresh]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealTimeEnabled) {
      interval = setInterval(fetchCSRFData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealTimeEnabled, fetchCSRFData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'error':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getTokenStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-success-700 bg-success-100';
      case 'invalid':
        return 'text-warning-700 bg-warning-100';
      case 'missing':
        return 'text-error-700 bg-error-100';
      case 'expired':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
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

  const formatFormType = (formType: string) => {
    return formType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredEvents = csrfEvents.filter((event) => {
    if (filterSeverity !== 'all' && event.severity !== filterSeverity)
      return false;
    if (filterFormType !== 'all' && event.formType !== filterFormType)
      return false;
    return true;
  });

  const criticalEvents = csrfEvents.filter(
    (e) => e.severity === 'critical',
  ).length;
  const blockedAttacks = csrfEvents.filter((e) => e.blocked).length;
  const recentAttacks = csrfEvents.filter(
    (e) => new Date(e.timestamp) > new Date(Date.now() - 60 * 60000), // Last hour
  ).length;

  if (!metrics || !weddingContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">
          Loading CSRF protection data...
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
            CSRF Protection Monitor
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor form security validation and cross-site request forgery
            attack prevention
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

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* CSRF Protection Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Protection Rate
              </p>
              <p className="text-3xl font-bold text-success-700 mt-1">
                {metrics.protectionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-success-600 mt-1">Form security</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Blocked Attacks
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {metrics.blockedAttacks}
              </p>
              <p className="text-sm text-error-600 mt-1">CSRF attempts</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Tokens</p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {metrics.validTokens.toLocaleString()}
              </p>
              <p className="text-sm text-primary-600 mt-1">
                Successful validations
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Requests
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {metrics.totalRequests.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Form submissions</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Wedding Form Context */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          Wedding Platform Form Activity
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <div className="text-center">
            <DocumentTextIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.consultationForms}
            </p>
            <p className="text-sm text-primary-700">Consultations</p>
          </div>
          <div className="text-center">
            <CalendarIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.venueBookings}
            </p>
            <p className="text-sm text-primary-700">Venue Bookings</p>
          </div>
          <div className="text-center">
            <UserIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.supplierContacts}
            </p>
            <p className="text-sm text-primary-700">Supplier Contacts</p>
          </div>
          <div className="text-center">
            <CameraIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.photoUploads}
            </p>
            <p className="text-sm text-primary-700">Photo Uploads</p>
          </div>
          <div className="text-center">
            <ClockIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.timelineEdits}
            </p>
            <p className="text-sm text-primary-700">Timeline Edits</p>
          </div>
          <div className="text-center">
            <DocumentTextIcon className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary-900">
              {weddingContext.paymentForms}
            </p>
            <p className="text-sm text-primary-700">Payments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-primary-700">
              <strong>Peak Hours:</strong> {weddingContext.peakSubmissionHours}
            </p>
          </div>
          <div>
            <p className="text-sm text-primary-700">
              <strong>Bridal Show Activity:</strong>
              <span
                className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  weddingContext.bridalShowActivitySpike
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-success-100 text-success-700'
                }`}
              >
                {weddingContext.bridalShowActivitySpike ? 'Elevated' : 'Normal'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Protection Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Form Protection Status
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formProtection.map((form) => (
            <div
              key={form.formType}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {form.formType}
                  </h4>
                  <p className="text-sm text-gray-600">{form.endpoint}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCriticalityColor(form.criticalityLevel)}`}
                  >
                    {form.criticalityLevel.toUpperCase()}
                  </div>
                  {form.protectionEnabled ? (
                    <CheckCircleIcon className="w-5 h-5 text-success-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-error-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {form.requestsToday}
                  </p>
                  <p className="text-xs text-gray-600">Total Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success-700">
                    {form.validationSuccess}
                  </p>
                  <p className="text-xs text-gray-600">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-700">
                    {form.attackAttempts}
                  </p>
                  <p className="text-xs text-gray-600">Attacks</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-success-500 h-2 rounded-full"
                    style={{
                      width: `${(form.validationSuccess / form.requestsToday) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>
                    Success Rate:{' '}
                    {(
                      (form.validationSuccess / form.requestsToday) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                  {form.lastAttack && (
                    <span>
                      Last Attack:{' '}
                      {new Date(form.lastAttack).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xs text-orange-600 font-medium mb-1">
                  Wedding Security Risk:
                </div>
                <div className="text-sm text-orange-700">
                  {form.weddingSpecificRisk}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Targeted Forms */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Most Targeted Forms
        </h3>

        <div className="space-y-3">
          {metrics.mostTargetedForms.map((form, index) => (
            <div
              key={form.form}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-error-100 rounded-full text-sm font-bold text-error-700">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {form.form}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {form.attempts} attack attempts
                </span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-error-500 h-2 rounded-full"
                    style={{
                      width: `${(form.attempts / Math.max(...metrics.mostTargetedForms.map((f) => f.attempts))) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Severity:
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Form Type:
              </label>
              <select
                value={filterFormType}
                onChange={(e) => setFilterFormType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Forms</option>
                <option value="wedding_consultation">
                  Wedding Consultation
                </option>
                <option value="venue_booking">Venue Booking</option>
                <option value="supplier_contact">Supplier Contact</option>
                <option value="photo_upload">Photo Upload</option>
                <option value="timeline_edit">Timeline Edit</option>
                <option value="payment_form">Payment Form</option>
              </select>
            </div>
          </div>

          <span className="text-sm text-gray-500">
            Showing {filteredEvents.length} of {csrfEvents.length} events
          </span>
        </div>
      </div>

      {/* CSRF Events List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            CSRF Protection Events
          </h3>
        </div>

        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-success-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No CSRF events
              </h4>
              <p className="text-gray-600">
                All wedding forms are protected and operating securely.
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                  event.severity === 'critical'
                    ? 'bg-error-25'
                    : event.blocked
                      ? 'bg-warning-25'
                      : ''
                }`}
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
                        <h4 className="text-sm font-medium text-gray-900">
                          {formatFormType(event.formType)} -{' '}
                          {event.eventType.replace('_', ' ')}
                        </h4>
                        {event.blocked && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                            Blocked
                          </span>
                        )}
                        {event.userContext?.userType && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                            {event.userContext.userType}
                          </span>
                        )}
                      </div>

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
                        <span>{event.formEndpoint}</span>
                      </div>

                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="text-xs text-orange-600 font-medium mb-1">
                          Wedding Data Context:
                        </div>
                        <div className="text-sm text-orange-700">
                          {event.weddingDataContext}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTokenStatusColor(event.tokenStatus)}`}
                    >
                      {event.tokenStatus.toUpperCase()}
                    </span>
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
                    CSRF Event Details
                  </h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(selectedEvent.severity)}`}
                    >
                      {selectedEvent.severity.toUpperCase()} SEVERITY
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTokenStatusColor(selectedEvent.tokenStatus)}`}
                    >
                      {selectedEvent.tokenStatus.toUpperCase()} TOKEN
                    </span>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Event Type
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.eventType.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Form Type
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatFormType(selectedEvent.formType)}
                    </p>
                  </div>
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
                      Form Endpoint
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.formEndpoint}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Attack Blocked
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.blocked ? 'Yes' : 'No'}
                    </p>
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

                {selectedEvent.userContext && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      User Context
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Type: {selectedEvent.userContext.userType}</p>
                      {selectedEvent.userContext.userEmail && (
                        <p>Email: {selectedEvent.userContext.userEmail}</p>
                      )}
                      {selectedEvent.userContext.userTier && (
                        <p>Tier: {selectedEvent.userContext.userTier}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-900 mb-2">
                    Wedding Data Context
                  </h4>
                  <p className="text-sm text-orange-700">
                    {selectedEvent.weddingDataContext}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
