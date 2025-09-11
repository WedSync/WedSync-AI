/**
 * Unit Tests for TaskStatusCard Component
 * WS-159 Mobile Task Tracking - Team D Batch 17 Round 1
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { TaskStatusCard } from '@/components/wedme/tasks/TaskStatusCard';

// Mock mobile components
jest.mock('@/components/mobile/MobileEnhancedFeatures', () => ({
  SwipeableCard: ({ 
    children, 
    leftAction, 
    rightAction, 
    className 
  }: { 
    children: React.ReactNode; 
    leftAction: any; 
    rightAction: any; 
    className: string;
  }) => (
    <div data-testid="swipeable-card" className={className}>
      <button 
        data-testid="left-action" 
        onClick={leftAction.onAction}
        aria-label={leftAction.label}
      >
        {leftAction.label}
      </button>
      {children}
      <button 
        data-testid="right-action" 
        onClick={rightAction.onAction}
        aria-label={rightAction.label}
      >
        {rightAction.label}
      </button>
    </div>
  ),
  useLongPress: () => ({
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onTouchStart: jest.fn(),
    onTouchEnd: jest.fn()
  }),
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn()
  })
}));

// Mock Avatar component
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  )
}));

const mockTask = {
  id: 'task-1',
  title: 'Order wedding flowers',
  description: 'Contact florist and finalize bridal bouquet design with seasonal flowers',
  status: 'pending' as const,
  priority: 'high' as const,
  assignedTo: 'user-123',
  assignedToName: 'Sarah Johnson',
  assignedToAvatar: 'https://example.com/avatar.jpg',
  dueDate: new Date('2024-12-31T10:00:00Z'),
  category: 'Flowers',
  estimatedTime: '2 hours',
  notes: 'Remember to ask about delivery options',
  photos: ['photo1.jpg', 'photo2.jpg'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  helperCount: 2,
  isHighPriority: true,
  venue: 'Sunset Gardens Wedding Venue',
  conflicts: ['Schedule conflict with venue visit']
};

describe('TaskStatusCard', () => {
  const defaultProps = {
    task: mockTask,
    onTap: jest.fn(),
    onComplete: jest.fn(),
    onEdit: jest.fn(),
    onAssignHelper: jest.fn(),
    onShare: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders task title and description', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('Order wedding flowers')).toBeInTheDocument();
      expect(screen.getByText('Contact florist and finalize bridal bouquet design with seasonal flowers')).toBeInTheDocument();
    });

    test('renders status icon and badge', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    test('renders priority badge for high priority tasks', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    test('does not render priority badge for low priority tasks', () => {
      const lowPriorityTask = { ...mockTask, priority: 'low' as const };
      render(<TaskStatusCard {...defaultProps} task={lowPriorityTask} />);
      
      expect(screen.queryByText('low')).not.toBeInTheDocument();
    });

    test('renders category badge', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('Flowers')).toBeInTheDocument();
    });
  });

  describe('Assignee Information', () => {
    test('renders assignee name and avatar', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('alt', 'Sarah Johnson');
    });

    test('renders fallback when no avatar provided', () => {
      const taskNoAvatar = { ...mockTask, assignedToAvatar: undefined };
      render(<TaskStatusCard {...defaultProps} task={taskNoAvatar} />);
      
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });

    test('renders helper count when helpers assigned', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('+2 helpers')).toBeInTheDocument();
    });

    test('renders singular helper text for one helper', () => {
      const taskOneHelper = { ...mockTask, helperCount: 1 };
      render(<TaskStatusCard {...defaultProps} task={taskOneHelper} />);
      
      expect(screen.getByText('+1 helper')).toBeInTheDocument();
    });
  });

  describe('Due Date Display', () => {
    test('shows formatted due date with estimated time', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });

    test('shows "Overdue" for past due dates', () => {
      const overdueTask = { 
        ...mockTask, 
        dueDate: new Date('2020-01-01'),
        status: 'pending' as const 
      };
      render(<TaskStatusCard {...defaultProps} task={overdueTask} />);
      
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    test('shows "Today" for tasks due today', () => {
      const todayTask = { 
        ...mockTask, 
        dueDate: new Date() 
      };
      render(<TaskStatusCard {...defaultProps} task={todayTask} />);
      
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    test('shows "Tomorrow" for tasks due tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTask = { 
        ...mockTask, 
        dueDate: tomorrow 
      };
      render(<TaskStatusCard {...defaultProps} task={tomorrowTask} />);
      
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });
  });

  describe('Venue and Location', () => {
    test('renders venue information', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('Sunset Gardens Wedding Venue')).toBeInTheDocument();
    });

    test('does not render venue section when no venue', () => {
      const taskNoVenue = { ...mockTask, venue: undefined };
      render(<TaskStatusCard {...defaultProps} task={taskNoVenue} />);
      
      expect(screen.queryByText('Sunset Gardens Wedding Venue')).not.toBeInTheDocument();
    });
  });

  describe('Photos', () => {
    test('shows photo count when photos exist', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('2 photos')).toBeInTheDocument();
    });

    test('shows singular photo text for one photo', () => {
      const taskOnePhoto = { ...mockTask, photos: ['photo1.jpg'] };
      render(<TaskStatusCard {...defaultProps} task={taskOnePhoto} />);
      
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });

    test('does not show photo section when no photos', () => {
      const taskNoPhotos = { ...mockTask, photos: [] };
      render(<TaskStatusCard {...defaultProps} task={taskNoPhotos} />);
      
      expect(screen.queryByText('photos')).not.toBeInTheDocument();
    });
  });

  describe('Conflicts Warning', () => {
    test('shows conflict warning when conflicts exist', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      expect(screen.getByText('1 conflict')).toBeInTheDocument();
    });

    test('shows plural conflicts text for multiple conflicts', () => {
      const taskMultipleConflicts = { 
        ...mockTask, 
        conflicts: ['Conflict 1', 'Conflict 2'] 
      };
      render(<TaskStatusCard {...defaultProps} task={taskMultipleConflicts} />);
      
      expect(screen.getByText('2 conflicts')).toBeInTheDocument();
    });

    test('does not show conflicts when none exist', () => {
      const taskNoConflicts = { ...mockTask, conflicts: [] };
      render(<TaskStatusCard {...defaultProps} task={taskNoConflicts} />);
      
      expect(screen.queryByText('conflict')).not.toBeInTheDocument();
    });
  });

  describe('Status Styling', () => {
    test('applies completed styling for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' as const };
      render(<TaskStatusCard {...defaultProps} task={completedTask} />);
      
      const title = screen.getByText('Order wedding flowers');
      expect(title).toHaveClass('line-through', 'text-gray-500');
    });

    test('applies overdue styling for overdue tasks', () => {
      const overdueTask = { 
        ...mockTask, 
        dueDate: new Date('2020-01-01'),
        status: 'pending' as const 
      };
      render(<TaskStatusCard {...defaultProps} task={overdueTask} />);
      
      const swipeableCard = screen.getByTestId('swipeable-card');
      expect(swipeableCard).toHaveClass('border-red-300', 'bg-red-50/30');
    });

    test('applies due today styling', () => {
      const todayTask = { 
        ...mockTask, 
        dueDate: new Date(),
        status: 'pending' as const 
      };
      render(<TaskStatusCard {...defaultProps} task={todayTask} />);
      
      const swipeableCard = screen.getByTestId('swipeable-card');
      expect(swipeableCard).toHaveClass('border-orange-300', 'bg-orange-50/30');
    });
  });

  describe('Interactions', () => {
    test('calls onTap when card is clicked', () => {
      const onTap = jest.fn();
      render(<TaskStatusCard {...defaultProps} onTap={onTap} />);
      
      const card = screen.getByTestId('swipeable-card');
      fireEvent.click(card);
      
      expect(onTap).toHaveBeenCalledWith(mockTask);
    });

    test('calls onComplete when left swipe action is triggered', () => {
      const onComplete = jest.fn();
      render(<TaskStatusCard {...defaultProps} onComplete={onComplete} />);
      
      const leftAction = screen.getByTestId('left-action');
      fireEvent.click(leftAction);
      
      expect(onComplete).toHaveBeenCalledWith('task-1');
    });

    test('calls onEdit when right swipe action is triggered', () => {
      const onEdit = jest.fn();
      render(<TaskStatusCard {...defaultProps} onEdit={onEdit} />);
      
      const rightAction = screen.getByTestId('right-action');
      fireEvent.click(rightAction);
      
      expect(onEdit).toHaveBeenCalledWith(mockTask);
    });

    test('shows different swipe action for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' as const };
      render(<TaskStatusCard {...defaultProps} task={completedTask} />);
      
      const leftAction = screen.getByTestId('left-action');
      expect(leftAction).toHaveAttribute('aria-label', 'Done');
    });

    test('shows action menu when more options clicked', async () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      const moreButton = screen.getByLabelText('More options');
      fireEvent.click(moreButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Assign')).toBeInTheDocument();
        expect(screen.getByText('Share')).toBeInTheDocument();
      });
    });

    test('calls appropriate actions from action menu', async () => {
      const onEdit = jest.fn();
      const onShare = jest.fn();
      render(<TaskStatusCard {...defaultProps} onEdit={onEdit} onShare={onShare} />);
      
      // Open action menu
      const moreButton = screen.getByLabelText('More options');
      fireEvent.click(moreButton);
      
      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        const shareButton = screen.getByText('Share');
        
        fireEvent.click(editButton);
        expect(onEdit).toHaveBeenCalledWith(mockTask);
        
        fireEvent.click(shareButton);
        expect(onShare).toHaveBeenCalledWith(mockTask);
      });
    });
  });

  describe('Disabled State', () => {
    test('applies disabled styling when disabled', () => {
      render(<TaskStatusCard {...defaultProps} disabled={true} />);
      
      const swipeableCard = screen.getByTestId('swipeable-card');
      expect(swipeableCard).toHaveClass('opacity-60');
    });

    test('prevents interactions when disabled', () => {
      const onTap = jest.fn();
      render(<TaskStatusCard {...defaultProps} disabled={true} onTap={onTap} />);
      
      const card = screen.getByTestId('swipeable-card');
      fireEvent.click(card);
      
      // Should not call onTap when disabled
      expect(onTap).not.toHaveBeenCalled();
    });
  });

  describe('Offline Indicator', () => {
    test('shows offline indicator when specified', () => {
      render(<TaskStatusCard {...defaultProps} showOfflineIndicator={true} />);
      
      const offlineIndicator = screen.getByRole('generic');
      expect(offlineIndicator).toHaveClass('bg-orange-400', 'animate-pulse');
    });

    test('does not show offline indicator by default', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      const indicators = screen.queryAllByRole('generic');
      const offlineIndicator = indicators.find(el => 
        el.classList.contains('bg-orange-400') && 
        el.classList.contains('animate-pulse')
      );
      expect(offlineIndicator).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      const moreButton = screen.getByLabelText('More options');
      expect(moreButton).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<TaskStatusCard {...defaultProps} />);
      
      const moreButton = screen.getByLabelText('More options');
      
      // Focus should work
      moreButton.focus();
      expect(document.activeElement).toBe(moreButton);
    });
  });
});