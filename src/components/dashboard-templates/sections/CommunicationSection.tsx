'use client';

import React from 'react';
import { MessageCircle, Mail, Phone, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface CommunicationSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function CommunicationSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: CommunicationSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock messages
  const recentMessages = [
    {
      id: '1',
      from: 'Wedding Planner',
      subject: 'Venue confirmation needed',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '2',
      from: 'Photographer',
      subject: 'Pre-wedding shoot options',
      time: '1 day ago',
      unread: false,
    },
  ];

  const unreadCount = recentMessages.filter((m) => m.unread).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <MessageCircle className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Badge variant="primary">{unreadCount} unread</Badge>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {recentMessages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
              message.unread
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200'
            }`}
            onClick={() => onInteraction?.('view_message', { message })}
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className={`font-medium text-sm ${
                  message.unread ? 'text-blue-900' : 'text-gray-900'
                }`}
              >
                {message.from}
              </span>
              <span className="text-xs text-gray-500">{message.time}</span>
            </div>
            <p
              className={`text-sm ${
                message.unread ? 'text-blue-800' : 'text-gray-600'
              }`}
            >
              {message.subject}
            </p>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        leftIcon={<Send className="h-4 w-4" />}
        onClick={() => onInteraction?.('compose', {})}
      >
        Send Message
      </Button>
    </div>
  );
}
