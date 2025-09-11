'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  CheckIcon,
  XMarkIcon,
  SwatchIcon,
  ChartBarIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

// TypeScript interfaces
interface FAQCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  count: number;
  isActive: boolean;
  sortOrder: number;
  autoCategorizationRules: string[];
  createdAt: string;
  updatedAt?: string;
}

interface AutoCategorizationRule {
  id: string;
  categoryId: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
}

interface CategoryTemplate {
  id: string;
  name: string;
  description: string;
  categories: Omit<FAQCategory, 'id' | 'count' | 'createdAt' | 'updatedAt'>[];
}

interface FAQCategoryManagerProps {
  categories: FAQCategory[];
  templates?: CategoryTemplate[];
  onCategoryCreate: (
    category: Omit<FAQCategory, 'id' | 'count' | 'createdAt' | 'updatedAt'>,
  ) => void;
  onCategoryUpdate: (categoryId: string, updates: Partial<FAQCategory>) => void;
  onCategoryDelete: (categoryId: string) => void;
  onCategoryReorder: (categories: FAQCategory[]) => void;
  onRulesUpdate: (rules: AutoCategorizationRule[]) => void;
  autoCategorizationRules?: AutoCategorizationRule[];
  isLoading?: boolean;
}

// Predefined colors for categories
const CATEGORY_COLORS = [
  {
    name: 'Blue',
    value: 'bg-blue-100 text-blue-800 border-blue-200',
    preview: 'bg-blue-500',
  },
  {
    name: 'Green',
    value: 'bg-green-100 text-green-800 border-green-200',
    preview: 'bg-green-500',
  },
  {
    name: 'Purple',
    value: 'bg-purple-100 text-purple-800 border-purple-200',
    preview: 'bg-purple-500',
  },
  {
    name: 'Amber',
    value: 'bg-amber-100 text-amber-800 border-amber-200',
    preview: 'bg-amber-500',
  },
  {
    name: 'Pink',
    value: 'bg-pink-100 text-pink-800 border-pink-200',
    preview: 'bg-pink-500',
  },
  {
    name: 'Indigo',
    value: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    preview: 'bg-indigo-500',
  },
  {
    name: 'Gray',
    value: 'bg-gray-100 text-gray-800 border-gray-200',
    preview: 'bg-gray-500',
  },
  {
    name: 'Red',
    value: 'bg-red-100 text-red-800 border-red-200',
    preview: 'bg-red-500',
  },
];

// Wedding industry category templates
const WEDDING_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'photographer',
    name: 'Wedding Photographer',
    description: 'Common categories for wedding photography businesses',
    categories: [
      {
        name: 'Pricing & Packages',
        description: 'Package details and pricing information',
        color: CATEGORY_COLORS[1].value,
        icon: 'currency',
        isActive: true,
        sortOrder: 1,
        autoCategorizationRules: [
          'price',
          'cost',
          'package',
          'investment',
          'rate',
        ],
      },
      {
        name: 'Services Offered',
        description: 'Photography services and coverage',
        color: CATEGORY_COLORS[0].value,
        icon: 'camera',
        isActive: true,
        sortOrder: 2,
        autoCategorizationRules: [
          'service',
          'coverage',
          'engagement',
          'wedding day',
          'portrait',
        ],
      },
      {
        name: 'Booking & Timeline',
        description: 'Booking process and wedding timeline',
        color: CATEGORY_COLORS[2].value,
        icon: 'calendar',
        isActive: true,
        sortOrder: 3,
        autoCategorizationRules: [
          'booking',
          'timeline',
          'schedule',
          'when',
          'date',
        ],
      },
      {
        name: 'Delivery & Gallery',
        description: 'Photo delivery and gallery access',
        color: CATEGORY_COLORS[3].value,
        icon: 'photo',
        isActive: true,
        sortOrder: 4,
        autoCategorizationRules: [
          'gallery',
          'photos',
          'delivery',
          'when will',
          'how long',
        ],
      },
      {
        name: 'Travel & Location',
        description: 'Travel fees and location coverage',
        color: CATEGORY_COLORS[4].value,
        icon: 'location',
        isActive: true,
        sortOrder: 5,
        autoCategorizationRules: [
          'travel',
          'location',
          'destination',
          'distance',
          'venue',
        ],
      },
      {
        name: 'Equipment & Style',
        description: 'Photography equipment and style questions',
        color: CATEGORY_COLORS[5].value,
        icon: 'settings',
        isActive: true,
        sortOrder: 6,
        autoCategorizationRules: [
          'equipment',
          'style',
          'camera',
          'editing',
          'approach',
        ],
      },
    ],
  },
  {
    id: 'venue',
    name: 'Wedding Venue',
    description: 'Essential categories for wedding venue businesses',
    categories: [
      {
        name: 'Capacity & Layout',
        description: 'Guest capacity and venue layout',
        color: CATEGORY_COLORS[0].value,
        icon: 'users',
        isActive: true,
        sortOrder: 1,
        autoCategorizationRules: [
          'capacity',
          'guests',
          'how many',
          'layout',
          'space',
        ],
      },
      {
        name: 'Pricing & Packages',
        description: 'Venue pricing and package options',
        color: CATEGORY_COLORS[1].value,
        icon: 'currency',
        isActive: true,
        sortOrder: 2,
        autoCategorizationRules: ['price', 'cost', 'package', 'rate', 'fee'],
      },
      {
        name: 'Catering & Bar',
        description: 'Food and beverage services',
        color: CATEGORY_COLORS[2].value,
        icon: 'dining',
        isActive: true,
        sortOrder: 3,
        autoCategorizationRules: ['catering', 'food', 'bar', 'drinks', 'menu'],
      },
      {
        name: 'Setup & Decor',
        description: 'Venue setup and decoration policies',
        color: CATEGORY_COLORS[3].value,
        icon: 'decoration',
        isActive: true,
        sortOrder: 4,
        autoCategorizationRules: [
          'setup',
          'decor',
          'decoration',
          'flowers',
          'lighting',
        ],
      },
      {
        name: 'Policies & Rules',
        description: 'Venue policies and restrictions',
        color: CATEGORY_COLORS[6].value,
        icon: 'document',
        isActive: true,
        sortOrder: 5,
        autoCategorizationRules: [
          'policy',
          'rules',
          'restriction',
          'allowed',
          'prohibited',
        ],
      },
      {
        name: 'Weather & Backup',
        description: 'Weather contingency and backup plans',
        color: CATEGORY_COLORS[7].value,
        icon: 'weather',
        isActive: true,
        sortOrder: 6,
        autoCategorizationRules: [
          'weather',
          'rain',
          'backup',
          'indoor',
          'outdoor',
        ],
      },
    ],
  },
  {
    id: 'planner',
    name: 'Wedding Planner',
    description: 'Categories for wedding planning services',
    categories: [
      {
        name: 'Planning Services',
        description: 'Types of planning services offered',
        color: CATEGORY_COLORS[0].value,
        icon: 'calendar',
        isActive: true,
        sortOrder: 1,
        autoCategorizationRules: [
          'planning',
          'service',
          'coordination',
          'management',
          'help',
        ],
      },
      {
        name: 'Timeline & Process',
        description: 'Planning timeline and process',
        color: CATEGORY_COLORS[2].value,
        icon: 'clock',
        isActive: true,
        sortOrder: 2,
        autoCategorizationRules: [
          'timeline',
          'process',
          'when',
          'how long',
          'start',
        ],
      },
      {
        name: 'Vendor Coordination',
        description: 'Working with other wedding vendors',
        color: CATEGORY_COLORS[4].value,
        icon: 'team',
        isActive: true,
        sortOrder: 3,
        autoCategorizationRules: [
          'vendor',
          'coordination',
          'work with',
          'recommend',
          'suggest',
        ],
      },
      {
        name: 'Budget Management',
        description: 'Wedding budget planning and management',
        color: CATEGORY_COLORS[1].value,
        icon: 'currency',
        isActive: true,
        sortOrder: 4,
        autoCategorizationRules: [
          'budget',
          'cost',
          'expensive',
          'save',
          'money',
        ],
      },
      {
        name: 'Day-of Coordination',
        description: 'Wedding day coordination services',
        color: CATEGORY_COLORS[3].value,
        icon: 'star',
        isActive: true,
        sortOrder: 5,
        autoCategorizationRules: [
          'day of',
          'wedding day',
          'coordination',
          'on the day',
          'during',
        ],
      },
    ],
  },
];

export default function FAQCategoryManager({
  categories,
  templates = WEDDING_TEMPLATES,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onCategoryReorder,
  onRulesUpdate,
  autoCategorizationRules = [],
  isLoading = false,
}: FAQCategoryManagerProps) {
  const [view, setView] = useState<'categories' | 'templates' | 'rules'>(
    'categories',
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sort categories by sort order
  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter((cat) => showInactive || cat.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, showInactive]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;

      if (active.id !== over.id) {
        const oldIndex = sortedCategories.findIndex(
          (cat) => cat.id === active.id,
        );
        const newIndex = sortedCategories.findIndex(
          (cat) => cat.id === over.id,
        );

        const reorderedCategories = arrayMove(
          sortedCategories,
          oldIndex,
          newIndex,
        );

        // Update sort orders
        const updatedCategories = reorderedCategories.map((cat, index) => ({
          ...cat,
          sortOrder: index + 1,
        }));

        onCategoryReorder(updatedCategories);
      }
    },
    [sortedCategories, onCategoryReorder],
  );

  // Create category from template
  const handleCreateFromTemplate = useCallback(
    (template: CategoryTemplate) => {
      template.categories.forEach((category, index) => {
        setTimeout(() => {
          onCategoryCreate({
            ...category,
            sortOrder: categories.length + index + 1,
            createdAt: new Date().toISOString(),
          });
        }, index * 100); // Stagger creation for better UX
      });
    },
    [categories.length, onCategoryCreate],
  );

  // Statistics
  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive).length;
    const inactive = categories.filter((c) => !c.isActive).length;
    const totalFAQs = categories.reduce((sum, c) => sum + c.count, 0);
    const avgFAQsPerCategory =
      totalFAQs > 0 ? Math.round(totalFAQs / categories.length) : 0;

    return { active, inactive, totalFAQs, avgFAQsPerCategory };
  }, [categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading category manager...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              FAQ Category Manager
            </h2>
            <p className="text-gray-600 mt-1">
              Organize your FAQ content with custom categories and smart
              auto-categorization
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => setView('categories')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  view === 'categories'
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Categories
              </button>
              <button
                type="button"
                onClick={() => setView('templates')}
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  view === 'templates'
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Templates
              </button>
              <button
                type="button"
                onClick={() => setView('rules')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                  view === 'rules'
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Auto-Rules
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">
              {stats.active}
            </div>
            <div className="text-sm text-gray-600">Active Categories</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-600">
              {stats.inactive}
            </div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-primary-600">
              {stats.totalFAQs}
            </div>
            <div className="text-sm text-gray-600">Total FAQs</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-blue-600">
              {stats.avgFAQsPerCategory}
            </div>
            <div className="text-sm text-gray-600">Avg per Category</div>
          </div>
        </div>
      </div>

      {/* Categories View */}
      {view === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Category
              </button>
              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {showInactive ? (
                  <>
                    <EyeSlashIcon className="h-4 w-4 mr-2" />
                    Hide Inactive
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Show All
                  </>
                )}
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Drag to reorder categories
            </div>
          </div>

          {/* Create Category Form */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CreateCategoryForm
                  onSave={(category) => {
                    onCategoryCreate({
                      ...category,
                      sortOrder: categories.length + 1,
                      createdAt: new Date().toISOString(),
                    });
                    setIsCreating(false);
                  }}
                  onCancel={() => setIsCreating(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories List */}
          {sortedCategories.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No categories yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first category or use a template to get started.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Category
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedCategories.map((cat) => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedCategories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      isEditing={editingId === category.id}
                      onEdit={() => setEditingId(category.id)}
                      onEditSave={(updates) => {
                        onCategoryUpdate(category.id, {
                          ...updates,
                          updatedAt: new Date().toISOString(),
                        });
                        setEditingId(null);
                      }}
                      onEditCancel={() => setEditingId(null)}
                      onDelete={() => onCategoryDelete(category.id)}
                      onToggleActive={(isActive) =>
                        onCategoryUpdate(category.id, { isActive })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Templates View */}
      {view === 'templates' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Industry Templates
            </h3>
            <p className="text-gray-600 mb-6">
              Quick-start templates tailored for specific wedding industry
              businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-center mb-4">
                  <SparklesIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700">Includes:</p>
                  <ul className="space-y-1">
                    {template.categories.slice(0, 3).map((category, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-600 flex items-center"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${category.color.split(' ')[0]}`}
                        ></div>
                        {category.name}
                      </li>
                    ))}
                    {template.categories.length > 3 && (
                      <li className="text-xs text-gray-500">
                        +{template.categories.length - 3} more categories
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateFromTemplate(template)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Rules View */}
      {view === 'rules' && (
        <AutoCategorizationRules
          rules={autoCategorizationRules}
          categories={categories}
          onRulesUpdate={onRulesUpdate}
        />
      )}
    </div>
  );
}

// Sortable Category Item Component
interface SortableCategoryItemProps {
  category: FAQCategory;
  isEditing: boolean;
  onEdit: () => void;
  onEditSave: (updates: Partial<FAQCategory>) => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
}

function SortableCategoryItem({
  category,
  isEditing,
  onEdit,
  onEditSave,
  onEditCancel,
  onDelete,
  onToggleActive,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editForm, setEditForm] = useState({
    name: category.name,
    description: category.description || '',
    color: category.color,
    autoCategorizationRules: category.autoCategorizationRules,
  });

  const handleSave = () => {
    onEditSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
      autoCategorizationRules: category.autoCategorizationRules,
    });
    onEditCancel();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-4 ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      } ${!category.isActive ? 'opacity-60' : ''}`}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex space-x-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setEditForm((prev) => ({ ...prev, color: color.value }))
                    }
                    className={`w-8 h-8 rounded-full ${color.preview} ${
                      editForm.color === color.value
                        ? 'ring-2 ring-offset-2 ring-primary-500'
                        : ''
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-categorization Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={editForm.autoCategorizationRules.join(', ')}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  autoCategorizationRules: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="pricing, cost, package, rate"
            />
          </div>
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="cursor-move p-2 hover:bg-gray-50 rounded"
              {...attributes}
              {...listeners}
            >
              <Bars3Icon className="h-4 w-4 text-gray-400" />
            </button>
            <div className="ml-3">
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${category.color} mr-3`}
                >
                  {category.name}
                </span>
                <span className="text-sm text-gray-500">
                  {category.count} FAQs
                </span>
              </div>
              {category.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {category.description}
                </p>
              )}
              {category.autoCategorizationRules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {category.autoCategorizationRules
                    .slice(0, 3)
                    .map((keyword, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  {category.autoCategorizationRules.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{category.autoCategorizationRules.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onToggleActive(!category.isActive)}
              className={`p-1 rounded ${
                category.isActive
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
              title={category.isActive ? 'Deactivate' : 'Activate'}
            >
              {category.isActive ? (
                <EyeIcon className="h-4 w-4" />
              ) : (
                <EyeSlashIcon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit category"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete category "${category.name}"? This will uncategorize ${category.count} FAQs.`,
                  )
                ) {
                  onDelete();
                }
              }}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete category"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Category Form Component
interface CreateCategoryFormProps {
  onSave: (
    category: Omit<FAQCategory, 'id' | 'count' | 'createdAt' | 'updatedAt'>,
  ) => void;
  onCancel: () => void;
}

function CreateCategoryForm({ onSave, onCancel }: CreateCategoryFormProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0].value,
    isActive: true,
    sortOrder: 0,
    autoCategorizationRules: [] as string[],
  });

  const handleSave = () => {
    if (!form.name.trim()) return;

    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      autoCategorizationRules: form.autoCategorizationRules,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Create New Category</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="e.g., Pricing & Packages"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="flex space-x-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, color: color.value }))
                }
                className={`w-8 h-8 rounded-full ${color.preview} ${
                  form.color === color.value
                    ? 'ring-2 ring-offset-2 ring-primary-500'
                    : ''
                }`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={2}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
          placeholder="Brief description of what FAQs belong in this category"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Auto-categorization Keywords (comma-separated)
        </label>
        <input
          type="text"
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              autoCategorizationRules: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="pricing, cost, package, rate"
        />
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!form.name.trim()}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Category
        </button>
      </div>
    </div>
  );
}

// Auto-categorization Rules Component
interface AutoCategorizationRulesProps {
  rules: AutoCategorizationRule[];
  categories: FAQCategory[];
  onRulesUpdate: (rules: AutoCategorizationRule[]) => void;
}

function AutoCategorizationRules({
  rules,
  categories,
  onRulesUpdate,
}: AutoCategorizationRulesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Auto-Categorization Rules
        </h3>
        <p className="text-gray-600 mb-6">
          Configure automatic categorization based on keywords and patterns in
          FAQ content.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <SparklesIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">How auto-categorization works:</p>
            <ul className="space-y-1">
              <li>• Rules are applied in priority order</li>
              <li>• Keywords match both questions and answers</li>
              <li>• First matching rule assigns the category</li>
              <li>• Manual categorization always takes precedence</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Rules are managed through category keywords for simplicity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">
          Auto-categorization rules are managed through individual category
          settings. Edit categories above to configure keywords for automatic
          categorization.
        </p>
      </div>
    </div>
  );
}
