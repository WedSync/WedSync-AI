'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  GitBranch,
  Clock,
  Mail,
  Users,
  Settings,
  Play,
  Pause,
  Plus,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Timer,
  Filter,
  MessageSquare,
  Send,
  Eye,
  Edit,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FollowUpTrigger {
  id: string;
  type:
    | 'no_open'
    | 'no_click'
    | 'no_reply'
    | 'opened_no_action'
    | 'clicked_no_conversion'
    | 'custom';
  condition: string;
  delay: {
    value: number;
    unit: 'hours' | 'days' | 'weeks';
  };
}

export interface FollowUpStep {
  id: string;
  name: string;
  trigger: FollowUpTrigger;
  message: {
    subject: string;
    content: string;
    personalization: boolean;
  };
  settings: {
    skip_if_responded: boolean;
    skip_if_unsubscribed: boolean;
    max_attempts: number;
    quiet_hours: boolean;
  };
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    skipped: number;
  };
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  target_audience: {
    segments: string[];
    filters: any[];
    estimated_recipients: number;
  };
  steps: FollowUpStep[];
  performance?: {
    total_sent: number;
    total_converted: number;
    conversion_rate: number;
    avg_messages_to_convert: number;
  };
  created_at: Date;
  updated_at: Date;
}

interface AutomatedFollowUpsProps {
  clientId: string;
  onSequenceActivate?: (sequence: FollowUpSequence) => void;
  onSequencePause?: (sequence: FollowUpSequence) => void;
  className?: string;
}

export function AutomatedFollowUps({
  clientId,
  onSequenceActivate,
  onSequencePause,
  className,
}: AutomatedFollowUpsProps) {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [activeSequence, setActiveSequence] = useState<FollowUpSequence | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newSequence, setNewSequence] = useState<Partial<FollowUpSequence>>({
    name: '',
    description: '',
    status: 'draft',
    target_audience: {
      segments: [],
      filters: [],
      estimated_recipients: 0,
    },
    steps: [],
  });

  const triggerTemplates = [
    {
      id: 'rsvp_reminder',
      name: 'RSVP Reminder Sequence',
      description: "Automated reminders for guests who haven't responded",
      steps: [
        {
          name: 'First Reminder',
          trigger: {
            type: 'no_reply' as const,
            delay: { value: 3, unit: 'days' as const },
          },
          subject: 'Quick reminder: RSVP for {{couple.names}} wedding',
          content: "We'd love to know if you can join us!",
        },
        {
          name: 'Second Reminder',
          trigger: {
            type: 'no_reply' as const,
            delay: { value: 7, unit: 'days' as const },
          },
          subject: 'Last chance to RSVP',
          content: 'The deadline is approaching. Please let us know!',
        },
        {
          name: 'Final Reminder',
          trigger: {
            type: 'no_reply' as const,
            delay: { value: 10, unit: 'days' as const },
          },
          subject: 'Final RSVP reminder',
          content: 'This is your last chance to confirm your attendance.',
        },
      ],
    },
    {
      id: 'engagement_boost',
      name: 'Engagement Booster',
      description: "Re-engage guests who opened but didn't take action",
      steps: [
        {
          name: 'Soft Nudge',
          trigger: {
            type: 'opened_no_action' as const,
            delay: { value: 24, unit: 'hours' as const },
          },
          subject: 'Did you have any questions?',
          content:
            'We noticed you checked our message. Let us know if you need help!',
        },
        {
          name: 'Value Add',
          trigger: {
            type: 'no_click' as const,
            delay: { value: 3, unit: 'days' as const },
          },
          subject: 'Important wedding details inside',
          content: "Don't miss these important updates about the wedding.",
        },
      ],
    },
    {
      id: 'info_drip',
      name: 'Information Drip Campaign',
      description: 'Gradual information release leading up to the wedding',
      steps: [
        {
          name: 'Venue Details',
          trigger: {
            type: 'custom' as const,
            delay: { value: 30, unit: 'days' as const },
          },
          subject: 'Getting to {{venue.name}}',
          content: "Here's everything you need to know about the venue.",
        },
        {
          name: 'Schedule',
          trigger: {
            type: 'custom' as const,
            delay: { value: 14, unit: 'days' as const },
          },
          subject: 'Wedding day timeline',
          content: "Here's what to expect on the big day.",
        },
        {
          name: 'Final Details',
          trigger: {
            type: 'custom' as const,
            delay: { value: 3, unit: 'days' as const },
          },
          subject: 'See you soon!',
          content: 'Final reminders before the wedding.',
        },
      ],
    },
  ];

  const addStep = useCallback(() => {
    const newStep: FollowUpStep = {
      id: `step-${Date.now()}`,
      name: `Step ${(newSequence.steps?.length || 0) + 1}`,
      trigger: {
        id: `trigger-${Date.now()}`,
        type: 'no_open',
        condition: '',
        delay: { value: 1, unit: 'days' },
      },
      message: {
        subject: '',
        content: '',
        personalization: true,
      },
      settings: {
        skip_if_responded: true,
        skip_if_unsubscribed: true,
        max_attempts: 1,
        quiet_hours: true,
      },
    };

    setNewSequence({
      ...newSequence,
      steps: [...(newSequence.steps || []), newStep],
    });
  }, [newSequence]);

  const updateStep = useCallback(
    (stepId: string, updates: Partial<FollowUpStep>) => {
      setNewSequence({
        ...newSequence,
        steps:
          newSequence.steps?.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step,
          ) || [],
      });
    },
    [newSequence],
  );

  const removeStep = useCallback(
    (stepId: string) => {
      setNewSequence({
        ...newSequence,
        steps: newSequence.steps?.filter((step) => step.id !== stepId) || [],
      });
    },
    [newSequence],
  );

  const duplicateStep = useCallback(
    (step: FollowUpStep) => {
      const duplicatedStep: FollowUpStep = {
        ...step,
        id: `step-${Date.now()}`,
        name: `${step.name} (Copy)`,
      };

      setNewSequence({
        ...newSequence,
        steps: [...(newSequence.steps || []), duplicatedStep],
      });
    },
    [newSequence],
  );

  const loadTemplate = useCallback(
    (template: (typeof triggerTemplates)[0]) => {
      const steps = template.steps.map((step, index) => ({
        id: `step-${Date.now()}-${index}`,
        name: step.name,
        trigger: {
          id: `trigger-${Date.now()}-${index}`,
          ...step.trigger,
          condition: '',
        },
        message: {
          subject: step.subject,
          content: step.content,
          personalization: true,
        },
        settings: {
          skip_if_responded: true,
          skip_if_unsubscribed: true,
          max_attempts: 1,
          quiet_hours: true,
        },
      }));

      setNewSequence({
        ...newSequence,
        name: template.name,
        description: template.description,
        steps,
      });
    },
    [newSequence],
  );

  const saveSequence = useCallback(() => {
    const sequence: FollowUpSequence = {
      id: `seq-${Date.now()}`,
      name: newSequence.name || 'Untitled Sequence',
      description: newSequence.description || '',
      status: 'draft',
      target_audience: newSequence.target_audience || {
        segments: [],
        filters: [],
        estimated_recipients: 0,
      },
      steps: newSequence.steps || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    setSequences([...sequences, sequence]);
    setActiveSequence(sequence);
    setIsCreating(false);
    setNewSequence({
      name: '',
      description: '',
      status: 'draft',
      target_audience: {
        segments: [],
        filters: [],
        estimated_recipients: 0,
      },
      steps: [],
    });
  }, [newSequence, sequences]);

  const activateSequence = useCallback(
    (sequence: FollowUpSequence) => {
      const updated = {
        ...sequence,
        status: 'active' as const,
        updated_at: new Date(),
      };
      setSequences(sequences.map((s) => (s.id === sequence.id ? updated : s)));
      onSequenceActivate?.(updated);
    },
    [sequences, onSequenceActivate],
  );

  const pauseSequence = useCallback(
    (sequence: FollowUpSequence) => {
      const updated = {
        ...sequence,
        status: 'paused' as const,
        updated_at: new Date(),
      };
      setSequences(sequences.map((s) => (s.id === sequence.id ? updated : s)));
      onSequencePause?.(updated);
    },
    [sequences, onSequencePause],
  );

  const deleteSequence = useCallback(
    (sequenceId: string) => {
      setSequences(sequences.filter((s) => s.id !== sequenceId));
      if (activeSequence?.id === sequenceId) {
        setActiveSequence(null);
      }
    },
    [sequences, activeSequence],
  );

  const getTriggerLabel = (type: FollowUpTrigger['type']) => {
    switch (type) {
      case 'no_open':
        return 'Not Opened';
      case 'no_click':
        return 'Not Clicked';
      case 'no_reply':
        return 'Not Replied';
      case 'opened_no_action':
        return 'Opened but No Action';
      case 'clicked_no_conversion':
        return 'Clicked but No Conversion';
      case 'custom':
        return 'Custom Trigger';
      default:
        return type;
    }
  };

  const getStatusColor = (status: FollowUpSequence['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Automated Follow-ups
          </CardTitle>
          <CardDescription>
            Create intelligent message sequences based on guest behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{sequences.length}</p>
                <p className="text-sm text-muted-foreground">Total Sequences</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {sequences.filter((s) => s.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {sequences.reduce(
                    (sum, s) => sum + (s.performance?.total_sent || 0),
                    0,
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
              </div>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Sequence
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Sequence */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Follow-up Sequence</CardTitle>
            <CardDescription>
              Build an automated message sequence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basics" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-4">
                {/* Templates */}
                <div className="space-y-2">
                  <Label>Start from Template</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {triggerTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => loadTemplate(template)}
                      >
                        <CardHeader>
                          <CardTitle className="text-sm">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {template.steps.length} steps
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Name & Description */}
                <div className="space-y-2">
                  <Label htmlFor="sequence-name">Sequence Name</Label>
                  <Input
                    id="sequence-name"
                    value={newSequence.name}
                    onChange={(e) =>
                      setNewSequence({ ...newSequence, name: e.target.value })
                    }
                    placeholder="e.g., RSVP Follow-up Campaign"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequence-description">Description</Label>
                  <Textarea
                    id="sequence-description"
                    value={newSequence.description}
                    onChange={(e) =>
                      setNewSequence({
                        ...newSequence,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the purpose of this sequence..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="steps" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Label>Sequence Steps</Label>
                  <Button variant="outline" size="sm" onClick={addStep}>
                    <Plus className="mr-2 h-3 w-3" />
                    Add Step
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {newSequence.steps?.map((step, index) => (
                      <Card key={step.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Input
                              value={step.name}
                              onChange={(e) =>
                                updateStep(step.id, { name: e.target.value })
                              }
                              className="w-48"
                              placeholder="Step name"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateStep(step)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStep(step.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Trigger Settings */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Trigger Type</Label>
                              <Select
                                value={step.trigger.type}
                                onValueChange={(value) =>
                                  updateStep(step.id, {
                                    trigger: {
                                      ...step.trigger,
                                      type: value as FollowUpTrigger['type'],
                                    },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no_open">
                                    Not Opened
                                  </SelectItem>
                                  <SelectItem value="no_click">
                                    Not Clicked
                                  </SelectItem>
                                  <SelectItem value="no_reply">
                                    Not Replied
                                  </SelectItem>
                                  <SelectItem value="opened_no_action">
                                    Opened but No Action
                                  </SelectItem>
                                  <SelectItem value="clicked_no_conversion">
                                    Clicked but No Conversion
                                  </SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Delay</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={step.trigger.delay.value}
                                  onChange={(e) =>
                                    updateStep(step.id, {
                                      trigger: {
                                        ...step.trigger,
                                        delay: {
                                          ...step.trigger.delay,
                                          value: parseInt(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="w-20"
                                />
                                <Select
                                  value={step.trigger.delay.unit}
                                  onValueChange={(value) =>
                                    updateStep(step.id, {
                                      trigger: {
                                        ...step.trigger,
                                        delay: {
                                          ...step.trigger.delay,
                                          unit: value as
                                            | 'hours'
                                            | 'days'
                                            | 'weeks',
                                        },
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                    <SelectItem value="weeks">Weeks</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Max Attempts</Label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={step.settings.max_attempts}
                                onChange={(e) =>
                                  updateStep(step.id, {
                                    settings: {
                                      ...step.settings,
                                      max_attempts: parseInt(e.target.value),
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Subject Line</Label>
                              <Input
                                value={step.message.subject}
                                onChange={(e) =>
                                  updateStep(step.id, {
                                    message: {
                                      ...step.message,
                                      subject: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Enter subject line..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Message Content</Label>
                              <Textarea
                                value={step.message.content}
                                onChange={(e) =>
                                  updateStep(step.id, {
                                    message: {
                                      ...step.message,
                                      content: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Enter message content..."
                                rows={4}
                              />
                            </div>
                          </div>

                          {/* Step Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`skip-responded-${step.id}`}>
                                Skip if guest has responded
                              </Label>
                              <Switch
                                id={`skip-responded-${step.id}`}
                                checked={step.settings.skip_if_responded}
                                onCheckedChange={(checked) =>
                                  updateStep(step.id, {
                                    settings: {
                                      ...step.settings,
                                      skip_if_responded: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`skip-unsubscribed-${step.id}`}>
                                Skip if unsubscribed
                              </Label>
                              <Switch
                                id={`skip-unsubscribed-${step.id}`}
                                checked={step.settings.skip_if_unsubscribed}
                                onCheckedChange={(checked) =>
                                  updateStep(step.id, {
                                    settings: {
                                      ...step.settings,
                                      skip_if_unsubscribed: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`quiet-hours-${step.id}`}>
                                Respect quiet hours
                              </Label>
                              <Switch
                                id={`quiet-hours-${step.id}`}
                                checked={step.settings.quiet_hours}
                                onCheckedChange={(checked) =>
                                  updateStep(step.id, {
                                    settings: {
                                      ...step.settings,
                                      quiet_hours: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Step Flow Indicator */}
                          {index < (newSequence.steps?.length || 0) - 1 && (
                            <div className="flex justify-center py-2">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {newSequence.steps?.length === 0 && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground text-center">
                            No steps yet. Add steps to create your follow-up
                            sequence
                            <br />
                            or start from a template.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Segments</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select guest segments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Guests</SelectItem>
                        <SelectItem value="not_responded">
                          Not Responded
                        </SelectItem>
                        <SelectItem value="confirmed">
                          Confirmed Guests
                        </SelectItem>
                        <SelectItem value="declined">
                          Declined Guests
                        </SelectItem>
                        <SelectItem value="vip">VIP Guests</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      Estimated recipients: <strong>150 guests</strong> based on
                      current filters
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sequence Behavior</Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Exit on conversion
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stop sequence when goal is achieved
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Skip weekends</p>
                          <p className="text-xs text-muted-foreground">
                            Don't send messages on weekends
                          </p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Track conversions
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Monitor sequence effectiveness
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewSequence({
                    name: '',
                    description: '',
                    status: 'draft',
                    target_audience: {
                      segments: [],
                      filters: [],
                      estimated_recipients: 0,
                    },
                    steps: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveSequence}
                disabled={!newSequence.name || !newSequence.steps?.length}
              >
                Save Sequence
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sequences */}
      {sequences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Sequences</CardTitle>
            <CardDescription>
              Manage your automated follow-up campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sequences.map((sequence) => (
                <Card key={sequence.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-base">
                          {sequence.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {sequence.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="flex items-center gap-1">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              getStatusColor(sequence.status),
                            )}
                          />
                          {sequence.status}
                        </Badge>
                        {sequence.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pauseSequence(sequence)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => activateSequence(sequence)}
                            disabled={sequence.status === 'completed'}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSequence(sequence)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSequence(sequence.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span>{sequence.steps.length} steps</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {sequence.target_audience.estimated_recipients}{' '}
                          recipients
                        </span>
                      </div>
                      {sequence.performance && (
                        <>
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            <span>{sequence.performance.total_sent} sent</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>
                              {sequence.performance.conversion_rate.toFixed(1)}%
                              converted
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Step Preview */}
                    {activeSequence?.id === sequence.id && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">
                          Sequence Steps:
                        </p>
                        <div className="space-y-2">
                          {sequence.steps.map((step, index) => (
                            <div
                              key={step.id}
                              className="flex items-center gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Badge variant="outline" className="text-xs">
                                  {index + 1}
                                </Badge>
                                <span className="text-sm">{step.name}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="secondary" className="text-xs">
                                  {getTriggerLabel(step.trigger.type)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  after {step.trigger.delay.value}{' '}
                                  {step.trigger.delay.unit}
                                </span>
                              </div>
                              {step.stats && (
                                <div className="flex gap-2 text-xs">
                                  <span>{step.stats.sent} sent</span>
                                  <span>{step.stats.opened} opened</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
