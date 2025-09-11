'use client';

import React from 'react';
import { FileText, Plus, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface NotesSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function NotesSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: NotesSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock notes
  const notes = [
    {
      id: '1',
      title: 'Venue Requirements',
      preview: 'Need to confirm catering setup...',
      updatedAt: '2025-01-22',
    },
    {
      id: '2',
      title: 'Photography Shot List',
      preview: 'Must-have shots for the ceremony...',
      updatedAt: '2025-01-21',
    },
    {
      id: '3',
      title: 'Guest Dietary Restrictions',
      preview: 'John - vegan, Sarah - gluten free...',
      updatedAt: '2025-01-20',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <FileText className="h-5 w-5 text-yellow-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer"
            onClick={() => onInteraction?.('view_note', { note })}
          >
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-medium text-sm text-gray-900">
                {note.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Edit3 className="h-3 w-3" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onInteraction?.('edit_note', { note });
                }}
              ></Button>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{note.preview}</p>
            <p className="text-xs text-gray-500 mt-2">
              Updated {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => onInteraction?.('add_note', {})}
      >
        Add Note
      </Button>
    </div>
  );
}
