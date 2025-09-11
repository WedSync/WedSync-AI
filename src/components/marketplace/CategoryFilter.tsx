'use client';

import { useState } from 'react';
import {
  Filter,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  count: number;
  subcategories?: Category[];
  trending?: boolean;
}

interface Props {
  categories: Category[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  onCategoryChange: (category: string, subcategory?: string) => void;
  templateCounts: Record<string, number>;
  className?: string;
  showSearch?: boolean;
  collapsible?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  templateCounts,
  className,
  showSearch = true,
  collapsible = true,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['all']),
  );

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategorySelect = (categoryId: string, subcategoryId?: string) => {
    onCategoryChange(categoryId, subcategoryId);

    // Auto-expand selected category
    if (!expandedCategories.has(categoryId)) {
      setExpandedCategories((prev) => new Set([...prev, categoryId]));
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getTotalCount = (category: Category): number => {
    const directCount = templateCounts[category.id] || category.count || 0;
    const subcategoryCount =
      category.subcategories?.reduce(
        (sum, sub) => sum + (templateCounts[sub.id] || sub.count || 0),
        0,
      ) || 0;
    return directCount + subcategoryCount;
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Categories</h3>
        </div>
        {selectedCategory && selectedCategory !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCategoryChange('all');
              setSearchQuery('');
            }}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-1">
        {filteredCategories.map((category) => {
          const hasSubcategories =
            category.subcategories && category.subcategories.length > 0;
          const isSelected = selectedCategory === category.id;
          const isExpanded = expandedCategories.has(category.id);
          const totalCount = getTotalCount(category);

          return (
            <div key={category.id} className="space-y-1">
              <div
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-all',
                  'hover:bg-gray-50',
                  isSelected && 'bg-blue-50 text-blue-700 font-medium',
                )}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {hasSubcategories && collapsible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </Button>
                  )}

                  {category.icon && (
                    <span className="text-base flex-shrink-0">
                      {category.icon}
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{category.name}</span>
                      {category.trending && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 border-0"
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Hot
                        </Badge>
                      )}
                    </div>

                    {category.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Count */}
                {totalCount > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      isSelected && 'border-blue-200 bg-blue-100 text-blue-700',
                    )}
                  >
                    {totalCount}
                  </Badge>
                )}
              </div>

              {/* Subcategories */}
              {hasSubcategories && (collapsible ? isExpanded : true) && (
                <div className="ml-6 space-y-1">
                  {category.subcategories?.map((subcategory) => {
                    const isSubSelected =
                      selectedCategory === category.id &&
                      selectedSubcategory === subcategory.id;
                    const subCount =
                      templateCounts[subcategory.id] || subcategory.count || 0;

                    return (
                      <div
                        key={subcategory.id}
                        className={cn(
                          'flex items-center justify-between rounded-md px-3 py-1.5 text-sm cursor-pointer transition-all',
                          'hover:bg-gray-50',
                          isSubSelected &&
                            'bg-blue-50 text-blue-700 font-medium',
                        )}
                        onClick={() =>
                          handleCategorySelect(category.id, subcategory.id)
                        }
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {subcategory.icon && (
                            <span className="text-sm flex-shrink-0">
                              {subcategory.icon}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="truncate text-sm">
                              {subcategory.name}
                            </span>
                            {subcategory.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {subcategory.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {subCount > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              isSubSelected &&
                                'border-blue-200 bg-blue-100 text-blue-700',
                            )}
                          >
                            {subCount}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {searchQuery && filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No categories found for "{searchQuery}"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="mt-2"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Popular Categories Footer */}
      {!searchQuery && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
            Popular This Week
          </h4>
          <div className="flex flex-wrap gap-1">
            {categories
              .filter(
                (cat) =>
                  cat.trending ||
                  (templateCounts[cat.id] || cat.count || 0) > 10,
              )
              .slice(0, 4)
              .map((category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategorySelect(category.id)}
                  className="text-xs h-6 px-2"
                >
                  {category.icon} {category.name}
                </Button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
