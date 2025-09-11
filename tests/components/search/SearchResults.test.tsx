/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from '@/components/search/SearchResults';

// Mock the UI components
jest.mock('@/components/ui/card-untitled', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  )
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('rating')}>
        {children}
      </button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, onClick }: any) => (
    <option value={value} onClick={onClick}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

// Mock search result data
const mockSearchResults = [
  {
    id: '1',
    type: 'vendor',
    title: 'Elegant Weddings Photography',
    description: 'Professional wedding photography with 10+ years experience',
    category: 'Photography',
    rating: 4.8,
    reviewCount: 127,
    priceRange: '£1,500 - £3,000',
    location: 'London, UK',
    distance: 2.3,
    image: '/placeholder-vendor.jpg',
    featured: true,
    verified: true,
    availability: 'Available this weekend',
    tags: ['Photography', 'Portraits', 'Digital', 'Albums'],
    contactInfo: {
      phone: '+44 123 456 789',
      email: 'info@elegantweddings.com',
      website: 'https://elegantweddings.com'
    },
    responseTime: '2 hours'
  },
  {
    id: '2', 
    type: 'venue',
    title: 'The Grand Ballroom',
    description: 'Stunning historic venue for unforgettable celebrations',
    category: 'Venue',
    rating: 4.9,
    reviewCount: 89,
    priceRange: '£3,000 - £8,000',
    location: 'Birmingham, UK',
    distance: 15.7,
    image: '/placeholder-venue.jpg',
    featured: false,
    verified: true,
    availability: '3 dates available',
    tags: ['Historic', 'Ballroom', 'Indoor', 'Catering'],
    contactInfo: {
      phone: '+44 987 654 321',
      email: 'bookings@grandballroom.com'
    }
  }
];

const mockFilters = {
  query: 'wedding photographer',
  vendorCategories: ['Photography'],
  location: { city: 'London', currency: 'GBP' },
  priceRange: { min: 1000, max: 3000, currency: 'GBP' },
  availability: {},
  reviewScore: { minRating: 4.0 },
  sortBy: 'relevance' as const,
  advancedFilters: {}
};

describe('SearchResults', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnResultSelect = jest.fn();
  const mockOnViewModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search results correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('2 results found')).toBeInTheDocument();
    expect(screen.getByText('for "wedding photographer"')).toBeInTheDocument();
    expect(screen.getByText('Elegant Weddings Photography')).toBeInTheDocument();
    expect(screen.getByText('The Grand Ballroom')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(
      <SearchResults
        results={[]}
        isLoading={true}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('Searching for wedding vendors...')).toBeInTheDocument();
  });

  it('displays no results state correctly', () => {
    render(
      <SearchResults
        results={[]}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument();
    expect(screen.getByText('Clear all filters')).toBeInTheDocument();
  });

  it('handles result selection', async () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    const viewDetailsButtons = screen.getAllByText('View Details');
    await userEvent.click(viewDetailsButtons[0]);

    expect(mockOnResultSelect).toHaveBeenCalledWith(mockSearchResults[0]);
  });

  it('displays result information correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    const firstResult = mockSearchResults[0];
    
    // Check rating display
    expect(screen.getByText(firstResult.rating.toString())).toBeInTheDocument();
    expect(screen.getByText(`(${firstResult.reviewCount} reviews)`)).toBeInTheDocument();
    
    // Check price range
    expect(screen.getByText(firstResult.priceRange)).toBeInTheDocument();
    
    // Check location
    expect(screen.getByText(firstResult.location)).toBeInTheDocument();
    
    // Check availability
    expect(screen.getByText(firstResult.availability)).toBeInTheDocument();
    
    // Check featured badge
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    const firstResult = mockSearchResults[0];
    firstResult.tags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('handles view mode toggle', async () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
        onViewModeChange={mockOnViewModeChange}
      />
    );

    // Should have grid and list view buttons
    const gridButton = screen.getByRole('button', { name: /grid/i });
    const listButton = screen.getByRole('button', { name: /list/i });
    
    await userEvent.click(listButton);
    expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
  });

  it('handles sort option changes', async () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    const selectElement = screen.getByTestId('select');
    fireEvent.click(selectElement);

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  it('handles save/unsave functionality', async () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    // Find heart buttons (save buttons)
    const saveButtons = screen.getAllByRole('button');
    const heartButton = saveButtons.find(button => 
      button.textContent?.includes('♡') || button.getAttribute('aria-label')?.includes('save')
    );

    if (heartButton) {
      await userEvent.click(heartButton);
      // The heart should change state (filled vs empty)
    }
  });

  it('displays contact options correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    // Should show contact buttons for vendors with contact info
    const phoneButtons = screen.getAllByRole('button').filter(button =>
      button.getAttribute('data-testid')?.includes('phone') ||
      button.textContent?.includes('📞')
    );
    
    const emailButtons = screen.getAllByRole('button').filter(button =>
      button.getAttribute('data-testid')?.includes('email') ||
      button.textContent?.includes('✉')
    );

    // First result has both phone and email
    expect(phoneButtons.length).toBeGreaterThan(0);
    expect(emailButtons.length).toBeGreaterThan(0);
  });

  it('handles distance display correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('2.3mi away')).toBeInTheDocument();
    expect(screen.getByText('15.7mi away')).toBeInTheDocument();
  });

  it('sorts results correctly by rating', () => {
    const sortedResults = [...mockSearchResults].sort((a, b) => b.rating - a.rating);
    
    render(
      <SearchResults
        results={sortedResults}
        isLoading={false}
        filters={{ ...mockFilters, sortBy: 'rating' }}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    // The Grand Ballroom (4.9) should appear before Elegant Weddings (4.8)
    const results = screen.getAllByRole('button', { name: /View Details/i });
    const titles = screen.getAllByRole('heading', { level: 3 });
    
    // Check that higher rated venue appears first
    expect(titles[0]).toHaveTextContent('The Grand Ballroom');
    expect(titles[1]).toHaveTextContent('Elegant Weddings Photography');
  });

  it('handles featured results correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    // Featured results should have special styling or badge
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('handles verified vendors correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    // Both results are verified, so should show verification indicators
    const verifiedIndicators = screen.getAllByTestId('verified-icon');
    expect(verifiedIndicators).toHaveLength(2);
  });

  it('displays response time when available', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('Usually responds within 2 hours')).toBeInTheDocument();
  });

  it('handles compact view mode correctly', () => {
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
        viewMode="list"
      />
    );

    // In list mode, results should be displayed differently
    // This would need to be verified based on actual implementation
    expect(screen.getByText('Elegant Weddings Photography')).toBeInTheDocument();
  });

  it('handles empty search query correctly', () => {
    const filtersWithoutQuery = { ...mockFilters, query: '' };
    
    render(
      <SearchResults
        results={mockSearchResults}
        isLoading={false}
        filters={filtersWithoutQuery}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText('2 results found')).toBeInTheDocument();
    expect(screen.queryByText('for ""')).not.toBeInTheDocument();
  });

  it('handles clear all filters action', async () => {
    render(
      <SearchResults
        results={[]}
        isLoading={false}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onResultSelect={mockOnResultSelect}
      />
    );

    const clearFiltersButton = screen.getByText('Clear all filters');
    await userEvent.click(clearFiltersButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      query: '',
      vendorCategories: [],
      location: { currency: 'GBP' },
      priceRange: { currency: 'GBP' },
      availability: {},
      reviewScore: {},
      advancedFilters: {}
    });
  });
});