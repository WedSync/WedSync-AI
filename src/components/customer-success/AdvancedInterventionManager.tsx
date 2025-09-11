'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  XCircle,
  TrendingUp,
  FileText,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { createClient } from '@/lib/supabase/client';

interface InterventionTemplate {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'call' | 'meeting' | 'training' | 'support';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number;
  duration: string;
  template: string;
}

interface InterventionWorkflow {
  id: string;
  supplierId: string;
  supplierName: string;
  currentStep: number;
  totalSteps: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  steps: InterventionStep[];
  healthScoreBefore: number;
  healthScoreAfter?: number;
  createdAt: string;
  completedAt?: string;
}

interface InterventionStep {
  id: string;
  order: number;
  template: InterventionTemplate;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  scheduledFor?: string;
  completedAt?: string;
  notes?: string;
  outcome?: string;
  nextAction?: string;
}

interface AdvancedInterventionManagerProps {
  className?: string;
  onWorkflowUpdated?: (workflow: InterventionWorkflow) => void;
}

export function AdvancedInterventionManager({
  className = '',
  onWorkflowUpdated,
}: AdvancedInterventionManagerProps) {
  const [workflows, setWorkflows] = useState<InterventionWorkflow[]>([]);
  const [templates, setTemplates] = useState<InterventionTemplate[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<InterventionWorkflow | null>(null);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    supplier: '',
  });

  const supabase = createClient();

  // Real-time updates for intervention workflows
  useSupabaseRealtime(
    supabase,
    'intervention_workflows',
    useCallback((payload: any) => {
      if (payload.eventType === 'UPDATE') {
        setWorkflows((prev) =>
          prev.map((workflow) =>
            workflow.id === payload.new.id
              ? { ...workflow, ...payload.new }
              : workflow,
          ),
        );
      } else if (payload.eventType === 'INSERT') {
        setWorkflows((prev) => [...prev, payload.new]);
      }
    }, []),
  );

  // Load intervention templates
  useEffect(() => {
    const mockTemplates: InterventionTemplate[] = [
      {
        id: '1',
        name: 'Welcome Check-in',
        description: 'Initial onboarding check-in call',
        type: 'call',
        priority: 'medium',
        estimatedImpact: 15,
        duration: '30 min',
        template:
          "Welcome to WedSync! Let's schedule a quick call to ensure you're getting the most out of the platform.",
      },
      {
        id: '2',
        name: 'Feature Training',
        description: 'Personalized feature training session',
        type: 'training',
        priority: 'high',
        estimatedImpact: 25,
        duration: '45 min',
        template:
          "I noticed you haven't used [FEATURE] yet. Let me show you how it can help streamline your workflow.",
      },
      {
        id: '3',
        name: 'Retention Call',
        description: 'Proactive retention conversation',
        type: 'call',
        priority: 'critical',
        estimatedImpact: 40,
        duration: '60 min',
        template:
          'I wanted to check in about your recent experience with WedSync and see how we can better support you.',
      },
      {
        id: '4',
        name: 'Success Planning',
        description: 'Quarterly business review and planning',
        type: 'meeting',
        priority: 'medium',
        estimatedImpact: 20,
        duration: '90 min',
        template:
          "Let's review your growth and plan your success strategy for the next quarter.",
      },
    ];

    setTemplates(mockTemplates);
  }, []);

  // Load workflows
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);

      // Mock data - replace with actual API call
      const mockWorkflows: InterventionWorkflow[] = [
        {
          id: '1',
          supplierId: 'sup_001',
          supplierName: 'Perfect Moments Photography',
          currentStep: 1,
          totalSteps: 3,
          status: 'active',
          healthScoreBefore: 67,
          createdAt: new Date().toISOString(),
          steps: [
            {
              id: '1',
              order: 1,
              template: templates[0],
              status: 'completed',
              completedAt: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              notes: 'Great conversation, supplier is enthusiastic',
              outcome: 'positive',
              nextAction: 'Schedule feature training',
            },
            {
              id: '2',
              order: 2,
              template: templates[1],
              status: 'in_progress',
              scheduledFor: new Date(
                Date.now() + 1 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
            {
              id: '3',
              order: 3,
              template: templates[3],
              status: 'pending',
              scheduledFor: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
        },
        {
          id: '2',
          supplierId: 'sup_003',
          supplierName: 'Fairytale Flowers',
          currentStep: 0,
          totalSteps: 2,
          status: 'active',
          healthScoreBefore: 34,
          createdAt: new Date().toISOString(),
          steps: [
            {
              id: '4',
              order: 1,
              template: templates[2],
              status: 'pending',
              scheduledFor: new Date(
                Date.now() + 2 * 60 * 60 * 1000,
              ).toISOString(), // 2 hours from now
            },
            {
              id: '5',
              order: 2,
              template: templates[1],
              status: 'pending',
              scheduledFor: new Date(
                Date.now() + 3 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
        },
      ];

      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load intervention workflows');
    } finally {
      setLoading(false);
    }
  };

  const executeStep = async (workflowId: string, stepId: string) => {
    try {
      setExecuting(stepId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setWorkflows((prev) =>
        prev.map((workflow) => {
          if (workflow.id === workflowId) {
            const updatedSteps = workflow.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    status: 'in_progress' as const,
                    completedAt: new Date().toISOString(),
                  }
                : step,
            );

            const updatedWorkflow = {
              ...workflow,
              steps: updatedSteps,
              currentStep: workflow.currentStep + 1,
            };

            onWorkflowUpdated?.(updatedWorkflow);
            return updatedWorkflow;
          }
          return workflow;
        }),
      );

      toast.success('Intervention step started successfully');
    } catch (error) {
      console.error('Failed to execute step:', error);
      toast.error('Failed to execute intervention step');
    } finally {
      setExecuting(null);
    }
  };

  const completeStep = async (
    workflowId: string,
    stepId: string,
    notes: string,
    outcome: string,
  ) => {
    try {
      setWorkflows((prev) =>
        prev.map((workflow) => {
          if (workflow.id === workflowId) {
            const updatedSteps = workflow.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    status: 'completed' as const,
                    completedAt: new Date().toISOString(),
                    notes,
                    outcome,
                  }
                : step,
            );

            const completedCount = updatedSteps.filter(
              (s) => s.status === 'completed',
            ).length;
            const isComplete = completedCount === workflow.totalSteps;

            const updatedWorkflow = {
              ...workflow,
              steps: updatedSteps,
              currentStep: completedCount,
              status: isComplete ? ('completed' as const) : workflow.status,
              completedAt: isComplete ? new Date().toISOString() : undefined,
            };

            onWorkflowUpdated?.(updatedWorkflow);
            return updatedWorkflow;
          }
          return workflow;
        }),
      );

      toast.success('Step completed successfully');
    } catch (error) {
      console.error('Failed to complete step:', error);
      toast.error('Failed to complete step');
    }
  };

  const getStepIcon = (step: InterventionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    if (filters.status !== 'all' && workflow.status !== filters.status)
      return false;
    if (
      filters.supplier &&
      !workflow.supplierName
        .toLowerCase()
        .includes(filters.supplier.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Advanced Intervention Manager
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Orchestrate proactive customer success interventions
              </p>
            </div>
            <Button
              onClick={() => setShowNewWorkflow(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Supplier
              </label>
              <Input
                placeholder="Search suppliers..."
                value={filters.supplier}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, supplier: e.target.value }))
                }
              />
            </div>

            <div className="flex items-end">
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {workflows.filter((w) => w.status === 'active').length}
                  </div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {workflows.filter((w) => w.status === 'completed').length}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredWorkflows.map((workflow) => (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {workflow.supplierName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Health Score: {workflow.healthScoreBefore}
                      </p>
                    </div>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>
                        {workflow.currentStep} of {workflow.totalSteps} steps
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(workflow.currentStep / workflow.totalSteps) * 100}%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {workflow.steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        className={`border rounded-lg p-3 transition-all duration-200 ${
                          step.status === 'in_progress'
                            ? 'border-blue-200 bg-blue-50'
                            : step.status === 'completed'
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white'
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStepIcon(step)}
                            <div>
                              <div className="font-medium text-sm">
                                {step.template.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {step.template.duration}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {step.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  executeStep(workflow.id, step.id)
                                }
                                disabled={executing === step.id}
                                className="h-8"
                              >
                                {executing === step.id ? (
                                  <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
                                ) : (
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                )}
                                Start
                              </Button>
                            )}

                            {step.status === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  completeStep(
                                    workflow.id,
                                    step.id,
                                    'Completed successfully',
                                    'positive',
                                  )
                                }
                                className="h-8"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>

                        {step.notes && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {step.notes}
                          </div>
                        )}

                        {step.scheduledFor && step.status === 'pending' && (
                          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled:{' '}
                            {new Date(step.scheduledFor).toLocaleString()}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {workflow.status === 'completed' &&
                    workflow.healthScoreAfter && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">
                            Impact
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600">
                              {workflow.healthScoreBefore} →{' '}
                              {workflow.healthScoreAfter}
                            </span>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredWorkflows.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workflows found
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first intervention workflow to get started.
            </p>
            <Button onClick={() => setShowNewWorkflow(true)}>
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdvancedInterventionManager;
