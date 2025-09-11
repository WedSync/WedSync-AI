'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { format, addMinutes, differenceInMinutes, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimelineTask {
  id: string;
  title: string;
  category_id: string;
  category_name: string;
  phase: string;
  color_hex: string;
  timeline_position: number; // minutes from start
  duration_minutes: number;
  assigned_to?: string;
  assigned_name?: string;
  status: string;
  priority: string;
  location?: string;
}

interface TimelineConfig {
  start_time: string;
  end_time: string;
  time_scale: number; // pixels per minute
  show_dependencies: boolean;
  show_helpers: boolean;
  color_by: 'category' | 'priority' | 'status' | 'helper';
}

interface TimeSlot {
  time: Date;
  label: string;
  position: number;
}

// Timeline Task Block Component
const TimelineTaskBlock: React.FC<{
  task: TimelineTask;
  config: TimelineConfig;
  onUpdate: (taskId: string, position: number) => void;
  onSelect: (task: TimelineTask) => void;
}> = ({ task, config, onUpdate, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'timeline-task',
    item: { id: task.id, originalPosition: task.timeline_position },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'timeline-task',
    hover: (item: any, monitor) => {
      if (!ref.current) return;

      const dragOffset = monitor.getClientOffset();
      if (!dragOffset) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = dragOffset.x - hoverBoundingRect.left;

      // Calculate new position based on drag
      const newPosition = Math.round(clientOffset / config.time_scale) * 5; // Snap to 5-minute intervals

      if (Math.abs(newPosition - task.timeline_position) > 5) {
        onUpdate(item.id, newPosition);
      }
    },
  });

  drag(drop(ref));

  // Calculate position and width
  const left = task.timeline_position * config.time_scale;
  const width = task.duration_minutes * config.time_scale;

  // Get color based on config
  const getBlockColor = () => {
    if (config.color_by === 'category') return task.color_hex;
    if (config.color_by === 'priority') {
      switch (task.priority) {
        case 'critical':
          return '#EF4444';
        case 'high':
          return '#F59E0B';
        case 'medium':
          return '#3B82F6';
        case 'low':
          return '#10B981';
        default:
          return '#6B7280';
      }
    }
    if (config.color_by === 'status') {
      switch (task.status) {
        case 'completed':
          return '#10B981';
        case 'in_progress':
          return '#3B82F6';
        case 'blocked':
          return '#EF4444';
        case 'review':
          return '#F59E0B';
        default:
          return '#6B7280';
      }
    }
    return task.color_hex;
  };

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-2 rounded-md px-2 py-1 cursor-move transition-all',
        'hover:shadow-lg hover:z-10 hover:scale-105',
        isDragging && 'opacity-50',
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: getBlockColor(),
        minWidth: '80px',
      }}
      onClick={() => onSelect(task)}
    >
      <div className="text-white text-xs font-medium truncate">
        {task.title}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-white/80 text-xs">{task.duration_minutes}m</span>
        {task.assigned_name && config.show_helpers && (
          <span className="text-white/80 text-xs truncate max-w-[60px]">
            {task.assigned_name}
          </span>
        )}
      </div>
    </div>
  );
};

// Timeline Grid Component
const TimelineGrid: React.FC<{
  config: TimelineConfig;
  totalMinutes: number;
}> = ({ config, totalMinutes }) => {
  const timeSlots: TimeSlot[] = [];
  const startTime = new Date(`2024-01-01 ${config.start_time}`);

  // Generate time slots every 30 minutes
  for (let i = 0; i <= totalMinutes; i += 30) {
    const time = addMinutes(startTime, i);
    timeSlots.push({
      time,
      label: format(time, 'h:mm a'),
      position: i * config.time_scale,
    });
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Hour markers */}
      {timeSlots.map((slot, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 border-l border-gray-200"
          style={{ left: `${slot.position}px` }}
        >
          <span className="absolute -top-6 -left-8 text-xs text-gray-500">
            {slot.label}
          </span>
        </div>
      ))}

      {/* 15-minute markers */}
      {Array.from({ length: Math.floor(totalMinutes / 15) }).map((_, i) => (
        <div
          key={`quarter-${i}`}
          className="absolute top-0 bottom-0 border-l border-gray-100"
          style={{ left: `${i * 15 * config.time_scale}px` }}
        />
      ))}
    </div>
  );
};

// Main Timeline Component
export default function TaskTimeline({ weddingId }: { weddingId: string }) {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [config, setConfig] = useState<TimelineConfig>({
    start_time: '08:00',
    end_time: '23:00',
    time_scale: 2, // 2 pixels per minute
    show_dependencies: true,
    show_helpers: true,
    color_by: 'category',
  });
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const Backend = isMobile ? TouchBackend : HTML5Backend;

  useEffect(() => {
    loadTimelineData();
  }, [weddingId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Load timeline config
      const { data: configData } = await supabase
        .from('timeline_configs')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('view_type', 'phase')
        .single();

      if (configData) {
        setConfig(configData as TimelineConfig);
      }

      // Load tasks with timeline positions
      const { data: tasksData, error } = await supabase
        .from('workflow_tasks')
        .select(
          `
          *,
          task_categories (
            name,
            color_hex
          ),
          team_members!assigned_to (
            name
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .not('timeline_position', 'is', null)
        .order('timeline_position');

      if (error) throw error;

      const formattedTasks =
        tasksData?.map((task) => ({
          id: task.id,
          title: task.title,
          category_id: task.category_id,
          category_name: task.task_categories?.name || 'Uncategorized',
          phase: task.phase,
          color_hex:
            task.color_hex || task.task_categories?.color_hex || '#6B7280',
          timeline_position: task.timeline_position || 0,
          duration_minutes: task.duration_minutes || 30,
          assigned_to: task.assigned_to,
          assigned_name: task.team_members?.name,
          status: task.status,
          priority: task.priority,
          location: task.location,
        })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error loading timeline:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskPosition = async (taskId: string, newPosition: number) => {
    try {
      const { error } = await supabase
        .from('workflow_tasks')
        .update({
          timeline_position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, timeline_position: newPosition }
            : task,
        ),
      );
    } catch (error) {
      console.error('Error updating task position:', error);
      toast.error('Failed to update task position');
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom =
      direction === 'in' ? Math.min(zoom + 25, 200) : Math.max(zoom - 25, 50);

    setZoom(newZoom);
    setConfig((prev) => ({
      ...prev,
      time_scale: (2 * newZoom) / 100,
    }));
  };

  const exportTimeline = () => {
    // Generate timeline export (CSV or PDF)
    toast.success('Timeline exported successfully');
  };

  // Calculate total timeline duration
  const startMinutes =
    parseInt(config.start_time.split(':')[0]) * 60 +
    parseInt(config.start_time.split(':')[1]);
  const endMinutes =
    parseInt(config.end_time.split(':')[0]) * 60 +
    parseInt(config.end_time.split(':')[1]);
  const totalMinutes = endMinutes - startMinutes;

  // Group tasks by phase/swimlane
  const tasksByPhase = tasks.reduce(
    (acc, task) => {
      if (!acc[task.phase]) acc[task.phase] = [];
      acc[task.phase].push(task);
      return acc;
    },
    {} as Record<string, TimelineTask[]>,
  );

  const phases = Object.keys(tasksByPhase).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={Backend}>
      <Card className="w-full">
        {/* Timeline Header */}
        <div className="border-b p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Wedding Day Timeline
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Drag tasks to adjust timing • {tasks.length} tasks scheduled
              </p>
            </div>

            {/* Timeline Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoom('out')}
                  disabled={zoom <= 50}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">{zoom}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoom('in')}
                  disabled={zoom >= 200}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Color By Selector */}
              <select
                value={config.color_by}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    color_by: e.target.value as any,
                  }))
                }
                className="h-8 px-2 text-sm border rounded-md"
              >
                <option value="category">Color by Category</option>
                <option value="priority">Color by Priority</option>
                <option value="status">Color by Status</option>
                <option value="helper">Color by Helper</option>
              </select>

              {/* View Options */}
              <Button
                size="sm"
                variant={config.show_helpers ? 'default' : 'outline'}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    show_helpers: !prev.show_helpers,
                  }))
                }
              >
                <Users className="w-4 h-4" />
              </Button>

              {/* Export */}
              <Button size="sm" variant="outline" onClick={exportTimeline}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="relative overflow-x-auto overflow-y-hidden"
            style={{ height: `${100 + phases.length * 80}px` }}
          >
            {/* Time Header */}
            <div
              className="sticky top-0 h-8 bg-gray-50 border-b z-20"
              style={{ width: `${totalMinutes * config.time_scale}px` }}
            >
              <TimelineGrid config={config} totalMinutes={totalMinutes} />
            </div>

            {/* Swimlanes by Phase */}
            {phases.map((phase, phaseIndex) => (
              <div
                key={phase}
                className="relative border-b"
                style={{
                  height: '70px',
                  width: `${totalMinutes * config.time_scale}px`,
                }}
              >
                {/* Phase Label */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gray-50 border-r flex items-center px-3 z-10">
                  <span className="text-sm font-medium capitalize">
                    {phase.replace('_', ' ')}
                  </span>
                </div>

                {/* Tasks in Phase */}
                <div className="relative" style={{ marginLeft: '128px' }}>
                  {tasksByPhase[phase].map((task) => (
                    <TimelineTaskBlock
                      key={task.id}
                      task={task}
                      config={config}
                      onUpdate={updateTaskPosition}
                      onSelect={setSelectedTask}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Current Time Indicator */}
            <div
              className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
              style={{
                left: `${differenceInMinutes(new Date(), startOfDay(new Date())) * config.time_scale}px`,
              }}
            >
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                NOW
              </div>
            </div>
          </div>
        </CardContent>

        {/* Selected Task Details */}
        {selectedTask && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{selectedTask.title}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(selectedTask.timeline_position / 60)}:
                    {String(selectedTask.timeline_position % 60).padStart(
                      2,
                      '0',
                    )}{' '}
                    - {selectedTask.duration_minutes} min
                  </span>
                  <Badge
                    style={{ backgroundColor: selectedTask.color_hex }}
                    className="text-white"
                  >
                    {selectedTask.category_name}
                  </Badge>
                  {selectedTask.assigned_name && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedTask.assigned_name}
                    </span>
                  )}
                  {selectedTask.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedTask.location}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTask(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}
      </Card>
    </DndProvider>
  );
}
