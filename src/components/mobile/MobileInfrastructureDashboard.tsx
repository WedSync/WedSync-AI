'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  Battery,
  AlertTriangle,
  CheckCircle,
  Zap,
  Clock,
  Users,
  Heart,
  Settings,
  Phone,
  Shield,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from 'react-use-gesture';

// Types
interface InfrastructureStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastUpdated: Date;
}

interface CloudProvider {
  name: 'aws' | 'azure' | 'gcp';
  status: 'online' | 'offline' | 'degraded';
  region: string;
  responseTime: number;
  cost: number;
  resources: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface WeddingAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  weddingId?: string;
  timestamp: Date;
  resolved: boolean;
}

interface MobileInfrastructureDashboardProps {
  weddingId?: string;
  isWeddingDay?: boolean;
  emergencyMode?: boolean;
  className?: string;
}

export function MobileInfrastructureDashboard({
  weddingId,
  isWeddingDay = false,
  emergencyMode = false,
  className = '',
}: MobileInfrastructureDashboardProps) {
  // State
  const [infrastructureStatus, setInfrastructureStatus] =
    useState<InfrastructureStatus>({
      status: 'healthy',
      uptime: 99.98,
      responseTime: 145,
      errorRate: 0.02,
      throughput: 1247,
      lastUpdated: new Date(),
    });

  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([
    {
      name: 'aws',
      status: 'online',
      region: 'us-east-1',
      responseTime: 120,
      cost: 234.56,
      resources: { cpu: 65, memory: 72, storage: 45 },
    },
    {
      name: 'azure',
      status: 'online',
      region: 'eastus',
      responseTime: 135,
      cost: 198.43,
      resources: { cpu: 58, memory: 68, storage: 52 },
    },
    {
      name: 'gcp',
      status: 'degraded',
      region: 'us-central1',
      responseTime: 210,
      cost: 167.89,
      resources: { cpu: 78, memory: 84, storage: 61 },
    },
  ]);

  const [alerts, setAlerts] = useState<WeddingAlert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'GCP response time above threshold',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      resolved: false,
    },
    {
      id: '2',
      type: 'info',
      message: 'Wedding day cache protocol activated',
      weddingId,
      timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
      resolved: false,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number>(0.8);
  const [networkStatus, setNetworkStatus] = useState<
    'online' | 'offline' | 'slow'
  >('online');
  const [currentView, setCurrentView] = useState<
    'overview' | 'providers' | 'alerts' | 'emergency'
  >('overview');

  // Mobile-specific hooks
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [isLongPress, setIsLongPress] = useState(false);

  // Refresh data function
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      // Simulate API calls with realistic delays
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Update infrastructure status with some variance
      setInfrastructureStatus((prev) => ({
        ...prev,
        responseTime: prev.responseTime + (Math.random() - 0.5) * 20,
        errorRate: Math.max(0, prev.errorRate + (Math.random() - 0.5) * 0.01),
        throughput: prev.throughput + (Math.random() - 0.5) * 100,
        lastUpdated: new Date(),
      }));

      // Update cloud providers
      setCloudProviders((prev) =>
        prev.map((provider) => ({
          ...provider,
          responseTime: Math.max(
            50,
            provider.responseTime + (Math.random() - 0.5) * 30,
          ),
          resources: {
            cpu: Math.min(
              100,
              Math.max(0, provider.resources.cpu + (Math.random() - 0.5) * 10),
            ),
            memory: Math.min(
              100,
              Math.max(
                0,
                provider.resources.memory + (Math.random() - 0.5) * 10,
              ),
            ),
            storage: Math.min(
              100,
              Math.max(
                0,
                provider.resources.storage + (Math.random() - 0.5) * 5,
              ),
            ),
          },
        })),
      );

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh for wedding day
  useEffect(() => {
    const refreshInterval = isWeddingDay ? 10000 : 30000; // 10s for wedding day, 30s normal

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [isWeddingDay, refreshData]);

  // Monitor battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level);
        });
      });
    }
  }, []);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        // Check connection quality
        const connection = (navigator as any).connection;
        if (connection && connection.effectiveType) {
          setNetworkStatus(
            connection.effectiveType === '2g' ? 'slow' : 'online',
          );
        }
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Pull-to-refresh gesture
  const bind = useGesture({
    onDrag: ({
      movement: [, my],
      velocity: [, vy],
      direction: [, dy],
      distance,
    }) => {
      // Pull-to-refresh logic
      if (dy > 0 && my > 100 && vy > 0.5 && distance > 150) {
        refreshData();
      }
    },
  });

  // Touch handlers for long press
  const handleTouchStart = useCallback(() => {
    const startTime = Date.now();
    setTouchStartTime(startTime);

    const longPressTimer = setTimeout(() => {
      if (Date.now() - startTime >= 1000) {
        setIsLongPress(true);
        navigator.vibrate?.(100); // Haptic feedback
      }
    }, 1000);

    return () => clearTimeout(longPressTimer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const duration = Date.now() - touchStartTime;

    if (isLongPress && duration >= 1000) {
      // Show emergency menu
      setCurrentView('emergency');
    }

    setIsLongPress(false);
    setTouchStartTime(0);
  }, [touchStartTime, isLongPress]);

  // Memoized computations
  const overallStatus = useMemo(() => {
    const onlineProviders = cloudProviders.filter(
      (p) => p.status === 'online',
    ).length;
    const degradedProviders = cloudProviders.filter(
      (p) => p.status === 'degraded',
    ).length;

    if (onlineProviders === cloudProviders.length) return 'healthy';
    if (onlineProviders >= cloudProviders.length / 2) return 'degraded';
    return 'critical';
  }, [cloudProviders]);

  const averageResponseTime = useMemo(() => {
    return Math.round(
      cloudProviders.reduce((sum, p) => sum + p.responseTime, 0) /
        cloudProviders.length,
    );
  }, [cloudProviders]);

  const totalCost = useMemo(() => {
    return cloudProviders.reduce((sum, p) => sum + p.cost, 0);
  }, [cloudProviders]);

  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
      case 'offline':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div
      {...bind()}
      className={`min-h-screen bg-gray-50 pb-20 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-full ${getStatusColor(overallStatus)}`}
            >
              {getStatusIcon(overallStatus)}
            </div>
            <div>
              <h1 className="text-lg font-semibold">Infrastructure</h1>
              <p className="text-sm text-gray-500">
                {isWeddingDay ? 'Wedding Day Mode' : 'Normal Operations'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Network Status */}
            <div className="flex items-center space-x-1">
              {networkStatus === 'offline' ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Wifi
                  className={`h-4 w-4 ${networkStatus === 'slow' ? 'text-yellow-500' : 'text-green-500'}`}
                />
              )}
            </div>

            {/* Battery Level */}
            <div className="flex items-center space-x-1">
              <Battery
                className={`h-4 w-4 ${batteryLevel < 0.2 ? 'text-red-500' : 'text-gray-500'}`}
              />
              <span className="text-xs text-gray-500">
                {Math.round(batteryLevel * 100)}%
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-2 text-xs text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Emergency Mode Banner */}
      <AnimatePresence>
        {emergencyMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-600 text-white px-4 py-2"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Emergency Mode Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="bg-white rounded-full p-2 shadow-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {infrastructureStatus.uptime}%
                </p>
                <p className="text-xs text-gray-600">Uptime</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {averageResponseTime}ms
                </p>
                <p className="text-xs text-gray-600">Response Time</p>
              </div>
              <Zap className="h-6 w-6 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {infrastructureStatus.errorRate}%
                </p>
                <p className="text-xs text-gray-600">Error Rate</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  ${totalCost.toFixed(0)}
                </p>
                <p className="text-xs text-gray-600">Monthly Cost</p>
              </div>
              <TrendingDown className="h-6 w-6 text-purple-500" />
            </div>
          </motion.div>
        </div>

        {/* Wedding Day Quick Actions */}
        {isWeddingDay && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Wedding Day Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="h-12">
                  <div className="text-center">
                    <Phone className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-xs">Emergency</span>
                  </div>
                </Button>
                <Button size="sm" variant="outline" className="h-12">
                  <div className="text-center">
                    <Shield className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-xs">Backup</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cloud Providers Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>Cloud Providers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {cloudProviders.map((provider) => (
                <motion.div
                  key={provider.name}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        provider.status === 'online'
                          ? 'bg-green-500'
                          : provider.status === 'degraded'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {provider.name}
                      </p>
                      <p className="text-xs text-gray-500">{provider.region}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {provider.responseTime}ms
                    </p>
                    <p className="text-xs text-gray-500">
                      ${provider.cost.toFixed(0)}/mo
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Resource Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {['CPU', 'Memory', 'Storage'].map((resource) => {
                const avgUsage = Math.round(
                  cloudProviders.reduce(
                    (sum, p) =>
                      sum +
                      p.resources[
                        resource.toLowerCase() as keyof typeof p.resources
                      ],
                    0,
                  ) / cloudProviders.length,
                );

                return (
                  <div key={resource} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{resource}</span>
                      <span>{avgUsage}%</span>
                    </div>
                    <Progress value={avgUsage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Active Alerts</span>
                <Badge variant="secondary">
                  {alerts.filter((a) => !a.resolved).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {alerts
                  .filter((a) => !a.resolved)
                  .slice(0, 3)
                  .map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start space-x-3 p-2 rounded border border-gray-100"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          alert.type === 'critical'
                            ? 'bg-red-500'
                            : alert.type === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 py-2">
          {[
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'providers', icon: Server, label: 'Providers' },
            { id: 'alerts', icon: AlertTriangle, label: 'Alerts' },
            { id: 'emergency', icon: Settings, label: 'Settings' },
          ].map(({ id, icon: Icon, label }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView(id as any)}
              className={`flex flex-col items-center py-2 px-1 text-xs ${
                currentView === id ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Emergency Overlay */}
      <AnimatePresence>
        {currentView === 'emergency' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setCurrentView('overview')}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">Emergency Actions</h2>
              <div className="space-y-3">
                <Button variant="destructive" size="lg" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Emergency Contact
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Activate Backup Systems
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalate to Support
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentView('overview')}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MobileInfrastructureDashboard;
