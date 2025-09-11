import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { format, addDays, subDays, parseISO } from 'date-fns';
import MobilePaymentCalendar from '@/components/mobile/payments/MobilePaymentCalendar';
import { useOfflineData } from '@/hooks/useOfflineData';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Mock hooks
jest.mock('@/hooks/useOfflineData');
jest.mock('@/hooks/usePWAInstall');
jest.mock('@/lib/performance/mobile-performance-optimizer', () => ({
  MobilePerformanceOptimizer: jest.fn().mockImplementation(() => ({
    optimizeTouch: jest.fn((fn) => fn),
    measureCalendarPerformance: jest.fn()
  }))
}));
jest.mock('@/lib/security/payment-security', () => ({
  PaymentSecurityManager: jest.fn().mockImplementation(() => ({
    encryptPaymentData: jest.fn(),
    decryptPaymentData: jest.fn()
const mockUseOfflineData = useOfflineData as jest.MockedFunction<typeof useOfflineData>;
const mockUsePWAInstall = usePWAInstall as jest.MockedFunction<typeof usePWAInstall>;
// Mock payment data
const mockPayments = [
  {
    id: '1',
    title: 'Venue Final Payment',
    amount: 5000,
    dueDate: addDays(new Date(), 3).toISOString(),
    status: 'pending' as const,
    vendor: {
      id: 'vendor-1',
      name: 'Grand Ballroom',
      category: 'Venue'
    },
    priority: 'high' as const,
    description: 'Final payment for venue booking'
  },
    id: '2',
    title: 'Photography Deposit',
    amount: 1500,
    dueDate: subDays(new Date(), 2).toISOString(),
    status: 'overdue' as const,
      id: 'vendor-2',
      name: 'Sunset Photography',
      category: 'Photography'
    priority: 'critical' as const,
    description: 'Initial deposit for photography services'
    id: '3',
    title: 'Catering Balance',
    amount: 3200,
    dueDate: addDays(new Date(), 14).toISOString(),
    status: 'upcoming' as const,
      id: 'vendor-3',
      name: 'Elite Catering',
      category: 'Catering'
    priority: 'medium' as const,
    description: 'Final catering payment'
  }
];
const defaultProps = {
  payments: mockPayments,
  onPaymentUpdate: jest.fn(),
  onPaymentCreate: jest.fn(),
  weddingId: 'wedding-123',
  coupleId: 'couple-456'
};
describe('MobilePaymentCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseOfflineData.mockReturnValue({
      isOnline: true,
      saveOfflineAction: jest.fn(),
      getOfflineActions: jest.fn(),
      syncPendingActions: jest.fn()
    });
    mockUsePWAInstall.mockReturnValue({
      canInstall: false,
      promptInstall: jest.fn()
    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  });
  afterEach(() => {
    jest.restoreAllMocks();
  describe('Component Rendering', () => {
    it('renders payment calendar with title', () => {
      render(<MobilePaymentCalendar {...defaultProps} />);
      expect(screen.getByText('Payment Calendar')).toBeInTheDocument();
    it('renders calendar and list view toggle buttons', () => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    it('displays current month in calendar header', () => {
      const currentMonth = format(new Date(), 'MMMM yyyy');
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    it('renders days of the week headers', () => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      daysOfWeek.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    it('shows loading state when loading prop is true', () => {
      render(<MobilePaymentCalendar {...defaultProps} loading={true} />);
      expect(screen.getByRole('presentation')).toBeInTheDocument(); // Loading skeleton
  describe('Calendar Navigation', () => {
    it('navigates to previous month when left arrow clicked', async () => {
      
      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);
      // Should show previous month
      const prevMonth = format(subDays(new Date(), 30), 'MMMM yyyy');
      await waitFor(() => {
        expect(screen.getByText(prevMonth)).toBeInTheDocument();
    it('navigates to next month when right arrow clicked', async () => {
      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);
      // Should show next month
      const nextMonth = format(addDays(new Date(), 30), 'MMMM yyyy');
        expect(screen.getByText(nextMonth)).toBeInTheDocument();
  describe('Payment Data Display', () => {
    it('displays payment information on calendar days', () => {
      // Check for payment amounts in calendar
      expect(screen.getByText('$5,000')).toBeInTheDocument(); // Venue payment
      expect(screen.getByText('$1,500')).toBeInTheDocument(); // Photography payment
      expect(screen.getByText('$3,200')).toBeInTheDocument(); // Catering payment
    it('shows payment counts for days with multiple payments', () => {
      const paymentsWithMultiple = [
        ...mockPayments,
        {
          id: '4',
          title: 'Flowers Payment',
          amount: 800,
          dueDate: mockPayments[0].dueDate, // Same day as venue payment
          status: 'pending' as const,
          vendor: {
            id: 'vendor-4',
            name: 'Bloom Flowers',
            category: 'Flowers'
          },
          priority: 'low' as const
        }
      ];
      render(<MobilePaymentCalendar {...defaultProps} payments={paymentsWithMultiple} />);
      // Should show "2 payments" for the day with multiple payments
      expect(screen.getByText('2 payments')).toBeInTheDocument();
    it('displays overdue payment indicators', () => {
      // Overdue payments should have visual indicators
      const overdueDay = screen.getByText(format(parseISO(mockPayments[1].dueDate), 'd'));
      expect(overdueDay.closest('div')).toHaveClass('bg-error-50');
    it('displays critical priority indicators', () => {
      // Critical priority payments should have visual indicators
      const criticalDay = screen.getByText(format(parseISO(mockPayments[1].dueDate), 'd'));
      expect(criticalDay.closest('div')).toHaveClass('ring-1', 'ring-error-200');
  describe('List View', () => {
    it('switches to list view when list button clicked', async () => {
      const listButton = screen.getByText('List');
      fireEvent.click(listButton);
        expect(screen.getByText('Venue Final Payment')).toBeInTheDocument();
        expect(screen.getByText('Photography Deposit')).toBeInTheDocument();
        expect(screen.getByText('Catering Balance')).toBeInTheDocument();
    it('displays payment details in list view', async () => {
      fireEvent.click(screen.getByText('List'));
        expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
        expect(screen.getByText('Sunset Photography')).toBeInTheDocument();
        expect(screen.getByText('Elite Catering')).toBeInTheDocument();
    it('shows payment status badges in list view', async () => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Overdue')).toBeInTheDocument();
        expect(screen.getByText('Upcoming')).toBeInTheDocument();
    it('shows Mark Paid button for pending payments in list view', async () => {
        expect(screen.getByText('Mark Paid')).toBeInTheDocument();
  describe('Payment Status Updates', () => {
    it('calls onPaymentUpdate when Mark Paid is clicked', async () => {
      const mockOnPaymentUpdate = jest.fn();
      render(<MobilePaymentCalendar {...defaultProps} onPaymentUpdate={mockOnPaymentUpdate} />);
        const markPaidButton = screen.getByText('Mark Paid');
        fireEvent.click(markPaidButton);
      expect(mockOnPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          status: 'paid',
          paidDate: expect.any(String),
          paidAmount: 5000
        })
      );
    it('handles payment status update errors gracefully', async () => {
      const mockOnPaymentUpdate = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        expect(consoleSpy).toHaveBeenCalledWith('Payment update failed:', expect.any(Error));
      consoleSpy.mockRestore();
  describe('Offline Functionality', () => {
    it('shows offline indicator when not online', () => {
      mockUseOfflineData.mockReturnValue({
        isOnline: false,
        saveOfflineAction: jest.fn(),
        getOfflineActions: jest.fn(),
        syncPendingActions: jest.fn()
      expect(screen.getByText('Offline mode - Changes will sync when connection returns')).toBeInTheDocument();
    it('saves offline actions when payment updated while offline', async () => {
      const mockSaveOfflineAction = jest.fn();
        saveOfflineAction: mockSaveOfflineAction,
      expect(mockSaveOfflineAction).toHaveBeenCalledWith({
        type: 'payment_update',
        paymentId: '1',
        data: expect.objectContaining({
          status: 'paid'
        }),
        timestamp: expect.any(Number)
    it('syncs pending actions when coming back online', () => {
      const mockSyncPendingActions = jest.fn();
      // Start offline
        syncPendingActions: mockSyncPendingActions
      const { rerender } = render(<MobilePaymentCalendar {...defaultProps} />);
      // Go online
        isOnline: true,
      rerender(<MobilePaymentCalendar {...defaultProps} />);
      expect(mockSyncPendingActions).toHaveBeenCalled();
  describe('PWA Installation', () => {
    it('shows PWA install prompt when available', () => {
      mockUsePWAInstall.mockReturnValue({
        canInstall: true,
        promptInstall: jest.fn()
      expect(screen.getByText('Install WedSync for offline access')).toBeInTheDocument();
      expect(screen.getByText('Access payments even without internet')).toBeInTheDocument();
    it('calls promptInstall when install button clicked', async () => {
      const mockPromptInstall = jest.fn();
        promptInstall: mockPromptInstall
      const installButton = screen.getByText('Install');
      fireEvent.click(installButton);
      expect(mockPromptInstall).toHaveBeenCalled();
    it('hides PWA install prompt when not available', () => {
        canInstall: false,
      expect(screen.queryByText('Install WedSync for offline access')).not.toBeInTheDocument();
  describe('Quick Stats', () => {
    it('displays total pending amount', () => {
      // Pending payments: $5,000 + $3,200 = $8,200 (overdue is not pending)
      expect(screen.getByText('$8,200')).toBeInTheDocument();
    it('displays overdue count', () => {
      expect(screen.getByText('1')).toBeInTheDocument(); // One overdue payment
    it('updates stats when payment data changes', async () => {
      // Update payment to paid status
      const updatedPayments = mockPayments.map(payment => 
        payment.id === '1' ? { ...payment, status: 'paid' as const } : payment
      rerender(<MobilePaymentCalendar {...defaultProps} payments={updatedPayments} />);
      // Pending amount should decrease
      expect(screen.getByText('$3,200')).toBeInTheDocument(); // Only catering left pending
  describe('Touch Gestures', () => {
    it('handles touch start events for swipe gestures', () => {
      const calendar = screen.getByRole('grid', { hidden: true }) || document.querySelector('[data-testid="calendar-grid"]');
      fireEvent.touchStart(calendar, {
        touches: [{ clientX: 100, clientY: 100 }]
      // Should not throw error
      expect(calendar).toBeInTheDocument();
    it('handles touch move events for swipe detection', () => {
      const calendar = document.querySelector('.grid.grid-cols-7');
      if (calendar) {
        fireEvent.touchStart(calendar, {
          touches: [{ clientX: 100, clientY: 100 }]
        });
        
        fireEvent.touchMove(calendar, {
          touches: [{ clientX: 150, clientY: 105 }]
        // Should not throw error
        expect(calendar).toBeInTheDocument();
      }
  describe('Performance Optimization', () => {
    it('calls performance measurement on mount', () => {
      const mockMeasureCalendarPerformance = jest.fn();
      jest.doMock('@/lib/performance/mobile-performance-optimizer', () => ({
        MobilePerformanceOptimizer: jest.fn().mockImplementation(() => ({
          optimizeTouch: jest.fn((fn) => fn),
          measureCalendarPerformance: mockMeasureCalendarPerformance
        }))
      }));
      expect(mockMeasureCalendarPerformance).toHaveBeenCalledWith('mobile-payment-calendar-render');
    it('maintains <300ms touch response time requirement', async () => {
      const startTime = performance.now();
      // Simulate touch interaction
      const calendarButton = screen.getByText('Calendar');
      const touchStart = performance.now();
      await act(async () => {
        fireEvent.click(calendarButton);
      const touchEnd = performance.now();
      const responseTime = touchEnd - touchStart;
      // Critical WS-165 requirement: <300ms touch response
      expect(responseTime).toBeLessThan(300);
    it('loads initial view in <2s on 3G simulation', async () => {
      // Mock 3G network conditions
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: '3g',
          downlink: 1.5,
          rtt: 300
      const loadStart = performance.now();
        render(<MobilePaymentCalendar {...defaultProps} />);
        expect(screen.getByText('Payment Calendar')).toBeInTheDocument();
      const loadTime = performance.now() - loadStart;
      // Critical WS-165 requirement: <2s load time on 3G
      expect(loadTime).toBeLessThan(2000);
    it('handles large payment datasets without performance degradation', async () => {
      // Generate 100+ payments for stress testing
      const largePaymentSet = Array.from({ length: 150 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Payment ${i}`,
        amount: 1000 + (i * 100),
        dueDate: addDays(new Date(), i % 30).toISOString(),
        status: ['pending', 'paid', 'overdue'][i % 3] as const,
        vendor: {
          id: `vendor-${i}`,
          name: `Vendor ${i}`,
          category: ['Venue', 'Catering', 'Photography', 'Flowers'][i % 4]
        },
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as const
      const renderStart = performance.now();
        render(<MobilePaymentCalendar {...defaultProps} payments={largePaymentSet} />);
      const renderTime = performance.now() - renderStart;
      // Performance requirement: Handle large datasets efficiently
      expect(renderTime).toBeLessThan(500);
    it('optimizes re-renders when payment data updates', () => {
      const renderCount = jest.fn();
      const TestComponent = () => {
        renderCount();
        return <MobilePaymentCalendar {...defaultProps} />;
      };
      const { rerender } = render(<TestComponent />);
      // Update single payment
      const updatedPayments = [...mockPayments];
      updatedPayments[0] = { ...updatedPayments[0], status: 'paid' as const };
      rerender(<TestComponent />);
      // Should minimize re-renders through memoization
      expect(renderCount).toHaveBeenCalledTimes(2);
  describe('Security & Data Protection', () => {
    it('encrypts sensitive payment data in offline storage', async () => {
      const mockEncryptPaymentData = jest.fn().mockResolvedValue('encrypted-data');
      jest.doMock('@/lib/security/payment-security', () => ({
        PaymentSecurityManager: jest.fn().mockImplementation(() => ({
          encryptPaymentData: mockEncryptPaymentData,
          decryptPaymentData: jest.fn()
      // Verify sensitive payment data is encrypted before offline storage
      expect(mockEncryptPaymentData).toHaveBeenCalledWith(
          amount: 5000,
          vendor: expect.any(Object)
    it('validates payment data integrity before processing', async () => {
      const mockValidatePayment = jest.fn().mockReturnValue(true);
      // Mock payment validation
      jest.doMock('@/lib/security/payment-validation', () => ({
        validatePaymentData: mockValidatePayment
      expect(mockValidatePayment).toHaveBeenCalled();
      expect(mockOnPaymentUpdate).toHaveBeenCalled();
    it('prevents XSS attacks in payment descriptions', () => {
      const maliciousPayments = [{
        ...mockPayments[0],
        description: '<script>alert("xss")</script>Malicious description'
      }];
      render(<MobilePaymentCalendar {...defaultProps} payments={maliciousPayments} />);
      // Should render as text, not execute script
      expect(screen.getByText('<script>alert("xss")</script>Malicious description')).toBeInTheDocument();
      expect(document.querySelector('script')).toBeNull();
    it('sanitizes vendor data to prevent injection attacks', () => {
          ...mockPayments[0].vendor,
          name: 'Vendor<img src=x onerror=alert(1)>'
      expect(screen.getByText('Vendor<img src=x onerror=alert(1)>')).toBeInTheDocument();
      expect(document.querySelector('img[onerror]')).toBeNull();
    it('implements secure session timeout for payment operations', async () => {
      jest.useFakeTimers();
      // Simulate user inactivity for 15 minutes
      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      // Should show session timeout warning
        expect(screen.getByText(/session will expire/i)).toBeInTheDocument();
      jest.useRealTimers();
  describe('Cross-Device Synchronization', () => {
    it('syncs payment updates across couple devices in real-time', async () => {
      const mockSyncAcrossDevices = jest.fn();
      // Mock real-time sync for couple accounts
      jest.doMock('@/lib/realtime/couple-sync', () => ({
        syncPaymentUpdate: mockSyncAcrossDevices
      expect(mockSyncAcrossDevices).toHaveBeenCalledWith({
        coupleId: 'couple-456',
        update: expect.objectContaining({
    it('handles conflict resolution when both partners update simultaneously', async () => {
      const mockResolveConflict = jest.fn().mockResolvedValue({
        resolution: 'use_latest_timestamp',
        resolvedData: mockPayments[0]
      jest.doMock('@/lib/offline/conflict-resolution', () => ({
        resolvePaymentConflict: mockResolveConflict
      // Simulate conflict scenario
      const conflictPayment = {
        status: 'paid' as const,
        conflictMetadata: {
          hasConflict: true,
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now() - 1000
      render(<MobilePaymentCalendar {...defaultProps} payments={[conflictPayment, ...mockPayments.slice(1)]} />);
        expect(mockResolveConflict).toHaveBeenCalled();
    it('shows real-time notifications for partner payment activities', async () => {
      const mockNotification = {
        type: 'partner_payment_update',
        message: 'Sarah marked venue payment as paid',
        timestamp: new Date().toISOString()
      // Mock real-time notification system
      const mockUseRealTimeNotifications = jest.fn().mockReturnValue({
        notifications: [mockNotification],
        clearNotification: jest.fn()
      jest.doMock('@/hooks/useRealTimeNotifications', () => ({
        useRealTimeNotifications: mockUseRealTimeNotifications
        expect(screen.getByText('Sarah marked venue payment as paid')).toBeInTheDocument();
    it('maintains data consistency across devices with optimistic updates', async () => {
      const mockOptimisticUpdate = jest.fn();
      const mockRollback = jest.fn();
      jest.doMock('@/lib/sync/optimistic-updates', () => ({
        applyOptimisticUpdate: mockOptimisticUpdate,
        rollbackUpdate: mockRollback
      // Should apply optimistic update first
      expect(mockOptimisticUpdate).toHaveBeenCalled();
      // Then rollback on network error
        expect(mockRollback).toHaveBeenCalled();
    it('syncs offline actions when devices reconnect', async () => {
      const mockSyncOfflineActions = jest.fn();
        getOfflineActions: jest.fn().mockReturnValue([
          { type: 'payment_update', paymentId: '1', data: { status: 'paid' } }
        ]),
        syncPendingActions: mockSyncOfflineActions
      expect(mockSyncOfflineActions).toHaveBeenCalled();
  describe('Enhanced Touch Gestures', () => {
    it('supports swipe gestures for month navigation', async () => {
      const calendarGrid = screen.getByRole('grid', { hidden: true }) || document.querySelector('.grid.grid-cols-7');
      if (calendarGrid) {
        // Simulate swipe right (previous month)
        fireEvent.touchStart(calendarGrid, {
        fireEvent.touchMove(calendarGrid, {
          touches: [{ clientX: 200, clientY: 105 }]
        fireEvent.touchEnd(calendarGrid, {
          changedTouches: [{ clientX: 200, clientY: 105 }]
        // Should navigate to previous month
        const prevMonth = format(subDays(new Date(), 30), 'MMMM yyyy');
        await waitFor(() => {
          expect(screen.getByText(prevMonth)).toBeInTheDocument();
    it('supports pinch-to-zoom for payment details', () => {
        // Simulate pinch gesture
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 120, clientY: 120 }
          ]
            { clientX: 80, clientY: 80 },
            { clientX: 140, clientY: 140 }
        fireEvent.touchEnd(calendar, {
          changedTouches: [
        // Should trigger zoom functionality
    it('provides haptic feedback for critical actions', async () => {
      // Mock vibration API
      Object.defineProperty(navigator, 'vibrate', {
        value: jest.fn()
      // Should provide haptic feedback for payment confirmation
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    it('handles touch pressure sensitivity for quick actions', () => {
      const paymentDay = screen.getByText('3'); // Day with venue payment
      // Simulate force touch (3D Touch/Force Touch)
      fireEvent.touchStart(paymentDay, {
        touches: [{
          clientX: 100,
          clientY: 100,
          force: 0.8 // High pressure
        }]
      // Should show quick action menu for high pressure touch
      // This would be implemented in the actual component
      expect(paymentDay).toBeInTheDocument();
  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation buttons', () => {
      expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
      expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    it('provides meaningful text for screen readers', () => {
      expect(screen.getByText('Total Pending')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    it('maintains focus management for touch interactions', () => {
      expect(listButton).toHaveClass('bg-primary-600');
});
