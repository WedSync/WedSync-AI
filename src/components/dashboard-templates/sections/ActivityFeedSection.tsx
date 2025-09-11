'use client';

import React from 'react';
import {
  Activity,
  Clock,
  User,
  CheckCircle,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface ActivityFeedSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function ActivityFeedSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: ActivityFeedSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock activity data
  const activities = [
    {
      id: '1',
      type: 'task_completed',
      title: 'Venue booking completed',
      description: 'Elegant Manor Hall has been successfully booked',
      timestamp: '2 hours ago',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: '2',
      type: 'message_received',
      title: 'New message from photographer',
      description: 'Sarah from Elegant Events Photography sent you a message',
      timestamp: '1 day ago',
      icon: MessageCircle,
      color: 'text-blue-600',
    },
    {
      id: '3',
      type: 'appointment_scheduled',
      title: 'Cake tasting scheduled',
      description: 'Appointment with Sweet Dreams Bakery on March 15th',
      timestamp: '2 days ago',
      icon: Calendar,
      color: 'text-purple-600',
    },
  ];

  const getActivityIcon = (activity: any) => {
    const IconComponent = activity.icon;
    return <IconComponent className={`h-4 w-4 ${activity.color}`} />;
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Activity className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="p-1.5 bg-white border-2 border-gray-200 rounded-full">
                {getActivityIcon(activity)}
              </div>
              {index < activities.length - 1 && (
                <div className="w-px h-8 bg-gray-200 mt-1" />
              )}
            </div>

            {/* Activity content */}
            <div className="flex-1 pb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-sm text-gray-900">
                    {activity.title}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {activity.timestamp}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onInteraction?.('view_all_activity', {})}
        >
          View All Activity
        </Button>
      </div>
    </div>
  );
}
