/**
 * WS-140 Trial Management System - Trial Progress Bar Component
 * Visual progress indicator with milestone markers and interactive tooltips
 * Follows Untitled UI design patterns with wedding-focused UX
 */

'use client';

import React, { useState } from 'react';
import { Progress } from '@/components/untitled-ui/progress';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import {
  CheckCircle,
  Circle,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  TrialMilestone,
  MilestoneType,
  MILESTONE_DEFINITIONS,
} from '@/types/trial';

interface MilestoneMarkerProps {
  milestone: TrialMilestone;
  position: number;
  isActive: boolean;
  onClick: (milestone: TrialMilestone) => void;
}

function MilestoneMarker({
  milestone,
  position,
  isActive,
  onClick,
}: MilestoneMarkerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      style={{ left: `${position}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => onClick(milestone)}
        className={`
          absolute -top-2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all duration-200
          ${
            milestone.achieved
              ? 'bg-green-500 border-green-500 text-white'
              : isActive
                ? 'bg-primary-500 border-primary-500 text-white animate-pulse'
                : 'bg-white border-gray-300 text-gray-400 hover:border-primary-300'
          }
        `}
        aria-label={milestone.milestone_name}
      >
        {milestone.achieved ? (
          <CheckCircle className="w-3 h-3" />
        ) : isActive ? (
          <Target className="w-3 h-3" />
        ) : (
          <Circle className="w-3 h-3" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-16 -translate-x-1/2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
            <div className="flex items-center space-x-2 mb-1">
              {milestone.achieved ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <Clock className="w-3 h-3 text-amber-400" />
              )}
              <span className="font-medium">{milestone.milestone_name}</span>
            </div>
            <p className="text-gray-300">{milestone.description}</p>
            {milestone.achieved && milestone.achieved_at && (
              <p className="text-green-400 mt-1 text-xs">
                Completed {new Date(milestone.achieved_at).toLocaleDateString()}
              </p>
            )}
            {!milestone.achieved && (
              <p className="text-amber-400 mt-1 text-xs">
                Click for instructions
              </p>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

interface TrialProgressBarProps {
  milestones: TrialMilestone[];
  progressPercentage: number;
  daysRemaining: number;
  className?: string;
  showMilestoneList?: boolean;
  onMilestoneClick?: (milestone: TrialMilestone) => void;
}

export function TrialProgressBar({
  milestones,
  progressPercentage,
  daysRemaining,
  className = '',
  showMilestoneList = true,
  onMilestoneClick,
}: TrialProgressBarProps) {
  const [selectedMilestone, setSelectedMilestone] =
    useState<TrialMilestone | null>(null);

  // Sort milestones by achievement status and type
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.achieved && !b.achieved) return -1;
    if (!a.achieved && b.achieved) return 1;
    return a.milestone_type.localeCompare(b.milestone_type);
  });

  const completedCount = milestones.filter((m) => m.achieved).length;
  const totalCount = milestones.length;
  const nextMilestone = milestones.find((m) => !m.achieved);

  const handleMilestoneClick = (milestone: TrialMilestone) => {
    setSelectedMilestone(
      selectedMilestone?.id === milestone.id ? null : milestone,
    );
    onMilestoneClick?.(milestone);
  };

  // Calculate milestone positions on progress bar
  const getMilestonePosition = (index: number) => {
    return ((index + 1) / totalCount) * 100;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Trial Progress
          </h3>
          <p className="text-sm text-gray-600">
            {completedCount} of {totalCount} milestones completed
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={daysRemaining <= 7 ? 'error' : 'success'}>
            {daysRemaining} days left
          </Badge>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Progress Bar with Milestones */}
      <div className="relative">
        <Progress value={progressPercentage} className="h-3 bg-gray-200" />

        {/* Milestone markers */}
        <div className="relative">
          {sortedMilestones.map((milestone, index) => (
            <MilestoneMarker
              key={milestone.id}
              milestone={milestone}
              position={getMilestonePosition(index)}
              isActive={
                !milestone.achieved && milestone.id === nextMilestone?.id
              }
              onClick={handleMilestoneClick}
            />
          ))}
        </div>
      </div>

      {/* Next Milestone CTA */}
      {nextMilestone && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Target className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <h4 className="font-medium text-primary-900">
                  Next Milestone: {nextMilestone.milestone_name}
                </h4>
                <p className="text-sm text-primary-700 mt-1">
                  {nextMilestone.description}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-primary-600" />
                    <span className="text-xs text-primary-600">
                      Est.{' '}
                      {MILESTONE_DEFINITIONS[
                        nextMilestone.milestone_type as MilestoneType
                      ]?.estimated_time_savings_hours || 1}
                      h saved
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-primary-600" />
                    <span className="text-xs text-primary-600">
                      High impact
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleMilestoneClick(nextMilestone)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Milestone Instructions Panel */}
      {selectedMilestone && !selectedMilestone.achieved && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedMilestone.milestone_name}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {selectedMilestone.description}
              </p>
            </div>
            <button
              onClick={() => setSelectedMilestone(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">How to complete:</h5>
            <ol className="space-y-2">
              {MILESTONE_DEFINITIONS[
                selectedMilestone.milestone_type as MilestoneType
              ]?.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 text-xs font-medium rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Save{' '}
                    {MILESTONE_DEFINITIONS[
                      selectedMilestone.milestone_type as MilestoneType
                    ]?.estimated_time_savings_hours || 1}{' '}
                    hours
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600">
                    Impact:{' '}
                    {
                      MILESTONE_DEFINITIONS[
                        selectedMilestone.milestone_type as MilestoneType
                      ]?.value_impact_score
                    }
                    /10
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // TODO: Navigate to the appropriate section
                  console.log('Navigate to:', selectedMilestone.milestone_type);
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone List */}
      {showMilestoneList && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">All Milestones</h4>
          <div className="space-y-2">
            {sortedMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                  ${
                    milestone.achieved
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 hover:border-primary-300'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {milestone.achieved ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${milestone.achieved ? 'text-green-900' : 'text-gray-900'}`}
                    >
                      {milestone.milestone_name}
                    </p>
                    <p
                      className={`text-sm ${milestone.achieved ? 'text-green-700' : 'text-gray-600'}`}
                    >
                      {milestone.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {milestone.achieved && milestone.achieved_at && (
                    <Badge variant="success" size="sm">
                      Completed
                    </Badge>
                  )}
                  {!milestone.achieved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMilestoneClick(milestone)}
                    >
                      Start
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
