'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PersonalizationTokensProps,
  PersonalizationToken,
} from '@/types/communications';
import {
  TagIcon,
  SearchIcon,
  UserIcon,
  CalendarIcon,
  HashIcon,
  TypeIcon,
  InfoIcon,
} from 'lucide-react';

const TOKEN_CATEGORIES = {
  guest: {
    label: 'Guest Info',
    icon: <UserIcon className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-100',
  },
  wedding: {
    label: 'Wedding Details',
    icon: <CalendarIcon className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-100',
  },
  logistics: {
    label: 'Logistics',
    icon: <HashIcon className="w-4 h-4" />,
    color: 'text-green-600 bg-green-100',
  },
  custom: {
    label: 'Custom',
    icon: <TypeIcon className="w-4 h-4" />,
    color: 'text-orange-600 bg-orange-100',
  },
} as const;

function getTokenCategory(
  token: PersonalizationToken,
): keyof typeof TOKEN_CATEGORIES {
  if (token.token.includes('name') || token.token.includes('guest'))
    return 'guest';
  if (token.token.includes('wedding') || token.token.includes('date'))
    return 'wedding';
  if (token.token.includes('table') || token.token.includes('seat'))
    return 'logistics';
  return 'custom';
}

export function PersonalizationTokens({
  availableTokens,
  onTokenSelect,
  className,
}: PersonalizationTokensProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    keyof typeof TOKEN_CATEGORIES | 'all'
  >('all');
  const [hoveredToken, setHoveredToken] = useState<string | null>(null);

  const filteredTokens = useMemo(() => {
    let tokens = availableTokens;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      tokens = tokens.filter(
        (token) =>
          token.display_name.toLowerCase().includes(search) ||
          token.description.toLowerCase().includes(search) ||
          token.token.toLowerCase().includes(search),
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      tokens = tokens.filter(
        (token) => getTokenCategory(token) === selectedCategory,
      );
    }

    return tokens;
  }, [availableTokens, searchTerm, selectedCategory]);

  const tokensByCategory = useMemo(() => {
    const grouped = filteredTokens.reduce(
      (acc, token) => {
        const category = getTokenCategory(token);
        if (!acc[category]) acc[category] = [];
        acc[category].push(token);
        return acc;
      },
      {} as Record<keyof typeof TOKEN_CATEGORIES, PersonalizationToken[]>,
    );

    return grouped;
  }, [filteredTokens]);

  const handleTokenClick = (token: PersonalizationToken) => {
    onTokenSelect(token);
    // Optional: show a brief success indicator
    // Could add a toast notification here
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-6 space-y-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="bg-primary-100 p-2 rounded-lg">
          <TagIcon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Personalization</h3>
          <p className="text-sm text-gray-600">Add personal touches</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
        />
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All ({availableTokens.length})
          </button>

          {Object.entries(TOKEN_CATEGORIES).map(([key, category]) => {
            const count = availableTokens.filter(
              (token) => getTokenCategory(token) === key,
            ).length;
            if (count === 0) return null;

            return (
              <button
                key={key}
                onClick={() =>
                  setSelectedCategory(key as keyof typeof TOKEN_CATEGORIES)
                }
                className={cn(
                  'flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                  selectedCategory === key
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                <span className={cn('p-0.5 rounded', category.color)}>
                  {category.icon}
                </span>
                <span>{category.label}</span>
                <span className="text-xs">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tokens List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {selectedCategory === 'all' ? (
          // Show all tokens grouped by category
          Object.entries(tokensByCategory).map(([categoryKey, tokens]) => {
            const category =
              TOKEN_CATEGORIES[categoryKey as keyof typeof TOKEN_CATEGORIES];
            if (!tokens.length) return null;

            return (
              <div key={categoryKey} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <span className={cn('p-1 rounded', category.color)}>
                    {category.icon}
                  </span>
                  <span>{category.label}</span>
                </div>

                <div className="space-y-1 pl-2">
                  {tokens.map((token) => (
                    <TokenButton
                      key={token.token}
                      token={token}
                      onClick={() => handleTokenClick(token)}
                      onHover={setHoveredToken}
                      isHovered={hoveredToken === token.token}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Show tokens for selected category
          <div className="space-y-1">
            {filteredTokens.map((token) => (
              <TokenButton
                key={token.token}
                token={token}
                onClick={() => handleTokenClick(token)}
                onHover={setHoveredToken}
                isHovered={hoveredToken === token.token}
              />
            ))}
          </div>
        )}

        {filteredTokens.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TagIcon className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No tokens found</p>
            {searchTerm && (
              <p className="text-xs mt-1">
                Try adjusting your search or category filter
              </p>
            )}
          </div>
        )}
      </div>

      {/* Usage Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">How to use</p>
            <p className="text-blue-700">
              Click any token to insert it at your cursor position. Tokens will
              be replaced with actual guest data when messages are sent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TokenButtonProps {
  token: PersonalizationToken;
  onClick: () => void;
  onHover: (tokenId: string | null) => void;
  isHovered: boolean;
}

function TokenButton({ token, onClick, onHover, isHovered }: TokenButtonProps) {
  return (
    <div
      className="group relative"
      onMouseEnter={() => onHover(token.token)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200',
          'hover:shadow-sm hover:border-primary-300',
          isHovered
            ? 'bg-primary-50 border-primary-200'
            : 'bg-white border-gray-200 hover:bg-gray-50',
        )}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-medium text-primary-600">
              {token.token}
            </span>
            {token.required && (
              <span className="text-xs font-medium text-red-500">Required</span>
            )}
          </div>

          <div className="text-sm font-medium text-gray-900">
            {token.display_name}
          </div>

          <div className="text-xs text-gray-600">{token.description}</div>

          <div className="text-xs text-gray-500 italic">
            Example: {token.example_value}
          </div>
        </div>
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute z-10 left-full ml-2 top-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          Click to insert
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
            <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}
