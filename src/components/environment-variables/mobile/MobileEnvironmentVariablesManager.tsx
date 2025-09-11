'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Shield,
  Activity,
  Settings,
  Database,
  Menu,
  X,
  ChevronLeft,
  Plus,
  Search,
  Filter,
} from 'lucide-react';
import { MobileVariableCard } from './MobileVariableCard';
import { MobileVariableForm } from './MobileVariableForm';
import { MobileHealthOverview } from './MobileHealthOverview';

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

interface MobileView {
  type: 'dashboard' | 'variables' | 'health' | 'security' | 'add-variable';
  title: string;
}

export function MobileEnvironmentVariablesManager() {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<
    EnvironmentVariable[]
  >([]);
  const [currentView, setCurrentView] = useState<MobileView>({
    type: 'dashboard',
    title: 'Environment Variables',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [isWeddingDayMode, setIsWeddingDayMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const supabase = createClientComponentClient();

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Check wedding day mode
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
    return () => clearInterval(interval);
  }, []);

  // Check offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Load data
  useEffect(() => {
    loadEnvironmentData();
  }, []);

  // Filter variables
  useEffect(() => {
    let filtered = variables;

    if (searchQuery) {
      filtered = filtered.filter(
        (v) =>
          v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (environmentFilter !== 'all') {
      filtered = filtered.filter((v) => v.environment === environmentFilter);
    }

    setFilteredVariables(filtered);
  }, [variables, searchQuery, environmentFilter]);

  const loadEnvironmentData = async () => {
    setIsLoading(true);
    try {
      const { data: variablesData, error } = await supabase
        .from('environment_variables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVariables(variablesData || []);
    } catch (error) {
      console.error('Error loading environment data:', error);

      // Try to load from localStorage if offline
      const cachedData = localStorage.getItem('cached_environment_variables');
      if (cachedData) {
        setVariables(JSON.parse(cachedData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save to localStorage for offline functionality
  useEffect(() => {
    if (variables.length > 0) {
      localStorage.setItem(
        'cached_environment_variables',
        JSON.stringify(variables),
      );
    }
  }, [variables]);

  const navigateToView = (view: MobileView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const goBack = () => {
    setCurrentView({ type: 'dashboard', title: 'Environment Variables' });
  };

  const getStatusMetrics = () => {
    const total = variables.length;
    const encrypted = variables.filter((v) => v.is_encrypted).length;
    const critical = variables.filter(
      (v) => v.security_level === 'Wedding-Day-Critical',
    ).length;
    const production = variables.filter(
      (v) => v.environment === 'production',
    ).length;

    return { total, encrypted, critical, production };
  };

  const metrics = getStatusMetrics();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading environment variables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            {currentView.type !== 'dashboard' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="p-2 min-h-[48px] min-w-[48px]" // Touch target
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentView.title}
              </h1>
              {isOffline && (
                <p className="text-xs text-orange-600">Offline Mode</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isWeddingDayMode && (
              <Badge variant="destructive" className="text-xs px-2 py-1">
                Wedding Day
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 min-h-[48px] min-w-[48px]"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        {currentView.type === 'dashboard' && (
          <div className="px-4 pb-3 grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {metrics.total}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {metrics.encrypted}
              </div>
              <div className="text-xs text-gray-600">Encrypted</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {metrics.critical}
              </div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {metrics.production}
              </div>
              <div className="text-xs text-gray-600">Production</div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="fixed right-0 top-16 w-64 bg-white border-l border-gray-200 h-full shadow-xl">
            <div className="p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[48px] text-left"
                onClick={() =>
                  navigateToView({ type: 'dashboard', title: 'Dashboard' })
                }
              >
                <Activity className="h-5 w-5 mr-3" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[48px] text-left"
                onClick={() =>
                  navigateToView({ type: 'variables', title: 'Variables' })
                }
              >
                <Database className="h-5 w-5 mr-3" />
                Variables
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[48px] text-left"
                onClick={() =>
                  navigateToView({ type: 'health', title: 'Health Status' })
                }
              >
                <Shield className="h-5 w-5 mr-3" />
                Health Status
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-[48px] text-left"
                onClick={() =>
                  navigateToView({ type: 'security', title: 'Security' })
                }
              >
                <Settings className="h-5 w-5 mr-3" />
                Security
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20">
        {' '}
        {/* Extra padding for bottom navigation */}
        {currentView.type === 'dashboard' && (
          <div className="p-4 space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="min-h-[48px] flex flex-col space-y-1"
                    onClick={() =>
                      navigateToView({
                        type: 'add-variable',
                        title: 'Add Variable',
                      })
                    }
                    disabled={isWeddingDayMode}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Add Variable</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[48px] flex flex-col space-y-1"
                    onClick={() =>
                      navigateToView({ type: 'health', title: 'Health Status' })
                    }
                  >
                    <Shield className="h-5 w-5" />
                    <span className="text-xs">Health Check</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Variables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {variables.slice(0, 3).map((variable) => (
                    <MobileVariableCard
                      key={variable.id}
                      variable={variable}
                      onUpdate={loadEnvironmentData}
                      isReadOnly={isWeddingDayMode}
                    />
                  ))}
                  {variables.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full min-h-[48px]"
                      onClick={() =>
                        navigateToView({
                          type: 'variables',
                          title: 'All Variables',
                        })
                      }
                    >
                      View All {variables.length} Variables
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {currentView.type === 'variables' && (
          <div className="p-4 space-y-4">
            {/* Search and Filter */}
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search variables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px]"
                />
              </div>
              <Button
                variant="outline"
                className="px-3 min-h-[48px] min-w-[48px]"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>

            {/* Environment Filter Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[
                'all',
                'development',
                'staging',
                'production',
                'wedding-day-critical',
              ].map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvironmentFilter(env)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[40px] ${
                    environmentFilter === env
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {env === 'all'
                    ? 'All'
                    : env.charAt(0).toUpperCase() + env.slice(1)}
                </button>
              ))}
            </div>

            {/* Variables List */}
            <div className="space-y-3">
              {filteredVariables.map((variable) => (
                <MobileVariableCard
                  key={variable.id}
                  variable={variable}
                  onUpdate={loadEnvironmentData}
                  isReadOnly={isWeddingDayMode}
                />
              ))}
            </div>

            {filteredVariables.length === 0 && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No variables found</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        )}
        {currentView.type === 'health' && (
          <div className="p-4">
            <MobileHealthOverview variables={variables} />
          </div>
        )}
        {currentView.type === 'add-variable' && (
          <div className="p-4">
            <MobileVariableForm
              onVariableAdded={() => {
                loadEnvironmentData();
                goBack();
              }}
              isReadOnly={isWeddingDayMode}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation (Thumb-Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Button
            variant={currentView.type === 'dashboard' ? 'default' : 'ghost'}
            className="flex flex-col items-center space-y-1 min-h-[56px] text-xs"
            onClick={() =>
              navigateToView({ type: 'dashboard', title: 'Dashboard' })
            }
          >
            <Activity className="h-5 w-5" />
            <span>Dashboard</span>
          </Button>
          <Button
            variant={currentView.type === 'variables' ? 'default' : 'ghost'}
            className="flex flex-col items-center space-y-1 min-h-[56px] text-xs"
            onClick={() =>
              navigateToView({ type: 'variables', title: 'Variables' })
            }
          >
            <Database className="h-5 w-5" />
            <span>Variables</span>
          </Button>
          <Button
            variant={currentView.type === 'health' ? 'default' : 'ghost'}
            className="flex flex-col items-center space-y-1 min-h-[56px] text-xs"
            onClick={() => navigateToView({ type: 'health', title: 'Health' })}
          >
            <Shield className="h-5 w-5" />
            <span>Health</span>
          </Button>
          <Button
            variant={currentView.type === 'add-variable' ? 'default' : 'ghost'}
            className="flex flex-col items-center space-y-1 min-h-[56px] text-xs"
            onClick={() =>
              navigateToView({ type: 'add-variable', title: 'Add Variable' })
            }
            disabled={isWeddingDayMode}
          >
            <Plus className="h-5 w-5" />
            <span>Add</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
