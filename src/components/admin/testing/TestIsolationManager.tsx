'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Database,
  Trash2,
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  RotateCcw,
  Zap,
  FileText,
  Users,
  Heart,
  Clock,
  Activity,
  HardDrive,
  GitBranch,
  Package,
} from 'lucide-react';

// Test Isolation Types
export interface TestIsolationStatus {
  id: string;
  testSuiteId: string;
  testName: string;
  isolationType: IsolationType;
  status: IsolationStatus;
  createdAt: Date;
  lastUpdated: Date;
  transactionId?: string;
  snapshotId?: string;
  isolatedResources: IsolatedResource[];
  cleanupOperations: CleanupOperation[];
  rollbackPoint?: RollbackPoint;
  metrics: IsolationMetrics;
}

export interface IsolatedResource {
  id: string;
  type: ResourceType;
  name: string;
  originalState: any;
  currentState: any;
  isModified: boolean;
  backupLocation?: string;
  dependencies: string[];
  lockStatus: LockStatus;
}

export interface CleanupOperation {
  id: string;
  type: CleanupType;
  description: string;
  status: OperationStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  actualDuration?: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  rollbackRequired: boolean;
  affectedTables: string[];
  affectedRecords: number;
  verificationChecks: VerificationCheck[];
}

export interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  expectedValue: any;
  actualValue: any;
  errorMessage?: string;
  timestamp: Date;
}

export interface RollbackPoint {
  id: string;
  name: string;
  createdAt: Date;
  dataSnapshot: any;
  schemaVersion: string;
  dependencies: string[];
  size: number;
  verified: boolean;
}

export interface TransactionState {
  id: string;
  status: TransactionStatus;
  isolationLevel:
    | 'READ_UNCOMMITTED'
    | 'READ_COMMITTED'
    | 'REPEATABLE_READ'
    | 'SERIALIZABLE';
  startTime: Date;
  lastActivity: Date;
  locksHeld: DatabaseLock[];
  modifications: ModificationRecord[];
  rollbackSize: number;
  canRollback: boolean;
}

export interface DatabaseLock {
  id: string;
  lockType: 'SHARED' | 'EXCLUSIVE' | 'UPDATE';
  resource: string;
  table: string;
  recordId?: string;
  acquiredAt: Date;
  holdDuration: number;
}

export interface ModificationRecord {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  timestamp: Date;
}

export interface IsolationMetrics {
  resourcesIsolated: number;
  locksAcquired: number;
  cleanupOperationsTotal: number;
  cleanupOperationsCompleted: number;
  rollbackPointsCreated: number;
  isolationOverhead: number;
  cleanupDuration: number;
  verificationResults: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export type IsolationType = 'full' | 'partial' | 'mock' | 'read-only';
export type IsolationStatus =
  | 'initializing'
  | 'active'
  | 'cleaning-up'
  | 'completed'
  | 'failed'
  | 'rolled-back';
export type ResourceType =
  | 'database-table'
  | 'file-system'
  | 'external-service'
  | 'cache'
  | 'session'
  | 'webhook';
export type CleanupType =
  | 'delete-records'
  | 'restore-backup'
  | 'clear-cache'
  | 'reset-counters'
  | 'rollback-transaction'
  | 'notify-cleanup';
export type OperationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';
export type LockStatus =
  | 'unlocked'
  | 'read-lock'
  | 'write-lock'
  | 'exclusive-lock';
export type TransactionStatus =
  | 'active'
  | 'committed'
  | 'aborted'
  | 'preparing'
  | 'prepared';

export interface TestIsolationManagerProps {
  isolationStatus: TestIsolationStatus[];
  cleanupOperations: CleanupOperation[];
  transactionState: TransactionState;
  onStartIsolation: (testId: string, type: IsolationType) => void;
  onExecuteCleanup: (operationId: string) => void;
  onRollbackTransaction: (transactionId: string) => void;
  onCreateRollbackPoint: (name: string) => void;
  onVerifyCleanup: (operationId: string) => void;
  onForceCleanup: () => void;
  autoCleanup?: boolean;
}

const TestIsolationManager: React.FC<TestIsolationManagerProps> = ({
  isolationStatus,
  cleanupOperations,
  transactionState,
  onStartIsolation,
  onExecuteCleanup,
  onRollbackTransaction,
  onCreateRollbackPoint,
  onVerifyCleanup,
  onForceCleanup,
  autoCleanup = true,
}) => {
  const [selectedIsolation, setSelectedIsolation] = useState<string | null>(
    null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cleanupFilter, setCleanupFilter] = useState<
    'all' | 'pending' | 'running' | 'failed'
  >('all');

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh logic would be implemented here
      // For now, this is a placeholder
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getIsolationStatusIcon = (status: IsolationStatus) => {
    switch (status) {
      case 'initializing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'active':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'cleaning-up':
        return <Trash2 className="h-4 w-4 animate-pulse text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'rolled-back':
        return <RotateCcw className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'database-table':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'file-system':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'external-service':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'cache':
        return <HardDrive className="h-4 w-4 text-orange-500" />;
      case 'session':
        return <Users className="h-4 w-4 text-indigo-500" />;
      case 'webhook':
        return <GitBranch className="h-4 w-4 text-pink-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLockIcon = (status: LockStatus) => {
    switch (status) {
      case 'unlocked':
        return <Unlock className="h-3 w-3 text-gray-400" />;
      case 'read-lock':
        return <Lock className="h-3 w-3 text-blue-500" />;
      case 'write-lock':
        return <Lock className="h-3 w-3 text-orange-500" />;
      case 'exclusive-lock':
        return <Lock className="h-3 w-3 text-red-500" />;
      default:
        return <Unlock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getFilteredOperations = () => {
    return cleanupOperations.filter((op) => {
      if (cleanupFilter === 'all') return true;
      return op.status === cleanupFilter;
    });
  };

  const getOverallCleanupProgress = () => {
    const totalOps = cleanupOperations.length;
    const completedOps = cleanupOperations.filter(
      (op) => op.status === 'completed',
    ).length;
    return totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
  };

  const getTransactionMetrics = () => {
    return {
      duration: Date.now() - transactionState.startTime.getTime(),
      locksHeld: transactionState.locksHeld.length,
      modifications: transactionState.modifications.length,
      rollbackSize: transactionState.rollbackSize,
    };
  };

  const metrics = getTransactionMetrics();
  const overallProgress = getOverallCleanupProgress();

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Test Isolation Manager
          </h2>
          <p className="text-gray-600">
            Transaction control and cleanup verification for integration tests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={autoCleanup ? 'default' : 'secondary'}>
            Auto-cleanup {autoCleanup ? 'On' : 'Off'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple View' : 'Advanced View'}
          </Button>
        </div>
      </div>

      {/* Transaction State Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Active Transaction State</span>
            </span>
            <Badge
              variant={transactionState.canRollback ? 'default' : 'secondary'}
            >
              {transactionState.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Duration:</span>
              <p className="font-medium">
                {Math.round(metrics.duration / 1000)}s
              </p>
            </div>
            <div>
              <span className="text-gray-600">Locks Held:</span>
              <p className="font-medium">{metrics.locksHeld}</p>
            </div>
            <div>
              <span className="text-gray-600">Modifications:</span>
              <p className="font-medium">{metrics.modifications}</p>
            </div>
            <div>
              <span className="text-gray-600">Rollback Size:</span>
              <p className="font-medium">
                {(metrics.rollbackSize / 1024).toFixed(1)}KB
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateRollbackPoint(`rollback-${Date.now()}`)}
              disabled={!transactionState.canRollback}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Create Rollback Point
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRollbackTransaction(transactionState.id)}
              disabled={!transactionState.canRollback}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rollback Transaction
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Isolation Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isolationStatus.map((isolation) => (
          <Card
            key={isolation.id}
            className={cn(
              'transition-all duration-200',
              selectedIsolation === isolation.id && 'ring-2 ring-blue-500',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  {getIsolationStatusIcon(isolation.status)}
                  <span>{isolation.testName}</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {isolation.isolationType}
                  </Badge>
                  <Badge
                    variant={
                      isolation.status === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {isolation.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Isolation Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Resources:</span>
                  <span className="font-medium">
                    {isolation.metrics.resourcesIsolated}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Locks:</span>
                  <span className="font-medium">
                    {isolation.metrics.locksAcquired}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cleanup:</span>
                  <span className="font-medium">
                    {isolation.metrics.cleanupOperationsCompleted}/
                    {isolation.metrics.cleanupOperationsTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Overhead:</span>
                  <span className="font-medium">
                    {isolation.metrics.isolationOverhead}ms
                  </span>
                </div>
              </div>

              {/* Isolated Resources Preview */}
              {isolation.isolatedResources.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Isolated Resources
                  </h4>
                  <div className="space-y-1">
                    {isolation.isolatedResources.slice(0, 3).map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          {getResourceIcon(resource.type)}
                          <span>{resource.name}</span>
                          {getLockIcon(resource.lockStatus)}
                        </div>
                        {resource.isModified && (
                          <Badge variant="outline" className="text-xs">
                            Modified
                          </Badge>
                        )}
                      </div>
                    ))}
                    {isolation.isolatedResources.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{isolation.isolatedResources.length - 3} more resources
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedIsolation(
                      selectedIsolation === isolation.id ? null : isolation.id,
                    )
                  }
                >
                  {selectedIsolation === isolation.id
                    ? 'Hide Details'
                    : 'View Details'}
                </Button>

                {isolation.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onForceCleanup}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Force Cleanup
                  </Button>
                )}
              </div>
            </CardContent>

            {/* Expanded Details */}
            {selectedIsolation === isolation.id && (
              <CardContent className="pt-0 border-t">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Detailed Resource Information
                  </h4>

                  {isolation.isolatedResources.map((resource) => (
                    <div key={resource.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getResourceIcon(resource.type)}
                          <span className="font-medium text-sm">
                            {resource.name}
                          </span>
                          {getLockIcon(resource.lockStatus)}
                        </div>
                        <Badge
                          variant={
                            resource.isModified ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {resource.isModified ? 'Modified' : 'Unchanged'}
                        </Badge>
                      </div>

                      {resource.dependencies.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Dependencies: {resource.dependencies.join(', ')}
                        </div>
                      )}

                      {resource.backupLocation && (
                        <div className="text-xs text-gray-600 mt-1">
                          Backup: {resource.backupLocation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Cleanup Operations Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Cleanup Operations</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {(['all', 'pending', 'running', 'failed'] as const).map(
                  (filter) => (
                    <Button
                      key={filter}
                      variant={cleanupFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCleanupFilter(filter)}
                      className="text-xs capitalize"
                    >
                      {filter}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Cleanup Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Operations List */}
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {getFilteredOperations().map((operation) => (
                <div key={operation.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={cn(
                          'text-xs',
                          getPriorityColor(operation.priority),
                        )}
                      >
                        {operation.priority}
                      </Badge>
                      <span className="font-medium text-sm">
                        {operation.type.replace('-', ' ')}
                      </span>
                      {operation.status === 'running' && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                      )}
                    </div>
                    <Badge
                      variant={
                        operation.status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {operation.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {operation.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Tables:</span>
                      <span className="ml-1 font-medium">
                        {operation.affectedTables.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Records:</span>
                      <span className="ml-1 font-medium">
                        {operation.affectedRecords}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-1 font-medium">
                        {operation.actualDuration
                          ? `${(operation.actualDuration / 1000).toFixed(1)}s`
                          : `~${(operation.estimatedDuration / 1000).toFixed(1)}s`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Checks:</span>
                      <span className="ml-1 font-medium">
                        {
                          operation.verificationChecks.filter(
                            (c) => c.status === 'passed',
                          ).length
                        }
                        /{operation.verificationChecks.length}
                      </span>
                    </div>
                  </div>

                  {operation.errorMessage && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {operation.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Operation Actions */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div className="flex space-x-2">
                      {operation.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecuteCleanup(operation.id)}
                          className="text-xs"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerifyCleanup(operation.id)}
                        className="text-xs"
                      >
                        Verify
                      </Button>
                    </div>

                    {operation.rollbackRequired && (
                      <Badge
                        variant="outline"
                        className="text-xs text-orange-600"
                      >
                        Rollback Required
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {getFilteredOperations().length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No cleanup operations match the current filter
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Advanced Transaction Details */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Locks */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Database Locks
                </h4>
                <div className="space-y-2">
                  {transactionState.locksHeld.map((lock) => (
                    <div
                      key={lock.id}
                      className="p-2 bg-gray-50 rounded text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getLockIcon(
                            lock.lockType.toLowerCase() as LockStatus,
                          )}
                          <span className="font-medium">{lock.table}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {lock.lockType}
                        </Badge>
                      </div>
                      <div className="text-gray-600 mt-1">
                        Held for {Math.round(lock.holdDuration / 1000)}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modification History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Recent Modifications
                </h4>
                <div className="space-y-2">
                  {transactionState.modifications.slice(0, 5).map((mod) => (
                    <div
                      key={mod.id}
                      className="p-2 bg-gray-50 rounded text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{mod.operation}</span>
                        <span className="text-gray-600">{mod.table}</span>
                      </div>
                      <div className="text-gray-600 mt-1">
                        {mod.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestIsolationManager;
