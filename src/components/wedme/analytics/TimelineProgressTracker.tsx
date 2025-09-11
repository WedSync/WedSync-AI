'use client';

import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Circle } from 'lucide-react';

export default function TimelineProgressTracker() {
  const timelineItems = [
    {
      id: 1,
      task: 'Book venue',
      category: 'Venue',
      dueDate: '2024-03-15',
      status: 'completed',
      daysFromWedding: 365,
      priority: 'high',
    },
    {
      id: 2,
      task: 'Choose photographer',
      category: 'Photography',
      dueDate: '2024-04-01',
      status: 'completed',
      daysFromWedding: 348,
      priority: 'high',
    },
    {
      id: 3,
      task: 'Select catering menu',
      category: 'Catering',
      dueDate: '2024-06-15',
      status: 'in_progress',
      daysFromWedding: 273,
      priority: 'medium',
    },
    {
      id: 4,
      task: 'Send invitations',
      category: 'Stationery',
      dueDate: '2024-08-01',
      status: 'pending',
      daysFromWedding: 226,
      priority: 'high',
    },
    {
      id: 5,
      task: 'Book transportation',
      category: 'Transportation',
      dueDate: '2024-10-15',
      status: 'pending',
      daysFromWedding: 151,
      priority: 'low',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'in_progress':
        return <Clock className="text-blue-500" size={20} />;
      case 'overdue':
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const completedTasks = timelineItems.filter(
    (item) => item.status === 'completed',
  ).length;
  const totalTasks = timelineItems.length;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Timeline Progress
        </h3>
        <div className="text-sm text-gray-500">
          {completedTasks}/{totalTasks} completed
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm font-medium text-gray-900">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          You're {progressPercentage >= 50 ? 'on track' : 'behind schedule'} for
          your wedding planning
        </p>
      </div>

      {/* Timeline Items */}
      <div className="space-y-3">
        {timelineItems.map((item, index) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border transition-all hover:shadow-sm ${
              item.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : item.status === 'in_progress'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}

              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-medium ${
                      item.status === 'completed'
                        ? 'text-green-900 line-through'
                        : 'text-gray-900'
                    }`}
                  >
                    {item.task}
                  </h4>
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getPriorityColor(item.priority)}`}
                  >
                    {item.priority}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {item.category}
                  </span>
                  <span>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                  <span>{item.daysFromWedding} days from wedding</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
            Add New Task
          </button>
          <button className="bg-gray-50 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
            View Full Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
