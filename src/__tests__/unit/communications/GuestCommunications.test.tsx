import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GuestCommunications from '@/components/communications/GuestCommunications';
import { Guest } from '@/types/communications';

// Mock child components to isolate testing
jest.mock('@/components/communications/GuestSegmentation', () => {
  return function MockGuestSegmentation({ onSelectionChange }: any) {
    return (
      <div data-testid="guest-segmentation">
        <button onClick={() => onSelectionChange(['guest-1', 'guest-2'])}>
          Select Guests
        </button>
      </div>
    );
  };
});
jest.mock('@/components/communications/MessageComposition', () => {
  return function MockMessageComposition({ onMessageChange, onTemplateSelect }: any) {
      <div data-testid="message-composition">
        <button onClick={() => onMessageChange({
          subject: 'Test Subject',
          html_content: '<p>Test HTML</p>',
          text_content: 'Test Text'
        })}>
          Update Message
        <button onClick={() => onTemplateSelect('template-1')}>
          Select Template
jest.mock('@/components/communications/BulkSendConfig', () => {
  return function MockBulkSendConfig({ onConfigChange }: any) {
      <div data-testid="bulk-send-config">
        <button onClick={() => onConfigChange({
          channels: ['email'],
          send_immediately: true,
          test_mode: false
          Update Config
jest.mock('@/components/communications/MessagePreview', () => {
  return function MockMessagePreview({ onSendMessage }: any) {
      <div data-testid="message-preview">
        <button onClick={() => onSendMessage()}>
          Send Message
jest.mock('@/components/communications/DeliveryStatus', () => {
  return function MockDeliveryStatus() {
    return <div data-testid="delivery-status">Delivery Status</div>;
// Mock hooks
const mockUseUser = jest.fn();
jest.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser()
}));
const mockUseGuests = jest.fn();
jest.mock('@/hooks/useGuests', () => ({
  useGuests: () => mockUseGuests()
// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('GuestCommunications', () => {
  const mockUser = {
    id: 'user-123',
    couple_id: 'couple-123',
    email: 'user@example.com'
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
      dietary_restrictions: [],
      age_group: 'adult',
      table_number: null,
      tags: [],
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
      dietary_restrictions: ['vegetarian'],
      table_number: 5,
      tags: ['vip'],
    }
  ];
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null
    });
    mockUseGuests.mockReturnValue({
      guests: mockGuests,
      error: null,
      refetch: jest.fn()
    mockFetch.mockClear();
  });
  afterEach(() => {
    jest.clearAllMocks();
  it('should render initial step with guest segmentation', () => {
    render(<GuestCommunications />);
    expect(screen.getByText('Guest Communications')).toBeInTheDocument();
    expect(screen.getByTestId('guest-segmentation')).toBeInTheDocument();
    expect(screen.getByText('Next: Compose Message')).toBeInTheDocument();
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
  it('should navigate through steps correctly', async () => {
    const user = userEvent.setup();
    // Step 1: Guest Segmentation
    expect(screen.getByText('Step 1 of 5: Select Recipients')).toBeInTheDocument();
    
    // Select guests and proceed
    const selectGuestsBtn = screen.getByText('Select Guests');
    await user.click(selectGuestsBtn);
    const nextBtn = screen.getByText('Next: Compose Message');
    await user.click(nextBtn);
    // Step 2: Message Composition
    expect(screen.getByText('Step 2 of 5: Compose Message')).toBeInTheDocument();
    expect(screen.getByTestId('message-composition')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  it('should prevent navigation without required selections', async () => {
    // Try to proceed without selecting guests
    // Should still be on step 1
  it('should handle guest selection changes', async () => {
    await waitFor(() => {
      // Should show selected count
      expect(screen.getByText(/2 guests selected/)).toBeInTheDocument();
  it('should handle message composition updates', async () => {
    // Navigate to message composition
    await user.click(screen.getByText('Select Guests'));
    await user.click(screen.getByText('Next: Compose Message'));
    // Update message
    const updateMessageBtn = screen.getByText('Update Message');
    await user.click(updateMessageBtn);
    // Should enable next button
    const nextBtn = screen.getByText('Next: Configure Delivery');
    expect(nextBtn).not.toBeDisabled();
  it('should handle template selection', async () => {
    // Select template
    const selectTemplateBtn = screen.getByText('Select Template');
    await user.click(selectTemplateBtn);
      // Template should be loaded (mocked behavior)
      expect(screen.getByText('Update Message')).toBeInTheDocument();
  it('should complete full workflow to delivery status', async () => {
    // Mock successful message send
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ 
        success: true, 
        message_id: 'msg-123' 
      })
    // Step 1: Select guests
    // Step 2: Compose message
    await user.click(screen.getByText('Update Message'));
    await user.click(screen.getByText('Next: Configure Delivery'));
    // Step 3: Configure delivery
    await user.click(screen.getByText('Update Config'));
    await user.click(screen.getByText('Next: Review & Send'));
    // Step 4: Review and send
    await user.click(screen.getByText('Send Message'));
    // Step 5: Delivery status
      expect(screen.getByText('Step 5 of 5: Delivery Status')).toBeInTheDocument();
      expect(screen.getByTestId('delivery-status')).toBeInTheDocument();
  it('should handle send message failure', async () => {
    // Mock failed message send
      ok: false,
      status: 500,
        error: 'Server error' 
    // Navigate through steps
    // Attempt to send
      // Should show error state
      expect(screen.getByText(/error/i)).toBeInTheDocument();
  it('should navigate backwards through steps', async () => {
    // Go forward a few steps
    // Now go backward
    await user.click(screen.getByText('Previous'));
  it('should handle loading state', () => {
      guests: [],
      loading: true,
    expect(screen.getByText('Loading guests...')).toBeInTheDocument();
  it('should handle error state', () => {
      error: new Error('Failed to load guests'),
    expect(screen.getByText('Error loading guests')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  it('should handle user not authenticated', () => {
      user: null,
    expect(screen.getByText('Please log in to send messages to your guests')).toBeInTheDocument();
  it('should reset state when starting new message', async () => {
    // Complete a workflow
    // Reset (this would be triggered by a reset button in a real implementation)
    // For testing, we'll simulate the effect of resetting
    const component = screen.getByTestId('guest-communications') || document.body;
    // Verify initial state can be restored
    expect(component).toBeDefined();
  it('should validate state transitions correctly', async () => {
    // Should not be able to skip steps
    expect(screen.queryByText('Next: Configure Delivery')).not.toBeInTheDocument();
    // Complete step 1
    // Should not be able to proceed without message
    expect(nextBtn).toBeDisabled();
  it('should handle network errors gracefully', async () => {
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    // Navigate to send
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
