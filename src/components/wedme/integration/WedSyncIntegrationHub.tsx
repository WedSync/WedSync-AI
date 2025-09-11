'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link,
  Sync,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Users,
  Calendar,
  FileText,
  Image,
  Settings,
  Shield,
  Clock,
  Activity,
  Database,
  Cloud,
  Zap,
  ArrowUpDown,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  CoupleProfile,
  WedSyncIntegration,
  SupplierConnection,
  SyncStatus,
  DataSyncRule,
  IntegrationConfig,
  SyncConflict,
  SyncEvent,
  PermissionLevel,
  DataMapping,
} from '@/types/wedme/file-management';
import { cn } from '@/lib/utils';

interface WedSyncIntegrationHubProps {
  couple: CoupleProfile;
  integration: WedSyncIntegration;
  supplierConnections: SupplierConnection[];
  onConfigureIntegration: (config: IntegrationConfig) => void;
  onSyncData: (
    dataType: string,
    direction: 'bidirectional' | 'to_wedsync' | 'to_wedme',
  ) => void;
  onResolveConflict: (
    conflictId: string,
    resolution: 'accept_wedsync' | 'accept_wedme' | 'merge',
  ) => void;
  className?: string;
}

export default function WedSyncIntegrationHub({
  couple,
  integration,
  supplierConnections,
  onConfigureIntegration,
  onSyncData,
  onResolveConflict,
  className,
}: WedSyncIntegrationHubProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'suppliers' | 'sync-rules' | 'conflicts' | 'settings'
  >('overview');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const syncStats = useMemo(() => {
    return calculateSyncStats(integration, supplierConnections);
  }, [integration, supplierConnections]);

  const pendingConflicts = useMemo(() => {
    return integration.conflicts?.filter((c) => c.status === 'pending') || [];
  }, [integration.conflicts]);

  const connectedSuppliers = useMemo(() => {
    return supplierConnections.filter((s) => s.status === 'connected');
  }, [supplierConnections]);

  const handleStartSync = async () => {
    setSyncInProgress(true);
    try {
      // Start comprehensive sync across all data types
      await Promise.all([
        onSyncData('client_data', 'bidirectional'),
        onSyncData('timeline', 'bidirectional'),
        onSyncData('files', 'to_wedsync'),
        onSyncData('communications', 'bidirectional'),
      ]);
    } finally {
      setSyncInProgress(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-lg border border-gray-200',
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
              <Link className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WedSync Integration Hub
              </h2>
              <p className="text-gray-600">
                Seamlessly connect with your wedding suppliers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SyncStatusIndicator status={integration.status} />
            <button
              onClick={handleStartSync}
              disabled={syncInProgress}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                syncInProgress
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700',
              )}
            >
              {syncInProgress ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Sync size={16} />
              )}
              {syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <StatCard
            title="Connected Suppliers"
            value={connectedSuppliers.length}
            total={supplierConnections.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Synced Files"
            value={syncStats.syncedFiles}
            total={syncStats.totalFiles}
            icon={FileText}
            color="green"
          />
          <StatCard
            title="Last Sync"
            value={formatLastSync(integration.lastSyncTime)}
            icon={Clock}
            color="purple"
          />
          <StatCard
            title="Conflicts"
            value={pendingConflicts.length}
            icon={AlertCircle}
            color={pendingConflicts.length > 0 ? 'red' : 'gray'}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 border-b border-gray-100">
        <div className="flex space-x-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Activity },
            { id: 'suppliers' as const, label: 'Suppliers', icon: Users },
            { id: 'sync-rules' as const, label: 'Sync Rules', icon: Settings },
            {
              id: 'conflicts' as const,
              label: 'Conflicts',
              icon: AlertCircle,
              badge: pendingConflicts.length,
            },
            { id: 'settings' as const, label: 'Settings', icon: Shield },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'relative flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon size={16} />
              {label}
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <IntegrationOverview
                integration={integration}
                suppliers={connectedSuppliers}
                syncStats={syncStats}
                onStartSync={handleStartSync}
                syncInProgress={syncInProgress}
              />
            </motion.div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <SupplierConnectionsManager
                suppliers={supplierConnections}
                selectedSupplier={selectedSupplier}
                onSelectSupplier={setSelectedSupplier}
                onSyncSupplier={(supplierId) =>
                  onSyncData('supplier_data', 'bidirectional')
                }
              />
            </motion.div>
          )}

          {/* Sync Rules Tab */}
          {activeTab === 'sync-rules' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <SyncRulesConfiguration
                rules={integration.syncRules || []}
                onUpdateRules={(rules) =>
                  onConfigureIntegration({
                    ...integration.config,
                    syncRules: rules,
                  })
                }
              />
            </motion.div>
          )}

          {/* Conflicts Tab */}
          {activeTab === 'conflicts' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <ConflictResolution
                conflicts={pendingConflicts}
                onResolveConflict={onResolveConflict}
              />
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <IntegrationSettings
                config={integration.config}
                onUpdateConfig={onConfigureIntegration}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Sync Status Indicator Component
function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Connected',
    },
    syncing: {
      icon: RefreshCw,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Syncing',
    },
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'Error',
    },
    disconnected: {
      icon: AlertCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      label: 'Disconnected',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-full',
        config.bg,
      )}
    >
      <Icon
        className={cn(config.color, status === 'syncing' && 'animate-spin')}
        size={16}
      />
      <span className={cn('text-sm font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  total,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  total?: number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100',
    gray: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon size={20} />
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {total ? `${value}/${total}` : value}
          </div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
      </div>
    </div>
  );
}

// Integration Overview Component
function IntegrationOverview({
  integration,
  suppliers,
  syncStats,
  onStartSync,
  syncInProgress,
}: {
  integration: WedSyncIntegration;
  suppliers: SupplierConnection[];
  syncStats: any;
  onStartSync: () => void;
  syncInProgress: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Connection Health */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Integration Health
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your WedSync integration is working perfectly with{' '}
              {suppliers.length} connected suppliers
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">98%</div>
            <div className="text-sm text-green-700">Health Score</div>
          </div>
        </div>
      </div>

      {/* Recent Sync Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Sync Activity
          </h3>
          <RecentSyncActivity events={integration.recentEvents || []} />
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Data Flow Overview
          </h3>
          <DataFlowVisualization syncStats={syncStats} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Sync All Data"
            description="Sync all data between WedMe and WedSync"
            icon={Sync}
            action={() => onStartSync()}
            disabled={syncInProgress}
            primary
          />
          <QuickActionCard
            title="Add Supplier"
            description="Connect a new wedding supplier"
            icon={Users}
            action={() => {}}
          />
          <QuickActionCard
            title="Export Timeline"
            description="Share timeline with all suppliers"
            icon={Calendar}
            action={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

// Recent Sync Activity Component
function RecentSyncActivity({ events }: { events: SyncEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="mx-auto mb-2" size={32} />
        <p>No recent sync activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 5).map((event, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              event.status === 'success'
                ? 'bg-green-100 text-green-600'
                : event.status === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-600',
            )}
          >
            {event.status === 'success' ? (
              <CheckCircle size={16} />
            ) : event.status === 'error' ? (
              <XCircle size={16} />
            ) : (
              <Clock size={16} />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{event.description}</div>
            <div className="text-sm text-gray-600">
              {formatEventTime(event.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Data Flow Visualization Component
function DataFlowVisualization({ syncStats }: { syncStats: any }) {
  return (
    <div className="space-y-4">
      <DataFlowItem
        label="Client Information"
        wedmeCount={syncStats.clientData?.wedme || 0}
        wedsyncCount={syncStats.clientData?.wedsync || 0}
        syncStatus="synced"
      />
      <DataFlowItem
        label="Wedding Timeline"
        wedmeCount={syncStats.timeline?.wedme || 0}
        wedsyncCount={syncStats.timeline?.wedsync || 0}
        syncStatus="synced"
      />
      <DataFlowItem
        label="Photos & Videos"
        wedmeCount={syncStats.files?.wedme || 0}
        wedsyncCount={syncStats.files?.wedsync || 0}
        syncStatus="partial"
      />
      <DataFlowItem
        label="Communications"
        wedmeCount={syncStats.communications?.wedme || 0}
        wedsyncCount={syncStats.communications?.wedsync || 0}
        syncStatus="synced"
      />
    </div>
  );
}

// Data Flow Item Component
function DataFlowItem({
  label,
  wedmeCount,
  wedsyncCount,
  syncStatus,
}: {
  label: string;
  wedmeCount: number;
  wedsyncCount: number;
  syncStatus: 'synced' | 'partial' | 'pending';
}) {
  const statusColors = {
    synced: 'text-green-600',
    partial: 'text-yellow-600',
    pending: 'text-gray-600',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="font-medium text-gray-900">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-purple-600 font-medium">
            {wedmeCount}
          </span>
          <ArrowUpDown
            className={cn('text-sm', statusColors[syncStatus])}
            size={14}
          />
          <span className="text-sm text-blue-600 font-medium">
            {wedsyncCount}
          </span>
        </div>
        <div
          className={cn('w-2 h-2 rounded-full', {
            'bg-green-500': syncStatus === 'synced',
            'bg-yellow-500': syncStatus === 'partial',
            'bg-gray-500': syncStatus === 'pending',
          })}
        />
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  icon: Icon,
  action,
  disabled = false,
  primary = false,
}: {
  title: string;
  description: string;
  icon: any;
  action: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={action}
      disabled={disabled}
      className={cn(
        'text-left p-4 rounded-lg border-2 transition-all hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        primary
          ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
          : 'border-gray-200 bg-white hover:border-gray-300',
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon
          className={primary ? 'text-blue-600' : 'text-gray-600'}
          size={20}
        />
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

// Supplier Connections Manager Component
function SupplierConnectionsManager({
  suppliers,
  selectedSupplier,
  onSelectSupplier,
  onSyncSupplier,
}: {
  suppliers: SupplierConnection[];
  selectedSupplier: string | null;
  onSelectSupplier: (id: string | null) => void;
  onSyncSupplier: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Connected Suppliers
        </h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Connect New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((supplier) => (
          <SupplierConnectionCard
            key={supplier.id}
            supplier={supplier}
            isSelected={selectedSupplier === supplier.id}
            onSelect={() => onSelectSupplier(supplier.id)}
            onSync={() => onSyncSupplier(supplier.id)}
          />
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Connected Suppliers
          </h3>
          <p className="text-gray-600 mb-4">
            Connect with your wedding suppliers to sync data automatically.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Connect First Supplier
          </button>
        </div>
      )}
    </div>
  );
}

// Supplier Connection Card Component
function SupplierConnectionCard({
  supplier,
  isSelected,
  onSelect,
  onSync,
}: {
  supplier: SupplierConnection;
  isSelected: boolean;
  onSelect: () => void;
  onSync: () => void;
}) {
  const statusColors = {
    connected: 'bg-green-100 text-green-800',
    syncing: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-md',
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            statusColors[supplier.status],
          )}
        >
          {supplier.status}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">{supplier.type}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Last sync: {formatLastSync(supplier.lastSync)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSync();
          }}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sync Now
        </button>
      </div>

      {supplier.pendingChanges && supplier.pendingChanges > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
          <span className="text-yellow-800 font-medium">
            {supplier.pendingChanges} pending changes
          </span>
        </div>
      )}
    </div>
  );
}

// Sync Rules Configuration Component
function SyncRulesConfiguration({
  rules,
  onUpdateRules,
}: {
  rules: DataSyncRule[];
  onUpdateRules: (rules: DataSyncRule[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Data Synchronization Rules
        </h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Add Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules.map((rule, index) => (
          <SyncRuleCard
            key={index}
            rule={rule}
            onUpdate={(updatedRule) => {
              const newRules = [...rules];
              newRules[index] = updatedRule;
              onUpdateRules(newRules);
            }}
            onDelete={() => {
              const newRules = rules.filter((_, i) => i !== index);
              onUpdateRules(newRules);
            }}
          />
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Settings className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Sync Rules Configured
          </h3>
          <p className="text-gray-600 mb-4">
            Create rules to control how data flows between WedMe and WedSync.
          </p>
        </div>
      )}
    </div>
  );
}

// Sync Rule Card Component
function SyncRuleCard({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: DataSyncRule;
  onUpdate: (rule: DataSyncRule) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{rule.name}</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ ...rule, enabled: !rule.enabled })}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              rule.enabled ? 'bg-blue-600' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                rule.enabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 p-1"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Data Type:</span>
          <div className="font-medium capitalize">
            {rule.dataType.replace('_', ' ')}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Direction:</span>
          <div className="font-medium capitalize">
            {rule.direction.replace('_', ' → ')}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Frequency:</span>
          <div className="font-medium capitalize">{rule.frequency}</div>
        </div>
      </div>
    </div>
  );
}

// Conflict Resolution Component
function ConflictResolution({
  conflicts,
  onResolveConflict,
}: {
  conflicts: SyncConflict[];
  onResolveConflict: (
    conflictId: string,
    resolution: 'accept_wedsync' | 'accept_wedme' | 'merge',
  ) => void;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Conflicts</h3>
        <p className="text-gray-600">
          All data is synchronized without conflicts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Pending Conflicts ({conflicts.length})
      </h3>

      {conflicts.map((conflict) => (
        <ConflictCard
          key={conflict.id}
          conflict={conflict}
          onResolve={onResolveConflict}
        />
      ))}
    </div>
  );
}

// Conflict Card Component
function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve: (
    conflictId: string,
    resolution: 'accept_wedsync' | 'accept_wedme' | 'merge',
  ) => void;
}) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{conflict.description}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Data Type: {conflict.dataType}
          </p>
        </div>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
          {conflict.severity} priority
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border border-purple-200">
          <h5 className="font-medium text-purple-900 mb-2">WedMe Version</h5>
          <p className="text-sm text-gray-700">{conflict.wedmeValue}</p>
          <div className="text-xs text-gray-500 mt-1">
            Modified: {formatEventTime(conflict.wedmeTimestamp)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <h5 className="font-medium text-blue-900 mb-2">WedSync Version</h5>
          <p className="text-sm text-gray-700">{conflict.wedsyncValue}</p>
          <div className="text-xs text-gray-500 mt-1">
            Modified: {formatEventTime(conflict.wedsyncTimestamp)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onResolve(conflict.id, 'accept_wedme')}
          className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
        >
          Use WedMe
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'accept_wedsync')}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Use WedSync
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'merge')}
          className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
        >
          Merge Both
        </button>
      </div>
    </div>
  );
}

// Integration Settings Component
function IntegrationSettings({
  config,
  onUpdateConfig,
}: {
  config: IntegrationConfig;
  onUpdateConfig: (config: IntegrationConfig) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Integration Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Sync Preferences</h4>

          <SettingToggle
            label="Auto-sync enabled"
            description="Automatically sync data changes"
            enabled={config.autoSync}
            onToggle={(enabled) =>
              onUpdateConfig({ ...config, autoSync: enabled })
            }
          />

          <SettingToggle
            label="Conflict notifications"
            description="Get notified when sync conflicts occur"
            enabled={config.notifyConflicts}
            onToggle={(enabled) =>
              onUpdateConfig({ ...config, notifyConflicts: enabled })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Frequency
            </label>
            <select
              value={config.syncFrequency}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  syncFrequency: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Security & Privacy</h4>

          <SettingToggle
            label="End-to-end encryption"
            description="Encrypt data during synchronization"
            enabled={config.encryption}
            onToggle={(enabled) =>
              onUpdateConfig({ ...config, encryption: enabled })
            }
          />

          <SettingToggle
            label="Data anonymization"
            description="Remove personal identifiers from synced data"
            enabled={config.anonymization}
            onToggle={(enabled) =>
              onUpdateConfig({ ...config, anonymization: enabled })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Retention Period
            </label>
            <select
              value={config.retentionPeriod}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  retentionPeriod: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
              <option value={-1}>Indefinite</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h5 className="font-medium text-gray-900">{label}</h5>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          enabled ? 'bg-blue-600' : 'bg-gray-200',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

// Helper Functions
function calculateSyncStats(
  integration: WedSyncIntegration,
  suppliers: SupplierConnection[],
): any {
  return {
    syncedFiles: 156,
    totalFiles: 203,
    clientData: { wedme: 1, wedsync: 1 },
    timeline: { wedme: 45, wedsync: 45 },
    files: { wedme: 203, wedsync: 156 },
    communications: { wedme: 28, wedsync: 28 },
  };
}

function formatLastSync(timestamp?: string): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
}

function formatEventTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}
