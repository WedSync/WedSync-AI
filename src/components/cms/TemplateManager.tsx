'use client';

import React, { useState } from 'react';
import {
  Template,
  Plus,
  Search,
  Filter,
  Copy,
  Edit3,
  Trash2,
  Star,
  Heart,
  Calendar,
  Users,
  Camera,
  Gift,
  MapPin,
  Crown,
  Sparkles,
} from 'lucide-react';
import { ContentTemplate, ContentType } from '@/types/cms';
import { cn } from '@/lib/utils';

// Template Manager Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Manages reusable content templates for common wedding scenarios

interface TemplateCardProps {
  template: ContentTemplate;
  onUse: (template: ContentTemplate) => void;
  onEdit: (template: ContentTemplate) => void;
  onDelete: (id: string) => void;
  onDuplicate: (template: ContentTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTemplateIcon = (type: ContentType) => {
    switch (type) {
      case 'welcome_message':
        return <Heart className="h-5 w-5 text-pink-500" />;
      case 'service_description':
        return <Crown className="h-5 w-5 text-purple-500" />;
      case 'timeline_template':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'communication_template':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'gallery_description':
        return <Camera className="h-5 w-5 text-yellow-500" />;
      default:
        return <Template className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      welcome: 'bg-pink-100 text-pink-800',
      services: 'bg-purple-100 text-purple-800',
      timeline: 'bg-blue-100 text-blue-800',
      communication: 'bg-green-100 text-green-800',
      gallery: 'bg-yellow-100 text-yellow-800',
      general: 'bg-gray-100 text-gray-800',
    };

    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200',
        isHovered && 'shadow-md border-primary-300',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getTemplateIcon(template.type)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {template.name}
            </h3>
            <span
              className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getCategoryBadge(template.category),
              )}
            >
              {template.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {template.is_system_template && (
            <div className="p-1 bg-blue-100 rounded-lg" title="System Template">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
          )}
          <div className="text-sm text-gray-500">
            {template.usage_count} uses
          </div>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {template.description}
        </p>
      )}

      {/* Preview Image */}
      {template.preview_image && (
        <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
          <img
            src={template.preview_image}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Created {new Date(template.created_at).toLocaleDateString()}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-200',
            isHovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            onClick={() => onUse(template)}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Use Template
          </button>
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDuplicate(template)}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          {!template.is_system_template && (
            <button
              onClick={() => onDelete(template.id)}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface TemplateManagerProps {
  templates?: ContentTemplate[];
  onUseTemplate?: (template: ContentTemplate) => void;
  onEditTemplate?: (template: ContentTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  onDuplicateTemplate?: (template: ContentTemplate) => void;
  onCreateTemplate?: () => void;
  className?: string;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates = [],
  onUseTemplate = () => {},
  onEditTemplate = () => {},
  onDeleteTemplate = () => {},
  onDuplicateTemplate = () => {},
  onCreateTemplate = () => {},
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showSystemTemplates, setShowSystemTemplates] = useState(true);

  // Mock templates for demonstration
  const mockTemplates: ContentTemplate[] =
    templates.length > 0
      ? templates
      : [
          {
            id: '1',
            organization_id: 'org1',
            name: 'Spring Wedding Welcome',
            description:
              'Warm welcome message template perfect for spring weddings with seasonal references and romantic imagery.',
            type: 'welcome_message',
            template_data: {
              content:
                'Welcome to our magical spring wedding experience! As the flowers bloom and love fills the air...',
            },
            preview_image:
              'https://images.unsplash.com/photo-1469371670807-013ccf25f16a',
            category: 'welcome',
            is_system_template: true,
            usage_count: 45,
            created_by: 'system',
            created_at: '2025-01-20T00:00:00Z',
            updated_at: '2025-01-20T00:00:00Z',
          },
          {
            id: '2',
            organization_id: 'org1',
            name: 'Photography Package Showcase',
            description:
              'Comprehensive template for showcasing wedding photography packages with pricing and inclusions.',
            type: 'service_description',
            template_data: {
              content:
                'Our wedding photography packages are designed to capture every precious moment...',
            },
            category: 'services',
            is_system_template: false,
            usage_count: 23,
            created_by: 'user1',
            created_at: '2025-01-25T00:00:00Z',
            updated_at: '2025-01-28T00:00:00Z',
          },
          {
            id: '3',
            organization_id: 'org1',
            name: 'Wedding Day Timeline',
            description:
              'Professional timeline template for coordinating all wedding day activities and vendor schedules.',
            type: 'timeline_template',
            template_data: {
              timeline: [
                { time: '9:00 AM', activity: 'Bridal preparation begins' },
                { time: '2:00 PM', activity: 'First look photos' },
                { time: '4:00 PM', activity: 'Ceremony starts' },
              ],
            },
            category: 'timeline',
            is_system_template: true,
            usage_count: 67,
            created_by: 'system',
            created_at: '2025-01-15T00:00:00Z',
            updated_at: '2025-01-15T00:00:00Z',
          },
          {
            id: '4',
            organization_id: 'org1',
            name: 'Client Check-in Template',
            description:
              'Template for regular client communication and check-ins throughout the wedding planning process.',
            type: 'communication_template',
            template_data: {
              content:
                'Hi [CLIENT_NAME], I hope your wedding planning is going smoothly! I wanted to check in...',
            },
            category: 'communication',
            is_system_template: false,
            usage_count: 34,
            created_by: 'user1',
            created_at: '2025-01-22T00:00:00Z',
            updated_at: '2025-01-29T00:00:00Z',
          },
        ];

  const categories = Array.from(new Set(mockTemplates.map((t) => t.category)));

  const filteredTemplates = mockTemplates.filter((template) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(query);
      const matchesDescription = template.description
        ?.toLowerCase()
        .includes(query);
      if (!matchesName && !matchesDescription) return false;
    }

    // Filter by category
    if (categoryFilter !== 'all' && template.category !== categoryFilter) {
      return false;
    }

    // Filter system templates
    if (!showSystemTemplates && template.is_system_template) {
      return false;
    }

    return true;
  });

  return (
    <div className={cn('bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Template Manager
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage reusable content templates for your wedding
              business
            </p>
          </div>
          <button
            onClick={onCreateTemplate}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {mockTemplates.length}
            </div>
            <div className="text-sm text-gray-600">Total Templates</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {mockTemplates.filter((t) => !t.is_system_template).length}
            </div>
            <div className="text-sm text-gray-600">Custom Templates</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {mockTemplates.reduce((sum, t) => sum + t.usage_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Uses</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {categories.length}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showSystemTemplates}
              onChange={(e) => setShowSystemTemplates(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-100"
            />
            Show System Templates
          </label>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Template className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first template to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={onUseTemplate}
                onEdit={onEditTemplate}
                onDelete={onDeleteTemplate}
                onDuplicate={onDuplicateTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
