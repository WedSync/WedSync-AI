'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Camera,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

// Types
import { PhotoGroup, PhotoGroupConflict } from '@/types/photo-groups';

// API Service
import { photoGroupsApiService } from '@/lib/services/photo-groups-api-service';

interface ConflictResolution {
  id: string;
  type:
    | 'reschedule'
    | 'reassign_guest'
    | 'split_group'
    | 'merge_group'
    | 'change_location';
  title: string;
  description: string;
  confidence: number;
  estimated_time_saved: number;
  difficulty: 'easy' | 'medium' | 'hard';
  auto_applicable: boolean;
}

interface DetailedConflict extends PhotoGroupConflict {
  groups: PhotoGroup[];
  affected_guests: Array<{
    id: string;
    name: string;
    conflicts: string[];
  }>;
  resolutions: ConflictResolution[];
  timeline_impact: number;
  photographer_impact: 'none' | 'minor' | 'major';
}

interface ConflictDetectionPanelProps {
  conflicts?: PhotoGroupConflict[];
  photoGroups: PhotoGroup[];
  coupleId: string;
  onResolveConflict?: (
    conflictId: string,
    resolution: ConflictResolution,
  ) => Promise<void>;
  onPreviewResolution?: (resolution: ConflictResolution) => void;
  className?: string;
  autoResolve?: boolean;
}

export function ConflictDetectionPanel({
  conflicts: initialConflicts,
  photoGroups,
  coupleId,
  onResolveConflict,
  onPreviewResolution,
  className = '',
  autoResolve = false,
}: ConflictDetectionPanelProps) {
  // State
  const [conflicts, setConflicts] = useState<PhotoGroupConflict[]>(
    initialConflicts || [],
  );
  const [detailedConflicts, setDetailedConflicts] = useState<
    DetailedConflict[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);

  // Enhance conflicts with detailed analysis
  const analyzeConflicts = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch latest conflicts from API
      const conflictResponse = await photoGroupsApiService.getConflicts(
        coupleId,
        showResolved,
        undefined,
      );

      setConflicts(conflictResponse.conflicts);

      // Enhance conflicts with additional details
      const enhanced = conflictResponse.conflicts.map(
        (conflict): DetailedConflict => {
          // Find related groups
          const relatedGroups = photoGroups.filter(
            (group) =>
              group.id === conflict.groupId ||
              group.id === conflict.conflictingGroupId,
          );

          // Generate resolutions based on conflict type
          const resolutions: ConflictResolution[] = [];

          if (conflict.reason === 'time_overlap') {
            resolutions.push({
              id: `reschedule-${conflict.groupId}`,
              type: 'reschedule',
              title: 'Reschedule Second Group',
              description:
                'Move the later group to the next available time slot',
              confidence: 0.85,
              estimated_time_saved: 15,
              difficulty: 'easy',
              auto_applicable: true,
            });

            resolutions.push({
              id: `split-${conflict.groupId}`,
              type: 'split_group',
              title: 'Split Conflicting Groups',
              description:
                'Separate guests with time conflicts into different groups',
              confidence: 0.7,
              estimated_time_saved: 10,
              difficulty: 'medium',
              auto_applicable: false,
            });
          }

          if (conflict.reason === 'guest_overlap') {
            resolutions.push({
              id: `reassign-${conflict.groupId}`,
              type: 'reassign_guest',
              title: 'Reassign Conflicting Guests',
              description: 'Move overlapping guests to non-conflicting groups',
              confidence: 0.9,
              estimated_time_saved: 20,
              difficulty: 'easy',
              auto_applicable: true,
            });
          }

          if (conflict.reason === 'location_conflict') {
            resolutions.push({
              id: `change-location-${conflict.groupId}`,
              type: 'change_location',
              title: 'Update Group Location',
              description: 'Change to an available nearby location',
              confidence: 0.75,
              estimated_time_saved: 8,
              difficulty: 'easy',
              auto_applicable: true,
            });
          }

          return {
            ...conflict,
            groups: relatedGroups,
            affected_guests: [
              // Mock guest data - in real implementation would come from API
              {
                id: 'guest-1',
                name: 'John Smith',
                conflicts: ['Time overlap in Family Photos'],
              },
            ],
            resolutions,
            timeline_impact: Math.floor(Math.random() * 30) + 5, // Mock timeline impact
            photographer_impact: ['none', 'minor', 'major'][
              Math.floor(Math.random() * 3)
            ] as any,
          };
        },
      );

      setDetailedConflicts(enhanced);
    } catch (error) {
      console.error('Failed to analyze conflicts:', error);
    } finally {
      setLoading(false);
    }
  }, [coupleId, photoGroups, showResolved]);

  // Re-analyze when photo groups change or component mounts
  useEffect(() => {
    analyzeConflicts();
  }, [analyzeConflicts]);

  // Auto-resolve conflicts if enabled
  useEffect(() => {
    if (autoResolve && detailedConflicts.length > 0) {
      const autoResolvableConflicts = detailedConflicts.filter((conflict) =>
        conflict.resolutions.some(
          (r) => r.auto_applicable && r.confidence > 0.8,
        ),
      );

      autoResolvableConflicts.forEach((conflict) => {
        const bestResolution = conflict.resolutions
          .filter((r) => r.auto_applicable)
          .sort((a, b) => b.confidence - a.confidence)[0];

        if (bestResolution) {
          handleResolveConflict(conflict.groupId, bestResolution);
        }
      });
    }
  }, [autoResolve, detailedConflicts]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    async (conflictId: string, resolution: ConflictResolution) => {
      setResolving((prev) => new Set([...prev, conflictId]));

      try {
        // Map our resolution type to API resolution strategy
        const strategyMap: Record<string, string> = {
          reschedule: 'reschedule_second',
          reassign_guest: 'reassign_guests',
          split_group: 'split_time',
          merge_group: 'merge_groups',
          change_location: 'reschedule_second',
        };

        await photoGroupsApiService.resolveConflict({
          conflict_id: conflictId,
          resolution_strategy: strategyMap[resolution.type] as any,
          resolution_data: {
            title: resolution.title,
            description: resolution.description,
            confidence: resolution.confidence,
          },
        });

        // Call external handler if provided
        if (onResolveConflict) {
          await onResolveConflict(conflictId, resolution);
        }

        // Refresh conflicts after resolution
        await analyzeConflicts();
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
      } finally {
        setResolving((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conflictId);
          return newSet;
        });
      }
    },
    [onResolveConflict, analyzeConflicts],
  );

  // Get conflict severity color
  const getSeverityColor = (severity: 'warning' | 'error') => {
    return severity === 'error'
      ? 'border-red-200 bg-red-50'
      : 'border-amber-200 bg-amber-50';
  };

  const getSeverityIconColor = (severity: 'warning' | 'error') => {
    return severity === 'error' ? 'text-red-500' : 'text-amber-500';
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
    }
  };

  // Filter conflicts
  const filteredConflicts = useMemo(() => {
    return showResolved
      ? detailedConflicts
      : detailedConflicts.filter((c) => !resolving.has(c.groupId));
  }, [detailedConflicts, showResolved, resolving]);

  if (loading) {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-xl p-8 ${className}`}
      >
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-3" />
          <span className="text-gray-600">Analyzing conflicts...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Conflict Detection
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredConflicts.length} conflict
              {filteredConflicts.length !== 1 ? 's' : ''} detected
              {resolving.size > 0 && (
                <span className="ml-2 text-green-600">
                  • {resolving.size} resolving
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            >
              {previewMode ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
              {previewMode ? 'Hide Preview' : 'Preview Mode'}
            </button>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                showResolved
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showResolved ? 'Hide Resolved' : 'Show Resolved'}
            </button>
            <button
              onClick={analyzeConflicts}
              className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="divide-y divide-gray-200">
        {filteredConflicts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conflicts detected
            </h3>
            <p className="text-gray-600">
              All photo groups are properly scheduled without conflicts.
            </p>
          </div>
        ) : (
          filteredConflicts.map((conflict) => (
            <div key={conflict.groupId} className="p-6">
              {/* Conflict Header */}
              <div
                className={`p-4 rounded-lg border-2 ${getSeverityColor(conflict.severity)} mb-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <AlertTriangle
                      className={`w-5 h-5 mr-3 mt-0.5 ${getSeverityIconColor(conflict.severity)}`}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {conflict.message}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {conflict.timeline_impact}min impact
                        </span>
                        <span className="flex items-center">
                          <Camera className="w-3 h-3 mr-1" />
                          {conflict.photographer_impact} photographer impact
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {conflict.affected_guests.length} guest
                          {conflict.affected_guests.length !== 1
                            ? 's'
                            : ''}{' '}
                          affected
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedConflict(
                        selectedConflict === conflict.groupId
                          ? null
                          : conflict.groupId,
                      )
                    }
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {selectedConflict === conflict.groupId ? (
                      <XCircle />
                    ) : (
                      <Eye />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Conflict Details */}
              {selectedConflict === conflict.groupId && (
                <div className="space-y-4 ml-8 pb-4 border-l-2 border-gray-200 pl-4">
                  {/* Affected Groups */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      Affected Groups
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {conflict.groups.map((group) => (
                        <div
                          key={group.id}
                          className="p-3 border border-gray-200 rounded-lg"
                        >
                          <h6 className="font-medium text-gray-900">
                            {group.name}
                          </h6>
                          <div className="text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {group.estimated_time_minutes}m
                              </span>
                              {group.location && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {group.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Affected Guests */}
                  {conflict.affected_guests.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        Affected Guests
                      </h5>
                      <div className="space-y-2">
                        {conflict.affected_guests.map((guest) => (
                          <div
                            key={guest.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium text-gray-900">
                              {guest.name}
                            </span>
                            <div className="text-sm text-amber-600">
                              {guest.conflicts.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Suggestions */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3">
                  Suggested Resolutions
                </h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {conflict.resolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h6 className="font-medium text-gray-900">
                          {resolution.title}
                        </h6>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyColor(resolution.difficulty)}`}
                          >
                            {resolution.difficulty}
                          </span>
                          {resolution.auto_applicable && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              Auto
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {resolution.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            {Math.round(resolution.confidence * 100)}%
                            confidence
                          </span>
                          <span>
                            {resolution.estimated_time_saved}min saved
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {previewMode && (
                            <button
                              onClick={() => onPreviewResolution(resolution)}
                              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleResolveConflict(
                                conflict.groupId,
                                resolution,
                              )
                            }
                            disabled={resolving.has(conflict.groupId)}
                            className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {resolving.has(conflict.groupId) ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                            {resolving.has(conflict.groupId)
                              ? 'Applying...'
                              : 'Apply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConflictDetectionPanel;
