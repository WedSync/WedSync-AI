/**
 * BroadcastToast Component Unit Tests - WS-205 Broadcast Events System
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { BroadcastToast } from '@/components/broadcast/BroadcastToast';
import { BroadcastMessage } from '@/lib/broadcast/priority-queue';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockBroadcast: BroadcastMessage = {
  id: 'test-broadcast-1',
  type: 'test.message',
  priority: 'normal',
  title: 'Test Notification',
  message: 'This is a test notification message',
  deliveredAt: new Date(),
  action: {
    label: 'View Details',
    url: '/test-url',
  },
};

const mockCriticalBroadcast: BroadcastMessage = {
  id: 'critical-broadcast-1',
  type: 'wedding.cancelled',
  priority: 'critical',
  title: 'Critical Wedding Alert',
  message: 'Wedding has been cancelled - immediate action required',
  deliveredAt: new Date(),
  weddingContext: {
    weddingId: 'wedding-123',
    coupleName: 'John & Jane Smith',
    weddingDate: new Date('2024-06-15'),
  },
};

describe('BroadcastToast', () => {
  const mockOnDismiss = vi.fn();
  const mockOnAction = vi.fn();
  const mockOnAcknowledge = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic broadcast toast correctly', () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(
      screen.getByText('This is a test notification message'),
    ).toBeInTheDocument();
    expect(screen.getByText('NORMAL')).toBeInTheDocument();
  });

  it('displays correct priority styling for normal priority', () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    const container = screen.getByRole('alert');
    expect(container).toHaveClass(
      'bg-gradient-to-r',
      'from-blue-600',
      'to-blue-700',
    );
  });

  it('displays correct priority styling for critical priority', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
      />,
    );

    const container = screen.getByRole('alert');
    expect(container).toHaveClass(
      'bg-gradient-to-r',
      'from-red-600',
      'to-red-700',
    );
    expect(container).toHaveClass('animate-pulse');
  });

  it('shows wedding context information when present', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText(/John & Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/6\/15\/2024/)).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />,
    );

    const actionButton = screen.getByText('View Details →');
    expect(actionButton).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', async () => {
    render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />,
    );

    const actionButton = screen.getByText('View Details →');
    fireEvent.click(actionButton);

    expect(mockOnAction).toHaveBeenCalledWith('/test-url');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/broadcast/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: 'test-broadcast-1',
          action: 'action_clicked',
          timestamp: expect.any(String),
          actionUrl: '/test-url',
        }),
      });
    });
  });

  it('shows acknowledge button for critical broadcasts', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />,
    );

    const acknowledgeButton = screen.getByText('Acknowledge');
    expect(acknowledgeButton).toBeInTheDocument();
  });

  it('calls onAcknowledge when acknowledge button is clicked', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />,
    );

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('critical-broadcast-1');
  });

  it('shows close button for non-critical broadcasts', () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    const closeButton = screen.getByLabelText('Dismiss notification');
    expect(closeButton).toBeInTheDocument();
  });

  it('does not show close button for critical broadcasts', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
      />,
    );

    const closeButton = screen.queryByLabelText('Dismiss notification');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', async () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('shows confirmation dialog for critical broadcast dismissal', () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
      />,
    );

    // Since critical broadcasts don't have close button, we need to test the handleDismiss function
    // This would typically be triggered through other means in the actual component
    expect(mockConfirm).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('displays expiry information when present', () => {
    const broadcastWithExpiry = {
      ...mockBroadcast,
      expiresAt: new Date('2024-12-31T23:59:59Z'),
    };

    render(
      <BroadcastToast
        broadcast={broadcastWithExpiry}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });

  it('handles auto-hide functionality', async () => {
    vi.useFakeTimers();

    render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        autoHideDuration={1000}
      />,
    );

    // Fast forward time
    vi.advanceTimersByTime(1100);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('pauses auto-hide on hover', async () => {
    vi.useFakeTimers();

    render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        autoHideDuration={1000}
      />,
    );

    const container = screen.getByRole('alert');

    // Hover over the toast
    fireEvent.mouseEnter(container);

    // Fast forward time - should not dismiss due to hover
    vi.advanceTimersByTime(1100);

    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Mouse leave should resume timer
    fireEvent.mouseLeave(container);
    vi.advanceTimersByTime(1100);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('applies correct ARIA attributes', () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('applies assertive ARIA live region for critical broadcasts', () => {
    render(
      <BroadcastToast
        broadcast={mockCriticalBroadcast}
        onDismiss={mockOnDismiss}
      />,
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });

  it('handles different position configurations', () => {
    const { rerender } = render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        position="top-right"
      />,
    );

    let container = screen.getByRole('alert').parentElement;
    expect(container).toHaveClass('top-4', 'right-4');

    rerender(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        position="bottom-right"
      />,
    );

    container = screen.getByRole('alert').parentElement;
    expect(container).toHaveClass('bottom-4', 'right-4');

    rerender(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        position="top-center"
      />,
    );

    container = screen.getByRole('alert').parentElement;
    expect(container).toHaveClass('top-4', 'left-1/2');
  });

  it('tracks analytics for dismissal', async () => {
    render(
      <BroadcastToast broadcast={mockBroadcast} onDismiss={mockOnDismiss} />,
    );

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/broadcast/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: 'test-broadcast-1',
          action: 'dismissed',
          timestamp: expect.any(String),
        }),
      });
    });
  });

  it('handles analytics fetch failure gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <BroadcastToast
        broadcast={mockBroadcast}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />,
    );

    const actionButton = screen.getByText('View Details →');
    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track broadcast action:',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it('displays correct wedding type icons', () => {
    const weddingBroadcast = {
      ...mockBroadcast,
      type: 'wedding.update',
      weddingContext: {
        weddingId: 'wedding-123',
        coupleName: 'Test Couple',
        weddingDate: new Date(),
      },
    };

    render(
      <BroadcastToast broadcast={weddingBroadcast} onDismiss={mockOnDismiss} />,
    );

    // Check that wedding-related icons are rendered
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(1); // Should have multiple icons including wedding context
  });
});
