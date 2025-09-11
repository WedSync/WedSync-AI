'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  Users,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Types
interface TaskCategory {
  id: string;
  name: string;
  phase:
    | 'planning'
    | 'setup'
    | 'ceremony'
    | 'cocktail'
    | 'reception'
    | 'breakdown'
    | 'post_wedding';
  color_hex: string;
  icon_name: string;
  display_order: number;
  is_default: boolean;
  description?: string;
}

interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  phase?: string;
  color_hex?: string;
  timeline_position?: number;
  duration_minutes: number;
  status:
    | 'todo'
    | 'in_progress'
    | 'review'
    | 'completed'
    | 'blocked'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  deadline: string;
}

interface DraggedTask {
  task: WorkflowTask;
  fromCategory: string;
}

// Phase configuration with colors
const PHASE_CONFIG = {
  planning: { label: 'Planning', color: '#9333EA', icon: '📋' },
  setup: { label: 'Setup', color: '#3B82F6', icon: '🏗️' },
  ceremony: { label: 'Ceremony', color: '#10B981', icon: '💒' },
  cocktail: { label: 'Cocktail Hour', color: '#F59E0B', icon: '🥂' },
  reception: { label: 'Reception', color: '#EF4444', icon: '🎉' },
  breakdown: { label: 'Breakdown', color: '#6B7280', icon: '🧹' },
  post_wedding: { label: 'Post-Wedding', color: '#8B5CF6', icon: '📮' },
};

// Draggable Task Component
const DraggableTask: React.FC<{
  task: WorkflowTask;
  category: TaskCategory;
  onDrop: (task: WorkflowTask, newCategory: TaskCategory) => void;
}> = ({ task, category }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { task, fromCategory: category.id } as DraggedTask,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'blocked':
        return '🚫';
      case 'review':
        return '👀';
      default:
        return '⏳';
    }
  };

  return (
    <div
      ref={drag}
      className={cn(
        'p-3 mb-2 bg-white rounded-lg border-2 cursor-move transition-all',
        'hover:shadow-lg hover:border-blue-300',
        isDragging ? 'opacity-50 scale-95' : 'opacity-100',
      )}
      style={{ borderColor: task.color_hex || category.color_hex }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm flex-1 mr-2">{task.title}</h4>
        <span className="text-lg">{getStatusIcon(task.status)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              getPriorityColor(task.priority),
            )}
          />
          <span className="text-xs text-gray-500">
            {task.duration_minutes} min
          </span>
        </div>

        {task.assigned_to && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>Assigned</span>
          </div>
        )}
      </div>

      {task.deadline && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{new Date(task.deadline).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};

// Droppable Category Column
const CategoryColumn: React.FC<{
  category: TaskCategory;
  tasks: WorkflowTask[];
  onDrop: (task: WorkflowTask, category: TaskCategory) => void;
  onAddTask: (category: TaskCategory) => void;
}> = ({ category, tasks, onDrop, onAddTask }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: DraggedTask) => {
      if (item.fromCategory !== category.id) {
        onDrop(item.task, category);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const phaseConfig = PHASE_CONFIG[category.phase];

  return (
    <div
      ref={drop}
      className={cn(
        'flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4 transition-all',
        isOver && canDrop && 'bg-blue-50 border-2 border-blue-300',
        !canDrop && isOver && 'bg-red-50',
      )}
    >
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b-2"
        style={{ borderColor: category.color_hex }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{phaseConfig.icon}</span>
          <div>
            <h3 className="font-semibold text-sm">{category.name}</h3>
            <p className="text-xs text-gray-500">{phaseConfig.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{tasks.length}</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddTask(category)}
            className="h-6 w-6 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            category={category}
            onDrop={onDrop}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>No tasks in this category</p>
            <p className="text-xs mt-1">Drag tasks here or click + to add</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Task Category Manager Component
export default function TaskCategoryManager({
  weddingId,
}: {
  weddingId: string;
}) {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'timeline'>('board');

  // Detect if on mobile for touch support
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const Backend = isMobile ? TouchBackend : HTML5Backend;

  // Load categories and tasks
  useEffect(() => {
    loadData();
  }, [weddingId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load categories
      const { data: categoriesData, error: catError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (catError) throw catError;

      // Load tasks
      const { data: tasksData, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('deadline');

      if (taskError) throw taskError;

      setCategories(categoriesData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  // Handle task drop to new category
  const handleTaskDrop = async (
    task: WorkflowTask,
    newCategory: TaskCategory,
  ) => {
    try {
      // Update task category in database
      const { error } = await supabase
        .from('workflow_tasks')
        .update({
          category_id: newCategory.id,
          phase: newCategory.phase,
          color_hex: newCategory.color_hex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                category_id: newCategory.id,
                phase: newCategory.phase,
                color_hex: newCategory.color_hex,
              }
            : t,
        ),
      );

      toast.success(`Moved "${task.title}" to ${newCategory.name}`);
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
  };

  // Handle adding new task to category
  const handleAddTask = (category: TaskCategory) => {
    // This would open a modal or navigate to task creation with pre-selected category
    toast.info(`Add new task to ${category.name}`);
  };

  // Filter tasks based on search and phase
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase =
      selectedPhase === 'all' || task.phase === selectedPhase;
    return matchesSearch && matchesPhase;
  });

  // Group tasks by category
  const tasksByCategory = categories.reduce(
    (acc, category) => {
      acc[category.id] = filteredTasks.filter(
        (task) => task.category_id === category.id,
      );
      return acc;
    },
    {} as Record<string, WorkflowTask[]>,
  );

  // Get uncategorized tasks
  const uncategorizedTasks = filteredTasks.filter((task) => !task.category_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={Backend}>
      <div className="space-y-4">
        {/* Header Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Task Categories</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Organize tasks by wedding phase with drag & drop
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'board' ? 'default' : 'outline'}
                  onClick={() => setViewMode('board')}
                  size="sm"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Board
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  onClick={() => setViewMode('timeline')}
                  size="sm"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Timeline
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Phase Filter */}
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Phases</option>
                {Object.entries(PHASE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Board */}
            {viewMode === 'board' && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {categories
                  .filter(
                    (cat) =>
                      selectedPhase === 'all' || cat.phase === selectedPhase,
                  )
                  .map((category) => (
                    <CategoryColumn
                      key={category.id}
                      category={category}
                      tasks={tasksByCategory[category.id] || []}
                      onDrop={handleTaskDrop}
                      onAddTask={handleAddTask}
                    />
                  ))}

                {/* Uncategorized Tasks */}
                {uncategorizedTasks.length > 0 && (
                  <CategoryColumn
                    category={{
                      id: 'uncategorized',
                      name: 'Uncategorized',
                      phase: 'planning',
                      color_hex: '#9CA3AF',
                      icon_name: 'inbox',
                      display_order: 999,
                      is_default: false,
                    }}
                    tasks={uncategorizedTasks}
                    onDrop={handleTaskDrop}
                    onAddTask={() =>
                      toast.info('Please select a category first')
                    }
                  />
                )}
              </div>
            )}

            {/* Timeline View (placeholder for now) */}
            {viewMode === 'timeline' && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  Visual timeline view coming soon
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  See all tasks on a chronological timeline
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Statistics */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {tasks.length}
                </p>
                <p className="text-sm text-gray-500">Total Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {tasks.filter((t) => t.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {tasks.filter((t) => t.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {
                    tasks.filter(
                      (t) => t.priority === 'critical' || t.priority === 'high',
                    ).length
                  }
                </p>
                <p className="text-sm text-gray-500">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
}
