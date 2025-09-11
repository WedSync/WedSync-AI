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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit,
  Save,
  Copy,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  FileText,
  Hash,
  Calendar,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface ChecklistItem {
  id: string;
  item: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  notes?: string;
  category?: string;
  assignee?: string;
  dueDate?: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: ChecklistItem[];
  is_system_template: boolean;
  created_by: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ChecklistGeneratorProps {
  taskId?: string;
  weddingId?: string;
  onChecklistApplied?: (checklistId: string) => void;
}

export default function ChecklistGenerator({
  taskId,
  weddingId,
  onChecklistApplied,
}: ChecklistGeneratorProps) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ChecklistTemplate | null>(null);
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'day_of_coordination',
    tags: [] as string[],
  });

  const [newItem, setNewItem] = useState({
    item: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: '',
    notes: '',
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
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedTemplates =
        data?.map((template) => ({
          ...template,
          items: template.items.map((item: any) => ({
            ...item,
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            completed: false,
          })),
        })) || [];

      setTemplates(parsedTemplates);
    } catch (error) {
      console.error('Error fetching checklist templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load checklist templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !currentUserId || currentChecklist.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide a name and at least one checklist item',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description,
          category: newTemplate.category,
          items: currentChecklist,
          is_system_template: false,
          created_by: currentUserId,
          tags: newTemplate.tags,
        })
        .select()
        .single();

      if (error) throw error;

      const parsedTemplate = {
        ...data,
        items: data.items.map((item: any) => ({
          ...item,
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          completed: false,
        })),
      };

      setTemplates([parsedTemplate, ...templates]);
      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'day_of_coordination',
        tags: [],
      });
      setCurrentChecklist([]);

      toast({
        title: 'Success',
        description: 'Checklist template created successfully',
      });
    } catch (error) {
      console.error('Error creating checklist template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checklist template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.item) return;

    const item: ChecklistItem = {
      id: `item-${Date.now()}`,
      item: newItem.item,
      priority: newItem.priority,
      category: newItem.category,
      notes: newItem.notes,
      completed: false,
    };

    setCurrentChecklist([...currentChecklist, item]);
    setNewItem({
      item: '',
      priority: 'medium',
      category: '',
      notes: '',
    });
  };

  const handleUpdateItem = (
    itemId: string,
    updates: Partial<ChecklistItem>,
  ) => {
    setCurrentChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCurrentChecklist((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleApplyToTask = async () => {
    if (!taskId || !selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Task ID and template are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'generate_checklist_from_template',
        {
          p_checklist_template_id: selectedTemplate.id,
          p_task_id: taskId,
        },
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Checklist applied to task successfully',
      });

      if (onChecklistApplied) {
        onChecklistApplied(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error applying checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply checklist to task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(currentChecklist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCurrentChecklist(items);
  };

  const handleExportChecklist = () => {
    if (!selectedTemplate) return;

    const dataStr = JSON.stringify(selectedTemplate, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${selectedTemplate.name.replace(/\s+/g, '-')}-checklist.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportChecklist = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (imported.items && Array.isArray(imported.items)) {
        setCurrentChecklist(
          imported.items.map((item: any) => ({
            ...item,
            id: `item-${Date.now()}-${Math.random()}`,
            completed: false,
          })),
        );

        if (imported.name) {
          setNewTemplate({
            ...newTemplate,
            name: `${imported.name} (Imported)`,
            description: imported.description || '',
            category: imported.category || 'custom',
            tags: imported.tags || [],
          });
        }

        toast({
          title: 'Success',
          description: 'Checklist imported successfully',
        });
      }
    } catch (error) {
      console.error('Error importing checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to import checklist',
        variant: 'destructive',
      });
    }
  };

  const generateSmartChecklist = async (context: string) => {
    setLoading(true);
    try {
      const smartItems: ChecklistItem[] = [];

      const contextMap: Record<string, ChecklistItem[]> = {
        photography: [
          {
            id: '1',
            item: 'Shot list review with couple',
            priority: 'critical',
            completed: false,
            category: 'Pre-wedding',
          },
          {
            id: '2',
            item: 'Scout ceremony location',
            priority: 'high',
            completed: false,
            category: 'Pre-wedding',
          },
          {
            id: '3',
            item: 'Check lighting at reception venue',
            priority: 'high',
            completed: false,
            category: 'Pre-wedding',
          },
          {
            id: '4',
            item: 'Backup equipment check',
            priority: 'critical',
            completed: false,
            category: 'Day-of',
          },
          {
            id: '5',
            item: 'Memory cards formatted',
            priority: 'critical',
            completed: false,
            category: 'Day-of',
          },
          {
            id: '6',
            item: 'Timeline sync with coordinator',
            priority: 'high',
            completed: false,
            category: 'Day-of',
          },
        ],
        venue: [
          {
            id: '1',
            item: 'Final headcount confirmation',
            priority: 'critical',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '2',
            item: 'Layout approval',
            priority: 'high',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '3',
            item: 'Vendor load-in schedule',
            priority: 'high',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '4',
            item: 'Special dietary requirements list',
            priority: 'medium',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '5',
            item: 'Parking arrangements',
            priority: 'medium',
            completed: false,
            category: 'Day-of',
          },
          {
            id: '6',
            item: 'Emergency contacts list',
            priority: 'critical',
            completed: false,
            category: 'Day-of',
          },
        ],
        catering: [
          {
            id: '1',
            item: 'Final menu confirmation',
            priority: 'critical',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '2',
            item: 'Allergy list review',
            priority: 'critical',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '3',
            item: 'Service timeline',
            priority: 'high',
            completed: false,
            category: 'Week-of',
          },
          {
            id: '4',
            item: 'Cake delivery time',
            priority: 'high',
            completed: false,
            category: 'Day-of',
          },
          {
            id: '5',
            item: 'Bar setup checklist',
            priority: 'medium',
            completed: false,
            category: 'Day-of',
          },
          {
            id: '6',
            item: 'Leftover food plan',
            priority: 'low',
            completed: false,
            category: 'Day-of',
          },
        ],
      };

      const items = contextMap[context.toLowerCase()] || contextMap['venue'];

      items.forEach((item) => {
        smartItems.push({
          ...item,
          id: `item-${Date.now()}-${Math.random()}`,
        });
      });

      setCurrentChecklist(smartItems);

      toast({
        title: 'Success',
        description: `Generated ${smartItems.length} checklist items`,
      });
    } catch (error) {
      console.error('Error generating smart checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate smart checklist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = () => {
    if (currentChecklist.length === 0) return 0;
    const completed = currentChecklist.filter((item) => item.completed).length;
    return Math.round((completed / currentChecklist.length) * 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  const groupedItems = currentChecklist.reduce(
    (acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
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
              <SelectItem value="day_of_coordination">
                Day-of Coordination
              </SelectItem>
              <SelectItem value="emergency_procedures">
                Emergency Procedures
              </SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Checklist Template</DialogTitle>
              <DialogDescription>
                Build a reusable checklist for wedding tasks
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="smart">Smart Generate</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label>Checklist Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    placeholder="e.g., Photography Shot List"
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
                    placeholder="Describe this checklist..."
                  />
                </div>
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
                      <SelectItem value="day_of_coordination">
                        Day-of Coordination
                      </SelectItem>
                      <SelectItem value="emergency_procedures">
                        Emergency Procedures
                      </SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-5"
                      placeholder="Checklist item"
                      value={newItem.item}
                      onChange={(e) =>
                        setNewItem({ ...newItem, item: e.target.value })
                      }
                    />
                    <Select
                      value={newItem.priority}
                      onValueChange={(value: any) =>
                        setNewItem({ ...newItem, priority: value })
                      }
                    >
                      <SelectTrigger className="col-span-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-3"
                      placeholder="Category"
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem({ ...newItem, category: e.target.value })
                      }
                    />
                    <Button onClick={handleAddItem} className="col-span-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {currentChecklist.length} items •{' '}
                      {getCompletionPercentage()}% complete
                    </span>
                    <Progress
                      value={getCompletionPercentage()}
                      className="w-32"
                    />
                  </div>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="checklist">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {Object.entries(groupedItems).map(
                          ([category, items]) => (
                            <div key={category}>
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(
                                    expandedCategories,
                                  );
                                  if (newExpanded.has(category)) {
                                    newExpanded.delete(category);
                                  } else {
                                    newExpanded.add(category);
                                  }
                                  setExpandedCategories(newExpanded);
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                              >
                                {expandedCategories.has(category) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {category} ({items.length})
                              </button>

                              {expandedCategories.has(category) && (
                                <div className="ml-6 space-y-1">
                                  {items.map((item, index) => (
                                    <Draggable
                                      key={item.id}
                                      draggableId={item.id}
                                      index={index}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className="flex items-center gap-2 p-2 bg-white border rounded-lg"
                                        >
                                          <Checkbox
                                            checked={item.completed}
                                            onCheckedChange={(checked) =>
                                              handleUpdateItem(item.id, {
                                                completed: checked as boolean,
                                              })
                                            }
                                          />
                                          <span
                                            className={`flex-1 ${
                                              item.completed
                                                ? 'line-through text-gray-400'
                                                : ''
                                            }`}
                                          >
                                            {item.item}
                                          </span>
                                          <Badge
                                            className={getPriorityColor(
                                              item.priority,
                                            )}
                                          >
                                            {item.priority}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleRemoveItem(item.id)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </TabsContent>

              <TabsContent value="smart" className="space-y-4">
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">
                    Smart Checklist Generator
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Generate a checklist based on common wedding scenarios
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => generateSmartChecklist('photography')}
                      className="h-auto flex-col py-4"
                    >
                      <FileText className="h-8 w-8 mb-2" />
                      Photography
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateSmartChecklist('venue')}
                      className="h-auto flex-col py-4"
                    >
                      <Calendar className="h-8 w-8 mb-2" />
                      Venue Setup
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateSmartChecklist('catering')}
                      className="h-auto flex-col py-4"
                    >
                      <Hash className="h-8 w-8 mb-2" />
                      Catering
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-6">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportChecklist}
                  className="hidden"
                  id="import-checklist"
                />
                <label htmlFor="import-checklist">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </span>
                  </Button>
                </label>
              </div>
              <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedTemplate(template);
              setCurrentChecklist(template.items);
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                {template.is_system_template && (
                  <Badge variant="secondary">System</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckSquare className="h-4 w-4" />
                  <span>{template.items.length} items</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              {taskId && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template);
                    handleApplyToTask();
                  }}
                >
                  Apply to Task
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
