'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card-untitled';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Tag as TagIcon,
  Users,
  MoreVertical,
  X,
  Check,
  Palette,
} from 'lucide-react';

export interface Tag {
  id: string;
  name: string;
  description: string | null;
  color: TagColor;
  category: TagCategory;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

export type TagCategory =
  | 'relationship'
  | 'venue'
  | 'season'
  | 'style'
  | 'service'
  | 'priority'
  | 'custom';

const TAG_COLORS: { color: TagColor; label: string; classes: string }[] = [
  {
    color: 'gray',
    label: 'Gray',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  {
    color: 'red',
    label: 'Red',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    color: 'orange',
    label: 'Orange',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    color: 'amber',
    label: 'Amber',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    color: 'yellow',
    label: 'Yellow',
    classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    color: 'lime',
    label: 'Lime',
    classes: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  {
    color: 'green',
    label: 'Green',
    classes: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    color: 'emerald',
    label: 'Emerald',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    color: 'teal',
    label: 'Teal',
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    color: 'cyan',
    label: 'Cyan',
    classes: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    color: 'sky',
    label: 'Sky',
    classes: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    color: 'blue',
    label: 'Blue',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    color: 'indigo',
    label: 'Indigo',
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    color: 'violet',
    label: 'Violet',
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    color: 'purple',
    label: 'Purple',
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    color: 'fuchsia',
    label: 'Fuchsia',
    classes: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  },
  {
    color: 'pink',
    label: 'Pink',
    classes: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    color: 'rose',
    label: 'Rose',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

const TAG_CATEGORIES: {
  value: TagCategory;
  label: string;
  description: string;
}[] = [
  {
    value: 'relationship',
    label: 'Relationship',
    description: 'VIP, referral, repeat client',
  },
  {
    value: 'venue',
    label: 'Venue Type',
    description: 'Outdoor, indoor, destination',
  },
  {
    value: 'season',
    label: 'Season',
    description: 'Spring, summer, autumn, winter',
  },
  {
    value: 'style',
    label: 'Style',
    description: 'Modern, vintage, rustic, elegant',
  },
  {
    value: 'service',
    label: 'Service Level',
    description: 'Full day, half day, elopement',
  },
  {
    value: 'priority',
    label: 'Priority',
    description: 'High priority, urgent, low priority',
  },
  { value: 'custom', label: 'Custom', description: 'Your own categories' },
];

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdate?: () => void;
}

export default function TagManager({
  isOpen,
  onClose,
  onTagsUpdate,
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | 'all'>(
    'all',
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New tag form state
  const [newTag, setNewTag] = useState({
    name: '',
    description: '',
    color: 'blue' as TagColor,
    category: 'custom' as TagCategory,
  });

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setError('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTag.name.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });

      if (!response.ok) throw new Error('Failed to create tag');

      const data = await response.json();
      setTags((prev) => [...prev, data.tag]);
      setNewTag({
        name: '',
        description: '',
        color: 'blue',
        category: 'custom',
      });
      setIsCreating(false);
      onTagsUpdate?.();
    } catch (error) {
      console.error('Error creating tag:', error);
      setError('Failed to create tag');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTag = async (tagId: string, updates: Partial<Tag>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update tag');

      const data = await response.json();
      setTags((prev) => prev.map((tag) => (tag.id === tagId ? data.tag : tag)));
      setEditingTag(null);
      onTagsUpdate?.();
    } catch (error) {
      console.error('Error updating tag:', error);
      setError('Failed to update tag');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this tag? This will remove it from all clients.',
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      onTagsUpdate?.();
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('Failed to delete tag');
    } finally {
      setIsLoading(false);
    }
  };

  const getTagColorClasses = (color: TagColor) => {
    return (
      TAG_COLORS.find((c) => c.color === color)?.classes ||
      TAG_COLORS[0].classes
    );
  };

  const filteredTags = tags.filter((tag) => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.description &&
        tag.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || tag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTags = filteredTags.reduce(
    (acc, tag) => {
      const category = tag.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    },
    {} as Record<TagCategory, Tag[]>,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <TagIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h2
                className="text-2xl font-bold text-gray-900"
                data-testid="tag-manager"
              >
                Tag Manager
              </h2>
              <p className="text-sm text-gray-500">
                Organize your clients with custom tags
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as TagCategory | 'all')
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Categories</option>
                {TAG_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <Button
                onClick={() => setIsCreating(true)}
                className="gap-2"
                data-testid="create-tag"
              >
                <Plus className="w-4 h-4" />
                Create Tag
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Create Tag Form */}
          {isCreating && (
            <Card className="p-6 mb-6 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Tag
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Name *
                  </label>
                  <Input
                    value={newTag.name}
                    onChange={(e) =>
                      setNewTag((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., VIP Client, Outdoor Wedding"
                    data-testid="tag-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={newTag.description}
                    onChange={(e) =>
                      setNewTag((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTag.category}
                    onChange={(e) =>
                      setNewTag((prev) => ({
                        ...prev,
                        category: e.target.value as TagCategory,
                      }))
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-full"
                    data-testid="tag-category"
                  >
                    {TAG_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label} - {cat.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.color}
                        onClick={() =>
                          setNewTag((prev) => ({
                            ...prev,
                            color: colorOption.color,
                          }))
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newTag.color === colorOption.color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300'
                        } ${colorOption.classes.includes('bg-gray') ? 'bg-gray-200' : colorOption.classes.split(' ')[0]}`}
                        title={colorOption.label}
                        data-testid={`tag-color-${colorOption.color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTag({
                        name: '',
                        description: '',
                        color: 'blue',
                        category: 'custom',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTag}
                    disabled={!newTag.name.trim() || isLoading}
                    data-testid="save-tag"
                  >
                    {isLoading ? 'Creating...' : 'Create Tag'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Tags List */}
          {isLoading && !tags.length ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading tags...</p>
              </div>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No matching tags'
                  : 'No tags yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first tag to start organizing clients'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTags).map(([category, categoryTags]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {TAG_CATEGORIES.find((c) => c.value === category)
                        ?.label || category}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {categoryTags.length}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {categoryTags.map((tag) => (
                      <Card key={tag.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`${getTagColorClasses(tag.color)} border`}
                              data-testid={`tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {tag.name}
                            </Badge>

                            <div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  {tag.usage_count} client
                                  {tag.usage_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {tag.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {tag.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTag(tag)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTag(tag.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {tags.length} tag{tags.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>
    </div>
  );
}
