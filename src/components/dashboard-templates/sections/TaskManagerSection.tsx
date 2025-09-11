'use client';

import React from 'react';
import { CheckSquare, Clock, AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface TaskManagerSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function TaskManagerSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: TaskManagerSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock task data
  const tasks = [
    {
      id: '1',
      title: 'Book wedding venue',
      status: 'completed',
      dueDate: '2025-02-15',
    },
    {
      id: '2',
      title: 'Choose photographer',
      status: 'in_progress',
      dueDate: '2025-03-01',
    },
    {
      id: '3',
      title: 'Send save the dates',
      status: 'pending',
      dueDate: '2025-03-15',
    },
  ];

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    overdue: tasks.filter((t) => t.status === 'overdue').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <CheckSquare className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {tasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
          >
            <div
              className={`w-4 h-4 rounded border-2 ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300'
              }`}
            >
              {task.status === 'completed' && (
                <CheckSquare className="h-3 w-3 text-white" />
              )}
            </div>
            <span
              className={`flex-1 text-sm ${
                task.status === 'completed'
                  ? 'line-through text-gray-500'
                  : 'text-gray-700'
              }`}
            >
              {task.title}
            </span>
            <Badge
              variant={
                task.status === 'completed'
                  ? 'success'
                  : task.status === 'overdue'
                    ? 'destructive'
                    : 'secondary'
              }
              size="sm"
            >
              {task.status}
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => onInteraction?.('add_task', {})}
        >
          Add Task
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onInteraction?.('view_all', {})}
        >
          View All Tasks
        </Button>
      </div>
    </div>
  );
}
