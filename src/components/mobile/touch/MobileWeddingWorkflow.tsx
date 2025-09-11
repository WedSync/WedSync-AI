/**
 * WedSync Mobile Wedding Workflow Component
 * WS-189: Wedding-specific mobile touch optimization
 *
 * WEDDING WORKFLOW FEATURES:
 * - Phase-specific touch optimization (prep, ceremony, reception, cleanup)
 * - Equipment-friendly controls with glove compatibility
 * - Emergency access patterns with large, clearly labeled critical action buttons
 * - Team coordination features with gesture-based communication
 * - Professional mobile workflow with seamless phase transitions
 *
 * @version 1.0.0
 * @author WedSync Mobile Team
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TouchOptimizedButton } from './TouchOptimizedButton';
import { GestureHandler } from './GestureHandler';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useMobileTouch } from '@/hooks/useMobileTouch';

/**
 * Wedding phases with specific mobile touch optimizations
 */
export type WeddingPhase = 'prep' | 'ceremony' | 'reception' | 'cleanup';

/**
 * Wedding workflow context for touch optimization
 */
interface WeddingWorkflowContext {
  phase: WeddingPhase;
  timeRemaining: number;
  criticalTasks: string[];
  teamMembers: TeamMember[];
  emergencyContacts: EmergencyContact[];
}

/**
 * Team member information for collaboration
 */
interface TeamMember {
  id: string;
  name: string;
  role: 'photographer' | 'planner' | 'vendor' | 'couple';
  status: 'available' | 'busy' | 'emergency';
  location?: string;
}

/**
 * Emergency contact for quick access
 */
interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Component props for mobile wedding workflow
 */
interface MobileWeddingWorkflowProps {
  weddingPhase: WeddingPhase;
  equipmentHandling: boolean;
  emergencyMode: boolean;
  teamCollaboration: boolean;
  context: WeddingWorkflowContext;
  onPhaseChange: (phase: WeddingPhase) => void;
  onEmergencyAction: (action: string, data: any) => void;
  onTeamCommunication: (memberId: string, message: string) => void;
  className?: string;
}

/**
 * Mobile Wedding Workflow Component
 * Optimizes touch interactions for specific wedding phases and scenarios
 */
export const MobileWeddingWorkflow: React.FC<MobileWeddingWorkflowProps> = ({
  weddingPhase,
  equipmentHandling,
  emergencyMode,
  teamCollaboration,
  context,
  onPhaseChange,
  onEmergencyAction,
  onTeamCommunication,
  className,
}) => {
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'timeline' | 'team' | 'emergency'
  >('dashboard');
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const { triggerFeedback } = useHapticFeedback();
  const { optimizeTouchTargets, trackGesture } = useMobileTouch();

  /**
   * Phase-specific touch optimizations
   */
  const phaseConfig = {
    prep: {
      primaryActions: ['Check Vendor Status', 'Update Timeline', 'Photo Setup'],
      touchTargetSize: equipmentHandling ? 'xl' : 'large',
      hapticIntensity: 'medium',
      gestureEnabled: true,
      quickAccess: ['Vendor Contacts', 'Timeline', 'Setup Notes'],
    },
    ceremony: {
      primaryActions: ['Silent Mode', 'Photo Cue', 'Emergency Only'],
      touchTargetSize: 'xl',
      hapticIntensity: 'light',
      gestureEnabled: false, // Minimize accidental touches
      quickAccess: ['Emergency Contacts', 'Silent Actions', 'Photo Markers'],
    },
    reception: {
      primaryActions: ['Timeline Update', 'Photo Share', 'Vendor Coordinate'],
      touchTargetSize: 'large',
      hapticIntensity: 'medium',
      gestureEnabled: true,
      quickAccess: ['Timeline', 'Photo Gallery', 'Team Chat'],
    },
    cleanup: {
      primaryActions: ['Equipment Check', 'Final Photos', 'Wrap Reports'],
      touchTargetSize: equipmentHandling ? 'xl' : 'large',
      hapticIntensity: 'strong',
      gestureEnabled: true,
      quickAccess: ['Checklist', 'Photo Upload', 'Team Status'],
    },
  };

  const currentConfig = phaseConfig[weddingPhase];

  /**
   * Handle phase-specific touch optimization
   */
  useEffect(() => {
    optimizeTouchTargets(currentConfig.touchTargetSize, equipmentHandling);
    setQuickActions(currentConfig.quickAccess);
  }, [weddingPhase, equipmentHandling, optimizeTouchTargets]);

  /**
   * Handle gesture-based navigation between phases
   */
  const handlePhaseSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const phases: WeddingPhase[] = [
        'prep',
        'ceremony',
        'reception',
        'cleanup',
      ];
      const currentIndex = phases.indexOf(weddingPhase);

      let newIndex: number;
      if (direction === 'left' && currentIndex < phases.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === 'right' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else {
        return;
      }

      const newPhase = phases[newIndex];
      onPhaseChange(newPhase);
      triggerFeedback(currentConfig.hapticIntensity);
      trackGesture('phase_swipe', { from: weddingPhase, to: newPhase });
    },
    [weddingPhase, onPhaseChange, triggerFeedback, trackGesture, currentConfig],
  );

  /**
   * Handle emergency action with haptic feedback
   */
  const handleEmergencyAction = useCallback(
    (action: string, data: any) => {
      triggerFeedback('strong');
      onEmergencyAction(action, data);
      trackGesture('emergency_action', { action, phase: weddingPhase });
    },
    [onEmergencyAction, triggerFeedback, trackGesture, weddingPhase],
  );

  /**
   * Quick communication with team members
   */
  const handleQuickCommunication = useCallback(
    (memberId: string, messageType: string) => {
      const quickMessages = {
        status_request: `Status update requested for ${weddingPhase} phase`,
        help_needed: `Need assistance with ${weddingPhase} phase activities`,
        ready_check: `Ready check for next phase transition`,
        photo_opportunity: `Photo opportunity available now`,
        emergency: `Emergency assistance needed - ${weddingPhase} phase`,
      };

      const message =
        quickMessages[messageType as keyof typeof quickMessages] || messageType;
      onTeamCommunication(memberId, message);
      triggerFeedback('light');
    },
    [onTeamCommunication, triggerFeedback, weddingPhase],
  );

  /**
   * Render phase-specific dashboard
   */
  const renderPhaseDashboard = () => {
    return (
      <div className="space-y-6">
        {/* Phase Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {weddingPhase} Phase
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {context.timeRemaining > 0
              ? `${Math.floor(context.timeRemaining / 60)}h ${context.timeRemaining % 60}m remaining`
              : 'Phase active'}
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 gap-4">
          {currentConfig.primaryActions.map((action, index) => (
            <TouchOptimizedButton
              key={action}
              onClick={() =>
                handleEmergencyAction(
                  action.toLowerCase().replace(' ', '_'),
                  {},
                )
              }
              size="xl"
              touchTarget={currentConfig.touchTargetSize as any}
              variant={index === 0 ? 'primary' : 'secondary'}
              hapticFeedback={true}
              className={cn(
                'h-16 text-lg font-semibold',
                equipmentHandling && 'border-4 border-blue-200',
              )}
            >
              {action}
            </TouchOptimizedButton>
          ))}
        </div>

        {/* Critical Tasks */}
        {context.criticalTasks.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Critical Tasks
            </h3>
            <div className="space-y-2">
              {context.criticalTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-yellow-700">{task}</span>
                  <TouchOptimizedButton
                    onClick={() =>
                      handleEmergencyAction('complete_task', { task })
                    }
                    size="sm"
                    touchTarget="large"
                    variant="secondary"
                    className="bg-yellow-100 hover:bg-yellow-200"
                  >
                    ✓
                  </TouchOptimizedButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render emergency access panel
   */
  const renderEmergencyPanel = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Emergency Access</h2>
          <p className="text-sm text-red-500 mt-1">
            Tap any contact for instant communication
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {context.emergencyContacts.map((contact) => (
            <TouchOptimizedButton
              key={contact.id}
              onClick={() =>
                handleEmergencyAction('emergency_call', { contact })
              }
              size="xl"
              touchTarget="xl"
              variant={contact.priority === 'high' ? 'danger' : 'secondary'}
              className={cn(
                'h-20 flex flex-col items-center justify-center',
                contact.priority === 'high' && 'border-4 border-red-300',
                equipmentHandling && 'text-xl font-bold',
              )}
            >
              <span className="font-semibold">{contact.name}</span>
              <span className="text-sm opacity-75">{contact.role}</span>
              <span className="text-xs opacity-50">{contact.phone}</span>
            </TouchOptimizedButton>
          ))}
        </div>

        {/* Emergency Actions */}
        <div className="grid grid-cols-2 gap-4">
          <TouchOptimizedButton
            onClick={() => handleEmergencyAction('broadcast_emergency', {})}
            size="lg"
            touchTarget="xl"
            variant="danger"
            className="h-16 font-bold"
          >
            🚨 Alert All
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={() => handleEmergencyAction('call_venue_security', {})}
            size="lg"
            touchTarget="xl"
            variant="danger"
            className="h-16 font-bold"
          >
            🏢 Venue Security
          </TouchOptimizedButton>
        </div>
      </div>
    );
  };

  /**
   * Render team collaboration panel
   */
  const renderTeamPanel = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Team Coordination
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Quick communication with team members
          </p>
        </div>

        <div className="space-y-4">
          {context.teamMembers.map((member) => (
            <div
              key={member.id}
              className={cn(
                'bg-white border rounded-lg p-4',
                member.status === 'emergency'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200',
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {member.role}
                  </p>
                  {member.location && (
                    <p className="text-xs text-gray-500">{member.location}</p>
                  )}
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full',
                    member.status === 'available'
                      ? 'bg-green-500'
                      : member.status === 'busy'
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TouchOptimizedButton
                  onClick={() =>
                    handleQuickCommunication(member.id, 'status_request')
                  }
                  size="sm"
                  touchTarget="large"
                  variant="secondary"
                  className="text-sm"
                >
                  Status Check
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  onClick={() =>
                    handleQuickCommunication(member.id, 'help_needed')
                  }
                  size="sm"
                  touchTarget="large"
                  variant="primary"
                  className="text-sm"
                >
                  Need Help
                </TouchOptimizedButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render current view based on selection
   */
  const renderCurrentView = () => {
    switch (currentView) {
      case 'emergency':
        return renderEmergencyPanel();
      case 'team':
        return renderTeamPanel();
      case 'dashboard':
      default:
        return renderPhaseDashboard();
    }
  };

  if (emergencyMode) {
    return (
      <div className={cn('p-4 bg-red-50 min-h-screen', className)}>
        {renderEmergencyPanel()}
      </div>
    );
  }

  return (
    <GestureHandler
      onSwipeLeft={
        currentConfig.gestureEnabled
          ? () => handlePhaseSwipe('left')
          : undefined
      }
      onSwipeRight={
        currentConfig.gestureEnabled
          ? () => handlePhaseSwipe('right')
          : undefined
      }
      className={cn('p-4 min-h-screen bg-gray-50', className)}
      sensitivity="high"
    >
      {/* Navigation Bar */}
      <div className="mb-6">
        <div className="grid grid-cols-4 gap-2">
          <TouchOptimizedButton
            onClick={() => setCurrentView('dashboard')}
            size="sm"
            touchTarget={currentConfig.touchTargetSize as any}
            variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
            className="text-xs"
          >
            📋 Dashboard
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={() => setCurrentView('timeline')}
            size="sm"
            touchTarget={currentConfig.touchTargetSize as any}
            variant={currentView === 'timeline' ? 'primary' : 'ghost'}
            className="text-xs"
          >
            📅 Timeline
          </TouchOptimizedButton>
          {teamCollaboration && (
            <TouchOptimizedButton
              onClick={() => setCurrentView('team')}
              size="sm"
              touchTarget={currentConfig.touchTargetSize as any}
              variant={currentView === 'team' ? 'primary' : 'ghost'}
              className="text-xs"
            >
              👥 Team
            </TouchOptimizedButton>
          )}
          <TouchOptimizedButton
            onClick={() => setCurrentView('emergency')}
            size="sm"
            touchTarget="xl"
            variant={currentView === 'emergency' ? 'danger' : 'secondary'}
            className={cn(
              'text-xs font-bold',
              emergencyMode ? 'animate-pulse bg-red-600 text-white' : '',
            )}
          >
            🚨 Emergency
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Current View Content */}
      <div className="mb-6">{renderCurrentView()}</div>

      {/* Phase Progress Indicator */}
      {!emergencyMode && (
        <div className="fixed bottom-4 left-4 right-4">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <div className="flex items-center justify-between">
              {(
                ['prep', 'ceremony', 'reception', 'cleanup'] as WeddingPhase[]
              ).map((phase, index) => (
                <div
                  key={phase}
                  className={cn(
                    'flex-1 text-center py-2 text-xs font-medium capitalize rounded-full transition-all',
                    phase === weddingPhase
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {phase}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar (if enabled) */}
      {currentConfig.gestureEnabled && quickActions.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4">
          <div className="bg-white rounded-lg p-2 shadow-lg">
            <div className="flex space-x-2 overflow-x-auto">
              {quickActions.map((action) => (
                <TouchOptimizedButton
                  key={action}
                  onClick={() =>
                    handleEmergencyAction(
                      action.toLowerCase().replace(' ', '_'),
                      {},
                    )
                  }
                  size="sm"
                  touchTarget="large"
                  variant="ghost"
                  className="whitespace-nowrap text-xs"
                >
                  {action}
                </TouchOptimizedButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </GestureHandler>
  );
};

export default MobileWeddingWorkflow;
