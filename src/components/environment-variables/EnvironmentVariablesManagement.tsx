'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Shield,
  Activity,
  Settings,
  Database,
} from 'lucide-react';
import { EnvironmentHealthCard } from './EnvironmentHealthCard';
import { VariableConfigurationForm } from './VariableConfigurationForm';
import { VariableSecurityCenter } from './VariableSecurityCenter';
import { DeploymentSyncDashboard } from './DeploymentSyncDashboard';
import { VariablesList } from './VariablesList';
import {
  ScreenReaderAnnouncer,
  FocusManager,
  handleArrowNavigation,
  keys,
  roles,
  createSkipLink,
  prefersReducedMotion,
  prefersHighContrast,
} from './utils/accessibility';

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

export function EnvironmentVariablesManagement() {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [environmentStatuses, setEnvironmentStatuses] = useState<
    EnvironmentStatus[]
  >([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [isWeddingDayMode, setIsWeddingDayMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Check for accessibility preferences
  useEffect(() => {
    const checkPreferences = () => {
      setReducedMotion(prefersReducedMotion());
      setHighContrast(prefersHighContrast());
    };

    checkPreferences();

    // Listen for preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    motionQuery.addEventListener('change', checkPreferences);
    contrastQuery.addEventListener('change', checkPreferences);

    return () => {
      motionQuery.removeEventListener('change', checkPreferences);
      contrastQuery.removeEventListener('change', checkPreferences);
    };
  }, []);

  // Add skip link on mount
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

  // Check if it's wedding day (Friday 6PM - Sunday 6PM)
  useEffect(() => {
    const checkWeddingDayMode = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const hour = now.getHours();

      const isWeddingPeriod =
        (day === 5 && hour >= 18) || // Friday after 6PM
        day === 6 || // All Saturday
        (day === 0 && hour <= 18); // Sunday before 6PM

      setIsWeddingDayMode(isWeddingPeriod);
    };

    checkWeddingDayMode();
    const interval = setInterval(checkWeddingDayMode, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Load environment variables and statuses
  useEffect(() => {
    loadEnvironmentData();

    // Set up real-time subscriptions
    const variablesSubscription = supabase
      .channel('environment_variables_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'environment_variables' },
        () => {
          loadEnvironmentData();
        },
      )
      .subscribe();

    return () => {
      variablesSubscription.unsubscribe();
    };
  }, []);

  const loadEnvironmentData = async () => {
    setIsLoading(true);

    // Announce loading to screen readers
    ScreenReaderAnnouncer.announce('Loading environment data');

    try {
      // Load environment variables
      const { data: variablesData, error: variablesError } = await supabase
        .from('environment_variables')
        .select('*')
        .order('created_at', { ascending: false });

      if (variablesError) throw variablesError;
      setVariables(variablesData || []);

      // Calculate environment statuses
      const environments = [
        'development',
        'staging',
        'production',
        'wedding-day-critical',
      ];
      const statuses: EnvironmentStatus[] = environments.map((env) => {
        const envVariables =
          variablesData?.filter((v) => v.environment === env) || [];
        const criticalVars =
          variablesData?.filter(
            (v) =>
              v.security_level === 'Wedding-Day-Critical' &&
              v.environment === env,
          ) || [];

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        const missingVars: string[] = [];

        // Check for missing critical variables
        const requiredCriticalVars = [
          'STRIPE_SECRET_KEY',
          'SUPABASE_SERVICE_ROLE_KEY',
          'RESEND_API_KEY',
          'DATABASE_URL',
        ];

        requiredCriticalVars.forEach((varName) => {
          if (!envVariables.some((v) => v.key === varName)) {
            missingVars.push(varName);
          }
        });

        if (missingVars.length > 0) {
          status = env === 'production' ? 'critical' : 'warning';
        }

        return {
          environment: env,
          status,
          missing_variables: missingVars,
          last_sync: new Date().toISOString(),
          variable_count: envVariables.length,
        };
      });

      setEnvironmentStatuses(statuses);

      // Announce completion to screen readers
      const totalVars = variablesData?.length || 0;
      const criticalCount = statuses.reduce(
        (count, s) => count + (s.status === 'critical' ? 1 : 0),
        0,
      );
      const warningCount = statuses.reduce(
        (count, s) => count + (s.status === 'warning' ? 1 : 0),
        0,
      );

      let announcement = `Environment data loaded. ${totalVars} total variables.`;
      if (criticalCount > 0) {
        announcement += ` ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} found.`;
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
    }
  };

  // Handle tab navigation with keyboard
  const handleTabKeyDown = (event: React.KeyboardEvent) => {
    const tabs = ['dashboard', 'variables', 'health', 'security', 'deployment'];
    const currentIndex = tabs.indexOf(activeTab);

    if (event.key === keys.ARROW_LEFT || event.key === keys.ARROW_RIGHT) {
      event.preventDefault();
      const direction = event.key === keys.ARROW_RIGHT ? 1 : -1;
      const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setActiveTab(tabs[newIndex]);

      // Announce tab change
      const tabNames = {
        dashboard: 'Dashboard',
        variables: 'Variables',
        health: 'Health',
        security: 'Security',
        deployment: 'Deployment',
      };
      ScreenReaderAnnouncer.announce(
        `${tabNames[tabs[newIndex] as keyof typeof tabNames]} tab selected`,
      );
    }
  };

  const filteredVariables =
    selectedEnvironment === 'all'
      ? variables
      : variables.filter((v) => v.environment === selectedEnvironment);

  const criticalIssuesCount = environmentStatuses.reduce(
    (count, status) => count + (status.status === 'critical' ? 1 : 0),
    0,
  );

  const warningCount = environmentStatuses.reduce(
    (count, status) => count + (status.status === 'warning' ? 1 : 0),
    0,
  );

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

  return (
    <div
      className={`container mx-auto px-4 py-8 space-y-6 ${
        highContrast ? 'high-contrast' : ''
      }`}
      ref={mainRef}
    >
      {/* Main content landmark */}
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
            <Card role="region" aria-labelledby="total-vars-label">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Database
                    className="h-5 w-5 text-blue-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p
                      className="text-2xl font-bold"
                      aria-label={`${variables.length} total variables`}
                    >
                      {variables.length}
                    </p>
                    <p id="total-vars-label" className="text-sm text-gray-600">
                      Total Variables
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card role="region" aria-labelledby="healthy-envs-label">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity
                    className="h-5 w-5 text-green-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p
                      className="text-2xl font-bold"
                      aria-label={`${environmentStatuses.filter((s) => s.status === 'healthy').length} healthy environments`}
                    >
                      {
                        environmentStatuses.filter(
                          (s) => s.status === 'healthy',
                        ).length
                      }
                    </p>
                    <p
                      id="healthy-envs-label"
                      className="text-sm text-gray-600"
                    >
                      Healthy Environments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              role="region"
              aria-labelledby="warnings-label"
              className={warningCount > 0 ? 'border-yellow-200' : ''}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle
                    className="h-5 w-5 text-yellow-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p
                      className="text-2xl font-bold"
                      aria-label={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
                    >
                      {warningCount}
                    </p>
                    <p id="warnings-label" className="text-sm text-gray-600">
                      Warnings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              role="region"
              aria-labelledby="critical-issues-label"
              className={criticalIssuesCount > 0 ? 'border-red-200' : ''}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <div>
                    <p
                      className="text-2xl font-bold"
                      aria-label={`${criticalIssuesCount} critical issue${criticalIssuesCount !== 1 ? 's' : ''}`}
                    >
                      {criticalIssuesCount}
                    </p>
                    <p
                      id="critical-issues-label"
                      className="text-sm text-gray-600"
                    >
                      Critical Issues
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            onValueChange={setActiveTab}
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
                onEnvironmentChange={setSelectedEnvironment}
                onVariableUpdated={loadEnvironmentData}
                isReadOnly={isWeddingDayMode}
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
              <h3 className="sr-only">Deployment Synchronization Dashboard</h3>
              <DeploymentSyncDashboard
                variables={variables}
                environmentStatuses={environmentStatuses}
                onSyncComplete={loadEnvironmentData}
                isReadOnly={isWeddingDayMode}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
