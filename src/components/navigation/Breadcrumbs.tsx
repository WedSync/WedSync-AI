'use client';

/**
 * WS-038: Breadcrumbs Component with History
 * Dynamic breadcrumb navigation with deep linking support
 */

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRightIcon,
  HomeIcon,
  EllipsisHorizontalIcon,
  ClockIcon,
  ShareIcon,
  BookmarkIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from '@/components/ui/dropdown';
import { useBreadcrumbs } from '@/lib/navigation/navigationContext';
import { useDeepLinking } from '@/lib/navigation/deepLinking';

interface BreadcrumbsProps {
  className?: string;
  maxItems?: number;
  showHome?: boolean;
  showActions?: boolean;
}

export function Breadcrumbs({
  className,
  maxItems = 5,
  showHome = true,
  showActions = true,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const { breadcrumbs } = useBreadcrumbs();
  const { getRecentLinks, createShareableLink } = useDeepLinking();
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out duplicate breadcrumbs and ensure proper structure
  const processedBreadcrumbs = breadcrumbs.reduce(
    (acc, current, index) => {
      // Always include the first item (usually Dashboard)
      if (index === 0) {
        acc.push(current);
        return acc;
      }

      // Skip if the previous item has the same href
      const previous = acc[acc.length - 1];
      if (previous && previous.href === current.href) {
        // Update the label to the more specific one
        acc[acc.length - 1] = current;
        return acc;
      }

      acc.push(current);
      return acc;
    },
    [] as typeof breadcrumbs,
  );

  // Determine which breadcrumbs to show
  const shouldCollapse = processedBreadcrumbs.length > maxItems;
  const visibleBreadcrumbs =
    shouldCollapse && !showAll
      ? [
          processedBreadcrumbs[0], // Always show first (Home/Dashboard)
          ...processedBreadcrumbs.slice(-2), // Show last 2 items
        ]
      : processedBreadcrumbs;

  const collapsedCount = shouldCollapse
    ? processedBreadcrumbs.length - 3 // Total minus visible items
    : 0;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // You could show a toast here
        console.log('URL copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBookmark = () => {
    // This would typically integrate with your bookmark system
    console.log('Bookmark added for:', pathname);
  };

  if (processedBreadcrumbs.length <= 1 && !showHome) {
    return null;
  }

  return (
    <nav
      ref={containerRef}
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1 flex-1 min-w-0">
        {/* Home icon for first item if showHome is true */}
        {showHome && processedBreadcrumbs[0] && (
          <li className="flex items-center">
            <Link
              href={processedBreadcrumbs[0].href}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-gray-100',
                processedBreadcrumbs[0].isActive
                  ? 'text-purple-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700',
              )}
              aria-current={
                processedBreadcrumbs[0].isActive ? 'page' : undefined
              }
            >
              <HomeIcon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">
                {processedBreadcrumbs[0].label}
              </span>
            </Link>
          </li>
        )}

        {/* Collapsed indicator */}
        {shouldCollapse && !showAll && collapsedCount > 0 && (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <li>
              <Dropdown>
                <DropdownButton className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                  <span className="text-xs">+{collapsedCount}</span>
                </DropdownButton>
                <DropdownMenu>
                  {processedBreadcrumbs.slice(1, -2).map((crumb, index) => (
                    <DropdownItem key={index} href={crumb.href}>
                      <span className="truncate">{crumb.label}</span>
                    </DropdownItem>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <DropdownItem onClick={() => setShowAll(true)}>
                    <span>Show all breadcrumbs</span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </li>
          </>
        )}

        {/* Visible breadcrumbs */}
        {visibleBreadcrumbs.slice(showHome ? 1 : 0).map((crumb, index) => {
          const isLast =
            index === visibleBreadcrumbs.slice(showHome ? 1 : 0).length - 1;

          return (
            <React.Fragment key={`${crumb.href}-${index}`}>
              <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <li className="flex items-center min-w-0">
                {isLast ? (
                  <span className="px-2 py-1 text-gray-900 font-medium truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}

        {/* Show all button when collapsed */}
        {shouldCollapse && showAll && (
          <li className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Collapse
            </Button>
          </li>
        )}
      </ol>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 ml-4">
          {/* Recent pages dropdown */}
          <Dropdown>
            <DropdownButton
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              aria-label="Recent pages"
            >
              <ClockIcon className="h-4 w-4" />
            </DropdownButton>
            <DropdownMenu align="end" className="w-64">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">
                Recent Pages
              </div>
              {getRecentLinks(5).map((link, index) => (
                <DropdownItem key={index} href={link.path}>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {formatPageTitle(link.path)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(link.timestamp)}
                    </span>
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Share current page"
          >
            <ShareIcon className="h-4 w-4" />
          </Button>

          {/* Bookmark button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Bookmark current page"
          >
            <BookmarkIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}

// Compact breadcrumbs for mobile
export function MobileBreadcrumbs({ className }: { className?: string }) {
  const { breadcrumbs } = useBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const parentPage =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <nav className={cn('flex items-center text-sm lg:hidden', className)}>
      {parentPage && (
        <>
          <Link
            href={parentPage.href}
            className="text-gray-500 hover:text-gray-700 truncate max-w-[120px]"
          >
            {parentPage.label}
          </Link>
          <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
        </>
      )}
      <span className="text-gray-900 font-medium truncate">
        {currentPage?.label}
      </span>
    </nav>
  );
}

// Structured data breadcrumbs for SEO
export function StructuredBreadcrumbs() {
  const { breadcrumbs } = useBreadcrumbs();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: `${window.location.origin}${crumb.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// Helper functions
function formatPageTitle(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';

  return segments[segments.length - 1]
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default Breadcrumbs;
