'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import {
  Filter,
  X,
  ChevronDown,
  Tag as TagIcon,
  Search,
  Check,
} from 'lucide-react';
import { Tag, TagColor, TagCategory } from './TagManager';

interface TagFilterProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
}

const TAG_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'venue', label: 'Venue Type' },
  { value: 'season', label: 'Season' },
  { value: 'style', label: 'Style' },
  { value: 'service', label: 'Service Level' },
  { value: 'priority', label: 'Priority' },
  { value: 'custom', label: 'Custom' },
];

export default function TagFilter({
  selectedTagIds,
  onTagsChange,
  className = '',
  buttonVariant = 'outline',
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | 'all'>(
    'all',
  );
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTagColorClasses = (color: TagColor) => {
    const colorMap: Record<TagColor, string> = {
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      lime: 'bg-lime-50 text-lime-700 border-lime-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      teal: 'bg-teal-50 text-teal-700 border-teal-200',
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      sky: 'bg-sky-50 text-sky-700 border-sky-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      violet: 'bg-violet-50 text-violet-700 border-violet-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return colorMap[color] || colorMap.blue;
  };

  const filteredTags = availableTags.filter((tag) => {
    const matchesSearch =
      searchQuery === '' ||
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.description &&
        tag.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || tag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedTags = availableTags.filter((tag) =>
    selectedTagIds.includes(tag.id),
  );

  const handleTagToggle = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagsChange(newSelectedIds);
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const groupedTags = filteredTags.reduce(
    (acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    },
    {} as Record<TagCategory, Tag[]>,
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Filter Button */}
      <Button
        variant={buttonVariant}
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        data-testid="tag-filter"
      >
        <Filter className="w-4 h-4" />
        Filter by Tags
        {selectedTagIds.length > 0 && (
          <Badge variant="outline" className="ml-1">
            {selectedTagIds.length}
          </Badge>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {/* Selected Tags (when not in dropdown) */}
      {!isOpen && selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTagColorClasses(tag.color)}`}
              data-testid={`filter-tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tag.name}
              <button
                onClick={() => handleTagToggle(tag.id)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                aria-label={`Remove ${tag.name} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs text-gray-500"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-96 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Filter by Tags</h3>
              </div>
              {selectedTagIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-gray-500"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as TagCategory | 'all')
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {TAG_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading tags...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery
                  ? `No tags found for "${searchQuery}"`
                  : 'No tags available'}
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedTags).map(([category, categoryTags]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {TAG_CATEGORIES.find((c) => c.value === category)
                        ?.label || category}
                    </div>
                    <div className="space-y-1">
                      {categoryTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedTagIds.includes(tag.id)}
                              onChange={() => handleTagToggle(tag.id)}
                              className="sr-only"
                              data-testid={`filter-tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                            />
                            <div
                              className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                selectedTagIds.includes(tag.id)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedTagIds.includes(tag.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <Badge
                              className={`${getTagColorClasses(tag.color)} border text-xs`}
                            >
                              {tag.name}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {tag.usage_count} client
                              {tag.usage_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedTagIds.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing clients with {selectedTagIds.length} selected tag
                {selectedTagIds.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
