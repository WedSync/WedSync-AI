'use client';

import React, { useState } from 'react';
import { TeamMember, DelegationRequest } from '@/types/workflow';
import { UserRole } from '@/types/roles';
import {
  X,
  User,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelegate: (delegation: {
    to_user_id: string;
    delegation_type: 'assignment' | 'approval' | 'review' | 'collaboration';
    authority_level: number;
    deadline?: string;
    instructions?: string;
  }) => void;
  teamMembers: (TeamMember & {
    user_role: UserRole;
    authority_level: number;
    can_delegate: boolean;
  })[];
  taskTitle: string;
  taskId: string;
  currentUserId: string;
  currentUserAuthority: number;
  isSubmitting?: boolean;
}

const delegationTypes = [
  {
    value: 'assignment' as const,
    label: 'Full Assignment',
    description: 'Transfer complete responsibility for the task',
    icon: User,
    authorityRequired: 3,
  },
  {
    value: 'collaboration' as const,
    label: 'Collaboration',
    description: 'Work together on the task',
    icon: CheckCircle,
    authorityRequired: 1,
  },
  {
    value: 'review' as const,
    label: 'Review Only',
    description: 'Review and approve task completion',
    icon: Shield,
    authorityRequired: 2,
  },
  {
    value: 'approval' as const,
    label: 'Approval Authority',
    description: 'Approve task decisions and changes',
    icon: AlertTriangle,
    authorityRequired: 4,
  },
];

export function DelegationModal({
  isOpen,
  onClose,
  onDelegate,
  teamMembers,
  taskTitle,
  taskId,
  currentUserId,
  currentUserAuthority,
  isSubmitting = false,
}: DelegationModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [delegationType, setDelegationType] = useState<
    'assignment' | 'approval' | 'review' | 'collaboration'
  >('assignment');
  const [authorityLevel, setAuthorityLevel] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!selectedUserId) {
      newErrors.selectedUserId = 'Please select a team member';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onDelegate({
      to_user_id: selectedUserId,
      delegation_type: delegationType,
      authority_level: authorityLevel,
      deadline: deadline || undefined,
      instructions: instructions || undefined,
    });
  };

  // Filter team members who can receive this delegation
  const eligibleMembers = teamMembers.filter((member) => {
    if (member.id === currentUserId) return false;

    // Can only delegate to users with lower authority
    return member.authority_level < currentUserAuthority;
  });

  const selectedMember = eligibleMembers.find((m) => m.id === selectedUserId);
  const selectedDelegationType = delegationTypes.find(
    (t) => t.value === delegationType,
  );

  const getAuthorityLevelColor = (level: number) => {
    if (level >= 80) return 'text-purple-600 bg-purple-100';
    if (level >= 60) return 'text-blue-600 bg-blue-100';
    if (level >= 40) return 'text-green-600 bg-green-100';
    if (level >= 20) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getAuthorityLabel = (level: number) => {
    if (level >= 80) return 'Senior Leadership';
    if (level >= 60) return 'Management';
    if (level >= 40) return 'Coordination';
    if (level >= 20) return 'Specialist';
    return 'Junior';
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Delegate Task
              </h2>
              <p className="text-sm text-gray-600 mt-1">{taskTitle}</p>
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
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Delegation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Delegation Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {delegationTypes.map((type) => {
                  const Icon = type.icon;
                  const canUse =
                    type.authorityRequired <= currentUserAuthority / 20; // Convert to 1-5 scale

                  return (
                    <label
                      key={type.value}
                      className={`
                        relative flex flex-col p-4 border-2 rounded-lg cursor-pointer
                        transition-all duration-200 
                        ${canUse ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}
                        ${
                          delegationType === type.value && canUse
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="delegationType"
                        value={type.value}
                        checked={delegationType === type.value}
                        onChange={(e) =>
                          setDelegationType(e.target.value as any)
                        }
                        disabled={!canUse}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <Icon
                          className={`w-5 h-5 ${canUse ? 'text-gray-700' : 'text-gray-400'}`}
                        />
                        <span
                          className={`font-medium ${canUse ? 'text-gray-900' : 'text-gray-500'}`}
                        >
                          {type.label}
                        </span>
                      </div>
                      <span
                        className={`text-sm ${canUse ? 'text-gray-600' : 'text-gray-400'}`}
                      >
                        {type.description}
                      </span>
                      {!canUse && (
                        <span className="text-xs text-red-600 mt-1">
                          Requires higher authority level
                        </span>
                      )}
                      {delegationType === type.value && canUse && (
                        <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Authority Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authority Level
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={authorityLevel}
                  onChange={(e) => setAuthorityLevel(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-900 min-w-[3ch]">
                  {authorityLevel}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Level {authorityLevel}:{' '}
                {selectedDelegationType?.authorityRequired === authorityLevel
                  ? 'Required for this delegation type'
                  : 'Basic delegation authority'}
              </p>
            </div>

            {/* Team Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Team Member
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {eligibleMembers.map((member) => {
                  const isSelected = selectedUserId === member.id;
                  const authorityColor = getAuthorityLevelColor(
                    member.authority_level,
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
                        onChange={(e) => setSelectedUserId(e.target.value)}
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
                          <span
                            className={`
                            inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full
                            ${authorityColor}
                          `}
                          >
                            {getAuthorityLabel(member.authority_level)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="capitalize">{member.role}</span>
                          <span>Authority: {member.authority_level}</span>
                          {member.can_delegate && (
                            <span className="text-green-600">
                              ✓ Can delegate
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary-600" />
                      )}
                    </label>
                  );
                })}
              </div>

              {eligibleMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No eligible team members for delegation</p>
                  <p className="text-xs mt-1">
                    You can only delegate to users with lower authority
                  </p>
                </div>
              )}

              {errors.selectedUserId && (
                <p className="text-sm text-red-600 mt-2">
                  {errors.selectedUserId}
                </p>
              )}
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delegation Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="
                    w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                    text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100
                    focus:border-primary-300 transition-all duration-200
                  "
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="
                  w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-gray-900 placeholder-gray-500 shadow-xs
                  focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                  transition-all duration-200
                "
                placeholder="Any specific instructions for the delegation..."
              />
            </div>

            {/* Preview */}
            {selectedMember && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Delegation Preview
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Type:</strong> {selectedDelegationType?.label}
                  </p>
                  <p>
                    <strong>To:</strong> {selectedMember.name} (
                    {getAuthorityLabel(selectedMember.authority_level)})
                  </p>
                  <p>
                    <strong>Authority:</strong> Level {authorityLevel}
                  </p>
                  {deadline && (
                    <p>
                      <strong>Deadline:</strong>{' '}
                      {format(new Date(deadline), 'MMM dd, yyyy at HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            )}
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
              disabled={!selectedUserId || isSubmitting}
              className="
                px-4 py-2.5 text-sm font-semibold text-white bg-primary-600
                hover:bg-primary-700 rounded-lg shadow-xs hover:shadow-sm
                focus:outline-none focus:ring-4 focus:ring-primary-100
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? 'Creating Delegation...' : 'Create Delegation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
