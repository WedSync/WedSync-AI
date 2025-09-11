'use client';

import React, { useState, useEffect } from 'react';
import {
  useComprehensiveSync,
  useWeddingDaySync,
  useVendorSync,
  usePhotographerSync,
} from '@/hooks/useComprehensiveSync';
import { EnhancedSyncStatus } from './EnhancedSyncStatus';
import {
  Calendar,
  Users,
  Camera,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  Settings,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { format, addHours, isSameDay } from 'date-fns';

/**
 * Comprehensive Demo of the WedSync Synchronization System
 *
 * This component demonstrates how the sync system integrates with
 * different user roles and wedding day scenarios
 */

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  userRole: 'coordinator' | 'photographer' | 'vendor' | 'planner';
  isWeddingDay: boolean;
  weddingDate?: string;
  icon: React.ComponentType<any>;
}

const demoScenarios: DemoScenario[] = [
  {
    id: 'wedding-day-coordinator',
    name: 'Wedding Day Coordinator',
    description:
      'Active coordinator managing live wedding with highest priority sync',
    userRole: 'coordinator',
    isWeddingDay: true,
    weddingDate: new Date().toISOString(),
    icon: Calendar,
  },
  {
    id: 'vendor-checkin',
    name: 'Vendor at Venue',
    description: 'Vendor checking in and updating status at wedding venue',
    userRole: 'vendor',
    isWeddingDay: true,
    weddingDate: new Date().toISOString(),
    icon: Truck,
  },
  {
    id: 'photographer-session',
    name: 'Wedding Photographer',
    description: 'Photographer updating timeline and capturing moments',
    userRole: 'photographer',
    isWeddingDay: true,
    weddingDate: new Date().toISOString(),
    icon: Camera,
  },
  {
    id: 'planner-preparation',
    name: 'Wedding Planner',
    description: 'Planner coordinating pre-wedding preparations',
    userRole: 'planner',
    isWeddingDay: false,
    weddingDate: addHours(new Date(), 24).toISOString(),
    icon: Users,
  },
];

export function SyncSystemDemo() {
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(
    demoScenarios[0],
  );
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationEvents, setSimulationEvents] = useState<string[]>([]);

  // Dynamic sync hook based on scenario
  const getSyncHook = () => {
    const weddingId = 'demo-wedding-123';

    switch (activeScenario.userRole) {
      case 'coordinator':
        return useWeddingDaySync(
          weddingId,
          activeScenario.weddingDate || new Date().toISOString(),
        );
      case 'vendor':
        return useVendorSync(weddingId, 'florist');
      case 'photographer':
        return usePhotographerSync(weddingId);
      case 'planner':
      default:
        return useComprehensiveSync({
          weddingId,
          weddingDate: activeScenario.weddingDate,
          userRole: 'planner',
          weddingDayMode: activeScenario.isWeddingDay,
        });
    }
  };

  const sync = getSyncHook();

  // Simulate realistic sync events for demo
  useEffect(() => {
    if (!simulationRunning) return;

    const events = [
      'Updating vendor check-in status',
      'Timeline event modified - ceremony start delayed 15 minutes',
      'New issue reported - catering delivery delay',
      'Photo upload - ceremony arch setup complete',
      'Guest RSVP update - 2 additional attendees',
      'Weather update - 20% chance of rain',
      'Venue coordinator note added',
      'DJ equipment check complete',
      'Florist arrangement status updated',
      'Transportation ETA updated',
    ];

    const interval = setInterval(
      () => {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setSimulationEvents((prev) => [
          ...prev.slice(-9),
          `${new Date().toLocaleTimeString()}: ${randomEvent}`,
        ]);

        // Simulate queuing sync items
        sync
          .queueItem({
            type: 'client_update',
            action: 'update',
            data: { timestamp: new Date().toISOString(), event: randomEvent },
            entityType: 'demo',
            entityId: `demo-${Date.now()}`,
          })
          .catch(console.error);

        // Randomly simulate conflicts (10% chance)
        if (Math.random() < 0.1) {
          // This would normally be triggered by the sync engine
          setSimulationEvents((prev) => [
            ...prev.slice(-9),
            `${new Date().toLocaleTimeString()}: ⚠️ Conflict detected - resolving automatically`,
          ]);
        }
      },
      2000 + Math.random() * 3000,
    ); // Random interval between 2-5 seconds

    return () => clearInterval(interval);
  }, [simulationRunning, sync]);

  // Demo actions
  const simulateConflict = async () => {
    setSimulationEvents((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: 🔄 Simulating conflict scenario...`,
    ]);

    await sync.queueItem({
      type: 'timeline_update',
      action: 'update',
      data: {
        eventId: 'ceremony-start',
        startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
        conflict: true, // This would trigger conflict detection
      },
      entityType: 'timeline',
      entityId: 'ceremony-start',
    });

    setTimeout(() => {
      setSimulationEvents((prev) => [
        ...prev.slice(-9),
        `${new Date().toLocaleTimeString()}: ⚡ Conflict resolved using ${activeScenario.userRole} priority`,
      ]);
    }, 1500);
  };

  const simulateWeddingDayEmergency = async () => {
    setSimulationEvents((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: 🚨 WEDDING DAY EMERGENCY: Venue access issue`,
    ]);

    await sync.queueItem({
      type: 'issue_create',
      action: 'create',
      data: {
        title: 'Venue Access Emergency',
        severity: 'critical',
        description: 'Main entrance blocked - using service entrance',
        reportedBy: activeScenario.userRole,
        isWeddingDay: true,
      },
      entityType: 'issue',
      entityId: `emergency-${Date.now()}`,
      priority: 'critical',
    });

    setTimeout(() => {
      setSimulationEvents((prev) => [
        ...prev.slice(-9),
        `${new Date().toLocaleTimeString()}: ✅ Emergency resolved - all vendors notified`,
      ]);
    }, 2000);
  };

  const performManualSync = async () => {
    setSimulationEvents((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: 🔄 Manual sync initiated by ${activeScenario.userRole}`,
    ]);

    try {
      await sync.sync();
      setSimulationEvents((prev) => [
        ...prev.slice(-9),
        `${new Date().toLocaleTimeString()}: ✅ Manual sync completed successfully`,
      ]);
    } catch (error) {
      setSimulationEvents((prev) => [
        ...prev.slice(-9),
        `${new Date().toLocaleTimeString()}: ❌ Manual sync failed`,
      ]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          WedSync Comprehensive Synchronization System
        </h1>
        <p className="text-lg text-gray-600">
          Advanced offline-first sync with intelligent conflict resolution and
          wedding day priority management
        </p>
      </div>

      {/* Scenario Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Demo Scenarios
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {demoScenarios.map((scenario) => {
            const IconComponent = scenario.icon;
            const isActive = scenario.id === activeScenario.id;

            return (
              <button
                key={scenario.id}
                onClick={() => setActiveScenario(scenario)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent
                    className={`w-6 h-6 mt-0.5 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-sm ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {scenario.name}
                    </h3>
                    <p
                      className={`text-xs mt-1 ${
                        isActive ? 'text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      {scenario.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          scenario.isWeddingDay
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {scenario.isWeddingDay ? 'Wedding Day' : 'Preparation'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {scenario.userRole}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Scenario Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
        <div className="flex items-start gap-4">
          <activeScenario.icon className="w-8 h-8 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Active Scenario: {activeScenario.name}
            </h3>
            <p className="text-gray-700 mb-4">{activeScenario.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Role:</span>
                <span className="font-medium capitalize">
                  {activeScenario.userRole}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Context:</span>
                <span className="font-medium">
                  {activeScenario.isWeddingDay
                    ? 'Active Wedding Day'
                    : 'Pre-Wedding Planning'}
                </span>
              </div>

              {activeScenario.weddingDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Wedding:</span>
                  <span className="font-medium">
                    {format(
                      new Date(activeScenario.weddingDate),
                      'MMM dd, HH:mm',
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Sync Status - Full View */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sync Status (Full View)
          </h3>
          <EnhancedSyncStatus
            weddingId="demo-wedding-123"
            weddingDate={activeScenario.weddingDate}
            userRole={activeScenario.userRole}
            isWeddingDay={activeScenario.isWeddingDay}
            variant="full"
            showMetrics={true}
          />
        </div>

        {/* Sync Status - Dashboard View */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Dashboard View
          </h3>
          <EnhancedSyncStatus
            weddingId="demo-wedding-123"
            weddingDate={activeScenario.weddingDate}
            userRole={activeScenario.userRole}
            isWeddingDay={activeScenario.isWeddingDay}
            variant="dashboard"
          />
        </div>
      </div>

      {/* Demo Controls */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5" />
          Demo Controls
        </h3>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setSimulationRunning(!simulationRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              simulationRunning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {simulationRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {simulationRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>

          <button
            onClick={performManualSync}
            disabled={sync.syncProgress.isActive}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${sync.syncProgress.isActive ? 'animate-spin' : ''}`}
            />
            Manual Sync
          </button>

          <button
            onClick={simulateConflict}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
          >
            <AlertTriangle className="w-4 h-4" />
            Simulate Conflict
          </button>

          {activeScenario.isWeddingDay && (
            <button
              onClick={simulateWeddingDayEmergency}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4" />
              Wedding Day Emergency
            </button>
          )}
        </div>

        {/* Simulation Event Log */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Simulation Events
            {simulationRunning && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                LIVE
              </span>
            )}
          </h4>

          <div className="bg-white rounded border p-3 h-40 overflow-y-auto">
            {simulationEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No events yet. Start the simulation to see sync activity.
              </p>
            ) : (
              <div className="space-y-1">
                {simulationEvents.map((event, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700">
                    {event}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Statistics */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Current Session Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {sync.status.pendingItems}
            </div>
            <div className="text-sm text-blue-600">Pending Items</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {sync.status.lastSyncTime ? '✓' : '-'}
            </div>
            <div className="text-sm text-green-600">Last Sync</div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">
              {sync.conflicts.length}
            </div>
            <div className="text-sm text-yellow-600">Active Conflicts</div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-700 capitalize">
              {sync.status.queueHealth}
            </div>
            <div className="text-sm text-purple-600">Queue Health</div>
          </div>
        </div>
      </div>

      {/* Active Conflicts */}
      {sync.conflicts.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Active Conflicts ({sync.conflicts.length})
          </h3>

          <div className="space-y-3">
            {sync.conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="border rounded-lg p-4 bg-yellow-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {conflict.message}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Entity: {conflict.entityType} • Severity:{' '}
                      {conflict.severity}
                      {conflict.isWeddingDayRelated && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Wedding Day
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {conflict.suggestedAction}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() =>
                        sync.resolveConflict({
                          conflictId: conflict.id,
                          entityType: conflict.entityType,
                          entityId: conflict.entityId || 'unknown',
                          userResolution: 'local',
                        })
                      }
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Use Local
                    </button>
                    <button
                      onClick={() =>
                        sync.resolveConflict({
                          conflictId: conflict.id,
                          entityType: conflict.entityType,
                          entityId: conflict.entityId || 'unknown',
                          userResolution: 'server',
                        })
                      }
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Use Server
                    </button>
                    <button
                      onClick={() => sync.dismissConflict(conflict.id)}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {sync.lastError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-900">Sync Error</div>
              <div className="text-sm text-red-700 mt-1">{sync.lastError}</div>
            </div>
            <button
              onClick={sync.clearError}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 border-t pt-6">
        <p>
          This demo showcases the comprehensive synchronization system with
          intelligent conflict resolution, wedding day priority management, and
          role-based sync optimization.
        </p>
        <p className="mt-2">
          System automatically handles network connectivity, retry logic, and
          maintains data integrity across all wedding planning scenarios.
        </p>
      </div>
    </div>
  );
}
