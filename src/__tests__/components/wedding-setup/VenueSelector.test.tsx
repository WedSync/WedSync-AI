/**
 * @file VenueSelector.test.tsx
 * @description Comprehensive tests for the VenueSelector component (Team A)
 * @coverage Venue search, filtering, selection, mapping, accessibility, performance
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VenueSelector } from '@/components/wedding-setup/VenueSelector';

// Mock dependencies
vi.mock('@/lib/supabase/client');
vi.mock('@/hooks/useVenueSearch');
vi.mock('@/components/ui/Map');

const mockOnSelect = vi.fn();
const mockOnChange = vi.fn();

const defaultProps = {
  onSelect: mockOnSelect,
  onChange: mockOnChange,
  selectedVenue: null,
  isRequired: true,
};

const mockVenues = [
  {
    id: '1',
    name: 'Grand Ballroom Hotel',
    address: '123 Main St, City, State 12345',
    capacity: 200,
    priceRange: '$$$',
    rating: 4.5,
    images: ['image1.jpg', 'image2.jpg'],
    amenities: ['Parking', 'Catering Kitchen', 'Dance Floor'],
    coordinates: { lat: 40.7128, lng: -74.006 },
    verified: true,
  },
  {
    id: '2',
    name: 'Garden Pavilion',
    address: '456 Park Ave, City, State 12345',
    capacity: 150,
    priceRange: '$$',
    rating: 4.2,
    images: ['image3.jpg'],
    amenities: ['Outdoor Space', 'Garden Views'],
    coordinates: { lat: 40.7589, lng: -73.9851 },
    verified: false,
  },
];

describe('VenueSelector', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the useVenueSearch hook
    vi.mocked(useVenueSearch).mockReturnValue({
      venues: mockVenues,
      loading: false,
      error: null,
      searchVenues: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
    });
  });

  describe('Initial Rendering', () => {
    it('renders venue selector with search functionality', () => {
      render(<VenueSelector {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Search venues by name or location'),
      ).toBeInTheDocument();
      expect(screen.getByText('Filter Options')).toBeInTheDocument();
      expect(screen.getByText('Map View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('displays venues in list format by default', () => {
      render(<VenueSelector {...defaultProps} />);

      expect(screen.getByText('Grand Ballroom Hotel')).toBeInTheDocument();
      expect(screen.getByText('Garden Pavilion')).toBeInTheDocument();
      expect(
        screen.getByText('123 Main St, City, State 12345'),
      ).toBeInTheDocument();
    });

    it('shows loading state when venues are being fetched', () => {
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: [],
        loading: true,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      expect(screen.getByTestId('venues-loading')).toBeInTheDocument();
      expect(screen.getByText('Searching for venues...')).toBeInTheDocument();
    });

    it('displays error message when venue search fails', () => {
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: [],
        loading: false,
        error: 'Failed to load venues',
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      expect(screen.getByText('Failed to load venues')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Venue Search', () => {
    it('performs search when user types in search input', async () => {
      const mockSearchVenues = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: mockVenues,
        loading: false,
        error: null,
        searchVenues: mockSearchVenues,
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );
      await user.type(searchInput, 'ballroom');

      await waitFor(
        () => {
          expect(mockSearchVenues).toHaveBeenCalledWith('ballroom');
        },
        { timeout: 1000 },
      );
    });

    it('debounces search input to avoid excessive API calls', async () => {
      const mockSearchVenues = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: mockVenues,
        loading: false,
        error: null,
        searchVenues: mockSearchVenues,
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );

      // Rapid typing should only trigger one search
      await user.type(searchInput, 'ball', { delay: 50 });

      await waitFor(
        () => {
          expect(mockSearchVenues).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );
    });

    it('clears search results when search input is cleared', async () => {
      const mockSearchVenues = vi.fn();
      render(<VenueSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );
      await user.type(searchInput, 'ballroom');

      // Clear search
      await user.clear(searchInput);

      await waitFor(() => {
        expect(mockSearchVenues).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Venue Filtering', () => {
    it('shows filter options panel', async () => {
      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      expect(screen.getByText('Capacity')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Amenities')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Distance')).toBeInTheDocument();
    });

    it('applies capacity filters correctly', async () => {
      const mockSetFilters = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: mockVenues,
        loading: false,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: mockSetFilters,
      });

      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      const minCapacityInput = screen.getByLabelText('Minimum Capacity');
      await user.type(minCapacityInput, '150');

      const maxCapacityInput = screen.getByLabelText('Maximum Capacity');
      await user.type(maxCapacityInput, '300');

      const applyButton = screen.getByRole('button', {
        name: /apply filters/i,
      });
      await user.click(applyButton);

      expect(mockSetFilters).toHaveBeenCalledWith({
        capacity: { min: 150, max: 300 },
      });
    });

    it('applies price range filters', async () => {
      const mockSetFilters = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: mockVenues,
        loading: false,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: mockSetFilters,
      });

      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      const priceRangeSelect = screen.getByLabelText('Price Range');
      await user.selectOptions(priceRangeSelect, ['$$', '$$$']);

      const applyButton = screen.getByRole('button', {
        name: /apply filters/i,
      });
      await user.click(applyButton);

      expect(mockSetFilters).toHaveBeenCalledWith({
        priceRange: ['$$', '$$$'],
      });
    });

    it('filters by amenities', async () => {
      const mockSetFilters = vi.fn();
      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      const parkingCheckbox = screen.getByLabelText('Parking');
      const cateringCheckbox = screen.getByLabelText('Catering Kitchen');

      await user.click(parkingCheckbox);
      await user.click(cateringCheckbox);

      const applyButton = screen.getByRole('button', {
        name: /apply filters/i,
      });
      await user.click(applyButton);

      expect(mockSetFilters).toHaveBeenCalledWith({
        amenities: ['Parking', 'Catering Kitchen'],
      });
    });

    it('clears all filters when clear button is clicked', async () => {
      const mockSetFilters = vi.fn();
      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      const clearButton = screen.getByRole('button', {
        name: /clear all filters/i,
      });
      await user.click(clearButton);

      expect(mockSetFilters).toHaveBeenCalledWith({});
    });
  });

  describe('Venue Selection', () => {
    it('selects venue when clicked', async () => {
      render(<VenueSelector {...defaultProps} />);

      const venueCard = screen.getByTestId('venue-card-1');
      await user.click(venueCard);

      expect(mockOnSelect).toHaveBeenCalledWith(mockVenues[0]);
      expect(mockOnChange).toHaveBeenCalledWith(mockVenues[0]);
    });

    it('highlights selected venue', () => {
      const selectedVenue = mockVenues[0];
      render(<VenueSelector {...defaultProps} selectedVenue={selectedVenue} />);

      const venueCard = screen.getByTestId('venue-card-1');
      expect(venueCard).toHaveClass('selected');
    });

    it('shows venue details modal when info button clicked', async () => {
      render(<VenueSelector {...defaultProps} />);

      const infoButton = screen.getByTestId('venue-info-1');
      await user.click(infoButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Venue Details')).toBeInTheDocument();
      expect(screen.getByText('Grand Ballroom Hotel')).toBeInTheDocument();
    });

    it('allows deselecting venue', async () => {
      const selectedVenue = mockVenues[0];
      render(<VenueSelector {...defaultProps} selectedVenue={selectedVenue} />);

      const deselectButton = screen.getByRole('button', {
        name: /deselect venue/i,
      });
      await user.click(deselectButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null);
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Map View', () => {
    it('switches to map view when map tab is clicked', async () => {
      render(<VenueSelector {...defaultProps} />);

      const mapTab = screen.getByText('Map View');
      await user.click(mapTab);

      expect(screen.getByTestId('venues-map')).toBeInTheDocument();
      expect(screen.getByTestId('map-markers')).toBeInTheDocument();
    });

    it('displays venue markers on map', async () => {
      render(<VenueSelector {...defaultProps} />);

      const mapTab = screen.getByText('Map View');
      await user.click(mapTab);

      // Should show markers for both venues
      expect(screen.getByTestId('map-marker-1')).toBeInTheDocument();
      expect(screen.getByTestId('map-marker-2')).toBeInTheDocument();
    });

    it('shows venue info popup when marker is clicked', async () => {
      render(<VenueSelector {...defaultProps} />);

      const mapTab = screen.getByText('Map View');
      await user.click(mapTab);

      const marker = screen.getByTestId('map-marker-1');
      await user.click(marker);

      expect(screen.getByTestId('venue-popup')).toBeInTheDocument();
      expect(screen.getByText('Grand Ballroom Hotel')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 200')).toBeInTheDocument();
    });

    it('updates map center based on search location', async () => {
      const mockUpdateMapCenter = vi.fn();
      render(
        <VenueSelector
          {...defaultProps}
          onMapCenterChange={mockUpdateMapCenter}
        />,
      );

      const mapTab = screen.getByText('Map View');
      await user.click(mapTab);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );
      await user.type(searchInput, 'New York City');

      await waitFor(() => {
        expect(mockUpdateMapCenter).toHaveBeenCalledWith(
          expect.objectContaining({
            lat: expect.any(Number),
            lng: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('Venue Cards', () => {
    it('displays venue information correctly', () => {
      render(<VenueSelector {...defaultProps} />);

      // Check venue 1 details
      expect(screen.getByText('Grand Ballroom Hotel')).toBeInTheDocument();
      expect(
        screen.getByText('123 Main St, City, State 12345'),
      ).toBeInTheDocument();
      expect(screen.getByText('Capacity: 200')).toBeInTheDocument();
      expect(screen.getByText('$$$')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();

      // Check amenities display
      expect(screen.getByText('Parking')).toBeInTheDocument();
      expect(screen.getByText('Catering Kitchen')).toBeInTheDocument();
      expect(screen.getByText('Dance Floor')).toBeInTheDocument();
    });

    it('shows verified badge for verified venues', () => {
      render(<VenueSelector {...defaultProps} />);

      const venue1Card = screen.getByTestId('venue-card-1');
      expect(venue1Card).toContainElement(screen.getByTestId('verified-badge'));

      const venue2Card = screen.getByTestId('venue-card-2');
      expect(venue2Card).not.toContainElement(
        screen.queryByTestId('verified-badge'),
      );
    });

    it('displays venue images with proper fallback', () => {
      render(<VenueSelector {...defaultProps} />);

      const venueImage1 = screen.getByTestId('venue-image-1');
      expect(venueImage1).toHaveAttribute(
        'src',
        expect.stringContaining('image1.jpg'),
      );
      expect(venueImage1).toHaveAttribute('alt', 'Grand Ballroom Hotel');

      // Test fallback for venues without images
      const venuesWithoutImages = [...mockVenues];
      venuesWithoutImages[1].images = [];

      vi.mocked(useVenueSearch).mockReturnValue({
        venues: venuesWithoutImages,
        loading: false,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      const venueImage2 = screen.getByTestId('venue-image-2');
      expect(venueImage2).toHaveAttribute(
        'src',
        expect.stringContaining('placeholder'),
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<VenueSelector {...defaultProps} />);

      expect(
        screen.getByRole('region', { name: 'Venue selector' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();

      const venueCards = screen.getAllByRole('button');
      venueCards.forEach((card) => {
        expect(card).toHaveAttribute('aria-describedby');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<VenueSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );
      searchInput.focus();

      // Tab through venue cards
      await user.tab();
      expect(screen.getByTestId('venue-card-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('venue-card-2')).toHaveFocus();

      // Enter key should select venue
      await user.keyboard('{Enter}');
      expect(mockOnSelect).toHaveBeenCalledWith(mockVenues[1]);
    });

    it('announces venue selection to screen readers', async () => {
      render(<VenueSelector {...defaultProps} />);

      const venueCard = screen.getByTestId('venue-card-1');
      await user.click(venueCard);

      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toHaveTextContent('Grand Ballroom Hotel selected');
    });

    it('provides proper focus management in modals', async () => {
      render(<VenueSelector {...defaultProps} />);

      const infoButton = screen.getByTestId('venue-info-1');
      await user.click(infoButton);

      // Focus should move to modal
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      // Escape key should close modal and return focus
      await user.keyboard('{Escape}');
      expect(infoButton).toHaveFocus();
    });
  });

  describe('Mobile Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('adapts layout for mobile screens', () => {
      render(<VenueSelector {...defaultProps} />);

      const venueSelector = screen.getByTestId('venue-selector');
      expect(venueSelector).toHaveClass('mobile-layout');

      // Venue cards should stack on mobile
      const venueList = screen.getByTestId('venue-list');
      expect(venueList).toHaveClass('flex-col');
    });

    it('shows mobile-optimized filter panel', async () => {
      render(<VenueSelector {...defaultProps} />);

      const filterButton = screen.getByText('Filter Options');
      await user.click(filterButton);

      // Filter panel should be fullscreen on mobile
      const filterPanel = screen.getByTestId('filter-panel');
      expect(filterPanel).toHaveClass('mobile-fullscreen');
    });

    it('supports touch gestures for venue cards', async () => {
      render(<VenueSelector {...defaultProps} />);

      const venueCard = screen.getByTestId('venue-card-1');

      // Simulate touch events
      fireEvent.touchStart(venueCard, {
        touches: [{ clientX: 0, clientY: 0 }],
      });
      fireEvent.touchEnd(venueCard, {
        changedTouches: [{ clientX: 0, clientY: 0 }],
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockVenues[0]);
    });
  });

  describe('Performance', () => {
    it('virtualizes venue list for large datasets', () => {
      const manyVenues = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVenues[0],
        id: i.toString(),
        name: `Venue ${i}`,
      }));

      vi.mocked(useVenueSearch).mockReturnValue({
        venues: manyVenues,
        loading: false,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      // Only visible items should be rendered
      const renderedVenues = screen.getAllByTestId(/venue-card-\d+/);
      expect(renderedVenues.length).toBeLessThan(50); // Assuming viewport shows ~20 items
    });

    it('lazy loads venue images', () => {
      render(<VenueSelector {...defaultProps} />);

      const venueImages = screen.getAllByTestId(/venue-image-\d+/);
      venueImages.forEach((image) => {
        expect(image).toHaveAttribute('loading', 'lazy');
      });
    });

    it('caches search results', async () => {
      const mockSearchVenues = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: mockVenues,
        loading: false,
        error: null,
        searchVenues: mockSearchVenues,
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search venues by name or location',
      );

      // Same search twice should only call API once
      await user.type(searchInput, 'ballroom');
      await user.clear(searchInput);
      await user.type(searchInput, 'ballroom');

      await waitFor(() => {
        expect(mockSearchVenues).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles venue loading errors gracefully', () => {
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: [],
        loading: false,
        error: 'Failed to load venues',
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      expect(screen.getByText('Failed to load venues')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('retries venue search on error', async () => {
      const mockSearchVenues = vi.fn();
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: [],
        loading: false,
        error: 'Failed to load venues',
        searchVenues: mockSearchVenues,
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockSearchVenues).toHaveBeenCalled();
    });

    it('shows empty state when no venues found', () => {
      vi.mocked(useVenueSearch).mockReturnValue({
        venues: [],
        loading: false,
        error: null,
        searchVenues: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
      });

      render(<VenueSelector {...defaultProps} />);

      expect(screen.getByText('No venues found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filters'),
      ).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with external venue APIs', async () => {
      const mockExternalSearch = vi.fn();
      render(<VenueSelector {...defaultProps} enableExternalSearch={true} />);

      const externalSearchButton = screen.getByText('Search External Venues');
      await user.click(externalSearchButton);

      expect(
        screen.getByText('Searching external venue databases...'),
      ).toBeInTheDocument();
    });

    it('allows custom venue entry', async () => {
      render(<VenueSelector {...defaultProps} allowCustomVenue={true} />);

      const customVenueButton = screen.getByText('Add Custom Venue');
      await user.click(customVenueButton);

      expect(
        screen.getByRole('dialog', { name: 'Add Custom Venue' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Venue Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
    });
  });
});
