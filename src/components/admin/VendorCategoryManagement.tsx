'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/20/solid';

interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  color?: string;
  parent_id?: string;
  category_level: number;
  full_path: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  search_keywords: string[];
  seo_title?: string;
  seo_description?: string;
  subcategories?: VendorCategory[];
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  name: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  search_keywords: string[];
  seo_title: string;
  seo_description: string;
}

const defaultFormData: CategoryFormData = {
  name: '',
  slug: '',
  display_name: '',
  description: '',
  icon: '',
  color: '#3B82F6',
  parent_id: undefined,
  sort_order: 0,
  is_active: true,
  is_featured: false,
  search_keywords: [],
  seo_title: '',
  seo_description: '',
};

const commonIcons = [
  'camera',
  'video',
  'building',
  'utensils',
  'flower',
  'music',
  'sparkles',
  'clipboard',
  'shirt',
  'car',
  'cake',
  'envelope',
  'paint-brush',
  'gem',
  'gift',
  'heart',
  'star',
  'crown',
  'tree',
  'hamburger',
  'truck',
  'leaf',
  'microphone',
  'guitar',
  'theater-masks',
  'film',
  'broadcast-tower',
  'camera-retro',
  'plane',
];

export function VendorCategoryManagement() {
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCategory, setSelectedCategory] =
    useState<VendorCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendor-categories?hierarchy=true');
      const data = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    let filtered = categories;

    if (!showInactive) {
      filtered = filtered.filter((cat) => cat.is_active);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [categories, searchTerm, showInactive]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const openDialog = (category?: VendorCategory) => {
    if (category) {
      setIsEditing(true);
      setSelectedCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        display_name: category.display_name,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || '#3B82F6',
        parent_id: category.parent_id,
        sort_order: category.sort_order,
        is_active: category.is_active,
        is_featured: category.is_featured,
        search_keywords: category.search_keywords || [],
        seo_title: category.seo_title || '',
        seo_description: category.seo_description || '',
      });
    } else {
      setIsEditing(false);
      setSelectedCategory(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
    setFormData(defaultFormData);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `/api/vendor-categories/${selectedCategory?.id}`
        : '/api/vendor-categories';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save category');
      }

      await fetchCategories();
      closeDialog();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: VendorCategory) => {
    if (
      !confirm(`Are you sure you want to delete "${category.display_name}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/vendor-categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to delete category',
      );
    }
  };

  const handleKeywordAdd = (keyword: string) => {
    if (keyword.trim() && !formData.search_keywords.includes(keyword.trim())) {
      setFormData((prev) => ({
        ...prev,
        search_keywords: [...prev.search_keywords, keyword.trim()],
      }));
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      search_keywords: prev.search_keywords.filter((k) => k !== keyword),
    }));
  };

  const renderCategoryRow = (category: VendorCategory, level = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasSubcategories =
      category.subcategories && category.subcategories.length > 0;

    return (
      <div key={category.id} className="border border-gray-200 rounded-lg mb-2">
        <div
          className={`flex items-center justify-between p-4 ${level > 0 ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div
            className="flex items-center gap-3"
            style={{ marginLeft: level * 20 }}
          >
            {hasSubcategories && (
              <button
                onClick={() => toggleCategory(category.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="size-4" />
                ) : (
                  <ChevronRightIcon className="size-4" />
                )}
              </button>
            )}

            <div className="flex items-center gap-3">
              {category.icon && (
                <span className="text-lg" title={category.icon}>
                  {/* Icon would be rendered here */}
                  📁
                </span>
              )}
              <div>
                <h4 className="font-medium text-gray-900">
                  {category.display_name}
                </h4>
                <p className="text-sm text-gray-500">
                  {category.full_path} • {category.slug}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!category.is_active && (
              <Badge variant="secondary" className="bg-red-100 text-red-600">
                Inactive
              </Badge>
            )}
            {category.is_featured && (
              <Badge className="bg-yellow-100 text-yellow-600">Featured</Badge>
            )}
            <span className="text-sm text-gray-400">
              Level {category.category_level}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => openDialog(category)}
            >
              <PencilIcon className="size-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(category)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        </div>

        {hasSubcategories && isExpanded && (
          <div className="border-t border-gray-200 p-2 bg-gray-25">
            {category.subcategories!.map((sub) =>
              renderCategoryRow(sub, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Vendor Categories
          </h2>
          <p className="text-gray-600 mt-1">
            Manage wedding vendor categories and subcategories
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <PlusIcon className="size-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Label>Show Inactive</Label>
          </div>
        </div>
      </Card>

      {/* Categories List */}
      <div className="space-y-2">
        {filteredCategories.map((category) => renderCategoryRow(category))}
      </div>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the category details below.'
                : 'Create a new vendor category with subcategory support.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => {
                    const displayName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      display_name: displayName,
                      name: displayName.toLowerCase().replace(/\s+/g, '_'),
                      slug: generateSlug(displayName),
                    }));
                  }}
                  placeholder="Photography"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="photography"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Professional wedding photographers and photography services"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, icon: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonIcons.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="parent_id">Parent Category</Label>
              <Select
                value={formData.parent_id || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: value || undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Top Level)</SelectItem>
                  {categories
                    .filter((cat) => cat.id !== selectedCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.full_path}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_featured: checked }))
                  }
                />
                <Label>Featured</Label>
              </div>
            </div>

            <div>
              <Label>Search Keywords</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.search_keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleKeywordRemove(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add keyword and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleKeywordAdd(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
