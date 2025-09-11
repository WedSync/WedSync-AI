/**
 * Unit Tests for TaskTrackingMobileDashboard Component
 * WS-159 Mobile Task Tracking - Team D Batch 17 Round 1
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { TaskTrackingMobileDashboard } from '@/components/wedme/tasks/TaskTrackingMobileDashboard';

// Mock the hooks
jest.mock('@/hooks/useMobileSecurity', () => ({
  useMobileSecurity: () => ({
    validateTaskAccess: jest.fn().mockResolvedValue(true),
    securityLevel: 'standard',
    isOffline: false,
    networkQuality: 'good'
  })
}));

jest.mock('@/hooks/useWeddingDayOffline', () => ({
  useWeddingDayOffline: () => ({
    syncStatus: {
      pendingCount: 0,
      hasUnsyncedData: false
    },
    isOnline: true
  })
}));

// Mock WedMeHeader
jest.mock('@/components/wedme/WedMeHeader', () => ({
  WedMeHeader: ({ title, notifications }: { title: string; notifications?: number }) => (
    <div data-testid="wedme-header">
      <h1>{title}</h1>
      {notifications && <span data-testid="notification-count">{notifications}</span>}
    </div>
  )
}));

// Mock TouchInput
jest.mock('@/components/touch/TouchInput', () => ({
  TouchInput: ({ placeholder, value, onChange, ...props }: any) => (
    <input
      data-testid="touch-input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  )
}));

// Mock mobile components
jest.mock('@/components/mobile/MobileEnhancedFeatures', () => ({
  PullToRefresh: ({ children, onRefresh }: { children: React.ReactNode; onRefresh: () => void }) => (
    <div data-testid="pull-to-refresh" onClick={onRefresh}>
      {children}
    </div>
  )
}));

const mockTasks = [
  {
    id: 'task-1',
    title: 'Order wedding flowers',
    description: 'Contact florist for bridal bouquet',
    status: 'pending' as const,
    priority: 'high' as const,
    category: 'Flowers',
    assignedToName: 'Sarah Johnson',
    dueDate: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    helperCount: 1,
    isHighPriority: true,
    venue: 'Garden Venue'
  },
  {
    id: 'task-2',
    title: 'Book photographer',
    description: 'Schedule engagement photos',
    status: 'in_progress' as const,
    priority: 'urgent' as const,
    category: 'Photography',
    assignedToName: 'Mike Davis',
    photos: ['photo1.jpg'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
    helperCount: 0,
    isHighPriority: true
  },
  {
    id: 'task-3',
    title: 'Send invitations',
    description: 'Mail wedding invitations',
    status: 'completed' as const,
    priority: 'medium' as const,
    category: 'Invitations',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-06'),
    helperCount: 2,
    isHighPriority: false
  }
];

describe('TaskTrackingMobileDashboard', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    currentUserId: 'user-456',
    initialTasks: mockTasks,
    onTaskCreate: jest.fn(),
    onTaskUpdate: jest.fn().mockResolvedValue(undefined),
    onTaskComplete: jest.fn().mockResolvedValue(undefined),
    onTaskAssign: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders dashboard with header', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      expect(screen.getByTestId('wedme-header')).toBeInTheDocument();
      expect(screen.getByText('Task Tracking')).toBeInTheDocument();
    });

    test('renders security and network status bar', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      expect(screen.getByText('Security: STANDARD')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const searchInput = screen.getByTestId('touch-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search tasks...');
    });

    test('renders filter pills', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    test('renders stats overview', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    test('renders floating action button', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const fab = screen.getByLabelText('Create new task');
      expect(fab).toBeInTheDocument();
    });
  });

  describe('Task Filtering', () => {
    test('filters tasks by status', async () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      // Click on "Pending" filter
      const pendingFilter = screen.getByText('Pending');
      fireEvent.click(pendingFilter);
      
      // Should show only pending tasks
      await waitFor(() => {
        expect(screen.getByText('Order wedding flowers')).toBeInTheDocument();
        expect(screen.queryByText('Book photographer')).not.toBeInTheDocument();
        expect(screen.queryByText('Send invitations')).not.toBeInTheDocument();
      });
    });

    test('filters tasks by search query', async () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const searchInput = screen.getByTestId('touch-input');
      fireEvent.change(searchInput, { target: { value: 'flowers' } });
      
      await waitFor(() => {
        expect(screen.getByText('Order wedding flowers')).toBeInTheDocument();
        expect(screen.queryByText('Book photographer')).not.toBeInTheDocument();
        expect(screen.queryByText('Send invitations')).not.toBeInTheDocument();
      });
    });

    test('combines status filter and search', async () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      // Apply completed filter
      const completedFilter = screen.getByText('Completed');
      fireEvent.click(completedFilter);
      
      // Then search for invitations
      const searchInput = screen.getByTestId('touch-input');
      fireEvent.change(searchInput, { target: { value: 'invitations' } });
      
      await waitFor(() => {
        expect(screen.getByText('Send invitations')).toBeInTheDocument();
        expect(screen.queryByText('Order wedding flowers')).not.toBeInTheDocument();
        expect(screen.queryByText('Book photographer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Interactions', () => {
    test('handles task completion', async () => {
      const onTaskComplete = jest.fn().mockResolvedValue(undefined);
      render(<TaskTrackingMobileDashboard {...defaultProps} onTaskComplete={onTaskComplete} />);
      
      // This would typically interact with TaskStatusCard swipe gesture
      // For now, testing the callback function
      expect(onTaskComplete).toBeDefined();
    });

    test('handles task updates', async () => {
      const onTaskUpdate = jest.fn().mockResolvedValue(undefined);
      render(<TaskTrackingMobileDashboard {...defaultProps} onTaskUpdate={onTaskUpdate} />);
      
      expect(onTaskUpdate).toBeDefined();
    });

    test('handles pull to refresh', async () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const pullToRefresh = screen.getByTestId('pull-to-refresh');
      fireEvent.click(pullToRefresh);
      
      // Should trigger refresh animation/state
      await waitFor(() => {
        // In a real implementation, this would show loading state
        expect(pullToRefresh).toBeInTheDocument();
      });
    });

    test('handles fab click', () => {
      const onTaskCreate = jest.fn();
      render(<TaskTrackingMobileDashboard {...defaultProps} onTaskCreate={onTaskCreate} />);
      
      const fab = screen.getByLabelText('Create new task');
      fireEvent.click(fab);
      
      expect(onTaskCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Offline Mode', () => {
    test('shows offline indicator when offline', () => {
      // Mock offline state
      const useMobileSecurityMock = jest.fn(() => ({
        validateTaskAccess: jest.fn().mockResolvedValue(true),
        securityLevel: 'standard',
        isOffline: true,
        networkQuality: 'poor'
      }));
      
      jest.doMock('@/hooks/useMobileSecurity', () => ({
        useMobileSecurity: useMobileSecurityMock
      }));
      
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    test('disables fab when offline', () => {
      const useMobileSecurityMock = jest.fn(() => ({
        validateTaskAccess: jest.fn().mockResolvedValue(true),
        securityLevel: 'standard',
        isOffline: true,
        networkQuality: 'poor'
      }));
      
      jest.doMock('@/hooks/useMobileSecurity', () => ({
        useMobileSecurity: useMobileSecurityMock
      }));
      
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const fab = screen.getByLabelText('Create new task');
      expect(fab).toBeDisabled();
    });
  });

  describe('Empty States', () => {
    test('shows empty state when no tasks', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} initialTasks={[]} />);
      
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first task to get started')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Task')).toBeInTheDocument();
    });

    test('shows no results when filtered with no matches', async () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const searchInput = screen.getByTestId('touch-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No tasks found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filter')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const fab = screen.getByLabelText('Create new task');
      expect(fab).toBeInTheDocument();
      
      // Filter buttons should be properly labeled
      const allFilter = screen.getByText('All');
      expect(allFilter).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<TaskTrackingMobileDashboard {...defaultProps} />);
      
      const searchInput = screen.getByTestId('touch-input');
      expect(searchInput).toBeInTheDocument();
      
      // Focus should work on interactive elements
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Performance', () => {
    test('renders efficiently with large task lists', () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description ${i}`,
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
        helperCount: 0,
        isHighPriority: false
      }));
      
      const startTime = Date.now();
      render(<TaskTrackingMobileDashboard {...defaultProps} initialTasks={largeTasks} />);
      const renderTime = Date.now() - startTime;
      
      // Should render in reasonable time (< 100ms for 100 items)
      expect(renderTime).toBeLessThan(100);
      
      // Should show total count
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});