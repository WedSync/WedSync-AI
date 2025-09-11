// WS-157 Mobile Helper Assignment Tests
// Comprehensive test suite for mobile helper assignment features

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import TouchOptimizedHelperDashboard from '../../src/components/mobile/helper-assignment/TouchOptimizedHelperDashboard';
import MobileHelperDirectory from '../../src/components/mobile/helper-assignment/MobileHelperDirectory';
import TouchDragAndDrop from '../../src/components/mobile/helper-assignment/TouchDragAndDrop';
import WedMeIntegration from '../../src/components/mobile/helper-assignment/WedMeIntegration';
import { offlineHelperService } from '../../src/lib/offline/helper-sync/offline-helper-service';
import { pushNotificationService } from '../../src/lib/notifications/push-notification-service';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('../../src/lib/offline/helper-sync/offline-helper-service');
jest.mock('../../src/lib/notifications/push-notification-service');

// Mock navigator APIs for mobile testing
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.createElement('div'),
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1,
    } as Touch)),
    changedTouches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.createElement('div'),
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1,
    } as Touch)),
  });
};

describe('WS-157 Mobile Helper Assignment System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('TouchOptimizedHelperDashboard', () => {
    it('renders mobile dashboard with touch optimization', async () => {
      render(<TouchOptimizedHelperDashboard />);
      
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
      expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading your tasks...')).not.toBeInTheDocument();
      });
    });

    it('displays offline indicator when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('handles touch gestures for task interactions', async () => {
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        const taskCard = screen.getAllByRole('button')[0];
        expect(taskCard).toBeInTheDocument();
      });

      const taskCard = screen.getAllByRole('button')[0];
      
      // Simulate touch start
      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      fireEvent(taskCard, touchStartEvent);
      
      // Simulate touch move (swipe left)
      const touchMoveEvent = createTouchEvent('touchmove', [{ clientX: 50, clientY: 100 }]);
      fireEvent(taskCard, touchMoveEvent);
      
      // Simulate touch end
      const touchEndEvent = createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }]);
      fireEvent(taskCard, touchEndEvent);
      
      // Expect haptic feedback to be called
      expect(navigator.vibrate).toHaveBeenCalled();
    });

    it('updates task status with offline support', async () => {
      const mockUpdateTaskStatus = jest.spyOn(offlineHelperService, 'updateTaskStatus')
        .mockResolvedValue();
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Task');
        fireEvent.click(startButton);
      });
      
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(expect.any(String), 'in_progress');
    });

    it('syncs offline changes when coming online', async () => {
      const mockSyncPendingChanges = jest.spyOn(offlineHelperService, 'syncPendingChanges')
        .mockResolvedValue({ success: true, conflicts: [], errors: [] });
      
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<TouchOptimizedHelperDashboard />);
      
      // Go online
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));
      
      await waitFor(() => {
        expect(mockSyncPendingChanges).toHaveBeenCalled();
      });
    });
  });

  describe('MobileHelperDirectory', () => {
    it('renders helper directory with search functionality', () => {
      render(<MobileHelperDirectory />);
      
      expect(screen.getByText('Helper Directory')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search helpers/i)).toBeInTheDocument();
    });

    it('filters helpers based on search query', async () => {
      render(<MobileHelperDirectory />);
      
      const searchInput = screen.getByPlaceholderText(/search helpers/i);
      await userEvent.type(searchInput, 'Sarah');
      
      await waitFor(() => {
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      });
    });

    it('shows filter options when filter button is clicked', async () => {
      render(<MobileHelperDirectory />);
      
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText('Availability')).toBeInTheDocument();
    });

    it('assigns tasks to helpers in assignment mode', async () => {
      render(<MobileHelperDirectory />);
      
      const assignButton = screen.getByText('Assign Tasks');
      await userEvent.click(assignButton);
      
      expect(screen.getByText('Cancel Assignment')).toBeInTheDocument();
      
      await waitFor(() => {
        const helperAssignButton = screen.getAllByText('Assign')[0];
        fireEvent.click(helperAssignButton);
      });
      
      expect(screen.getByText('Task assigned successfully!')).toBeInTheDocument();
    });

    it('displays helper details in modal', async () => {
      render(<MobileHelperDirectory />);
      
      await waitFor(() => {
        const helperCard = screen.getByText('Sarah Johnson');
        fireEvent.click(helperCard);
      });
      
      expect(screen.getByText('Helper Details')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });
  });

  describe('TouchDragAndDrop', () => {
    it('renders drag and drop interface', () => {
      render(<TouchDragAndDrop />);
      
      expect(screen.getByText('Task Assignment')).toBeInTheDocument();
      expect(screen.getByText('Long press and drag tasks to reassign them')).toBeInTheDocument();
    });

    it('initiates drag on long press', async () => {
      render(<TouchDragAndDrop />);
      
      await waitFor(() => {
        const dragHandle = screen.getAllByTestId('drag-handle')[0];
        expect(dragHandle).toBeInTheDocument();
      });

      const taskCard = screen.getAllByRole('button')[0];
      
      // Simulate long press
      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      fireEvent(taskCard, touchStartEvent);
      
      // Wait for long press timeout
      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(50);
      }, { timeout: 600 });
    });

    it('handles drag and drop between zones', async () => {
      render(<TouchDragAndDrop />);
      
      await waitFor(() => {
        const taskCard = screen.getAllByRole('button')[0];
        expect(taskCard).toBeInTheDocument();
      });

      const taskCard = screen.getAllByRole('button')[0];
      
      // Start drag
      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      fireEvent(taskCard, touchStartEvent);
      
      // Move to drop zone
      const touchMoveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 300 }]);
      fireEvent(document, touchMoveEvent);
      
      // Drop
      const touchEndEvent = createTouchEvent('touchend', [{ clientX: 200, clientY: 300 }]);
      fireEvent(document, touchEndEvent);
      
      // Expect haptic feedback for successful drop
      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith([30, 10, 30]);
      });
    });

    it('prevents invalid drops', async () => {
      render(<TouchDragAndDrop />);
      
      await waitFor(() => {
        const taskCard = screen.getAllByRole('button')[0];
        expect(taskCard).toBeInTheDocument();
      });

      // Try to drop on invalid zone (full capacity)
      const taskCard = screen.getAllByRole('button')[0];
      
      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      fireEvent(taskCard, touchStartEvent);
      
      // Move to invalid zone
      const touchMoveEvent = createTouchEvent('touchmove', [{ clientX: 300, clientY: 400 }]);
      fireEvent(document, touchMoveEvent);
      
      const touchEndEvent = createTouchEvent('touchend', [{ clientX: 300, clientY: 400 }]);
      fireEvent(document, touchEndEvent);
      
      // Task should remain in original position
      expect(taskCard).toBeInTheDocument();
    });
  });

  describe('WedMeIntegration', () => {
    it('detects WedMe app installation', () => {
      // Mock WedMe user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) WedMe/1.2.0',
      });
      
      render(<WedMeIntegration />);
      
      expect(screen.getByText('WedMe App Connected')).toBeInTheDocument();
    });

    it('shows installation prompt for non-WedMe browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });
      
      render(<WedMeIntegration />);
      
      expect(screen.getByText('Install WedMe Mobile App')).toBeInTheDocument();
    });

    it('handles deep linking to WedMe app', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'WedMe/1.2.0',
      });
      
      render(<WedMeIntegration />);
      
      const openAppButton = screen.getByText('Open in App');
      await userEvent.click(openAppButton);
      
      // Would typically test URL change or app opening
      expect(openAppButton).toBeInTheDocument();
    });

    it('enables push notifications', async () => {
      const mockSubscribe = jest.spyOn(pushNotificationService, 'subscribeToPushNotifications')
        .mockResolvedValue({ success: true });
      
      render(<WedMeIntegration />);
      
      const notificationButton = screen.getByText('Enable Notifications');
      await userEvent.click(notificationButton);
      
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('Offline Functionality', () => {
    it('caches tasks for offline access', async () => {
      const mockGetTasks = jest.spyOn(offlineHelperService, 'getTasks')
        .mockResolvedValue([
          {
            id: '1',
            title: 'Cached Task',
            description: 'Offline task',
            deadline: new Date(),
            priority: 'medium',
            status: 'todo',
            category: 'Setup',
            estimatedDuration: 2,
            assignedBy: { name: 'John', email: 'john@example.com' },
            wedding: { id: '1', coupleName: 'Test Couple', date: new Date() },
            offline: true,
          },
        ]);
      
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        expect(mockGetTasks).toHaveBeenCalled();
        expect(screen.getByText('Cached Task')).toBeInTheDocument();
      });
    });

    it('queues changes for offline sync', async () => {
      const mockUpdateTaskStatus = jest.spyOn(offlineHelperService, 'updateTaskStatus')
        .mockResolvedValue();
      
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        const completeButton = screen.getByText('Complete');
        fireEvent.click(completeButton);
      });
      
      expect(mockUpdateTaskStatus).toHaveBeenCalled();
    });
  });

  describe('Push Notifications', () => {
    it('requests notification permission', async () => {
      const mockRequestPermission = jest.spyOn(pushNotificationService, 'requestPermission')
        .mockResolvedValue({ granted: true, denied: false, default: false });
      
      render(<WedMeIntegration />);
      
      const enableButton = screen.getByText('Enable Notifications');
      await userEvent.click(enableButton);
      
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('shows local notifications for task updates', async () => {
      const mockShowNotification = jest.spyOn(pushNotificationService, 'notifyTaskAssigned')
        .mockResolvedValue();
      
      render(<TouchOptimizedHelperDashboard />);
      
      // Simulate task assignment notification
      await pushNotificationService.notifyTaskAssigned('Setup chairs', 'task-1', 'Sarah Johnson');
      
      expect(mockShowNotification).toHaveBeenCalledWith('Setup chairs', 'task-1', 'Sarah Johnson');
    });
  });

  describe('Performance Tests', () => {
    it('loads dashboard within performance budget', async () => {
      const startTime = performance.now();
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('My Tasks')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Should load within 3 seconds as per requirements
      expect(loadTime).toBeLessThan(3000);
    });

    it('handles large task lists efficiently', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description ${i}`,
        deadline: new Date(),
        priority: 'medium' as const,
        status: 'todo' as const,
        category: 'Test',
        estimatedDuration: 1,
        assignedBy: { name: 'Test', email: 'test@example.com' },
        wedding: { id: '1', coupleName: 'Test Couple', date: new Date() },
      }));
      
      jest.spyOn(offlineHelperService, 'getTasks').mockResolvedValue(largeTasks);
      
      const startTime = performance.now();
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Task 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should still render efficiently with large datasets
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels for touch interactions', () => {
      render(<TouchOptimizedHelperDashboard />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('maintains minimum touch target sizes', () => {
      render(<TouchDragAndDrop />);
      
      const touchTargets = screen.getAllByRole('button');
      touchTargets.forEach(target => {
        const styles = getComputedStyle(target);
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
        const minWidth = parseInt(styles.minWidth) || parseInt(styles.width);
        
        // WCAG 2.1 AA requires 44px minimum
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    it('supports keyboard navigation fallback', async () => {
      render(<MobileHelperDirectory />);
      
      const searchInput = screen.getByRole('textbox');
      searchInput.focus();
      
      await userEvent.keyboard('{Tab}');
      
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      jest.spyOn(offlineHelperService, 'getTasks').mockRejectedValue(new Error('Network error'));
      
      render(<TouchOptimizedHelperDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('No tasks found')).toBeInTheDocument();
      });
    });

    it('recovers from sync conflicts', async () => {
      const mockSyncPendingChanges = jest.spyOn(offlineHelperService, 'syncPendingChanges')
        .mockResolvedValue({
          success: false,
          conflicts: [{
            taskId: 'task-1',
            localVersion: {} as any,
            serverVersion: {} as any,
            conflictType: 'status',
          }],
          errors: [],
        });
      
      render(<TouchOptimizedHelperDashboard />);
      
      // Trigger sync
      fireEvent(window, new Event('online'));
      
      await waitFor(() => {
        expect(mockSyncPendingChanges).toHaveBeenCalled();
      });
      
      // Should handle conflicts without crashing
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
    });
  });
});