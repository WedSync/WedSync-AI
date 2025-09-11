'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input-untitled';
import { Button } from '@/components/ui/button-untitled';
import { X, Plus, Tag as TagIcon, Search, Sparkles } from 'lucide-react';
import { Tag, TagColor } from './TagManager';

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export default function TagInput({
  selectedTags,
  onTagsChange,
  placeholder = 'Search and select tags...',
  maxTags,
  className = '',
}: TagInputProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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
        setIsDropdownOpen(false);
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

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(availableTags, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      threshold: 0.4, // Adjust for fuzzy matching sensitivity
      location: 0,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [availableTags]);

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

  // Use Fuse.js for fuzzy search
  const filteredTags = useMemo(() => {
    // Filter out already selected tags
    const unselectedTags = availableTags.filter(
      (tag) => !selectedTags.some((selected) => selected.id === tag.id),
    );

    if (searchQuery === '') {
      return unselectedTags;
    }

    // Perform fuzzy search
    const results = fuse.search(searchQuery);

    // Map results and filter by selected status
    return results
      .map((result) => result.item)
      .filter(
        (tag) => !selectedTags.some((selected) => selected.id === tag.id),
      );
  }, [searchQuery, availableTags, selectedTags, fuse]);

  const handleTagSelect = (tag: Tag) => {
    if (maxTags && selectedTags.length >= maxTags) return;

    const newTags = [...selectedTags, tag];
    onTagsChange(newTags);
    setSearchQuery('');

    // Keep dropdown open for multiple selection
    inputRef.current?.focus();
  };

  const handleTagRemove = (tagToRemove: Tag) => {
    const newTags = selectedTags.filter((tag) => tag.id !== tagToRemove.id);
    onTagsChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Backspace' &&
      searchQuery === '' &&
      selectedTags.length > 0
    ) {
      // Remove last tag on backspace when input is empty
      handleTagRemove(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Select highlighted tag on enter
      if (filteredTags.length > 0 && highlightedIndex < filteredTags.length) {
        handleTagSelect(filteredTags[highlightedIndex]);
        setHighlightedIndex(0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex((prev) =>
        prev < filteredTags.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Tab' && isDropdownOpen && filteredTags.length > 0) {
      e.preventDefault();
      // Select highlighted tag on tab
      if (highlightedIndex < filteredTags.length) {
        handleTagSelect(filteredTags[highlightedIndex]);
        setHighlightedIndex(0);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setHighlightedIndex(0);
      inputRef.current?.blur();
    }
  };

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Tag Input Container */}
      <div className="min-h-[40px] w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex flex-wrap gap-2">
          {/* Selected Tags */}
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTagColorClasses(tag.color)}`}
              data-testid={`selected-tag-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tag.name}
              <button
                onClick={() => handleTagRemove(tag)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                aria-label={`Remove ${tag.name} tag`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {/* Input */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={selectedTags.length === 0 ? placeholder : ''}
                className="flex-1 outline-none text-sm placeholder-gray-500"
                disabled={maxTags ? selectedTags.length >= maxTags : false}
                data-testid="tag-search-input"
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Search and select tags"
                aria-describedby={
                  selectedTags.length > 0 ? 'selected-tags' : undefined
                }
                aria-autocomplete="list"
                aria-activedescendant={
                  isDropdownOpen && filteredTags.length > 0
                    ? `tag-option-${filteredTags[highlightedIndex]?.name.toLowerCase().replace(/\s+/g, '-')}`
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Tag suggestions"
        >
          {isLoading ? (
            <div className="p-3 text-center text-sm text-gray-500">
              Loading tags...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              {searchQuery
                ? `No tags found for "${searchQuery}"`
                : 'No available tags'}
            </div>
          ) : (
            <div className="py-2">
              {searchQuery && filteredTags.length > 0 && (
                <div className="px-3 py-1 text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Fuzzy search results for "{searchQuery}"
                </div>
              )}
              {filteredTags.map((tag, index) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  data-testid={`tag-option-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                  id={`tag-option-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <Badge
                    className={`${getTagColorClasses(tag.color)} border text-xs`}
                  >
                    {tag.name}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">
                      {tag.description && (
                        <span className="text-gray-500">
                          • {tag.description}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tag.category} • {tag.usage_count} client
                      {tag.usage_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {index === highlightedIndex && (
                    <span className="text-xs text-blue-600 pr-2">
                      Press Enter to select
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tag limit indicator */}
      {maxTags && selectedTags.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {selectedTags.length}/{maxTags} tags selected
          {selectedTags.length >= maxTags && (
            <span className="text-amber-600 ml-2">Maximum reached</span>
          )}
        </div>
      )}
    </div>
  );
}
