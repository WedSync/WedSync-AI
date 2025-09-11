'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Search,
  Star,
  Users,
  Clock,
  Tag,
  X,
  Edit3,
  Play,
  Filter,
  ChevronDown,
  TrendingUp,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  TaskTemplate,
  TaskTemplateItem,
  TaskTemplateLibraryProps,
  TaskCategory,
  TaskPriority,
} from '@/types/workflow';
import { sanitizeHtml } from '@/lib/security/input-validation';

// Template category colors for visual organization
const categoryColors: Record<TaskCategory, string> = {
  venue_management: 'bg-green-100 text-green-800 border-green-200',
  vendor_coordination: 'bg-blue-100 text-blue-800 border-blue-200',
  client_management: 'bg-purple-100 text-purple-800 border-purple-200',
  logistics: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  design: 'bg-pink-100 text-pink-800 border-pink-200',
  photography: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  catering: 'bg-orange-100 text-orange-800 border-orange-200',
  florals: 'bg-rose-100 text-rose-800 border-rose-200',
  music: 'bg-violet-100 text-violet-800 border-violet-200',
  transportation: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const categories = [
  { value: 'venue_management', label: 'Venue Management' },
  { value: 'vendor_coordination', label: 'Vendor Coordination' },
  { value: 'client_management', label: 'Client Management' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'design', label: 'Design' },
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' },
  { value: 'florals', label: 'Florals' },
  { value: 'music', label: 'Music' },
  { value: 'transportation', label: 'Transportation' },
];

export const TaskTemplateLibrary = React.memo<TaskTemplateLibraryProps>(
  ({
    templates,
    selectedCategory,
    onTemplateSelect,
    onTemplateCustomize,
    onClose,
    isVisible,
  }) => {
    // Component state
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<TaskCategory | null>(
      selectedCategory || null,
    );
    const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'tasks'>(
      'popularity',
    );
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
    const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
    const [customizingTemplate, setCustomizingTemplate] =
      useState<TaskTemplate | null>(null);
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

    // Refs for accessibility
    const modalRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Focus management for modal accessibility
    useEffect(() => {
      if (isVisible) {
        previousFocusRef.current = document.activeElement as HTMLElement;
        modalRef.current?.focus();
      } else {
        previousFocusRef.current?.focus();
      }
    }, [isVisible]);

    // Filter and sort templates
    const filteredAndSortedTemplates = useMemo(() => {
      let filtered = templates.filter((template) => {
        // Security: Validate template structure before processing
        if (!template.id || !template.name || !template.category) {
          return false;
        }

        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchLower));

        // Category filter
        const matchesCategory =
          !categoryFilter || template.category === categoryFilter;

        // Featured filter
        const matchesFeatured = !showFeaturedOnly || template.is_featured;

        return matchesSearch && matchesCategory && matchesFeatured;
      });

      // Sort templates
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'popularity':
            return b.popularity - a.popularity;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'tasks':
            return b.tasks.length - a.tasks.length;
          default:
            return 0;
        }
      });

      return filtered;
    }, [templates, searchQuery, categoryFilter, showFeaturedOnly, sortBy]);

    // Template validation with security sanitization
    const validateTemplate = useCallback((template: TaskTemplate): boolean => {
      if (!template.name?.trim() || !template.category) {
        return false;
      }

      // Validate all tasks in template
      return template.tasks.every(
        (task) =>
          task.title?.trim() && task.category && task.estimated_duration > 0,
      );
    }, []);

    // Handle template selection with security validation
    const handleTemplateSelect = useCallback(
      async (template: TaskTemplate) => {
        if (!validateTemplate(template)) {
          // Show validation error
          const announcement = document.createElement('div');
          announcement.setAttribute('role', 'alert');
          announcement.setAttribute('aria-live', 'assertive');
          announcement.textContent =
            'Template contains invalid tasks and cannot be used.';
          announcement.className = 'sr-only';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 3000);
          return;
        }

        setIsLoading((prev) => ({ ...prev, [template.id]: true }));

        try {
          // Sanitize template data before selection
          const sanitizedTemplate: TaskTemplate = {
            ...template,
            name: sanitizeHtml(template.name),
            description: sanitizeHtml(template.description),
            tasks: template.tasks.map((task) => ({
              ...task,
              title: sanitizeHtml(task.title),
              description: sanitizeHtml(task.description),
            })),
          };

          await onTemplateSelect(sanitizedTemplate);

          // Announce selection to screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('role', 'status');
          announcement.setAttribute('aria-live', 'polite');
          announcement.textContent = `${template.name} template selected successfully.`;
          announcement.className = 'sr-only';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 3000);
        } catch (error) {
          console.error('Template selection failed:', error);
        } finally {
          setIsLoading((prev) => ({ ...prev, [template.id]: false }));
        }
      },
      [validateTemplate, onTemplateSelect],
    );

    // Handle template customization
    const handleTemplateCustomize = useCallback((template: TaskTemplate) => {
      setCustomizingTemplate(template);
    }, []);

    // Template customization state
    const [customTasks, setCustomTasks] = useState<TaskTemplateItem[]>([]);

    useEffect(() => {
      if (customizingTemplate) {
        setCustomTasks([...customizingTemplate.tasks]);
      }
    }, [customizingTemplate]);

    const updateCustomTask = useCallback(
      (index: number, field: keyof TaskTemplateItem, value: any) => {
        setCustomTasks((prev) =>
          prev.map((task, i) =>
            i === index ? { ...task, [field]: value } : task,
          ),
        );
      },
      [],
    );

    const addCustomTask = useCallback(() => {
      const newTask: TaskTemplateItem = {
        title: '',
        description: '',
        category: customizingTemplate?.category || 'logistics',
        priority: 'medium',
        estimated_duration: 1,
        buffer_time: 0,
        order: customTasks.length,
        is_required: true,
      };
      setCustomTasks((prev) => [...prev, newTask]);
    }, [customizingTemplate, customTasks.length]);

    const removeCustomTask = useCallback((index: number) => {
      setCustomTasks((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const applyCustomizations = useCallback(() => {
      if (!customizingTemplate) return;

      const customizedTemplate: TaskTemplate = {
        ...customizingTemplate,
        tasks: customTasks,
      };

      onTemplateCustomize(customizedTemplate);
      setCustomizingTemplate(null);
      setCustomTasks([]);
    }, [customizingTemplate, customTasks, onTemplateCustomize]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, template: TaskTemplate) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTemplateSelect(template);
        }
      },
      [handleTemplateSelect],
    );

    if (!isVisible) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={modalRef}
          className="
          bg-white rounded-2xl max-w-6xl w-full mx-4 my-4 shadow-xl
          overflow-hidden max-h-[90vh] flex flex-col
        "
          role="dialog"
          aria-labelledby="template-library-title"
          aria-describedby="template-library-description"
          tabIndex={-1}
          data-testid="template-library-modal"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="template-library-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Task Template Library
                </h2>
                <p
                  id="template-library-description"
                  className="text-sm text-gray-600 mt-1"
                >
                  Choose from pre-built wedding task templates to speed up
                  planning
                </p>
              </div>
              <button
                onClick={onClose}
                className="
                p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                rounded-lg transition-colors duration-200
                focus:outline-none focus:ring-4 focus:ring-gray-100
              "
                aria-label="Close template library"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search templates, descriptions, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                  w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-gray-900 placeholder-gray-500 shadow-xs
                  focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                  transition-all duration-200
                "
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={categoryFilter || ''}
                  onChange={(e) =>
                    setCategoryFilter((e.target.value as TaskCategory) || null)
                  }
                  className="
                  px-4 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100
                  focus:border-primary-300 transition-all duration-200
                "
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort and Featured Toggle */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'popularity' | 'name' | 'tasks')
                  }
                  className="
                  px-3 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-4 
                  focus:ring-primary-100 focus:border-primary-300 transition-all duration-200
                "
                >
                  <option value="popularity">Most Popular</option>
                  <option value="name">Name A-Z</option>
                  <option value="tasks">Most Tasks</option>
                </select>

                <button
                  onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                  className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  focus:outline-none focus:ring-4 focus:ring-primary-100
                  ${
                    showFeaturedOnly
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }
                `}
                >
                  <Star className="w-4 h-4 inline mr-1" />
                  Featured
                </button>
              </div>
            </div>
          </div>

          {/* Template Customization Modal */}
          {customizingTemplate && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customize Template: {customizingTemplate.name}
                  </h3>
                  <button
                    onClick={() => setCustomizingTemplate(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {customTasks.map((task, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Task {index + 1}
                        </h4>
                        <button
                          onClick={() => removeCustomTask(index)}
                          className="text-error-600 hover:text-error-700 p-1"
                          aria-label="Remove task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Task title"
                          value={task.title}
                          onChange={(e) =>
                            updateCustomTask(index, 'title', e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Duration (hours)"
                          value={task.estimated_duration}
                          onChange={(e) =>
                            updateCustomTask(
                              index,
                              'estimated_duration',
                              parseFloat(e.target.value),
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          min="0.25"
                          step="0.25"
                        />
                      </div>

                      <textarea
                        placeholder="Task description"
                        value={task.description}
                        onChange={(e) =>
                          updateCustomTask(index, 'description', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-3"
                        rows={2}
                      />
                    </div>
                  ))}

                  <button
                    onClick={addCustomTask}
                    className="
                    w-full py-3 border-2 border-dashed border-gray-300 rounded-lg
                    text-gray-600 hover:text-gray-700 hover:border-gray-400
                    transition-colors duration-200 flex items-center justify-center
                  "
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Task
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setCustomizingTemplate(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCustomizations}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  Apply Customizations
                </button>
              </div>
            </div>
          )}

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredAndSortedTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {templates.length === 0
                    ? 'No templates available'
                    : 'No templates found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {templates.length === 0
                    ? 'Create your own tasks from scratch to get started.'
                    : 'Try different keywords or clear your filters to see more templates.'}
                </p>
                {searchQuery ||
                  (categoryFilter && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter(null);
                        setShowFeaturedOnly(false);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear all filters
                    </button>
                  ))}
              </div>
            ) : (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-testid="template-grid"
              >
                {filteredAndSortedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="
                    group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary-200
                    transition-all duration-200 bg-white cursor-pointer focus:outline-none
                    focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                  "
                    role="button"
                    tabIndex={0}
                    data-testid={`template-card-${template.id}`}
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    onKeyDown={(e) => handleKeyDown(e, template)}
                  >
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                            {sanitizeHtml(template.name)}
                          </h3>
                          {template.is_featured && (
                            <Star className="w-4 h-4 text-warning-500 fill-current" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`
                          px-2 py-1 text-xs font-medium rounded-full border
                          ${categoryColors[template.category]}
                        `}
                          >
                            {
                              categories.find(
                                (cat) => cat.value === template.category,
                              )?.label
                            }
                          </span>
                          <div className="flex items-center text-xs text-gray-500">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {template.popularity}% popularity
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Template Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {sanitizeHtml(template.description)}
                    </p>

                    {/* Template Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {template.tasks.length} tasks
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {template.tasks.reduce(
                          (total, task) => total + task.estimated_duration,
                          0,
                        )}
                        h total
                      </div>
                    </div>

                    {/* Tags */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full"
                          >
                            {sanitizeHtml(tag)}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Task Preview (on hover) */}
                    {hoveredTemplate === template.id && (
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">
                          Tasks Preview:
                        </h4>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {template.tasks.slice(0, 4).map((task, index) => (
                            <div
                              key={index}
                              className="text-xs text-gray-600 flex items-center"
                            >
                              <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                              <span className="truncate">
                                {sanitizeHtml(task.title)}
                              </span>
                              <span className="ml-auto text-gray-400">
                                {task.estimated_duration}h
                              </span>
                            </div>
                          ))}
                          {template.tasks.length > 4 && (
                            <div className="text-xs text-gray-400 text-center">
                              +{template.tasks.length - 4} more tasks
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template);
                        }}
                        disabled={isLoading[template.id]}
                        className="
                        flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 
                        hover:bg-primary-700 rounded-lg transition-colors duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-4 focus:ring-primary-100
                      "
                      >
                        {isLoading[template.id] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1.5 inline" />
                            Use Template
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateCustomize(template);
                        }}
                        className="
                        px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50
                        hover:bg-primary-100 border border-primary-200 rounded-lg
                        transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100
                      "
                        aria-label={`Customize ${template.name} template`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show validation errors for invalid templates */}
            {templates.some((template) => !validateTemplate(template)) && (
              <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm text-warning-700">
                  Some templates could not be loaded due to invalid data and
                  have been filtered out.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

TaskTemplateLibrary.displayName = 'TaskTemplateLibrary';
