'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  FileImage,
  Users,
  Calendar,
  Pause,
  Play,
  X,
  Activity,
} from 'lucide-react';

interface RecoveryOperation {
  id: string;
  operation_name: string;
  recovery_type:
    | 'full_system'
    | 'wedding_specific'
    | 'vendor_data'
    | 'media_files'
    | 'database_only';
  status:
    | 'initializing'
    | 'in_progress'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';
  overall_progress: number;
  started_at: string;
  estimated_completion?: string;
  completed_at?: string;
  initiated_by: string;
  priority: 'emergency' | 'high' | 'normal' | 'low';
  wedding_id?: string;
  wedding_date?: string;
  vendor_id?: string;

  // Progress breakdown
  stages: RecoveryStage[];
  current_stage: string;

  // Metrics
  total_files: number;
  files_recovered: number;
  total_size_gb: number;
  recovered_size_gb: number;
  data_integrity_score: number;

  // Wedding specific
  critical_wedding_assets: {
    photos_recovered: number;
    photos_total: number;
    contracts_recovered: number;
    contracts_total: number;
    timeline_recovered: boolean;
    guest_list_recovered: boolean;
  };

  errors?: RecoveryError[];
  warnings?: string[];
}

interface RecoveryStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  progress: number;
  started_at?: string;
  completed_at?: string;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  dependencies?: string[];
  wedding_critical: boolean;
}

interface RecoveryError {
  id: string;
  stage_id: string;
  error_type:
    | 'data_corruption'
    | 'access_denied'
    | 'network_timeout'
    | 'storage_full'
    | 'validation_failed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  occurred_at: string;
  resolution_status: 'unresolved' | 'investigating' | 'resolved' | 'workaround';
  affects_wedding: boolean;
}

export default function RecoveryProgressTracker() {
  const [operations, setOperations] = useState<RecoveryOperation[]>([]);
  const [selectedOperation, setSelectedOperation] =
    useState<RecoveryOperation | null>(null);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadRecoveryOperations();

    if (realTimeUpdates) {
      const interval = setInterval(loadRecoveryOperations, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeUpdates]);

  const loadRecoveryOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('recovery_operations')
        .select(
          `
          *,
          stages:recovery_stages(*),
          errors:recovery_errors(*)
        `,
        )
        .order('started_at', { ascending: false });

      if (error) throw error;

      setOperations(data || []);

      // Update selected operation if it exists
      if (selectedOperation) {
        const updated = data?.find((op) => op.id === selectedOperation.id);
        if (updated) {
          setSelectedOperation(updated);
        }
      }
    } catch (error) {
      console.error('Error loading recovery operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlOperation = async (
    operationId: string,
    action: 'pause' | 'resume' | 'cancel',
  ) => {
    try {
      const { error } = await supabase
        .from('recovery_operations')
        .update({
          status:
            action === 'pause'
              ? 'paused'
              : action === 'resume'
                ? 'in_progress'
                : 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) throw error;

      // Refresh data
      loadRecoveryOperations();
    } catch (error) {
      console.error('Error controlling operation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const getRecoveryTypeIcon = (type: string) => {
    switch (type) {
      case 'full_system':
        return Database;
      case 'wedding_specific':
        return Calendar;
      case 'vendor_data':
        return Users;
      case 'media_files':
        return FileImage;
      case 'database_only':
        return Database;
      default:
        return RefreshCw;
    }
  };

  const formatTimeRemaining = (estimatedCompletion?: string) => {
    if (!estimatedCompletion) return 'Unknown';
    const remaining =
      new Date(estimatedCompletion).getTime() - new Date().getTime();
    if (remaining <= 0) return 'Completing...';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Recovery Progress Tracker
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor wedding data recovery operations in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={realTimeUpdates}
              onChange={(e) => setRealTimeUpdates(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Real-time updates</span>
          </label>
          <Button onClick={loadRecoveryOperations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Active Recovery Operations</h2>

          {operations.length === 0 ? (
            <Card className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Recovery Operations
              </h3>
              <p className="text-gray-600">
                All systems are running normally. No recovery operations in
                progress.
              </p>
            </Card>
          ) : (
            operations.map((operation) => {
              const Icon = getRecoveryTypeIcon(operation.recovery_type);

              return (
                <Card
                  key={operation.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedOperation?.id === operation.id
                      ? 'ring-2 ring-purple-500'
                      : ''
                  } ${operation.priority === 'emergency' ? 'border-red-300 bg-red-50' : ''}`}
                  onClick={() => setSelectedOperation(operation)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {operation.operation_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {operation.recovery_type.replace('_', ' ')} • Started{' '}
                          {new Date(operation.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(operation.priority)}>
                        {operation.priority}
                      </Badge>
                      <Badge className={getStatusColor(operation.status)}>
                        {operation.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Wedding Info */}
                  {operation.wedding_id && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-purple-800">
                          Wedding Recovery
                        </span>
                      </div>
                      <p className="text-sm text-purple-700 mt-1">
                        Wedding Date:{' '}
                        {operation.wedding_date
                          ? new Date(
                              operation.wedding_date,
                            ).toLocaleDateString()
                          : 'Unknown'}
                      </p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Overall Progress
                      </span>
                      <span className="text-sm text-gray-600">
                        {operation.overall_progress}%
                      </span>
                    </div>
                    <Progress
                      value={operation.overall_progress}
                      className="h-2"
                    />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Files: </span>
                        <span className="font-medium">
                          {operation.files_recovered}/{operation.total_files}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Size: </span>
                        <span className="font-medium">
                          {operation.recovered_size_gb.toFixed(1)}/
                          {operation.total_size_gb.toFixed(1)} GB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Stage: </span>
                        <span className="font-medium">
                          {operation.current_stage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ETA: </span>
                        <span className="font-medium">
                          {formatTimeRemaining(operation.estimated_completion)}
                        </span>
                      </div>
                    </div>

                    {/* Wedding Critical Assets */}
                    {operation.critical_wedding_assets && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-purple-50 p-2 rounded">
                        <div>
                          Photos:{' '}
                          {operation.critical_wedding_assets.photos_recovered}/
                          {operation.critical_wedding_assets.photos_total}
                        </div>
                        <div>
                          Contracts:{' '}
                          {
                            operation.critical_wedding_assets
                              .contracts_recovered
                          }
                          /{operation.critical_wedding_assets.contracts_total}
                        </div>
                        <div>
                          Timeline:{' '}
                          {operation.critical_wedding_assets.timeline_recovered
                            ? '✓'
                            : '✗'}
                        </div>
                        <div>
                          Guest List:{' '}
                          {operation.critical_wedding_assets
                            .guest_list_recovered
                            ? '✓'
                            : '✗'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  {['in_progress', 'paused'].includes(operation.status) && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {operation.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlOperation(operation.id, 'pause');
                          }}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      {operation.status === 'paused' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            controlOperation(operation.id, 'resume');
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          controlOperation(operation.id, 'cancel');
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Errors */}
                  {operation.errors && operation.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">
                          {operation.errors.length} Error(s)
                        </span>
                      </div>
                      {operation.errors.slice(0, 2).map((error) => (
                        <div key={error.id} className="text-sm text-red-700">
                          <p className="font-medium">
                            {error.error_type.replace('_', ' ')}:{' '}
                            {error.message}
                          </p>
                          {error.affects_wedding && (
                            <span className="text-xs text-red-600">
                              ⚠️ Affects wedding data
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Detailed View */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Operation Details</h2>

          {selectedOperation ? (
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedOperation.operation_name}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={getStatusColor(selectedOperation.status)}>
                      {selectedOperation.status}
                    </Badge>
                    <Badge
                      className={getPriorityColor(selectedOperation.priority)}
                    >
                      {selectedOperation.priority}
                    </Badge>
                  </div>
                </div>

                {/* Data Integrity Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Data Integrity Score</span>
                    <span
                      className={`font-bold ${selectedOperation.data_integrity_score >= 95 ? 'text-green-600' : selectedOperation.data_integrity_score >= 85 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {selectedOperation.data_integrity_score}%
                    </span>
                  </div>
                  <Progress
                    value={selectedOperation.data_integrity_score}
                    className="h-2"
                  />
                </div>

                {/* Stages */}
                <div>
                  <h4 className="font-medium mb-3">Recovery Stages</h4>
                  <div className="space-y-3">
                    {selectedOperation.stages.map((stage) => (
                      <div key={stage.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                stage.status === 'completed'
                                  ? 'bg-green-500'
                                  : stage.status === 'in_progress'
                                    ? 'bg-blue-500'
                                    : stage.status === 'failed'
                                      ? 'bg-red-500'
                                      : 'bg-gray-300'
                              }`}
                            />
                            <span className="font-medium text-sm">
                              {stage.name}
                            </span>
                            {stage.wedding_critical && (
                              <Badge variant="secondary" className="text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-600">
                            {stage.progress}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {stage.description}
                        </p>
                        <Progress value={stage.progress} className="h-1" />

                        {stage.actual_duration_minutes && (
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>
                              Duration: {stage.actual_duration_minutes}m
                            </span>
                            <span>
                              Est: {stage.estimated_duration_minutes}m
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {selectedOperation.warnings &&
                  selectedOperation.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-yellow-800">
                        Warnings
                      </h4>
                      <div className="space-y-1">
                        {selectedOperation.warnings.map((warning, index) => (
                          <div
                            key={index}
                            className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded"
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Operation
              </h3>
              <p className="text-gray-600">
                Choose a recovery operation to view detailed progress
                information.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
