'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  Download,
  Calendar,
  Printer,
  GripVertical,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ScheduleTask {
  id: string;
  title: string;
  description?: string;
  helper_id: string;
  helper_name: string;
  helper_phone?: string;
  helper_email?: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Helper {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  avatar_url?: string;
}

export default function RealtimeScheduleManager({
  weddingId,
  isCoordinator = false,
}: {
  weddingId: string;
  isCoordinator?: boolean;
}) {
  const [schedule, setSchedule] = useState<ScheduleTask[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [filteredSchedule, setFilteredSchedule] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  const supabase = createClient();

  // Fetch initial data
  useEffect(() => {
    fetchScheduleData();
  }, [weddingId, selectedDate]);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`schedule-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'helper_schedules',
          filter: `wedding_id=eq.${weddingId}`,
        },
        handleRealtimeUpdate,
      )
      .on('presence', { event: 'sync' }, () => {
        setConnectionStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [weddingId]);

  // Filter schedule based on search and filters
  useEffect(() => {
    let filtered = schedule;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.helper_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Sort by sort_order, then by time
    filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return (
        new Date(a.scheduled_time).getTime() -
        new Date(b.scheduled_time).getTime()
      );
    });

    setFilteredSchedule(filtered);
  }, [schedule, searchTerm, statusFilter]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch schedule data
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('helper_schedules')
        .select(
          `
          *,
          helpers:helper_id (
            id,
            name,
            email,
            phone,
            role,
            avatar_url
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .gte('scheduled_time', selectedDate)
        .lt(
          'scheduled_time',
          new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        )
        .order('sort_order')
        .order('scheduled_time');

      if (scheduleError) throw scheduleError;

      // Transform data
      const transformedSchedule: ScheduleTask[] =
        scheduleData?.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          helper_id: item.helper_id,
          helper_name: item.helpers?.name || 'Unknown Helper',
          helper_phone: item.helpers?.phone,
          helper_email: item.helpers?.email,
          scheduled_time: item.scheduled_time,
          duration_minutes: item.duration_minutes || 60,
          location: item.location,
          status: item.status,
          priority: item.priority || 'medium',
          notes: item.notes,
          sort_order: item.sort_order || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        })) || [];

      setSchedule(transformedSchedule);

      // Fetch available helpers
      const { data: helpersData, error: helpersError } = await supabase
        .from('helpers')
        .select('id, name, email, phone, role, avatar_url')
        .eq('wedding_id', weddingId)
        .eq('is_active', true)
        .order('name');

      if (!helpersError && helpersData) {
        setHelpers(helpersData);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = useCallback(
    (payload: any) => {
      const { eventType, new: newData, old: oldData } = payload;

      setSchedule((prev) => {
        switch (eventType) {
          case 'INSERT':
            if (newData.wedding_id === weddingId) {
              return [
                ...prev,
                {
                  ...newData,
                  helper_name:
                    helpers.find((h) => h.id === newData.helper_id)?.name ||
                    'Unknown Helper',
                },
              ];
            }
            return prev;
          case 'UPDATE':
            return prev.map((item) =>
              item.id === newData.id
                ? {
                    ...newData,
                    helper_name:
                      helpers.find((h) => h.id === newData.helper_id)?.name ||
                      'Unknown Helper',
                  }
                : item,
            );
          case 'DELETE':
            return prev.filter((item) => item.id !== oldData.id);
          default:
            return prev;
        }
      });

      // Show toast notification for updates from other users
      if (eventType === 'UPDATE' && newData.updated_at !== oldData.updated_at) {
        toast.info(`Schedule updated: ${newData.title}`, {
          description: `Status changed to ${newData.status}`,
        });
      }
    },
    [weddingId, helpers],
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !isCoordinator) return;

    const { draggableId, source, destination } = result;

    if (source.index === destination.index) return;

    // Update local state immediately for smooth UX
    const reorderedSchedule = Array.from(filteredSchedule);
    const [removed] = reorderedSchedule.splice(source.index, 1);
    reorderedSchedule.splice(destination.index, 0, removed);

    // Update sort_order for affected items
    const updatedItems = reorderedSchedule.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setFilteredSchedule(updatedItems);

    // Update in full schedule
    setSchedule((prev) =>
      prev.map((item) => {
        const updatedItem = updatedItems.find((u) => u.id === item.id);
        return updatedItem || item;
      }),
    );

    // Update database
    try {
      setSaving(true);
      const response = await fetch(
        `/api/helpers/schedules/${draggableId}/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_order: destination.index,
            wedding_id: weddingId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to reorder');
      }

      toast.success('Schedule reordered successfully');
    } catch (error) {
      // Revert on error
      fetchScheduleData();
      toast.error('Failed to reorder schedule');
      console.error('Failed to reorder:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: ScheduleTask['status'],
  ) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('helper_schedules')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('wedding_id', weddingId);

      if (error) throw error;

      toast.success(`Task status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setSaving(false);
    }
  };

  const exportCalendar = async () => {
    try {
      const response = await fetch(
        `/api/helpers/schedules/${weddingId}/export/ics`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-schedule-${selectedDate}.ics`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Calendar exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export calendar');
    }
  };

  const printSchedule = () => {
    window.print();
  };

  const refreshSchedule = () => {
    fetchScheduleData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'confirmed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_progress':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:flex-row">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Wedding Day Schedule
            {connectionStatus === 'connected' && (
              <Badge variant="secondary" className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Live
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredSchedule.length} tasks scheduled for{' '}
            {new Date(selectedDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" onClick={refreshSchedule} size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={exportCalendar} size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={printSchedule} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tasks or helpers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="schedule">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-3 min-h-96 ${
                snapshot.isDraggingOver ? 'bg-primary/5' : ''
              }`}
            >
              {filteredSchedule.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No tasks scheduled
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add tasks to get started'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredSchedule.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                    isDragDisabled={!isCoordinator || saving}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`transition-all duration-200 print:break-inside-avoid ${
                          snapshot.isDragging
                            ? 'shadow-lg scale-105 rotate-2'
                            : 'hover:shadow-md'
                        } ${isCoordinator ? 'cursor-move' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Drag Handle */}
                            {isCoordinator && (
                              <div
                                {...provided.dragHandleProps}
                                className="flex flex-col gap-1 mt-2 print:hidden"
                              >
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>
                            )}

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">
                                    {task.title}
                                  </h3>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge
                                    variant="secondary"
                                    className={`${getPriorityColor(task.priority)} text-xs`}
                                  >
                                    {task.priority}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={getStatusColor(task.status)}
                                  >
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>
                                      {new Date(
                                        task.scheduled_time,
                                      ).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}{' '}
                                      ({task.duration_minutes} min)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span>{task.helper_name}</span>
                                    {task.helper_phone && (
                                      <a
                                        href={`tel:${task.helper_phone}`}
                                        className="text-primary hover:underline ml-2"
                                      >
                                        <Phone className="w-3 h-3 inline" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {task.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-gray-400" />
                                      <span>{task.location}</span>
                                    </div>
                                  )}

                                  {task.notes && (
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                                      <span className="text-xs">
                                        {task.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions */}
                              {isCoordinator && (
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t print:hidden">
                                  <Select
                                    value={task.status}
                                    onValueChange={(
                                      value: ScheduleTask['status'],
                                    ) => updateTaskStatus(task.id, value)}
                                  >
                                    <SelectTrigger className="w-auto h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">
                                        Pending
                                      </SelectItem>
                                      <SelectItem value="confirmed">
                                        Confirmed
                                      </SelectItem>
                                      <SelectItem value="in_progress">
                                        In Progress
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Completed
                                      </SelectItem>
                                      <SelectItem value="cancelled">
                                        Cancelled
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button size="sm" variant="ghost">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Loading/Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}
