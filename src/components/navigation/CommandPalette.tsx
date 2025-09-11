'use client';

/**
 * WS-038: Command Palette Component (Cmd+K)
 * Enhanced search and navigation with keyboard shortcuts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  HashtagIcon,
  DocumentTextIcon,
  UsersIcon,
  CogIcon,
  ArrowRightIcon,
  CommandLineIcon,
} from '@heroicons/react/20/solid';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useNavigation,
  useNavigationSearch,
} from '@/lib/navigation/navigationContext';
import { NavigationItem } from '@/lib/navigation/roleBasedAccess';
import { useDeepLinking } from '@/lib/navigation/deepLinking';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'navigation' | 'action' | 'page' | 'recent' | 'suggestion';
  keywords?: string[];
  badge?: number;
}

interface RecentItem {
  id: string;
  title: string;
  href: string;
  timestamp: number;
  type: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { items, quickActions } = useNavigation();
  const { searchQuery, searchResults, search, clearSearch } =
    useNavigationSearch();
  const { getRecentLinks } = useDeepLinking();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent items
  useEffect(() => {
    if (isOpen) {
      const recent = getRecentLinks(10).map((link) => ({
        id: link.path,
        title: getPageTitle(link.path),
        href: link.path,
        timestamp: link.timestamp,
        type: 'recent',
      }));
      setRecentItems(recent);
    }
  }, [isOpen, getRecentLinks]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  // Update search results
  useEffect(() => {
    if (!query.trim()) {
      // Show default suggestions when no query
      const suggestions = [...getQuickSuggestions(), ...getRecentSuggestions()];
      setResults(suggestions);
      setSelectedIndex(0);
      return;
    }

    // Perform search
    search(query);
    const navigationResults = searchResults.map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: getItemSubtitle(item),
      href: item.href,
      icon: item.icon,
      type: 'navigation' as const,
      badge: item.badge,
    }));

    // Add action results
    const actionResults = getActionResults(query);

    // Add page results
    const pageResults = getPageResults(query);

    const allResults = [
      ...navigationResults,
      ...actionResults,
      ...pageResults,
    ].slice(0, 10); // Limit results

    setResults(allResults);
    setSelectedIndex(0);
  }, [query, search, searchResults]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, results, selectedIndex, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (result: SearchResult) => {
    // Add to recent items
    const newRecentItem: RecentItem = {
      id: result.id,
      title: result.title,
      href: result.href,
      timestamp: Date.now(),
      type: result.type,
    };

    setRecentItems((prev) => [
      newRecentItem,
      ...prev.filter((item) => item.id !== result.id).slice(0, 9),
    ]);

    // Navigate
    router.push(result.href);
    onClose();
  };

  const getQuickSuggestions = (): SearchResult[] => {
    return [
      {
        id: 'new-form',
        title: 'Create New Form',
        subtitle: 'Build a custom form',
        href: '/forms/builder',
        icon: DocumentTextIcon,
        type: 'action',
      },
      {
        id: 'import-clients',
        title: 'Import Clients',
        subtitle: 'Bulk import client data',
        href: '/clients/import',
        icon: UsersIcon,
        type: 'action',
      },
      {
        id: 'journey-builder',
        title: 'Journey Builder',
        subtitle: 'Create customer journey',
        href: '/journeys/builder',
        icon: HashtagIcon,
        type: 'action',
      },
      {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Account & preferences',
        href: '/settings',
        icon: CogIcon,
        type: 'navigation',
      },
    ];
  };

  const getRecentSuggestions = (): SearchResult[] => {
    return recentItems.slice(0, 5).map((item) => ({
      id: `recent-${item.id}`,
      title: item.title,
      subtitle: 'Recently visited',
      href: item.href,
      icon: ClockIcon,
      type: 'recent',
    }));
  };

  const getActionResults = (query: string): SearchResult[] => {
    const actions = [
      {
        keywords: ['create', 'new', 'form'],
        title: 'Create New Form',
        href: '/forms/builder',
        icon: DocumentTextIcon,
      },
      {
        keywords: ['import', 'client', 'bulk'],
        title: 'Import Clients',
        href: '/clients/import',
        icon: UsersIcon,
      },
      {
        keywords: ['journey', 'builder', 'workflow'],
        title: 'Journey Builder',
        href: '/journeys/builder',
        icon: HashtagIcon,
      },
      {
        keywords: ['settings', 'config', 'preferences'],
        title: 'Settings',
        href: '/settings',
        icon: CogIcon,
      },
    ];

    return actions
      .filter(
        (action) =>
          action.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query.toLowerCase()),
          ) || action.title.toLowerCase().includes(query.toLowerCase()),
      )
      .map((action) => ({
        id: `action-${action.href}`,
        title: action.title,
        subtitle: 'Quick action',
        href: action.href,
        icon: action.icon,
        type: 'action' as const,
      }));
  };

  const getPageResults = (query: string): SearchResult[] => {
    const pages = [
      { title: 'Dashboard', href: '/', keywords: ['home', 'overview', 'main'] },
      {
        title: 'Client Management',
        href: '/clients',
        keywords: ['customers', 'contacts'],
      },
      {
        title: 'Form Analytics',
        href: '/analytics',
        keywords: ['stats', 'reports', 'metrics'],
      },
      {
        title: 'Vendor Directory',
        href: '/vendors',
        keywords: ['suppliers', 'partners'],
      },
    ];

    return pages
      .filter(
        (page) =>
          page.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query.toLowerCase()),
          ) || page.title.toLowerCase().includes(query.toLowerCase()),
      )
      .map((page) => ({
        id: `page-${page.href}`,
        title: page.title,
        subtitle: 'Page',
        href: page.href,
        icon: DocumentTextIcon,
        type: 'page' as const,
      }));
  };

  const getItemSubtitle = (item: NavigationItem): string => {
    if (item.vendorSpecific?.length) {
      return `For ${item.vendorSpecific.join(', ')}`;
    }
    if (item.quickAction) {
      return 'Quick action';
    }
    return 'Navigation';
  };

  const getPageTitle = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    return segments[0]
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'recent':
        return ClockIcon;
      case 'action':
        return CommandLineIcon;
      case 'page':
        return DocumentTextIcon;
      default:
        return result.icon;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'recent':
        return 'text-blue-600 bg-blue-50';
      case 'action':
        return 'text-green-600 bg-green-50';
      case 'page':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search navigation, actions, and pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg placeholder-gray-400 border-none outline-none bg-transparent"
            />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 rounded">↵</kbd>
              <span>to select</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded">esc</kbd>
              <span>to close</span>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query ? (
            <div className="p-8 text-center text-gray-500">
              <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No results found for "{query}"</p>
              <p className="text-sm">
                Try searching for forms, clients, or settings
              </p>
            </div>
          ) : (
            <div className="p-2">
              {!query && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quick Actions
                  </div>
                  {getQuickSuggestions().map((result, index) => (
                    <ResultItem
                      key={result.id}
                      result={result}
                      isSelected={index === selectedIndex}
                      onClick={() => handleSelect(result)}
                    />
                  ))}

                  {recentItems.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">
                        Recent
                      </div>
                      {getRecentSuggestions().map((result, index) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={
                            index + getQuickSuggestions().length ===
                            selectedIndex
                          }
                          onClick={() => handleSelect(result)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}

              {query &&
                results.map((result, index) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => handleSelect(result)}
                  />
                ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↑↓</kbd>
                <span>navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd>
                <span>select</span>
              </div>
            </div>
            <div className="text-right">WedSync Command Palette</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function ResultItem({ result, isSelected, onClick }: ResultItemProps) {
  const Icon = getResultIcon(result);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
        isSelected ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100',
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
          isSelected ? 'bg-purple-200' : getResultTypeColor(result.type),
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          {result.badge && result.badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {result.badge > 99 ? '99+' : result.badge}
            </span>
          )}
        </div>
        {result.subtitle && (
          <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
        )}
      </div>

      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
    </button>
  );
}

function getResultIcon(result: SearchResult) {
  switch (result.type) {
    case 'recent':
      return ClockIcon;
    case 'action':
      return CommandLineIcon;
    case 'page':
      return DocumentTextIcon;
    default:
      return result.icon;
  }
}

export default CommandPalette;
