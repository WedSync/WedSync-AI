'use client';

import React from 'react';
import { ScalingStatus, ManualScalingAction } from '@/types/scalability';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Clock,
  Database,
  Zap,
} from 'lucide-react';

interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: Date;
  latency: number;
  dataPoints: number;
}

interface DashboardHeaderProps {
  clusterId: string;
  currentLoad?: number;
  scalingStatus: ScalingStatus;
  weddingDayMode: boolean;
  connectionStatus: ConnectionStatus;
  onEmergencyScale: (action: ManualScalingAction) => void;
}

/**
 * DashboardHeader
 * Real-time status header for scalability infrastructure dashboard
 * Shows key metrics, connection status, and emergency controls
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  clusterId,
  currentLoad,
  scalingStatus,
  weddingDayMode,
  connectionStatus,
  onEmergencyScale,
}) => {
  const getStatusColor = (status: ScalingStatus) => {
    switch (status) {
      case 'stable':
        return 'bg-green-500';
      case 'scaling_up':
        return 'bg-blue-500';
      case 'scaling_down':
        return 'bg-yellow-500';
      case 'emergency':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: ScalingStatus) => {
    switch (status) {
      case 'stable':
        return <Activity className="w-4 h-4" />;
      case 'scaling_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'scaling_down':
        return <TrendingDown className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatLatency = (latency: number): string => {
    if (latency < 100) return `${Math.round(latency)}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const formatDataPoints = (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const handleEmergencyScaleUp = () => {
    onEmergencyScale({
      service: 'all',
      action: 'scale_up',
      targetInstances: undefined, // Will use auto-scaling logic
      reason: 'Emergency scale-up initiated from dashboard',
      emergency: true,
    });
  };

  const handleEmergencyScaleDown = () => {
    onEmergencyScale({
      service: 'all',
      action: 'scale_down',
      targetInstances: undefined,
      reason: 'Emergency scale-down initiated from dashboard',
      emergency: true,
    });
  };

  return (
    <Card className="dashboard-header">
      <div className="p-6">
        <div className="flex items-center justify-between">
          {/* Left Section - Cluster Info */}
          <div className="flex items-center space-x-6">
            <div className="cluster-info">
              <h1 className="text-2xl font-bold text-gray-900">
                Scalability Dashboard
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-600">Cluster:</span>
                <Badge variant="outline" className="font-mono">
                  {clusterId}
                </Badge>
              </div>
            </div>

            {/* Current Load */}
            <div className="load-indicator">
              <div className="text-sm text-gray-600">Current Load</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentLoad
                  ? `${currentLoad.toLocaleString()} req/s`
                  : 'Loading...'}
              </div>
            </div>

            {/* Scaling Status */}
            <div className="scaling-status">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(scalingStatus)}`}
                />
                <span className="text-sm text-gray-600">Status:</span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                {getStatusIcon(scalingStatus)}
                <span className="font-semibold capitalize">
                  {scalingStatus.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Controls and Status */}
          <div className="flex items-center space-x-4">
            {/* Wedding Day Mode */}
            {weddingDayMode && (
              <Badge className="wedding-day-badge bg-purple-100 text-purple-800 border-purple-200">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span>Wedding Day Mode</span>
                </div>
              </Badge>
            )}

            {/* Connection Status */}
            <div className="connection-status">
              <div className="flex items-center space-x-2">
                {connectionStatus.isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <div className="text-xs">
                  <div
                    className={
                      connectionStatus.isConnected
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {connectionStatus.isConnected
                      ? 'Connected'
                      : 'Disconnected'}
                  </div>
                  <div className="text-gray-500">
                    {formatLatency(connectionStatus.latency)} latency
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="performance-metrics flex items-center space-x-4 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">
                  Last: {connectionStatus.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {formatDataPoints(connectionStatus.dataPoints)} points
                </span>
              </div>
            </div>

            {/* Emergency Controls */}
            <div className="emergency-controls flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmergencyScaleUp}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                disabled={scalingStatus === 'scaling_up'}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Emergency Scale Up
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleEmergencyScaleDown}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                disabled={scalingStatus === 'scaling_down'}
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                Emergency Scale Down
              </Button>
            </div>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="status-bar mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="status-item">
                <span className="text-gray-600">WebSocket Status:</span>
                <span
                  className={`ml-2 font-medium ${
                    connectionStatus.isConnected
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {connectionStatus.isConnected ? 'Active' : 'Reconnecting...'}
                </span>
              </div>

              <div className="status-item">
                <span className="text-gray-600">Update Latency:</span>
                <span
                  className={`ml-2 font-medium ${
                    connectionStatus.latency < 100
                      ? 'text-green-600'
                      : connectionStatus.latency < 500
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {formatLatency(connectionStatus.latency)}
                </span>
              </div>

              <div className="status-item">
                <span className="text-gray-600">Data Points:</span>
                <span className="ml-2 font-medium text-blue-600">
                  {formatDataPoints(connectionStatus.dataPoints)}
                </span>
              </div>
            </div>

            <div className="real-time-indicator flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-600">Real-time monitoring active</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardHeader;
