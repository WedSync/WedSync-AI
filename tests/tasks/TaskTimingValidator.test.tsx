/**
 * WS-156 Task Timing Validator Unit Tests - TDD Approach
 * Testing real-time conflict detection and timeline validation
 * 
 * CRITICAL: Wedding timing conflicts can ruin the entire event
 * This component must accurately detect and prevent overlapping tasks
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskTimingValidator } from '@/components/tasks/TaskTimingValidator';
import { WorkflowTask, TaskCategory, TaskPriority, TaskStatus } from '@/types/workflow';

// Mock existing wedding tasks for conflict detection
const mockExistingTasks: WorkflowTask[] = [
  {
    id: 'task-1',
    title: 'Photography Session',
    description: 'Couple portrait session',
    wedding_id: 'wedding-123',
    category: 'photography' as TaskCategory,
    priority: 'high' as TaskPriority,
    status: 'todo' as TaskStatus,
    assigned_to: 'photographer-1',
    assigned_by: 'planner-1',
    created_by: 'planner-1',
    estimated_duration: 2, // 2 hours
    buffer_time: 0.5,
    deadline: new Date('2025-02-15T16:00:00'),
    start_date: new Date('2025-02-15T14:00:00'), // 2pm - 4pm
    completion_date: null,
    progress_percentage: 0,
    is_critical_path: true,
    notes: '',
    attachments: [],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'task-2',
    title: 'Ceremony Setup',
    description: 'Setup ceremony venue',
    wedding_id: 'wedding-123',
    category: 'venue_management' as TaskCategory,
    priority: 'critical' as TaskPriority,
    status: 'todo' as TaskStatus,
    assigned_to: 'coordinator-1',
    assigned_by: 'planner-1',
    created_by: 'planner-1',
    estimated_duration: 3, // 3 hours
    buffer_time: 1,
    deadline: new Date('2025-02-15T13:00:00'),
    start_date: new Date('2025-02-15T10:00:00'), // 10am - 1pm
    completion_date: null,
    progress_percentage: 0,
    is_critical_path: true,
    notes: '',
    attachments: [],
    created_at: new Date(),
    updated_at: new Date()
  }
];

const defaultProps = {
  existingTasks: mockExistingTasks,
  proposedTask: {
    title: 'New Task',
    category: 'logistics' as TaskCategory,
    estimated_duration: 1,
    buffer_time: 0,
    start_date: null,
    deadline: null
  },
  onConflictDetected: vi.fn(),
  onConflictResolved: vi.fn(),
  realTimeValidation: true
};

describe('TaskTimingValidator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    test('renders timing validation interface', () => {
      render(<TaskTimingValidator {...defaultProps} />);
      
      expect(screen.getByText(/timing validation/i)).toBeInTheDocument();
      expect(screen.getByText(/check for conflicts/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /validate timing/i })).toBeInTheDocument();
    });

    test('shows visual timeline when tasks are provided', () => {
      render(<TaskTimingValidator {...defaultProps} />);
      
      // Should show timeline visualization
      expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
      expect(screen.getByText('Photography Session')).toBeInTheDocument();
      expect(screen.getByText('Ceremony Setup')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM - 4:00 PM')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM - 1:00 PM')).toBeInTheDocument();
    });

    test('shows no conflicts when timeline is clear', () => {
      const clearTimeProps = {
        ...defaultProps,
        proposedTask: {
          ...defaultProps.proposedTask,
          start_date: new Date('2025-02-15T17:00:00'),
          estimated_duration: 1
        }
      };
      
      render(<TaskTimingValidator {...clearTimeProps} />);
      
      expect(screen.getByTestId('no-conflicts-indicator')).toBeInTheDocument();
      expect(screen.getByText(/no timing conflicts detected/i)).toBeInTheDocument();
    });
  });

  describe('Conflict Detection', () => {
    test('detects direct time overlap conflicts', async () => {
      const conflictingTask = {
        ...defaultProps.proposedTask,
        title: 'Conflicting Task',
        start_date: new Date('2025-02-15T14:30:00'), // Overlaps with photography (2-4pm)
        estimated_duration: 1.5
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={conflictingTask} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conflict-warning')).toBeInTheDocument();
        expect(screen.getByText(/timing conflicts detected/i)).toBeInTheDocument();
        expect(defaultProps.onConflictDetected).toHaveBeenCalledWith({
          type: 'overlap',
          conflictingTasks: ['task-1'],
          severity: 'high',
          proposedTime: expect.any(Object),
          suggestions: expect.any(Array)
        });
      });
    });

    test('detects buffer time violations', async () => {
      const bufferConflictTask = {
        ...defaultProps.proposedTask,
        title: 'Buffer Conflict Task',
        start_date: new Date('2025-02-15T13:45:00'), // 15 mins after ceremony ends, but within buffer
        estimated_duration: 0.5
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={bufferConflictTask} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('buffer-warning')).toBeInTheDocument();
        expect(screen.getByText(/insufficient buffer time/i)).toBeInTheDocument();
        expect(defaultProps.onConflictDetected).toHaveBeenCalledWith({
          type: 'buffer_violation',
          conflictingTasks: ['task-2'],
          severity: 'medium',
          requiredBuffer: 1,
          actualBuffer: 0.25
        });
      });
    });

    test('detects critical path conflicts', async () => {
      const criticalPathTask = {
        ...defaultProps.proposedTask,
        title: 'Critical Path Task',
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 2,
        priority: 'critical' as TaskPriority
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={criticalPathTask} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('critical-path-conflict')).toBeInTheDocument();
        expect(screen.getByText(/critical path conflict/i)).toBeInTheDocument();
        expect(defaultProps.onConflictDetected).toHaveBeenCalledWith({
          type: 'critical_path_conflict',
          severity: 'critical',
          message: 'This task conflicts with critical path items that cannot be moved'
        });
      });
    });

    test('detects resource allocation conflicts', async () => {
      const resourceConflictTask = {
        ...defaultProps.proposedTask,
        title: 'Resource Conflict Task',
        category: 'photography' as TaskCategory,
        assigned_to: 'photographer-1', // Same photographer as existing task
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 1
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={resourceConflictTask} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('resource-conflict')).toBeInTheDocument();
        expect(screen.getByText(/resource allocation conflict/i)).toBeInTheDocument();
        expect(screen.getByText(/photographer-1 is already assigned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Conflict Resolution Suggestions', () => {
    test('suggests alternative time slots for conflicts', async () => {
      const conflictingTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 1
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={conflictingTask} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conflict-suggestions')).toBeInTheDocument();
        expect(screen.getByText(/suggested alternative times/i)).toBeInTheDocument();
        
        // Should suggest times before and after conflicts
        expect(screen.getByText(/9:00 AM - 10:00 AM/i)).toBeInTheDocument(); // Before ceremony
        expect(screen.getByText(/4:30 PM - 5:30 PM/i)).toBeInTheDocument(); // After photography
      });
    });

    test('suggests task duration adjustments', async () => {
      const user = userEvent.setup();
      const longTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T12:00:00'),
        estimated_duration: 5 // Very long task that conflicts with multiple
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={longTask} />);
      
      await waitFor(() => {
        expect(screen.getByText(/consider reducing task duration/i)).toBeInTheDocument();
        expect(screen.getByText(/split into smaller tasks/i)).toBeInTheDocument();
      });
      
      // Click suggestion to apply
      const splitSuggestion = screen.getByRole('button', { name: /split into 2 tasks/i });
      await user.click(splitSuggestion);
      
      expect(defaultProps.onConflictResolved).toHaveBeenCalledWith({
        action: 'split_task',
        newTasks: expect.arrayContaining([
          expect.objectContaining({ estimated_duration: 2.5 }),
          expect.objectContaining({ estimated_duration: 2.5 })
        ])
      });
    });

    test('suggests buffer time adjustments', async () => {
      const user = userEvent.setup();
      const tightTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T13:30:00'),
        estimated_duration: 0.25,
        buffer_time: 0
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={tightTask} />);
      
      await waitFor(() => {
        expect(screen.getByText(/increase buffer time/i)).toBeInTheDocument();
        expect(screen.getByText(/recommended: 15 minutes/i)).toBeInTheDocument();
      });
      
      const bufferSuggestion = screen.getByRole('button', { name: /apply recommended buffer/i });
      await user.click(bufferSuggestion);
      
      expect(defaultProps.onConflictResolved).toHaveBeenCalledWith({
        action: 'adjust_buffer',
        newBufferTime: 0.25
      });
    });
  });

  describe('Real-time Validation', () => {
    test('validates timing in real-time as user adjusts time', async () => {
      const user = userEvent.setup();
      render(<TaskTimingValidator {...defaultProps} />);
      
      // Simulate user adjusting start time
      const timeInput = screen.getByLabelText(/start time/i);
      await user.clear(timeInput);
      await user.type(timeInput, '14:00'); // Conflicts with photography
      
      // Should immediately detect conflict without explicit validation
      await waitFor(() => {
        expect(screen.getByTestId('conflict-warning')).toBeInTheDocument();
        expect(defaultProps.onConflictDetected).toHaveBeenCalled();
      });
    });

    test('debounces real-time validation to prevent excessive calls', async () => {
      const user = userEvent.setup();
      render(<TaskTimingValidator {...defaultProps} />);
      
      const timeInput = screen.getByLabelText(/start time/i);
      
      // Type rapidly
      await user.type(timeInput, '1400');
      
      // Should only call validation once after debounce period
      await waitFor(() => {
        expect(defaultProps.onConflictDetected).toHaveBeenCalledTimes(1);
      });
    });

    test('can disable real-time validation', () => {
      render(<TaskTimingValidator {...defaultProps} realTimeValidation={false} />);
      
      // Should show manual validation button instead
      expect(screen.getByRole('button', { name: /validate timing/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/start time/i)).not.toBeInTheDocument();
    });
  });

  describe('Visual Timeline Representation', () => {
    test('renders timeline with proper time scales', () => {
      render(<TaskTimingValidator {...defaultProps} />);
      
      const timeline = screen.getByTestId('timeline-visualization');
      expect(timeline).toBeInTheDocument();
      
      // Should show time markers
      expect(screen.getByText('8:00 AM')).toBeInTheDocument();
      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
      expect(screen.getByText('4:00 PM')).toBeInTheDocument();
      expect(screen.getByText('8:00 PM')).toBeInTheDocument();
    });

    test('highlights conflicts visually on timeline', async () => {
      const conflictingTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 1
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={conflictingTask} />);
      
      await waitFor(() => {
        const conflictHighlight = screen.getByTestId('conflict-highlight-14:00');
        expect(conflictHighlight).toHaveClass('bg-error-100', 'border-error-500');
      });
    });

    test('shows task categories with color coding', () => {
      render(<TaskTimingValidator {...defaultProps} />);
      
      // Different task categories should have different colors
      const photographyTask = screen.getByTestId('timeline-task-task-1');
      expect(photographyTask).toHaveClass('bg-blue-100'); // Photography color
      
      const venueTask = screen.getByTestId('timeline-task-task-2');
      expect(venueTask).toHaveClass('bg-green-100'); // Venue color
    });

    test('allows dragging tasks to adjust timing', async () => {
      const user = userEvent.setup();
      render(<TaskTimingValidator {...defaultProps} />);
      
      const proposedTaskBlock = screen.getByTestId('proposed-task-block');
      
      // Simulate drag to new time slot
      await user.pointer([
        { keys: '[MouseLeft>]', target: proposedTaskBlock },
        { coords: { x: 100, y: 0 } }, // Drag right
        { keys: '[/MouseLeft]' }
      ]);
      
      // Should update proposed time and re-validate
      expect(defaultProps.onConflictResolved).toHaveBeenCalledWith({
        action: 'time_adjustment',
        newStartTime: expect.any(Date)
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('efficiently handles large numbers of existing tasks', () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockExistingTasks[0],
        id: `task-${i}`,
        start_date: new Date(`2025-02-15T${8 + (i % 12)}:00:00`)
      }));
      
      const startTime = performance.now();
      render(<TaskTimingValidator {...defaultProps} existingTasks={manyTasks} />);
      const renderTime = performance.now() - startTime;
      
      // Should render efficiently even with many tasks
      expect(renderTime).toBeLessThan(100); // Less than 100ms
      expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    });

    test('uses memoization to prevent unnecessary recalculations', () => {
      const calculationSpy = vi.fn();
      
      // Mock the conflict detection algorithm to track calls
      vi.spyOn(require('@/lib/tasks/conflict-detection'), 'detectConflicts')
        .mockImplementation(calculationSpy);
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      
      expect(calculationSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TaskTimingValidator {...defaultProps} />);
      
      // Should not recalculate
      expect(calculationSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    test('provides screen reader descriptions for conflicts', async () => {
      const conflictingTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 1
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={conflictingTask} />);
      
      await waitFor(() => {
        const announcement = screen.getByRole('alert');
        expect(announcement).toHaveTextContent(/timing conflict detected/i);
        expect(announcement).toHaveAttribute('aria-live', 'assertive');
      });
    });

    test('supports keyboard navigation of timeline', async () => {
      const user = userEvent.setup();
      render(<TaskTimingValidator {...defaultProps} />);
      
      const timeline = screen.getByTestId('timeline-visualization');
      timeline.focus();
      
      // Should be able to navigate time slots with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('time-slot-9:00')).toHaveFocus();
      
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('time-slot-10:00')).toHaveFocus();
    });

    test('provides detailed conflict descriptions for screen readers', async () => {
      const conflictingTask = {
        ...defaultProps.proposedTask,
        start_date: new Date('2025-02-15T14:00:00'),
        estimated_duration: 2
      };
      
      const { rerender } = render(<TaskTimingValidator {...defaultProps} />);
      rerender(<TaskTimingValidator {...defaultProps} proposedTask={conflictingTask} />);
      
      await waitFor(() => {
        const description = screen.getByTestId('conflict-description');
        expect(description).toHaveAttribute('aria-describedby');
        expect(description).toHaveTextContent(/conflicts with Photography Session from 2:00 PM to 4:00 PM/i);
      });
    });
  });

  describe('Error Handling', () => {
    test('gracefully handles invalid date inputs', async () => {
      const user = userEvent.setup();
      render(<TaskTimingValidator {...defaultProps} />);
      
      const timeInput = screen.getByLabelText(/start time/i);
      await user.type(timeInput, 'invalid-date');
      
      // Should show validation error, not crash
      expect(screen.getByText(/invalid time format/i)).toBeInTheDocument();
      expect(screen.queryByTestId('conflict-warning')).not.toBeInTheDocument();
    });

    test('handles missing task data gracefully', () => {
      const incompleteTask = {
        title: 'Incomplete Task'
        // Missing required fields
      };
      
      expect(() => {
        render(<TaskTimingValidator {...defaultProps} proposedTask={incompleteTask as any} />);
      }).not.toThrow();
      
      expect(screen.getByText(/insufficient task information/i)).toBeInTheDocument();
    });

    test('recovers from validation errors', async () => {
      const user = userEvent.setup();
      
      // Mock validation error
      const validationError = new Error('Validation failed');
      defaultProps.onConflictDetected.mockImplementation(() => {
        throw validationError;
      });
      
      render(<TaskTimingValidator {...defaultProps} />);
      
      const timeInput = screen.getByLabelText(/start time/i);
      await user.type(timeInput, '14:00');
      
      // Should show error message instead of crashing
      await waitFor(() => {
        expect(screen.getByText(/validation error occurred/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry validation/i })).toBeInTheDocument();
      });
    });
  });
});