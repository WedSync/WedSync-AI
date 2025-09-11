'use client';

import React from 'react';
import { Camera, Plus, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface GallerySectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function GallerySection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: GallerySectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Mock gallery data
  const categories = [
    { name: 'Venues', count: 12, preview: '/api/placeholder/100/100' },
    { name: 'Flowers', count: 8, preview: '/api/placeholder/100/100' },
    { name: 'Catering', count: 15, preview: '/api/placeholder/100/100' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-100 rounded-lg">
          <Camera className="h-5 w-5 text-pink-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          <p className="text-sm text-gray-600">{section.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {categories.map((category) => (
          <div
            key={category.name}
            className="relative group cursor-pointer"
            onClick={() => onInteraction?.('view_category', { category })}
          >
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div className="mt-2 text-center">
              <p className="font-medium text-sm text-gray-900">
                {category.name}
              </p>
              <p className="text-xs text-gray-600">{category.count} photos</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => onInteraction?.('upload', {})}
      >
        Upload Photos
      </Button>
    </div>
  );
}
