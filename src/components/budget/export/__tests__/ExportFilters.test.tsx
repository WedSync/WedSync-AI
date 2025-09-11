import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { ExportFilters } from '../ExportFilters';
import { DEFAULT_EXPORT_FILTERS } from '@/types/budget-export';

const mockAvailableCategories = ['Venue', 'Catering', 'Photography', 'Flowers', 'Music'];
const defaultProps = {
  filters: DEFAULT_EXPORT_FILTERS,
  onFiltersChange: jest.fn(),
  availableCategories: mockAvailableCategories,
  isLoading: false
};
describe('ExportFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders filter sections', () => {
    render(<ExportFilters {...defaultProps} />);
    
    expect(screen.getByText('Export Filters')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByText('Additional Options')).toBeInTheDocument();
  it('displays available categories', () => {
    mockAvailableCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  it('handles category selection', async () => {
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Venue'));
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['Venue']
      })
    );
  it('handles category deselection', async () => {
    const propsWithSelectedCategories = {
      ...defaultProps,
      filters: {
        ...DEFAULT_EXPORT_FILTERS,
        categories: ['Venue', 'Catering']
      }
    };
    render(<ExportFilters {...propsWithSelectedCategories} />);
        categories: ['Catering']
  it('handles "Select All" for categories', async () => {
    await user.click(screen.getByText('Select All'));
        categories: mockAvailableCategories
  it('handles "Clear All" for categories', async () => {
    await user.click(screen.getByText('Clear All'));
        categories: []
  it('handles date range selection', async () => {
    // Mock date inputs (in real implementation, this would use a date picker)
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    await user.type(startDateInput, '2024-01-01');
    await user.type(endDateInput, '2024-12-31');
    // Simulate date change events
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });
    expect(defaultProps.onFiltersChange).toHaveBeenCalled();
  it('clears date range when Clear Date Range is clicked', async () => {
    const propsWithDateRange = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
    render(<ExportFilters {...propsWithDateRange} />);
    await user.click(screen.getByText('Clear Date Range'));
        dateRange: null
  it('handles payment status change', async () => {
    // Open the payment status select
    await user.click(screen.getByText('All Statuses'));
    // Select "Paid" option
    await user.click(screen.getByText('Paid Only'));
        paymentStatus: 'paid'
  it('handles additional options toggles', async () => {
    await user.click(screen.getByLabelText('Include notes and descriptions'));
        includeNotes: false // Should toggle from true to false
    await user.click(screen.getByLabelText('Include receipt attachments'));
        includeReceipts: true // Should toggle from false to true
  it('shows active filter summary', () => {
    const propsWithFilters = {
        categories: ['Venue', 'Catering'],
        paymentStatus: 'paid' as const,
    render(<ExportFilters {...propsWithFilters} />);
    expect(screen.getByText('Active Filters')).toBeInTheDocument();
    expect(screen.getByText('2 categories selected')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2024 - Dec 31, 2024')).toBeInTheDocument();
    expect(screen.getByText('Paid Only')).toBeInTheDocument();
  it('validates date range', async () => {
    // Try to set end date before start date
    fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });
    expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
  it('shows loading state', () => {
    render(<ExportFilters {...defaultProps} isLoading={true} />);
    // Should show skeleton or loading state
    expect(screen.getByText('Loading filters...')).toBeInTheDocument();
  it('handles empty categories list', () => {
    render(<ExportFilters {...defaultProps} availableCategories={[]} />);
    expect(screen.getByText('No categories available')).toBeInTheDocument();
  it('shows preset date range options', async () => {
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 3 months')).toBeInTheDocument();
    expect(screen.getByText('This year')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();
    await user.click(screen.getByText('Last 30 days'));
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
  it('handles clear all filters', async () => {
        },
        includeNotes: false,
        includeReceipts: true,
        includeVendors: false
    await user.click(screen.getByText('Clear All Filters'));
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(DEFAULT_EXPORT_FILTERS);
  it('shows filter count in categories section', () => {
        categories: ['Venue', 'Catering', 'Photography']
    expect(screen.getByText('3 of 5 selected')).toBeInTheDocument();
  it('handles keyboard navigation in category list', async () => {
    const venueCheckbox = screen.getByLabelText('Venue');
    venueCheckbox.focus();
    fireEvent.keyDown(venueCheckbox, { key: 'Enter' });
  it('preserves existing filters when updating single filter', async () => {
    const existingFilters = {
      categories: ['Venue'],
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      },
      paymentStatus: 'paid' as const,
      includeNotes: false,
      includeReceipts: true,
      includeVendors: false
    render(<ExportFilters {...defaultProps} filters={existingFilters} />);
    await user.click(screen.getByLabelText('Catering'));
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
      ...existingFilters,
      categories: ['Venue', 'Catering']
});
