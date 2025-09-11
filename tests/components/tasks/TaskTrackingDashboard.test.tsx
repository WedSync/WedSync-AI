import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskTrackingDashboard } from '@/components/tasks/TaskTrackingDashboard';

// Mock the hooks and external dependencies
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => fn),
    watch: jest.fn(),
    setValue: jest.fn(),
    formState: { errors: {} }
  })
}));

const mockTasks = [
  {
    id: '1',
    title: 'Order Wedding Flowers',
    description: 'Order bridal bouquet and centerpieces',
    status: 'completed' as const,
    priority: 'high' as const,
    assignee: {
      id: 'user1',
      name: 'Sarah Johnson',
      avatar: 'https://example.com/avatar1.jpg',
      role: 'bride' as const
    },
    dueDate: '2025-02-14',
    completedAt: '2025-01-15',
    progress: 100,
    category: 'Flowers & Decor',
    photoEvidence: ['https://example.com/photo1.jpg'],
    lastUpdated: '2025-01-15T10:30:00Z',
    weddingDate: '2025-06-15',
    daysUntilWedding: 120
  },
  {
    id: '2',
    title: 'Book Wedding Venue',
    description: 'Secure the ceremony and reception venue',
    status: 'in_progress' as const,
    priority: 'critical' as const,
    assignee: {
      id: 'user2',
      name: 'Mike Davis',
      role: 'groom' as const
    },
    dueDate: '2025-03-01',
    progress: 75,
    category: 'Venue',
    lastUpdated: '2025-01-20T14:15:00Z',
    weddingDate: '2025-06-15',
    daysUntilWedding: 120
  },
  {
    id: '3',
    title: 'Send Invitations',
    status: 'pending' as const,
    priority: 'medium' as const,
    progress: 0,
    category: 'Invitations',
    lastUpdated: '2025-01-10T09:00:00Z',
    weddingDate: '2025-06-15',
    daysUntilWedding: 120
  }
];

const defaultProps = {
  tasks: mockTasks,
  onTaskUpdate: jest.fn(),
  onTaskCreate: jest.fn(),
  onTaskDelete: jest.fn(),
  onViewTask: jest.fn(),
  isLoading: false,
  className: ''
};

describe('TaskTrackingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dashboard with title and statistics', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      expect(screen.getByText('Task Progress Overview')).toBeInTheDocument();
      expect(screen.getByText('Track your wedding preparation progress')).toBeInTheDocument();
    });

    it('displays correct task statistics', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Total tasks
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      
      // Completed tasks
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed count
      expect(screen.getByText('Completed')).toBeInTheDocument();
      
      // In progress
      expect(screen.getByText('1')).toBeInTheDocument(); // In progress count
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('calculates and displays overall progress correctly', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Overall progress should be (100 + 75 + 0) / 3 = 58%
      expect(screen.getByText('58%')).toBeInTheDocument();
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });

    it('shows tasks with photo evidence count', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Photos count
      expect(screen.getByText('Tasks with Photos')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters tasks by status', async () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Find and click the status filter
      const statusFilter = screen.getByDisplayValue('all');
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      await waitFor(() => {
        // Should only show completed tasks
        expect(screen.getByText('Order Wedding Flowers')).toBeInTheDocument();
        expect(screen.queryByText('Book Wedding Venue')).not.toBeInTheDocument();
      });
    });

    it('filters tasks by category', async () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      const categoryFilter = screen.getByDisplayValue('all');
      fireEvent.change(categoryFilter, { target: { value: 'Venue' } });
      
      await waitFor(() => {
        expect(screen.getByText('Book Wedding Venue')).toBeInTheDocument();
        expect(screen.queryByText('Order Wedding Flowers')).not.toBeInTheDocument();
      });
    });

    it('searches tasks by title', async () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'flowers' } });
      
      await waitFor(() => {
        expect(screen.getByText('Order Wedding Flowers')).toBeInTheDocument();
        expect(screen.queryByText('Book Wedding Venue')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Organization', () => {
    it('organizes tasks by status columns', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Check for status columns
      expect(screen.getByText('Pending (1)')).toBeInTheDocument();
      expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
      expect(screen.getByText('Completed (1)')).toBeInTheDocument();
    });

    it('displays tasks in correct status columns', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Find task cards and verify they're in the right columns
      const completedColumn = screen.getByTestId('status-column-completed');
      const inProgressColumn = screen.getByTestId('status-column-in_progress');
      const pendingColumn = screen.getByTestId('status-column-pending');
      
      expect(completedColumn).toContainElement(screen.getByText('Order Wedding Flowers'));
      expect(inProgressColumn).toContainElement(screen.getByText('Book Wedding Venue'));
      expect(pendingColumn).toContainElement(screen.getByText('Send Invitations'));
    });
  });

  describe('Task Interactions', () => {
    it('calls onTaskUpdate when task status is changed', async () => {
      const onTaskUpdate = jest.fn();
      render(<TaskTrackingDashboard {...defaultProps} onTaskUpdate={onTaskUpdate} />);
      
      // Find and click a task status update button
      const statusButton = screen.getAllByText('Start Task')[0];
      fireEvent.click(statusButton);
      
      await waitFor(() => {
        expect(onTaskUpdate).toHaveBeenCalledWith('3', 'in_progress');
      });
    });

    it('calls onViewTask when task is clicked', async () => {
      const onViewTask = jest.fn();
      render(<TaskTrackingDashboard {...defaultProps} onViewTask={onViewTask} />);
      
      // Click on a task card
      const taskCard = screen.getByText('Order Wedding Flowers');
      fireEvent.click(taskCard);
      
      await waitFor(() => {
        expect(onViewTask).toHaveBeenCalledWith('1');
      });
    });

    it('calls onTaskCreate when create task button is clicked', async () => {
      const onTaskCreate = jest.fn();
      render(<TaskTrackingDashboard {...defaultProps} onTaskCreate={onTaskCreate} />);
      
      const createButton = screen.getByText('Create New Task');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(onTaskCreate).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when isLoading is true', () => {
      render(<TaskTrackingDashboard {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
      expect(screen.getAllByTestId('task-skeleton')).toHaveLength(6);
    });

    it('shows empty state when no tasks', () => {
      render(<TaskTrackingDashboard {...defaultProps} tasks={[]} />);
      
      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('Create your first task to start tracking your wedding preparations.')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows compact view on mobile', () => {
      // Mock window resize to mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Check for mobile-specific elements
      expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      // Check for proper ARIA labels
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(6); // Various action buttons
    });

    it('supports keyboard navigation', () => {
      render(<TaskTrackingDashboard {...defaultProps} />);
      
      const searchInput = screen.getByRole('search');
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);
      
      // Tab through elements
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      // Next focusable element should be focused
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large task lists', () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        title: `Task ${i + 1}`
      }));
      
      const startTime = performance.now();
      render(<TaskTrackingDashboard {...defaultProps} tasks={largeTasks} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Data Validation', () => {
    it('handles malformed task data gracefully', () => {
      const malformedTasks = [
        { id: '1', title: '', status: 'invalid' as any },
        { id: '2' } as any, // Missing required fields
        null as any
      ];
      
      // Should not crash with bad data
      expect(() => {
        render(<TaskTrackingDashboard {...defaultProps} tasks={malformedTasks} />);
      }).not.toThrow();
    });

    it('provides default values for missing task properties', () => {
      const minimalTask = {
        id: '1',
        title: 'Minimal Task',
        status: 'pending' as const,
        progress: 0,
        category: 'Other',
        lastUpdated: new Date().toISOString(),
        weddingDate: '2025-06-15',
        daysUntilWedding: 120
      };
      
      render(<TaskTrackingDashboard {...defaultProps} tasks={[minimalTask]} />);
      
      expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    });
  });
});