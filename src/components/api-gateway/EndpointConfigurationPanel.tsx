'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  Shield,
  Clock,
  Globe,
  Zap,
  Database,
  Camera,
  CreditCard,
  MapPin,
  Users,
  Calendar,
  Heart,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Activity,
  Gauge,
  Lock,
  Unlock,
  TestTube,
  Save,
  X,
  RefreshCw,
  Copy,
  Download,
  Upload,
  Star,
} from 'lucide-react';

// Zod schemas for wedding-specific API endpoint configuration
const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

const WeddingEndpointCategorySchema = z.enum([
  'bookings',
  'photos',
  'payments',
  'venues',
  'vendors',
  'guests',
  'timeline',
  'communications',
  'documents',
  'reviews',
  'logistics',
  'emergency',
]);

const AuthenticationTypeSchema = z.enum([
  'none',
  'api_key',
  'bearer_token',
  'oauth2',
  'basic_auth',
  'wedding_session',
]);

const WeddingDayPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'critical',
  'emergency',
]);

const RateLimitSchema = z.object({
  enabled: z.boolean(),
  requests_per_minute: z.number().min(1).max(10000),
  requests_per_hour: z.number().min(1).max(100000),
  burst_limit: z.number().min(1).max(1000),
  wedding_day_multiplier: z.number().min(1).max(10).default(2),
});

const SLAConfigurationSchema = z.object({
  response_time_ms: z.number().min(10).max(30000),
  uptime_percentage: z.number().min(90).max(100),
  wedding_day_response_time_ms: z.number().min(10).max(5000),
  wedding_day_uptime_percentage: z.number().min(99).max(100),
  error_rate_threshold: z.number().min(0).max(50),
});

const EndpointHeaderSchema = z.object({
  key: z.string().min(1, 'Header key is required'),
  value: z.string().min(1, 'Header value is required'),
  required: z.boolean().default(false),
});

const EndpointParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  type: z.enum([
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'wedding_date',
    'venue_id',
    'vendor_id',
  ]),
  required: z.boolean().default(false),
  description: z.string().optional(),
  default_value: z.string().optional(),
});

const EndpointConfigurationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Endpoint name is required'),
  path: z
    .string()
    .min(1, 'Endpoint path is required')
    .regex(/^\//, 'Path must start with /'),
  method: HttpMethodSchema,
  category: WeddingEndpointCategorySchema,
  description: z.string().min(1, 'Description is required'),
  enabled: z.boolean().default(true),

  // Wedding-specific settings
  wedding_day_priority: WeddingDayPrioritySchema,
  affects_wedding_day: z.boolean().default(false),
  emergency_override: z.boolean().default(false),
  venue_accessible: z.boolean().default(false),
  mobile_optimized: z.boolean().default(true),

  // Authentication
  authentication: z.object({
    type: AuthenticationTypeSchema,
    required: z.boolean().default(true),
    scopes: z.array(z.string()).optional(),
    wedding_session_required: z.boolean().default(false),
  }),

  // Rate limiting
  rate_limiting: RateLimitSchema,

  // SLA configuration
  sla: SLAConfigurationSchema,

  // Headers and parameters
  headers: z.array(EndpointHeaderSchema).default([]),
  parameters: z.array(EndpointParameterSchema).default([]),

  // Versioning
  version: z.string().default('v1'),
  deprecated: z.boolean().default(false),
  deprecation_date: z.string().optional(),
  replacement_endpoint: z.string().optional(),

  // Monitoring
  monitoring: z
    .object({
      log_requests: z.boolean().default(true),
      log_responses: z.boolean().default(false),
      alert_on_errors: z.boolean().default(true),
      wedding_day_monitoring: z.boolean().default(true),
    })
    .default({}),

  // Testing
  test_config: z
    .object({
      sample_request: z.string().optional(),
      expected_response: z.string().optional(),
      test_cases: z.array(z.string()).default([]),
    })
    .default({}),
});

type EndpointConfiguration = z.infer<typeof EndpointConfigurationSchema>;

// Wedding-specific endpoint categories with context
const WEDDING_ENDPOINT_CATEGORIES = {
  bookings: {
    label: 'Bookings & Contracts',
    icon: Calendar,
    color: 'bg-blue-500',
    description: 'Client bookings, contract management, and scheduling',
    examples: ['Create booking', 'Update contract status', 'Get availability'],
  },
  photos: {
    label: 'Photo Management',
    icon: Camera,
    color: 'bg-purple-500',
    description: 'Photo uploads, galleries, and client sharing',
    examples: ['Upload wedding photos', 'Create gallery', 'Share with clients'],
  },
  payments: {
    label: 'Payments & Invoicing',
    icon: CreditCard,
    color: 'bg-green-500',
    description: 'Payment processing, invoices, and financial tracking',
    examples: ['Process payment', 'Generate invoice', 'Track deposits'],
  },
  venues: {
    label: 'Venue Management',
    icon: MapPin,
    color: 'bg-orange-500',
    description: 'Venue information, capacity, and booking coordination',
    examples: ['Get venue details', 'Check availability', 'Update capacity'],
  },
  vendors: {
    label: 'Vendor Coordination',
    icon: Users,
    color: 'bg-pink-500',
    description: 'Vendor partnerships, referrals, and collaboration',
    examples: ['Find vendors', 'Manage partnerships', 'Track referrals'],
  },
  guests: {
    label: 'Guest Management',
    icon: Heart,
    color: 'bg-red-500',
    description: 'Guest lists, RSVPs, and communication',
    examples: ['Manage guest list', 'Track RSVPs', 'Send invitations'],
  },
  timeline: {
    label: 'Wedding Timeline',
    icon: Clock,
    color: 'bg-indigo-500',
    description: 'Wedding day timeline, scheduling, and coordination',
    examples: ['Create timeline', 'Update schedule', 'Coordinate vendors'],
  },
  communications: {
    label: 'Communications',
    icon: Globe,
    color: 'bg-cyan-500',
    description: 'Email, SMS, and notification systems',
    examples: ['Send notifications', 'Email clients', 'SMS reminders'],
  },
  documents: {
    label: 'Documents & Forms',
    icon: Database,
    color: 'bg-gray-500',
    description: 'Contracts, forms, and document management',
    examples: ['Upload contract', 'Generate forms', 'Store documents'],
  },
  reviews: {
    label: 'Reviews & Feedback',
    icon: Star,
    color: 'bg-yellow-500',
    description: 'Client reviews, testimonials, and feedback collection',
    examples: ['Collect reviews', 'Display testimonials', 'Feedback forms'],
  },
  logistics: {
    label: 'Wedding Logistics',
    icon: Settings,
    color: 'bg-slate-500',
    description: 'Equipment, transportation, and logistics coordination',
    examples: ['Track equipment', 'Manage transport', 'Coordinate setup'],
  },
  emergency: {
    label: 'Emergency Protocols',
    icon: AlertTriangle,
    color: 'bg-red-600',
    description: 'Emergency contacts, backup plans, and crisis management',
    examples: ['Emergency contacts', 'Backup vendors', 'Crisis protocols'],
  },
};

const WEDDING_DAY_PRIORITIES = {
  low: {
    label: 'Low Priority',
    color: 'bg-gray-100 text-gray-600',
    description: 'Non-critical operations',
  },
  normal: {
    label: 'Normal',
    color: 'bg-blue-100 text-blue-600',
    description: 'Standard business operations',
  },
  high: {
    label: 'High Priority',
    color: 'bg-orange-100 text-orange-600',
    description: 'Important for wedding day',
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-100 text-red-600',
    description: 'Essential for wedding operations',
  },
  emergency: {
    label: 'Emergency',
    color: 'bg-red-600 text-white',
    description: 'Wedding day emergency protocols',
  },
};

const AUTHENTICATION_TYPES = {
  none: {
    label: 'No Authentication',
    icon: Unlock,
    description: 'Public endpoint, no authentication required',
  },
  api_key: {
    label: 'API Key',
    icon: Lock,
    description: 'Simple API key authentication',
  },
  bearer_token: {
    label: 'Bearer Token',
    icon: Shield,
    description: 'JWT or bearer token authentication',
  },
  oauth2: {
    label: 'OAuth 2.0',
    icon: Shield,
    description: 'OAuth 2.0 authorization flow',
  },
  basic_auth: {
    label: 'Basic Auth',
    icon: Lock,
    description: 'Username and password authentication',
  },
  wedding_session: {
    label: 'Wedding Session',
    icon: Heart,
    description: 'Wedding-specific session authentication',
  },
};

interface EndpointConfigurationPanelProps {
  className?: string;
  onEndpointSave?: (endpoint: EndpointConfiguration) => void;
  onEndpointDelete?: (endpointId: string) => void;
  onEndpointTest?: (endpoint: EndpointConfiguration) => Promise<boolean>;
  initialEndpoints?: EndpointConfiguration[];
}

export default function EndpointConfigurationPanel({
  className,
  onEndpointSave,
  onEndpointDelete,
  onEndpointTest,
  initialEndpoints = [],
}: EndpointConfigurationPanelProps) {
  // State management
  const [endpoints, setEndpoints] =
    useState<EndpointConfiguration[]>(initialEndpoints);
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<EndpointConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Form management
  const form = useForm<EndpointConfiguration>({
    resolver: zodResolver(EndpointConfigurationSchema),
    defaultValues: {
      name: '',
      path: '/',
      method: 'GET',
      category: 'bookings',
      description: '',
      enabled: true,
      wedding_day_priority: 'normal',
      affects_wedding_day: false,
      emergency_override: false,
      venue_accessible: false,
      mobile_optimized: true,
      authentication: {
        type: 'api_key',
        required: true,
        wedding_session_required: false,
      },
      rate_limiting: {
        enabled: true,
        requests_per_minute: 100,
        requests_per_hour: 1000,
        burst_limit: 50,
        wedding_day_multiplier: 2,
      },
      sla: {
        response_time_ms: 1000,
        uptime_percentage: 99.9,
        wedding_day_response_time_ms: 500,
        wedding_day_uptime_percentage: 99.99,
        error_rate_threshold: 1,
      },
      headers: [],
      parameters: [],
      version: 'v1',
      deprecated: false,
      monitoring: {
        log_requests: true,
        log_responses: false,
        alert_on_errors: true,
        wedding_day_monitoring: true,
      },
      test_config: {
        test_cases: [],
      },
    },
  });

  // Field arrays for dynamic forms
  const {
    fields: headerFields,
    append: appendHeader,
    remove: removeHeader,
  } = useFieldArray({
    control: form.control,
    name: 'headers',
  });

  const {
    fields: parameterFields,
    append: appendParameter,
    remove: removeParameter,
  } = useFieldArray({
    control: form.control,
    name: 'parameters',
  });

  // Filter endpoints based on search and filters
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch =
      searchQuery === '' ||
      endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || endpoint.category === categoryFilter;
    const matchesPriority =
      priorityFilter === 'all' ||
      endpoint.wedding_day_priority === priorityFilter;
    const matchesActive = !showActiveOnly || endpoint.enabled;

    return matchesSearch && matchesCategory && matchesPriority && matchesActive;
  });

  // Handle endpoint selection
  const handleSelectEndpoint = useCallback(
    (endpoint: EndpointConfiguration) => {
      setSelectedEndpoint(endpoint);
      form.reset(endpoint);
      setIsEditing(false);
    },
    [form],
  );

  // Handle creating new endpoint
  const handleCreateNew = useCallback(() => {
    setSelectedEndpoint(null);
    form.reset({
      name: '',
      path: '/',
      method: 'GET',
      category: 'bookings',
      description: '',
      enabled: true,
      wedding_day_priority: 'normal',
      affects_wedding_day: false,
      emergency_override: false,
      venue_accessible: false,
      mobile_optimized: true,
      authentication: {
        type: 'api_key',
        required: true,
        wedding_session_required: false,
      },
      rate_limiting: {
        enabled: true,
        requests_per_minute: 100,
        requests_per_hour: 1000,
        burst_limit: 50,
        wedding_day_multiplier: 2,
      },
      sla: {
        response_time_ms: 1000,
        uptime_percentage: 99.9,
        wedding_day_response_time_ms: 500,
        wedding_day_uptime_percentage: 99.99,
        error_rate_threshold: 1,
      },
      headers: [],
      parameters: [],
      version: 'v1',
      deprecated: false,
      monitoring: {
        log_requests: true,
        log_responses: false,
        alert_on_errors: true,
        wedding_day_monitoring: true,
      },
      test_config: {
        test_cases: [],
      },
    });
    setIsCreating(true);
    setIsEditing(true);
  }, [form]);

  // Handle saving endpoint
  const handleSaveEndpoint = useCallback(
    async (data: EndpointConfiguration) => {
      setIsLoading(true);
      try {
        const endpointData = {
          ...data,
          id: selectedEndpoint?.id || `endpoint_${Date.now()}`,
          created_at: selectedEndpoint?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (isCreating) {
          setEndpoints((prev) => [...prev, endpointData]);
        } else {
          setEndpoints((prev) =>
            prev.map((ep) => (ep.id === endpointData.id ? endpointData : ep)),
          );
        }

        setSelectedEndpoint(endpointData);
        setIsEditing(false);
        setIsCreating(false);

        onEndpointSave?.(endpointData);
      } catch (error) {
        console.error('Failed to save endpoint:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedEndpoint?.id,
      selectedEndpoint?.created_at,
      isCreating,
      onEndpointSave,
    ],
  );

  // Handle deleting endpoint
  const handleDeleteEndpoint = useCallback(
    async (endpointId: string) => {
      if (
        !confirm(
          'Are you sure you want to delete this endpoint? This action cannot be undone.',
        )
      ) {
        return;
      }

      setIsLoading(true);
      try {
        setEndpoints((prev) => prev.filter((ep) => ep.id !== endpointId));
        if (selectedEndpoint?.id === endpointId) {
          setSelectedEndpoint(null);
        }
        onEndpointDelete?.(endpointId);
      } catch (error) {
        console.error('Failed to delete endpoint:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedEndpoint?.id, onEndpointDelete],
  );

  // Handle testing endpoint
  const handleTestEndpoint = useCallback(
    async (endpoint: EndpointConfiguration) => {
      if (!onEndpointTest) return;

      setIsLoading(true);
      try {
        const result = await onEndpointTest(endpoint);
        setTestResults((prev) => ({
          ...prev,
          [endpoint.id!]: result,
        }));
      } catch (error) {
        console.error('Failed to test endpoint:', error);
        setTestResults((prev) => ({
          ...prev,
          [endpoint.id!]: false,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [onEndpointTest],
  );

  // Handle bulk operations
  const handleBulkEnable = useCallback(() => {
    const selectedIds = filteredEndpoints.map((ep) => ep.id!).filter(Boolean);
    setEndpoints((prev) =>
      prev.map((ep) =>
        selectedIds.includes(ep.id!) ? { ...ep, enabled: true } : ep,
      ),
    );
  }, [filteredEndpoints]);

  const handleBulkDisable = useCallback(() => {
    const selectedIds = filteredEndpoints.map((ep) => ep.id!).filter(Boolean);
    setEndpoints((prev) =>
      prev.map((ep) =>
        selectedIds.includes(ep.id!) ? { ...ep, enabled: false } : ep,
      ),
    );
  }, [filteredEndpoints]);

  return (
    <div className={`w-full h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="mb-4 lg:mb-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            API Endpoint Configuration
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure and manage API endpoints for wedding operations
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Endpoint
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleBulkEnable}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Bulk Enable
            </button>
            <button
              onClick={handleBulkDisable}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Bulk Disable
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Endpoint List */}
        <div className="w-full lg:w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {Object.entries(WEDDING_ENDPOINT_CATEGORIES).map(
                  ([key, category]) => (
                    <option key={key} value={key}>
                      {category.label}
                    </option>
                  ),
                )}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                {Object.entries(WEDDING_DAY_PRIORITIES).map(
                  ([key, priority]) => (
                    <option key={key} value={key}>
                      {priority.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="mr-2"
              />
              Show active endpoints only
            </label>
          </div>

          {/* Endpoint List */}
          <div className="flex-1 overflow-y-auto">
            {filteredEndpoints.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No endpoints found</p>
                <p className="text-sm">
                  {endpoints.length === 0
                    ? 'Create your first API endpoint to get started'
                    : 'Try adjusting your search or filter criteria'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredEndpoints.map((endpoint) => {
                  const category =
                    WEDDING_ENDPOINT_CATEGORIES[endpoint.category];
                  const priority =
                    WEDDING_DAY_PRIORITIES[endpoint.wedding_day_priority];
                  const testResult = testResults[endpoint.id!];
                  const CategoryIcon = category.icon;

                  return (
                    <div
                      key={endpoint.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedEndpoint?.id === endpoint.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectEndpoint(endpoint)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div
                            className={`p-2 rounded-lg ${category.color} text-white`}
                          >
                            <CategoryIcon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {endpoint.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  endpoint.method === 'GET'
                                    ? 'bg-green-100 text-green-700'
                                    : endpoint.method === 'POST'
                                      ? 'bg-blue-100 text-blue-700'
                                      : endpoint.method === 'PUT'
                                        ? 'bg-orange-100 text-orange-700'
                                        : endpoint.method === 'DELETE'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {endpoint.method}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {endpoint.path}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${priority.color}`}
                              >
                                {priority.label}
                              </span>

                              {endpoint.affects_wedding_day && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700">
                                  Wedding Day
                                </span>
                              )}

                              {endpoint.emergency_override && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                  Emergency
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 ml-2">
                          <div className="flex items-center gap-1">
                            {endpoint.enabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}

                            {testResult !== undefined && (
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  testResult ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              />
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestEndpoint(endpoint);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Test endpoint"
                          >
                            <TestTube className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Endpoint Configuration */}
        <div
          className={`flex-1 ${selectedEndpoint || isCreating ? 'block' : 'hidden lg:block'}`}
        >
          {selectedEndpoint || isCreating ? (
            <div className="h-full flex flex-col">
              {/* Configuration Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isCreating
                        ? 'Create New Endpoint'
                        : `Configure ${selectedEndpoint?.name}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {isCreating
                        ? 'Set up a new API endpoint for your wedding business'
                        : 'Modify endpoint settings and wedding-specific configurations'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </button>

                        {selectedEndpoint && (
                          <button
                            onClick={() =>
                              handleDeleteEndpoint(selectedEndpoint.id!)
                            }
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="submit"
                          form="endpoint-form"
                          disabled={isLoading}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isLoading ? 'Saving...' : 'Save'}
                        </button>

                        <button
                          onClick={() => {
                            setIsEditing(false);
                            if (isCreating) {
                              setSelectedEndpoint(null);
                              setIsCreating(false);
                            } else if (selectedEndpoint) {
                              form.reset(selectedEndpoint);
                            }
                          }}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="flex-1 overflow-y-auto p-6">
                <form
                  id="endpoint-form"
                  onSubmit={form.handleSubmit(handleSaveEndpoint)}
                  className="space-y-8"
                >
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      Basic Information
                    </h4>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Endpoint Name *
                        </label>
                        <input
                          {...form.register('name')}
                          disabled={!isEditing}
                          placeholder="e.g. Create Wedding Booking"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          HTTP Method *
                        </label>
                        <select
                          {...form.register('method')}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Endpoint Path *
                        </label>
                        <input
                          {...form.register('path')}
                          disabled={!isEditing}
                          placeholder="/api/v1/bookings"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        />
                        {form.formState.errors.path && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.path.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category *
                        </label>
                        <select
                          {...form.register('category')}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        >
                          {Object.entries(WEDDING_ENDPOINT_CATEGORIES).map(
                            ([key, category]) => (
                              <option key={key} value={key}>
                                {category.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        {...form.register('description')}
                        disabled={!isEditing}
                        rows={3}
                        placeholder="Describe what this endpoint does and how it helps wedding operations..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                      />
                      {form.formState.errors.description && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Wedding-Specific Settings */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      Wedding Day Configuration
                    </h4>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Wedding Day Priority *
                        </label>
                        <select
                          {...form.register('wedding_day_priority')}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        >
                          {Object.entries(WEDDING_DAY_PRIORITIES).map(
                            ([key, priority]) => (
                              <option key={key} value={key}>
                                {priority.label}
                              </option>
                            ),
                          )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {
                            WEDDING_DAY_PRIORITIES[
                              form.watch(
                                'wedding_day_priority',
                              ) as keyof typeof WEDDING_DAY_PRIORITIES
                            ]?.description
                          }
                        </p>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('enabled')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Endpoint Enabled
                            </span>
                            <p className="text-xs text-gray-500">
                              Enable this endpoint for production use
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('affects_wedding_day')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Affects Wedding Day Operations
                            </span>
                            <p className="text-xs text-gray-500">
                              Critical for wedding day coordination
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('emergency_override')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Emergency Override Available
                            </span>
                            <p className="text-xs text-gray-500">
                              Can bypass rate limits during emergencies
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('venue_accessible')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Venue Accessible
                            </span>
                            <p className="text-xs text-gray-500">
                              Available for venue staff on-site
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('mobile_optimized')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Mobile Optimized
                            </span>
                            <p className="text-xs text-gray-500">
                              Optimized for mobile device usage
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Configuration */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      Authentication & Security
                    </h4>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Authentication Type *
                        </label>
                        <select
                          {...form.register('authentication.type')}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        >
                          {Object.entries(AUTHENTICATION_TYPES).map(
                            ([key, auth]) => (
                              <option key={key} value={key}>
                                {auth.label}
                              </option>
                            ),
                          )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {
                            AUTHENTICATION_TYPES[
                              form.watch(
                                'authentication.type',
                              ) as keyof typeof AUTHENTICATION_TYPES
                            ]?.description
                          }
                        </p>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register('authentication.required')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Authentication Required
                            </span>
                            <p className="text-xs text-gray-500">
                              Require authentication for this endpoint
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            {...form.register(
                              'authentication.wedding_session_required',
                            )}
                            type="checkbox"
                            disabled={!isEditing}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Wedding Session Required
                            </span>
                            <p className="text-xs text-gray-500">
                              Must be part of active wedding session
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Empty state
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select an Endpoint
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                  Choose an endpoint from the list to configure its settings, or
                  create a new endpoint to get started with your wedding API
                  management.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Endpoint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay for endpoint list */}
      {(selectedEndpoint || isCreating) && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" />
      )}
    </div>
  );
}
