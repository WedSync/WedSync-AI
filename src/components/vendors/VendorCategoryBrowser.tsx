'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FunnelIcon,
  XMarkIcon,
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
  subcategories?: VendorCategory[];
  vendor_count?: number; // This would come from a join query
}

interface VendorCategoryBrowserProps {
  onCategorySelect?: (category: VendorCategory | null) => void;
  selectedCategoryId?: string;
  showSearch?: boolean;
  showDescription?: boolean;
  allowMultiSelect?: boolean;
  layout?: 'grid' | 'list' | 'tree';
  featuredOnly?: boolean;
}

export function VendorCategoryBrowser({
  onCategorySelect,
  selectedCategoryId,
  showSearch = true,
  showDescription = true,
  allowMultiSelect = false,
  layout = 'grid',
  featuredOnly = false,
}: VendorCategoryBrowserProps) {
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId && !allowMultiSelect) {
      setSelectedCategories(new Set([selectedCategoryId]));
    }
  }, [selectedCategoryId, allowMultiSelect]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const url =
        layout === 'tree'
          ? '/api/vendor-categories?hierarchy=true'
          : '/api/vendor-categories';

      const response = await fetch(url);
      const data = await response.json();
      setCategories(data || []);

      // Auto-expand featured categories in tree view
      if (layout === 'tree') {
        const featured = new Set(
          data
            .filter((cat: VendorCategory) => cat.is_featured)
            .map((cat: VendorCategory) => cat.id),
        );
        setExpandedCategories(featured);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    let filtered = categories.filter((cat) => cat.is_active);

    if (featuredOnly) {
      filtered = filtered.filter((cat) => cat.is_featured);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.search_keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    return filtered;
  }, [categories, searchTerm, featuredOnly]);

  const topLevelCategories = useMemo(() => {
    return filteredCategories.filter((cat) => !cat.parent_id);
  }, [filteredCategories]);

  const getSubcategories = (parentId: string) => {
    return filteredCategories.filter((cat) => cat.parent_id === parentId);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (category: VendorCategory) => {
    if (allowMultiSelect) {
      const newSelected = new Set(selectedCategories);
      if (newSelected.has(category.id)) {
        newSelected.delete(category.id);
      } else {
        newSelected.add(category.id);
      }
      setSelectedCategories(newSelected);

      // Call callback with array of selected categories
      const selectedCats = categories.filter((cat) => newSelected.has(cat.id));
      onCategorySelect?.(selectedCats.length > 0 ? selectedCats[0] : null); // Simplified for now
    } else {
      const newSelected = selectedCategories.has(category.id)
        ? new Set()
        : new Set([category.id]);
      setSelectedCategories(newSelected);
      onCategorySelect?.(newSelected.size > 0 ? category : null);
    }
  };

  const clearSelection = () => {
    setSelectedCategories(new Set());
    onCategorySelect?.(null);
  };

  const renderCategoryIcon = (category: VendorCategory) => {
    // Simple emoji mapping for common icons
    const iconMap: { [key: string]: string } = {
      camera: '📷',
      video: '🎥',
      building: '🏛️',
      utensils: '🍽️',
      flower: '🌸',
      music: '🎵',
      sparkles: '✨',
      clipboard: '📋',
      shirt: '👔',
      car: '🚗',
      cake: '🍰',
      envelope: '✉️',
      'paint-brush': '🎨',
      gem: '💎',
      gift: '🎁',
      heart: '💕',
      star: '⭐',
      crown: '👑',
      tree: '🌳',
    };

    return iconMap[category.icon] || '📁';
  };

  const renderGridCategory = (category: VendorCategory) => {
    const isSelected = selectedCategories.has(category.id);
    const hasSubcategories = getSubcategories(category.id).length > 0;

    return (
      <Card
        key={category.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleCategoryClick(category)}
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{renderCategoryIcon(category)}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {category.display_name}
              </h3>
              {hasSubcategories && (
                <p className="text-xs text-blue-600 mt-1">
                  {getSubcategories(category.id).length} subcategories
                </p>
              )}
            </div>
            {category.is_featured && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                Featured
              </Badge>
            )}
          </div>

          {showDescription && category.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {category.description}
            </p>
          )}

          {hasSubcategories && (
            <div className="flex flex-wrap gap-1">
              {getSubcategories(category.id)
                .slice(0, 3)
                .map((sub) => (
                  <Badge key={sub.id} variant="secondary" className="text-xs">
                    {sub.display_name}
                  </Badge>
                ))}
              {getSubcategories(category.id).length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{getSubcategories(category.id).length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderTreeCategory = (category: VendorCategory, level = 0) => {
    const isSelected = selectedCategories.has(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const subcategories = getSubcategories(category.id);
    const hasSubcategories = subcategories.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
          }`}
          style={{ marginLeft: level * 20 }}
          onClick={() => handleCategoryClick(category)}
        >
          {hasSubcategories && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
          )}

          <span className="text-lg">{renderCategoryIcon(category)}</span>

          <div className="flex-1">
            <span className="font-medium">{category.display_name}</span>
            {hasSubcategories && (
              <span className="text-xs text-gray-500 ml-2">
                ({subcategories.length})
              </span>
            )}
          </div>

          {category.is_featured && (
            <Badge className="bg-yellow-100 text-yellow-700 text-xs">
              Featured
            </Badge>
          )}
        </div>

        {hasSubcategories && isExpanded && (
          <div className="mt-1">
            {subcategories.map((sub) => renderTreeCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderListCategory = (category: VendorCategory) => {
    const isSelected = selectedCategories.has(category.id);
    const subcategories = getSubcategories(category.id);
    const hasSubcategories = subcategories.length > 0;

    return (
      <Card
        key={category.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleCategoryClick(category)}
      >
        <div className="p-4 flex items-center gap-4">
          <span className="text-2xl">{renderCategoryIcon(category)}</span>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                {category.display_name}
              </h3>
              {category.is_featured && (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                  Featured
                </Badge>
              )}
            </div>

            {showDescription && category.description && (
              <p className="text-sm text-gray-600 mb-2">
                {category.description}
              </p>
            )}

            {hasSubcategories && (
              <div className="flex flex-wrap gap-1">
                {subcategories.slice(0, 5).map((sub) => (
                  <Badge key={sub.id} variant="secondary" className="text-xs">
                    {sub.display_name}
                  </Badge>
                ))}
                {subcategories.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{subcategories.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ChevronRightIcon className="size-5 text-gray-400" />
        </div>
      </Card>
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
    <div className="space-y-4">
      {/* Header */}
      {showSearch && (
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedCategories.size > 0 && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <XMarkIcon className="size-4 mr-1" />
              Clear ({selectedCategories.size})
            </Button>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {layout === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topLevelCategories.map(renderGridCategory)}
          </div>
        )}

        {layout === 'list' && (
          <div className="space-y-2">
            {topLevelCategories.map(renderListCategory)}
          </div>
        )}

        {layout === 'tree' && (
          <Card className="p-4">
            <div className="space-y-1">
              {topLevelCategories.map((category) =>
                renderTreeCategory(category),
              )}
            </div>
          </Card>
        )}
      </div>

      {filteredCategories.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          <FunnelIcon className="size-12 mx-auto mb-3 text-gray-300" />
          <p>No categories found for "{searchTerm}"</p>
          <p className="text-sm mt-1">Try different search terms</p>
        </div>
      )}
    </div>
  );
}
