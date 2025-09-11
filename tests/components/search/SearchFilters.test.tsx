/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VendorCategoryFilter } from '@/components/search/VendorCategoryFilter';
import { LocationSearchFilter } from '@/components/search/LocationSearchFilter';
import { PriceRangeFilter } from '@/components/search/PriceRangeFilter';
import { AvailabilityFilter } from '@/components/search/AvailabilityFilter';
import { ReviewScoreFilter } from '@/components/search/ReviewScoreFilter';

// Mock UI components
jest.mock('@/components/ui/card-untitled', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, type, ...props }: any) => (
    <input 
      type={type}
      onChange={onChange} 
      value={value} 
      {...props}
    />
  )
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  )
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step }: any) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    />
  )
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  )
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('Search Filter Components', () => {
  describe('VendorCategoryFilter', () => {
    const mockOnChange = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders category options correctly', () => {
      render(
        <VendorCategoryFilter
          selectedCategories={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Videography')).toBeInTheDocument();
      expect(screen.getByText('Venues')).toBeInTheDocument();
    });

    it('handles category selection', async () => {
      render(
        <VendorCategoryFilter
          selectedCategories={[]}
          onChange={mockOnChange}
        />
      );

      const photographyCheckbox = screen.getByRole('checkbox', { name: /photography/i });
      await userEvent.click(photographyCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith(['photography']);
    });

    it('displays selected categories', () => {
      render(
        <VendorCategoryFilter
          selectedCategories={['photography', 'venues']}
          onChange={mockOnChange}
        />
      );

      const photographyCheckbox = screen.getByRole('checkbox', { name: /photography/i });
      const venuesCheckbox = screen.getByRole('checkbox', { name: /venues/i });

      expect(photographyCheckbox).toBeChecked();
      expect(venuesCheckbox).toBeChecked();
    });

    it('handles search functionality', async () => {
      render(
        <VendorCategoryFilter
          selectedCategories={[]}
          onChange={mockOnChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search categories...');
      await userEvent.type(searchInput, 'photo');

      // Should filter categories to show only Photography related
      expect(screen.getByText('Photography')).toBeInTheDocument();
    });
  });

  describe('LocationSearchFilter', () => {
    const mockOnChange = jest.fn();
    const mockLocation = {
      city: 'London',
      region: 'Greater London',
      currency: 'GBP'
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock geolocation API
      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: jest.fn((success) => 
            success({
              coords: {
                latitude: 51.5074,
                longitude: -0.1278
              }
            })
          )
        }
      });
    });

    it('renders location input correctly', () => {
      render(
        <LocationSearchFilter
          location={mockLocation}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByPlaceholderText('Enter city, postcode, or location...')).toBeInTheDocument();
    });

    it('handles location input changes', async () => {
      render(
        <LocationSearchFilter
          location={{ currency: 'GBP' }}
          onChange={mockOnChange}
        />
      );

      const locationInput = screen.getByPlaceholderText('Enter city, postcode, or location...');
      await userEvent.type(locationInput, 'Birmingham');

      expect(locationInput).toHaveValue('Birmingham');
    });

    it('handles radius changes', async () => {
      render(
        <LocationSearchFilter
          location={mockLocation}
          onChange={mockOnChange}
        />
      );

      const radiusSlider = screen.getByRole('slider');
      fireEvent.change(radiusSlider, { target: { value: '50' } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('shows popular locations when no location is set', () => {
      render(
        <LocationSearchFilter
          location={{ currency: 'GBP' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Popular Locations')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Birmingham')).toBeInTheDocument();
    });

    it('handles current location request', async () => {
      render(
        <LocationSearchFilter
          location={{ currency: 'GBP' }}
          onChange={mockOnChange}
          allowCurrentLocation={true}
        />
      );

      const currentLocationButton = screen.getByText('Use Current Location');
      await userEvent.click(currentLocationButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('PriceRangeFilter', () => {
    const mockOnChange = jest.fn();
    const mockPriceRange = {
      min: 1000,
      max: 3000,
      currency: 'GBP'
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders price range inputs correctly', () => {
      render(
        <PriceRangeFilter
          priceRange={mockPriceRange}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText(/minimum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum/i)).toBeInTheDocument();
    });

    it('handles price input changes', async () => {
      render(
        <PriceRangeFilter
          priceRange={{ currency: 'GBP' }}
          onChange={mockOnChange}
        />
      );

      const minInput = screen.getByLabelText(/minimum/i);
      await userEvent.type(minInput, '500');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('displays budget ranges correctly', () => {
      render(
        <PriceRangeFilter
          priceRange={{ currency: 'GBP' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Budget-Friendly')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('handles currency selection', async () => {
      render(
        <PriceRangeFilter
          priceRange={{ currency: 'GBP' }}
          onChange={mockOnChange}
          showCurrencySelector={true}
        />
      );

      const currencySelect = screen.getByDisplayValue('GBP');
      fireEvent.change(currencySelect, { target: { value: 'USD' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        currency: 'USD'
      });
    });

    it('shows price per person calculation', async () => {
      render(
        <PriceRangeFilter
          priceRange={mockPriceRange}
          onChange={mockOnChange}
        />
      );

      const perPersonToggle = screen.getByRole('checkbox', { name: /price per person/i });
      await userEvent.click(perPersonToggle);

      expect(screen.getByText(/per person/i)).toBeInTheDocument();
    });
  });

  describe('AvailabilityFilter', () => {
    const mockOnChange = jest.fn();
    const mockAvailability = {
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
      flexible: true
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders date inputs correctly', () => {
      render(
        <AvailabilityFilter
          availability={mockAvailability}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
    });

    it('handles date changes', async () => {
      render(
        <AvailabilityFilter
          availability={{ flexible: false }}
          onChange={mockOnChange}
        />
      );

      const startDateInput = screen.getByLabelText(/from/i);
      await userEvent.type(startDateInput, '2024-07-01');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('displays day of week preferences', () => {
      render(
        <AvailabilityFilter
          availability={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('handles flexible dates toggle', async () => {
      render(
        <AvailabilityFilter
          availability={{ flexible: false }}
          onChange={mockOnChange}
        />
      );

      const flexibleToggle = screen.getByRole('checkbox', { name: /flexible/i });
      await userEvent.click(flexibleToggle);

      expect(mockOnChange).toHaveBeenCalledWith({ flexible: true });
    });

    it('shows seasonal preferences', () => {
      render(
        <AvailabilityFilter
          availability={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/preferred season/i)).toBeInTheDocument();
      expect(screen.getByText(/time of day/i)).toBeInTheDocument();
    });
  });

  describe('ReviewScoreFilter', () => {
    const mockOnChange = jest.fn();
    const mockReviewScore = {
      minRating: 4.5,
      minReviews: 20,
      verifiedOnly: true
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders rating controls correctly', () => {
      render(
        <ReviewScoreFilter
          reviewScore={mockReviewScore}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/minimum rating/i)).toBeInTheDocument();
      expect(screen.getByText(/minimum reviews/i)).toBeInTheDocument();
    });

    it('handles rating changes', async () => {
      render(
        <ReviewScoreFilter
          reviewScore={{}}
          onChange={mockOnChange}
        />
      );

      const ratingSlider = screen.getByRole('slider');
      fireEvent.change(ratingSlider, { target: { value: '4' } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles review count changes', async () => {
      render(
        <ReviewScoreFilter
          reviewScore={{}}
          onChange={mockOnChange}
        />
      );

      const reviewInput = screen.getByPlaceholderText(/e\.g\., 10/i);
      await userEvent.type(reviewInput, '25');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('displays quality filters', () => {
      render(
        <ReviewScoreFilter
          reviewScore={{}}
          onChange={mockOnChange}
          showFilters={true}
        />
      );

      expect(screen.getByText(/verified reviews only/i)).toBeInTheDocument();
      expect(screen.getByText(/reviews with photos/i)).toBeInTheDocument();
      expect(screen.getByText(/recent reviews only/i)).toBeInTheDocument();
    });

    it('handles quality filter toggles', async () => {
      render(
        <ReviewScoreFilter
          reviewScore={{}}
          onChange={mockOnChange}
          showFilters={true}
        />
      );

      const verifiedToggle = screen.getByRole('checkbox', { name: /verified reviews/i });
      await userEvent.click(verifiedToggle);

      expect(mockOnChange).toHaveBeenCalledWith({ verifiedOnly: true });
    });

    it('shows rating bands', () => {
      render(
        <ReviewScoreFilter
          reviewScore={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('Very Good')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });
});