'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Calendar,
  Database,
  FileImage,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Search,
  Filter,
  Play,
  Camera,
  Users,
  FileText,
} from 'lucide-react';

interface RecoveryPoint {
  id: string;
  timestamp: string;
  backup_type: 'full' | 'incremental' | 'transaction_log' | 'snapshot';
  status: 'available' | 'corrupted' | 'expired' | 'processing';
  size_gb: number;

  // Wedding context
  wedding_events_count: number;
  active_weddings: WeddingSnapshot[];

  // Data completeness
  data_completeness: {
    user_profiles: number;
    wedding_data: number;
    vendor_data: number;
    media_files: number;
    documents: number;
    financial_records: number;
  };

  // Recovery capabilities
  can_recover_to: boolean;
  recovery_time_estimate_minutes: number;
  dependencies: string[];

  // Metadata
  created_by: 'scheduled_backup' | 'manual_backup' | 'emergency_snapshot';
  retention_expires: string;
  validation_status: 'verified' | 'pending' | 'failed';

  // Wedding-specific
  critical_wedding_data: {
    upcoming_weddings_7days: number;
    wedding_photos_gb: number;
    contract_documents: number;
    timeline_events: number;
  };
}

interface WeddingSnapshot {
  wedding_id: string;
  couple_name: string;
  wedding_date: string;
  photographer_name: string;
  venue_name: string;
  status: 'planning' | 'confirmed' | 'completed';
  data_completeness: number;
  critical_assets: {
    photos: number;
    documents: number;
    timeline_items: number;
    guest_count: number;
  };
}

interface RecoveryRequest {
  id: string;
  target_timestamp: string;
  recovery_point_id: string;
  scope: 'full_system' | 'wedding_specific' | 'date_range' | 'table_specific';

  // Filters
  wedding_ids?: string[];
  vendor_ids?: string[];
  table_names?: string[];
  date_range?: { start: string; end: string };

  // Options
  verify_integrity: boolean;
  create_backup_before: boolean;
  dry_run: boolean;

  // Status
  status:
    | 'pending'
    | 'approved'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'cancelled';
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;

  // Safety
  impact_assessment: {
    affected_weddings: number;
    affected_vendors: number;
    data_loss_risk: 'low' | 'medium' | 'high';
    wedding_disruption: boolean;
  };

  requested_by: string;
  approved_by?: string;
  requested_at: string;
  reason: string;
}

export default function PointInTimeRecovery() {
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>(
    [],
  );
  const [selectedPoint, setSelectedPoint] = useState<RecoveryPoint | null>(
    null,
  );
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [backupTypeFilter, setBackupTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Recovery request form
  const [recoveryForm, setRecoveryForm] = useState({
    scope: 'full_system',
    wedding_ids: '',
    verify_integrity: true,
    create_backup_before: true,
    dry_run: true,
    reason: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadRecoveryData();
  }, [dateRange, backupTypeFilter]);

  const loadRecoveryData = async () => {
    try {
      setLoading(true);

      // Load recovery points
      let pointsQuery = supabase
        .from('recovery_points')
        .select(
          `
          *,
          active_weddings:wedding_snapshots(*)
        `,
        )
        .gte('timestamp', dateRange.start)
        .lte('timestamp', dateRange.end + 'T23:59:59')
        .order('timestamp', { ascending: false });

      if (backupTypeFilter !== 'all') {
        pointsQuery = pointsQuery.eq('backup_type', backupTypeFilter);
      }

      const { data: pointsData, error: pointsError } = await pointsQuery;

      if (pointsError) throw pointsError;

      // Load recovery requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('recovery_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(10);

      if (requestsError) throw requestsError;

      setRecoveryPoints(pointsData || []);
      setRecoveryRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading recovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRecoveryRequest = async () => {
    if (!selectedPoint || !recoveryForm.reason.trim()) {
      return;
    }

    try {
      const weddingIds = recoveryForm.wedding_ids
        ? recoveryForm.wedding_ids
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [];

      const requestData = {
        target_timestamp: selectedPoint.timestamp,
        recovery_point_id: selectedPoint.id,
        scope: recoveryForm.scope,
        wedding_ids: weddingIds.length > 0 ? weddingIds : null,
        verify_integrity: recoveryForm.verify_integrity,
        create_backup_before: recoveryForm.create_backup_before,
        dry_run: recoveryForm.dry_run,
        reason: recoveryForm.reason,
        requested_by: 'system_admin', // Should come from auth context
        estimated_duration_minutes:
          selectedPoint.recovery_time_estimate_minutes,
        impact_assessment: {
          affected_weddings:
            recoveryForm.scope === 'wedding_specific'
              ? weddingIds.length
              : selectedPoint.wedding_events_count,
          affected_vendors: 0, // Calculate based on scope
          data_loss_risk: recoveryForm.create_backup_before ? 'low' : 'medium',
          wedding_disruption: selectedPoint.active_weddings.some(
            (w) =>
              new Date(w.wedding_date) <=
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ),
        },
      };

      const { error } = await supabase
        .from('recovery_requests')
        .insert([requestData]);

      if (error) throw error;

      setShowCreateRequest(false);
      setRecoveryForm({
        scope: 'full_system',
        wedding_ids: '',
        verify_integrity: true,
        create_backup_before: true,
        dry_run: true,
        reason: '',
      });

      loadRecoveryData();
    } catch (error) {
      console.error('Error creating recovery request:', error);
    }
  };

  const approveRecoveryRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('recovery_requests')
        .update({
          status: 'approved',
          approved_by: 'system_admin', // Should come from auth context
        })
        .eq('id', requestId);

      if (error) throw error;

      loadRecoveryData();
    } catch (error) {
      console.error('Error approving recovery request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'verified':
      case 'completed':
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'processing':
      case 'in_progress':
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      case 'corrupted':
      case 'failed':
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDataCompletenessColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPoints = recoveryPoints.filter((point) => {
    const matchesSearch =
      searchTerm === '' ||
      point.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      point.created_by.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

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
            Point-in-Time Recovery
          </h1>
          <p className="text-gray-600 mt-1">
            Restore wedding data to any previous state with precision
          </p>
        </div>
        <Button
          onClick={() => setShowCreateRequest(true)}
          disabled={!selectedPoint}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Create Recovery Request
        </Button>
      </div>

      {/* Active Recovery Requests */}
      {recoveryRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Active Recovery Requests
          </h2>
          <div className="space-y-3">
            {recoveryRequests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                    <span className="font-medium">
                      {request.scope.replace('_', ' ')} Recovery
                    </span>
                    <span className="text-sm text-gray-600">
                      to {new Date(request.target_timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Reason: {request.reason}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Requested:{' '}
                      {new Date(request.requested_at).toLocaleString()}
                    </span>
                    <span>
                      Duration: ~{request.estimated_duration_minutes}min
                    </span>
                    {request.impact_assessment.wedding_disruption && (
                      <span className="text-red-600 font-medium">
                        ⚠️ Wedding Impact
                      </span>
                    )}
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveRecoveryRequest(request.id)}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Date Range:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="px-2 py-1 border rounded text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="px-2 py-1 border rounded text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={backupTypeFilter}
              onChange={(e) => setBackupTypeFilter(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="full">Full Backup</option>
              <option value="incremental">Incremental</option>
              <option value="snapshot">Snapshot</option>
              <option value="transaction_log">Transaction Log</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search recovery points..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Points List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Available Recovery Points</h2>

          {filteredPoints.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Recovery Points
              </h3>
              <p className="text-gray-600">
                No backup points found for the selected criteria.
              </p>
            </Card>
          ) : (
            filteredPoints.map((point) => (
              <Card
                key={point.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                  selectedPoint?.id === point.id ? 'ring-2 ring-purple-500' : ''
                } ${point.status === 'corrupted' ? 'border-red-300 bg-red-50' : ''}`}
                onClick={() => setSelectedPoint(point)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {new Date(point.timestamp).toLocaleString()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {point.backup_type.replace('_', ' ')} •{' '}
                        {point.size_gb.toFixed(2)} GB •{' '}
                        {point.created_by.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(point.status)}>
                      {point.status}
                    </Badge>
                    <Badge
                      className={getStatusColor(point.validation_status)}
                      variant="outline"
                    >
                      {point.validation_status}
                    </Badge>
                  </div>
                </div>

                {/* Wedding Context */}
                {point.active_weddings.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-800">
                        {point.active_weddings.length} Active Wedding(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {point.active_weddings.slice(0, 4).map((wedding) => (
                        <div
                          key={wedding.wedding_id}
                          className="bg-white p-2 rounded border"
                        >
                          <p className="font-medium text-purple-800">
                            {wedding.couple_name}
                          </p>
                          <p className="text-purple-600">
                            {new Date(
                              wedding.wedding_date,
                            ).toLocaleDateString()}{' '}
                            • {wedding.photographer_name}
                          </p>
                          <p className="text-purple-600">
                            Data: {wedding.data_completeness}% • Photos:{' '}
                            {wedding.critical_assets.photos}
                          </p>
                        </div>
                      ))}
                      {point.active_weddings.length > 4 && (
                        <p className="text-purple-600 col-span-2">
                          +{point.active_weddings.length - 4} more weddings
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Data Completeness */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  <div className="text-center">
                    <Users className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.user_profiles)}`}
                    >
                      {point.data_completeness.user_profiles}%
                    </p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.wedding_data)}`}
                    >
                      {point.data_completeness.wedding_data}%
                    </p>
                    <p className="text-xs text-gray-500">Weddings</p>
                  </div>
                  <div className="text-center">
                    <Camera className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.media_files)}`}
                    >
                      {point.data_completeness.media_files}%
                    </p>
                    <p className="text-xs text-gray-500">Media</p>
                  </div>
                  <div className="text-center">
                    <FileText className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.documents)}`}
                    >
                      {point.data_completeness.documents}%
                    </p>
                    <p className="text-xs text-gray-500">Docs</p>
                  </div>
                  <div className="text-center">
                    <Database className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.vendor_data)}`}
                    >
                      {point.data_completeness.vendor_data}%
                    </p>
                    <p className="text-xs text-gray-500">Vendors</p>
                  </div>
                  <div className="text-center">
                    <FileText className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                    <p
                      className={`text-sm font-medium ${getDataCompletenessColor(point.data_completeness.financial_records)}`}
                    >
                      {point.data_completeness.financial_records}%
                    </p>
                    <p className="text-xs text-gray-500">Finance</p>
                  </div>
                </div>

                {/* Recovery Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t">
                  <div className="flex items-center gap-4">
                    <span>
                      Recovery Time: ~{point.recovery_time_estimate_minutes}min
                    </span>
                    <span>
                      Expires:{' '}
                      {new Date(point.retention_expires).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {point.can_recover_to ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span>{point.can_recover_to ? 'Ready' : 'Processing'}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Recovery Request Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recovery Details</h2>

          {selectedPoint ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Selected Point</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {new Date(selectedPoint.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPoint.backup_type} •{' '}
                    {selectedPoint.size_gb.toFixed(2)} GB
                  </p>
                </div>

                {selectedPoint.critical_wedding_data && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">
                      Critical Wedding Data
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        Upcoming (7d):{' '}
                        {
                          selectedPoint.critical_wedding_data
                            .upcoming_weddings_7days
                        }
                      </div>
                      <div>
                        Photos:{' '}
                        {selectedPoint.critical_wedding_data.wedding_photos_gb}
                        GB
                      </div>
                      <div>
                        Contracts:{' '}
                        {selectedPoint.critical_wedding_data.contract_documents}
                      </div>
                      <div>
                        Events:{' '}
                        {selectedPoint.critical_wedding_data.timeline_events}
                      </div>
                    </div>
                  </div>
                )}

                {showCreateRequest && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Recovery Request</h4>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Recovery Scope
                      </label>
                      <select
                        value={recoveryForm.scope}
                        onChange={(e) =>
                          setRecoveryForm((prev) => ({
                            ...prev,
                            scope: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option value="full_system">
                          Full System Recovery
                        </option>
                        <option value="wedding_specific">
                          Specific Weddings
                        </option>
                        <option value="date_range">Date Range</option>
                        <option value="table_specific">Specific Tables</option>
                      </select>
                    </div>

                    {recoveryForm.scope === 'wedding_specific' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Wedding IDs
                        </label>
                        <Input
                          value={recoveryForm.wedding_ids}
                          onChange={(e) =>
                            setRecoveryForm((prev) => ({
                              ...prev,
                              wedding_ids: e.target.value,
                            }))
                          }
                          placeholder="Enter wedding IDs separated by commas"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recoveryForm.verify_integrity}
                          onChange={(e) =>
                            setRecoveryForm((prev) => ({
                              ...prev,
                              verify_integrity: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm">Verify data integrity</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recoveryForm.create_backup_before}
                          onChange={(e) =>
                            setRecoveryForm((prev) => ({
                              ...prev,
                              create_backup_before: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm">
                          Create backup before recovery
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recoveryForm.dry_run}
                          onChange={(e) =>
                            setRecoveryForm((prev) => ({
                              ...prev,
                              dry_run: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm">
                          Dry run (simulation only)
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reason for Recovery
                      </label>
                      <textarea
                        value={recoveryForm.reason}
                        onChange={(e) =>
                          setRecoveryForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="Explain why this recovery is needed..."
                        className="w-full p-2 border rounded-lg text-sm h-20 resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={createRecoveryRequest}
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Submit Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateRequest(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Recovery Point
              </h3>
              <p className="text-gray-600">
                Choose a backup point to view details and create recovery
                requests.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
