'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Timer,
  UserCheck,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

interface HelperTask {
  id: string;
  helper_name: string;
  helper_email: string | null;
  helper_phone: string | null;
  helper_role: string | null;
  task_title: string;
  task_description: string | null;
  task_location: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  instructions: string | null;
  special_requirements: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HelperScheduleTimelineProps {
  weddingId: string;
  organizationId: string;
  helperId?: string;
  viewMode?: 'helper' | 'organizer';
  onTaskUpdate?: (task: HelperTask) => void;
}

export default function HelperScheduleTimeline({
  weddingId,
  organizationId,
  helperId,
  viewMode = 'organizer',
  onTaskUpdate,
}: HelperScheduleTimelineProps) {
  const [tasks, setTasks] = useState<HelperTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchHelperSchedule();
    setupRealtimeSubscription();
  }, [weddingId, helperId, selectedDate]);

  const fetchHelperSchedule = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('helper_schedules')
        .select('*')
        .eq('wedding_id', weddingId);

      // Filter by helper if in helper view mode
      if (viewMode === 'helper' && helperId) {
        query = query.eq('helper_user_id', helperId);
      }

      // Filter by selected date
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;
      query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);

      const { data, error } = await query.order('start_time', {
        ascending: true,
      });

      if (error) throw error;

      setTasks(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch helper schedule:', err);
      setError('Failed to load schedule');
      toast.error('Failed to load helper schedule');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`helper-schedule-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'helper_schedules',
          filter: `wedding_id=eq.${weddingId}`,
        },
        () => {
          fetchHelperSchedule();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: HelperTask['status'],
    completionNotes?: string,
  ) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
        if (completionNotes) {
          updateData.completion_notes = completionNotes;
        }
      } else if (newStatus !== 'COMPLETED') {
        updateData.completed_at = null;
        updateData.completion_notes = null;
      }

      const { data, error } = await supabase
        .from('helper_schedules')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updateData } : task,
        ),
      );

      onTaskUpdate?.(data);

      const statusMessages = {
        ASSIGNED: 'Task marked as assigned',
        IN_PROGRESS: 'Task started',
        COMPLETED: 'Task completed successfully',
        CANCELLED: 'Task cancelled',
      };

      toast.success(statusMessages[newStatus]);
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error('Failed to update task status');
    }
  };

  const sendReminder = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('helper_schedules')
        .update({
          reminder_sent_at: new Date().toISOString(),
          reminder_email_sent: true,
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, reminder_sent_at: new Date().toISOString() }
            : task,
        ),
      );

      toast.success('Reminder sent successfully');
    } catch (err) {
      console.error('Failed to send reminder:', err);
      toast.error('Failed to send reminder');
    }
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDateShort = (datetime: string) => {
    return new Date(datetime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: HelperTask['status']) => {
    const colors = {
      ASSIGNED: 'bg-gray-100 text-gray-700 border-gray-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
      COMPLETED: 'bg-green-100 text-green-700 border-green-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: HelperTask['priority']) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[priority];
  };

  const getStatusIcon = (status: HelperTask['status']) => {
    const icons = {
      ASSIGNED: AlertCircle,
      IN_PROGRESS: Timer,
      COMPLETED: CheckCircle,
      CANCELLED: AlertCircle,
    };
    return icons[status];
  };

  const groupTasksByHelper = (tasks: HelperTask[]) => {
    const grouped = tasks.reduce(
      (acc, task) => {
        const key = task.helper_name || 'Unassigned';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(task);
        return acc;
      },
      {} as Record<string, HelperTask[]>,
    );

    return Object.entries(grouped).map(([name, tasks]) => ({
      helper_name: name,
      tasks: tasks.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      ),
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchHelperSchedule} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const helperGroups =
    viewMode === 'organizer' ? groupTasksByHelper(tasks) : null;

  return (
    <div className="space-y-6" data-testid="helper-timeline">
      {/* Date Selector */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5 text-primary-600" />
              {viewMode === 'helper' ? 'Your Schedule' : 'Helper Schedule'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} scheduled for{' '}
            {formatDateShort(selectedDate + 'T00:00:00')}
          </p>
        </CardHeader>
      </Card>

      {/* Tasks Display */}
      {viewMode === 'helper' ? (
        // Helper View - Single timeline
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Tasks Scheduled
                </h3>
                <p className="text-gray-500">
                  You don't have any tasks assigned for this date.
                </p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task, index) => {
              const StatusIcon = getStatusIcon(task.status);

              return (
                <div key={task.id} className="relative">
                  {/* Timeline connector */}
                  {index < tasks.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-20 bg-gray-200 z-0" />
                  )}

                  <Card className="relative z-10 bg-white border border-gray-200 rounded-xl shadow-xs hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Status Icon */}
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-600'
                              : task.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-600'
                                : task.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <StatusIcon className="w-6 h-6" />
                        </div>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                {task.task_title}
                              </h3>
                              {task.task_description && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {task.task_description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge
                                className={`text-xs px-2 py-1 ${getPriorityColor(task.priority)}`}
                              >
                                {task.priority}
                              </Badge>
                              <Badge
                                className={`text-xs px-2 py-1 border ${getStatusColor(task.status)}`}
                              >
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          {/* Time and Location */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatTime(task.start_time)} -{' '}
                                {formatTime(task.end_time)}
                              </span>
                              <span className="text-gray-400">
                                ({formatDuration(task.duration_minutes)})
                              </span>
                            </div>
                            {task.task_location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{task.task_location}</span>
                              </div>
                            )}
                          </div>

                          {/* Contact Information */}
                          {(task.contact_person || task.contact_phone) && (
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <UserCheck className="w-4 h-4" />
                                <span>Contact: {task.contact_person}</span>
                                {task.contact_phone && (
                                  <>
                                    <Phone className="w-3 h-3 ml-2" />
                                    <span>{task.contact_phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Special Instructions */}
                          {task.instructions && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-yellow-800 mb-1">
                                    Special Instructions:
                                  </p>
                                  <p className="text-sm text-yellow-700">
                                    {task.instructions}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Special Requirements */}
                          {task.special_requirements && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <div className="flex items-start gap-2">
                                <Star className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800 mb-1">
                                    Special Requirements:
                                  </p>
                                  <p className="text-sm text-blue-700">
                                    {task.special_requirements}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Completion Notes */}
                          {task.completion_notes &&
                            task.status === 'COMPLETED' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-green-800 mb-1">
                                      Completion Notes:
                                    </p>
                                    <p className="text-sm text-green-700">
                                      {task.completion_notes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Action Buttons for Helper */}
                          {viewMode === 'helper' && (
                            <div className="flex gap-2 pt-2">
                              {task.status === 'ASSIGNED' && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateTaskStatus(task.id, 'IN_PROGRESS')
                                  }
                                  className="flex items-center gap-1"
                                >
                                  <Timer className="w-3 h-3" />
                                  Start Task
                                </Button>
                              )}

                              {task.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateTaskStatus(task.id, 'COMPLETED')
                                  }
                                  className="flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Mark Complete
                                </Button>
                              )}

                              {(task.status === 'ASSIGNED' ||
                                task.status === 'IN_PROGRESS') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateTaskStatus(task.id, 'CANCELLED')
                                  }
                                  className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Can't Complete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      ) : (
        // Organizer View - Grouped by helper
        <div className="space-y-6">
          {helperGroups && helperGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Tasks Scheduled
                </h3>
                <p className="text-gray-500">
                  No helper tasks are scheduled for this date.
                </p>
              </CardContent>
            </Card>
          ) : (
            helperGroups?.map((group) => (
              <Card
                key={group.helper_name}
                className="bg-white border border-gray-200 rounded-xl shadow-xs"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary-100 text-primary-700">
                        {group.helper_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {group.helper_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {group.tasks.length}{' '}
                        {group.tasks.length === 1 ? 'task' : 'tasks'}
                        {group.tasks[0]?.helper_role &&
                          ` • ${group.tasks[0].helper_role}`}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {group.tasks[0]?.helper_email && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Send Email"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      {group.tasks[0]?.helper_phone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.tasks.map((task, taskIndex) => {
                      const StatusIcon = getStatusIcon(task.status);

                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <StatusIcon
                            className={`w-5 h-5 ${
                              task.status === 'COMPLETED'
                                ? 'text-green-600'
                                : task.status === 'IN_PROGRESS'
                                  ? 'text-blue-600'
                                  : task.status === 'CANCELLED'
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                            }`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 truncate">
                                {task.task_title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs px-2 py-1 ${getPriorityColor(task.priority)}`}
                                >
                                  {task.priority}
                                </Badge>
                                <Badge
                                  className={`text-xs px-2 py-1 border ${getStatusColor(task.status)}`}
                                >
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatTime(task.start_time)} -{' '}
                                  {formatTime(task.end_time)}
                                </span>
                              </div>
                              {task.task_location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">
                                    {task.task_location}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {!task.reminder_sent_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendReminder(task.id)}
                                className="h-8 px-2 text-xs"
                              >
                                Remind
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
