'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { cn } from '@/lib/utils';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface TimelineSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: {
    wedding_date?: string;
    booking_stage?: string;
  };
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'completed' | 'in_progress' | 'pending' | 'overdue';
  milestone: boolean;
  category: 'planning' | 'booking' | 'final_prep' | 'day_of';
}

// Mock timeline data - in production this would come from the database
const mockTimelineItems: TimelineItem[] = [
  {
    id: '1',
    title: 'Book Wedding Venue',
    description: 'Secure your dream wedding location',
    due_date: '2025-02-15',
    status: 'completed',
    milestone: true,
    category: 'booking',
  },
  {
    id: '2',
    title: 'Choose Wedding Photographer',
    description: 'Find and book your wedding photographer',
    due_date: '2025-03-01',
    status: 'in_progress',
    milestone: true,
    category: 'booking',
  },
  {
    id: '3',
    title: 'Send Save the Dates',
    description: 'Mail save the date cards to all guests',
    due_date: '2025-03-15',
    status: 'pending',
    milestone: false,
    category: 'planning',
  },
  {
    id: '4',
    title: 'Book Catering Service',
    description: 'Finalize menu and catering arrangements',
    due_date: '2025-04-01',
    status: 'pending',
    milestone: true,
    category: 'booking',
  },
  {
    id: '5',
    title: 'Order Wedding Invitations',
    description: 'Design and order formal wedding invitations',
    due_date: '2025-04-15',
    status: 'pending',
    milestone: false,
    category: 'planning',
  },
  {
    id: '6',
    title: 'Final Menu Tasting',
    description: 'Attend final tasting session with caterer',
    due_date: '2025-07-15',
    status: 'pending',
    milestone: false,
    category: 'final_prep',
  },
];

export default function TimelineSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: TimelineSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');

  const config = { ...section.section_config, ...customConfig };
  const items = mockTimelineItems; // In production: fetch from API

  // Filter items based on selected category
  const filteredItems =
    selectedCategory === 'all'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  // Calculate progress
  const completedItems = items.filter(
    (item) => item.status === 'completed',
  ).length;
  const progressPercentage = Math.round((completedItems / items.length) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" size="sm">
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="primary" size="sm">
            In Progress
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" size="sm">
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" size="sm">
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays < 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const categoryFilters = [
    { key: 'all', label: 'All Tasks', count: items.length },
    {
      key: 'booking',
      label: 'Booking',
      count: items.filter((i) => i.category === 'booking').length,
    },
    {
      key: 'planning',
      label: 'Planning',
      count: items.filter((i) => i.category === 'planning').length,
    },
    {
      key: 'final_prep',
      label: 'Final Prep',
      count: items.filter((i) => i.category === 'final_prep').length,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Calendar className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.show_milestones !== false && (
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              {items.filter((i) => i.milestone).length} milestones
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {config.show_progress !== false && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm text-gray-600">
              {completedItems} of {items.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-xs text-gray-500">{progressPercentage}%</span>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoryFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setSelectedCategory(filter.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedCategory === filter.key
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {filter.label}
            <span className="ml-1 px-1.5 py-0.5 bg-white rounded text-xs">
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline Items */}
      <div className="space-y-3">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
              'hover:shadow-md cursor-pointer',
              item.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : item.status === 'overdue'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200',
            )}
            onClick={() => onInteraction?.('view_item', { item })}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4
                    className={cn(
                      'font-medium',
                      item.status === 'completed'
                        ? 'text-green-900 line-through'
                        : 'text-gray-900',
                    )}
                  >
                    {item.title}
                    {item.milestone && (
                      <span className="ml-2 text-yellow-500">⭐</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-500">
                      Due: {formatDate(item.due_date)}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            No timeline items found for this category.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onInteraction?.('add_item', {})}
        >
          Add Task
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onInteraction?.('view_full', { category: selectedCategory })
          }
        >
          View Full Timeline
        </Button>
      </div>
    </div>
  );
}
