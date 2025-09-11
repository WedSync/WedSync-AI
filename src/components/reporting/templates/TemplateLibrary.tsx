'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Star,
  Download,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Share2,
  Tag,
  Calendar,
  User,
  Globe,
  Lock,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Camera,
  MapPin,
  Heart,
  Users,
  DollarSign,
  Clock,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from 'lucide-react';

import {
  ReportTemplate,
  TemplateCategory,
  WeddingVendorType,
  WEDDING_COLORS,
  formatDate,
} from '../types';

interface TemplateLibraryProps {
  templates: ReportTemplate[];
  userTemplates: ReportTemplate[];
  favoriteTemplates: string[];
  onCreateNew: () => void;
  onUseTemplate: (template: ReportTemplate) => void;
  onEditTemplate: (template: ReportTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDuplicateTemplate: (template: ReportTemplate) => void;
  onFavoriteToggle: (templateId: string) => void;
  onShareTemplate: (template: ReportTemplate) => void;
  currentUserVendorType?: WeddingVendorType;
  className?: string;
}

const TEMPLATE_CATEGORIES: Array<{
  id: TemplateCategory;
  name: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    id: 'overview',
    name: 'Business Overview',
    description: 'High-level business metrics and KPIs',
    icon: TrendingUp,
    color: '#3b82f6',
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    description: 'Revenue, bookings, and financial analysis',
    icon: DollarSign,
    color: '#10b981',
  },
  {
    id: 'client',
    name: 'Client Analytics',
    description: 'Client satisfaction and feedback analysis',
    icon: Heart,
    color: '#f59e0b',
  },
  {
    id: 'performance',
    name: 'Performance Tracking',
    description: 'Operational efficiency and performance metrics',
    icon: BarChart3,
    color: '#8b5cf6',
  },
  {
    id: 'seasonal',
    name: 'Seasonal Analysis',
    description: 'Wedding season trends and forecasting',
    icon: Calendar,
    color: '#ef4444',
  },
  {
    id: 'marketing',
    name: 'Marketing Analytics',
    description: 'Lead generation and conversion tracking',
    icon: Users,
    color: '#06b6d4',
  },
];

const VENDOR_TYPE_ICONS: Record<WeddingVendorType, any> = {
  photographer: Camera,
  venue: MapPin,
  caterer: Users,
  florist: Heart,
  dj: Users,
  planner: Calendar,
  baker: Users,
  videographer: Camera,
  officiant: Users,
  transport: MapPin,
  other: Star,
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name', icon: SortAsc },
  { value: 'created', label: 'Date Created', icon: Calendar },
  { value: 'updated', label: 'Last Updated', icon: Clock },
  { value: 'popularity', label: 'Popularity', icon: Star },
  { value: 'category', label: 'Category', icon: Tag },
];

const TemplateCard = ({
  template,
  isFavorited,
  isOwner,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onFavorite,
  onShare,
}: {
  template: ReportTemplate;
  isFavorited: boolean;
  isOwner: boolean;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onShare: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  const getCategoryInfo = () => {
    return TEMPLATE_CATEGORIES.find((c) => c.id === template.category);
  };

  const categoryInfo = getCategoryInfo();
  const CategoryIcon = categoryInfo?.icon || BarChart3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md text-white"
              style={{
                backgroundColor: categoryInfo?.color || WEDDING_COLORS.primary,
              }}
            >
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 leading-tight">
                {template.name}
              </h3>
              <p className="text-xs text-gray-500">{categoryInfo?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onFavorite}
              className={`p-1 rounded transition-colors ${
                isFavorited
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star
                className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`}
              />
            </button>

            {template.isPublic ? (
              <Globe
                className="h-4 w-4 text-blue-500"
                title="Public template"
              />
            ) : (
              <Lock
                className="h-4 w-4 text-gray-400"
                title="Private template"
              />
            )}
          </div>
        </div>

        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
        )}
      </div>

      {/* Template Preview */}
      <div className="p-4">
        <div className="bg-gray-50 rounded-md p-3 mb-3">
          <div className="space-y-2">
            {template.sections.slice(0, 3).map((section, idx) => (
              <div
                key={section.id}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
                <span>{section.title}</span>
                {section.type === 'chart' && section.chartType && (
                  <span className="bg-gray-200 px-1 py-0.5 rounded text-xs">
                    {section.chartType}
                  </span>
                )}
              </div>
            ))}
            {template.sections.length > 3 && (
              <div className="text-xs text-gray-400">
                +{template.sections.length - 3} more sections
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {template.author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{template.author}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(template.updatedAt)}</span>
            </div>
          </div>

          {template.usageCount && (
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{template.usageCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 bg-gray-50 border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={onUse}
                className="flex-1 bg-wedding-primary text-white px-3 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors text-sm font-medium"
              >
                Use Template
              </button>

              <button
                onClick={onDuplicate}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={onEdit}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={onDelete}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}

              <button
                onClick={onShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CategoryFilter = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: typeof TEMPLATE_CATEGORIES;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
          selectedCategory === null
            ? 'bg-wedding-primary text-white shadow-md'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All Categories
      </button>

      {categories.map((category) => {
        const IconComponent = category.icon;

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category.id
                ? 'text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{
              backgroundColor:
                selectedCategory === category.id ? category.color : undefined,
            }}
          >
            <IconComponent className="h-4 w-4" />
            {category.name}
          </button>
        );
      })}
    </div>
  );
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  userTemplates,
  favoriteTemplates = [],
  onCreateNew,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onFavoriteToggle,
  onShareTemplate,
  currentUserVendorType,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMyTemplates, setShowMyTemplates] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedTemplates = useMemo(() => {
    let allTemplates = showMyTemplates ? userTemplates : templates;

    // Apply filters
    let filtered = allTemplates.filter((template) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          template.name.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.tags?.some((tag) => tag.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory && template.category !== selectedCategory) {
        return false;
      }

      // Favorites filter
      if (showFavoritesOnly && !favoriteTemplates.includes(template.id)) {
        return false;
      }

      // Vendor type filter (show templates relevant to current vendor type)
      if (
        currentUserVendorType &&
        template.vendorTypes &&
        template.vendorTypes.length > 0
      ) {
        if (!template.vendorTypes.includes(currentUserVendorType)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'popularity':
          comparison = (b.usageCount || 0) - (a.usageCount || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [
    templates,
    userTemplates,
    searchQuery,
    selectedCategory,
    showMyTemplates,
    showFavoritesOnly,
    favoriteTemplates,
    currentUserVendorType,
    sortBy,
    sortOrder,
  ]);

  const handleToggleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    },
    [sortBy],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Templates</h2>
          <p className="text-gray-600">
            Choose from pre-built templates or create your own
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="myTemplates"
                checked={showMyTemplates}
                onChange={(e) => setShowMyTemplates(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="myTemplates" className="text-sm text-gray-700">
                My Templates Only
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="favorites"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="favorites" className="text-sm text-gray-700">
                Favorites Only
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
              }
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </button>

            <div className="border-l border-gray-300 pl-2 ml-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <CategoryFilter
          categories={TEMPLATE_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredAndSortedTemplates.length} template
          {filteredAndSortedTemplates.length !== 1 ? 's' : ''}
          {selectedCategory && (
            <>
              {' '}
              in{' '}
              {TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
            </>
          )}
        </span>

        {favoriteTemplates.length > 0 && (
          <span>{favoriteTemplates.length} favorited</span>
        )}
      </div>

      {/* Template Grid/List */}
      <AnimatePresence mode="wait">
        {filteredAndSortedTemplates.length > 0 ? (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredAndSortedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorited={favoriteTemplates.includes(template.id)}
                isOwner={userTemplates.some((ut) => ut.id === template.id)}
                onUse={() => onUseTemplate(template)}
                onEdit={() => onEditTemplate(template)}
                onDelete={() => onDeleteTemplate(template.id)}
                onDuplicate={() => onDuplicateTemplate(template)}
                onFavorite={() => onFavoriteToggle(template.id)}
                onShare={() => onShareTemplate(template)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filter criteria.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setShowFavoritesOnly(false);
                }}
                className="text-wedding-primary hover:text-wedding-primary/80 font-medium"
              >
                Clear filters
              </button>
              <span className="text-gray-400">or</span>
              <button
                onClick={onCreateNew}
                className="text-wedding-primary hover:text-wedding-primary/80 font-medium"
              >
                create a new template
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateLibrary;
