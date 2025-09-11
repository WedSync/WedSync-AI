'use client';

import React, { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { WorkflowTask, TaskStatus, TaskFilter } from '@/types/workflow';
import { TaskCard } from './TaskCard';
import { Plus, Filter, Search, Calendar, Users } from 'lucide-react';

interface TaskBoardProps {
  tasks: (WorkflowTask & {
    assigned_to_member?: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url?: string;
    };
    created_by_member: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url?: string;
    };
  })[];
  onTaskClick?: (task: WorkflowTask) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
  onCreateTask?: () => void;
  isLoading?: boolean;
  filters?: TaskFilter;
  onFiltersChange?: (filters: TaskFilter) => void;
}

const statusColumns = [
  { id: 'todo' as TaskStatus, title: 'To Do', color: 'bg-gray-100' },
  {
    id: 'in_progress' as TaskStatus,
    title: 'In Progress',
    color: 'bg-blue-100',
  },
  { id: 'review' as TaskStatus, title: 'Review', color: 'bg-yellow-100' },
  { id: 'completed' as TaskStatus, title: 'Completed', color: 'bg-green-100' },
  { id: 'blocked' as TaskStatus, title: 'Blocked', color: 'bg-red-100' },
];

export function TaskBoard({
  tasks,
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  isLoading = false,
  filters = {},
  onFiltersChange,
}: TaskBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return statusColumns.reduce(
      (acc, column) => {
        acc[column.id] = filtered.filter((task) => task.status === column.id);
        return acc;
      },
      {} as Record<TaskStatus, typeof tasks>,
    );
  }, [tasks, searchQuery]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as TaskStatus;
    onTaskStatusChange?.(draggableId, newStatus);
  };

  const getTotalTasks = () => tasks.length;
  const getCompletedTasks = () =>
    tasks.filter((task) => task.status === 'completed').length;
  const getOverdueTasks = () =>
    tasks.filter((task) => {
      const deadline = new Date(task.deadline);
      return (
        deadline < new Date() &&
        !['completed', 'cancelled'].includes(task.status)
      );
    }).length;

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Task Board</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>{getTotalTasks()} total tasks</span>
            <span>{getCompletedTasks()} completed</span>
            {getOverdueTasks() > 0 && (
              <span className="text-red-600 font-medium">
                {getOverdueTasks()} overdue
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200 w-64
              "
            />
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg
              border transition-colors duration-200
              ${
                showFilters
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>

          {/* Create Task */}
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="
                inline-flex items-center px-4 py-2 text-sm font-semibold text-white
                bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs hover:shadow-sm
                focus:outline-none focus:ring-4 focus:ring-primary-100
                transition-all duration-200
              "
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All categories</option>
                <option value="venue_management">Venue Management</option>
                <option value="vendor_coordination">Vendor Coordination</option>
                <option value="photography">Photography</option>
                <option value="catering">Catering</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignee
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All assignees</option>
                <option value="me">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All deadlines</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="week">Due this week</option>
                <option value="month">Due this month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Task Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-max pb-6">
            {statusColumns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
                  {/* Column Header */}
                  <div
                    className={`px-4 py-3 border-b border-gray-200 ${column.color} rounded-t-xl`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {column.title}
                      </h3>
                      <span
                        className="
                        inline-flex items-center justify-center w-6 h-6 text-xs font-medium
                        text-gray-600 bg-white rounded-full
                      "
                      >
                        {tasksByStatus[column.id]?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Tasks */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          flex-1 p-4 space-y-3 min-h-[200px] transition-colors duration-200
                          ${snapshot.isDraggingOver ? 'bg-primary-50' : ''}
                        `}
                      >
                        {tasksByStatus[column.id]?.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                  transition-transform duration-200
                                  ${snapshot.isDragging ? 'rotate-3 shadow-lg' : ''}
                                `}
                              >
                                <TaskCard
                                  task={task}
                                  onClick={() => onTaskClick?.(task)}
                                  onStatusChange={(status) =>
                                    onTaskStatusChange?.(task.id, status)
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty State */}
                        {tasksByStatus[column.id]?.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No tasks</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
