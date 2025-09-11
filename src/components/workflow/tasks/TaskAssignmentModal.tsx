'use client';

import React, { useState } from 'react';
import { TeamMember, TaskCategory } from '@/types/workflow';
import { X, User, Clock, Star, CheckCircle } from 'lucide-react';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (memberId: string, role?: string) => void;
  teamMembers: TeamMember[];
  currentAssigneeId?: string;
  taskCategory?: TaskCategory;
  taskTitle: string;
  estimatedHours: number;
  isSubmitting?: boolean;
}

export function TaskAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  teamMembers,
  currentAssigneeId,
  taskCategory,
  taskTitle,
  estimatedHours,
  isSubmitting = false,
}: TaskAssignmentModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState(
    currentAssigneeId || '',
  );
  const [selectedRole, setSelectedRole] = useState('assignee');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId) {
      onAssign(selectedMemberId, selectedRole);
    }
  };

  // Sort team members by relevance
  const sortedMembers = [...teamMembers].sort((a, b) => {
    // Prioritize specialists for the task category
    const aSpecialist = taskCategory
      ? a.specialties.includes(taskCategory)
      : false;
    const bSpecialist = taskCategory
      ? b.specialties.includes(taskCategory)
      : false;

    if (aSpecialist && !bSpecialist) return -1;
    if (!aSpecialist && bSpecialist) return 1;

    // Then by workload (lower is better)
    return a.current_workload - b.current_workload;
  });

  const getWorkloadColor = (workload: number) => {
    if (workload < 70) return 'text-green-600';
    if (workload < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWorkloadLabel = (workload: number) => {
    if (workload < 70) return 'Light load';
    if (workload < 85) return 'Moderate load';
    return 'Heavy load';
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Assign Task
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {taskTitle} • {estimatedHours} hours
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Assignment Role */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assignment Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    value: 'assignee',
                    label: 'Primary Assignee',
                    desc: 'Responsible for completion',
                  },
                  {
                    value: 'collaborator',
                    label: 'Collaborator',
                    desc: 'Supports the primary assignee',
                  },
                  {
                    value: 'reviewer',
                    label: 'Reviewer',
                    desc: 'Reviews and approves work',
                  },
                ].map((role) => (
                  <label
                    key={role.value}
                    className={`
                      relative flex flex-col p-3 border-2 rounded-lg cursor-pointer
                      transition-all duration-200 hover:bg-gray-50
                      ${
                        selectedRole === role.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {role.label}
                    </span>
                    <span className="text-xs text-gray-600 mt-1">
                      {role.desc}
                    </span>
                    {selectedRole === role.value && (
                      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Team Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Team Member
              </label>
              <div className="space-y-3">
                {sortedMembers.map((member) => {
                  const isSpecialist = taskCategory
                    ? member.specialties.includes(taskCategory)
                    : false;
                  const isSelected = selectedMemberId === member.id;
                  const workloadColor = getWorkloadColor(
                    member.current_workload,
                  );

                  return (
                    <label
                      key={member.id}
                      className={`
                        relative flex items-center p-4 border-2 rounded-lg cursor-pointer
                        transition-all duration-200 hover:bg-gray-50
                        ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="member"
                        value={member.id}
                        checked={isSelected}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="sr-only"
                      />

                      {/* Avatar */}
                      <div className="flex-shrink-0 mr-4">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {member.name}
                          </h4>
                          {isSpecialist && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                          {member.id === currentAssigneeId && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="capitalize">{member.role}</span>
                          <span className={workloadColor}>
                            {member.current_workload}% •{' '}
                            {getWorkloadLabel(member.current_workload)}
                          </span>
                          <span>{member.available_hours_per_week}h/week</span>
                        </div>

                        {isSpecialist && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Specializes in {taskCategory?.replace('_', ' ')}
                          </p>
                        )}
                      </div>

                      {/* Workload Indicator */}
                      <div className="flex-shrink-0 ml-4">
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              member.current_workload < 70
                                ? 'bg-green-500'
                                : member.current_workload < 85
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(member.current_workload, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary-600" />
                      )}
                    </label>
                  );
                })}
              </div>

              {sortedMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No team members available</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100
                transition-all duration-200
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMemberId || isSubmitting}
              className="
                px-4 py-2.5 text-sm font-semibold text-white bg-primary-600
                hover:bg-primary-700 rounded-lg shadow-xs hover:shadow-sm
                focus:outline-none focus:ring-4 focus:ring-primary-100
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
