'use client';

import React from 'react';
import { Users, UserCheck, UserX, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface GuestListSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function GuestListSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: GuestListSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock data
  const stats = {
    total: 150,
    confirmed: 98,
    pending: 35,
    declined: 17,
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Invited</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.confirmed}
          </div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pending}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {stats.declined}
          </div>
          <div className="text-sm text-gray-600">Declined</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => onInteraction?.('add_guest', {})}
        >
          Add Guest
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onInteraction?.('manage_rsvp', {})}
        >
          Manage RSVP
        </Button>
      </div>
    </div>
  );
}
