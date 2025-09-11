'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Save,
  Search,
  Star,
  Clock,
  Edit3,
  Trash2,
  Play,
  Bell,
  BellOff,
  Pin,
  PinOff,
  Share2,
  Download,
  Filter,
  MapPin,
  DollarSign,
  Calendar,
  Tag,
  Heart,
  Bookmark,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface SearchFiltersState {
  query: string;
  vendorCategories: string[];
  location: {
    city?: string;
    region?: string;
    radius?: number;
    coordinates?: [number, number];
  };
  priceRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  availability: {
    startDate?: Date;
    endDate?: Date;
    flexible?: boolean;
  };
  reviewScore: {
    minRating?: number;
    minReviews?: number;
  };
  sortBy:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'rating'
    | 'distance'
    | 'recent';
  advancedFilters: Record<string, any>;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFiltersState;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  isPinned: boolean;
  hasAlerts: boolean;
  resultCount?: number;
  tags: string[];
  description?: string;
}

interface SavedSearchesProps {
  onLoadSearch: (filters: SearchFiltersState) => void;
  onSaveSearch?: (name: string, filters: SearchFiltersState) => Promise<void>;
  className?: string;
  compact?: boolean;
  maxVisible?: number;
  currentFilters?: SearchFiltersState;
}

const MOCK_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: '1',
    name: 'London Wedding Photographers',
    filters: {
      query: 'wedding photographer',
      vendorCategories: ['Photography'],
      location: { city: 'London', currency: 'GBP' },
      priceRange: { min: 1000, max: 3000, currency: 'GBP' },
      availability: {},
      reviewScore: { minRating: 4.5 },
      sortBy: 'rating',
      advancedFilters: { verifiedOnly: true },
    },
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-01-20'),
    useCount: 15,
    isPinned: true,
    hasAlerts: true,
    resultCount: 47,
    tags: ['Photography', 'London', 'Premium'],
    description: 'High-rated photographers in London area',
  },
  {
    id: '2',
    name: 'Budget-Friendly Venues',
    filters: {
      query: 'wedding venue',
      vendorCategories: ['Venues'],
      location: { currency: 'GBP' },
      priceRange: { max: 2000, currency: 'GBP' },
      availability: {},
      reviewScore: { minRating: 4.0 },
      sortBy: 'price_asc',
      advancedFilters: {},
    },
    createdAt: new Date('2024-01-10'),
    lastUsed: new Date('2024-01-18'),
    useCount: 8,
    isPinned: false,
    hasAlerts: false,
    resultCount: 23,
    tags: ['Venue', 'Budget', 'Affordable'],
    description: 'Affordable wedding venues under £2000',
  },
  {
    id: '3',
    name: 'Birmingham Suppliers',
    filters: {
      query: '',
      vendorCategories: ['Photography', 'Catering', 'Florists'],
      location: { city: 'Birmingham', radius: 25, currency: 'GBP' },
      priceRange: { currency: 'GBP' },
      availability: {},
      reviewScore: {},
      sortBy: 'distance',
      advancedFilters: {},
    },
    createdAt: new Date('2024-01-08'),
    lastUsed: new Date('2024-01-16'),
    useCount: 5,
    isPinned: false,
    hasAlerts: true,
    resultCount: 89,
    tags: ['Birmingham', 'Multi-category', 'Local'],
    description: 'All wedding suppliers within 25 miles of Birmingham',
  },
];

export function SavedSearches({
  onLoadSearch,
  onSaveSearch,
  className,
  compact = false,
  maxVisible = 5,
  currentFilters,
}: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] =
    useState<SavedSearch[]>(MOCK_SAVED_SEARCHES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchTags, setSearchTags] = useState('');

  // Load saved searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wedsync-saved-searches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt),
          lastUsed: new Date(search.lastUsed),
        }));
        setSavedSearches([...MOCK_SAVED_SEARCHES, ...parsed]);
      } catch (error) {
        console.error('Failed to load saved searches:', error);
      }
    }
  }, []);

  // Save to localStorage whenever savedSearches changes
  useEffect(() => {
    const userSavedSearches = savedSearches.filter(
      (search) => !MOCK_SAVED_SEARCHES.find((mock) => mock.id === search.id),
    );
    localStorage.setItem(
      'wedsync-saved-searches',
      JSON.stringify(userSavedSearches),
    );
  }, [savedSearches]);

  const handleLoadSearch = (search: SavedSearch) => {
    // Update last used and use count
    setSavedSearches((prev) =>
      prev.map((s) =>
        s.id === search.id
          ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
          : s,
      ),
    );

    onLoadSearch(search.filters);
  };

  const handleSaveSearch = async () => {
    if (!currentFilters || !searchName.trim()) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: currentFilters,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0,
      isPinned: false,
      hasAlerts: false,
      tags: searchTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      description: searchDescription.trim() || undefined,
    };

    try {
      if (onSaveSearch) {
        await onSaveSearch(searchName, currentFilters);
      }

      setSavedSearches((prev) => [newSearch, ...prev]);
      setSearchName('');
      setSearchDescription('');
      setSearchTags('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleEditSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setSearchName(search.name);
    setSearchDescription(search.description || '');
    setSearchTags(search.tags.join(', '));
    setIsDialogOpen(true);
  };

  const handleUpdateSearch = async () => {
    if (!editingSearch || !searchName.trim()) return;

    setSavedSearches((prev) =>
      prev.map((search) =>
        search.id === editingSearch.id
          ? {
              ...search,
              name: searchName.trim(),
              description: searchDescription.trim() || undefined,
              tags: searchTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            }
          : search,
      ),
    );

    setEditingSearch(null);
    setSearchName('');
    setSearchDescription('');
    setSearchTags('');
    setIsDialogOpen(false);
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches((prev) => prev.filter((search) => search.id !== searchId));
  };

  const togglePin = (searchId: string) => {
    setSavedSearches((prev) =>
      prev.map((search) =>
        search.id === searchId
          ? { ...search, isPinned: !search.isPinned }
          : search,
      ),
    );
  };

  const toggleAlerts = (searchId: string) => {
    setSavedSearches((prev) =>
      prev.map((search) =>
        search.id === searchId
          ? { ...search, hasAlerts: !search.hasAlerts }
          : search,
      ),
    );
  };

  const getFilterSummary = (filters: SearchFiltersState) => {
    const parts: string[] = [];

    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.vendorCategories.length)
      parts.push(`${filters.vendorCategories.length} categories`);
    if (filters.location.city) parts.push(filters.location.city);
    if (filters.priceRange.min || filters.priceRange.max) {
      const min = filters.priceRange.min ? `£${filters.priceRange.min}` : '£0';
      const max = filters.priceRange.max ? `£${filters.priceRange.max}` : '∞';
      parts.push(`${min} - ${max}`);
    }
    if (filters.reviewScore.minRating)
      parts.push(`${filters.reviewScore.minRating}+ stars`);

    return parts.length ? parts.join(' • ') : 'All vendors';
  };

  // Sort searches: pinned first, then by last used
  const sortedSearches = [...savedSearches].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastUsed.getTime() - a.lastUsed.getTime();
  });

  const visibleSearches = compact
    ? sortedSearches.slice(0, maxVisible)
    : sortedSearches;

  const SaveSearchDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSearch ? 'Edit Saved Search' : 'Save Search'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., London Wedding Photographers"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="search-description">Description (optional)</Label>
            <Input
              id="search-description"
              placeholder="Brief description of this search"
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="search-tags">Tags (optional)</Label>
            <Input
              id="search-tags"
              placeholder="photography, london, premium (comma-separated)"
              value={searchTags}
              onChange={(e) => setSearchTags(e.target.value)}
            />
          </div>

          {!editingSearch && currentFilters && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-1">Search Preview:</div>
              <div className="text-sm text-gray-600">
                {getFilterSummary(currentFilters)}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsDialogOpen(false);
              setEditingSearch(null);
              setSearchName('');
              setSearchDescription('');
              setSearchTags('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={editingSearch ? handleUpdateSearch : handleSaveSearch}
            disabled={!searchName.trim()}
          >
            {editingSearch ? 'Update' : 'Save'} Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const SearchCard = ({ search }: { search: SavedSearch }) => (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        search.isPinned && 'ring-2 ring-blue-200',
      )}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3
                className={cn(
                  'font-medium text-gray-900 truncate',
                  compact ? 'text-sm' : 'text-base',
                )}
              >
                {search.name}
              </h3>
              {search.isPinned && (
                <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />
              )}
              {search.hasAlerts && (
                <Bell className="w-3 h-3 text-orange-500 flex-shrink-0" />
              )}
            </div>

            {search.description && (
              <p
                className={cn(
                  'text-gray-600 mb-2',
                  compact ? 'text-xs' : 'text-sm',
                )}
              >
                {search.description}
              </p>
            )}

            <div
              className={cn(
                'text-gray-500 mb-2',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {getFilterSummary(search.filters)}
            </div>

            {search.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {search.tags.slice(0, compact ? 2 : 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {search.tags.length > (compact ? 2 : 3) && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    +{search.tags.length - (compact ? 2 : 3)}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Used {search.useCount} times</span>
              {search.resultCount && <span>{search.resultCount} results</span>}
            </div>
          </div>

          <div className="flex flex-col space-y-1 ml-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(search.id);
              }}
              className="p-1 h-auto"
            >
              {search.isPinned ? (
                <PinOff className="w-3 h-3" />
              ) : (
                <Pin className="w-3 h-3" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEditSearch(search);
              }}
              className="p-1 h-auto"
            >
              <Edit3 className="w-3 h-3" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 h-auto text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Saved Search</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{search.name}"? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteSearch(search.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadSearch(search);
            }}
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            Load Search
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleAlerts(search.id);
            }}
            className={cn(
              'px-3',
              search.hasAlerts ? 'text-orange-500' : 'text-gray-400',
            )}
          >
            {search.hasAlerts ? (
              <Bell className="w-3 h-3" />
            ) : (
              <BellOff className="w-3 h-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (visibleSearches.length === 0 && !compact) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Saved Searches
          </h3>
          <p className="text-gray-600 mb-4">
            Save your searches to quickly access them later
          </p>
          {currentFilters && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Current Search
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'font-semibold text-gray-900',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {compact ? 'Quick Searches' : 'Saved Searches'}
        </h3>

        {currentFilters && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="w-4 h-4 mr-1" />
                {compact ? 'Save' : 'Save Search'}
              </Button>
            </DialogTrigger>
          </Dialog>
        )}
      </div>

      <div
        className={cn(
          compact
            ? 'grid grid-cols-1 gap-3'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        )}
      >
        {visibleSearches.map((search) => (
          <div key={search.id} onClick={() => handleLoadSearch(search)}>
            <SearchCard search={search} />
          </div>
        ))}
      </div>

      {compact && savedSearches.length > maxVisible && (
        <Button variant="outline" className="w-full" size="sm">
          View all {savedSearches.length} saved searches
        </Button>
      )}

      <SaveSearchDialog />
    </div>
  );
}

export default SavedSearches;
