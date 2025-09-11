import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskStatusCard, type TaskStatusCardData } from '@/components/tasks/TaskStatusCard';

const mockTask: TaskStatusCardData = {
  id: '1',
  title: 'Order Wedding Flowers',
  description: 'Order bridal bouquet and centerpieces for the wedding ceremony',
  status: 'in_progress',
  priority: 'high',
  assignee: {
    id: 'user1',
    name: 'Sarah Johnson',
    avatar: 'https://example.com/avatar1.jpg',
    role: 'bride'
  },
  dueDate: '2025-02-14',
  progress: 75,
  category: 'Flowers & Decor',
  photoEvidence: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  lastUpdated: '2025-01-20T14:15:00Z',
  weddingDate: '2025-06-15',
  daysUntilWedding: 120
};

const completedTask: TaskStatusCardData = {
  ...mockTask,
  id: '2',
  status: 'completed',
  progress: 100,
  completedAt: '2025-01-15T10:30:00Z'
};

const overdueTask: TaskStatusCardData = {
  ...mockTask,
  id: '3',
  status: 'overdue',
  dueDate: '2025-01-10', // Past due
  progress: 25
};

describe('TaskStatusCard', () => {
  describe('Rendering', () => {
    it('renders task information correctly', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText('Order Wedding Flowers')).toBeInTheDocument();
      expect(screen.getByText('Flowers & Decor')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('displays status badge with correct styling', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      const statusBadge = screen.getByText('In Progress');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-primary-50', 'text-primary-700');
    });

    it('shows priority badge for non-low priority tasks', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText('high priority')).toBeInTheDocument();
    });

    it('does not show priority badge for low priority tasks', () => {
      const lowPriorityTask = { ...mockTask, priority: 'low' as const };
      render(<TaskStatusCard task={lowPriorityTask} />);
      
      expect(screen.queryByText('low priority')).not.toBeInTheDocument();
    });

    it('displays photo evidence count', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Photo count
    });
  });

  describe('Status Variations', () => {
    it('renders completed task correctly', () => {
      render(<TaskStatusCard task={completedTask} />);
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/Completed:/)).toBeInTheDocument();
    });

    it('renders overdue task with warning styling', () => {
      render(<TaskStatusCard task={overdueTask} />);
      
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText(/days overdue/)).toBeInTheDocument();
    });

    it('shows blocked status correctly', () => {
      const blockedTask = { ...mockTask, status: 'blocked' as const };
      render(<TaskStatusCard task={blockedTask} />);
      
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders compact variant correctly', () => {
      render(<TaskStatusCard task={mockTask} variant="compact" />);
      
      expect(screen.getByText('Order Wedding Flowers')).toBeInTheDocument();
      expect(screen.getByText('Flowers & Decor')).toBeInTheDocument();
      // Compact variant should not show description
      expect(screen.queryByText(mockTask.description!)).not.toBeInTheDocument();
    });

    it('renders detailed variant with full information', () => {
      render(<TaskStatusCard task={mockTask} variant="detailed" />);
      
      expect(screen.getByText(mockTask.description!)).toBeInTheDocument();
      expect(screen.getByText(/Wedding countdown:/)).toBeInTheDocument();
      expect(screen.getByText(/120 days until your special day/)).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress when showProgress is true', () => {
      render(<TaskStatusCard task={mockTask} showProgress={true} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hides progress when showProgress is false', () => {
      render(<TaskStatusCard task={mockTask} showProgress={false} />);
      
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });
  });

  describe('Date Handling', () => {
    it('displays due date correctly', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText(/Due:/)).toBeInTheDocument();
      expect(screen.getByText('Feb 14, 2025')).toBeInTheDocument();
    });

    it('shows days until due for upcoming tasks', () => {
      const upcomingTask = {
        ...mockTask,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days from now
      };
      
      render(<TaskStatusCard task={upcomingTask} />);
      
      expect(screen.getByText(/3 days left/)).toBeInTheDocument();
    });

    it('shows overdue status for past due tasks', () => {
      const pastDueTask = {
        ...mockTask,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago
      };
      
      render(<TaskStatusCard task={pastDueTask} />);
      
      expect(screen.getByText(/2 days overdue/)).toBeInTheDocument();
    });

    it('shows completion date for completed tasks', () => {
      render(<TaskStatusCard task={completedTask} />);
      
      expect(screen.getByText(/Completed:/)).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });

    it('displays relative time for last updated', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      // Should show some form of relative time
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    });
  });

  describe('Assignee Display', () => {
    it('shows assignee with avatar', () => {
      render(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('bride')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
    });

    it('shows assignee initials when no avatar', () => {
      const taskWithoutAvatar = {
        ...mockTask,
        assignee: { ...mockTask.assignee!, avatar: undefined }
      };
      
      render(<TaskStatusCard task={taskWithoutAvatar} />);
      
      expect(screen.getByText('S')).toBeInTheDocument(); // Initial
    });

    it('handles task without assignee', () => {
      const unassignedTask = { ...mockTask, assignee: undefined };
      render(<TaskStatusCard task={unassignedTask} />);
      
      expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onStatusUpdate when status button clicked', async () => {
      const onStatusUpdate = jest.fn();
      render(<TaskStatusCard task={mockTask} onStatusUpdate={onStatusUpdate} />);
      
      const completeButton = screen.getByText('Complete Task');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(onStatusUpdate).toHaveBeenCalledWith('1', 'completed');
      });
    });

    it('calls onViewDetails when view details button clicked', async () => {
      const onViewDetails = jest.fn();
      render(<TaskStatusCard task={mockTask} onViewDetails={onViewDetails} />);
      
      const viewButton = screen.getByText('View Details');
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(onViewDetails).toHaveBeenCalledWith('1');
      });
    });

    it('calls onViewDetails when card is clicked', async () => {
      const onViewDetails = jest.fn();
      render(<TaskStatusCard task={mockTask} onViewDetails={onViewDetails} />);
      
      const card = screen.getByText('Order Wedding Flowers').closest('div');
      fireEvent.click(card!);
      
      await waitFor(() => {
        expect(onViewDetails).toHaveBeenCalledWith('1');
      });
    });

    it('shows different button text for pending tasks', () => {
      const pendingTask = { ...mockTask, status: 'pending' as const };
      render(<TaskStatusCard task={pendingTask} onStatusUpdate={jest.fn()} />);
      
      expect(screen.getByText('Start Task')).toBeInTheDocument();
    });

    it('does not show status update button for completed tasks', () => {
      render(<TaskStatusCard task={completedTask} onStatusUpdate={jest.fn()} />);
      
      expect(screen.queryByText('Complete Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Start Task')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TaskStatusCard task={mockTask} onViewDetails={jest.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', () => {
      render(<TaskStatusCard task={mockTask} onViewDetails={jest.fn()} />);
      
      const viewButton = screen.getByText('View Details');
      viewButton.focus();
      
      expect(document.activeElement).toBe(viewButton);
    });
  });

  describe('Error Handling', () => {
    it('handles missing required fields gracefully', () => {
      const minimalTask = {
        id: '1',
        title: 'Minimal Task',
        status: 'pending' as const,
        priority: 'low' as const,
        progress: 0,
        category: 'Other',
        lastUpdated: new Date().toISOString(),
        weddingDate: '2025-06-15',
        daysUntilWedding: 120
      };
      
      expect(() => {
        render(<TaskStatusCard task={minimalTask} />);
      }).not.toThrow();
      
      expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    });

    it('handles invalid date formats', () => {
      const taskWithBadDate = {
        ...mockTask,
        dueDate: 'invalid-date',
        completedAt: 'also-invalid'
      };
      
      expect(() => {
        render(<TaskStatusCard task={taskWithBadDate} />);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('prevents event bubbling for action buttons', () => {
      const onViewDetails = jest.fn();
      const onStatusUpdate = jest.fn();
      
      render(
        <TaskStatusCard 
          task={mockTask} 
          onViewDetails={onViewDetails}
          onStatusUpdate={onStatusUpdate}
        />
      );
      
      const viewButton = screen.getByText('View Details');
      fireEvent.click(viewButton);
      
      // Only view details should be called, not both
      expect(onViewDetails).toHaveBeenCalledTimes(1);
      expect(onStatusUpdate).not.toHaveBeenCalled();
    });

    it('renders efficiently with minimal re-renders', () => {
      const { rerender } = render(<TaskStatusCard task={mockTask} />);
      
      // Re-render with same props should not cause issues
      rerender(<TaskStatusCard task={mockTask} />);
      
      expect(screen.getByText('Order Wedding Flowers')).toBeInTheDocument();
    });
  });

  describe('Wedding Context', () => {
    it('shows wedding countdown in detailed variant', () => {
      render(<TaskStatusCard task={mockTask} variant="detailed" />);
      
      expect(screen.getByText('Wedding countdown:')).toBeInTheDocument();
      expect(screen.getByText('120 days until your special day')).toBeInTheDocument();
    });

    it('handles wedding date calculations correctly', () => {
      const taskWithCustomWeddingDate = {
        ...mockTask,
        weddingDate: '2025-12-25',
        daysUntilWedding: 300
      };
      
      render(<TaskStatusCard task={taskWithCustomWeddingDate} variant="detailed" />);
      
      expect(screen.getByText('300 days until your special day')).toBeInTheDocument();
    });
  });
});