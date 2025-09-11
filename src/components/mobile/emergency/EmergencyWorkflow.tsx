'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Mic,
  Camera,
  MapPin,
  Users,
  Shield,
  Zap,
} from 'lucide-react';
import { useMobileInfrastructure } from '@/hooks/useMobileInfrastructure';

/**
 * WS-257 Team D: Emergency Workflow Management
 * Mobile-optimized emergency response workflows with step-by-step guidance
 */

interface EmergencyStep {
  id: string;
  title: string;
  description: string;
  type: 'assessment' | 'action' | 'communication' | 'documentation';
  priority: 'critical' | 'high' | 'medium';
  estimatedTime: number; // seconds
  requiresConfirmation: boolean;
  canSkip: boolean;
  actions?: EmergencyAction[];
}

interface EmergencyAction {
  id: string;
  label: string;
  type: 'button' | 'call' | 'photo' | 'voice' | 'location';
  data?: any;
  icon?: any;
}

interface EmergencyWorkflow {
  id: string;
  name: string;
  category: 'infrastructure' | 'wedding-day' | 'security' | 'technical';
  severity: 'critical' | 'high' | 'medium';
  steps: EmergencyStep[];
  estimatedDuration: number;
  requiredPersonnel?: string[];
}

interface Props {
  workflowId?: string;
  emergencyType?:
    | 'infrastructure-failure'
    | 'wedding-day-crisis'
    | 'security-breach'
    | 'technical-outage';
  onComplete?: (results: any) => void;
  onCancel?: () => void;
}

const EMERGENCY_WORKFLOWS: Record<string, EmergencyWorkflow> = {
  'infrastructure-failure': {
    id: 'infrastructure-failure',
    name: 'Infrastructure Failure Response',
    category: 'infrastructure',
    severity: 'critical',
    estimatedDuration: 300, // 5 minutes
    requiredPersonnel: ['Technical Lead', 'Infrastructure Engineer'],
    steps: [
      {
        id: 'assess-scope',
        title: 'Assess Failure Scope',
        description:
          'Determine the extent and impact of the infrastructure failure',
        type: 'assessment',
        priority: 'critical',
        estimatedTime: 60,
        requiresConfirmation: true,
        canSkip: false,
        actions: [
          {
            id: 'check-services',
            label: 'Check Service Status',
            type: 'button',
            icon: Shield,
          },
          {
            id: 'capture-logs',
            label: 'Capture Error Logs',
            type: 'photo',
            icon: Camera,
          },
        ],
      },
      {
        id: 'isolate-failure',
        title: 'Isolate Failed Components',
        description: 'Prevent failure from spreading to healthy systems',
        type: 'action',
        priority: 'critical',
        estimatedTime: 90,
        requiresConfirmation: true,
        canSkip: false,
        actions: [
          {
            id: 'enable-circuit-breakers',
            label: 'Enable Circuit Breakers',
            type: 'button',
            icon: Shield,
          },
          {
            id: 'redirect-traffic',
            label: 'Redirect Traffic',
            type: 'button',
            icon: ArrowRight,
          },
        ],
      },
      {
        id: 'notify-stakeholders',
        title: 'Notify Stakeholders',
        description: 'Alert relevant teams and affected clients',
        type: 'communication',
        priority: 'high',
        estimatedTime: 45,
        requiresConfirmation: false,
        canSkip: true,
        actions: [
          {
            id: 'call-technical-lead',
            label: 'Call Technical Lead',
            type: 'call',
            data: { number: '+1-800-TECH-LEAD' },
            icon: Phone,
          },
          {
            id: 'alert-clients',
            label: 'Send Client Alerts',
            type: 'button',
            icon: Users,
          },
        ],
      },
      {
        id: 'initiate-recovery',
        title: 'Initiate Recovery Process',
        description: 'Begin systematic restoration of services',
        type: 'action',
        priority: 'high',
        estimatedTime: 120,
        requiresConfirmation: true,
        canSkip: false,
        actions: [
          {
            id: 'start-failover',
            label: 'Start Automated Failover',
            type: 'button',
            icon: Zap,
          },
          {
            id: 'manual-intervention',
            label: 'Manual Recovery',
            type: 'button',
            icon: Shield,
          },
        ],
      },
      {
        id: 'document-incident',
        title: 'Document Incident',
        description: 'Record details for post-incident review',
        type: 'documentation',
        priority: 'medium',
        estimatedTime: 30,
        requiresConfirmation: false,
        canSkip: true,
        actions: [
          {
            id: 'voice-notes',
            label: 'Record Voice Notes',
            type: 'voice',
            icon: Mic,
          },
          {
            id: 'take-photos',
            label: 'Photograph Evidence',
            type: 'photo',
            icon: Camera,
          },
        ],
      },
    ],
  },
  'wedding-day-crisis': {
    id: 'wedding-day-crisis',
    name: 'Wedding Day Crisis Management',
    category: 'wedding-day',
    severity: 'critical',
    estimatedDuration: 180, // 3 minutes
    requiredPersonnel: [
      'Wedding Coordinator',
      'Venue Manager',
      'Technical Support',
    ],
    steps: [
      {
        id: 'assess-crisis',
        title: 'Assess Crisis Severity',
        description: 'Quickly evaluate the impact on the wedding event',
        type: 'assessment',
        priority: 'critical',
        estimatedTime: 30,
        requiresConfirmation: false,
        canSkip: false,
        actions: [
          {
            id: 'check-wedding-status',
            label: 'Check Wedding Systems',
            type: 'button',
            icon: Shield,
          },
        ],
      },
      {
        id: 'protect-event',
        title: 'Protect Wedding Event',
        description: 'Implement emergency protocols to minimize disruption',
        type: 'action',
        priority: 'critical',
        estimatedTime: 60,
        requiresConfirmation: true,
        canSkip: false,
        actions: [
          {
            id: 'activate-backup-systems',
            label: 'Activate Backup Systems',
            type: 'button',
            icon: Zap,
          },
          {
            id: 'manual-fallback',
            label: 'Switch to Manual Mode',
            type: 'button',
            icon: Users,
          },
        ],
      },
      {
        id: 'coordinate-response',
        title: 'Coordinate Emergency Response',
        description: 'Organize team response and communications',
        type: 'communication',
        priority: 'critical',
        estimatedTime: 45,
        requiresConfirmation: false,
        canSkip: false,
        actions: [
          {
            id: 'call-coordinator',
            label: 'Call Wedding Coordinator',
            type: 'call',
            data: { number: '+1-800-WEDDING' },
            icon: Phone,
          },
          {
            id: 'alert-vendors',
            label: 'Alert All Vendors',
            type: 'button',
            icon: Users,
          },
        ],
      },
      {
        id: 'maintain-event',
        title: 'Maintain Event Flow',
        description: 'Keep wedding on schedule with alternative solutions',
        type: 'action',
        priority: 'high',
        estimatedTime: 45,
        requiresConfirmation: false,
        canSkip: true,
        actions: [
          {
            id: 'coordinate-timeline',
            label: 'Adjust Timeline',
            type: 'button',
            icon: Clock,
          },
        ],
      },
    ],
  },
};

export default function EmergencyWorkflow({
  workflowId = 'infrastructure-failure',
  emergencyType = 'infrastructure-failure',
  onComplete,
  onCancel,
}: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [isCompleting, setIsCompleting] = useState(false);
  const [results, setResults] = useState<any>({});

  const { vibrate, showNotification, triggerHapticFeedback, capturePhoto } =
    useMobileInfrastructure();

  const workflow =
    EMERGENCY_WORKFLOWS[workflowId] || EMERGENCY_WORKFLOWS[emergencyType];
  const currentStep = workflow?.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / workflow.steps.length) * 100;
  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const stepElapsedTime = Math.floor((Date.now() - stepStartTime) / 1000);

  useEffect(() => {
    // Vibrate when starting workflow
    vibrate([200, 100, 200]);

    // Show emergency notification
    showNotification('🚨 Emergency Workflow Started', {
      body: `${workflow.name} is now active`,
      tag: 'emergency-workflow',
      requireInteraction: true,
    });
  }, [vibrate, showNotification, workflow.name]);

  useEffect(() => {
    // Reset step timer when moving to next step
    setStepStartTime(Date.now());
  }, [currentStepIndex]);

  const handleStepComplete = useCallback(
    async (stepId: string, stepResults?: any) => {
      setCompletedSteps((prev) => new Set([...prev, stepId]));
      setResults((prev) => ({ ...prev, [stepId]: stepResults }));

      triggerHapticFeedback('medium');

      if (currentStepIndex < workflow.steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // Workflow complete
        setIsCompleting(true);

        const finalResults = {
          workflowId: workflow.id,
          completedSteps: Array.from(completedSteps),
          skippedSteps: Array.from(skippedSteps),
          totalTime: elapsedTime,
          results: { ...results, [stepId]: stepResults },
        };

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause for UI

        showNotification('✅ Emergency Workflow Complete', {
          body: `${workflow.name} completed successfully`,
          tag: 'emergency-complete',
        });

        onComplete?.(finalResults);
      }
    },
    [
      currentStepIndex,
      workflow,
      completedSteps,
      skippedSteps,
      elapsedTime,
      results,
      triggerHapticFeedback,
      showNotification,
      onComplete,
    ],
  );

  const handleStepSkip = useCallback(
    (stepId: string) => {
      setSkippedSteps((prev) => new Set([...prev, stepId]));
      triggerHapticFeedback('light');

      if (currentStepIndex < workflow.steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        handleStepComplete(stepId, { skipped: true });
      }
    },
    [
      currentStepIndex,
      workflow.steps.length,
      handleStepComplete,
      triggerHapticFeedback,
    ],
  );

  const handleActionExecute = useCallback(
    async (action: EmergencyAction) => {
      triggerHapticFeedback('medium');

      switch (action.type) {
        case 'call':
          if (action.data?.number) {
            window.open(`tel:${action.data.number}`);
          }
          break;

        case 'photo':
          try {
            const photoData = await capturePhoto();
            if (photoData) {
              setResults((prev) => ({
                ...prev,
                [`${currentStep.id}_photo`]: photoData,
              }));
            }
          } catch (error) {
            console.error('Photo capture failed:', error);
          }
          break;

        case 'voice':
          // Voice recording would be implemented here
          console.log('Voice recording triggered');
          break;

        case 'location':
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
              setResults((prev) => ({
                ...prev,
                [`${currentStep.id}_location`]: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  timestamp: Date.now(),
                },
              }));
            });
          }
          break;

        case 'button':
          // Custom button actions
          console.log('Button action:', action.id);
          break;
      }
    },
    [triggerHapticFeedback, capturePhoto, currentStep],
  );

  const getPriorityColor = (priority: 'critical' | 'high' | 'medium') => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment':
        return AlertTriangle;
      case 'action':
        return Zap;
      case 'communication':
        return Phone;
      case 'documentation':
        return Camera;
      default:
        return CheckCircle;
    }
  };

  if (!workflow) {
    return (
      <Card className="m-4">
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Workflow Not Found</h3>
          <p className="text-gray-600">
            Emergency workflow could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isCompleting) {
    return (
      <Card className="m-4 border-green-200">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-green-600 mb-2">
            Emergency Workflow Complete
          </h3>
          <p className="text-gray-600 mb-4">
            {workflow.name} completed in {elapsedTime} seconds
          </p>
          <div className="text-sm text-gray-500">
            Steps completed: {completedSteps.size}/{workflow.steps.length}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 p-4">
      {/* Header */}
      <Card className="mb-4 border-red-200 bg-gradient-to-r from-red-500 to-red-600 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🚨 {workflow.name}</CardTitle>
            <Badge variant="secondary" className="bg-white text-red-600">
              {workflow.severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm opacity-90">
            <span>
              Step {currentStepIndex + 1} of {workflow.steps.length}
            </span>
            <span>{elapsedTime}s elapsed</span>
          </div>
          <Progress
            value={progress}
            className="mt-2 bg-red-400 [&>div]:bg-white"
          />
        </CardContent>
      </Card>

      {/* Current Step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-4"
        >
          <Card className="border-2 border-red-300">
            <CardHeader>
              <div className="flex items-start space-x-3">
                <div
                  className={`w-8 h-8 rounded-full ${getPriorityColor(currentStep.priority)} flex items-center justify-center flex-shrink-0`}
                >
                  {React.createElement(getTypeIcon(currentStep.type), {
                    className: 'w-4 h-4 text-white',
                  })}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  <p className="text-gray-600 mt-1">
                    {currentStep.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Est. {currentStep.estimatedTime}s
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {currentStep.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Step Actions */}
              {currentStep.actions && currentStep.actions.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-medium text-gray-700">
                    Available Actions:
                  </h4>
                  <div className="grid gap-2">
                    {currentStep.actions.map((action) => (
                      <Button
                        key={action.id}
                        onClick={() => handleActionExecute(action)}
                        variant="outline"
                        className="flex items-center justify-start space-x-3 h-auto p-3"
                      >
                        {action.icon && <action.icon className="w-5 h-5" />}
                        <span>{action.label}</span>
                        {action.type === 'call' && (
                          <Phone className="w-4 h-4 ml-auto text-green-500" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Timer */}
              <Alert className="mb-4">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Step running for {stepElapsedTime}s
                  {currentStep.estimatedTime &&
                    stepElapsedTime > currentStep.estimatedTime && (
                      <span className="text-orange-600 font-medium">
                        {' '}
                        (Over estimated time)
                      </span>
                    )}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={() =>
                    handleStepComplete(currentStep.id, {
                      completedAt: Date.now(),
                    })
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Step
                </Button>

                {currentStep.canSkip && (
                  <Button
                    onClick={() => handleStepSkip(currentStep.id)}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    Skip
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Progress Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="text-green-600">
                ✅ {completedSteps.size} completed
              </div>
              <div className="text-orange-600">
                ⏭️ {skippedSteps.size} skipped
              </div>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Cancel Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
