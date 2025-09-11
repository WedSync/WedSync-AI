import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { TouchOptimizedCalendar } from '@/components/touch/TouchOptimizedCalendar';
import { SupplierSchedule, ScheduleEvent } from '@/types/supplier';

// Mock touch events
const createTouchEvent = (type: string, touches: { clientX: number; clientY: number }[]) => {
  const event = new TouchEvent(type, {
    touches: touches.map(touch => ({
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: document.createElement('div'),
    }) as any),
    targetTouches: touches.map(touch => ({
    changedTouches: touches.map(touch => ({
  });
  return event;
};
// Mock haptic feedback
Object.assign(navigator, {
  vibrate: jest.fn(),
});
const mockSchedule: SupplierSchedule = {
  id: 'test-schedule',
  vendor_id: 'vendor-1',
  date: '2024-01-15',
  todayEvents: [],
  upcomingBookings: [],
  weeklySchedule: {
    week_start: '2024-01-14T00:00:00Z',
    days: [
      {
        date: '2024-01-15T00:00:00Z',
        events: [
          {
            id: 'event-1',
            booking_id: 'booking-1',
            title: 'Wedding Photography',
            start_time: '2024-01-15T10:00:00Z',
            end_time: '2024-01-15T12:00:00Z',
            client_name: 'John Doe',
            status: 'confirmed',
            event_type: 'photography',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        availability: {
          date: '2024-01-15',
          available: false,
          working_hours: { start: '09:00', end: '17:00' },
          booked_slots: [],
          available_slots: [],
        },
        conflicts: [],
      },
    ],
  },
  conflicts: [],
  availability: [],
  last_updated: '2024-01-15T00:00:00Z',
describe('TouchOptimizedCalendar', () => {
  const mockOnDateSelect = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  it('renders calendar with current month', () => {
    render(
      <TouchOptimizedCalendar
        selectedDate="2024-01-15"
        onDateSelect={mockOnDateSelect}
        schedule={mockSchedule}
        loading={false}
      />
    );
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
    expect(screen.getByText('Swipe to navigate')).toBeInTheDocument();
  it('shows loading state', () => {
        schedule={null}
        loading={true}
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  it('handles date selection with haptic feedback', async () => {
    // Find a date button (day 15)
    const dayButton = screen.getByRole('button', { name: /15/ });
    fireEvent.click(dayButton);
    await waitFor(() => {
      expect(mockOnDateSelect).toHaveBeenCalledWith('2024-01-15');
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  it('navigates months with buttons', async () => {
    const { rerender } = render(
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
      expect(screen.getByText(/February 2024/)).toBeInTheDocument();
    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);
      expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  it('handles swipe gestures for month navigation', async () => {
    const { container } = render(
    const calendarGrid = container.querySelector('.touch-pan-y');
    expect(calendarGrid).toBeInTheDocument();
    // Simulate left swipe (next month)
    fireEvent(calendarGrid!, createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]));
    fireEvent(calendarGrid!, createTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }]));
    fireEvent(calendarGrid!, createTouchEvent('touchend', []));
  it('shows event indicators on calendar days', () => {
    // Find the day with events (15th)
    const dayWithEvents = screen.getByRole('button', { name: /15/ });
    const eventIndicator = dayWithEvents.querySelector('.bg-green-500');
    expect(eventIndicator).toBeInTheDocument();
  it('displays selected date events preview', () => {
    expect(screen.getByText(/Events for/)).toBeInTheDocument();
    expect(screen.getByText('Wedding Photography')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  it('shows legend with event status colors', () => {
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Conflicts')).toBeInTheDocument();
    // Check for color indicators
    const greenIndicator = document.querySelector('.bg-green-500');
    const yellowIndicator = document.querySelector('.bg-yellow-500');
    const redIndicator = document.querySelector('.bg-red-500');
    
    expect(greenIndicator).toBeInTheDocument();
    expect(yellowIndicator).toBeInTheDocument();
    expect(redIndicator).toBeInTheDocument();
  it('meets accessibility standards for touch targets', () => {
    const dayButtons = screen.getAllByRole('button').filter(button =>
      /^\d+$/.test(button.textContent || '')
    dayButtons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minHeight = styles.getPropertyValue('min-height');
      expect(minHeight).toBe('44px');
  it('handles empty schedule gracefully', () => {
    expect(screen.getByText('No events scheduled for this date')).toBeInTheDocument();
  it('disables navigation for non-current month dates', () => {
    // Find dates from previous/next month (they should be disabled)
    const allButtons = screen.getAllByRole('button');
    const disabledButtons = allButtons.filter(button => button.hasAttribute('disabled'));
    // There should be some disabled buttons for prev/next month dates
    expect(disabledButtons.length).toBeGreaterThan(0);
