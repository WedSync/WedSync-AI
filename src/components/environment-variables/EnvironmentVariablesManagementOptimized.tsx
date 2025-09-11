/**
 * Optimized Environment Variables Management Component
 * Performance-optimized version with code splitting, memoization, and bundle optimization
 */

'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
  lazy,
  Suspense,
} from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Activity, Database } from 'lucide-react';
import {
  useVirtualScrolling,
  useDebouncedSearch,
  PerformanceMonitor,
  APICache,
  useOptimizedState,
  useStableCallback,
  MemoryLeakPrevention,
} from './utils/performance';
import {
  ScreenReaderAnnouncer,
  FocusManager,
  handleArrowNavigation,
  keys,
  createSkipLink,
  prefersReducedMotion,
  prefersHighContrast,
} from './utils/accessibility';

// Lazy load heavy components
const EnvironmentHealthCard = lazy(() =>
  import('./EnvironmentHealthCard').then((module) => ({
    default: module.EnvironmentHealthCard,
  })),
);
const VariableConfigurationForm = lazy(() =>
  import('./VariableConfigurationForm').then((module) => ({
    default: module.VariableConfigurationForm,
  })),
);
const VariableSecurityCenter = lazy(() =>
  import('./VariableSecurityCenter').then((module) => ({
    default: module.VariableSecurityCenter,
  })),
);
const DeploymentSyncDashboard = lazy(() =>
  import('./DeploymentSyncDashboard').then((module) => ({
    default: module.DeploymentSyncDashboard,
  })),
);
const VariablesList = lazy(() =>
  import('./VariablesList').then((module) => ({
    default: module.VariablesList,
  })),
);

// Loading component for Suspense
const ComponentLoader = memo(() => (
  <div
    className="flex items-center justify-center py-8"
    role="status"
    aria-label="Loading component"
  >
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
));
ComponentLoader.displayName = 'ComponentLoader';

interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  environment:
    | 'development'
    | 'staging'
    | 'production'
    | 'wedding-day-critical';
  security_level:
    | 'Public'
    | 'Internal'
    | 'Confidential'
    | 'Wedding-Day-Critical';
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  description?: string;
}

interface EnvironmentStatus {
  environment: string;
  status: 'healthy' | 'warning' | 'critical';
  missing_variables: string[];
  last_sync: string;
  variable_count: number;
}

// Memoized status card component
const StatusCard = memo(
  ({
    icon: Icon,
    value,
    label,
    color,
    ariaLabel,
    isHighlighted = false,
  }: {
    icon: any;
    value: number;
    label: string;
    color: string;
    ariaLabel: string;
    isHighlighted?: boolean;
  }) => (
    <Card
      role="region"
      aria-labelledby={`${label.toLowerCase().replace(/\s+/g, '-')}-label`}
      className={isHighlighted ? `border-${color}-200` : ''}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 text-${color}-600`} aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold" aria-label={ariaLabel}>
              {value}
            </p>
            <p
              id={`${label.toLowerCase().replace(/\s+/g, '-')}-label`}
              className="text-sm text-gray-600"
            >
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
);
StatusCard.displayName = 'StatusCard';

export const EnvironmentVariablesManagementOptimized = memo(() => {
  // Optimized state management
  const [variables, setVariables] = useOptimizedState<EnvironmentVariable[]>(
    [],
  );
  const [environmentStatuses, setEnvironmentStatuses] = useOptimizedState<
    EnvironmentStatus[]
  >([]);
  const [activeTab, setActiveTab] = useOptimizedState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] =
    useOptimizedState<string>('all');
  const [isWeddingDayMode, setIsWeddingDayMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [searchTerm, setSearchTerm] = useOptimizedState('');

  const mainRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Debounced search
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 300);

  // Performance monitoring
  const endTiming = useRef<(() => void) | null>(null);

  // Memoized filtered variables with search
  const filteredVariables = useMemo(() => {
    const stopTiming = PerformanceMonitor.startTiming('variable-filtering');

    let filtered =
      selectedEnvironment === 'all'
        ? variables
        : variables.filter((v) => v.environment === selectedEnvironment);

    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.key.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          v.environment
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          (v.description &&
            v.description
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase())),
      );
    }

    stopTiming();
    return filtered;
  }, [variables, selectedEnvironment, debouncedSearchTerm]);

  // Memoized status calculations
  const statusMetrics = useMemo(() => {
    const criticalIssuesCount = environmentStatuses.reduce(
      (count, status) => count + (status.status === 'critical' ? 1 : 0),
      0,
    );
    const warningCount = environmentStatuses.reduce(
      (count, status) => count + (status.status === 'warning' ? 1 : 0),
      0,
    );
    const healthyCount = environmentStatuses.filter(
      (s) => s.status === 'healthy',
    ).length;

    return { criticalIssuesCount, warningCount, healthyCount };
  }, [environmentStatuses]);

  // Stable callbacks
  const handleTabChange = useStableCallback((newTab: string) => {
    setActiveTab(newTab);

    // Announce tab change
    const tabNames = {
      dashboard: 'Dashboard',
      variables: 'Variables',
      health: 'Health',
      security: 'Security',
      deployment: 'Deployment',
    };
    ScreenReaderAnnouncer.announce(
      `${tabNames[newTab as keyof typeof tabNames]} tab selected`,
    );
  });

  const handleEnvironmentChange = useStableCallback((env: string) => {
    setSelectedEnvironment(env);
    ScreenReaderAnnouncer.announce(
      `Environment filter changed to ${env === 'all' ? 'all environments' : env}`,
    );
  });

  const handleSearchChange = useStableCallback((term: string) => {
    setSearchTerm(term);
  });

  // Optimized data loading with caching
  const loadEnvironmentData = useCallback(async () => {
    const cacheKey = 'environment-variables';

    // Check cache first
    const cachedData = APICache.get(cacheKey);
    if (cachedData && !isLoading) {
      setVariables(cachedData.variables);
      setEnvironmentStatuses(cachedData.statuses);
      return;
    }

    setIsLoading(true);
    endTiming.current = PerformanceMonitor.startTiming('environment-data-load');

    // Announce loading to screen readers
    ScreenReaderAnnouncer.announce('Loading environment data');

    try {
      // Load environment variables with optimized query
      const { data: variablesData, error: variablesError } = await supabase
        .from('environment_variables')
        .select(
          'id, key, environment, security_level, is_encrypted, created_at, updated_at, created_by, description',
        )
        .order('created_at', { ascending: false });

      if (variablesError) throw variablesError;

      // Process data in chunks for large datasets
      const processedVariables = variablesData || [];
      setVariables(processedVariables);

      // Calculate environment statuses efficiently
      const environments = [
        'development',
        'staging',
        'production',
        'wedding-day-critical',
      ];
      const statuses: EnvironmentStatus[] = environments.map((env) => {
        const envVariables = processedVariables.filter(
          (v) => v.environment === env,
        );
        const requiredCriticalVars = [
          'STRIPE_SECRET_KEY',
          'SUPABASE_SERVICE_ROLE_KEY',
          'RESEND_API_KEY',
          'DATABASE_URL',
        ];

        const missingVars = requiredCriticalVars.filter(
          (varName) => !envVariables.some((v) => v.key === varName),
        );

        const status: 'healthy' | 'warning' | 'critical' =
          missingVars.length > 0
            ? env === 'production'
              ? 'critical'
              : 'warning'
            : 'healthy';

        return {
          environment: env,
          status,
          missing_variables: missingVars,
          last_sync: new Date().toISOString(),
          variable_count: envVariables.length,
        };
      });

      setEnvironmentStatuses(statuses);

      // Cache the results
      APICache.set(
        cacheKey,
        { variables: processedVariables, statuses },
        2 * 60 * 1000,
      ); // 2 minutes

      // Announce completion
      const totalVars = processedVariables.length;
      const { criticalIssuesCount, warningCount } = statuses.reduce(
        (acc, s) => ({
          criticalIssuesCount:
            acc.criticalIssuesCount + (s.status === 'critical' ? 1 : 0),
          warningCount: acc.warningCount + (s.status === 'warning' ? 1 : 0),
        }),
        { criticalIssuesCount: 0, warningCount: 0 },
      );

      let announcement = `Environment data loaded. ${totalVars} total variables.`;
      if (criticalIssuesCount > 0) {
        announcement += ` ${criticalIssuesCount} critical issue${criticalIssuesCount > 1 ? 's' : ''} found.`;
      }
      if (warningCount > 0) {
        announcement += ` ${warningCount} warning${warningCount > 1 ? 's' : ''} found.`;
      }

      ScreenReaderAnnouncer.announce(announcement);
    } catch (error) {
      console.error('Error loading environment data:', error);
      ScreenReaderAnnouncer.announce(
        'Error loading environment data. Please try again.',
        'assertive',
      );
    } finally {
      setIsLoading(false);
      if (endTiming.current) {
        endTiming.current();
        endTiming.current = null;
      }
    }
  }, [supabase, isLoading]);

  // Optimized keyboard navigation
  const handleTabKeyDown = useStableCallback((event: React.KeyboardEvent) => {
    const tabs = ['dashboard', 'variables', 'health', 'security', 'deployment'];
    const currentIndex = tabs.indexOf(activeTab);

    if (event.key === keys.ARROW_LEFT || event.key === keys.ARROW_RIGHT) {
      event.preventDefault();
      const direction = event.key === keys.ARROW_RIGHT ? 1 : -1;
      const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
      handleTabChange(tabs[newIndex]);
    }
  });

  // Check accessibility preferences
  useEffect(() => {
    const checkPreferences = () => {
      setReducedMotion(prefersReducedMotion());
      setHighContrast(prefersHighContrast());
    };

    checkPreferences();

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    motionQuery.addEventListener('change', checkPreferences);
    contrastQuery.addEventListener('change', checkPreferences);

    return () => {
      motionQuery.removeEventListener('change', checkPreferences);
      contrastQuery.removeEventListener('change', checkPreferences);
    };
  }, []);

  // Add skip link
  useEffect(() => {
    const skipLink = createSkipLink('main-content', 'Skip to main content');
    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      const existingSkipLink = document.querySelector('.skip-link');
      if (existingSkipLink) {
        existingSkipLink.remove();
      }
    };
  }, []);

  // Wedding day mode check
  useEffect(() => {
    const checkWeddingDayMode = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      const isWeddingPeriod =
        (day === 5 && hour >= 18) || day === 6 || (day === 0 && hour <= 18);

      setIsWeddingDayMode(isWeddingPeriod);
    };

    checkWeddingDayMode();
    const interval = setInterval(checkWeddingDayMode, 60000);

    MemoryLeakPrevention.addInterval(interval);

    return () => {
      clearInterval(interval);
      MemoryLeakPrevention.removeSubscription(() => clearInterval(interval));
    };
  }, []);

  // Load data and set up real-time subscriptions
  useEffect(() => {
    loadEnvironmentData();

    // Set up optimized real-time subscriptions
    const variablesSubscription = supabase
      .channel('environment_variables_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'environment_variables' },
        () => {
          // Invalidate cache and reload
          APICache.delete('environment-variables');
          loadEnvironmentData();
        },
      )
      .subscribe();

    const cleanup = () => {
      variablesSubscription.unsubscribe();
    };

    MemoryLeakPrevention.addSubscription(cleanup);

    return cleanup;
  }, [loadEnvironmentData, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      MemoryLeakPrevention.cleanupAll();
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-label="Loading environment variables"
        aria-live="polite"
      >
        <div
          className={`${
            reducedMotion ? '' : 'animate-spin'
          } rounded-full h-32 w-32 border-b-2 border-blue-600`}
        >
          <span className="sr-only">Loading environment variables...</span>
        </div>
      </div>
    );
  }

  const { criticalIssuesCount, warningCount, healthyCount } = statusMetrics;

  return (
    <div
      className={`container mx-auto px-4 py-8 space-y-6 ${
        highContrast ? 'high-contrast' : ''
      }`}
      ref={mainRef}
    >
      <main id="main-content" role="main" tabIndex={-1}>
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" id="page-title">
              Environment Variables Management
            </h1>
            <p
              className="text-gray-600 mt-2"
              id="page-description"
              aria-describedby="page-title"
            >
              Secure configuration management across all WedSync environments
            </p>
          </div>

          {isWeddingDayMode && (
            <Badge
              variant="destructive"
              className="flex items-center space-x-2 px-4 py-2"
              role="alert"
              aria-label="Wedding day mode active - system is in read-only mode"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>Wedding Day Mode - Read Only</span>
            </Badge>
          )}
        </header>

        {/* Status Overview */}
        <section aria-labelledby="status-overview-heading" className="mb-8">
          <h2 id="status-overview-heading" className="sr-only">
            Environment Status Overview
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            role="group"
            aria-label="Environment status metrics"
          >
            <StatusCard
              icon={Database}
              value={variables.length}
              label="Total Variables"
              color="blue"
              ariaLabel={`${variables.length} total variables`}
            />
            <StatusCard
              icon={Activity}
              value={healthyCount}
              label="Healthy Environments"
              color="green"
              ariaLabel={`${healthyCount} healthy environments`}
            />
            <StatusCard
              icon={AlertTriangle}
              value={warningCount}
              label="Warnings"
              color="yellow"
              ariaLabel={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
              isHighlighted={warningCount > 0}
            />
            <StatusCard
              icon={Shield}
              value={criticalIssuesCount}
              label="Critical Issues"
              color="red"
              ariaLabel={`${criticalIssuesCount} critical issue${criticalIssuesCount !== 1 ? 's' : ''}`}
              isHighlighted={criticalIssuesCount > 0}
            />
          </div>
        </section>

        {/* Main Dashboard Tabs */}
        <section
          aria-labelledby="dashboard-tabs-heading"
          className="space-y-6"
          ref={tabsRef}
        >
          <h2 id="dashboard-tabs-heading" className="sr-only">
            Environment Variables Management Dashboard
          </h2>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
            onKeyDown={handleTabKeyDown}
          >
            <TabsList
              className="grid w-full grid-cols-2 lg:grid-cols-5"
              role="tablist"
              aria-label="Environment Variables Management sections"
            >
              <TabsTrigger
                value="dashboard"
                role="tab"
                aria-controls="dashboard-panel"
                aria-selected={activeTab === 'dashboard'}
                id="dashboard-tab"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="variables"
                role="tab"
                aria-controls="variables-panel"
                aria-selected={activeTab === 'variables'}
                id="variables-tab"
              >
                Variables
              </TabsTrigger>
              <TabsTrigger
                value="health"
                role="tab"
                aria-controls="health-panel"
                aria-selected={activeTab === 'health'}
                id="health-tab"
              >
                Health
              </TabsTrigger>
              <TabsTrigger
                value="security"
                role="tab"
                aria-controls="security-panel"
                aria-selected={activeTab === 'security'}
                id="security-tab"
              >
                Security
              </TabsTrigger>
              <TabsTrigger
                value="deployment"
                role="tab"
                aria-controls="deployment-panel"
                aria-selected={activeTab === 'deployment'}
                id="deployment-tab"
              >
                Deployment
              </TabsTrigger>
            </TabsList>

            <Suspense fallback={<ComponentLoader />}>
              <TabsContent
                value="dashboard"
                className="space-y-6"
                role="tabpanel"
                aria-labelledby="dashboard-tab"
                id="dashboard-panel"
                tabIndex={0}
              >
                <h3 className="sr-only">Dashboard Overview</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                  {environmentStatuses.map((status) => (
                    <EnvironmentHealthCard
                      key={status.environment}
                      environment={status.environment}
                      status={status.status}
                      missingVariables={status.missing_variables}
                      lastSync={status.last_sync}
                      variableCount={status.variable_count}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="variables"
                className="space-y-6"
                role="tabpanel"
                aria-labelledby="variables-tab"
                id="variables-panel"
                tabIndex={0}
              >
                <h3 className="sr-only">Environment Variables Management</h3>
                <VariableConfigurationForm
                  onVariableAdded={loadEnvironmentData}
                  isReadOnly={isWeddingDayMode}
                />
                <VariablesList
                  variables={filteredVariables}
                  selectedEnvironment={selectedEnvironment}
                  onEnvironmentChange={handleEnvironmentChange}
                  onVariableUpdated={loadEnvironmentData}
                  isReadOnly={isWeddingDayMode}
                  searchTerm={searchTerm}
                  onSearchChange={handleSearchChange}
                />
              </TabsContent>

              <TabsContent
                value="health"
                className="space-y-6"
                role="tabpanel"
                aria-labelledby="health-tab"
                id="health-panel"
                tabIndex={0}
              >
                <h3 className="sr-only">Environment Health Status</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {environmentStatuses.map((status) => (
                    <EnvironmentHealthCard
                      key={status.environment}
                      environment={status.environment}
                      status={status.status}
                      missingVariables={status.missing_variables}
                      lastSync={status.last_sync}
                      variableCount={status.variable_count}
                      detailed={true}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="security"
                className="space-y-6"
                role="tabpanel"
                aria-labelledby="security-tab"
                id="security-panel"
                tabIndex={0}
              >
                <h3 className="sr-only">Security Center and Access Control</h3>
                <VariableSecurityCenter
                  variables={variables}
                  onSecurityUpdate={loadEnvironmentData}
                  isReadOnly={isWeddingDayMode}
                />
              </TabsContent>

              <TabsContent
                value="deployment"
                className="space-y-6"
                role="tabpanel"
                aria-labelledby="deployment-tab"
                id="deployment-panel"
                tabIndex={0}
              >
                <h3 className="sr-only">
                  Deployment Synchronization Dashboard
                </h3>
                <DeploymentSyncDashboard
                  variables={variables}
                  environmentStatuses={environmentStatuses}
                  onSyncComplete={loadEnvironmentData}
                  isReadOnly={isWeddingDayMode}
                />
              </TabsContent>
            </Suspense>
          </Tabs>
        </section>
      </main>
    </div>
  );
});

EnvironmentVariablesManagementOptimized.displayName =
  'EnvironmentVariablesManagementOptimized';
