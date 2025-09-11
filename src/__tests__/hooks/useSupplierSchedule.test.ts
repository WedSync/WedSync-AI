import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { useSupplierSchedule } from '@/hooks/useSupplierSchedule';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));
// Mock fetch globally
global.fetch = vi.fn();
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>edFunction<typeof useAuth>;
const mockFetch = fetch as ReturnType<typeof vi.fn>edFunction<typeof fetch>;
describe('useSupplierSchedule', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'vendor',
        email: 'supplier@example.com',
      },
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
    });
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  it('fetches schedule data on mount', async () => {
    const mockScheduleData = {
      schedule: {
        id: 'schedule-1',
        vendor_id: 'vendor-1',
        todayEvents: [],
        upcomingBookings: [],
      todayEvents: [],
      upcomingBookings: [],
      conflicts: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScheduleData,
    } as Response);
    const { result } = renderHook(() => useSupplierSchedule());
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith('/api/supplier/schedule?');
    expect(result.current.schedule).toEqual(mockScheduleData.schedule);
    expect(result.current.todayEvents).toEqual(mockScheduleData.todayEvents);
    expect(result.current.upcomingBookings).toEqual(mockScheduleData.upcomingBookings);
  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
      expect(result.current.error).toBe('Network error');
  it('updates event status successfully', async () => {
        todayEvents: [
          {
            id: 'event-1',
            title: 'Test Event',
            status: 'pending',
          },
        ],
      todayEvents: [
        {
          id: 'event-1',
          title: 'Test Event',
          status: 'pending',
        },
      ],
    const updatedEvent = {
      id: 'event-1',
      title: 'Test Event',
      status: 'confirmed',
    // Mock initial fetch
    // Mock update fetch
      json: async () => updatedEvent,
    await act(async () => {
      await result.current.updateEventStatus('event-1', 'confirmed');
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/supplier/schedule/events/event-1/status',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        body: JSON.stringify({ status: 'confirmed' }),
      })
    );
  it('reports conflict successfully', async () => {
      schedule: { id: 'schedule-1', vendor_id: 'vendor-1' },
    const mockConflict = {
      id: 'conflict-1',
      type: 'double_booking',
      description: 'Two events at same time',
      severity: 'critical',
      status: 'active',
    // Mock conflict report fetch
      json: async () => mockConflict,
      await result.current.reportConflict(
        ['event-1', 'event-2'],
        'Two events scheduled at same time',
        'double_booking'
      );
      '/api/supplier/schedule/conflicts',
        method: 'POST',
        body: JSON.stringify({
          event_ids: ['event-1', 'event-2'],
          description: 'Two events scheduled at same time',
          type: 'double_booking',
        }),
    expect(result.current.conflicts).toContainEqual(mockConflict);
  it('confirms availability successfully', async () => {
    const confirmedEvent = {
    // Mock confirm availability fetch
      json: async () => confirmedEvent,
      await result.current.confirmAvailability('event-1');
      '/api/supplier/schedule/events/event-1/confirm',
  it('exports schedule successfully', async () => {
    // Mock export fetch
    const mockBlob = new Blob(['mock pdf content'], { type: 'application/pdf' });
      blob: async () => mockBlob,
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
      await result.current.exportSchedule('pdf', {
        start: '2024-01-01',
        end: '2024-01-31',
      });
      '/api/supplier/schedule/export?format=pdf&start_date=2024-01-01&end_date=2024-01-31'
  it('handles non-vendor users', async () => {
        role: 'couple', // Not a vendor
        email: 'couple@example.com',
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  it('refetches data when date parameter changes', async () => {
    mockFetch.mockResolvedValue({
    const { result, rerender } = renderHook(
      ({ date }) => useSupplierSchedule(date),
      { initialProps: { date: '2024-01-15' } }
    expect(mockFetch).toHaveBeenCalledWith('/api/supplier/schedule?date=2024-01-15');
    rerender({ date: '2024-01-16' });
      expect(mockFetch).toHaveBeenCalledWith('/api/supplier/schedule?date=2024-01-16');
    expect(mockFetch).toHaveBeenCalledTimes(2);
});
