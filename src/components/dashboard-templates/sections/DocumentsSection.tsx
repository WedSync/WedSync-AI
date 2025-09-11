'use client';

import React from 'react';
import { FileText, Download, Upload, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface DocumentsSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function DocumentsSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: DocumentsSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock documents
  const documents = [
    {
      id: '1',
      name: 'Venue Contract.pdf',
      type: 'contract',
      size: '2.4 MB',
      uploadedAt: '2025-01-15',
    },
    {
      id: '2',
      name: 'Photography Agreement.pdf',
      type: 'contract',
      size: '1.8 MB',
      uploadedAt: '2025-01-20',
    },
    {
      id: '3',
      name: 'Guest List Template.xlsx',
      type: 'template',
      size: '156 KB',
      uploadedAt: '2025-01-22',
    },
  ];

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer"
            onClick={() => onInteraction?.('view_document', { document: doc })}
          >
            {getDocumentIcon(doc.type)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {doc.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{doc.size}</span>
                <span>•</span>
                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download className="h-3 w-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onInteraction?.('download', { document: doc });
              }}
            ></Button>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        leftIcon={<Upload className="h-4 w-4" />}
        onClick={() => onInteraction?.('upload_document', {})}
      >
        Upload Document
      </Button>
    </div>
  );
}
