'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Copy, Heart, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'forms' | 'journeys' | 'workflows' | 'communications';
  preview?: string;
  fields?: any[];
  steps?: any[];
  createdAt: string;
  usageCount: number;
  featured: boolean;
}

interface TemplateGalleryProps {
  templates?: Template[];
  onSelect?: (template: Template) => void;
  onPreview?: (template: Template) => void;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  columns?: 2 | 3 | 4;
}

// Mock templates data from Session B
const mockTemplates: Template[] = [
  {
    id: 'wedding-intake',
    name: 'Wedding Client Intake',
    description:
      'Complete intake form for new wedding clients with all essential details',
    category: 'forms',
    usageCount: 127,
    featured: true,
    createdAt: '2025-01-15',
    fields: [
      { type: 'text', label: 'Couple Names', required: true },
      { type: 'date', label: 'Wedding Date', required: true },
      { type: 'text', label: 'Venue', required: true },
      { type: 'number', label: 'Guest Count', required: false },
      { type: 'textarea', label: 'Special Requirements', required: false },
    ],
  },
  {
    id: 'vendor-onboarding',
    name: 'Vendor Onboarding',
    description: 'Streamlined onboarding process for new wedding vendors',
    category: 'forms',
    usageCount: 89,
    featured: true,
    createdAt: '2025-01-12',
    fields: [
      { type: 'text', label: 'Business Name', required: true },
      { type: 'email', label: 'Business Email', required: true },
      {
        type: 'select',
        label: 'Service Category',
        required: true,
        options: ['Photography', 'Catering', 'Venues', 'Music'],
      },
      { type: 'file', label: 'Portfolio Samples', required: false },
    ],
  },
  {
    id: 'pre-wedding-checklist',
    name: 'Pre-Wedding Checklist',
    description: '30-day pre-wedding preparation checklist and timeline',
    category: 'workflows',
    usageCount: 156,
    featured: true,
    createdAt: '2025-01-10',
    steps: [
      { name: 'Venue Final Walkthrough', days: 30 },
      { name: 'Menu Tasting', days: 21 },
      { name: 'Final Guest Count', days: 14 },
      { name: 'Day-of Timeline', days: 7 },
    ],
  },
  {
    id: 'post-wedding-followup',
    name: 'Post-Wedding Follow-up',
    description: 'Automated follow-up sequence after wedding completion',
    category: 'communications',
    usageCount: 203,
    featured: false,
    createdAt: '2025-01-08',
    steps: [
      { type: 'email', delay: 1, template: 'Thank you message' },
      { type: 'sms', delay: 7, template: 'Photo delivery notification' },
      { type: 'email', delay: 30, template: 'Review request' },
    ],
  },
  {
    id: 'emergency-contacts',
    name: 'Emergency Contact Form',
    description: 'Essential emergency contacts and information for wedding day',
    category: 'forms',
    usageCount: 78,
    featured: false,
    createdAt: '2025-01-05',
    fields: [
      { type: 'text', label: 'Primary Contact Name', required: true },
      { type: 'phone', label: 'Primary Contact Phone', required: true },
      { type: 'text', label: 'Backup Contact Name', required: true },
      { type: 'phone', label: 'Backup Contact Phone', required: true },
      { type: 'textarea', label: 'Special Instructions', required: false },
    ],
  },
];

const categoryColors = {
  forms: 'bg-blue-100 text-blue-800',
  journeys: 'bg-green-100 text-green-800',
  workflows: 'bg-purple-100 text-purple-800',
  communications: 'bg-orange-100 text-orange-800',
};

export function TemplateGallery({
  templates = mockTemplates,
  onSelect,
  onPreview,
  className,
  showSearch = true,
  showFilters = true,
  columns = 3,
}: TemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
  };

  const handleSelect = (template: Template) => {
    onSelect?.(template);
  };

  const handlePreview = (template: Template) => {
    onPreview?.(template);
  };

  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {showFilters && (
            <div className="flex gap-2">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="forms">Forms</SelectItem>
                  <SelectItem value="journeys">Journeys</SelectItem>
                  <SelectItem value="workflows">Workflows</SelectItem>
                  <SelectItem value="communications">Communications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {filteredTemplates.length}{' '}
        {filteredTemplates.length === 1 ? 'template' : 'templates'} found
      </div>

      {/* Template Grid */}
      <div className={cn('grid gap-6', gridCols[columns])}>
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                      {template.name}
                    </CardTitle>
                    {template.featured && (
                      <Badge variant="secondary" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs mb-2',
                      categoryColors[template.category],
                    )}
                  >
                    {template.category}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(template.id);
                  }}
                  className={cn(
                    'h-8 w-8 p-0',
                    favorites.has(template.id)
                      ? 'text-red-500'
                      : 'text-gray-400',
                  )}
                >
                  <Heart
                    className={cn(
                      'h-4 w-4',
                      favorites.has(template.id) && 'fill-current',
                    )}
                  />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                <span>{template.usageCount} uses</span>
                <span>
                  Updated {new Date(template.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(template);
                  }}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>

                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(template);
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters to find what you're
            looking for.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
