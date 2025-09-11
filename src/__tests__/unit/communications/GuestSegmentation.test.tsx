import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GuestSegmentation from '@/components/communications/GuestSegmentation';
import { Guest } from '@/types/communications';

describe('GuestSegmentation', () => {
  const mockOnSelectionChange = jest.fn();
  const mockOnCriteriaChange = jest.fn();
  const mockGuests: Guest[] = [
    {
      id: 'guest-1',
      couple_id: 'couple-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      rsvp_status: 'pending',
      guest_category: 'family',
      wedding_side: 'partner1',
      has_plus_one: false,
      dietary_restrictions: ['vegetarian'],
      age_group: 'adult',
      table_number: 1,
      tags: ['vip'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
      id: 'guest-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '+1234567891',
      rsvp_status: 'attending',
      guest_category: 'friends',
      wedding_side: 'partner2',
      has_plus_one: true,
      dietary_restrictions: [],
      table_number: 2,
      tags: [],
      id: 'guest-3',
      first_name: 'Bob',
      last_name: 'Wilson',
      email: 'bob@example.com',
      phone: '+1234567892',
      rsvp_status: 'declined',
      guest_category: 'work',
      wedding_side: 'mutual',
      dietary_restrictions: ['gluten-free'],
      table_number: null,
      tags: ['work-colleague'],
      id: 'guest-4',
      first_name: 'Alice',
      last_name: 'Johnson',
      email: 'alice@example.com',
      phone: '+1234567893',
      rsvp_status: 'maybe',
      guest_category: 'other',
      age_group: 'child',
      table_number: 3,
      tags: ['family-friend'],
    }
  ];
  const defaultProps = {
    guests: mockGuests,
    selectedGuestIds: [],
    segmentationCriteria: {
      rsvp_status: [],
      age_groups: [],
      categories: [],
      sides: [],
      has_plus_one: undefined,
      has_dietary_restrictions: undefined,
      has_special_needs: undefined,
      table_numbers: [],
      custom_filters: {}
    onSelectionChange: mockOnSelectionChange,
    onCriteriaChange: mockOnCriteriaChange
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.resetAllMocks();
  it('should render guest list correctly', () => {
    render(<GuestSegmentation {...defaultProps} />);
    expect(screen.getByText('Guest Segmentation')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  it('should show correct guest count', () => {
    expect(screen.getByText('4 total guests')).toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  it('should allow individual guest selection', async () => {
    const user = userEvent.setup();
    const checkbox = screen.getByTestId('guest-checkbox-guest-1');
    await user.click(checkbox);
    expect(mockOnSelectionChange).toHaveBeenCalledWith(['guest-1']);
  it('should allow select all functionality', async () => {
    const selectAllCheckbox = screen.getByLabelText('Select all guests');
    await user.click(selectAllCheckbox);
    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      'guest-1', 'guest-2', 'guest-3', 'guest-4'
    ]);
  it('should handle partial selection for select all checkbox', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedGuestIds: ['guest-1', 'guest-2']
    };
    render(<GuestSegmentation {...propsWithSelection} />);
    expect(selectAllCheckbox).toHaveProperty('indeterminate', true);
  it('should filter guests by RSVP status', async () => {
    // Open RSVP filter
    const rsvpFilter = screen.getByText('RSVP Status');
    await user.click(rsvpFilter);
    // Select "attending" status
    const attendingOption = screen.getByLabelText('Attending');
    await user.click(attendingOption);
    expect(mockOnCriteriaChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: ['attending']
      })
    );
  it('should filter guests by categories', async () => {
    const categoryFilter = screen.getByText('Categories');
    await user.click(categoryFilter);
    const familyOption = screen.getByLabelText('Family');
    await user.click(familyOption);
        categories: ['family']
  it('should filter guests by wedding side', async () => {
    const sideFilter = screen.getByText('Wedding Side');
    await user.click(sideFilter);
    const partner1Option = screen.getByLabelText('Partner 1');
    await user.click(partner1Option);
        sides: ['partner1']
  it('should filter guests by age groups', async () => {
    const ageFilter = screen.getByText('Age Groups');
    await user.click(ageFilter);
    const adultOption = screen.getByLabelText('Adult');
    await user.click(adultOption);
        age_groups: ['adult']
  it('should filter guests by plus-one status', async () => {
    const plusOneFilter = screen.getByText('Plus-One');
    await user.click(plusOneFilter);
    const hasPlusOneOption = screen.getByLabelText('Has Plus-One');
    await user.click(hasPlusOneOption);
        has_plus_one: true
  it('should filter guests by dietary restrictions', async () => {
    const dietaryFilter = screen.getByText('Dietary');
    await user.click(dietaryFilter);
    const hasDietaryOption = screen.getByLabelText('Has Dietary Restrictions');
    await user.click(hasDietaryOption);
        has_dietary_restrictions: true
  it('should filter guests by table numbers', async () => {
    const tableFilter = screen.getByText('Tables');
    await user.click(tableFilter);
    const tableInput = screen.getByPlaceholderText('Enter table numbers (e.g., 1,2,3)');
    await user.type(tableInput, '1,2');
        table_numbers: [1, 2]
  it('should filter guests by tags', async () => {
    const tagFilter = screen.getByText('Tags');
    await user.click(tagFilter);
    const tagInput = screen.getByPlaceholderText('Enter tags separated by commas');
    await user.type(tagInput, 'vip,work-colleague');
        tags: ['vip', 'work-colleague']
  it('should show filtered results correctly', () => {
    const propsWithCriteria = {
      segmentationCriteria: {
        ...defaultProps.segmentationCriteria,
      }
    render(<GuestSegmentation {...propsWithCriteria} />);
    // Should show only attending guests in the list
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // pending
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument(); // declined
  it('should handle multiple filter criteria', () => {
    const propsWithMultipleCriteria = {
        rsvp_status: ['attending', 'maybe'],
        categories: ['friends', 'other']
    render(<GuestSegmentation {...propsWithMultipleCriteria} />);
    // Should show guests matching both criteria
    expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // friends & attending
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // other & maybe
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // family & pending
  it('should clear all filters', async () => {
        rsvp_status: ['attending'],
    const clearButton = screen.getByText('Clear All Filters');
    await user.click(clearButton);
    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
    });
  it('should show quick filter presets', async () => {
    const quickFilters = screen.getByText('Quick Filters');
    await user.click(quickFilters);
    // Should show preset options
    expect(screen.getByText('All Attending')).toBeInTheDocument();
    expect(screen.getByText('All Pending')).toBeInTheDocument();
    expect(screen.getByText('VIP Guests')).toBeInTheDocument();
    expect(screen.getByText('With Dietary Restrictions')).toBeInTheDocument();
  it('should apply quick filter presets', async () => {
    const allAttendingPreset = screen.getByText('All Attending');
    await user.click(allAttendingPreset);
  it('should handle search functionality', async () => {
    const searchInput = screen.getByPlaceholderText('Search guests by name or email');
    await user.type(searchInput, 'john');
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  it('should show guest details in list items', () => {
    // Check that guest details are displayed
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Family • Partner 1')).toBeInTheDocument();
    expect(screen.getByText('Pending RSVP')).toBeInTheDocument();
  it('should handle empty guest list', () => {
    const emptyProps = {
      guests: []
    render(<GuestSegmentation {...emptyProps} />);
    expect(screen.getByText('No guests found')).toBeInTheDocument();
    expect(screen.getByText('0 total guests')).toBeInTheDocument();
  it('should show selection count updates', () => {
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  it('should handle deselection of guests', async () => {
    expect(mockOnSelectionChange).toHaveBeenCalledWith(['guest-2']);
  it('should show loading state', () => {
    const loadingProps = {
      guests: [],
      loading: true
    render(<GuestSegmentation {...loadingProps} />);
    expect(screen.getByText('Loading guests...')).toBeInTheDocument();
  it('should handle invalid table number input', async () => {
    await user.type(tableInput, 'invalid,1,2');
    // Should filter out invalid entries and only include valid numbers
});
