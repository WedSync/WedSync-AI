'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  UserCheck,
  UserX,
  Clock,
  Target,
  Shuffle,
} from 'lucide-react';
import {
  WorkloadMetrics,
  TaskAssignmentSuggestion,
  CapacityPlan,
} from '@/lib/services/workload-tracking-service';

interface WorkloadDashboardProps {
  weddingId: string;
  onReassignTask?: (
    taskId: string,
    fromMember: string,
    toMember: string,
  ) => Promise<void>;
}

export const WorkloadDashboard: React.FC<WorkloadDashboardProps> = ({
  weddingId,
  onReassignTask,
}) => {
  const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics[]>([]);
  const [capacityPlan, setCapacityPlan] = useState<CapacityPlan | null>(null);
  const [balanceSuggestions, setBalanceSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  useEffect(() => {
    loadWorkloadData();
  }, [weddingId]);

  const loadWorkloadData = async () => {
    setLoading(true);
    try {
      const [metricsResponse, capacityResponse, balanceResponse] =
        await Promise.all([
          fetch(`/api/workflow/workload/${weddingId}/metrics`),
          fetch(`/api/workflow/workload/${weddingId}/capacity`),
          fetch(`/api/workflow/workload/${weddingId}/balance-suggestions`),
        ]);

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setWorkloadMetrics(metrics);
      }

      if (capacityResponse.ok) {
        const capacity = await capacityResponse.json();
        setCapacityPlan(capacity);
      }

      if (balanceResponse.ok) {
        const suggestions = await balanceResponse.json();
        setBalanceSuggestions(suggestions.reassignments || []);
      }
    } catch (error) {
      console.error('Failed to load workload data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'busy':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'overloaded':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'unavailable':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <UserCheck className="w-4 h-4" />;
      case 'busy':
        return <Clock className="w-4 h-4" />;
      case 'overloaded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unavailable':
        return <UserX className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 50) return 'bg-green-500';
    if (utilization <= 75) return 'bg-blue-500';
    if (utilization <= 90) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleBalanceWorkload = async () => {
    if (balanceSuggestions.length === 0) return;

    try {
      for (const suggestion of balanceSuggestions) {
        if (onReassignTask) {
          await onReassignTask(
            suggestion.task_id,
            suggestion.from_member,
            suggestion.to_member,
          );
        }
      }
      await loadWorkloadData(); // Refresh data
      setShowBalanceModal(false);
    } catch (error) {
      console.error('Failed to balance workload:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const overloadedMembers = workloadMetrics.filter(
    (m) => m.availability_status === 'overloaded',
  );
  const availableMembers = workloadMetrics.filter(
    (m) => m.availability_status === 'available',
  );

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      {capacityPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlan.total_team_size}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Capacity Utilization
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlan.capacity_utilization}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overloaded Members
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {overloadedMembers.length}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Available Members
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {availableMembers.length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workload Balance Alert */}
      {balanceSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shuffle className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="font-medium text-amber-900">
                  Workload Imbalance Detected
                </h4>
                <p className="text-sm text-amber-700">
                  {balanceSuggestions.length} task reassignments suggested to
                  balance workload
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBalanceModal(true)}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
            >
              Review Suggestions
            </button>
          </div>
        </div>
      )}

      {/* Team Member Workload Grid */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Workload Overview
          </h3>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            {workloadMetrics.map((member) => (
              <div
                key={member.team_member_id}
                className={`
                  border rounded-lg p-4 transition-all duration-200
                  ${
                    selectedMember === member.team_member_id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() =>
                  setSelectedMember(
                    selectedMember === member.team_member_id
                      ? null
                      : member.team_member_id,
                  )
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {member.team_member_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {member.team_member_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {member.role} • {member.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`
                      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${getAvailabilityColor(member.availability_status)}
                    `}
                    >
                      {getAvailabilityIcon(member.availability_status)}
                      <span className="ml-1 capitalize">
                        {member.availability_status}
                      </span>
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      {member.capacity_utilization}%
                    </span>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Capacity Utilization</span>
                    <span>{member.estimated_hours_remaining}h / 40h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(member.capacity_utilization)}`}
                      style={{
                        width: `${Math.min(100, member.capacity_utilization)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Task Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {member.active_tasks}
                    </p>
                    <p className="text-gray-500">Active Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">
                      {member.completed_tasks}
                    </p>
                    <p className="text-gray-500">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-red-600">
                      {member.overdue_tasks}
                    </p>
                    <p className="text-gray-500">Overdue</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">
                      {member.task_completion_rate.toFixed(1)}%
                    </p>
                    <p className="text-gray-500">Success Rate</p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedMember === member.team_member_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">
                          Performance Metrics
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Workload Score:
                            </span>
                            <span className="font-medium">
                              {member.workload_score.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Avg. Completion:
                            </span>
                            <span className="font-medium">
                              {member.avg_completion_time_days.toFixed(1)} days
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">
                          Current Load
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Tasks:</span>
                            <span className="font-medium">
                              {member.total_assigned_tasks}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Remaining Hours:
                            </span>
                            <span className="font-medium">
                              {member.estimated_hours_remaining}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capacity Recommendations */}
      {capacityPlan && capacityPlan.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Capacity Recommendations
          </h3>
          <div className="space-y-2">
            {capacityPlan.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
              >
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance Suggestions Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Workload Balance Suggestions
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-80">
              <div className="space-y-4">
                {balanceSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        Task Reassignment #{index + 1}
                      </h4>
                      <span className="text-xs text-gray-500">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500">From:</span>
                        <span className="font-medium text-red-600">
                          {suggestion.from_member}
                        </span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500">To:</span>
                        <span className="font-medium text-green-600">
                          {suggestion.to_member}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBalanceWorkload}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Apply Suggestions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
