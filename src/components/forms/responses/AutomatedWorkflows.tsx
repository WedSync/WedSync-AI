'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Play,
  Pause,
  Settings,
  Mail,
  MessageSquare,
  Users,
  Tag,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Heart,
  Star,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: {
    type: 'form_submission' | 'response_update' | 'time_based' | 'field_value';
    conditions: {
      field?: string;
      operator:
        | 'equals'
        | 'contains'
        | 'greater_than'
        | 'less_than'
        | 'is_empty'
        | 'is_not_empty';
      value?: string | number;
    }[];
  };
  actions: {
    type:
      | 'send_email'
      | 'send_sms'
      | 'assign_to_user'
      | 'add_tag'
      | 'update_status'
      | 'create_task';
    config: any;
  }[];
  metrics: {
    triggered: number;
    successful: number;
    failed: number;
    lastTriggered?: Date;
  };
  createdAt: Date;
}

interface AutomatedWorkflowsProps {
  formId: string;
}

const AutomatedWorkflows: React.FC<AutomatedWorkflowsProps> = ({ formId }) => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(
    null,
  );
  const [newWorkflow, setNewWorkflow] = useState<Partial<WorkflowRule>>({
    name: '',
    description: '',
    isActive: true,
    trigger: {
      type: 'form_submission',
      conditions: [],
    },
    actions: [],
  });

  // Wedding-specific workflow templates
  const workflowTemplates = [
    {
      name: 'VIP Client Auto-Assignment',
      description:
        'Automatically assign high-budget inquiries to senior planners',
      trigger: {
        type: 'field_value' as const,
        conditions: [
          { field: 'budget', operator: 'greater_than' as const, value: 50000 },
        ],
      },
      actions: [
        {
          type: 'assign_to_user' as const,
          config: { userId: 'senior-planner' },
        },
        {
          type: 'add_tag' as const,
          config: { tags: ['VIP', 'High Priority'] },
        },
        { type: 'send_email' as const, config: { template: 'vip_welcome' } },
      ],
    },
    {
      name: 'Same-Day Follow-up',
      description:
        'Send follow-up email for interested couples within 24 hours',
      trigger: {
        type: 'field_value' as const,
        conditions: [
          {
            field: 'interest_level',
            operator: 'equals' as const,
            value: 'very_interested',
          },
        ],
      },
      actions: [
        {
          type: 'send_email' as const,
          config: { template: 'quick_followup', delay: '4 hours' },
        },
        {
          type: 'create_task' as const,
          config: { title: 'Call interested couple', assignee: 'lead_planner' },
        },
      ],
    },
    {
      name: 'Venue Preference Routing',
      description: 'Route inquiries to venue-specific coordinators',
      trigger: {
        type: 'field_value' as const,
        conditions: [
          {
            field: 'preferred_venue_type',
            operator: 'equals' as const,
            value: 'outdoor',
          },
        ],
      },
      actions: [
        {
          type: 'assign_to_user' as const,
          config: { userId: 'outdoor-specialist' },
        },
        { type: 'add_tag' as const, config: { tags: ['Outdoor', 'Garden'] } },
      ],
    },
    {
      name: 'Destination Wedding Alert',
      description: 'Special handling for destination wedding inquiries',
      trigger: {
        type: 'field_value' as const,
        conditions: [
          {
            field: 'wedding_location',
            operator: 'contains' as const,
            value: 'destination',
          },
        ],
      },
      actions: [
        {
          type: 'add_tag' as const,
          config: { tags: ['Destination', 'Travel Required'] },
        },
        {
          type: 'send_email' as const,
          config: { template: 'destination_info_packet' },
        },
        {
          type: 'assign_to_user' as const,
          config: { userId: 'destination-specialist' },
        },
      ],
    },
  ];

  // Trigger type options
  const triggerTypes = [
    {
      value: 'form_submission',
      label: 'New Form Submission',
      icon: <Plus className="h-4 w-4" />,
    },
    {
      value: 'response_update',
      label: 'Response Updated',
      icon: <Settings className="h-4 w-4" />,
    },
    {
      value: 'time_based',
      label: 'Time-based',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      value: 'field_value',
      label: 'Field Value Condition',
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  // Action type options
  const actionTypes = [
    {
      value: 'send_email',
      label: 'Send Email',
      icon: <Mail className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      value: 'send_sms',
      label: 'Send SMS',
      icon: <MessageSquare className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800',
    },
    {
      value: 'assign_to_user',
      label: 'Assign to User',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800',
    },
    {
      value: 'add_tag',
      label: 'Add Tag',
      icon: <Tag className="h-4 w-4" />,
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      value: 'update_status',
      label: 'Update Status',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-emerald-100 text-emerald-800',
    },
    {
      value: 'create_task',
      label: 'Create Task',
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800',
    },
  ];

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [formId]);

  const loadWorkflows = async () => {
    try {
      // In a real implementation, this would fetch from the API
      const saved = localStorage.getItem(`workflows-${formId}`);
      if (saved) {
        setWorkflows(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const saveWorkflow = (workflow: WorkflowRule) => {
    const updated = workflows.some((w) => w.id === workflow.id)
      ? workflows.map((w) => (w.id === workflow.id ? workflow : w))
      : [...workflows, workflow];

    setWorkflows(updated);
    localStorage.setItem(`workflows-${formId}`, JSON.stringify(updated));
  };

  const createWorkflowFromTemplate = (template: any) => {
    const workflow: WorkflowRule = {
      id: Date.now().toString(),
      ...template,
      isActive: true,
      metrics: {
        triggered: 0,
        successful: 0,
        failed: 0,
      },
      createdAt: new Date(),
    };

    saveWorkflow(workflow);
    setIsCreating(false);
  };

  const toggleWorkflow = (workflowId: string) => {
    const updated = workflows.map((w) =>
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w,
    );
    setWorkflows(updated);
    localStorage.setItem(`workflows-${formId}`, JSON.stringify(updated));
  };

  const deleteWorkflow = (workflowId: string) => {
    const updated = workflows.filter((w) => w.id !== workflowId);
    setWorkflows(updated);
    localStorage.setItem(`workflows-${formId}`, JSON.stringify(updated));
  };

  const addCondition = () => {
    setNewWorkflow({
      ...newWorkflow,
      trigger: {
        ...newWorkflow.trigger!,
        conditions: [
          ...newWorkflow.trigger!.conditions,
          { field: '', operator: 'equals', value: '' },
        ],
      },
    });
  };

  const addAction = () => {
    setNewWorkflow({
      ...newWorkflow,
      actions: [...newWorkflow.actions!, { type: 'send_email', config: {} }],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-purple-600" />
            Automated Workflows
          </h2>
          <p className="text-muted-foreground">
            Automate your response handling with smart rules and actions
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Active Workflows
                </p>
                <p className="text-2xl font-bold">
                  {workflows.filter((w) => w.isActive).length}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Triggers</p>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.metrics.triggered, 0)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {workflows.length > 0
                    ? Math.round(
                        (workflows.reduce(
                          (sum, w) => sum + w.metrics.successful,
                          0,
                        ) /
                          Math.max(
                            workflows.reduce(
                              (sum, w) => sum + w.metrics.triggered,
                              0,
                            ),
                            1,
                          )) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Actions</p>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.metrics.failed, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Workflows */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card
            key={workflow.id}
            className={`border-l-4 ${workflow.isActive ? 'border-l-green-500' : 'border-l-gray-300'}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
                  />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workflow.name}
                      <Badge
                        variant={workflow.isActive ? 'default' : 'secondary'}
                      >
                        {workflow.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Trigger Info */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Trigger
                  </Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {
                        triggerTypes.find(
                          (t) => t.value === workflow.trigger.type,
                        )?.icon
                      }
                      <span className="text-sm font-medium">
                        {
                          triggerTypes.find(
                            (t) => t.value === workflow.trigger.type,
                          )?.label
                        }
                      </span>
                    </div>
                    {workflow.trigger.conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="text-xs text-muted-foreground"
                      >
                        {condition.field} {condition.operator} {condition.value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Actions
                  </Label>
                  <div className="space-y-2">
                    {workflow.actions.map((action, index) => {
                      const actionType = actionTypes.find(
                        (a) => a.value === action.type,
                      );
                      return (
                        <Badge key={index} className={actionType?.color}>
                          {actionType?.icon}
                          <span className="ml-1">{actionType?.label}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Performance
                  </Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Triggered:</span>
                      <span className="font-medium">
                        {workflow.metrics.triggered}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successful:</span>
                      <span className="font-medium text-green-600">
                        {workflow.metrics.successful}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <span className="font-medium text-red-600">
                        {workflow.metrics.failed}
                      </span>
                    </div>
                    {workflow.metrics.lastTriggered && (
                      <div className="text-xs text-muted-foreground">
                        Last:{' '}
                        {new Date(
                          workflow.metrics.lastTriggered,
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Workflow Dialog */}
      {isCreating && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Choose a Workflow Template
            </CardTitle>
            <p className="text-muted-foreground">
              Start with a pre-built template designed for wedding businesses
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowTemplates.map((template, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-purple-25 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          {template.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-medium">Trigger:</span>{' '}
                        {template.trigger.conditions[0]?.field}{' '}
                        {template.trigger.conditions[0]?.operator}{' '}
                        {template.trigger.conditions[0]?.value}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.actions.map((action, idx) => {
                          const actionType = actionTypes.find(
                            (a) => a.value === action.type,
                          );
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {actionType?.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      onClick={() => createWorkflowFromTemplate(template)}
                    >
                      Use This Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button variant="outline">Create Custom Workflow</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Automated workflows help you respond faster to wedding inquiries and
          provide consistent service. VIP clients and high-budget inquiries can
          be automatically routed to your most experienced planners.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AutomatedWorkflows;
