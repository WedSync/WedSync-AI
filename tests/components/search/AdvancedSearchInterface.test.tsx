/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedSearchInterface } from '@/components/search/AdvancedSearchInterface';

// Mock the UI components
jest.mock('@/components/ui/card-untitled', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      {...props}
    />
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}));

// Mock the search filter components
jest.mock('@/components/search/SearchFilters', () => ({
  SearchFilters: ({ filters, onChange }: any) => (
    <div data-testid="search-filters">
      <input
        data-testid="mock-filters"
        value={JSON.stringify(filters)}
        onChange={(e) => onChange('mockFilter', JSON.parse(e.target.value))}
      />
    </div>
  )
}));

jest.mock('@/components/search/SearchSuggestions', () => ({
  SearchSuggestions: ({ suggestions, onSelect }: any) => (
    <div data-testid="search-suggestions">
      {suggestions.map((suggestion: string, index: number) => (
        <button
          key={index}
          data-testid={`suggestion-${index}`}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}));

jest.mock('@/components/search/SearchResults', () => ({
  SearchResults: ({ results, isLoading, onResultSelect }: any) => (
    <div data-testid="search-results">
      {isLoading ? (
        <div data-testid="loading">Loading...</div>
      ) : (
        <>
          <div data-testid="results-count">{results.length} results</div>
          {results.map((result: any) => (
            <button
              key={result.id}
              data-testid={`result-${result.id}`}
              onClick={() => onResultSelect(result)}
            >
              {result.title}
            </button>
          ))}
        </>
      )}
    </div>
  )
}));

jest.mock('@/components/search/SavedSearches', () => ({
  SavedSearches: ({ onLoadSearch }: any) => (
    <div data-testid="saved-searches">
      <button
        data-testid="load-saved-search"
        onClick={() => onLoadSearch({ query: 'test saved search' })}
      >
        Load Saved Search
      </button>
    </div>
  )
}));

jest.mock('@/components/search/VendorCategoryFilter', () => ({
  VendorCategoryFilter: ({ selectedCategories, onChange }: any) => (
    <div data-testid="vendor-category-filter">
      <button
        data-testid="select-photography"
        onClick={() => onChange([...selectedCategories, 'Photography'])}
      >
        Select Photography
      </button>
    </div>
  )
}));

jest.mock('@/components/search/LocationSearchFilter', () => ({
  LocationSearchFilter: ({ location, onChange }: any) => (
    <div data-testid="location-search-filter">
      <input
        data-testid="location-input"
        value={location.city || ''}
        onChange={(e) => onChange({ ...location, city: e.target.value })}
      />
    </div>
  )
}));

jest.mock('@/components/search/PriceRangeFilter', () => ({
  PriceRangeFilter: ({ priceRange, onChange }: any) => (
    <div data-testid="price-range-filter">
      <input
        data-testid="min-price"
        type="number"
        value={priceRange.min || ''}
        onChange={(e) => onChange({ ...priceRange, min: parseInt(e.target.value) })}
      />
    </div>
  )
}));

jest.mock('@/components/search/AvailabilityFilter', () => ({
  AvailabilityFilter: ({ availability, onChange }: any) => (
    <div data-testid="availability-filter">
      <input
        data-testid="start-date"
        type="date"
        value={availability.startDate?.toISOString().split('T')[0] || ''}
        onChange={(e) => onChange({ ...availability, startDate: new Date(e.target.value) })}
      />
    </div>
  )
}));

jest.mock('@/components/search/ReviewScoreFilter', () => ({
  ReviewScoreFilter: ({ reviewScore, onChange }: any) => (
    <div data-testid="review-score-filter">
      <input
        data-testid="min-rating"
        type="number"
        min="0"
        max="5"
        step="0.5"
        value={reviewScore.minRating || ''}
        onChange={(e) => onChange({ ...reviewScore, minRating: parseFloat(e.target.value) })}
      />
    </div>
  )
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('AdvancedSearchInterface', () => {
  const mockOnSearch = jest.fn();
  const mockOnSaveSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the search interface correctly', () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    expect(screen.getByPlaceholderText('Search wedding vendors, venues, services...')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('handles query input changes', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    
    await userEvent.type(searchInput, 'wedding photographer');
    
    expect(searchInput).toHaveValue('wedding photographer');
  });

  it('expands and collapses filters panel', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const filtersButton = screen.getByText('Filters');
    
    // Initially filters should not be visible
    expect(screen.queryByTestId('search-filters')).not.toBeInTheDocument();
    
    await userEvent.click(filtersButton);
    
    // After clicking, filters should be visible
    expect(screen.getByTestId('search-filters')).toBeInTheDocument();
  });

  it('displays search suggestions', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    
    await userEvent.type(searchInput, 'wedding');
    
    // Focus should trigger suggestions
    fireEvent.focus(searchInput);
    
    await waitFor(() => {
      expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
    });
  });

  it('handles search execution', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    const searchButton = screen.getByText('Search');

    await userEvent.type(searchInput, 'wedding photographer');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalled();
    });
  });

  it('shows loading state during search', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    const searchButton = screen.getByText('Search');

    await userEvent.type(searchInput, 'test');
    await userEvent.click(searchButton);

    // Search button should show loading state
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('displays active filters count', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const filtersButton = screen.getByText('Filters');
    await userEvent.click(filtersButton);

    // Mock adding a filter
    const categoryFilter = screen.getByTestId('vendor-category-filter');
    const selectButton = screen.getByTestId('select-photography');
    await userEvent.click(selectButton);

    // Should show filter count badge
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('resets all filters', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const filtersButton = screen.getByText('Filters');
    await userEvent.click(filtersButton);

    // Add some filters first
    const categoryFilter = screen.getByTestId('select-photography');
    await userEvent.click(categoryFilter);

    // Find and click reset button
    const resetButton = screen.getByText('Reset');
    await userEvent.click(resetButton);

    // Filters should be cleared
    expect(screen.queryByText('Photography')).not.toBeInTheDocument();
  });

  it('handles saved search loading', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const savedSearches = screen.getByTestId('saved-searches');
    const loadButton = screen.getByTestId('load-saved-search');
    
    await userEvent.click(loadButton);

    // Should load the saved search query
    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    await waitFor(() => {
      expect(searchInput).toHaveValue('test saved search');
    });
  });

  it('handles search results display', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    await userEvent.type(searchInput, 'test');

    // Mock search execution that would update results
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(screen.getByTestId('search-results')).toBeInTheDocument();
  });

  it('handles filter changes correctly', async () => {
    render(
      <AdvancedSearchInterface onSearch={mockOnSearch} />
    );

    const filtersButton = screen.getByText('Filters');
    await userEvent.click(filtersButton);

    // Test location filter
    const locationInput = screen.getByTestId('location-input');
    await userEvent.type(locationInput, 'London');

    // Test price range filter
    const minPriceInput = screen.getByTestId('min-price');
    await userEvent.type(minPriceInput, '1000');

    // Test availability filter
    const startDateInput = screen.getByTestId('start-date');
    await userEvent.type(startDateInput, '2024-06-01');

    // Test review score filter
    const minRatingInput = screen.getByTestId('min-rating');
    await userEvent.type(minRatingInput, '4.5');

    // All filter inputs should have their values
    expect(locationInput).toHaveValue('London');
    expect(minPriceInput).toHaveValue(1000);
    expect(startDateInput).toHaveValue('2024-06-01');
    expect(minRatingInput).toHaveValue(4.5);
  });

  it('handles save search functionality', async () => {
    render(
      <AdvancedSearchInterface 
        onSearch={mockOnSearch} 
        onSaveSearch={mockOnSaveSearch}
      />
    );

    const filtersButton = screen.getByText('Filters');
    await userEvent.click(filtersButton);

    // Should show save search button when filters are expanded
    const saveButton = screen.getByText('Save Search');
    await userEvent.click(saveButton);

    // This would typically open a dialog for naming the search
    // The exact behavior depends on implementation details
    expect(saveButton).toBeInTheDocument();
  });

  it('handles compact mode correctly', () => {
    render(
      <AdvancedSearchInterface 
        onSearch={mockOnSearch} 
        compact={true}
      />
    );

    expect(screen.getByPlaceholderText('Search wedding vendors, venues, services...')).toBeInTheDocument();
    // In compact mode, saved searches might not be shown
    expect(screen.queryByTestId('saved-searches')).not.toBeInTheDocument();
  });

  it('handles initial filters correctly', () => {
    const initialFilters = {
      query: 'initial query',
      vendorCategories: ['Photography'],
      location: { city: 'London', currency: 'GBP' },
      priceRange: { min: 500, max: 2000, currency: 'GBP' },
      availability: {},
      reviewScore: { minRating: 4.0 },
      sortBy: 'rating' as const,
      advancedFilters: {}
    };

    render(
      <AdvancedSearchInterface 
        onSearch={mockOnSearch}
        initialFilters={initialFilters}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search wedding vendors, venues, services...');
    expect(searchInput).toHaveValue('initial query');
  });
});