'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  ArrowRight,
  Loader2,
  Filter,
  Search,
  Download,
  Upload,
  Zap,
  Target,
  Heart,
  Globe,
  Crown,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  TaskAutomationService,
  WeddingScenario,
  type WeddingTaskTemplate,
} from '@/lib/services/task-automation-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system_template: boolean;
  created_by: string;
  is_active: boolean;
  tags: string[];
  estimated_total_hours: number;
  typical_timeline_days: number;
  created_at: string;
  updated_at: string;
  task_count?: number;
  usage_count?: number;
}

interface TemplateTask {
  id: string;
  template_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  estimated_duration: number;
  buffer_time: number;
  days_before_event: number;
  order_index: number;
  default_assignee_role: string;
  specialties_required: string[];
  notes: string;
  checklist_items: string[];
}

interface TaskTemplatesManagerProps {
  weddingId?: string;
  onApplyTemplate?: (templateId: string) => void;
}

export default function TaskTemplatesManager({
  weddingId,
  onApplyTemplate,
}: TaskTemplatesManagerProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(
    null,
  );
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Round 2 enhancements
  const [weddingScenarioTemplates] = useState<WeddingTaskTemplate[]>(
    TaskAutomationService.getAvailableTemplates(),
  );
  const [selectedScenarioTemplate, setSelectedScenarioTemplate] =
    useState<WeddingTaskTemplate | null>(null);
  const [showWeddingScenarios, setShowWeddingScenarios] = useState(true);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [weddingStyle, setWeddingStyle] = useState<string>('traditional');

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom',
    tags: [] as string[],
    estimated_total_hours: 0,
    typical_timeline_days: 0,
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'venue_management',
    priority: 'medium',
    estimated_duration: 1,
    buffer_time: 0,
    days_before_event: 7,
    default_assignee_role: 'coordinator',
    notes: '',
    checklist_items: [] as string[],
  });

  useEffect(() => {
    fetchTemplates();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) setCurrentUserId(data.id);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select(
          `
          *,
          template_tasks(count),
          template_usage(count)
        `,
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const templatesWithCounts =
        data?.map((template) => ({
          ...template,
          task_count: template.template_tasks?.[0]?.count || 0,
          usage_count: template.template_usage?.[0]?.count || 0,
        })) || [];

      setTemplates(templatesWithCounts);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateTasks = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTemplateTasks(data || []);
    } catch (error) {
      console.error('Error fetching template tasks:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !currentUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          ...newTemplate,
          created_by: currentUserId,
          is_system_template: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([data, ...templates]);
      setSelectedTemplate(data);
      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'custom',
        tags: [],
        estimated_total_hours: 0,
        typical_timeline_days: 0,
      });

      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTaskToTemplate = async () => {
    if (!selectedTemplate || !newTask.title) return;

    setLoading(true);
    try {
      const maxOrderIndex = Math.max(
        ...templateTasks.map((t) => t.order_index),
        -1,
      );

      const { data, error } = await supabase
        .from('template_tasks')
        .insert({
          ...newTask,
          template_id: selectedTemplate.id,
          order_index: maxOrderIndex + 1,
          specialties_required: [],
        })
        .select()
        .single();

      if (error) throw error;

      setTemplateTasks([...templateTasks, data]);
      setNewTask({
        title: '',
        description: '',
        category: 'venue_management',
        priority: 'medium',
        estimated_duration: 1,
        buffer_time: 0,
        days_before_event: 7,
        default_assignee_role: 'coordinator',
        notes: '',
        checklist_items: [],
      });

      toast({
        title: 'Success',
        description: 'Task added to template',
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!weddingId || !currentUserId) {
      toast({
        title: 'Error',
        description: 'Wedding ID is required to apply template',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'generate_tasks_from_template',
        {
          p_template_id: templateId,
          p_wedding_id: weddingId,
          p_created_by: currentUserId,
        },
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Template applied successfully. ${data?.length || 0} tasks created.`,
      });

      if (onApplyTemplate) {
        onApplyTemplate(templateId);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(templates.filter((t) => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setTemplateTasks([]);
      }

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTemplate = async (template: TaskTemplate) => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const { data: newTemplateData, error: templateError } = await supabase
        .from('task_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          created_by: currentUserId,
          is_system_template: false,
          is_active: true,
          tags: template.tags,
          estimated_total_hours: template.estimated_total_hours,
          typical_timeline_days: template.typical_timeline_days,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const { data: tasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', template.id);

      if (tasksError) throw tasksError;

      if (tasks && tasks.length > 0) {
        const newTasks = tasks.map(({ id, template_id, ...task }) => ({
          ...task,
          template_id: newTemplateData.id,
        }));

        const { error: insertError } = await supabase
          .from('template_tasks')
          .insert(newTasks);

        if (insertError) throw insertError;
      }

      setTemplates([newTemplateData, ...templates]);
      toast({
        title: 'Success',
        description: 'Template duplicated successfully',
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Round 2 enhancement methods
  const handleApplyWeddingScenario = async (
    scenarioTemplate: WeddingTaskTemplate,
  ) => {
    if (!weddingId || !currentUserId) {
      toast({
        title: 'Error',
        description: 'Wedding ID is required to apply template',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const automationService = new TaskAutomationService();
      const { tasks } = await automationService.applyWeddingTemplate(
        scenarioTemplate.id,
        weddingId,
        currentUserId,
        {
          guest_count: guestCount,
          wedding_style: weddingStyle,
        },
      );

      toast({
        title: 'Success',
        description: `${scenarioTemplate.name} applied successfully. ${tasks.length} tasks created.`,
      });

      if (onApplyTemplate) {
        onApplyTemplate(scenarioTemplate.id);
      }
    } catch (error) {
      console.error('Error applying wedding scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply wedding scenario template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScenarioIcon = (scenario: WeddingScenario) => {
    const iconMap = {
      [WeddingScenario.DAY_OF_SETUP]: Clock,
      [WeddingScenario.VENDOR_COORDINATION]: Users,
      [WeddingScenario.CLIENT_ONBOARDING]: Heart,
      [WeddingScenario.TIMELINE_PLANNING]: Calendar,
      [WeddingScenario.EMERGENCY_PROTOCOLS]: Zap,
      [WeddingScenario.INTERNATIONAL_GUESTS]: Globe,
      [WeddingScenario.LARGE_WEDDING_150_PLUS]: Crown,
      [WeddingScenario.INTIMATE_WEDDING_UNDER_50]: Heart,
      [WeddingScenario.DESTINATION_WEDDING]: Globe,
      [WeddingScenario.OUTDOOR_WEDDING]: Target,
    };
    return iconMap[scenario] || FileText;
  };

  const getScenarioColor = (scenario: WeddingScenario) => {
    const colorMap = {
      [WeddingScenario.DAY_OF_SETUP]: 'bg-red-100 text-red-800',
      [WeddingScenario.VENDOR_COORDINATION]: 'bg-blue-100 text-blue-800',
      [WeddingScenario.CLIENT_ONBOARDING]: 'bg-pink-100 text-pink-800',
      [WeddingScenario.TIMELINE_PLANNING]: 'bg-green-100 text-green-800',
      [WeddingScenario.EMERGENCY_PROTOCOLS]: 'bg-yellow-100 text-yellow-800',
      [WeddingScenario.INTERNATIONAL_GUESTS]: 'bg-purple-100 text-purple-800',
      [WeddingScenario.LARGE_WEDDING_150_PLUS]: 'bg-indigo-100 text-indigo-800',
      [WeddingScenario.INTIMATE_WEDDING_UNDER_50]: 'bg-pink-100 text-pink-800',
      [WeddingScenario.DESTINATION_WEDDING]: 'bg-teal-100 text-teal-800',
      [WeddingScenario.OUTDOOR_WEDDING]: 'bg-emerald-100 text-emerald-800',
    };
    return colorMap[scenario] || 'bg-gray-100 text-gray-800';
  };

  const filteredScenarioTemplates = weddingScenarioTemplates.filter(
    (template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    },
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Wedding Scenario Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="venue_setup">Venue Setup</SelectItem>
              <SelectItem value="vendor_management">
                Vendor Management
              </SelectItem>
              <SelectItem value="client_onboarding">
                Client Onboarding
              </SelectItem>
              <SelectItem value="timeline_planning">
                Timeline Planning
              </SelectItem>
              <SelectItem value="day_of_coordination">
                Day-of Coordination
              </SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {/* Wedding Context Inputs */}
          {weddingId && (
            <>
              <Input
                type="number"
                placeholder="Guest count"
                value={guestCount || ''}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <Select value={weddingStyle} onValueChange={setWeddingStyle}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traditional">Traditional</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="rustic">Rustic</SelectItem>
                  <SelectItem value="destination">Destination</SelectItem>
                  <SelectItem value="intimate">Intimate</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Task Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for common task workflows
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="e.g., Venue Setup Checklist"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this template is for..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) =>
                      setNewTemplate({ ...newTemplate, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue_setup">Venue Setup</SelectItem>
                      <SelectItem value="vendor_management">
                        Vendor Management
                      </SelectItem>
                      <SelectItem value="client_onboarding">
                        Client Onboarding
                      </SelectItem>
                      <SelectItem value="timeline_planning">
                        Timeline Planning
                      </SelectItem>
                      <SelectItem value="day_of_coordination">
                        Day-of Coordination
                      </SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Typical Timeline (days)</Label>
                  <Input
                    type="number"
                    value={newTemplate.typical_timeline_days}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        typical_timeline_days: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Tabbed Interface */}
      <Tabs defaultValue="wedding-scenarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="wedding-scenarios"
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Wedding Scenarios
          </TabsTrigger>
          <TabsTrigger
            value="custom-templates"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Custom Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wedding-scenarios" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  Wedding Scenario Templates
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                >
                  New
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Pre-built workflows for common wedding scenarios. Automatically
                adapts based on your guest count and style.
              </p>
              <div className="space-y-3">
                {filteredScenarioTemplates.map((template) => {
                  const IconComponent = getScenarioIcon(template.scenario);
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedScenarioTemplate?.id === template.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : ''
                      }`}
                      onClick={() => setSelectedScenarioTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${getScenarioColor(template.scenario)}`}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {template.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {template.tasks.length} tasks
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {template.estimated_total_hours}h
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {template.typical_timeline_days}d
                          </div>
                        </div>
                        {weddingId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyWeddingScenario(template);
                            }}
                            disabled={loading}
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3 mr-2" />
                            )}
                            Apply Scenario
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedScenarioTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-lg ${getScenarioColor(selectedScenarioTemplate.scenario)}`}
                      >
                        {React.createElement(
                          getScenarioIcon(selectedScenarioTemplate.scenario),
                          { className: 'h-6 w-6' },
                        )}
                      </div>
                      <div>
                        <CardTitle>{selectedScenarioTemplate.name}</CardTitle>
                        <CardDescription>
                          {selectedScenarioTemplate.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="tasks">
                      <TabsList>
                        <TabsTrigger value="tasks">Task Preview</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="automation">Automation</TabsTrigger>
                      </TabsList>

                      <TabsContent value="tasks" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedScenarioTemplate.tasks.map((task, index) => (
                            <Card key={index} className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm">
                                  {task.title}
                                </h4>
                                <Badge
                                  variant={
                                    task.priority === 'critical'
                                      ? 'destructive'
                                      : task.priority === 'high'
                                        ? 'default'
                                        : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-3">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimated_duration}h
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {task.days_before_event}d before
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="timeline" className="space-y-4">
                        <div className="space-y-3">
                          {selectedScenarioTemplate.tasks
                            .sort(
                              (a, b) =>
                                b.days_before_event - a.days_before_event,
                            )
                            .map((task, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-4 p-3 border rounded-lg"
                              >
                                <div className="text-center min-w-[80px]">
                                  <div className="text-lg font-bold text-primary">
                                    {task.days_before_event === 0
                                      ? 'Day Of'
                                      : `${task.days_before_event}d`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    before
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    {task.description}
                                  </p>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {task.estimated_duration}h
                                </div>
                              </div>
                            ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="automation" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">
                              Automation Triggers
                            </h4>
                            <div className="space-y-2">
                              {selectedScenarioTemplate.triggers.map(
                                (trigger, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 text-sm text-blue-800"
                                  >
                                    <Zap className="h-4 w-4" />
                                    <span>
                                      {trigger.type === 'rsvp_count' &&
                                        'Activates when RSVP count changes'}
                                      {trigger.type === 'date_proximity' &&
                                        'Activates based on wedding date proximity'}
                                      {trigger.type === 'vendor_status' &&
                                        'Activates when vendor status changes'}
                                      {trigger.type === 'guest_category' &&
                                        'Activates based on guest categories'}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-2">
                              Smart Adaptations
                            </h4>
                            <div className="space-y-1 text-sm text-green-800">
                              <div>
                                • Tasks automatically scheduled based on wedding
                                date
                              </div>
                              <div>
                                • Assignments adapt to guest count and venue
                                type
                              </div>
                              <div>
                                • Dependencies ensure proper task sequencing
                              </div>
                              <div>
                                • Reminders scale with task priority and
                                timeline
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Heart className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Select a wedding scenario to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom-templates">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-lg font-semibold">Custom Templates</h3>
              <div className="space-y-2">
                {loading && !templates.length ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        fetchTemplateTasks(template.id);
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {template.name}
                              {template.is_system_template && (
                                <Badge variant="secondary" className="ml-2">
                                  System
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {template.task_count || 0} tasks
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {template.estimated_total_hours || 0}h
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {template.typical_timeline_days || 0}d
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {weddingId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyTemplate(template.id);
                              }}
                            >
                              Apply
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(template);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {!template.is_system_template && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>
                      {selectedTemplate.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="tasks">
                      <TabsList>
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="add-task">Add Task</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>

                      <TabsContent value="tasks" className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Task</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Days Before</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templateTasks.map((task, index) => (
                              <TableRow key={task.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{task.title}</p>
                                    {task.description && (
                                      <p className="text-xs text-gray-500">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {task.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      task.priority === 'critical'
                                        ? 'destructive'
                                        : task.priority === 'high'
                                          ? 'default'
                                          : 'secondary'
                                    }
                                  >
                                    {task.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {task.estimated_duration}h
                                </TableCell>
                                <TableCell>{task.days_before_event}d</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TabsContent>

                      <TabsContent value="add-task" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Task Title</Label>
                            <Input
                              value={newTask.title}
                              onChange={(e) =>
                                setNewTask({
                                  ...newTask,
                                  title: e.target.value,
                                })
                              }
                              placeholder="Enter task title"
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={newTask.category}
                              onValueChange={(value) =>
                                setNewTask({ ...newTask, category: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="venue_management">
                                  Venue Management
                                </SelectItem>
                                <SelectItem value="vendor_coordination">
                                  Vendor Coordination
                                </SelectItem>
                                <SelectItem value="client_management">
                                  Client Management
                                </SelectItem>
                                <SelectItem value="logistics">
                                  Logistics
                                </SelectItem>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="photography">
                                  Photography
                                </SelectItem>
                                <SelectItem value="catering">
                                  Catering
                                </SelectItem>
                                <SelectItem value="florals">Florals</SelectItem>
                                <SelectItem value="music">Music</SelectItem>
                                <SelectItem value="transportation">
                                  Transportation
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Priority</Label>
                            <Select
                              value={newTask.priority}
                              onValueChange={(value) =>
                                setNewTask({ ...newTask, priority: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">
                                  Critical
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Days Before Event</Label>
                            <Input
                              type="number"
                              value={newTask.days_before_event}
                              onChange={(e) =>
                                setNewTask({
                                  ...newTask,
                                  days_before_event:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              value={newTask.description}
                              onChange={(e) =>
                                setNewTask({
                                  ...newTask,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Task description..."
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleAddTaskToTemplate}
                          disabled={loading}
                        >
                          {loading && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Add Task to Template
                        </Button>
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label>Template Name</Label>
                            <Input value={selectedTemplate.name} disabled />
                          </div>
                          <div>
                            <Label>Total Estimated Hours</Label>
                            <Input
                              type="number"
                              value={selectedTemplate.estimated_total_hours}
                              disabled
                            />
                          </div>
                          <div>
                            <Label>Typical Timeline (days)</Label>
                            <Input
                              type="number"
                              value={selectedTemplate.typical_timeline_days}
                              disabled
                            />
                          </div>
                          <div>
                            <Label>Usage Count</Label>
                            <Input
                              value={selectedTemplate.usage_count || 0}
                              disabled
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Select a template to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
